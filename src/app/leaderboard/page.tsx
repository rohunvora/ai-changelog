"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow, subDays, isAfter } from "date-fns";

// Types
interface Source {
  type: string;
  url: string;
  date: string | null;
  rawText: string | null;
}

interface LeaderboardEntry {
  founder: {
    id: string;
    name: string;
    twitterHandle?: string;
    productName: string;
    productUrl?: string;
    category?: string;
    vibecodedClaim?: string;
    vibecodedSource?: string;
    vibecodedPercent?: number;
    toolsUsed: string[];
  };
  claim: {
    id: string;
    mrr: number;
    arr?: number;
    claimDate: string;
    scrapedAt?: string;
    confidence: "high" | "medium" | "low";
    confidenceReason?: string;
    isStripeVerified: boolean;
    isOpenStartup: boolean;
    hasMultipleSources: boolean;
  };
  sourceCount: number;
  sources?: Source[];
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
  hasMore: boolean;
}

interface CategoryStats {
  category: string;
  count: number;
  totalMRR: number;
  avgMRR: number;
  avgVibecoded: number;
  highConfidenceCount: number;
  topProduct: string;
}

type SortKey = "mrr" | "vibecodedPercent" | "confidence" | "claimDate";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "analytics" | "insights";
type DateRange = "all" | "30d" | "90d" | "1yr";

