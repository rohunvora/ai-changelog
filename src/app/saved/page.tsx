"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

// Types
interface SavedItem {
  id: string;
  type: "update" | "product" | "opportunity";
  itemId: string;
  title?: string;
  updateId?: string;
  updateTitle?: string;
  description?: string;
  targetUser?: string;
  pricingAnchor?: string;
  scores?: {
    indie: number;
    speed: number;
    opportunity: number;
  };
  notes: string;
  addedAt: string;
  collectionId?: string;
}

interface Collection {
  id: string;
  name: string;
  createdAt: string;
}

// Generate share URL from items
function generateShareUrl(items: SavedItem[]): string {
  const ids = items.map(i => `${i.type.charAt(0)}:${i.itemId}`).join(",");
  return `${window.location.origin}/saved?items=${encodeURIComponent(ids)}`;
}

// Parse share URL
function parseShareUrl(url: string): string[] {
  try {
    const params = new URL(url).searchParams;
    const items = params.get("items");
    if (items) {
      return decodeURIComponent(items).split(",");
    }
  } catch {}
  return [];
}

export default function SavedPage() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load from localStorage
  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("savedItems") || "[]");
    const colls = JSON.parse(localStorage.getItem("collections") || "[]");
    setSavedItems(items);
    setCollections(colls);
  }, []);

  // Save to localStorage
  const persistItems = useCallback((items: SavedItem[]) => {
    localStorage.setItem("savedItems", JSON.stringify(items));
    setSavedItems(items);
  }, []);

  const persistCollections = useCallback((colls: Collection[]) => {
    localStorage.setItem("collections", JSON.stringify(colls));
    setCollections(colls);
  }, []);

  // Create collection
  const createCollection = useCallback(() => {
    if (!newCollectionName.trim()) return;
    
    const newColl: Collection = {
      id: `coll-${Date.now()}`,
      name: newCollectionName.trim(),
      createdAt: new Date().toISOString(),
    };
    
    persistCollections([...collections, newColl]);
    setNewCollectionName("");
    setShowNewCollection(false);
    setSelectedCollection(newColl.id);
  }, [newCollectionName, collections, persistCollections]);

  // Delete collection
  const deleteCollection = useCallback((collId: string) => {
    // Remove collection and unassign items
    const updatedItems = savedItems.map(item => 
      item.collectionId === collId ? { ...item, collectionId: undefined } : item
    );
    persistItems(updatedItems);
    persistCollections(collections.filter(c => c.id !== collId));
    if (selectedCollection === collId) setSelectedCollection(null);
  }, [savedItems, collections, selectedCollection, persistItems, persistCollections]);

  // Move item to collection
  const moveToCollection = useCallback((itemId: string, collId: string | null) => {
    const updatedItems = savedItems.map(item =>
      item.id === itemId ? { ...item, collectionId: collId || undefined } : item
    );
    persistItems(updatedItems);
  }, [savedItems, persistItems]);

  // Update notes
  const updateNotes = useCallback((itemId: string, notes: string) => {
    const updatedItems = savedItems.map(item =>
      item.id === itemId ? { ...item, notes } : item
    );
    persistItems(updatedItems);
    setEditingNotes(null);
  }, [savedItems, persistItems]);

  // Remove item
  const removeItem = useCallback((itemId: string) => {
    persistItems(savedItems.filter(item => item.id !== itemId));
  }, [savedItems, persistItems]);

  // Generate share link
  const generateShare = useCallback(() => {
    const items = selectedCollection
      ? savedItems.filter(i => i.collectionId === selectedCollection)
      : savedItems;
    setShareUrl(generateShareUrl(items));
  }, [savedItems, selectedCollection]);

  // Export to CSV
  const exportCSV = useCallback(() => {
    const items = selectedCollection
      ? savedItems.filter(i => i.collectionId === selectedCollection)
      : savedItems;
    
    const headers = ["Type", "Title", "ID", "Notes", "Added At", "Collection"];
    const rows = items.map(item => {
      const coll = collections.find(c => c.id === item.collectionId);
      return [
        item.type,
        item.title || item.itemId,
        item.itemId,
        item.notes,
        item.addedAt,
        coll?.name || "",
      ];
    });
    
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saved-items-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [savedItems, selectedCollection, collections]);

  // Filter items by collection and search
  const filteredItems = useMemo(() => {
    let items = savedItems;
    
    if (selectedCollection) {
      items = items.filter(i => i.collectionId === selectedCollection);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => 
        i.title?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q) ||
        i.type.includes(q)
      );
    }
    
    return items.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }, [savedItems, selectedCollection, searchQuery]);

  // Group items by type
  const groupedItems = useMemo(() => {
    const groups: Record<string, SavedItem[]> = {
      opportunity: [],
      update: [],
      product: [],
    };
    
    filteredItems.forEach(item => {
      if (groups[item.type]) {
        groups[item.type].push(item);
      }
    });
    
    return groups;
  }, [filteredItems]);

  const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
    opportunity: { label: "Opportunities", icon: "🎯", color: "text-purple-400" },
    update: { label: "Updates", icon: "📰", color: "text-blue-400" },
    product: { label: "Products", icon: "🏢", color: "text-green-400" },
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-lg font-bold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                📚 Saved Items
              </Link>
              <span className="text-sm text-[var(--foreground-tertiary)]">
                {filteredItems.length} items
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={generateShare}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                🔗 Share
              </button>
              <button
                onClick={exportCSV}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                📥 Export
              </button>
              <Link
                href="/"
                className="px-3 py-1.5 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                ← Changelog
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - Collections */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search saved items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 pl-9 text-sm bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Collections */}
              <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Collections</h3>
                
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCollection(null)}
                    className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                      selectedCollection === null
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
                    }`}
                  >
                    All Items ({savedItems.length})
                  </button>
                  
                  {collections.map(coll => {
                    const count = savedItems.filter(i => i.collectionId === coll.id).length;
                    return (
                      <div key={coll.id} className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedCollection(coll.id)}
                          className={`flex-1 px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                            selectedCollection === coll.id
                              ? "bg-[var(--accent)] text-white"
                              : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
                          }`}
                        >
                          {coll.name} ({count})
                        </button>
                        <button
                          onClick={() => deleteCollection(coll.id)}
                          className="p-1.5 text-[var(--foreground-tertiary)] hover:text-red-400 transition-colors"
                          title="Delete collection"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                {/* New Collection */}
                {showNewCollection ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="Collection name..."
                      className="flex-1 px-2 py-1.5 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded text-[var(--foreground)]"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && createCollection()}
                    />
                    <button
                      onClick={createCollection}
                      className="px-2 py-1.5 text-sm bg-[var(--accent)] text-white rounded"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewCollection(true)}
                    className="mt-3 w-full px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] border border-dashed border-[var(--border)] rounded-lg transition-colors"
                  >
                    + New Collection
                  </button>
                )}
              </div>

              {/* Tips */}
              <div className="p-4 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-sm">
                <h4 className="font-semibold text-[var(--accent)] mb-2">💡 Tips</h4>
                <ul className="space-y-1.5 text-[var(--foreground-secondary)]">
                  <li>• Save updates, products, or opportunities</li>
                  <li>• Organize into collections</li>
                  <li>• Add notes to remember context</li>
                  <li>• Share shortlists with your team</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content - Saved Items */}
          <div className="lg:col-span-3">
            {/* Share URL Modal */}
            {shareUrl && (
              <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-green-400">📎 Share Link Generated</h4>
                  <button onClick={() => setShareUrl(null)} className="text-[var(--foreground-tertiary)] hover:text-[var(--foreground)]">×</button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded text-[var(--foreground)]"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(shareUrl); }}
                    className="px-3 py-2 text-sm bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-secondary)] transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📭</div>
                <h2 className="text-xl font-medium text-[var(--foreground)] mb-2">
                  {searchQuery ? "No matching items" : "No saved items yet"}
                </h2>
                <p className="text-[var(--foreground-secondary)] mb-6">
                  {searchQuery 
                    ? "Try a different search term"
                    : "Save updates, products, or opportunities to build your research shortlist"
                  }
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    href="/"
                    className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-secondary)] transition-colors"
                  >
                    Browse Updates
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="px-4 py-2 text-sm bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground-secondary)] rounded-lg hover:text-[var(--foreground)] transition-colors"
                  >
                    View Leaderboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Grouped by type */}
                {Object.entries(groupedItems).map(([type, items]) => {
                  if (items.length === 0) return null;
                  const { label, icon, color } = typeLabels[type];
                  
                  return (
                    <div key={type}>
                      <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${color}`}>
                        {icon} {label} ({items.length})
                      </h3>
                      <div className="space-y-3">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--background-tertiary)] text-[var(--foreground-tertiary)]">
                                    {item.type}
                                  </span>
                                  <span className="text-xs text-[var(--foreground-tertiary)]">
                                    {formatDistanceToNow(new Date(item.addedAt), { addSuffix: true })}
                                  </span>
                                  {item.pricingAnchor && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">
                                      {item.pricingAnchor}
                                    </span>
                                  )}
                                </div>
                                
                                <Link
                                  href={
                                    item.type === "update" 
                                      ? `/updates/${item.itemId}`
                                      : item.type === "product"
                                      ? `/leaderboard?search=${encodeURIComponent(item.title || item.itemId)}`
                                      : `/updates/${item.updateId || item.itemId}`
                                  }
                                  className="font-semibold text-lg text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                                >
                                  {item.title || item.itemId}
                                </Link>
                                
                                {/* Description for opportunities */}
                                {item.description && (
                                  <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
                                    {item.description}
                                  </p>
                                )}
                                
                                {/* Target user */}
                                {item.targetUser && (
                                  <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">
                                    <span className="font-medium">Target:</span> {item.targetUser}
                                  </p>
                                )}
                                
                                {/* Parent update link */}
                                {item.updateTitle && item.type === "opportunity" && (
                                  <Link 
                                    href={`/updates/${item.updateId}`}
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                                  >
                                    ← From: {item.updateTitle}
                                  </Link>
                                )}
                                
                                {/* Scores for opportunities */}
                                {item.scores && (
                                  <div className="mt-3 flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-[var(--foreground-tertiary)]">Indie:</span>
                                      <span className={`text-sm font-bold ${item.scores.indie >= 4 ? "text-green-400" : item.scores.indie >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                                        {item.scores.indie}/5
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-[var(--foreground-tertiary)]">Speed:</span>
                                      <span className={`text-sm font-bold ${item.scores.speed >= 4 ? "text-green-400" : item.scores.speed >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                                        {item.scores.speed}/5
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-[var(--foreground-tertiary)]">Opp:</span>
                                      <span className={`text-sm font-bold ${item.scores.opportunity >= 4 ? "text-green-400" : item.scores.opportunity >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                                        {item.scores.opportunity}/5
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Notes */}
                                {editingNotes === item.id ? (
                                  <div className="mt-3 flex gap-2">
                                    <input
                                      type="text"
                                      defaultValue={item.notes}
                                      className="flex-1 px-2 py-1 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded text-[var(--foreground)]"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          updateNotes(item.id, (e.target as HTMLInputElement).value);
                                        } else if (e.key === "Escape") {
                                          setEditingNotes(null);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => setEditingNotes(null)}
                                      className="px-2 py-1 text-xs text-[var(--foreground-tertiary)]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <p 
                                    onClick={() => setEditingNotes(item.id)}
                                    className="mt-3 text-sm text-[var(--foreground-secondary)] cursor-pointer hover:text-[var(--foreground)] border-t border-[var(--border)] pt-3"
                                  >
                                    <span className="text-xs text-[var(--foreground-tertiary)]">📝 Notes: </span>
                                    {item.notes || <span className="italic text-[var(--foreground-tertiary)]">Click to add...</span>}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                {/* Move to collection */}
                                <select
                                  value={item.collectionId || ""}
                                  onChange={(e) => moveToCollection(item.id, e.target.value || null)}
                                  className="px-2 py-1 text-xs bg-[var(--background-tertiary)] border border-[var(--border)] rounded text-[var(--foreground)]"
                                >
                                  <option value="">No collection</option>
                                  {collections.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                                
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="p-1.5 text-[var(--foreground-tertiary)] hover:text-red-400 transition-colors"
                                  title="Remove"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
