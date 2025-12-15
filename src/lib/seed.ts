import { db, schema } from "@/db";
import { ulid } from "ulid";
import { computeHash } from "./scrape/utils";
import { heuristicClassify } from "./classifier";

// Real, current AI updates as of December 2025
const realUpdates = [
  {
    provider: "openai",
    title: "GPT-5.2 Released - Most Advanced Model for Agentic Workflows",
    content: "OpenAI announces GPT-5.2, their most advanced model designed for professional work and agentic workflows. Building on GPT-5.1, this release emphasizes enterprise productivity with support for complex, multi-step tasks that can operate autonomously.",
    url: "https://openai.com/news/",
    category: "new_model",
    publishedAt: "2025-12-10",
    externalId: "openai-gpt-5.2-release",
    buildIdeas: [
      "Autonomous code review agent that iterates until tests pass",
      "Multi-step research assistant that writes entire reports",
      "AI project manager that breaks down tasks and delegates"
    ],
  },
  {
    provider: "openai",
    title: "ChatGPT Pro with o1 Pro Mode - $200/month Unlimited Access",
    content: "OpenAI launches ChatGPT Pro subscription at $200/month, featuring unlimited access to o1 pro mode, which uses more compute for the best answers to the hardest problems. Includes o1, GPT-4o, Advanced Voice, and the upcoming o1 pro mode.",
    url: "https://openai.com/index/introducing-chatgpt-pro/",
    category: "pricing",
    publishedAt: "2025-12-05",
    externalId: "openai-chatgpt-pro",
    buildIdeas: [],
  },
  {
    provider: "openai",
    title: "Sora Video Generation Model - Full Public Release",
    content: "Sora, OpenAI's video generation model, is now available to ChatGPT Plus and Pro users. Create videos up to 20 seconds in 1080p, with features like Storyboard for precise scene control, Blend for video mixing, and Loop for seamless animations.",
    url: "https://openai.com/sora/",
    category: "new_model",
    publishedAt: "2025-12-09",
    externalId: "openai-sora-release",
    buildIdeas: [
      "AI music video generator from lyrics",
      "Product demo video creator from screenshots",
      "Animated explainer video tool for educators",
      "Social media content generator for brands"
    ],
  },
  {
    provider: "anthropic",
    title: "Claude Opus 4.5 - Next Generation Reasoning Model",
    content: "Anthropic releases Claude Opus 4.5, featuring significantly improved reasoning capabilities, extended context windows, and better performance on complex analytical tasks. The model shows marked improvements in coding, math, and multi-step problem solving.",
    url: "https://www.anthropic.com/news",
    category: "new_model",
    publishedAt: "2025-12-12",
    externalId: "anthropic-opus-4.5",
    buildIdeas: [
      "Legal document analyzer with case law reasoning",
      "Scientific paper reviewer and critique generator",
      "Complex debugging assistant for distributed systems"
    ],
  },
  {
    provider: "anthropic",
    title: "Claude Computer Use - Control Your Desktop with AI",
    content: "Claude can now interact with computer interfaces by viewing screens, moving cursors, clicking buttons, and typing text. Available via API, this opens up possibilities for AI assistants that can help with complex computer tasks.",
    url: "https://docs.anthropic.com/en/docs/computer-use",
    category: "feature",
    publishedAt: "2025-10-29",
    externalId: "anthropic-computer-use",
    buildIdeas: [
      "QA automation that tests any web app visually",
      "Data entry bot for legacy systems without APIs",
      "Personal assistant that books appointments across sites",
      "Automated expense report filler from receipts"
    ],
  },
  {
    provider: "anthropic",
    title: "Claude Model Context Protocol (MCP) - Universal AI Integration",
    content: "Anthropic introduces the Model Context Protocol, an open standard for connecting AI assistants to data sources. MCP provides a universal way to connect Claude to content repositories, business tools, and development environments.",
    url: "https://www.anthropic.com/news/model-context-protocol",
    category: "feature",
    publishedAt: "2025-11-25",
    externalId: "anthropic-mcp",
    buildIdeas: [
      "Universal AI connector for any SaaS tool",
      "Enterprise knowledge base that spans all company tools",
      "IDE plugin that understands your entire codebase"
    ],
  },
  {
    provider: "google",
    title: "Gemini 2.0 Flash - Native Multimodal AI with Tool Use",
    content: "Google releases Gemini 2.0 Flash with native multimodal output including images, audio, and real-time streaming. Features native tool use for Google Search, code execution, and third-party functions. Twice as fast as 1.5 Pro with improved performance.",
    url: "https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/",
    category: "new_model",
    publishedAt: "2025-12-11",
    externalId: "google-gemini-2.0-flash",
    buildIdeas: [
      "Real-time visual translator with audio output",
      "Interactive diagram generator from descriptions",
      "Live tutoring app with instant visual explanations",
      "Podcast host that generates accompanying images"
    ],
  },
  {
    provider: "google",
    title: "Gemini Deep Research - Autonomous Research Agent",
    content: "Google upgrades Gemini Deep Research agent to improve enterprise analysis and reduce hallucinations in extended research tasks. The agent can autonomously browse the web, synthesize information, and produce comprehensive research reports.",
    url: "https://blog.google/products/gemini/",
    category: "feature",
    publishedAt: "2025-12-08",
    externalId: "google-deep-research",
    buildIdeas: [
      "Competitive intelligence dashboard with daily reports",
      "Academic literature review generator",
      "Market research tool for startup founders"
    ],
  },
  {
    provider: "google",
    title: "Project Astra - Universal AI Agent Preview",
    content: "Google previews Project Astra, a universal AI agent that can see, hear, and speak naturally through phone cameras or smart glasses. Demonstrates real-time multimodal understanding and the future of AI assistants.",
    url: "https://deepmind.google/technologies/project-astra/",
    category: "feature",
    publishedAt: "2025-12-11",
    externalId: "google-project-astra",
    buildIdeas: [
      "AR navigation assistant for complex buildings",
      "Real-time language translator with visual context",
      "AI shopping companion that identifies products",
      "Accessibility app for visually impaired users"
    ],
  },
  {
    provider: "xai",
    title: "Grok-2 with Vision - Image Understanding for X Premium+",
    content: "xAI releases Grok-2 with vision capabilities, allowing users to upload images for analysis. Available to X Premium+ subscribers, Grok can now understand charts, diagrams, screenshots, and photos with real-time X data integration.",
    url: "https://x.ai/blog/grok-2",
    category: "new_model",
    publishedAt: "2025-12-01",
    externalId: "xai-grok-2-vision",
    buildIdeas: [
      "Meme analyzer with trending topic context",
      "Screenshot-to-code converter with X community feedback",
      "Real-time chart interpreter for traders"
    ],
  },
  {
    provider: "xai",
    title: "Grok API Public Access with Competitive Pricing",
    content: "xAI opens Grok API to all developers with competitive pricing. Features include function calling, JSON mode, and system prompts. Grok models are known for real-time information access and less restrictive content policies.",
    url: "https://docs.x.ai/",
    category: "api_update",
    publishedAt: "2025-11-20",
    externalId: "xai-grok-api-public",
    buildIdeas: [
      "Edgy chatbot with current events knowledge",
      "Content moderation tool with nuanced policies",
      "Real-time news summarizer without delays"
    ],
  },
  {
    provider: "perplexity",
    title: "Perplexity Sonar Pro - Most Advanced Search Model",
    content: "Perplexity launches Sonar Pro, their most capable search-augmented model featuring multi-step reasoning, enhanced citation accuracy, and deeper web search. Available via API with significantly improved factual grounding.",
    url: "https://docs.perplexity.ai/",
    category: "new_model",
    publishedAt: "2025-12-03",
    externalId: "perplexity-sonar-pro",
    buildIdeas: [
      "Fact-checking browser extension with sources",
      "Research chatbot that cites everything",
      "Due diligence tool for investors",
      "Journalist research assistant with auto-citations"
    ],
  },
  {
    provider: "cohere",
    title: "Command R+ 08-2024 - Enterprise RAG Optimization",
    content: "Cohere releases Command R+ optimized for retrieval-augmented generation. Features improved grounding, better citation generation, and enhanced tool use. Ideal for enterprise knowledge management with 128K context window.",
    url: "https://docs.cohere.com/docs/command-r-plus",
    category: "new_model",
    publishedAt: "2025-08-15",
    externalId: "cohere-command-r-plus-08",
    buildIdeas: [
      "Internal knowledge base chatbot for enterprises",
      "Customer support bot trained on documentation",
      "Legal discovery tool with document citations"
    ],
  },
  {
    provider: "cohere",
    title: "Rerank 3.5 - Fastest Semantic Search Model",
    content: "Cohere introduces Rerank 3.5, their fastest and most accurate reranking model. Features 3x faster inference, improved multilingual support, and better handling of long documents. Essential for enterprise search optimization.",
    url: "https://docs.cohere.com/docs/rerank-2",
    category: "new_model",
    publishedAt: "2025-11-01",
    externalId: "cohere-rerank-3.5",
    buildIdeas: [
      "E-commerce search that understands intent",
      "Document retrieval system for law firms",
      "Multi-language knowledge base search"
    ],
  },
  {
    provider: "openai",
    title: "o1 Model - Advanced Reasoning with Chain of Thought",
    content: "OpenAI releases o1, a new model trained with reinforcement learning to perform complex reasoning. The model thinks before answering, producing a chain of thought that helps it solve science, coding, and math problems more accurately.",
    url: "https://openai.com/o1/",
    category: "new_model",
    publishedAt: "2025-12-05",
    externalId: "openai-o1-release",
    buildIdeas: [
      "Competitive programming assistant",
      "Math tutor that shows its work step-by-step",
      "Bug finder that reasons through code paths",
      "Scientific hypothesis generator"
    ],
  },
  {
    provider: "openai",
    title: "GPT-4o Realtime API - Voice-to-Voice Conversations",
    content: "The Realtime API enables low-latency, multimodal conversational experiences with GPT-4o. Build voice assistants that respond naturally in real-time, with support for interruptions, emotion detection, and multiple voices.",
    url: "https://platform.openai.com/docs/guides/realtime",
    category: "api_update",
    publishedAt: "2025-10-01",
    externalId: "openai-realtime-api",
    buildIdeas: [
      "AI phone receptionist for small businesses",
      "Language learning partner with natural conversation",
      "Therapy companion with emotional awareness",
      "Podcast co-host that responds in real-time"
    ],
  },
  {
    provider: "google",
    title: "NotebookLM Audio Overviews - Turn Documents into Podcasts",
    content: "Google's NotebookLM now generates AI-hosted podcast-style audio summaries of your documents. Upload PDFs, docs, or websites and get an engaging audio overview with two AI hosts discussing the content.",
    url: "https://notebooklm.google/",
    category: "feature",
    publishedAt: "2025-09-26",
    externalId: "google-notebooklm-audio",
    buildIdeas: [
      "Textbook-to-podcast converter for students",
      "Company memo summarizer as morning briefings",
      "Research paper explainer for non-experts",
      "Audiobook creator from any document"
    ],
  },
  {
    provider: "anthropic",
    title: "Claude 3.5 Sonnet - Most Intelligent Model Yet",
    content: "Claude 3.5 Sonnet sets new benchmarks for graduate-level reasoning, coding, and complex instruction following. 2x faster than Claude 3 Opus with significantly improved performance on agentic coding and tool use.",
    url: "https://www.anthropic.com/claude/sonnet",
    category: "new_model",
    publishedAt: "2025-06-20",
    externalId: "anthropic-claude-35-sonnet",
    buildIdeas: [
      "Full-stack app generator from specifications",
      "Code migration tool between frameworks",
      "Technical documentation generator from code"
    ],
  },
];