// Utility functions
function formatMRR(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000000) {
    return `$${(dollars / 1000000).toFixed(2)}M`;
  }
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(0)}K`;
  }
  return `$${dollars.toFixed(0)}`;
}

function formatCategory(cat: string | undefined): string {
  if (!cat) return "";
  return cat.replace(/_/g, " ");
}

function getDateCutoff(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case "30d": return subDays(now, 30);
    case "90d": return subDays(now, 90);
    case "1yr": return subDays(now, 365);
    default: return null;
  }
}

// Sort indicator component
function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`sort-indicator ${active ? "active" : ""}`} aria-hidden="true">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

// Confidence badge component with proper ARIA
function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const config = {
    high: { icon: "✓", label: "High", ariaLabel: "High confidence - verified by multiple sources" },
    medium: { icon: "◐", label: "Medium", ariaLabel: "Medium confidence - self-reported with some verification" },
    low: { icon: "○", label: "Low", ariaLabel: "Low confidence - single source, unverified" },
  };
  const { icon, label, ariaLabel } = config[level];
  
  return (
    <span className={`confidence-badge ${level}`} role="status" aria-label={ariaLabel} title={ariaLabel}>
      <span aria-hidden="true">{icon}</span> {label}
    </span>
  );
}

// Category badge component
function CategoryBadge({ category }: { category: string | undefined }) {
  if (!category) return <span className="text-[var(--foreground-tertiary)]">—</span>;
  return (
    <span className={`category-badge ${category}`} role="text">
      {formatCategory(category)}
    </span>
  );
}

// Info tooltip component
function InfoTooltip({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
  const [show, setShow] = useState(false);
  
  return (
    <span 
      className="relative inline-flex items-center gap-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-describedby="tooltip"
    >
      {children}
      <svg className="w-4 h-4 text-[var(--foreground-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {show && (
        <span 
          id="tooltip"
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg shadow-lg whitespace-nowrap z-50"
        >
          {tooltip}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--background-tertiary)]" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}

// Expanded row component
// Source type icons
const SOURCE_ICONS: Record<string, string> = {
  twitter: "𝕏",
  indie_hackers: "IH",
  open_startup: "📊",
  interview: "🎙️",
  manual: "✍️",
};

function ExpandedRow({ entry }: { entry: LeaderboardEntry }) {
  const claimDate = new Date(entry.claim.claimDate);
  const isStale = !isAfter(claimDate, subDays(new Date(), 365));
  
  return (
    <tr className="expanded-content" role="row">
      <td colSpan={8} className="p-0" role="cell">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Quote & Tools */}
          <div className="space-y-4">
            {entry.founder.vibecodedClaim && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">💬 Vibecoding Claim</h4>
                <blockquote className="text-base text-[var(--foreground)] italic border-l-2 border-[var(--accent)] pl-3">
                  "{entry.founder.vibecodedClaim}"
                </blockquote>
                {entry.founder.vibecodedSource && (
                  <a href={entry.founder.vibecodedSource} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm text-[var(--accent)] hover:underline">
                    View original source →
                  </a>
                )}
              </div>
            )}
            {entry.founder.toolsUsed && entry.founder.toolsUsed.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">🛠️ AI Tools Used</h4>
                <ul className="flex flex-wrap gap-2" role="list">
                  {entry.founder.toolsUsed.map((tool) => (
                    <li key={tool} className="tool-badge">{tool}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Center: Stats & Verification */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">📊 Revenue Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)]">
                  <div className="text-xl font-bold text-[var(--confidence-high)]">{formatMRR(entry.claim.mrr)}</div>
                  <div className="text-sm text-[var(--foreground-secondary)]">Monthly Revenue</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)]">
                  <div className="text-xl font-bold text-[var(--foreground)]">{entry.claim.arr ? formatMRR(entry.claim.arr) : formatMRR(entry.claim.mrr * 12)}</div>
                  <div className="text-sm text-[var(--foreground-secondary)]">Annual Revenue</div>
                </div>
              </div>
              
              {/* Claim date with warning */}
              <div className={`mt-3 p-2 rounded-lg text-sm ${isStale ? "bg-[var(--confidence-low)]/10 border border-[var(--confidence-low)]/30" : "bg-[var(--background-tertiary)]"}`}>
                <span className={isStale ? "text-[var(--confidence-low)]" : "text-[var(--foreground-secondary)]"}>
                  {isStale && "⚠️ "}Claimed: {claimDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {isStale && " — Data may be outdated"}
                </span>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">🔍 Verification Status</h4>
              <ul className="space-y-2" role="list">
                <li className="flex items-center gap-2 text-sm">
                  <span className={entry.claim.isStripeVerified ? "text-[var(--confidence-high)]" : "text-[var(--foreground-tertiary)]"} aria-hidden="true">{entry.claim.isStripeVerified ? "✓" : "○"}</span>
                  <span className={entry.claim.isStripeVerified ? "text-[var(--foreground)]" : "text-[var(--foreground-tertiary)]"}>Stripe Verified</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={entry.claim.isOpenStartup ? "text-[var(--confidence-high)]" : "text-[var(--foreground-tertiary)]"} aria-hidden="true">{entry.claim.isOpenStartup ? "✓" : "○"}</span>
                  <span className={entry.claim.isOpenStartup ? "text-[var(--foreground)]" : "text-[var(--foreground-tertiary)]"}>Open Startup Dashboard</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={entry.claim.hasMultipleSources ? "text-[var(--confidence-high)]" : "text-[var(--foreground-tertiary)]"} aria-hidden="true">{entry.claim.hasMultipleSources ? "✓" : "○"}</span>
                  <span className={entry.claim.hasMultipleSources ? "text-[var(--foreground)]" : "text-[var(--foreground-tertiary)]"}>Multiple Sources</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Right: Links & Sources */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">🔗 Product Links</h4>
              <nav className="space-y-2">
                {entry.founder.productUrl && (
                  <a href={entry.founder.productUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-base text-[var(--accent)] hover:underline">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                    {entry.founder.productUrl.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}
                  </a>
                )}
                {entry.founder.twitterHandle && (
                  <a href={`https://twitter.com/${entry.founder.twitterHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-base text-[var(--accent)] hover:underline">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    {entry.founder.twitterHandle}
                  </a>
                )}
              </nav>
            </div>
            
            {/* MRR Claim Sources */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">📎 Revenue Sources ({entry.sourceCount})</h4>
              {entry.sources && entry.sources.length > 0 ? (
                <ul className="space-y-2">
                  {entry.sources.map((source, i) => (
                    <li key={i}>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 text-sm text-[var(--accent)] hover:underline"
                      >
                        <span className="w-6 h-6 rounded flex items-center justify-center bg-[var(--background-tertiary)] text-xs">
                          {SOURCE_ICONS[source.type] || "🔗"}
                        </span>
                        <span className="capitalize">{source.type.replace(/_/g, " ")}</span>
                        {source.date && (
                          <span className="text-[var(--foreground-tertiary)]">
                            ({new Date(source.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" })})
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--foreground-tertiary)] italic">No direct source links available</p>
              )}
            </div>
            
            {entry.claim.confidenceReason && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">📝 Data Note</h4>
                <p className="text-sm text-[var(--foreground-secondary)]">{entry.claim.confidenceReason}</p>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// Category Analytics Card
function CategoryAnalyticsCard({ stats, onClick }: { stats: CategoryStats; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <CategoryBadge category={stats.category} />
        <span className="text-xs text-[var(--foreground-tertiary)]">{stats.count} products</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-[var(--foreground-tertiary)]">Total MRR</div>
          <div className="text-lg font-bold text-[var(--confidence-high)]">{formatMRR(stats.totalMRR)}</div>
        </div>
        <div>
          <div className="text-[var(--foreground-tertiary)]">Avg MRR</div>
          <div className="text-lg font-bold text-[var(--foreground)]">{formatMRR(stats.avgMRR)}</div>
        </div>
        <div>
          <div className="text-[var(--foreground-tertiary)]">Avg Vibecoded</div>
          <div className="font-semibold text-[var(--accent)]">{stats.avgVibecoded}%</div>
        </div>
        <div>
          <div className="text-[var(--foreground-tertiary)]">High Confidence</div>
          <div className="font-semibold text-[var(--confidence-high)]">{stats.highConfidenceCount}</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--foreground-tertiary)]">Top product</div>
        <div className="text-sm font-medium text-[var(--foreground)] truncate">{stats.topProduct}</div>
      </div>
    </button>
  );
}

// Auto-generated Insights Panel
function InsightsPanel({ data, categoryStats }: { data: LeaderboardEntry[]; categoryStats: CategoryStats[] }) {
  const insights = useMemo(() => {
    const result: string[] = [];
    
    // Top performer
    const top = data[0];
    if (top) {
      result.push(`🏆 **${top.founder.productName}** leads with ${formatMRR(top.claim.mrr)} MRR, built ${top.founder.vibecodedPercent || "largely"}% with AI tools like ${top.founder.toolsUsed?.slice(0, 2).join(", ") || "GPT/Cursor"}.`);
    }
    
    // Best performing category
    const topCat = [...categoryStats].sort((a, b) => b.totalMRR - a.totalMRR)[0];
    if (topCat) {
      result.push(`📊 **${formatCategory(topCat.category)}** is the highest-earning category (${formatMRR(topCat.totalMRR)} total MRR, ${topCat.count} products).`);
    }
    
    // Most vibecoded category
    const mostVibecoded = [...categoryStats].sort((a, b) => b.avgVibecoded - a.avgVibecoded)[0];
    if (mostVibecoded && mostVibecoded.avgVibecoded > 0) {
      result.push(`🤖 **${formatCategory(mostVibecoded.category)}** has the highest AI code percentage (avg ${mostVibecoded.avgVibecoded}%).`);
    }
    
    // Common tools
    const toolCounts: Record<string, number> = {};
    data.forEach(e => e.founder.toolsUsed?.forEach(t => { toolCounts[t] = (toolCounts[t] || 0) + 1; }));
    const topTools = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (topTools.length > 0) {
      result.push(`🛠️ Most used tools: ${topTools.map(([t, c]) => `**${t}** (${c})`).join(", ")}.`);
    }
    
    // Solo developers vs teams
    const soloDevs = data.filter(e => e.founder.vibecodedPercent && e.founder.vibecodedPercent >= 90);
    if (soloDevs.length > 0) {
      const soloMRR = soloDevs.reduce((s, e) => s + e.claim.mrr, 0);
      result.push(`👤 ${soloDevs.length} products are 90%+ vibecoded (solo devs), generating ${formatMRR(soloMRR)} combined MRR.`);
    }
    
    // High confidence products
    const highConf = data.filter(e => e.claim.confidence === "high");
    if (highConf.length > 0) {
      result.push(`✓ ${highConf.length} products (${Math.round(highConf.length / data.length * 100)}%) have high-confidence revenue claims.`);
    }
    
    // Gap analysis
    const categoriesWithProducts = new Set(data.map(e => e.founder.category).filter(Boolean));
    const potentialGaps = ["legal", "healthcare", "finance", "education", "real_estate"];
    const gaps = potentialGaps.filter(g => !categoriesWithProducts.has(g));
    if (gaps.length > 0) {
      result.push(`💡 **Potential gaps**: No vibecoded products found in ${gaps.map(g => formatCategory(g)).join(", ")}.`);
    }
    
    // Recency
    const recent = data.filter(e => isAfter(new Date(e.claim.claimDate), subDays(new Date(), 90)));
    const stale = data.filter(e => !isAfter(new Date(e.claim.claimDate), subDays(new Date(), 365)));
    result.push(`📅 ${recent.length} claims from last 90 days; ${stale.length} claims are over 1 year old (may be outdated).`);
    
    return result;
  }, [data, categoryStats]);
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[var(--foreground)]">📈 Auto-Generated Insights</h2>
      <div className="grid gap-3">
        {insights.map((insight, i) => (
          <div key={i} className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]">
            <p className="text-base text-[var(--foreground-secondary)]" dangerouslySetInnerHTML={{ 
              __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--foreground)]">$1</strong>') 
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Main component
export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mrr");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showAbout, setShowAbout] = useState(false);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch("/api/leaderboard?limit=100");
        const result: LeaderboardResponse = await response.json();
        setData(result.leaderboard);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    data.forEach((entry) => {
      if (entry.founder.category) cats.add(entry.founder.category);
    });
    return Array.from(cats).sort();
  }, [data]);

  // Get all tools
  const allTools = useMemo(() => {
    const tools = new Set<string>();
    data.forEach((entry) => {
      entry.founder.toolsUsed?.forEach(t => tools.add(t.toLowerCase()));
    });
    return Array.from(tools).sort();
  }, [data]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Enhanced search: name, product, category, tools, claims
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((entry) =>
        entry.founder.productName.toLowerCase().includes(query) ||
        entry.founder.name.toLowerCase().includes(query) ||
        (entry.founder.twitterHandle?.toLowerCase().includes(query) ?? false) ||
        (entry.founder.category?.toLowerCase().includes(query) ?? false) ||
        (entry.founder.vibecodedClaim?.toLowerCase().includes(query) ?? false) ||
        (entry.founder.toolsUsed?.some(t => t.toLowerCase().includes(query)) ?? false)
      );
    }
    
    if (categoryFilter !== "all") {
      result = result.filter((entry) => entry.founder.category === categoryFilter);
    }
    
    if (confidenceFilter !== "all") {
      result = result.filter((entry) => entry.claim.confidence === confidenceFilter);
    }
    
    // Date range filter
    const cutoff = getDateCutoff(dateRange);
    if (cutoff) {
      result = result.filter((entry) => isAfter(new Date(entry.claim.claimDate), cutoff));
    }
    
    result.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      
      switch (sortKey) {
        case "mrr":
          aVal = a.claim.mrr;
          bVal = b.claim.mrr;
          break;
        case "vibecodedPercent":
          aVal = a.founder.vibecodedPercent || 0;
          bVal = b.founder.vibecodedPercent || 0;
          break;
        case "confidence":
          const order = { high: 1, medium: 2, low: 3 };
          aVal = order[a.claim.confidence];
          bVal = order[b.claim.confidence];
          break;
        case "claimDate":
          aVal = new Date(a.claim.claimDate).getTime();
          bVal = new Date(b.claim.claimDate).getTime();
          break;
        default:
          aVal = a.claim.mrr;
          bVal = b.claim.mrr;
      }
      
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    
    return result;
  }, [data, searchQuery, categoryFilter, confidenceFilter, dateRange, sortKey, sortDir]);

  // Category statistics
  const categoryStats = useMemo((): CategoryStats[] => {
    const statsMap = new Map<string, { entries: LeaderboardEntry[] }>();
    
    filteredData.forEach(entry => {
      const cat = entry.founder.category || "uncategorized";
      if (!statsMap.has(cat)) {
        statsMap.set(cat, { entries: [] });
      }
      statsMap.get(cat)!.entries.push(entry);
    });
    
    return Array.from(statsMap.entries()).map(([category, { entries }]) => {
      const totalMRR = entries.reduce((s, e) => s + e.claim.mrr, 0);
      const vibecodedEntries = entries.filter(e => e.founder.vibecodedPercent);
      const avgVibecoded = vibecodedEntries.length > 0
        ? Math.round(vibecodedEntries.reduce((s, e) => s + (e.founder.vibecodedPercent || 0), 0) / vibecodedEntries.length)
        : 0;
      const topEntry = [...entries].sort((a, b) => b.claim.mrr - a.claim.mrr)[0];
      
      return {
        category,
        count: entries.length,
        totalMRR,
        avgMRR: Math.round(totalMRR / entries.length),
        avgVibecoded,
        highConfidenceCount: entries.filter(e => e.claim.confidence === "high").length,
        topProduct: topEntry?.founder.productName || "—",
      };
    }).sort((a, b) => b.totalMRR - a.totalMRR);
  }, [filteredData]);

  // Toggle row expansion
  const toggleExpanded = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Handle sort
  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }, [sortKey]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpanded(id); }
  }, [toggleExpanded]);

  // Stats
  const stats = useMemo(() => {
    const totalMRR = filteredData.reduce((sum, e) => sum + e.claim.mrr, 0);
    const vibecodedEntries = filteredData.filter(e => e.founder.vibecodedPercent);
    const avgVibecoded = vibecodedEntries.length > 0
      ? Math.round(vibecodedEntries.reduce((sum, e) => sum + (e.founder.vibecodedPercent || 0), 0) / vibecodedEntries.length)
      : 0;
    const highConfidence = filteredData.filter((e) => e.claim.confidence === "high").length;
    return { totalMRR, avgVibecoded, highConfidence, total: filteredData.length };
  }, [filteredData]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = ["Rank", "Product", "Founder", "Category", "MRR ($)", "ARR ($)", "Vibecoded %", "Confidence", "Twitter", "Website", "Source", "Tools", "Claim Date"];
    const rows = filteredData.map((entry, i) => [
      i + 1, entry.founder.productName, entry.founder.name, entry.founder.category || "",
      entry.claim.mrr / 100, (entry.claim.arr || entry.claim.mrr * 12) / 100,
      entry.founder.vibecodedPercent || "", entry.claim.confidence,
      entry.founder.twitterHandle || "", entry.founder.productUrl || "",
      entry.founder.vibecodedSource || "", entry.founder.toolsUsed?.join("; ") || "",
      entry.claim.claimDate,
    ]);
    
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vibecoded-leaderboard-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-[var(--border)]" role="banner">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4 lg:gap-6">
              <Link href="/" className="text-lg font-bold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                🏆 Vibecoded Leaderboard
              </Link>
              
              {/* Search - Enhanced */}
              <div className="relative hidden md:block">
                <label htmlFor="search" className="sr-only">Search products, founders, categories, or tools</label>
                <input
                  id="search"
                  type="search"
                  placeholder="Search products, categories, tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-72 px-3 py-2 pl-10 text-base bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-20 text-[var(--foreground)] placeholder:text-[var(--foreground-tertiary)]"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-3">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--background-secondary)] rounded-lg border border-[var(--border)]">
                {[
                  { mode: "table" as ViewMode, icon: "≡", label: "Table" },
                  { mode: "analytics" as ViewMode, icon: "📊", label: "Analytics" },
                  { mode: "insights" as ViewMode, icon: "💡", label: "Insights" },
                ].map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      viewMode === mode
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                    }`}
                    aria-pressed={viewMode === mode}
                  >
                    <span aria-hidden="true">{icon}</span> {label}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowAbout(!showAbout)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--background-tertiary)] transition-colors"
                aria-expanded={showAbout}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">About</span>
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--background-tertiary)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>
              <Link href="/" className="px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
                ← Changelog
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* About Section */}
      {showAbout && (
        <section id="about-section" className="bg-[var(--background-secondary)] border-b border-[var(--border)] py-6">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-3">What is "Vibecoded"?</h2>
                <p className="text-base text-[var(--foreground-secondary)] mb-4">
                  <strong>"Vibecoded"</strong> refers to software built primarily using AI coding assistants like 
                  Cursor, Claude, GPT-4, or Lovable. The percentage indicates how much of the codebase was 
                  generated or assisted by AI tools, as claimed by the founder.
                </p>
                <p className="text-base text-[var(--foreground-secondary)]">
                  This leaderboard tracks real products with self-reported Monthly Recurring Revenue (MRR) 
                  that were built using these AI-assisted development methods.
                </p>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-3">Confidence Levels</h2>
                <ul className="space-y-3 text-base">
                  <li className="flex items-start gap-3">
                    <ConfidenceBadge level="high" />
                    <span className="text-[var(--foreground-secondary)]">Open Startup dashboard, Stripe verified, or multiple independent sources</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ConfidenceBadge level="medium" />
                    <span className="text-[var(--foreground-secondary)]">Interviews, consistent social posts, or credible media coverage</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ConfidenceBadge level="low" />
                    <span className="text-[var(--foreground-secondary)]">Single tweet or unverified claim</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filters Bar */}
      <div className="sticky top-[57px] z-10 bg-[var(--background-secondary)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Mobile search */}
            <div className="relative md:hidden w-full mb-2">
              <input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pl-10 text-base bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="date-filter" className="text-sm text-[var(--foreground-secondary)]">Claims:</label>
              <select
                id="date-filter"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="px-3 py-2 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
              >
                <option value="all">All time</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1yr">Last year</option>
              </select>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="category-filter" className="text-sm text-[var(--foreground-secondary)]">Category:</label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
              >
                <option value="all">All ({data.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatCategory(cat)} ({data.filter((e) => e.founder.category === cat).length})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Verified Only Toggle */}
            <button
              onClick={() => setConfidenceFilter(confidenceFilter === "high" ? "all" : "high")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                confidenceFilter === "high"
                  ? "bg-[var(--confidence-high)] text-white"
                  : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] border border-[var(--border)] hover:border-[var(--confidence-high)] hover:text-[var(--confidence-high)]"
              }`}
            >
              ✓ Verified Only
            </button>
            
            {/* Confidence Filter */}
            <div className="flex items-center gap-1">
              {[
                { value: "all", label: "All", icon: null },
                { value: "high", label: "✓", icon: null },
                { value: "medium", label: "◐", icon: null },
                { value: "low", label: "○", icon: null },
              ].map((level) => (
                <button
                  key={level.value}
                  onClick={() => setConfidenceFilter(level.value)}
                  title={level.value === "all" ? "All confidence levels" : `${level.value} confidence`}
                  className={`px-2 py-1.5 text-sm rounded-lg transition-colors ${
                    confidenceFilter === level.value
                      ? level.value === "high"
                        ? "bg-[var(--confidence-high-bg)] text-[var(--confidence-high)] border border-[var(--confidence-high)]"
                        : level.value === "medium"
                        ? "bg-[var(--confidence-medium-bg)] text-[var(--confidence-medium)] border border-[var(--confidence-medium)]"
                        : level.value === "low"
                        ? "bg-[var(--confidence-low-bg)] text-[var(--confidence-low)] border border-[var(--confidence-low)]"
                        : "bg-[var(--accent)] text-white border border-[var(--accent)]"
                      : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] border border-[var(--border)] hover:bg-[var(--border)]"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-4 ml-auto text-sm" aria-live="polite">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--foreground-secondary)]">Total:</span>
                <span className="font-mono font-bold text-[var(--confidence-high)]">{formatMRR(stats.totalMRR)}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[var(--foreground-secondary)]">Avg:</span>
                <span className="font-mono font-bold text-[var(--accent)]">{stats.avgVibecoded}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--foreground-secondary)]">Showing:</span>
                <span className="font-mono font-bold text-[var(--foreground)]">{stats.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner for unverified data */}
      {confidenceFilter !== "high" && !loading && filteredData.some(e => e.claim.confidence !== "high") && (
        <div className="bg-[var(--confidence-low)]/10 border-b border-[var(--confidence-low)]/30">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2">
            <p className="text-sm text-[var(--confidence-low)] flex items-center gap-2">
              <span>⚠️</span>
              <span>
                <strong>Note:</strong> You are viewing data that includes self-reported or unverified revenue claims. 
                Use the <button onClick={() => setConfidenceFilter("high")} className="underline font-medium hover:no-underline">Verified Only</button> filter to show only high-confidence entries.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-lg" />
            ))}
          </div>
        ) : viewMode === "insights" ? (
          <InsightsPanel data={filteredData} categoryStats={categoryStats} />
        ) : viewMode === "analytics" ? (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[var(--foreground)]">📊 Category Analytics</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryStats.map((stats) => (
                <CategoryAnalyticsCard 
                  key={stats.category} 
                  stats={stats} 
                  onClick={() => { setCategoryFilter(stats.category); setViewMode("table"); }}
                />
              ))}
            </div>
            
            {/* Comparison Table */}
            <div className="mt-8">
              <h3 className="text-base font-bold text-[var(--foreground)] mb-4">Category Comparison</h3>
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--background-tertiary)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[var(--foreground-secondary)]">Category</th>
                      <th className="px-4 py-3 text-right text-[var(--foreground-secondary)]">Products</th>
                      <th className="px-4 py-3 text-right text-[var(--foreground-secondary)]">Total MRR</th>
                      <th className="px-4 py-3 text-right text-[var(--foreground-secondary)]">Avg MRR</th>
                      <th className="px-4 py-3 text-right text-[var(--foreground-secondary)]">Avg Vibecoded</th>
                      <th className="px-4 py-3 text-right text-[var(--foreground-secondary)]">High Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryStats.map((cat, i) => (
                      <tr key={cat.category} className={i % 2 === 0 ? "bg-[var(--background-secondary)]" : ""}>
                        <td className="px-4 py-3">
                          <CategoryBadge category={cat.category} />
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--foreground)]">{cat.count}</td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--confidence-high)]">{formatMRR(cat.totalMRR)}</td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--foreground)]">{formatMRR(cat.avgMRR)}</td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--accent)]">{cat.avgVibecoded}%</td>
                        <td className="px-4 py-3 text-right text-[var(--confidence-high)]">{cat.highConfidenceCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-medium text-[var(--foreground)] mb-2">No results found</h2>
            <p className="text-base text-[var(--foreground-secondary)]">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="data-table" aria-label="Vibecoded products leaderboard">
              <thead>
                <tr>
                  <th scope="col" className="w-12">#</th>
                  <th scope="col" className="product-cell" onClick={() => handleSort("mrr")} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleSort("mrr")}>
                    Product / Founder
                  </th>
                  <th scope="col" className="hide-mobile">Category</th>
                  <th scope="col" onClick={() => handleSort("mrr")} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleSort("mrr")} className={`text-right ${sortKey === "mrr" ? "sorted" : ""}`} aria-sort={sortKey === "mrr" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                    MRR <SortIndicator active={sortKey === "mrr"} dir={sortDir} />
                  </th>
                  <th scope="col" onClick={() => handleSort("vibecodedPercent")} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleSort("vibecodedPercent")} className={`text-right hide-mobile ${sortKey === "vibecodedPercent" ? "sorted" : ""}`}>
                    <InfoTooltip tooltip="Percentage of code generated by AI">Vibecoded</InfoTooltip>
                    <SortIndicator active={sortKey === "vibecodedPercent"} dir={sortDir} />
                  </th>
                  <th scope="col" onClick={() => handleSort("confidence")} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleSort("confidence")} className={sortKey === "confidence" ? "sorted" : ""}>
                    Confidence <SortIndicator active={sortKey === "confidence"} dir={sortDir} />
                  </th>
                  <th scope="col" onClick={() => handleSort("claimDate")} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleSort("claimDate")} className={`hide-mobile ${sortKey === "claimDate" ? "sorted" : ""}`}>
                    Claimed <SortIndicator active={sortKey === "claimDate"} dir={sortDir} />
                  </th>
                  <th scope="col" className="w-10"><span className="sr-only">Expand</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((entry, index) => {
                  const isExpanded = expandedRows.has(entry.founder.id);
                  const rank = index + 1;
                  const isStale = !isAfter(new Date(entry.claim.claimDate), subDays(new Date(), 365));
                  
                  return (
                    <>
                      <tr
                        key={entry.founder.id}
                        className={`cursor-pointer ${isExpanded ? "expanded" : ""} ${isStale ? "opacity-70" : ""}`}
                        onClick={() => toggleExpanded(entry.founder.id)}
                        onKeyDown={(e) => handleKeyDown(e, entry.founder.id)}
                        tabIndex={0}
                        aria-expanded={isExpanded}
                      >
                        <td className={`rank-cell ${rank === 1 ? "top-1" : rank === 2 ? "top-2" : rank === 3 ? "top-3" : ""}`}>{rank}</td>
                        <td className="product-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)] flex items-center justify-center text-base font-semibold text-[var(--foreground-secondary)]">
                              {entry.founder.productName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-[var(--foreground)]">{entry.founder.productName}</div>
                              <div className="text-sm text-[var(--foreground-secondary)]">
                                {entry.founder.name}
                                {entry.founder.twitterHandle && <span className="ml-1 text-[var(--accent)]">{entry.founder.twitterHandle}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hide-mobile"><CategoryBadge category={entry.founder.category} /></td>
                        <td className="mrr-cell">{formatMRR(entry.claim.mrr)}</td>
                        <td className="text-right hide-mobile">
                          {entry.founder.vibecodedPercent ? (
                            <span className="font-mono font-semibold text-[var(--accent)]">{entry.founder.vibecodedPercent}%</span>
                          ) : (
                            <span className="text-[var(--foreground-tertiary)]">—</span>
                          )}
                        </td>
                        <td><ConfidenceBadge level={entry.claim.confidence} /></td>
                        <td className="text-sm text-[var(--foreground-secondary)] hide-mobile">
                          {formatDistanceToNow(new Date(entry.claim.claimDate), { addSuffix: true })}
                          {isStale && <span className="ml-1 text-[var(--confidence-low)]" title="Over 1 year old">⚠</span>}
                        </td>
                        <td>
                          <button className={`expand-btn ${isExpanded ? "expanded" : ""}`} onClick={(e) => { e.stopPropagation(); toggleExpanded(entry.founder.id); }} aria-label={isExpanded ? "Collapse" : "Expand"}>
                            ▶
                          </button>
                        </td>
                      </tr>
                      {isExpanded && <ExpandedRow key={`${entry.founder.id}-expanded`} entry={entry} />}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Disclaimer */}
        <aside className="mt-8 p-5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-sm text-[var(--foreground-secondary)] space-y-2">
              <p><strong className="text-[var(--foreground)]">Data disclaimer:</strong> Revenue figures are self-reported from founder tweets, interviews, and public dashboards. None are independently audited.</p>
              <p><strong className="text-[var(--foreground)]">Stale data:</strong> Claims older than 1 year are marked with ⚠ and may not reflect current revenue.</p>
            </div>
          </div>
        </aside>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 text-center">
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Data last updated: {new Date().toLocaleDateString()} • 
            <Link href="/" className="text-[var(--accent)] hover:underline ml-1">View AI Changelog</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
