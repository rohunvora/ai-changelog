# Vibecoded Leaderboard Redesign Plan

## Design Philosophy

### Jakob's Law Applied
> "Users spend most of their time on other sites. This means users prefer your site to work the same way as all the other sites they already know."

**Reference Interfaces Users Already Know:**
- DefiLlama Protocol Rankings (crypto revenue tracking)
- Product Hunt Leaderboard (product discovery)
- Indie Hackers Products (bootstrapped companies)
- Crunchbase Rankings (startup data)
- SimilarWeb Rankings (traffic analytics)

**Common Patterns to Adopt:**
1. Dense data tables with sortable columns
2. Time-period toggles (24h/7d/30d)
3. Inline category badges
4. Row expansion → detail panel
5. Sticky headers during scroll
6. Favicon/logo for visual scanning
7. Export functionality (CSV)

---

## Information Architecture

### Primary User Goals (in order of frequency)
1. **Scan** - "Who's making the most money with vibecoded apps?"
2. **Filter** - "Show me only SaaS products" or "Only high-confidence data"
3. **Compare** - "How does X compare to Y over time?"
4. **Investigate** - "Tell me more about this founder and their claims"
5. **Verify** - "Where did this data come from? Can I trust it?"
6. **Export** - "I want to analyze this myself"

### Information Hierarchy
```
Level 1: Leaderboard Table (scan)
├── Rank
├── Product (icon + name + founder)
├── Category badge
├── MRR (primary metric)
├── MRR Δ (growth indicator)
├── Vibecoded % 
├── Confidence badge
└── Expand arrow

Level 2: Expanded Row (compare/investigate)
├── MRR History Sparkline
├── Tools Used
├── Key Quote
└── Quick Links (Product, Source, Twitter)

Level 3: Detail Panel/Page (verify/deep dive)
├── Full Founder Profile
├── Complete Claim History (all MRR reports over time)
├── All Sources with dates
├── Confidence Breakdown
├── Related Products (same founder)
└── Similar Products (same category/MRR range)
```

---

## Component Specifications

