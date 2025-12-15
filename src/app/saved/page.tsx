"use client";

import { useState, useEffect } from "react";
import { Idea } from "@/db/schema";
import { IdeaCard } from "@/components/IdeaCard";
import Link from "next/link";

export default function SavedIdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSavedIdeas() {
      try {
        const response = await fetch("/api/ideas?saved=true");
        const data = await response.json();
        setIdeas(data.ideas || []);
      } catch (error) {
        console.error("Error fetching saved ideas:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSavedIdeas();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Saved Ideas</h1>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Your bookmarked app ideas
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] p-4"
              >
                <div className="skeleton h-5 w-2/3 rounded mb-2" />
                <div className="skeleton h-4 w-full rounded mb-1" />
                <div className="skeleton h-4 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">💡</div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
              No saved ideas yet
            </h3>
            <p className="text-sm text-[var(--foreground-secondary)] mb-6 max-w-md mx-auto">
              Generate ideas from AI updates and save the ones you want to build
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-secondary)] transition-colors"
            >
              Browse Updates
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ideas.map((idea, index) => (
              <div
                key={idea.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <IdeaCard idea={idea} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

