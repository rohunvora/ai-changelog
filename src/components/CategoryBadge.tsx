"use client";

import { CATEGORIES, CategoryKey } from "@/lib/scrapers/types";

interface CategoryBadgeProps {
  category: CategoryKey | string | null;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "sm" }: CategoryBadgeProps) {
  const key = (category || "other") as CategoryKey;
  const config = CATEGORIES[key] || CATEGORIES.other;
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center rounded font-medium ${sizeClasses}`}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
      }}
    >
      {config.name}
    </span>
  );
}