### 1. Header Bar
```
┌─────────────────────────────────────────────────────────────────┐
│ 🏆 Vibecoded Leaderboard          [Search...]  [Export CSV ↓]  │
│                                                                 │
│ Showing: [All ▾] [SaaS] [AI Photo] [Dev Tools] [+12 more]      │
│                                                                 │
│ Confidence: [All] [High ✓] [Medium] [Low]    Period: [All Time]│
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Search filters table in real-time (product name, founder name)
- Category chips are toggleable (multi-select)
- Confidence filter is single-select
- Export downloads current filtered view as CSV

### 2. Data Table

```
┌────┬─────────────────────────┬───────────┬──────────┬────────┬──────────┬────────────┬───┐
│ #  │ Product                 │ Category  │ MRR      │ Δ 30d  │ Vibecoded│ Confidence │   │
├────┼─────────────────────────┼───────────┼──────────┼────────┼──────────┼────────────┼───┤
│ 1  │ 🟢 Gumroad              │ Ecommerce │ $1.00M   │ +12%   │ 30%      │ ✓ High     │ ▶ │
│    │ Sahil Lavingia          │           │          │        │          │            │   │
├────┼─────────────────────────┼───────────┼──────────┼────────┼──────────┼────────────┼───┤
│ 2  │ 🟡 Wave AI              │ Productiv │ $450K    │ +8%    │ 99%      │ ⚠ Medium   │ ▶ │
│    │ Josh Mohrer             │           │          │        │          │            │   │
├────┼─────────────────────────┼───────────┼──────────┼────────┼──────────┼────────────┼───┤
│ 3  │ 🟡 Writesonic           │ AI Writing│ $250K    │ —      │ 70%      │ ⚠ Medium   │ ▶ │
│    │ Jake Kasavan            │           │          │        │          │            │   │
└────┴─────────────────────────┴───────────┴──────────┴────────┴──────────┴────────────┴───┘
```

**Column Specifications:**

| Column | Width | Sortable | Format | Notes |
|--------|-------|----------|--------|-------|
| Rank | 48px | Auto (by sort) | # | Updates based on current sort |
| Product | flex | Yes (A-Z) | Icon + Name + Founder | Two-line cell |
| Category | 100px | Yes | Badge | Color-coded |
| MRR | 100px | Yes (default) | $XXX.XK/M | Right-aligned |
| Δ 30d | 80px | Yes | +X% / -X% / — | Green/Red/Gray |
| Vibecoded | 80px | Yes | XX% | Progress bar optional |
| Confidence | 100px | Yes | Badge | ✓/⚠/✗ + text |
| Expand | 40px | No | ▶ / ▼ | Toggle row expansion |

**Sorting Behavior:**
- Click header to sort ascending
- Click again for descending
- Visual indicator (▲/▼) shows current sort
- Default: MRR descending

### 3. Expanded Row

When user clicks expand (▶), row expands to show:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 2 │ 🟡 Wave AI                    │ Productivity │ $450K │ ... │ ▼    │
│   │ Josh Mohrer                   │              │       │     │      │
├───┴─────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   📈 MRR History                    🛠️ Tools Used                       │
│   ┌──────────────────────┐         ┌─────────────────────────────┐     │
│   │    ___/‾‾‾           │         │ [Cursor] [Claude] [GPT-4]   │     │
│   │   /                  │         └─────────────────────────────┘     │
│   │__/                   │                                              │
│   └──────────────────────┘         💬 "99% built solo using AI tools.  │
│   Nov 24  →  Dec 24  →  Now         First-time programmer built $1M    │
│                                     ARR in 12 months."                  │
│                                                                         │
│   [🔗 Product Site]  [📄 Source]  [🐦 @joshmohrer]  [→ Full Details]   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Expanded Row Contents:**
- Mini sparkline chart (MRR over last 6 months if data available)
- Tools used as small badges
- Key quote (truncated vibecoded claim)
- Action links: Product, Source, Twitter, Full Details

### 4. Detail Panel (Slide-in or New Page)

Triggered by "Full Details" or clicking product name:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Leaderboard                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🟡  Wave AI                                              Rank #2       │
│      by Josh Mohrer (@joshmohrer)                                       │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      MRR History                                  │  │
│  │  $500K ┤                                           ___/‾‾‾       │  │
│  │  $400K ┤                                      ___/               │  │
│  │  $300K ┤                                 ___/                    │  │
│  │  $200K ┤                            ___/                         │  │
│  │  $100K ┤                       ___/                              │  │
│  │     $0 ┤──────────────────────/                                  │  │
│  │        └─────────────────────────────────────────────────────    │  │
│  │         Jan   Mar   May   Jul   Sep   Nov   Now                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │ Current MRR     │  │ Vibecoded %     │  │ Confidence      │        │
│  │ $450,000/mo     │  │ 99%             │  │ ⚠ Medium        │        │
│  │ ≈ $5.4M ARR     │  │ Nearly all AI   │  │ Self-reported   │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                         │
│  📝 Vibecoding Claim                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ "99% built solo using AI tools. First-time programmer built $1M  │  │
│  │  ARR in 12 months."                                              │  │
│  │                                                                   │  │
│  │  Source: Consumer Startups Interview                             │  │
│  │  Date: November 2024                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  🛠️ Tools Used                                                          │
│  [Cursor] [Claude] [GPT-4]                                             │
│                                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                         │
│  📊 Claim History                                                       │
│  ┌──────────┬────────────┬────────────┬──────────┬─────────────────┐  │
│  │ Date     │ MRR        │ Source     │ Confidence│ Link           │  │
│  ├──────────┼────────────┼────────────┼──────────┼─────────────────┤  │
│  │ Nov 2024 │ $450,000   │ Interview  │ Medium   │ [View →]        │  │
│  │ Sep 2024 │ $300,000   │ Twitter    │ Low      │ [View →]        │  │
│  │ Jun 2024 │ $150,000   │ Twitter    │ Low      │ [View →]        │  │
│  └──────────┴────────────┴────────────┴──────────┴─────────────────┘  │
│                                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                         │
│  🔗 Links                                                               │
│  [🌐 wave.ai]  [🐦 @joshmohrer]  [📄 Primary Source]                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Visual Design Tokens

### Colors (Dark Theme - DefiLlama inspired)

```css
:root {
  /* Backgrounds */
  --bg-primary: #0d1117;      /* Main background */
  --bg-secondary: #161b22;    /* Card/row background */
  --bg-tertiary: #21262d;     /* Hover states */
  --bg-accent: #1f6feb15;     /* Selected/active row */
  
  /* Text */
  --text-primary: #e6edf3;    /* Main text */
  --text-secondary: #8b949e;  /* Secondary text */
  --text-tertiary: #6e7681;   /* Muted text */
  
  /* Borders */
  --border: #30363d;
  --border-light: #21262d;
  
  /* Accents */
  --accent-blue: #58a6ff;     /* Links, primary actions */
  --accent-green: #3fb950;    /* Positive values, high confidence */
  --accent-yellow: #d29922;   /* Medium confidence */
  --accent-red: #f85149;      /* Negative values, low confidence */
  --accent-purple: #a371f7;   /* Category badges */
  
  /* Confidence badges */
  --confidence-high-bg: #238636;
  --confidence-high-text: #3fb950;
  --confidence-medium-bg: #9e6a03;
  --confidence-medium-text: #d29922;
  --confidence-low-bg: #da3633;
  --confidence-low-text: #f85149;
}
```

### Typography

```css
/* Using system fonts for performance, or Inter for polish */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Sizes */
--text-xs: 0.75rem;    /* 12px - badges, metadata */
--text-sm: 0.875rem;   /* 14px - table cells */
--text-base: 1rem;     /* 16px - body */
--text-lg: 1.125rem;   /* 18px - headings */
--text-xl: 1.25rem;    /* 20px - page title */

/* Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing

```css
/* 4px base unit */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

---

## Implementation Phases

### Phase 1: Core Table Redesign
**Estimated: 2-3 hours**

- [ ] Update table structure to match new column spec
- [ ] Add sticky header with sort indicators
- [ ] Implement column sorting (client-side)
- [ ] Add rank column that updates with sort
- [ ] Format MRR values properly ($XXK, $X.XM)
- [ ] Add Δ 30d column (calculate from historical data or show "—")
- [ ] Redesign confidence badges to be compact
- [ ] Add category badges inline

### Phase 2: Row Expansion
**Estimated: 2-3 hours**

- [ ] Implement expandable rows with smooth animation
- [ ] Add sparkline component for MRR history
- [ ] Display tools used as compact badges
- [ ] Show truncated quote
- [ ] Add action links (Product, Source, Twitter, Details)
- [ ] Handle empty states (no history, no tools, etc.)

### Phase 3: Filters & Search
**Estimated: 1-2 hours**

- [ ] Add search input with live filtering
- [ ] Implement category filter chips (multi-select)
- [ ] Update confidence filter to match new design
- [ ] Add "Clear filters" action
- [ ] Persist filter state in URL params

### Phase 4: Detail Panel
**Estimated: 2-3 hours**

- [ ] Create slide-in panel component (or route to /leaderboard/[id])
- [ ] Design full MRR history chart (use Recharts or similar)
- [ ] Display all claims in table format
- [ ] Show all sources with links
- [ ] Add "similar products" section (optional)

### Phase 5: Export & Polish
**Estimated: 1-2 hours**

- [ ] Implement CSV export (respects current filters)
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Keyboard navigation (up/down arrows, enter to expand)
- [ ] Mobile responsiveness (cards view on small screens)

---

## Data Requirements

### API Changes Needed

**GET /api/leaderboard** - Add fields:
```typescript
{
  leaderboard: [{
    rank: number;           // Computed from sort order
    founder: {
      id: string;
      name: string;
      twitterHandle: string | null;
      productName: string;
      productUrl: string | null;
      productIcon: string | null;  // NEW: favicon URL
      category: string;
      vibecodedClaim: string;
      vibecodedPercent: number | null;
      toolsUsed: string[];
    };
    claim: {
      mrr: number;
      arr: number | null;
      claimDate: string;
      confidence: 'high' | 'medium' | 'low';
    };
    // NEW fields:
    mrrDelta30d: number | null;     // % change over 30 days
    mrrHistory: {                   // For sparkline
      date: string;
      mrr: number;
    }[];
    sourceCount: number;
  }];
  total: number;
  filters: { ... };
}
```

### New Endpoint: Favicon Fetcher (Optional)
Could use a service like `https://www.google.com/s2/favicons?domain=example.com` or store favicons during scraping.

---

## Success Metrics

1. **Time to insight** - How quickly can user find top vibecoded app?
2. **Filter usage** - Are users using category/confidence filters?
3. **Expansion rate** - Do users expand rows to see more?
4. **Detail view rate** - Do users click through to full details?
5. **Export usage** - Are users downloading data?

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Sparklines slow down render | Use virtualization, limit visible rows |
| Too much data density overwhelms | Progressive disclosure via expansion |
| Mobile experience suffers | Card-based layout under 768px |
| Favicon fetching is slow | Lazy load, use placeholder icons |
| Historical data is sparse | Show "—" gracefully, don't fake data |

---

## Next Steps

1. Review and approve this plan
2. Create todo list for implementation
3. Start with Phase 1 (core table)
4. Deploy incrementally after each phase

