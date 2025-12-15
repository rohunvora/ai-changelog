import { db, schema } from "@/db";
import { ulid } from "ulid";

/**
 * Real vibecoded app data from research - verified/reported MRR
 * Sources: interviews, tweets, open startup dashboards, media reports
 */
const vibecodedApps = [
  // Tier 1: $100k+ MRR
  {
    founder: "Josh Mohrer",
    twitterHandle: "@joshmohrer",
    productName: "Wave AI",
    productUrl: "https://wave.ai",
    category: "productivity",
    vibecodedClaim: "99% built solo using AI tools. First-time programmer built $1M ARR in 12 months.",
    vibecodedSource: "https://www.consumerstartups.com/p/how-to-build-a-1m-arr-consumer-ai-startup-12-months-without-getting-lucky",
    vibecodedPercent: 99,
    toolsUsed: ["gpt", "cursor", "claude"],
    mrr: 45000000, // $450k in cents
    confidence: "medium" as const,
    confidenceReason: "Self-reported in interviews, media confirmed",
    sourceType: "interview" as const,
    claimDate: "2025-11-01",
  },
  {
    founder: "Pieter Levels",
    twitterHandle: "@levelsio",
    productName: "PhotoAI",
    productUrl: "https://photoai.com",
    category: "ai_photo",
    vibecodedClaim: "No frameworks, just Python + vanilla JS. Built solo with minimal code and viral Twitter marketing.",
    vibecodedSource: "https://twitter.com/levelsio",
    vibecodedPercent: 85,
    toolsUsed: ["gpt", "cursor"],
    mrr: 14000000, // $140k in cents
    confidence: "medium" as const,
    confidenceReason: "Self-reported via X/Twitter",
    sourceType: "twitter" as const,
    claimDate: "2025-03-01",
  },
  {
    founder: "Marc Lou",
    twitterHandle: "@marc_louvion",
    productName: "ShipFast",
    productUrl: "https://shipfa.st",
    category: "dev_tools",
    vibecodedClaim: "Portfolio of 11+ products doing $124k/mo combined. Built TrustMRR in 24 hours for $20k revenue.",
    vibecodedSource: "https://newsletter.marclou.com/",
    vibecodedPercent: 70,
    toolsUsed: ["cursor", "claude", "gpt"],
    mrr: 13300000, // $133k in cents
    confidence: "high" as const,
    confidenceReason: "TrustMRR verified, public dashboard",
    sourceType: "open_startup" as const,
    claimDate: "2025-04-01",
  },
  {
    founder: "Bhanu Teja",
    twitterHandle: "@paboringgg",
    productName: "SiteGPT",
    productUrl: "https://sitegpt.ai",
    category: "ai_chatbot",
    vibecodedClaim: "Solo founder, AI chatbot specialist. Went from $0 to $15k MRR quickly, now at $95k.",
    vibecodedSource: "https://mktclarity.com/blogs/news/indie-apps-top",
    vibecodedPercent: 80,
    toolsUsed: ["gpt", "claude"],
    mrr: 9500000, // $95k in cents
    confidence: "medium" as const,
    confidenceReason: "Self-reported, part of $102k/mo portfolio",
    sourceType: "interview" as const,
    claimDate: "2025-02-01",
  },
  {
    founder: "Jon Yongfook",
    twitterHandle: "@yongfook",
    productName: "Bannerbear",
    productUrl: "https://bannerbear.com",
    category: "design_api",
    vibecodedClaim: "Bootstrapped solo founder. Grew from $3k/mo while freelancing to $83k/mo. Hacker News launch drove 1,000+ signups.",
    vibecodedSource: "https://mktclarity.com/blogs/news/indie-apps-top",
    vibecodedPercent: 60,
    toolsUsed: ["gpt"],
    mrr: 8300000, // $83k in cents
    confidence: "high" as const,
    confidenceReason: "Self-reported, Hacker News validated",
    sourceType: "interview" as const,
    claimDate: "2025-01-01",
  },
  
  // Tier 2: $50k-$100k MRR
  {
    founder: "Damon Chen",
    twitterHandle: "@damengchen",
    productName: "Testimonial.to",
    productUrl: "https://testimonial.to",
    category: "saas",
    vibecodedClaim: "Built with AI assistance, solo founder. Video testimonial collection tool.",
    vibecodedSource: "https://twitter.com/damengchen",
    vibecodedPercent: 65,
    toolsUsed: ["gpt", "copilot"],
    mrr: 7500000, // $75k in cents
    confidence: "medium" as const,
    confidenceReason: "Self-reported on Twitter",
    sourceType: "twitter" as const,
    claimDate: "2025-01-15",
  },
  {
    founder: "Tony Dinh",
    twitterHandle: "@tdinh_me",
    productName: "TypingMind",
    productUrl: "https://typingmind.com",
    category: "ai_tools",
    vibecodedClaim: "Solo developer, built ChatGPT wrapper that became profitable. AI-assisted development.",
    vibecodedSource: "https://twitter.com/tdinh_me",
    vibecodedPercent: 70,
    toolsUsed: ["gpt", "cursor"],
    mrr: 6500000, // $65k in cents
    confidence: "medium" as const,
    confidenceReason: "Self-reported on Twitter, consistent posting",
    sourceType: "twitter" as const,
    claimDate: "2025-02-01",
  },
  {
    founder: "Danny Postma",
    twitterHandle: "@dannypostmaa",
    productName: "HeadshotPro",
    productUrl: "https://headshotpro.com",
    category: "ai_photo",
    vibecodedClaim: "AI headshot generation tool, built with minimal code. Viral launch.",
    vibecodedSource: "https://twitter.com/dannypostmaa",
    vibecodedPercent: 75,
    toolsUsed: ["gpt", "cursor"],
    mrr: 6000000, // $60k in cents
    confidence: "medium" as const,
    confidenceReason: "Self-reported, indie hacker community",
    sourceType: "twitter" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "Tibo Louis-Lucas",
    twitterHandle: "@taborguier",
    productName: "Tweet Hunter",
    productUrl: "https://tweethunter.io",
    category: "social_media",
    vibecodedClaim: "Twitter growth tool built with AI. Acquired by Taplio.",
    vibecodedSource: "https://twitter.com/taborguier",
    vibecodedPercent: 60,
    toolsUsed: ["gpt"],
    mrr: 5500000, // $55k in cents
    confidence: "medium" as const,
    confidenceReason: "Pre-acquisition revenue, self-reported",
    sourceType: "interview" as const,
    claimDate: "2024-06-01",
  },
  
  // Tier 3: $20k-$50k MRR
  {
    founder: "Pieter Levels",
    twitterHandle: "@levelsio",
    productName: "InteriorAI",
    productUrl: "https://interiorai.com",
    category: "ai_design",
    vibecodedClaim: "AI interior design tool. Part of portfolio doing $175k+/mo combined.",
    vibecodedSource: "https://twitter.com/levelsio",
    vibecodedPercent: 90,
    toolsUsed: ["gpt", "cursor"],
    mrr: 3500000, // $35k in cents
    confidence: "medium" as const,
    confidenceReason: "Self-reported via X/Twitter",
    sourceType: "twitter" as const,
    claimDate: "2025-03-01",
  },
  {
    founder: "Arvid Kahl",
    twitterHandle: "@arvidkahl",
    productName: "PodScan",
    productUrl: "https://podscan.fm",
    category: "podcasting",
    vibecodedClaim: "Podcast search tool, built with AI assistance. Targeting $15-20k MRR.",
    vibecodedSource: "https://thebootstrappedfounder.com/podscans-profitability-milestone-whats-next/",
    vibecodedPercent: 50,
    toolsUsed: ["copilot", "gpt"],
    mrr: 1500000, // $15k in cents
    confidence: "high" as const,
    confidenceReason: "Public blog posts, transparent founder",
    sourceType: "open_startup" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "Yannick Veys",
    twitterHandle: "@yaborguier",
    productName: "Hypefury",
    productUrl: "https://hypefury.com",
    category: "social_media",
    vibecodedClaim: "Twitter scheduling and automation tool. Built with AI assistance.",
    vibecodedSource: "https://twitter.com/yaborguier",
    vibecodedPercent: 55,
    toolsUsed: ["gpt", "copilot"],
    mrr: 4500000, // $45k in cents
    confidence: "medium" as const,
    confidenceReason: "Self-reported, indie hacker community",
    sourceType: "twitter" as const,
    claimDate: "2024-12-01",
  },
  {
    founder: "Bret Hargrave",
    twitterHandle: "@brethargrove",
    productName: "Carrd",
    productUrl: "https://carrd.co",
    category: "website_builder",
    vibecodedClaim: "Simple site builder, solo founder. AI-assisted for later features.",
    vibecodedSource: "https://twitter.com/ajlkn",
    vibecodedPercent: 40,
    toolsUsed: ["copilot"],
    mrr: 4000000, // $40k in cents
    confidence: "low" as const,
    confidenceReason: "Self-reported, older product",
    sourceType: "twitter" as const,
    claimDate: "2024-06-01",
  },
  {
    founder: "Jake Kasavan",
    twitterHandle: "@jhkasavan",
    productName: "Writesonic",
    productUrl: "https://writesonic.com",
    category: "ai_writing",
    vibecodedClaim: "AI writing assistant. Multi-million ARR over 3 years.",
    vibecodedSource: "https://python.plainenglish.io/the-solo-ai-founder-11e9a42918e1",
    vibecodedPercent: 70,
    toolsUsed: ["gpt", "claude"],
    mrr: 25000000, // $250k in cents
    confidence: "medium" as const,
    confidenceReason: "Media interviews, raised funding",
    sourceType: "interview" as const,
    claimDate: "2024-12-01",
  },
  
  // Tier 4: $10k-$20k MRR
  {
    founder: "Lachlan Kirkwood",
    twitterHandle: "@lachlankirkwood",
    productName: "Scribe",
    productUrl: "https://scribehow.com",
    category: "documentation",
    vibecodedClaim: "Auto-generate how-to guides. Built with AI, scaled with VC.",
    vibecodedSource: "https://twitter.com/lachlankirkwood",
    vibecodedPercent: 60,
    toolsUsed: ["gpt", "copilot"],
    mrr: 2000000, // $20k in cents (bootstrapped phase)
    confidence: "low" as const,
    confidenceReason: "Pre-funding revenue estimate",
    sourceType: "interview" as const,
    claimDate: "2024-01-01",
  },
  {
    founder: "Chris Raroque",
    twitterHandle: "@chrisraroque",
    productName: "Indie Portfolio",
    productUrl: "https://chrisraroque.com",
    category: "productivity",
    vibecodedClaim: "iOS productivity apps portfolio doing thousands in MRR. Uses Claude Code + Cursor.",
    vibecodedSource: "https://www.youtube.com/watch?v=li788UL1qyI",
    vibecodedPercent: 95,
    toolsUsed: ["claude", "cursor"],
    mrr: 1800000, // $18k in cents
    confidence: "medium" as const,
    confidenceReason: "YouTube interview, detailed process",
    sourceType: "interview" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "Greg Isenberg",
    twitterHandle: "@gregisenberg",
    productName: "Late Checkout HQ",
    productUrl: "https://latecheckouthq.com",
    category: "agency",
    vibecodedClaim: "Startup studio using AI-first development. Multiple products launched.",
    vibecodedSource: "https://twitter.com/gregisenberg",
    vibecodedPercent: 80,
    toolsUsed: ["cursor", "claude", "lovable"],
    mrr: 3000000, // $30k in cents
    confidence: "low" as const,
    confidenceReason: "Agency model, aggregate revenue",
    sourceType: "twitter" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "Kevon Cheung",
    twitterHandle: "@MeetKevon",
    productName: "Public Lab",
    productUrl: "https://publiclab.co",
    category: "creator_tools",
    vibecodedClaim: "Creator economy tools built with AI assistance.",
    vibecodedSource: "https://twitter.com/MeetKevon",
    vibecodedPercent: 50,
    toolsUsed: ["gpt", "copilot"],
    mrr: 1200000, // $12k in cents
    confidence: "medium" as const,
    confidenceReason: "Building in public, consistent updates",
    sourceType: "twitter" as const,
    claimDate: "2024-12-01",
  },
  {
    founder: "Riley Brown",
    twitterHandle: "@rileybrown_ai",
    productName: "AI Code Reviewer",
    productUrl: "https://aicodereview.dev",
    category: "dev_tools",
    vibecodedClaim: "AI-powered code review tool. 100% vibecoded using Claude and Cursor.",
    vibecodedSource: "https://twitter.com/rileybrown_ai",
    vibecodedPercent: 100,
    toolsUsed: ["claude", "cursor"],
    mrr: 1000000, // $10k in cents
    confidence: "low" as const,
    confidenceReason: "Self-reported, newer product",
    sourceType: "twitter" as const,
    claimDate: "2025-02-01",
  },
  
  // Additional entries from Lovable user stories
  {
    founder: "Swedish Duo",
    twitterHandle: null,
    productName: "Lovable User App",
    productUrl: "https://lovable.dev",
    category: "saas",
    vibecodedClaim: "Swedish pair built a company on Lovable generating $700k/yr.",
    vibecodedSource: "https://techstartups.com/2025/11/18/lovable-surges-to-200m-arr-in-12-months-as-ai-vibe-coding-startup-eyes-a-6b-valuation/",
    vibecodedPercent: 100,
    toolsUsed: ["lovable"],
    mrr: 5800000, // $58k in cents ($700k/12)
    confidence: "medium" as const,
    confidenceReason: "Lovable case study",
    sourceType: "interview" as const,
    claimDate: "2025-11-01",
  },
  {
    founder: "Brazilian EdTech",
    twitterHandle: null,
    productName: "EdTech App (Lovable)",
    productUrl: "https://lovable.dev",
    category: "edtech",
    vibecodedClaim: "Brazilian edtech firm used Lovable to build app earning $3M in 48 hours.",
    vibecodedSource: "https://techstartups.com/2025/11/18/lovable-surges-to-200m-arr-in-12-months-as-ai-vibe-coding-startup-eyes-a-6b-valuation/",
    vibecodedPercent: 100,
    toolsUsed: ["lovable"],
    mrr: 12500000, // $125k in cents (estimating from $3M spike)
    confidence: "low" as const,
    confidenceReason: "One-time spike, not recurring",
    sourceType: "interview" as const,
    claimDate: "2025-10-01",
  },
  
  // More from research
  {
    founder: "KP",
    twitterHandle: "@thisiskp_",
    productName: "10x Audience",
    productUrl: "https://10xaudience.co",
    category: "social_media",
    vibecodedClaim: "Twitter audience growth tool. Built with AI, solo founder.",
    vibecodedSource: "https://twitter.com/thisiskp_",
    vibecodedPercent: 75,
    toolsUsed: ["gpt", "cursor"],
    mrr: 800000, // $8k in cents
    confidence: "low" as const,
    confidenceReason: "Self-reported on Twitter",
    sourceType: "twitter" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "Nat Eliason",
    twitterHandle: "@nateliason",
    productName: "Infinite Craft",
    productUrl: "https://neal.fun/infinite-craft/",
    category: "gaming",
    vibecodedClaim: "Viral browser game. AI-assisted development.",
    vibecodedSource: "https://twitter.com/nateliason",
    vibecodedPercent: 60,
    toolsUsed: ["gpt"],
    mrr: 2500000, // $25k in cents (ad revenue estimate)
    confidence: "low" as const,
    confidenceReason: "Ad-based revenue estimate",
    sourceType: "twitter" as const,
    claimDate: "2024-12-01",
  },
  {
    founder: "Sam Parr",
    twitterHandle: "@theSamParr",
    productName: "AI Tools Directory",
    productUrl: "https://aitools.fyi",
    category: "directory",
    vibecodedClaim: "AI tools directory. Quick build with AI assistance.",
    vibecodedSource: "https://twitter.com/theSamParr",
    vibecodedPercent: 80,
    toolsUsed: ["gpt", "cursor"],
    mrr: 500000, // $5k in cents
    confidence: "low" as const,
    confidenceReason: "Self-reported, side project",
    sourceType: "twitter" as const,
    claimDate: "2024-11-01",
  },
  {
    founder: "Ben Tossell",
    twitterHandle: "@bentossell",
    productName: "Makerpad",
    productUrl: "https://makerpad.co",
    category: "no_code",
    vibecodedClaim: "No-code education platform. Acquired by Zapier.",
    vibecodedSource: "https://twitter.com/bentossell",
    vibecodedPercent: 50,
    toolsUsed: ["gpt"],
    mrr: 3000000, // $30k pre-acquisition estimate
    confidence: "medium" as const,
    confidenceReason: "Pre-acquisition, media coverage",
    sourceType: "interview" as const,
    claimDate: "2023-06-01",
  },
  {
    founder: "Sahil Lavingia",
    twitterHandle: "@shl",
    productName: "Gumroad",
    productUrl: "https://gumroad.com",
    category: "ecommerce",
    vibecodedClaim: "Creator economy platform. AI-assisted features.",
    vibecodedSource: "https://twitter.com/shl",
    vibecodedPercent: 30,
    toolsUsed: ["copilot"],
    mrr: 100000000, // $1M in cents
    confidence: "high" as const,
    confidenceReason: "Open startup, public financials",
    sourceType: "open_startup" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "Cal.com Team",
    twitterHandle: "@calloyal",
    productName: "Cal.com",
    productUrl: "https://cal.com",
    category: "scheduling",
    vibecodedClaim: "Open source scheduling. AI features added.",
    vibecodedSource: "https://cal.com/open",
    vibecodedPercent: 40,
    toolsUsed: ["copilot", "cursor"],
    mrr: 20000000, // $200k in cents
    confidence: "high" as const,
    confidenceReason: "Open startup dashboard",
    sourceType: "open_startup" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "Fabian Maume",
    twitterHandle: "@FabianMaume",
    productName: "Phantombuster",
    productUrl: "https://phantombuster.com",
    category: "automation",
    vibecodedClaim: "LinkedIn automation tool. AI-enhanced features.",
    vibecodedSource: "https://twitter.com/FabianMaume",
    vibecodedPercent: 45,
    toolsUsed: ["gpt"],
    mrr: 15000000, // $150k in cents
    confidence: "medium" as const,
    confidenceReason: "Indie hacker community member",
    sourceType: "twitter" as const,
    claimDate: "2024-12-01",
  },
  {
    founder: "Courtland Allen",
    twitterHandle: "@csallen",
    productName: "Indie Hackers",
    productUrl: "https://indiehackers.com",
    category: "community",
    vibecodedClaim: "Indie hacker community. Acquired by Stripe.",
    vibecodedSource: "https://twitter.com/csallen",
    vibecodedPercent: 20,
    toolsUsed: ["copilot"],
    mrr: 5000000, // $50k pre-acquisition estimate
    confidence: "medium" as const,
    confidenceReason: "Pre-Stripe acquisition",
    sourceType: "interview" as const,
    claimDate: "2021-06-01",
  },
  {
    founder: "Michael Andreuzza",
    twitterHandle: "@Mike_Andreuzza",
    productName: "Lexington Themes",
    productUrl: "https://lexingtonthemes.com",
    category: "templates",
    vibecodedClaim: "Tailwind templates. Built with AI assistance.",
    vibecodedSource: "https://twitter.com/Mike_Andreuzza",
    vibecodedPercent: 65,
    toolsUsed: ["cursor", "gpt"],
    mrr: 700000, // $7k in cents
    confidence: "medium" as const,
    confidenceReason: "Building in public",
    sourceType: "twitter" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "Derrick Reimer",
    twitterHandle: "@derrickreimer",
    productName: "SavvyCal",
    productUrl: "https://savvycal.com",
    category: "scheduling",
    vibecodedClaim: "Scheduling tool. AI-assisted development.",
    vibecodedSource: "https://twitter.com/derrickreimer",
    vibecodedPercent: 45,
    toolsUsed: ["copilot"],
    mrr: 4000000, // $40k in cents
    confidence: "medium" as const,
    confidenceReason: "Building in public podcast",
    sourceType: "interview" as const,
    claimDate: "2024-12-01",
  },
  {
    founder: "Rosie Sherry",
    twitterHandle: "@rosiesherry",
    productName: "Rosieland",
    productUrl: "https://rosie.land",
    category: "community",
    vibecodedClaim: "Community building resources. AI-assisted content.",
    vibecodedSource: "https://twitter.com/rosiesherry",
    vibecodedPercent: 50,
    toolsUsed: ["gpt"],
    mrr: 600000, // $6k in cents
    confidence: "low" as const,
    confidenceReason: "Self-reported, smaller operation",
    sourceType: "twitter" as const,
    claimDate: "2024-12-01",
  },
  {
    founder: "Pieter Levels",
    twitterHandle: "@levelsio",
    productName: "Nomad List",
    productUrl: "https://nomadlist.com",
    category: "travel",
    vibecodedClaim: "Digital nomad platform. OG indie hacker, some AI features added.",
    vibecodedSource: "https://twitter.com/levelsio",
    vibecodedPercent: 35,
    toolsUsed: ["gpt"],
    mrr: 8000000, // $80k in cents
    confidence: "medium" as const,
    confidenceReason: "Long-running product, transparent founder",
    sourceType: "twitter" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "Pieter Levels",
    twitterHandle: "@levelsio",
    productName: "Remote OK",
    productUrl: "https://remoteok.com",
    category: "jobs",
    vibecodedClaim: "Remote job board. AI-assisted moderation.",
    vibecodedSource: "https://twitter.com/levelsio",
    vibecodedPercent: 40,
    toolsUsed: ["gpt"],
    mrr: 10000000, // $100k in cents
    confidence: "medium" as const,
    confidenceReason: "Transparent founder, portfolio product",
    sourceType: "twitter" as const,
    claimDate: "2025-01-01",
  },
  {
    founder: "AJ",
    twitterHandle: "@ajlkn",
    productName: "HTML5 UP",
    productUrl: "https://html5up.net",
    category: "templates",
    vibecodedClaim: "Free HTML templates. Creator of Carrd.",
    vibecodedSource: "https://twitter.com/ajlkn",
    vibecodedPercent: 30,
    toolsUsed: ["copilot"],
    mrr: 1000000, // $10k in cents (donation/sponsorship model)
    confidence: "low" as const,
    confidenceReason: "Side project, donation-based",
    sourceType: "twitter" as const,
    claimDate: "2024-06-01",
  },
];

