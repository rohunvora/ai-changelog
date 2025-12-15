"use client";

import { useState } from "react";

// API-transformed idea type (different from DB schema)
export interface IdeaDisplay {
  id: string;
  updateId: string;
  title: string;
  description: string;
  complexity: string | null;       // "low" | "medium" | "high" (transformed from 1-5)
  potentialImpact: string | null;  // "low" | "medium" | "high" (transformed from 1-5)
  techStack: string | null;
  generatedAt: string;
  saved?: boolean;                 // Added by API based on bookmarks
}

interface IdeaCardProps {
  idea: IdeaDisplay;
}

const complexityColors = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
};

const impactColors = {
  low: "#6b7280",
  medium: "#3b82f6",
  high: "#8b5cf6",
};

export function IdeaCard({ idea }: IdeaCardProps) {
  const [isSaved, setIsSaved] = useState(idea.saved || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/ideas/${idea.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: !isSaved }),
      });

      if (response.ok) {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error("Error saving idea:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h5 className="font-medium text-[var(--foreground)]">{idea.title}</h5>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`p-1.5 rounded transition-colors ${
            isSaved
              ? "text-[var(--accent)] bg-[var(--accent)]/10"
              : "text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill={isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>
      </div>

      <p className="text-sm text-[var(--foreground-secondary)] mb-3 leading-relaxed">
        {idea.description}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {idea.complexity && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${complexityColors[idea.complexity as keyof typeof complexityColors] || complexityColors.medium}20`,
              color: complexityColors[idea.complexity as keyof typeof complexityColors] || complexityColors.medium,
            }}
          >
            {idea.complexity} complexity
          </span>
        )}

        {idea.potentialImpact && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${impactColors[idea.potentialImpact as keyof typeof impactColors] || impactColors.medium}20`,
              color: impactColors[idea.potentialImpact as keyof typeof impactColors] || impactColors.medium,
            }}
          >
            {idea.potentialImpact} impact
          </span>
        )}

        {idea.techStack && (
          <span className="text-xs text-[var(--foreground-tertiary)] flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            {idea.techStack}
          </span>
        )}
      </div>
    </div>
  );
}

