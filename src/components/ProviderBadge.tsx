"use client";

import { PROVIDERS, ProviderKey } from "@/lib/scrapers/types";

interface ProviderBadgeProps {
  provider: ProviderKey;
  size?: "sm" | "md";
}

const providerIcons: Record<ProviderKey, string> = {
  openai: "◯",
  anthropic: "◈",
  google: "◆",
  xai: "✕",
  perplexity: "◎",
  cohere: "◇",
};

export function ProviderBadge({ provider, size = "md" }: ProviderBadgeProps) {
  const config = PROVIDERS[provider];
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <span className="opacity-80">{providerIcons[provider]}</span>
      {config.name}
    </span>
  );
}

