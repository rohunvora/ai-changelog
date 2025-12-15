"use client";

import { useState, useEffect, useCallback } from "react";

// User preferences stored in localStorage
interface UserPreferences {
  skills: string[];
  preferredCapabilities: string[];
  preferredVerticals: string[];
  businessModel: "saas" | "api" | "marketplace" | "agency" | "any";
  teamSize: "solo" | "small" | "medium" | "any";
  timeToRevenue: "fast" | "medium" | "slow" | "any";
}

const DEFAULT_PREFERENCES: UserPreferences = {
  skills: [],
  preferredCapabilities: [],
  preferredVerticals: [],
  businessModel: "any",
  teamSize: "any",
  timeToRevenue: "any",
};

const SKILL_OPTIONS = [
  "Frontend Development",
  "Backend Development", 
  "Mobile Development",
  "Machine Learning",
  "Data Engineering",
  "DevOps/Infrastructure",
  "UI/UX Design",
  "Product Management",
  "Marketing/Growth",
  "Sales",
  "Audio/Voice",
  "Video/Vision",
  "NLP/Text",
  "APIs/Integrations",
];

const CAPABILITY_OPTIONS = [
  { key: "voice", label: "🎤 Voice/Audio" },
  { key: "vision", label: "👁️ Vision/Images" },
  { key: "tool_use", label: "🔧 Tool Use/Agents" },
  { key: "search", label: "🔍 Search/RAG" },
  { key: "reasoning", label: "🧠 Advanced Reasoning" },
  { key: "code_gen", label: "💻 Code Generation" },
];

const VERTICAL_OPTIONS = [
  "Developer Tools",
  "Productivity",
  "E-commerce",
  "Healthcare",
  "Legal/Compliance",
  "Finance",
  "Education",
  "Marketing",
  "Customer Support",
  "Content Creation",
  "HR/Recruiting",
  "Real Estate",
];

interface UserPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesChange: (prefs: UserPreferences) => void;
}

export function UserPreferencesPanel({ isOpen, onClose, onPreferencesChange }: UserPreferencesProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("userPreferences");
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }
  }, []);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const toggleArrayItem = useCallback((key: "skills" | "preferredCapabilities" | "preferredVerticals", item: string) => {
    setPreferences(prev => {
      const current = prev[key];
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [key]: updated };
    });
    setHasChanges(true);
  }, []);

  const savePreferences = useCallback(() => {
    localStorage.setItem("userPreferences", JSON.stringify(preferences));
    onPreferencesChange(preferences);
    setHasChanges(false);
    onClose();
  }, [preferences, onPreferencesChange, onClose]);

  const clearPreferences = useCallback(() => {
    localStorage.removeItem("userPreferences");
    setPreferences(DEFAULT_PREFERENCES);
    onPreferencesChange(DEFAULT_PREFERENCES);
    setHasChanges(false);
  }, [onPreferencesChange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">🎯 Your Preferences</h2>
            <p className="text-sm text-[var(--foreground-secondary)]">Personalize opportunities to match your strengths</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--background-tertiary)] text-[var(--foreground-tertiary)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Skills */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">💪 Your Skills</h3>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleArrayItem("skills", skill)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    preferences.skills.includes(skill)
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Capabilities */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">⚡ AI Capabilities You Want to Leverage</h3>
            <div className="flex flex-wrap gap-2">
              {CAPABILITY_OPTIONS.map(cap => (
                <button
                  key={cap.key}
                  onClick={() => toggleArrayItem("preferredCapabilities", cap.key)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    preferences.preferredCapabilities.includes(cap.key)
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                  }`}
                >
                  {cap.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Verticals */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">🏢 Industries You're Interested In</h3>
            <div className="flex flex-wrap gap-2">
              {VERTICAL_OPTIONS.map(vertical => (
                <button
                  key={vertical}
                  onClick={() => toggleArrayItem("preferredVerticals", vertical)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    preferences.preferredVerticals.includes(vertical)
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]"
                  }`}
                >
                  {vertical}
                </button>
              ))}
            </div>
          </div>

          {/* Business Model */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">💼 Preferred Business Model</h3>
              <select
                value={preferences.businessModel}
                onChange={(e) => updatePreference("businessModel", e.target.value as UserPreferences["businessModel"])}
                className="w-full px-3 py-2 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
              >
                <option value="any">Any model</option>
                <option value="saas">SaaS / Subscription</option>
                <option value="api">API / Usage-based</option>
                <option value="marketplace">Marketplace / Platform</option>
                <option value="agency">Agency / Services</option>
              </select>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">👥 Team Size</h3>
              <select
                value={preferences.teamSize}
                onChange={(e) => updatePreference("teamSize", e.target.value as UserPreferences["teamSize"])}
                className="w-full px-3 py-2 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
              >
                <option value="any">Any size</option>
                <option value="solo">Solo (just me)</option>
                <option value="small">Small (2-5 people)</option>
                <option value="medium">Medium (5-20 people)</option>
              </select>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">⏱️ Time to Revenue</h3>
              <select
                value={preferences.timeToRevenue}
                onChange={(e) => updatePreference("timeToRevenue", e.target.value as UserPreferences["timeToRevenue"])}
                className="w-full px-3 py-2 text-sm bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
              >
                <option value="any">Any timeline</option>
                <option value="fast">Fast (weeks)</option>
                <option value="medium">Medium (1-3 months)</option>
                <option value="slow">Slow (3+ months)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-[var(--border)] bg-[var(--background-tertiary)]">
          <button
            onClick={clearPreferences}
            className="px-4 py-2 text-sm text-[var(--foreground-tertiary)] hover:text-[var(--foreground)] transition-colors"
          >
            Clear All
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePreferences}
              disabled={!hasChanges}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                hasChanges
                  ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-secondary)]"
                  : "bg-[var(--background-tertiary)] text-[var(--foreground-tertiary)] cursor-not-allowed"
              }`}
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to use preferences
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("userPreferences");
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {
        setPreferences(null);
      }
    }
  }, []);

  return preferences;
}

// Export for use in filtering
export type { UserPreferences };
export { DEFAULT_PREFERENCES };

