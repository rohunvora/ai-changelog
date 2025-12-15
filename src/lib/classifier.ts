import OpenAI from "openai";

/**
 * Classification types for AI updates
 */
export const UNLOCK_TYPES = {
  NEW_CAPABILITY: "new_capability",    // Unlocks something that wasn't possible before
  IMPROVEMENT: "improvement",          // Better/faster/cheaper at existing capabilities
  OPERATIONAL: "operational",          // Pricing, deprecations, SDK updates, docs
} as const;

export type UnlockType = typeof UNLOCK_TYPES[keyof typeof UNLOCK_TYPES];

export interface ClassificationResult {
  unlockType: UnlockType;
  capability?: string;           // What the new capability is (for NEW_CAPABILITY)
  enablesBuilding?: string[];    // What categories of apps this enables
  confidence: number;            // 0-1 confidence score
}

/**
 * Structured Output schema for classification
 */
const CLASSIFICATION_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "update_classification",
    strict: true,
    schema: {
      type: "object",
      properties: {
        unlockType: {
          type: "string",
          enum: ["new_capability", "improvement", "operational"],
          description: "The type of update"
        },
        capability: {
          type: "string",
          description: "For new_capability: what specific new ability does this unlock? E.g., 'video understanding', 'image editing', 'web search', 'computer control'"
        },
        enablesBuilding: {
          type: "array",
          items: { type: "string" },
          description: "For new_capability: what categories of apps/tools can now be built? E.g., ['video summarization', 'content moderation', 'meeting analysis']"
        },
        confidence: {
          type: "number",
          description: "How confident are you in this classification? 0.0 to 1.0"
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of why this classification was chosen"
        }
      },
      required: ["unlockType", "confidence", "reasoning"],
      additionalProperties: false,
    },
  },
};

const CLASSIFIER_PROMPT = `You are an expert at identifying which AI announcements represent genuine NEW capabilities that unlock building opportunities.

Classify each update into ONE of these categories:

**NEW_CAPABILITY** - Use ONLY when this announcement gives developers access to something that LITERALLY wasn't possible before:
- New modality (vision, audio, video understanding/generation)
- New interaction paradigm (computer control, real-time voice, web browsing)
- New API endpoint for a previously unavailable feature
- Access to a fundamentally new model architecture with new abilities

Examples of NEW_CAPABILITY:
- "Gemini can now edit images with text instructions" → NEW (image editing wasn't available)
- "Claude can now control your computer" → NEW (computer control wasn't available)
- "Perplexity API now includes web search" → NEW (grounded web search wasn't available)
- "GPT-4o Realtime API for voice conversations" → NEW (real-time voice wasn't available)

**IMPROVEMENT** - The model/API does something it ALREADY could do, but better:
- Faster inference
- Lower pricing
- Longer context window
- Better accuracy/benchmarks
- New model version that's "smarter" but same capabilities

Examples of IMPROVEMENT:
- "Claude 3.5 is 2x faster than Claude 3" → IMPROVEMENT (speed)
- "GPT-4 Turbo now supports 128K context" → IMPROVEMENT (longer context)
- "Gemini Pro 1.5 achieves better benchmarks" → IMPROVEMENT (accuracy)

**OPERATIONAL** - Infrastructure, business, or maintenance updates:
- Pricing changes
- Deprecation notices
- SDK/library updates
- Documentation updates
- Regional availability
- Rate limit changes

Examples of OPERATIONAL:
- "Python SDK 2.1.0 released" → OPERATIONAL
- "GPT-3.5 pricing reduced by 25%" → OPERATIONAL
- "Model X deprecated, migrate by date Y" → OPERATIONAL

Be STRICT about NEW_CAPABILITY. Most updates are IMPROVEMENT or OPERATIONAL. True capability unlocks are rare - maybe 1-3 per month per provider.`;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
  }
  return openaiClient;
}

/**
 * Classify an AI update to determine if it's a capability unlock
 */
export async function classifyUpdate(
  provider: string,
  title: string,
  content: string
): Promise<ClassificationResult> {
  // If no API key, use heuristic classification
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
    return heuristicClassify(title, content);
  }

  try {
    const openai = getOpenAIClient();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFIER_PROMPT },
        {
          role: "user",
          content: `Provider: ${provider}\n\nTitle: ${title}\n\nContent: ${content.slice(0, 1500)}\n\nClassify this update.`,
        },
      ],
      response_format: CLASSIFICATION_SCHEMA,
      temperature: 0.1, // Low temperature for consistent classification
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(responseText);

    return {
      unlockType: parsed.unlockType as UnlockType,
      capability: parsed.capability,
      enablesBuilding: parsed.enablesBuilding,
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error("Classification error:", error);
    return heuristicClassify(title, content);
  }
}

/**
 * Fallback heuristic classification when no API key
 * Also exported for use in seed/migration scripts
 */
export function heuristicClassify(title: string, content: string): ClassificationResult {
  const text = `${title} ${content}`.toLowerCase();

  // NEW_CAPABILITY indicators
  const newCapabilityKeywords = [
    "now supports video",
    "video understanding",
    "image editing",
    "edit images",
    "computer use",
    "control your computer",
    "web search",
    "browse the web",
    "real-time voice",
    "voice conversation",
    "multimodal output",
    "generate images",
    "generate audio",
    "function calling",
    "tool use",
    "code execution",
    "file upload",
    "vision capabilities",
    "can now see",
    "can now hear",
  ];

  // OPERATIONAL indicators
  const operationalKeywords = [
    "sdk",
    "library",
    "package",
    "pricing",
    "price",
    "cost",
    "deprecated",
    "deprecation",
    "sunset",
    "migration",
    "documentation",
    "docs update",
    "rate limit",
    "availability",
    "region",
  ];

  // Check for new capability
  for (const keyword of newCapabilityKeywords) {
    if (text.includes(keyword)) {
      return {
        unlockType: UNLOCK_TYPES.NEW_CAPABILITY,
        capability: keyword,
        enablesBuilding: [],
        confidence: 0.6,
      };
    }
  }

  // Check for operational
  for (const keyword of operationalKeywords) {
    if (text.includes(keyword)) {
      return {
        unlockType: UNLOCK_TYPES.OPERATIONAL,
        confidence: 0.7,
      };
    }
  }

  // Default to improvement
  return {
    unlockType: UNLOCK_TYPES.IMPROVEMENT,
    confidence: 0.5,
  };
}

/**
 * Batch classify multiple updates (for migration)
 */
export async function classifyUpdates(
  updates: Array<{ id: string; provider: string; title: string; content: string }>
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();
  
  // Process sequentially to avoid rate limits
  for (const update of updates) {
    const result = await classifyUpdate(update.provider, update.title, update.content);
    results.set(update.id, result);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

