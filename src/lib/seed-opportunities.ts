import { db, schema } from "@/db";
import { ulid } from "ulid";

export async function seedOpportunities() {
  // Get existing updates to link opportunities
  const updates = await db.select().from(schema.updates).limit(20);
  
  if (updates.length === 0) {
    console.log("No updates found, skipping opportunity seeding");
    return;
  }

  // Map update titles to their IDs for linking
  const updateMap = new Map(updates.map(u => [u.title, u.id]));

  // Structured opportunities data
  const opportunitiesData = [
    // Gemini 2.5 / Deep Research opportunities
    {
      updateTitle: "Gemini 2.5 Pro",
      opportunities: [
        {
          title: "AI Legal Document Generator",
          description: "Auto-generate privacy policies, terms of service, and GDPR-compliant documents for SaaS founders",
          targetUser: "Indie SaaS founders and small businesses",
          jobToBeDone: "Need legally compliant documents without hiring lawyers ($500-5000 per doc)",
          surfaceArea: "web_app" as const,
          hardDependencies: ["reasoning"],
          distributionWedge: ["seo", "templates", "marketplace"],
          moatPotential: ["workflow_lock", "data_flywheel"],
          indieViabilityScore: 5,
          timeToRevenueScore: 4,
          competitionScore: 2,
          pricingAnchor: "$29-99/mo",
          mvpBullets: [
            "Questionnaire wizard for business type, data practices, jurisdictions",
            "Template engine with Gemini for document generation",
            "GDPR, CCPA, SOC2 compliance presets",
            "Version tracking and change alerts when laws update",
            "Export to Markdown, HTML, or embeddable widget",
            "Dashboard showing document freshness",
            "Email alerts for regulatory changes",
            "White-label option for agencies",
            "Stripe for subscriptions",
            "Integration with common website builders"
          ],
          risks: [
            "Legal liability if documents are incorrect",
            "Needs legal expert review for launch",
            "Regulatory landscape changes frequently",
            "Large players like Termly exist but charge more"
          ]
        },
        {
          title: "AI Research Assistant for VCs",
          description: "Deep research tool that generates investment memos, competitor analysis, and market sizing for venture capitalists",
          targetUser: "VCs, angel investors, and PE analysts",
          jobToBeDone: "Spend 10-20 hours per deal on research, need faster due diligence",
          surfaceArea: "web_app" as const,
          hardDependencies: ["reasoning", "search"],
          distributionWedge: ["outbound", "community"],
          moatPotential: ["data_flywheel", "workflow_lock"],
          indieViabilityScore: 3,
          timeToRevenueScore: 3,
          competitionScore: 3,
          pricingAnchor: "$500-2000/mo",
          mvpBullets: [
            "Company URL input → auto-pull public data",
            "Generate standardized investment memo",
            "Competitor mapping with public data",
            "TAM/SAM/SOM estimation",
            "Founder background research",
            "Red flag detection (lawsuits, bad press)",
            "Integration with CRM (Affinity, Attio)",
            "PDF export for LP reports",
            "Collaboration features for deal teams",
            "Weekly digest of portfolio company news"
          ],
          risks: [
            "VCs are slow to adopt new tools",
            "Need strong accuracy for financial claims",
            "Enterprise sales cycle is long",
            "Competition from Bloomberg, PitchBook"
          ]
        }
      ]
    },
    // Claude 4 / Opus opportunities
    {
      updateTitle: "Claude 4 Opus",
      opportunities: [
        {
          title: "AI Code Review Bot",
          description: "GitHub app that reviews PRs with senior-engineer-level feedback on architecture, security, and performance",
          targetUser: "Startups with small engineering teams (2-10 devs)",
          jobToBeDone: "No senior dev to review code, PRs sit for days, bugs ship to production",
          surfaceArea: "api" as const,
          hardDependencies: ["code_gen", "reasoning"],
          distributionWedge: ["marketplace", "plg"],
          moatPotential: ["workflow_lock"],
          indieViabilityScore: 4,
          timeToRevenueScore: 4,
          competitionScore: 3,
          pricingAnchor: "$49-199/mo per repo",
          mvpBullets: [
            "GitHub App installation flow",
            "Webhook listener for PR events",
            "Claude API integration for code analysis",
            "Inline comments on specific lines",
            "Security vulnerability detection",
            "Performance suggestions",
            "Architecture feedback for large changes",
            "Customizable review rules per repo",
            "Slack notifications for reviews",
            "Usage dashboard and billing"
          ],
          risks: [
            "GitHub Copilot is adding similar features",
            "Code context limits may miss important files",
            "Security-sensitive code in prompts",
            "API costs can spike on large PRs"
          ]
        }
      ]
    },
    // OpenAI Realtime API opportunities  
    {
      updateTitle: "GPT-4o Realtime Voice",
      opportunities: [
        {
          title: "AI Sales Call Coach",
          description: "Real-time coaching during sales calls with objection handling, competitor intel, and close suggestions",
          targetUser: "SDRs and AEs at B2B SaaS companies",
          jobToBeDone: "New reps struggle to handle objections, miss upsell opportunities",
          surfaceArea: "web_app" as const,
          hardDependencies: ["realtime_voice", "reasoning"],
          distributionWedge: ["outbound", "plg"],
          moatPotential: ["data_flywheel", "workflow_lock"],
          indieViabilityScore: 3,
          timeToRevenueScore: 3,
          competitionScore: 2,
          pricingAnchor: "$99-299/seat/mo",
          mvpBullets: [
            "Browser-based call recording with transcription",
            "Real-time keyword detection (competitor names, objections)",
            "Side panel with suggested responses",
            "Battlecard integration",
            "Post-call summary and action items",
            "CRM integration (Salesforce, HubSpot)",
            "Manager dashboard with rep metrics",
            "Coaching playbook builder",
            "Call library for training",
            "GDPR/CCPA compliant recording consent"
          ],
          risks: [
            "Enterprise sales cycle required",
            "Latency must be <500ms for real-time",
            "Gong and Chorus are established players",
            "Privacy concerns with call recording"
          ]
        },
        {
          title: "AI Customer Support Voice Agent",
          description: "24/7 voice-based support agent for e-commerce that handles order status, returns, and FAQs",
          targetUser: "Shopify stores with 1000-50000 orders/month",
          jobToBeDone: "Support tickets pile up, customers wait hours for simple questions",
          surfaceArea: "api" as const,
          hardDependencies: ["realtime_voice", "tool_use"],
          distributionWedge: ["marketplace", "plg"],
          moatPotential: ["workflow_lock"],
          indieViabilityScore: 4,
          timeToRevenueScore: 4,
          competitionScore: 3,
          pricingAnchor: "$0.50-1.00/call + base",
          mvpBullets: [
            "Shopify integration for order data",
            "Phone number provisioning (Twilio)",
            "Order status lookups",
            "Return/exchange initiation",
            "FAQ training from knowledge base",
            "Escalation to human with context",
            "Call recording and transcripts",
            "Analytics dashboard",
            "Custom voice and personality",
            "Multi-language support"
          ],
          risks: [
            "Per-minute API costs can eat margins",
            "Voice quality must be high",
            "Handoff to humans needs to be smooth",
            "Shopify may build this themselves"
          ]
        }
      ]
    },
    // Perplexity/Search opportunities
    {
      updateTitle: "Sonar Pro API",
      opportunities: [
        {
          title: "AI Content Freshness Monitor",
          description: "Monitors competitors and generates content update suggestions when new info emerges",
          targetUser: "Content marketers and SEO agencies",
          jobToBeDone: "Old blog posts lose rankings, no time to manually check for outdated info",
          surfaceArea: "web_app" as const,
          hardDependencies: ["search"],
          distributionWedge: ["seo", "plg"],
          moatPotential: ["workflow_lock"],
          indieViabilityScore: 5,
          timeToRevenueScore: 5,
          competitionScore: 2,
          pricingAnchor: "$49-149/mo",
          mvpBullets: [
            "Import URLs from sitemap or manual list",
            "Weekly crawl of each page",
            "Search for recent news on page topics",
            "Generate update suggestions with sources",
            "Priority score based on traffic + staleness",
            "Integrations with Google Search Console",
            "Email alerts for urgent updates",
            "Content calendar with suggested updates",
            "Before/after traffic tracking",
            "Team collaboration features"
          ],
          risks: [
            "SEO tools space is crowded",
            "Perplexity API costs per query",
            "Need to prove ROI to marketers",
            "Google algorithm changes affect value prop"
          ]
        }
      ]
    }
  ];

  console.log("Seeding opportunities...");
  
  for (const { updateTitle, opportunities } of opportunitiesData) {
    const updateId = updateMap.get(updateTitle);
    if (!updateId) {
      // Try partial match
      const matchingUpdate = updates.find(u => 
        u.title.toLowerCase().includes(updateTitle.toLowerCase().split(" ")[0])
      );
      if (!matchingUpdate) {
        console.log(`Skipping opportunities for "${updateTitle}" - no matching update found`);
        continue;
      }
    }
    
    const finalUpdateId = updateId || updates.find(u => 
      u.title.toLowerCase().includes(updateTitle.toLowerCase().split(" ")[0])
    )?.id;
    
    if (!finalUpdateId) continue;
    
    for (const opp of opportunities) {
      const id = ulid();
      const now = Date.now();
      
      try {
        await db.insert(schema.opportunities).values({
          id,
          updateId: finalUpdateId,
          title: opp.title,
          description: opp.description,
          targetUser: opp.targetUser,
          jobToBeDone: opp.jobToBeDone,
          surfaceArea: opp.surfaceArea,
          hardDependencies: JSON.stringify(opp.hardDependencies),
          distributionWedge: JSON.stringify(opp.distributionWedge),
          moatPotential: JSON.stringify(opp.moatPotential),
          indieViabilityScore: opp.indieViabilityScore,
          timeToRevenueScore: opp.timeToRevenueScore,
          competitionScore: opp.competitionScore,
          pricingAnchor: opp.pricingAnchor,
          mvpBullets: JSON.stringify(opp.mvpBullets),
          risks: JSON.stringify(opp.risks),
          relatedProductIds: null,
          createdAt: new Date(now),
        });
        
        console.log(`Created opportunity: ${opp.title}`);
      } catch (error) {
        console.error(`Error creating opportunity ${opp.title}:`, error);
      }
    }
  }
  
  console.log("Opportunities seeded successfully");
}

