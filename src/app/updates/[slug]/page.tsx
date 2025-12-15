"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

// Types
interface Opportunity {
  id: string;
  title: string;
  description: string;
  targetUser: string;
  jobToBeDone: string;
  surfaceArea: string;
  hardDependencies: string[];
  distributionWedge: string[];
  moatPotential: string[];
  indieViabilityScore: number;
  timeToRevenueScore: number;
  competitionScore: number;
  pricingAnchor: string;
  mvpBullets: string[];
  risks: string[];
}

interface RelatedProduct {
  id: string;
  productName: string;
  founderName: string;
  twitterHandle?: string;
  category?: string;
  mrr: number;
  vibecodedPercent?: number;
  toolsUsed: string[];
}

interface UpdateDetail {
  id: string;
  title: string;
  provider: string;
  url: string;
  category?: string;
  contentMd: string;
  unlockType: string;
  capability?: string;
  enablesBuilding: string[];
  publishedAt: string;
  opportunities: Opportunity[];
  relatedProducts: RelatedProduct[];
  marketGaps: string[];
  capabilityTags: string[];
}

// Utility functions
function formatMRR(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000000) return `$${(dollars / 1000000).toFixed(2)}M`;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const colors = {
    1: "bg-red-500/20 text-red-400 border-red-500/40",
    2: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    3: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    4: "bg-lime-500/20 text-lime-400 border-lime-500/40",
    5: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-bold ${colors[score as keyof typeof colors] || colors[3]}`}>
        {score}
      </div>
      <span className="text-xs text-[var(--foreground-tertiary)] mt-1">{label}</span>
    </div>
  );
}

function DependencyBadge({ dep }: { dep: string }) {
  const icons: Record<string, string> = {
    tool_use: "🔧",
    realtime_voice: "🎤",
    vision: "👁️",
    browsing: "🌐",
    code_exec: "💻",
    reasoning: "🧠",
    search: "🔍",
  };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--background-tertiary)] border border-[var(--border)] text-[var(--foreground-secondary)]">
      {icons[dep] || "⚡"} {dep.replace(/_/g, " ")}
    </span>
  );
}

function DistributionBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    seo: "bg-blue-500/20 text-blue-400",
    templates: "bg-purple-500/20 text-purple-400",
    marketplace: "bg-green-500/20 text-green-400",
    plg: "bg-yellow-500/20 text-yellow-400",
    outbound: "bg-orange-500/20 text-orange-400",
    community: "bg-pink-500/20 text-pink-400",
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-md ${colors[channel] || "bg-gray-500/20 text-gray-400"}`}>
      {channel.toUpperCase()}
    </span>
  );
}

