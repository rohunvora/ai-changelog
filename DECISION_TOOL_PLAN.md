# Decision Tool Transformation Plan

## Core Problem
The site is currently **content** (nice list of stuff), not a **workflow** (decision tool).

**Success Metric**: Can a user leave with a **ranked shortlist of 3-5 good bets**, plus enough evidence and a plan to start?

---

## Phase 1: Opportunity Detail Pages (Highest Leverage)

### Goal
When user clicks an update, they land on a page that answers:
1. What changed (capability unlock in plain English)
2. What it enables (specific, with constraints)
3. Real proof it matters (links, examples, "why now")
4. Market map (similar products, saturated areas, gaps)
5. Build plan (MVP spec, stack, hard parts, distribution)
6. Risks (policy, model availability, defensibility)

### Data Model Changes
```typescript
// New: Structured opportunity
interface Opportunity {
  id: string;
  updateId: string;  // Links to parent update
  
  // Targeting
  targetUser: string;  // "SMB founders", "Content creators"
  jobToBeDone: string;  // Pain point + frequency
  surfaceArea: "web_app" | "chrome_ext" | "api" | "mobile" | "slack_bot";
  
  // Dependencies
  hardDependencies: ("tool_use" | "realtime_voice" | "vision" | "browsing" | "code_exec")[];
  
  // Distribution
  distributionWedge: ("seo" | "templates" | "marketplace" | "plg" | "outbound" | "community")[];
  moatPotential: ("data_flywheel" | "workflow_lock" | "network_effects" | "none")[];
  
  // Scores (1-5)
  indieViabilityScore: number;  // Can solo dev build this?
  timeToRevenueScore: number;   // How fast to first $?
  competitionScore: number;     // How crowded?
  
  // Business
  pricingAnchor: string;  // "$29/mo", "Usage-based"
  mvpBullets: string[];   // 10 bullet MVP spec
  risks: string[];        // Policy, model availability, etc.
}

// Enhanced: Update with opportunities
interface Update {
  // ... existing fields ...
  opportunities: Opportunity[];
  relatedProductIds: string[];  // Links to leaderboard
  capabilityTags: string[];     // Shared taxonomy
}
```

### Routes
- `GET /api/updates/:id` - Full update with opportunities + related products
- `GET /api/opportunities` - All opportunities with filters

### UI Components
- `/updates/[slug]/page.tsx` - Opportunity detail page
- `OpportunityCard` - Structured card with scores + constraints
- `MarketMap` - Related products + gaps visualization
- `BuildPlan` - MVP spec + stack + risks

---

## Phase 2: Sources & Verification (Credibility)

### Data Model Changes
```typescript
interface ClaimSource {
  id: string;
  url: string;
  type: "tweet" | "dashboard" | "interview" | "stripe" | "baremetrics";
  claimDate: Date;        // Exact date
  capturedAt: Date;       // When we scraped it
  rawQuote?: string;      // Original text
}

interface LeaderboardEntry {
  // ... existing fields ...
  sources: ClaimSource[];
  verificationLevel: "verified" | "multiple_sources" | "self_reported" | "unverified";
  lastVerifiedAt?: Date;
}
```

### UI Changes
- Inline source chips with hover preview
- "Verified only" toggle filter
- Warning banner when viewing low-confidence data
- Exact claim dates (not relative)

---

## Phase 3: Saved Collections (Retention)

### Data Model (localStorage first)
```typescript
interface SavedItem {
  id: string;
  type: "update" | "product" | "opportunity";
  itemId: string;
  notes: string;
  addedAt: Date;
}

interface Collection {
  id: string;
  name: string;
  items: SavedItem[];
  createdAt: Date;
  shareId?: string;  // For shareable URLs
}
```

### Features
- Save updates, products, or opportunities
- Create named collections ("Voice Agent Ideas", "Compliance Tools")
- Add notes to saved items
- Export/share via URL
- `/saved` page with collection management

---

## Phase 4: Research-Grade Search

### Search Fields
**Leaderboard:**
- Product name, founder, Twitter handle
- Category
- Vibecoding claim text
- Tools used
- Confidence reason

**Changelog:**
- Title, summary
- Opportunity descriptions
- Capability tags

### UI Features
- Match highlighting
- Result count display
- Keyboard shortcuts (`/` to focus, `Esc` to clear)
- Multi-field filter badges

---

## Phase 5: Cross-Linking & Aggregation

### Tag Taxonomy (Shared)
```typescript
const CAPABILITY_TAGS = [
  "reasoning", "multimodal", "tool_use", "voice", 
  "search", "agents", "code_gen", "vision", "browsing"
] as const;

const VERTICAL_TAGS = [
  "saas", "ecommerce", "productivity", "dev_tools",
  "ai_writing", "scheduling", "legal", "healthcare", "finance"
] as const;
```

### Cross-Links
**On Opportunity Page:**
- "Products enabled by this capability" (from leaderboard)
- "Gaps: high-MRR categories not using this yet"
- "Clone risk: X competitors already exist"

**On Product Page:**
- "Capability unlocks that made this possible"
- "New updates that threaten/empower this product"

### Aggregation Views
**Leaderboard Insights:**
- Total MRR by category
- Verified vs unverified split
- Most repeated tool stacks

**Changelog Insights:**
- Updates over time by provider
- Tag distribution trends
- "Most promising domains this month"

---

## Implementation Order

### Sprint 1: Foundation (This Session)
- [ ] Create `/updates/[slug]` detail page structure
- [ ] Add opportunity data model + seed data
- [ ] Implement basic cross-linking
- [ ] Enhance Saved with localStorage collections

### Sprint 2: Credibility
- [ ] Add sources array to leaderboard entries
- [ ] Implement verification badges + filters
- [ ] Add "verified only" mode

### Sprint 3: Search & Discovery
- [ ] Implement full-text search across all fields
- [ ] Add match highlighting
- [ ] Add keyboard shortcuts

### Sprint 4: Insights & Aggregation
- [ ] Build `/insights` dashboard
- [ ] Add trend analysis
- [ ] Add gap identification algorithm

---

## Acceptance Test

User should be able to:
1. Pick an update (e.g., "realtime voice")
2. Get **3 ranked business ideas** with:
   - Who pays + pricing anchor
   - MVP spec in 10 bullets
   - Distribution wedge
   - 3 comparable proof points from leaderboard
   - Risks + what to avoid
3. Save the shortlist and share it

**Time limit: Under 5 minutes**