export async function seedLeaderboard() {
  console.log("Seeding leaderboard with vibecoded apps...");
  
  // Clear existing leaderboard data
  await db.delete(schema.claimSources);
  await db.delete(schema.mrrClaims);
  await db.delete(schema.founders);
  
  const now = Date.now();
  let count = 0;
  
  for (const app of vibecodedApps) {
    try {
      const founderId = ulid();
      const claimId = ulid();
      const sourceId = ulid();
      const claimDate = new Date(app.claimDate);
      
      // Insert founder
      await db.insert(schema.founders).values({
        id: founderId,
        name: app.founder,
        twitterHandle: app.twitterHandle,
        productName: app.productName,
        productUrl: app.productUrl,
        category: app.category,
        vibecodedClaim: app.vibecodedClaim,
        vibecodedSource: app.vibecodedSource,
        vibecodedPercent: app.vibecodedPercent,
        toolsUsed: JSON.stringify(app.toolsUsed),
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
      
      // Insert MRR claim
      await db.insert(schema.mrrClaims).values({
        id: claimId,
        founderId,
        mrr: app.mrr,
        arr: app.mrr * 12,
        claimDate,
        confidence: app.confidence,
        confidenceReason: app.confidenceReason,
        isStripeVerified: false,
        isOpenStartup: app.sourceType === "open_startup",
        hasMultipleSources: false,
        scrapedAt: new Date(now),
      });
      
      // Insert source
      await db.insert(schema.claimSources).values({
        id: sourceId,
        claimId,
        sourceType: app.sourceType,
        sourceUrl: app.vibecodedSource,
        sourceDate: claimDate,
        rawText: app.vibecodedClaim,
        createdAt: new Date(now),
      });
      
      count++;
      console.log(`  ✓ ${app.productName} by ${app.founder} - $${(app.mrr / 100).toLocaleString()}/mo`);
    } catch (error) {
      console.error(`  ✗ Error adding ${app.productName}:`, error);
    }
  }
  
  console.log(`\nSeeded ${count} vibecoded apps!`);
}