// Opportunity Card Component
function OpportunityCard({ 
  opportunity, 
  index, 
  onSave 
}: { 
  opportunity: Opportunity; 
  index: number;
  onSave: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-[var(--foreground)]">{opportunity.title}</h3>
              <p className="text-sm text-[var(--foreground-secondary)] mt-1">{opportunity.description}</p>
            </div>
          </div>
          <button
            onClick={() => onSave(opportunity.id)}
            className="shrink-0 px-3 py-1.5 text-sm rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--foreground-secondary)] hover:text-[var(--accent)] transition-colors"
          >
            + Save
          </button>
        </div>
        
        {/* Scores */}
        <div className="flex items-center gap-6 mt-4">
          <ScoreBadge score={opportunity.indieViabilityScore} label="Indie" />
          <ScoreBadge score={opportunity.timeToRevenueScore} label="Speed" />
          <ScoreBadge score={5 - opportunity.competitionScore + 1} label="Opportunity" />
          {opportunity.pricingAnchor && (
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold text-[var(--confidence-high)]">{opportunity.pricingAnchor}</div>
              <span className="text-xs text-[var(--foreground-tertiary)]">Pricing</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Info */}
      <div className="p-5 grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">Target User</h4>
          <p className="text-sm text-[var(--foreground)]">{opportunity.targetUser}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">Job to be Done</h4>
          <p className="text-sm text-[var(--foreground)]">{opportunity.jobToBeDone}</p>
        </div>
      </div>
      
      {/* Dependencies & Distribution */}
      <div className="px-5 pb-5 flex flex-wrap gap-4">
        <div>
          <h4 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">Requires</h4>
          <div className="flex flex-wrap gap-1.5">
            {opportunity.hardDependencies?.map((dep) => (
              <DependencyBadge key={dep} dep={dep} />
            ))}
            {(!opportunity.hardDependencies || opportunity.hardDependencies.length === 0) && (
              <span className="text-sm text-[var(--foreground-tertiary)]">No special requirements</span>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">Distribution</h4>
          <div className="flex flex-wrap gap-1.5">
            {opportunity.distributionWedge?.map((channel) => (
              <DistributionBadge key={channel} channel={channel} />
            ))}
          </div>
        </div>
      </div>
      
      {/* Expand for MVP + Risks */}
      <div className="border-t border-[var(--border)]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-3 flex items-center justify-between text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background-tertiary)] transition-colors"
        >
          <span>{expanded ? "Hide" : "Show"} MVP Spec & Risks</span>
          <span className="transform transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "" }}>▼</span>
        </button>
        
        {expanded && (
          <div className="px-5 pb-5 grid md:grid-cols-2 gap-6 animate-fade-in">
            <div>
              <h4 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-3">📋 MVP Spec (10 bullets)</h4>
              <ol className="space-y-2">
                {opportunity.mvpBullets?.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--foreground-secondary)]">
                    <span className="text-[var(--accent)] font-mono">{i + 1}.</span>
                    {bullet}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-3">⚠️ Risks & Watch-outs</h4>
              <ul className="space-y-2">
                {opportunity.risks?.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--foreground-secondary)]">
                    <span className="text-[var(--confidence-low)]">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
              
              {opportunity.moatPotential && opportunity.moatPotential.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">🏰 Moat Potential</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {opportunity.moatPotential.map((moat) => (
                      <span key={moat} className="px-2 py-1 text-xs rounded-md bg-[var(--accent)]/20 text-[var(--accent)]">
                        {moat.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Related Product Card
function RelatedProductCard({ product }: { product: RelatedProduct }) {
  return (
    <Link 
      href={`/leaderboard?search=${encodeURIComponent(product.productName)}`}
      className="block p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-[var(--foreground)]">{product.productName}</span>
        <span className="font-mono font-bold text-[var(--confidence-high)]">{formatMRR(product.mrr)}</span>
      </div>
      <div className="text-sm text-[var(--foreground-secondary)]">
        {product.founderName}
        {product.twitterHandle && <span className="ml-1 text-[var(--accent)]">{product.twitterHandle}</span>}
      </div>
      {product.vibecodedPercent && (
        <div className="mt-2 text-xs text-[var(--accent)]">{product.vibecodedPercent}% vibecoded</div>
      )}
      {product.toolsUsed && product.toolsUsed.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {product.toolsUsed.slice(0, 3).map((tool) => (
            <span key={tool} className="px-1.5 py-0.5 text-xs rounded bg-[var(--background-tertiary)] text-[var(--foreground-tertiary)]">
              {tool}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

// Main Page Component
export default function UpdateDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [update, setUpdate] = useState<UpdateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUpdate() {
      setLoading(true);
      try {
        const response = await fetch(`/api/updates/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Update not found");
          } else {
            setError("Failed to load update");
          }
          return;
        }
        const data = await response.json();
        setUpdate(data);
      } catch (err) {
        setError("Failed to load update");
      } finally {
        setLoading(false);
      }
    }
    fetchUpdate();
  }, [slug]);

  const handleSaveOpportunity = useCallback((opportunityId: string) => {
    // Get existing saved items from localStorage
    const saved = JSON.parse(localStorage.getItem("savedItems") || "[]");
    const item = {
      id: `opp-${opportunityId}`,
      type: "opportunity",
      itemId: opportunityId,
      updateId: update?.id,
      notes: "",
      addedAt: new Date().toISOString(),
    };
    
    // Check if already saved
    if (!saved.find((s: { id: string }) => s.id === item.id)) {
      saved.push(item);
      localStorage.setItem("savedItems", JSON.stringify(saved));
      alert("Saved to your collection!");
    } else {
      alert("Already saved!");
    }
  }, [update?.id]);

  const handleSaveUpdate = useCallback(() => {
    if (!update) return;
    const saved = JSON.parse(localStorage.getItem("savedItems") || "[]");
    const item = {
      id: `update-${update.id}`,
      type: "update",
      itemId: update.id,
      title: update.title,
      notes: "",
      addedAt: new Date().toISOString(),
    };
    
    if (!saved.find((s: { id: string }) => s.id === item.id)) {
      saved.push(item);
      localStorage.setItem("savedItems", JSON.stringify(saved));
      alert("Update saved!");
    } else {
      alert("Already saved!");
    }
  }, [update]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--foreground-secondary)]">Loading opportunity...</p>
        </div>
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">{error || "Update not found"}</h1>
          <Link href="/" className="text-[var(--accent)] hover:underline">← Back to changelog</Link>
        </div>
      </div>
    );
  }

  const providerColors: Record<string, string> = {
    openai: "bg-[#10a37f]",
    anthropic: "bg-[#d4a574]",
    google: "bg-[#4285f4]",
    xai: "bg-white text-black",
    perplexity: "bg-[#20808d]",
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between py-3">
            <Link href="/" className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2">
              ← Back to Changelog
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveUpdate}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-secondary)] transition-colors"
              >
                Save Update
              </button>
              <Link
                href={update.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                View Source →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
        {/* Update Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${providerColors[update.provider] || "bg-gray-500"}`}>
              {update.provider.toUpperCase()}
            </span>
            {update.unlockType === "new_capability" && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/40">
                🔓 New Capability
              </span>
            )}
            <span className="text-sm text-[var(--foreground-tertiary)]">
              {formatDistanceToNow(new Date(update.publishedAt), { addSuffix: true })}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-4">{update.title}</h1>
          
          {update.capability && (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 mb-6">
              <h2 className="text-sm font-semibold text-purple-400 mb-1">Capability Unlock</h2>
              <p className="text-lg text-[var(--foreground)]">{update.capability}</p>
            </div>
          )}

          {/* Capability Tags */}
          {update.capabilityTags && update.capabilityTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {update.capabilityTags.map((tag) => (
                <span key={tag} className="px-2 py-1 text-xs rounded-md bg-[var(--background-tertiary)] text-[var(--foreground-secondary)]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Opportunities */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                🎯 Business Opportunities ({update.opportunities?.length || 0})
              </h2>
            </div>
            
            {update.opportunities && update.opportunities.length > 0 ? (
              <div className="space-y-6">
                {update.opportunities.map((opp, index) => (
                  <OpportunityCard 
                    key={opp.id} 
                    opportunity={opp} 
                    index={index}
                    onSave={handleSaveOpportunity}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-center">
                <div className="text-4xl mb-3">🔮</div>
                <p className="text-[var(--foreground-secondary)]">
                  No structured opportunities yet. Check the "What you can build" section below.
                </p>
              </div>
            )}

            {/* Legacy enables_building content */}
            {update.enablesBuilding && update.enablesBuilding.length > 0 && (
              <div className="mt-8 p-5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-3">
                  💡 What You Can Build Now
                </h3>
                <ul className="space-y-2">
                  {update.enablesBuilding.map((idea, i) => (
                    <li key={i} className="flex items-start gap-2 text-[var(--foreground-secondary)]">
                      <span className="text-[var(--accent)]">→</span>
                      {idea}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar - Market Map */}
          <div className="space-y-6">
            {/* Related Products */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-3">
                📊 Similar Products (Proof it Works)
              </h3>
              {update.relatedProducts && update.relatedProducts.length > 0 ? (
                <div className="space-y-3">
                  {update.relatedProducts.map((product) => (
                    <RelatedProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-center text-sm text-[var(--foreground-tertiary)]">
                  No related products found yet
                </div>
              )}
              <Link 
                href="/leaderboard" 
                className="block mt-3 text-sm text-center text-[var(--accent)] hover:underline"
              >
                View full leaderboard →
              </Link>
            </div>

            {/* Market Gaps */}
            {update.marketGaps && update.marketGaps.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-3">
                  💡 Gaps (Underserved Areas)
                </h3>
                <div className="space-y-2">
                  {update.marketGaps.map((gap, i) => (
                    <div key={i} className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-[var(--foreground)]">
                      {gap}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Why Now */}
            <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">
                ⏰ Why Now?
              </h3>
              <ul className="space-y-2 text-sm text-[var(--foreground-secondary)]">
                <li>• Released {formatDistanceToNow(new Date(update.publishedAt), { addSuffix: true })}</li>
                {update.unlockType === "new_capability" && (
                  <li>• First-mover opportunity on new capability</li>
                )}
                <li>• API now stable and production-ready</li>
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="p-4 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30">
              <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">🚀 Ready to Build?</h3>
              <div className="space-y-2">
                <button 
                  onClick={handleSaveUpdate}
                  className="w-full px-4 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-secondary)] transition-colors"
                >
                  Save to Collection
                </button>
                <Link 
                  href="/saved"
                  className="block w-full px-4 py-2 text-sm text-center rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                >
                  View Saved Items
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

