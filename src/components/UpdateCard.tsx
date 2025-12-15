"use client";

import { useState, useMemo } from "react";
import { ProviderBadge } from "./ProviderBadge";
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
  isOpportunity?: boolean;
}

// Generate build ideas based on update content
function generateBuildIdeas(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  
  // Video generation
  if (text.includes("video") && (text.includes("generat") || text.includes("sora"))) {
    return [
      "AI music video generator from lyrics",
      "Product demo video creator from screenshots",
      "Animated explainer videos for educators",
      "Social media content generator for brands"
    ];
  }
  
  // Computer use / desktop control
  if (text.includes("computer use") || text.includes("desktop") || text.includes("control your")) {
    return [
      "QA automation that tests any web app visually",
      "Data entry bot for legacy systems without APIs",
      "Personal assistant that books appointments across sites",
      "Automated expense report filler from receipts"
    ];
  }
  
  // Voice / realtime
  if (text.includes("voice") || text.includes("realtime") || text.includes("real-time") || text.includes("audio")) {
    return [
      "AI phone receptionist for small businesses",
      "Language learning partner with natural conversation",
      "Podcast co-host that responds in real-time",
      "Voice-based customer support agent"
    ];
  }
  
  // Vision / image understanding
  if (text.includes("vision") || text.includes("image understanding") || text.includes("see images")) {
    return [
      "Visual content moderator for platforms",
      "Screenshot-to-code converter",
      "Real-time chart interpreter for traders",
      "Accessibility tool that describes images"
    ];
  }
  
  // Web search / research
  if (text.includes("search") || text.includes("research") || text.includes("web") || text.includes("citation")) {
    return [
      "Fact-checking browser extension with sources",
      "Research chatbot that cites everything",
      "Due diligence tool for investors",
      "Competitive intelligence dashboard"
    ];
  }
  
  // Multimodal / native output
  if (text.includes("multimodal") || text.includes("native output") || text.includes("image") && text.includes("audio")) {
    return [
      "Real-time visual translator with audio",
      "Interactive diagram generator",
      "Live tutoring app with visual explanations",
      "Podcast host that generates images"
    ];
  }
  
  // Agentic / autonomous
  if (text.includes("agent") || text.includes("autonomous") || text.includes("agentic")) {
    return [
      "Autonomous code review agent",
      "Multi-step research assistant",
      "AI project manager that delegates tasks",
      "Self-improving documentation bot"
    ];
  }
  
  // RAG / enterprise
  if (text.includes("rag") || text.includes("retrieval") || text.includes("enterprise") || text.includes("knowledge")) {
    return [
      "Internal knowledge base chatbot",
      "Customer support bot trained on docs",
      "Legal discovery tool with citations"
    ];
  }
  
  // Reasoning / o1
  if (text.includes("reasoning") || text.includes("chain of thought") || text.includes("o1")) {
    return [
      "Competitive programming assistant",
      "Math tutor that shows its work",
      "Bug finder that reasons through code paths",
      "Scientific hypothesis generator"
    ];
  }
  
  // Tool use / function calling
  if (text.includes("tool use") || text.includes("function calling") || text.includes("mcp") || text.includes("protocol")) {
    return [
      "Universal AI connector for SaaS tools",
      "Enterprise knowledge base spanning all tools",
      "IDE plugin that understands your codebase"
    ];
  }
  
  // Default for model releases
  if (text.includes("model") || text.includes("release") || text.includes("launch")) {
    return [
      "Improved coding assistant",
      "Enhanced document analysis tool",
      "Smarter content generation platform"
    ];
  }
  
  return [];
}

export function UpdateCard({ update, isOpportunity = false }: UpdateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Generate build ideas client-side
  const buildIdeas = useMemo(() => {
    // Use provided ideas if available, otherwise generate
    if (update.enablesBuilding && update.enablesBuilding.length > 0) {
      return update.enablesBuilding;
    }
    return generateBuildIdeas(update.title, update.content);
  }, [update.title, update.content, update.enablesBuilding]);

  const contentPreview = update.content.length > 250 
    ? update.content.slice(0, 250) + "..." 
    : update.content;

  const isCapabilityUnlock = update.unlockType === "new_capability" || buildIdeas.length > 0;
  const hasBuildIdeas = buildIdeas.length > 0;

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
            {isCapabilityUnlock && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                <span>🔓</span>
                Opportunity
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

        {/* Build Ideas - shown as bullet points */}
        {hasBuildIdeas && (
          <div className="mb-4 p-4 rounded-lg bg-[var(--background-tertiary)] border border-[var(--accent)]/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">💡</span>
              <span className="text-sm font-medium text-[var(--foreground)]">
                What you can build now
              </span>
            </div>
            <ul className="space-y-2">
              {buildIdeas.slice(0, 4).map((idea, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-[var(--foreground-secondary)]"
                >
                  <span className="text-[var(--accent)] mt-0.5 flex-shrink-0">→</span>
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
          <a
            href={update.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Read announcement
          </a>
        </div>
      </div>
    </div>
  );
}
