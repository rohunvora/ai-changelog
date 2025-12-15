"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

// Types
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
    confidence: "high" | "medium" | "low";
    confidenceReason?: string;
    isStripeVerified: boolean;
    isOpenStartup: boolean;
    hasMultipleSources: boolean;
  };
  sourceCount: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
  hasMore: boolean;
}

type SortKey = "mrr" | "vibecodedPercent" | "confidence" | "claimDate";
type SortDir = "asc" | "desc";

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

// Sort indicator component
function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`sort-indicator ${active ? "active" : ""}`}>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

// Confidence badge component
function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const icons = { high: "✓", medium: "⚠", low: "✗" };
  return (
    <span className={`confidence-badge ${level}`}>
      {icons[level]} {level}
    </span>
  );
}

// Category badge component
function CategoryBadge({ category }: { category: string | undefined }) {
  if (!category) return <span className="text-[var(--foreground-tertiary)]">—</span>;
  return (
    <span className={`category-badge ${category}`}>
      {formatCategory(category)}
    </span>
  );
}

// Expanded row component
function ExpandedRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <tr className="expanded-content">
      <td colSpan={8} className="p-0">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Quote & Tools */}
          <div className="space-y-4">
            {entry.founder.vibecodedClaim && (
              <div>
                <div className="text-xs font-medium text-[var(--foreground-tertiary)] mb-2">
                  💬 Vibecoding Claim
                </div>
                <p className="text-sm text-[var(--foreground-secondary)] italic">
                  "{entry.founder.vibecodedClaim}"
                </p>
              </div>
            )}
            
            {entry.founder.toolsUsed && entry.founder.toolsUsed.length > 0 && (
              <div>
                <div className="text-xs font-medium text-[var(--foreground-tertiary)] mb-2">
                  🛠️ Tools Used
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {entry.founder.toolsUsed.map((tool) => (
                    <span key={tool} className="tool-badge">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Center: Stats */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-[var(--foreground-tertiary)] mb-2">
                📊 Revenue Details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--background-tertiary)]">
                  <div className="text-lg font-bold text-[var(--confidence-high)]">
                    {formatMRR(entry.claim.mrr)}
                  </div>
                  <div className="text-xs text-[var(--foreground-tertiary)]">MRR</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--background-tertiary)]">
                  <div className="text-lg font-bold text-[var(--foreground)]">
                    {entry.claim.arr ? formatMRR(entry.claim.arr) : formatMRR(entry.claim.mrr * 12)}
                  </div>
                  <div className="text-xs text-[var(--foreground-tertiary)]">ARR</div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-xs font-medium text-[var(--foreground-tertiary)] mb-2">
                🔍 Verification
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className={entry.claim.isStripeVerified ? "text-[var(--confidence-high)]" : "text-[var(--foreground-tertiary)]"}>
                    {entry.claim.isStripeVerified ? "✓" : "○"} Stripe Verified
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={entry.claim.isOpenStartup ? "text-[var(--confidence-high)]" : "text-[var(--foreground-tertiary)]"}>
                    {entry.claim.isOpenStartup ? "✓" : "○"} Open Startup
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={entry.claim.hasMultipleSources ? "text-[var(--confidence-high)]" : "text-[var(--foreground-tertiary)]"}>
                    {entry.claim.hasMultipleSources ? "✓" : "○"} Multiple Sources
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: Links */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-[var(--foreground-tertiary)] mb-2">
                🔗 Links
              </div>
              <div className="space-y-2">
                {entry.founder.productUrl && (
                  <a
                    href={entry.founder.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent-secondary)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {entry.founder.productUrl.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}
                  </a>
                )}
                {entry.founder.twitterHandle && (
                  <a
                    href={`https://twitter.com/${entry.founder.twitterHandle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent-secondary)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    {entry.founder.twitterHandle}
                  </a>
                )}
                {entry.founder.vibecodedSource && (
                  <a
                    href={entry.founder.vibecodedSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    View Source
                  </a>
                )}
              </div>
            </div>
            
            {entry.claim.confidenceReason && (
              <div>
                <div className="text-xs font-medium text-[var(--foreground-tertiary)] mb-2">
                  📝 Confidence Note
                </div>
                <p className="text-xs text-[var(--foreground-tertiary)]">
                  {entry.claim.confidenceReason}
                </p>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
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
      if (entry.founder.category) {
        cats.add(entry.founder.category);
      }
    });
    return Array.from(cats).sort();
  }, [data]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.founder.productName.toLowerCase().includes(query) ||
          entry.founder.name.toLowerCase().includes(query) ||
          (entry.founder.twitterHandle?.toLowerCase().includes(query) ?? false)
      );
    }
    
    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((entry) => entry.founder.category === categoryFilter);
    }
    
    // Confidence filter
    if (confidenceFilter !== "all") {
      result = result.filter((entry) => entry.claim.confidence === confidenceFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      
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
      
      if (sortDir === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    
    return result;
  }, [data, searchQuery, categoryFilter, confidenceFilter, sortKey, sortDir]);

  // Toggle row expansion
  const toggleExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalMRR = filteredData.reduce((sum, e) => sum + e.claim.mrr, 0);
    const avgVibecoded = filteredData.length > 0
      ? Math.round(filteredData.reduce((sum, e) => sum + (e.founder.vibecodedPercent || 0), 0) / filteredData.length)
      : 0;
    const highConfidence = filteredData.filter((e) => e.claim.confidence === "high").length;
    return { totalMRR, avgVibecoded, highConfidence, total: filteredData.length };
  }, [filteredData]);

  // Export to CSV
  const exportCSV = () => {
    const headers = ["Rank", "Product", "Founder", "Category", "MRR", "ARR", "Vibecoded %", "Confidence", "Twitter", "Website", "Source"];
    const rows = filteredData.map((entry, i) => [
      i + 1,
      entry.founder.productName,
      entry.founder.name,
      entry.founder.category || "",
      entry.claim.mrr / 100,
      (entry.claim.arr || entry.claim.mrr * 12) / 100,
      entry.founder.vibecodedPercent || "",
      entry.claim.confidence,
      entry.founder.twitterHandle || "",
      entry.founder.productUrl || "",
      entry.founder.vibecodedSource || "",
    ]);
    
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vibecoded-leaderboard-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-bold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                🏆 Vibecoded Leaderboard
              </Link>
              
              {/* Search */}
              <div className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="Search products or founders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-3 py-1.5 pl-9 text-sm bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] text-[var(--foreground)] placeholder:text-[var(--foreground-tertiary)]"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--background-tertiary)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
              <Link
                href="/"
                className="px-3 py-1.5 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                ← Changelog
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="sticky top-[53px] z-10 bg-[var(--background-secondary)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--foreground-tertiary)]">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-[var(--background-tertiary)] border border-[var(--border)] rounded text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="all">All ({data.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatCategory(cat)} ({data.filter((e) => e.founder.category === cat).length})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Confidence Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--foreground-tertiary)]">Confidence:</span>
              <div className="flex gap-1">
                {["all", "high", "medium", "low"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfidenceFilter(level)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      confidenceFilter === level
                        ? level === "high"
                          ? "bg-[var(--confidence-high-bg)] text-[var(--confidence-high)]"
                          : level === "medium"
                          ? "bg-[var(--confidence-medium-bg)] text-[var(--confidence-medium)]"
                          : level === "low"
                          ? "bg-[var(--confidence-low-bg)] text-[var(--confidence-low)]"
                          : "bg-[var(--accent)] text-white"
                        : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {level === "all" ? "All" : level === "high" ? "✓ High" : level === "medium" ? "⚠ Med" : "✗ Low"}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-4 ml-auto text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--foreground-tertiary)]">Total MRR:</span>
                <span className="font-mono font-semibold text-[var(--confidence-high)]">{formatMRR(stats.totalMRR)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--foreground-tertiary)]">Avg Vibecoded:</span>
                <span className="font-mono font-semibold text-[var(--accent)]">{stats.avgVibecoded}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--foreground-tertiary)]">Showing:</span>
                <span className="font-mono font-semibold text-[var(--foreground)]">{stats.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-14 skeleton rounded-lg" />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No results found</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th onClick={() => handleSort("mrr")} className="product-cell">
                    Product / Founder
                  </th>
                  <th>Category</th>
                  <th onClick={() => handleSort("mrr")} className={`text-right ${sortKey === "mrr" ? "sorted" : ""}`}>
                    MRR
                    <SortIndicator active={sortKey === "mrr"} dir={sortDir} />
                  </th>
                  <th onClick={() => handleSort("vibecodedPercent")} className={`text-right ${sortKey === "vibecodedPercent" ? "sorted" : ""}`}>
                    Vibecoded
                    <SortIndicator active={sortKey === "vibecodedPercent"} dir={sortDir} />
                  </th>
                  <th onClick={() => handleSort("confidence")} className={sortKey === "confidence" ? "sorted" : ""}>
                    Confidence
                    <SortIndicator active={sortKey === "confidence"} dir={sortDir} />
                  </th>
                  <th onClick={() => handleSort("claimDate")} className={sortKey === "claimDate" ? "sorted" : ""}>
                    Claimed
                    <SortIndicator active={sortKey === "claimDate"} dir={sortDir} />
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((entry, index) => {
                  const isExpanded = expandedRows.has(entry.founder.id);
                  const rank = index + 1;
                  
                  return (
                    <>
                      <tr
                        key={entry.founder.id}
                        className={`cursor-pointer ${isExpanded ? "expanded" : ""}`}
                        onClick={() => toggleExpanded(entry.founder.id)}
                      >
                        <td className={`rank-cell ${rank === 1 ? "top-1" : rank === 2 ? "top-2" : rank === 3 ? "top-3" : ""}`}>
                          {rank}
                        </td>
                        <td className="product-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--background-tertiary)] flex items-center justify-center text-sm font-semibold text-[var(--foreground-secondary)]">
                              {entry.founder.productName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-[var(--foreground)]">
                                {entry.founder.productName}
                              </div>
                              <div className="text-xs text-[var(--foreground-tertiary)]">
                                {entry.founder.name}
                                {entry.founder.twitterHandle && (
                                  <span className="ml-1 text-[var(--accent)]">{entry.founder.twitterHandle}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <CategoryBadge category={entry.founder.category} />
                        </td>
                        <td className="mrr-cell">
                          {formatMRR(entry.claim.mrr)}
                        </td>
                        <td className="text-right">
                          {entry.founder.vibecodedPercent ? (
                            <span className="font-mono text-[var(--accent)]">
                              {entry.founder.vibecodedPercent}%
                            </span>
                          ) : (
                            <span className="text-[var(--foreground-tertiary)]">—</span>
                          )}
                        </td>
                        <td>
                          <ConfidenceBadge level={entry.claim.confidence} />
                        </td>
                        <td className="text-xs text-[var(--foreground-tertiary)]">
                          {formatDistanceToNow(new Date(entry.claim.claimDate), { addSuffix: true })}
                        </td>
                        <td>
                          <button
                            className={`expand-btn ${isExpanded ? "expanded" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(entry.founder.id);
                            }}
                          >
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
        
        {/* Footer Notes */}
        <div className="mt-8 p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="text-xs text-[var(--foreground-tertiary)] space-y-1">
              <p><strong className="text-[var(--foreground-secondary)]">Data disclaimer:</strong> Revenue figures are self-reported from founder tweets, interviews, and public dashboards. None are audited.</p>
              <p><strong className="text-[var(--foreground-secondary)]">Confidence levels:</strong> High = Open Startup / Stripe verified. Medium = Interviews / Multiple sources. Low = Single tweet or claim.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
