"use client";

import { useState } from "react";
import { ProviderBadge } from "./ProviderBadge";
import { IdeaCard, IdeaDisplay } from "./IdeaCard";
import { ProviderKey } from "@/lib/scrapers/types";
import { formatDistanceToNow } from "date-fns";

// API-transformed update type
interface UpdateDisplay {
  id: string;
  provider: string;
  title: string;
  content: string;
  url: string;
  category: string | null;
  unlockType?: string | null;
  capability?: string | null;
  enablesBuilding?: string[];
  publishedAt: string;
  scrapedAt: string;
}

interface UpdateCardProps {
  update: UpdateDisplay;
  initialIdeas?: IdeaDisplay[];
  isOpportunity?: boolean;
}

export function UpdateCard({ update, initialIdeas = [], isOpportunity = false }: UpdateCardProps) {
  const [ideas, setIdeas] = useState<IdeaDisplay[]>(initialIdeas);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);

  const handleGenerateIdeas = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setShowIdeas(true);

    try {
      const response = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateId: update.id }),
      });

      if (!response.ok) throw new Error("Failed to generate ideas");

      const data = await response.json();
      setIdeas(data.ideas);
    } catch (error) {
      console.error("Error generating ideas:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const contentPreview = update.content.length > 250 
    ? update.content.slice(0, 250) + "..." 
    : update.content;

  const isCapabilityUnlock = update.unlockType === "new_capability";

  return (
    <div className={`group border rounded-xl overflow-hidden transition-all ${
      isCapabilityUnlock 
        ? "border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent)]/5 via-[var(--background-secondary)] to-[var(--background-secondary)]"
        : "border-[var(--border)] bg-[var(--background-secondary)]"
    } card-hover`}>
      {/* Main content */}
      <div className="p-5 lg:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <ProviderBadge provider={update.provider as ProviderKey} size="sm" />
            {isCapabilityUnlock && update.capability && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                <span>🔓</span>
                {update.capability}
              </span>
            )}
          </div>
          <span className="text-xs text-[var(--foreground-tertiary)] whitespace-nowrap">
            {formatDate(update.publishedAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3 leading-tight">
          {update.title}
        </h3>

        {/* Content */}
        <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed mb-4">
          {isExpanded ? update.content : contentPreview}
        </p>

        {update.content.length > 250 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-secondary)] mb-4 transition-colors"
          >
            {isExpanded ? "Show less" : "Read more"}
          </button>
        )}

        {/* What this enables - only for capability unlocks */}
        {isCapabilityUnlock && update.enablesBuilding && update.enablesBuilding.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)]">
            <div className="text-xs font-medium text-[var(--foreground-secondary)] mb-2">
              What you can now build:
            </div>
            <div className="flex flex-wrap gap-2">
              {update.enablesBuilding.map((item, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs rounded-md bg-[var(--background-secondary)] text-[var(--foreground-secondary)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
          <a
            href={update.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Source
          </a>

          <button
            onClick={handleGenerateIdeas}
            disabled={isGenerating}
            className={`ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              isCapabilityUnlock
                ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-secondary)]"
                : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate Ideas
              </>
            )}
          </button>

          {ideas.length > 0 && !showIdeas && (
            <button
              onClick={() => setShowIdeas(true)}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-secondary)] transition-colors"
            >
              View {ideas.length} idea{ideas.length > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {/* Ideas section */}
      {showIdeas && ideas.length > 0 && (
        <div className="border-t border-[var(--border)] bg-[var(--background-tertiary)] p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-[var(--foreground)]">
              💡 Generated Ideas ({ideas.length})
            </h4>
            <button
              onClick={() => setShowIdeas(false)}
              className="text-xs text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)]"
            >
              Hide
            </button>
          </div>
          <div className="space-y-3">
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </div>
      )}

      {/* Loading ideas */}
      {isGenerating && showIdeas && (
        <div className="border-t border-[var(--border)] bg-[var(--background-tertiary)] p-4 lg:p-5">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg bg-[var(--background-secondary)] p-4">
                <div className="skeleton h-5 w-2/3 rounded mb-2" />
                <div className="skeleton h-4 w-full rounded mb-1" />
                <div className="skeleton h-4 w-4/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
