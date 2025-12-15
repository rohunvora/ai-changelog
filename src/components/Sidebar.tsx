"use client";

import { PROVIDERS, CATEGORIES, ProviderKey, CategoryKey } from "@/lib/scrapers/types";

interface SidebarProps {
  selectedProvider: ProviderKey | null;
  selectedCategory: CategoryKey | null;
  onProviderChange: (provider: ProviderKey | null) => void;
  onCategoryChange: (category: CategoryKey | null) => void;
  providerCounts?: Record<string, number>;
}

const providerIcons: Record<ProviderKey, string> = {
  openai: "◯",
  anthropic: "◈",
  google: "◆",
  xai: "✕",
  perplexity: "◎",
  cohere: "◇",
};

export function Sidebar({
  selectedProvider,
  selectedCategory,
  onProviderChange,
  onCategoryChange,
  providerCounts = {},
}: SidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-[var(--border)] bg-[var(--background-secondary)] h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-xl font-bold gradient-text">AI Changelog</h1>
          <p className="text-xs text-[var(--foreground-tertiary)] mt-1">
            Track AI updates, generate ideas
          </p>
        </div>

        {/* Providers */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)] mb-3">
            Providers
          </h2>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => onProviderChange(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedProvider === null
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-4 text-center">◉</span>
                  All Providers
                </span>
                <span className="text-xs opacity-60">
                  {Object.values(providerCounts).reduce((a, b) => a + b, 0)}
                </span>
              </button>
            </li>
            {(Object.keys(PROVIDERS) as ProviderKey[]).map((key) => (
              <li key={key}>
                <button
                  onClick={() => onProviderChange(key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedProvider === key
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-4 text-center"
                      style={{ color: PROVIDERS[key].color }}
                    >
                      {providerIcons[key]}
                    </span>
                    {PROVIDERS[key].name}
                  </span>
                  <span className="text-xs opacity-60">
                    {providerCounts[key] || 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)] mb-3">
            Categories
          </h2>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => onCategoryChange(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === null
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
                }`}
              >
                All Categories
              </button>
            </li>
            {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
              <li key={key}>
                <button
                  onClick={() => onCategoryChange(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === key
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORIES[key].color }}
                  />
                  {CATEGORIES[key].name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Saved Ideas Link */}
        <div className="mb-6">
          <a
            href="/saved"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Saved Ideas
          </a>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-[var(--border)]">
          <button
            onClick={async () => {
              const res = await fetch("/api/scrape", { method: "POST" });
              const data = await res.json();
              alert(`Scraped ${data.scraped} updates, inserted ${data.inserted}`);
              window.location.reload();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Updates
          </button>
        </div>
      </div>
    </aside>
  );
}

