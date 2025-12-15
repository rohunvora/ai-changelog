"use client";

import { useState } from "react";
import { PROVIDERS, CATEGORIES, ProviderKey, CategoryKey } from "@/lib/scrapers/types";

interface MobileHeaderProps {
  selectedProvider: ProviderKey | null;
  selectedCategory: CategoryKey | null;
  onProviderChange: (provider: ProviderKey | null) => void;
  onCategoryChange: (category: CategoryKey | null) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function MobileHeader({
  selectedProvider,
  selectedCategory,
  onProviderChange,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: MobileHeaderProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {/* Mobile header */}
      <header className="sticky top-0 z-20 glass border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold gradient-text">AI Changelog</h1>
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="ml-auto p-2 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="mt-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-tertiary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search updates..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Active filters */}
        {(selectedProvider || selectedCategory) && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            {selectedProvider && (
              <button
                onClick={() => onProviderChange(null)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30"
              >
                {PROVIDERS[selectedProvider].name}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {selectedCategory && (
              <button
                onClick={() => onCategoryChange(null)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30"
              >
                {CATEGORIES[selectedCategory].name}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Filters drawer */}
      {isFiltersOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsFiltersOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--background-secondary)] border-t border-[var(--border)] rounded-t-2xl max-h-[70vh] overflow-y-auto animate-fade-in">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                  onClick={() => setIsFiltersOpen(false)}
                  className="p-2 rounded-lg hover:bg-[var(--background-tertiary)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Providers */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[var(--foreground-secondary)] mb-2">Providers</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onProviderChange(null);
                      setIsFiltersOpen(false);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      selectedProvider === null
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--foreground-secondary)]"
                    }`}
                  >
                    All
                  </button>
                  {(Object.keys(PROVIDERS) as ProviderKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        onProviderChange(key);
                        setIsFiltersOpen(false);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        selectedProvider === key
                          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--foreground-secondary)]"
                      }`}
                    >
                      {PROVIDERS[key].name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[var(--foreground-secondary)] mb-2">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onCategoryChange(null);
                      setIsFiltersOpen(false);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      selectedCategory === null
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--foreground-secondary)]"
                    }`}
                  >
                    All
                  </button>
                  {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        onCategoryChange(key);
                        setIsFiltersOpen(false);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        selectedCategory === key
                          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--foreground-secondary)]"
                      }`}
                    >
                      {CATEGORIES[key].name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Refresh button */}
              <button
                onClick={async () => {
                  setIsFiltersOpen(false);
                  const res = await fetch("/api/scrape", { method: "POST" });
                  const data = await res.json();
                  alert(`Scraped ${data.scraped} updates, inserted ${data.inserted}`);
                  window.location.reload();
                }}
                className="w-full py-3 rounded-lg bg-[var(--accent)] text-white font-medium"
              >
                Refresh Updates
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