export async function seedDatabase() {
  console.log("Clearing old data and seeding with current AI updates...");
  
  // Clear existing data (order matters for foreign keys)
  await db.delete(schema.ideaBookmarks);
  await db.delete(schema.ideas);
  await db.delete(schema.updates);
  await db.delete(schema.locks);
  
  const now = Date.now();
  
  for (const update of realUpdates) {
    try {
      const publishedAt = new Date(update.publishedAt).getTime();
      const hash = computeHash(update.title, update.url, publishedAt, update.content);
      
      // Classify the update - if it has build ideas, it's a capability unlock
      const hasIdeas = update.buildIdeas && update.buildIdeas.length > 0;
      const classification = heuristicClassify(update.title, update.content);
      const unlockType = hasIdeas ? "new_capability" : classification.unlockType;
      
      await db.insert(schema.updates).values({
        id: ulid(),
        provider: update.provider,
        title: update.title,
        url: update.url,
        category: update.category,
        contentText: update.content,
        contentMd: update.content,
        raw: "",
        hash,
        unlockType,
        capability: classification.capability,
        enablesBuilding: hasIdeas 
          ? JSON.stringify(update.buildIdeas) 
          : null,
        publishedAt: new Date(publishedAt),
        scrapedAt: new Date(now),
        externalId: update.externalId,
      });
      
      const typeEmoji = unlockType === "new_capability" ? "🔓" : 
                        unlockType === "improvement" ? "📈" : "⚙️";
      console.log(`  ${typeEmoji} Added: ${update.title.slice(0, 55)}...`);
    } catch (error) {
      console.log(`  - Error: ${update.title.slice(0, 40)}...`, error);
    }
  }
  
  console.log(`\nSeeded ${realUpdates.length} real AI updates!`);
}
