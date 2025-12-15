# 🚀 AI Opportunities Hub

**Turn AI model updates into actionable business opportunities.**

A decision-making tool for indie hackers and builders to discover what they can build today that wasn't possible yesterday.

🔗 **Live Site:** [ai-changelog-two.vercel.app](https://ai-changelog-two.vercel.app)

---

## What This Does

| Feature | Description |
|---------|-------------|
| **📰 AI Changelog** | Aggregated updates from OpenAI, Anthropic, Google, xAI, Perplexity |
| **🔓 Capability Unlocks** | Highlights updates that enable NEW things (not just improvements) |
| **🎯 Opportunity Pages** | Structured business ideas with scores, MVP specs, and risks |
| **🏆 Vibecoded Leaderboard** | Real products built with AI tools + their MRR |
| **💾 Saved Collections** | Build research shortlists with notes |
| **🎨 Personalization** | Filter by your skills and preferred capabilities |

---

## Key Pages

### `/` — AI Changelog Feed
- Browse AI updates filtered by provider and capability
- Capability filters: 🎤 Voice, 👁️ Vision, 🔧 Tool Use, 🔍 Search, 🤖 Agents, 🧠 Reasoning
- Quick insights dashboard showing trending capabilities
- Personalization panel to set your skills/preferences

### `/updates/[id]` — Opportunity Detail
- Full capability unlock explanation
- Ranked business opportunities with:
  - **Indie Viability Score** (1-5): Can a solo dev build this?
  - **Time to Revenue Score** (1-5): How fast to first $?
  - **Opportunity Score** (1-5): Market competition level
  - Target user + Job to be done
  - 10-bullet MVP spec
  - Risks and watch-outs
  - Distribution wedges
- Related products from leaderboard (proof it works)
- Market gaps (underserved verticals)

### `/leaderboard` — Vibecoded MRR Leaderboard
- Products built mostly/entirely with AI tools
- Self-reported MRR with confidence levels
- Source links for verification
- "Verified Only" toggle
- Sortable by MRR, confidence, date
- Expandable rows with full details

### `/saved` — Research Collections
- Save updates, opportunities, or products
- Organize into named collections
- Add notes to items
- Export to CSV
- Share via URL

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** SQLite via libsql (Turso-compatible)
- **ORM:** Drizzle
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

---

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main changelog
│   ├── leaderboard/page.tsx        # MRR leaderboard
│   ├── saved/page.tsx              # Saved collections
│   ├── updates/[slug]/page.tsx     # Opportunity detail
│   └── api/                        # API routes
├── components/
│   ├── ChangelogFeed.tsx           # Main feed + filters
│   ├── UpdateCard.tsx              # Update card component
│   ├── UserPreferences.tsx         # Personalization panel
│   └── SearchBar.tsx               # Search input
├── db/
│   ├── schema.ts                   # Database schema
│   └── index.ts                    # DB initialization
└── lib/
    ├── seed.ts                     # Demo data seeding
    ├── seed-leaderboard.ts         # Leaderboard data
    └── seed-opportunities.ts       # Opportunity data
```

---

## Database Schema

### Core Tables
- `updates` — AI provider announcements
- `opportunities` — Structured business ideas linked to updates
- `founders` — Products/founders for leaderboard
- `mrrClaims` — Revenue claims with confidence
- `claimSources` — Verification sources

### User Data (localStorage)
- `savedItems` — Bookmarked items with notes
- `collections` — Named groupings
- `userPreferences` — Skills, capabilities, verticals

---

## Roadmap / Next Steps

### High Priority
- [ ] Cross-link updates ↔ leaderboard products
- [ ] Full-text search with highlighting
- [ ] Shareable collection URLs

### Medium Priority
- [ ] Filter by viability scores
- [ ] Apply personalization to filtering
- [ ] Expanded insights dashboard

### Lower Priority
- [ ] Enrich old saved items
- [ ] Mobile optimization
- [ ] Real-time data freshness indicators

---

## Contributing

This is an experimental project. Feel free to fork and adapt for your own use cases.

---

## License

MIT
