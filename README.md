# AI Opportunities Hub

**Turn AI model updates into scored business opportunities for indie hackers.**

Stop missing the wave. Every AI capability release creates new business opportunities that didn't exist yesterday. This tool automatically converts AI updates from major providers into actionable, scored business ideas with MVP specs and market analysis. It's like having a research team that spots what you can build today that wasn't possible last week.

🔗 **Live Site:** [ai-changelog-two.vercel.app](https://ai-changelog-two.vercel.app)

## What This Does

- **📰 Aggregates AI Updates** — Real-time feed from OpenAI, Anthropic, Google, xAI, Perplexity
- **🔓 Identifies Capability Unlocks** — Filters for updates that enable NEW things (not just improvements)
- **🎯 Generates Business Opportunities** — AI-powered analysis creates scored business ideas with:
  - Indie Viability Score (1-5): Can a solo dev build this?
  - Time to Revenue Score (1-5): How fast to first $?
  - Market Opportunity Score (1-5): Competition level
  - 10-point MVP specifications
  - Risk analysis and distribution strategies
- **🏆 Vibecoded Leaderboard** — Real products built with AI tools + verified MRR
- **💾 Research Collections** — Save and organize opportunities you want to explore

## Key Features

### AI Changelog Feed (`/`)
Browse updates filtered by capability type:
- 🎤 Voice • 👁️ Vision • 🔧 Tool Use • 🔍 Search • 🤖 Agents • 🧠 Reasoning
- Personalization panel for your skills and interests
- Quick insights dashboard showing trending capabilities

### Opportunity Analysis (`/updates/[id]`)
Each capability unlock gets a full business analysis:
- Multiple ranked business opportunities
- Target users and jobs-to-be-done
- Technical implementation roadmap
- Market gaps and underserved verticals
- Related products from the leaderboard (social proof)

### MRR Leaderboard (`/leaderboard`)
Track real AI-built products with self-reported revenue:
- Confidence levels and verification status
- Source links for transparency
- Sortable by MRR, date, confidence
- Filter for verified-only entries

## Tech Stack

- **Framework:** Next.js 16 with React 19
- **Database:** SQLite with Drizzle ORM
- **AI:** OpenAI GPT for opportunity analysis
- **Scraping:** RSS parsing + web scraping for updates
- **Styling:** Tailwind CSS

## Getting Started

1. **Clone and install:**
```bash
git clone https://github.com/yourusername/ai-changelog
cd ai-changelog
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env.local
# Add your OpenAI API key and database URL
```

3. **Initialize database:**
```bash
npm run db:generate
npm run db:migrate
```

4. **Run development server:**
```bash
npm run dev
```

Visit `http://localhost:3000` to see the changelog feed.

## How It Works

1. **Scraping:** Cron jobs pull updates from AI provider RSS feeds and blogs
2. **Classification:** AI classifier identifies capability unlocks vs. incremental improvements
3. **Analysis:** GPT generates business opportunities with structured scoring
4. **Curation:** Manual verification for high-impact opportunities
5. **Tracking:** Community-submitted products show what's actually being built

## What This Isn't

This is an early-stage tool for builders who want to stay ahead of AI capabilities. It's not a comprehensive business research platform or a guarantee of success. The opportunity scores are AI-generated and should be validated with real market research.

## Contributing

The most valuable contributions are:
- Submitting your AI-built products to the leaderboard
- Reporting missed capability unlocks
- Improving the opportunity scoring algorithm

## License

MIT License - see LICENSE file for details.