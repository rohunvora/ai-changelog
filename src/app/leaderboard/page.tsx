"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
    <span className={`sort-indicator ${active ? "active" : ""}`} aria-hidden="true">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

// Confidence badge component with proper ARIA
function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const config = {
    high: { icon: "✓", label: "High confidence", ariaLabel: "High confidence - verified by multiple sources" },
    medium: { icon: "◐", label: "Medium", ariaLabel: "Medium confidence - self-reported with some verification" },
    low: { icon: "○", label: "Low", ariaLabel: "Low confidence - single source, unverified" },
  };
  const { icon, label, ariaLabel } = config[level];
  
  return (
    <span 
      className={`confidence-badge ${level}`} 
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
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
function ExpandedRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <tr className="expanded-content" role="row">
      <td colSpan={8} className="p-0" role="cell">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Quote & Tools */}
          <div className="space-y-4">
            {entry.founder.vibecodedClaim && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">
                  💬 Vibecoding Claim
                </h4>
                <blockquote className="text-base text-[var(--foreground)] italic border-l-2 border-[var(--accent)] pl-3">
                  "{entry.founder.vibecodedClaim}"
                </blockquote>
                {entry.founder.vibecodedSource && (
                  <a 
                    href={entry.founder.vibecodedSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-[var(--accent)] hover:underline"
                  >
                    View original source →
                  </a>
                )}
              </div>
            )}
            
            {entry.founder.toolsUsed && entry.founder.toolsUsed.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">
                  🛠️ AI Tools Used
                </h4>
                <ul className="flex flex-wrap gap-2" role="list" aria-label="Tools used to build this product">
                  {entry.founder.toolsUsed.map((tool) => (
                    <li key={tool} className="tool-badge">
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Center: Stats */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">
                📊 Revenue Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)]">
                  <div className="text-xl font-bold text-[var(--confidence-high)]">
                    {formatMRR(entry.claim.mrr)}
                  </div>
                  <div className="text-sm text-[var(--foreground-secondary)]">Monthly Revenue</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)]">
                  <div className="text-xl font-bold text-[var(--foreground)]">
                    {entry.claim.arr ? formatMRR(entry.claim.arr) : formatMRR(entry.claim.mrr * 12)}
                  </div>
                  <div className="text-sm text-[var(--foreground-secondary)]">Annual Revenue</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">
                🔍 Verification Status
              </h4>
              <ul className="space-y-2" role="list">
                <li className="flex items-center gap-2 text-sm">
                  <span className={entry.claim.isStripeVerified ? "text-[var(--confidence-high)]" : "text-[var(--foreground-tertiary)]"} aria-hidden="true">
                    {entry.claim.isStripeVerified ? "✓" : "○"}
                  </span>
                  <span className={entry.claim.isStripeVerified ? "text-[var(--foreground)]" : "text-[var(--foreground-tertiary)]"}>
                    Stripe Verified {entry.claim.isStripeVerified ? "" : "(not verified)"}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={entry.claim.isOpenStartup ? "text-[var(--confidence-high)]" : "text-[var(--foreground-tertiary)]"} aria-hidden="true">
                    {entry.claim.isOpenStartup ? "✓" : "○"}
                  </span>
                  <span className={entry.claim.isOpenStartup ? "text-[var(--foreground)]" : "text-[var(--foreground-tertiary)]"}>
                    Open Startup Dashboard {entry.claim.isOpenStartup ? "" : "(not public)"}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className={entry.claim.hasMultipleSources ? "text-[var(--confidence-high)]" : "text-[var(--foreground-tertiary)]"} aria-hidden="true">
                    {entry.claim.hasMultipleSources ? "✓" : "○"}
                  </span>
                  <span className={entry.claim.hasMultipleSources ? "text-[var(--foreground)]" : "text-[var(--foreground-tertiary)]"}>
                    Multiple Sources {entry.claim.hasMultipleSources ? "" : "(single source)"}
                  </span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Right: Links */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">
                🔗 Links
              </h4>
              <nav className="space-y-2" aria-label="External links for this product">
                {entry.founder.productUrl && (
                  <a
                    href={entry.founder.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-base text-[var(--accent)] hover:text-[var(--accent-secondary)] hover:underline transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span>{entry.founder.productUrl.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}</span>
                    <span className="sr-only">(opens in new tab)</span>
                  </a>
                )}
                {entry.founder.twitterHandle && (
                  <a
                    href={`https://twitter.com/${entry.founder.twitterHandle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-base text-[var(--accent)] hover:text-[var(--accent-secondary)] hover:underline transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>{entry.founder.twitterHandle}</span>
                    <span className="sr-only">(opens in new tab)</span>
                  </a>
                )}
              </nav>
            </div>
            
            {entry.claim.confidenceReason && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground-secondary)] mb-2">
                  📝 Data Note
                </h4>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  {entry.claim.confidenceReason}
                </p>
              </div>
            )}
            
            <div className="pt-2">
              <p className="text-xs text-[var(--foreground-tertiary)]">
                Claimed: {formatDistanceToNow(new Date(entry.claim.claimDate), { addSuffix: true })}
              </p>
            </div>
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
      if (entry.founder.category) {
        cats.add(entry.founder.category);
      }
    });
    return Array.from(cats).sort();
  }, [data]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.founder.productName.toLowerCase().includes(query) ||
          entry.founder.name.toLowerCase().includes(query) ||
          (entry.founder.twitterHandle?.toLowerCase().includes(query) ?? false)
      );
    }
    
    if (categoryFilter !== "all") {
      result = result.filter((entry) => entry.founder.category === categoryFilter);
    }
    
    if (confidenceFilter !== "all") {
      result = result.filter((entry) => entry.claim.confidence === confidenceFilter);
    }
    
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
  const toggleExpanded = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle sort with keyboard support
  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }, [sortKey]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpanded(id);
    }
  }, [toggleExpanded]);

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
  const exportCSV = useCallback(() => {
    const headers = ["Rank", "Product", "Founder", "Category", "MRR ($)", "ARR ($)", "Vibecoded %", "Confidence", "Twitter", "Website", "Source", "Claim Date"];
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
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-[var(--border)]" role="banner">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4 lg:gap-6">
              <Link 
                href="/" 
                className="text-lg font-bold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                aria-label="Vibecoded Leaderboard - Home"
              >
                🏆 Vibecoded Leaderboard
              </Link>
              
              {/* Search */}
              <div className="relative hidden md:block">
                <label htmlFor="search" className="sr-only">Search products or founders</label>
                <input
                  id="search"
                  type="search"
                  placeholder="Search products or founders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-3 py-2 pl-10 text-base bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-20 text-[var(--foreground)] placeholder:text-[var(--foreground-tertiary)]"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-3">
              <button
                onClick={() => setShowAbout(!showAbout)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--background-tertiary)] transition-colors"
                aria-expanded={showAbout}
                aria-controls="about-section"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">About</span>
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--background-tertiary)] transition-colors"
                aria-label="Export leaderboard data as CSV file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <Link
                href="/"
                className="px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                ← Changelog
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* About Section */}
      {showAbout && (
        <section 
          id="about-section"
          className="bg-[var(--background-secondary)] border-b border-[var(--border)] py-6"
          aria-label="About this leaderboard"
        >
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-3">
                  What is "Vibecoded"?
                </h2>
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
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-3">
                  Confidence Levels Explained
                </h2>
                <ul className="space-y-3 text-base" role="list">
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
      <div className="sticky top-[57px] z-10 bg-[var(--background-secondary)] border-b border-[var(--border)]" role="search">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Mobile search */}
            <div className="relative md:hidden w-full mb-2">
              <label htmlFor="search-mobile" className="sr-only">Search products or founders</label>
              <input
                id="search-mobile"
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pl-10 text-base bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)] text-[var(--foreground)]"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="category-filter" className="text-sm text-[var(--foreground-secondary)]">Category:</label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-20"
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
            <fieldset className="flex items-center gap-2">
              <legend className="text-sm text-[var(--foreground-secondary)]">Confidence:</legend>
              <div className="flex gap-1" role="radiogroup" aria-label="Filter by confidence level">
                {[
                  { value: "all", label: "All", icon: null },
                  { value: "high", label: "High", icon: "✓" },
                  { value: "medium", label: "Med", icon: "◐" },
                  { value: "low", label: "Low", icon: "○" },
                ].map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setConfidenceFilter(level.value)}
                    role="radio"
                    aria-checked={confidenceFilter === level.value}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
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
                    {level.icon && <span aria-hidden="true">{level.icon} </span>}
                    {level.label}
                  </button>
                ))}
              </div>
            </fieldset>
            
            {/* Stats */}
            <div className="flex items-center gap-4 ml-auto text-sm" aria-live="polite">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--foreground-secondary)]">Total MRR:</span>
                <span className="font-mono font-bold text-[var(--confidence-high)]">{formatMRR(stats.totalMRR)}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <InfoTooltip tooltip="Average percentage of code generated by AI tools">
                  <span className="text-[var(--foreground-secondary)]">Avg Vibecoded:</span>
                </InfoTooltip>
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

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 lg:px-6 py-6" role="main">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading leaderboard data">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-lg" />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20" role="status">
            <div className="text-6xl mb-4" aria-hidden="true">🔍</div>
            <h2 className="text-xl font-medium text-[var(--foreground)] mb-2">No results found</h2>
            <p className="text-base text-[var(--foreground-secondary)]">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="data-table" role="table" aria-label="Vibecoded products leaderboard">
              <thead>
                <tr role="row">
                  <th scope="col" className="w-12">#</th>
                  <th 
                    scope="col"
                    className="product-cell"
                    onClick={() => handleSort("mrr")}
                    onKeyDown={(e) => e.key === "Enter" && handleSort("mrr")}
                    tabIndex={0}
                    role="columnheader"
                    aria-sort={sortKey === "mrr" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Product / Founder
                  </th>
                  <th scope="col" className="hide-mobile">Category</th>
                  <th 
                    scope="col"
                    onClick={() => handleSort("mrr")} 
                    onKeyDown={(e) => e.key === "Enter" && handleSort("mrr")}
                    tabIndex={0}
                    className={`text-right ${sortKey === "mrr" ? "sorted" : ""}`}
                    role="columnheader"
                    aria-sort={sortKey === "mrr" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    MRR
                    <SortIndicator active={sortKey === "mrr"} dir={sortDir} />
                  </th>
                  <th 
                    scope="col"
                    onClick={() => handleSort("vibecodedPercent")} 
                    onKeyDown={(e) => e.key === "Enter" && handleSort("vibecodedPercent")}
                    tabIndex={0}
                    className={`text-right hide-mobile ${sortKey === "vibecodedPercent" ? "sorted" : ""}`}
                    role="columnheader"
                    aria-sort={sortKey === "vibecodedPercent" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <InfoTooltip tooltip="Percentage of code generated by AI">
                      Vibecoded
                    </InfoTooltip>
                    <SortIndicator active={sortKey === "vibecodedPercent"} dir={sortDir} />
                  </th>
                  <th 
                    scope="col"
                    onClick={() => handleSort("confidence")}
                    onKeyDown={(e) => e.key === "Enter" && handleSort("confidence")}
                    tabIndex={0}
                    className={sortKey === "confidence" ? "sorted" : ""}
                    role="columnheader"
                    aria-sort={sortKey === "confidence" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Confidence
                    <SortIndicator active={sortKey === "confidence"} dir={sortDir} />
                  </th>
                  <th 
                    scope="col"
                    onClick={() => handleSort("claimDate")}
                    onKeyDown={(e) => e.key === "Enter" && handleSort("claimDate")}
                    tabIndex={0}
                    className={`hide-mobile ${sortKey === "claimDate" ? "sorted" : ""}`}
                    role="columnheader"
                    aria-sort={sortKey === "claimDate" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Claimed
                    <SortIndicator active={sortKey === "claimDate"} dir={sortDir} />
                  </th>
                  <th scope="col" className="w-10">
                    <span className="sr-only">Expand row</span>
                  </th>
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
                        role="row"
                        className={`cursor-pointer ${isExpanded ? "expanded" : ""}`}
                        onClick={() => toggleExpanded(entry.founder.id)}
                        onKeyDown={(e) => handleKeyDown(e, entry.founder.id)}
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`${entry.founder.productName} by ${entry.founder.name}, ${formatMRR(entry.claim.mrr)} MRR, ${entry.claim.confidence} confidence. Press Enter to ${isExpanded ? "collapse" : "expand"} details.`}
                      >
                        <td className={`rank-cell ${rank === 1 ? "top-1" : rank === 2 ? "top-2" : rank === 3 ? "top-3" : ""}`} role="cell">
                          {rank}
                        </td>
                        <td className="product-cell" role="cell">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)] flex items-center justify-center text-base font-semibold text-[var(--foreground-secondary)]"
                              aria-hidden="true"
                            >
                              {entry.founder.productName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-[var(--foreground)]">
                                {entry.founder.productName}
                              </div>
                              <div className="text-sm text-[var(--foreground-secondary)]">
                                {entry.founder.name}
                                {entry.founder.twitterHandle && (
                                  <span className="ml-1 text-[var(--accent)]">{entry.founder.twitterHandle}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hide-mobile" role="cell">
                          <CategoryBadge category={entry.founder.category} />
                        </td>
                        <td className="mrr-cell" role="cell">
                          {formatMRR(entry.claim.mrr)}
                        </td>
                        <td className="text-right hide-mobile" role="cell">
                          {entry.founder.vibecodedPercent ? (
                            <span className="font-mono font-semibold text-[var(--accent)]">
                              {entry.founder.vibecodedPercent}%
                            </span>
                          ) : (
                            <span className="text-[var(--foreground-tertiary)]">—</span>
                          )}
                        </td>
                        <td role="cell">
                          <ConfidenceBadge level={entry.claim.confidence} />
                        </td>
                        <td className="text-sm text-[var(--foreground-secondary)] hide-mobile" role="cell">
                          {formatDistanceToNow(new Date(entry.claim.claimDate), { addSuffix: true })}
                        </td>
                        <td role="cell">
                          <button
                            className={`expand-btn ${isExpanded ? "expanded" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(entry.founder.id);
                            }}
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}
                            aria-expanded={isExpanded}
                          >
                            <span aria-hidden="true">▶</span>
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
        
        {/* Data Disclaimer */}
        <aside className="mt-8 p-5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]" aria-label="Data disclaimer">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">⚠️</span>
            <div className="text-sm text-[var(--foreground-secondary)] space-y-2">
              <p>
                <strong className="text-[var(--foreground)]">Data disclaimer:</strong> Revenue figures are self-reported 
                from founder tweets, interviews, and public dashboards. None are independently audited.
              </p>
              <p>
                <strong className="text-[var(--foreground)]">Confidence levels:</strong> 
                <span className="text-[var(--confidence-high)]"> ✓ High</span> = Open Startup or Stripe verified. 
                <span className="text-[var(--confidence-medium)]"> ◐ Medium</span> = Interviews or multiple sources. 
                <span className="text-[var(--confidence-low)]"> ○ Low</span> = Single unverified claim.
              </p>
            </div>
          </div>
        </aside>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 mt-8" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 text-center">
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Data last updated: {new Date().toLocaleDateString()} • 
            <Link href="/" className="text-[var(--accent)] hover:underline ml-1">
              View AI Changelog
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
