import { db, schema } from "@/db";

const sampleUpdates = [
  {
    provider: "openai",
    title: "GPT-4 Turbo with 128K context window now available",
    content: "We're releasing GPT-4 Turbo with a 128K context window, which is equivalent to more than 300 pages of text in a single prompt. This model is more capable, has knowledge up to April 2024, and introduces a new JSON mode that ensures the model responds with valid JSON.",
    url: "https://platform.openai.com/docs/changelog",
    category: "new_model",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    externalId: "openai-gpt4-turbo-128k",
  },
  {
    provider: "anthropic",
    title: "Claude 3.5 Sonnet: Our most intelligent model",
    content: "Claude 3.5 Sonnet sets new industry benchmarks for graduate-level reasoning, undergraduate-level knowledge, and coding proficiency. It shows marked improvement in grasping nuance, humor, and complex instructions, and is exceptional at writing high-quality content with a natural, relatable tone.",
    url: "https://docs.anthropic.com/en/release-notes",
    category: "new_model",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    externalId: "anthropic-claude-35-sonnet",
  },
  {
    provider: "google",
    title: "Gemini 2.0 Flash with native tool use",
    content: "Gemini 2.0 Flash introduces native multimodal capabilities including image generation, text-to-speech, and native tool use. The model can now natively use tools like Google Search, code execution, and third-party functions defined via function calling.",
    url: "https://ai.google.dev/gemini-api/docs/changelog",
    category: "feature",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    externalId: "google-gemini-2-flash",
  },
  {
    provider: "xai",
    title: "Grok-2 API now available with vision capabilities",
    content: "The Grok-2 API is now publicly available with vision understanding capabilities. Developers can now build applications that analyze images, extract information from screenshots, and understand visual content alongside text.",
    url: "https://x.ai/blog",
    category: "api_update",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    externalId: "xai-grok2-vision",
  },
  {
    provider: "openai",
    title: "Realtime API for speech-to-speech applications",
    content: "The Realtime API enables developers to build low-latency, multi-modal conversational experiences. It supports natural speech-to-speech conversations and allows developers to create voice assistants that can respond in real-time with expressive, natural-sounding voices.",
    url: "https://platform.openai.com/docs/guides/realtime",
    category: "api_update",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
    externalId: "openai-realtime-api",
  },
  {
    provider: "anthropic",
    title: "Computer Use capability in Claude",
    content: "Claude can now interact with computer interfaces by viewing screens, moving cursors, clicking buttons, and typing text. This opens up possibilities for AI assistants that can help with complex computer tasks while you supervise.",
    url: "https://docs.anthropic.com/en/docs/computer-use",
    category: "feature",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 days ago
    externalId: "anthropic-computer-use",
  },
  {
    provider: "perplexity",
    title: "Sonar API with real-time web search",
    content: "The Sonar API provides access to Perplexity's search-augmented LLMs that can search the web in real-time. Responses include inline citations so you can verify the sources of information.",
    url: "https://docs.perplexity.ai/guides/getting-started",
    category: "api_update",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(), // 6 days ago
    externalId: "perplexity-sonar-api",
  },
  {
    provider: "cohere",
    title: "Command R+ with RAG optimization",
    content: "Command R+ is optimized for retrieval-augmented generation workflows. It excels at taking retrieved documents and generating accurate, well-cited responses, making it ideal for enterprise knowledge management applications.",
    url: "https://docs.cohere.com/docs/command-r-plus",
    category: "new_model",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(), // 7 days ago
    externalId: "cohere-command-r-plus",
  },
];

export async function seedDatabase() {
  console.log("Seeding database with sample updates...");
  
  for (const update of sampleUpdates) {
    try {
      await db.insert(schema.updates).values({
        ...update,
        scrapedAt: new Date().toISOString(),
      });
      console.log(`  ✓ Added: ${update.title.slice(0, 50)}...`);
    } catch (error) {
      // Probably duplicate
      console.log(`  - Skipped (duplicate): ${update.title.slice(0, 50)}...`);
    }
  }
  
  console.log("Seeding complete!");
}

