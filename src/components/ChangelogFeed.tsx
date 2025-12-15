"use client";

import { useState, useEffect, useCallback } from "react";
import { UpdateCard } from "./UpdateCard";
import { SearchBar } from "./SearchBar";
import { ProviderBadge } from "./ProviderBadge";
import { ProviderKey, PROVIDERS } from "@/lib/scrapers/types";
import Link from "next/link";

// API-transformed update type
interface UpdateDisplay {
  id: string;
  provider: string;
  title: string;
  content: string;
  url: string;
  category: string | null;
  unlockType: string | null;
  capability: string | null;
  enablesBuilding: string[];
  publishedAt: string;
  scrapedAt: string;
}

interface UpdatesResponse {
  updates: UpdateDisplay[];
  total: number;
  hasMore: boolean;
  counts: {
    opportunities: number;
    all: number;
  };
}

type ViewMode = "opportunities" | "all";

export function ChangelogFeed() {
  const [updates, setUpdates] = useState<UpdateDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [counts, setCounts] = useState({ opportunities: 0, all: 0 });
  
  const [viewMode, setViewMode] = useState<ViewMode>("opportunities");
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUpdates = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (selectedProvider) params.set("provider", selectedProvider);
      if (searchQuery) params.set("search", searchQuery);
      params.set("unlockType", viewMode === "opportunities" ? "opportunities" : "all");
      params.set("limit", "20");
      params.set("offset", currentOffset.toString());

      const response = await fetch(`/api/updates?${params}`);
      const data: UpdatesResponse = await response.json();

      if (reset) {
        setUpdates(data.updates);
        setOffset(data.updates.length);
      } else {
        setUpdates((prev) => [...prev, ...data.updates]);
        setOffset((prev) => prev + data.updates.length);
      }
      
      setTotal(data.total);
      setHasMore(data.hasMore);
      setCounts(data.counts);
    } catch (error) {
      console.error("Error fetching updates:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedProvider, searchQuery, viewMode, offset]);

  // Fetch updates when filters change
  useEffect(() => {
    setOffset(0);
    fetchUpdates(true);
  }, [selectedProvider, searchQuery, viewMode]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUpdates(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 lg:px-6">
          {/* Top bar */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-bold gradient-text">AI Opportunities</h1>
              <p className="text-xs text-[var(--foreground-tertiary)]">
                What can you build today that you couldn't yesterday?
              </p>
            </div>
            <Link
              href="/leaderboard"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              <span className="text-base">🏆</span>
              Leaderboard
            </Link>
            <Link
              href="/saved"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Saved
            </Link>
      </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 border-t border-[var(--border)] -mb-px">
            <button
              onClick={() => setViewMode("opportunities")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                viewMode === "opportunities"
                  ? "border-[var(--accent)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">🔓</span>
                Opportunities
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  {counts.opportunities}
                </span>
              </span>
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                viewMode === "all"
                  ? "border-[var(--accent)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)]"
              }`}
            >
              All Updates
              <span className="ml-2 text-xs text-[var(--foreground-tertiary)]">
                {counts.all}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            
            {/* Provider filter chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedProvider(null)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  !selectedProvider
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                }`}
              >
                All
              </button>
              {Object.keys(PROVIDERS).map((provider) => (
                <button
                  key={provider}
                  onClick={() => setSelectedProvider(provider as ProviderKey)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedProvider === provider
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                  }`}
                >
                  {PROVIDERS[provider as ProviderKey].name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

        {/* Content */}
      <main className="max-w-5xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
          {loading ? (
            <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div
                  key={i}
                className="border border-[var(--border)] rounded-xl bg-[var(--background-secondary)] p-5 lg:p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="skeleton h-6 w-20 rounded-full" />
                  <div className="skeleton h-5 w-24 rounded-full" />
                  </div>
                <div className="skeleton h-7 w-3/4 rounded mb-3" />
                <div className="skeleton h-4 w-full rounded mb-2" />
                  <div className="skeleton h-4 w-2/3 rounded" />
                </div>
              ))}
            </div>
          ) : updates.length === 0 ? (
          <div className="text-center py-16">
            {viewMode === "opportunities" ? (
              <>
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                  No capability unlocks found
                </h3>
                <p className="text-sm text-[var(--foreground-secondary)] mb-6 max-w-md mx-auto">
                  {searchQuery || selectedProvider
                    ? "Try adjusting your filters"
                    : "New capability unlocks are rare - check back soon or view all updates"}
                </p>
                {!searchQuery && !selectedProvider && (
                  <button
                    onClick={() => setViewMode("all")}
                    className="px-6 py-2.5 text-sm font-medium rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                  >
                    View All Updates
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                No updates found
              </h3>
              <p className="text-sm text-[var(--foreground-secondary)] mb-6 max-w-md mx-auto">
                  {searchQuery || selectedProvider
                    ? "Try adjusting your filters"
                    : "Fetch updates to get started"}
              </p>
                {!searchQuery && !selectedProvider && (
                <button
                  onClick={async () => {
                    const res = await fetch("/api/scrape", { method: "POST" });
                    const data = await res.json();
                    alert(`Scraped ${data.scraped} updates, inserted ${data.inserted}`);
                    window.location.reload();
                  }}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-secondary)] transition-colors"
                >
                  Fetch Updates Now
                </button>
                )}
              </>
              )}
            </div>
          ) : (
            <>
            {viewMode === "opportunities" && (
              <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-[var(--accent)]/5 to-transparent border border-[var(--accent)]/20">
                <p className="text-sm text-[var(--foreground-secondary)]">
                  <span className="font-medium text-[var(--foreground)]">
                    {counts.opportunities} capability unlock{counts.opportunities !== 1 ? "s" : ""}
                  </span>
                  {" "}— These updates enable building something that wasn't possible before.
                </p>
              </div>
            )}

              <div className="space-y-4">
                {updates.map((update, index) => (
                  <div
                    key={update.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
                  >
                  <UpdateCard update={update} isOpportunity={viewMode === "opportunities"} />
                  </div>
                ))}
              </div>

              {hasMore && (
              <div className="mt-8 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 text-sm font-medium rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)] disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </span>
                    ) : (
                      `Load More (${total - updates.length} remaining)`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
      </main>
    </div>
  );
}
