"use client";

import { useState, useEffect, useCallback } from "react";
import { Update } from "@/db/schema";
import { UpdateCard } from "./UpdateCard";
import { Sidebar } from "./Sidebar";
import { SearchBar } from "./SearchBar";
import { MobileHeader } from "./MobileHeader";
import { ProviderKey, CategoryKey } from "@/lib/scrapers/types";

interface UpdatesResponse {
  updates: Update[];
  total: number;
  hasMore: boolean;
}

export function ChangelogFeed() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({});

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
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
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
    } catch (error) {
      console.error("Error fetching updates:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedProvider, selectedCategory, searchQuery, offset]);

  // Fetch provider counts
  useEffect(() => {
    async function fetchCounts() {
      try {
        const response = await fetch("/api/scrape");
        const data = await response.json();
        const counts: Record<string, number> = {};
        data.providers?.forEach((p: { provider: string; count: number }) => {
          counts[p.provider] = p.count;
        });
        setProviderCounts(counts);
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    }
    fetchCounts();
  }, []);

  // Fetch updates when filters change
  useEffect(() => {
    setOffset(0);
    fetchUpdates(true);
  }, [selectedProvider, selectedCategory, searchQuery]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUpdates(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          selectedProvider={selectedProvider}
          selectedCategory={selectedCategory}
          onProviderChange={setSelectedProvider}
          onCategoryChange={setSelectedCategory}
          providerCounts={providerCounts}
        />
      </div>

      {/* Mobile header - hidden on desktop */}
      <MobileHeader
        selectedProvider={selectedProvider}
        selectedCategory={selectedCategory}
        onProviderChange={setSelectedProvider}
        onCategoryChange={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 min-h-screen lg:ml-0">
        {/* Desktop header - hidden on mobile */}
        <header className="hidden lg:block sticky top-0 z-10 glass border-b border-[var(--border)] px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <div className="text-sm text-[var(--foreground-tertiary)] whitespace-nowrap">
              {total} update{total !== 1 ? "s" : ""}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="border border-[var(--border)] rounded-lg bg-[var(--background-secondary)] p-4 lg:p-5"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="skeleton h-6 w-20 rounded-full" />
                    <div className="skeleton h-5 w-16 rounded" />
                  </div>
                  <div className="skeleton h-6 w-3/4 rounded mb-2" />
                  <div className="skeleton h-4 w-full rounded mb-1" />
                  <div className="skeleton h-4 w-2/3 rounded" />
                </div>
              ))}
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-12 lg:py-16">
              <div className="text-5xl lg:text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                No updates found
              </h3>
              <p className="text-sm text-[var(--foreground-secondary)] mb-6 max-w-md mx-auto">
                {searchQuery || selectedProvider || selectedCategory
                  ? "Try adjusting your filters or search query"
                  : "Click 'Refresh Updates' to fetch the latest AI updates from all providers"}
              </p>
              {!searchQuery && !selectedProvider && !selectedCategory && (
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
            </div>
          ) : (
            <>
              {/* Mobile update count */}
              <div className="lg:hidden text-sm text-[var(--foreground-tertiary)] mb-4">
                {total} update{total !== 1 ? "s" : ""}
              </div>

              <div className="space-y-4">
                {updates.map((update, index) => (
                  <div
                    key={update.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
                  >
                    <UpdateCard update={update} />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-6 lg:mt-8 text-center">
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
        </div>
      </main>
    </div>
  );
}
