import { NextRequest, NextResponse } from "next/server";
import { db, schema, ensureDb } from "@/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { ulid } from "ulid";

// Lazy initialize OpenAI client
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
  });
}

/**
 * Structured Output schema for idea generation.
 * This guarantees the model adheres to our JSON structure.
 */
const IDEAS_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "ideas_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        ideas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { 
                type: "string",
                description: "A catchy but descriptive title for the app idea"
              },
              description: { 
                type: "string",
                description: "2-3 sentence description of what it does and why it's valuable"
              },
              complexity: { 
                type: "integer", 
                minimum: 1, 
                maximum: 5,
                description: "Build complexity: 1=trivial, 2=easy, 3=moderate, 4=hard, 5=very complex"
              },
              potentialImpact: { 
                type: "integer", 
                minimum: 1, 
                maximum: 5,
                description: "Market opportunity: 1=niche, 2=small, 3=moderate, 4=large, 5=massive"
              },
              techStack: { 
                type: "string",
                description: "Suggested technologies, e.g., 'Next.js, OpenAI API, Vercel'"
              },
            },
            required: ["title", "description", "complexity", "potentialImpact", "techStack"],
            additionalProperties: false,
          },
        },
      },
      required: ["ideas"],
      additionalProperties: false,
    },
  },
};

interface StructuredIdea {
  title: string;
  description: string;
  complexity: number;
  potentialImpact: number;
  techStack: string;
}

interface IdeasResponse {
  ideas: StructuredIdea[];
}

const SYSTEM_PROMPT = `You are an expert product strategist and developer who specializes in turning AI capabilities into actionable product ideas. 

Given an AI update or announcement, generate 3-5 creative and practical app/tool ideas that leverage this new capability. Focus on:
- Real problems that can be solved
- Ideas that are feasible to build as an indie developer or small team
- Products that could be launched quickly (MVP in 1-2 weeks)
- Ideas that take FULL advantage of the SPECIFIC new capability mentioned

Rate complexity and impact on a 1-5 scale:
- Complexity: 1=weekend project, 2=week, 3=2 weeks, 4=month, 5=multi-month
- Impact: 1=niche hobby, 2=small market, 3=moderate B2B/B2C, 4=large market, 5=platform potential

Be specific and creative. Avoid generic "AI wrapper" ideas.`;

// POST /api/ideas/generate - Generate ideas for an update
export async function POST(request: NextRequest) {
  try {
    // Initialize database if needed
    await ensureDb();
    
    const body = await request.json();
    const { updateId } = body;

    if (!updateId) {
      return NextResponse.json({ error: "Update ID required" }, { status: 400 });
    }

    // Get the update
    const update = await db
      .select()
      .from(schema.updates)
      .where(eq(schema.updates.id, updateId))
      .limit(1);

    if (update.length === 0) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    const updateData = update[0];

    // Check if ideas already exist
    const existingIdeas = await db
      .select()
      .from(schema.ideas)
      .where(eq(schema.ideas.updateId, updateId));

    if (existingIdeas.length > 0) {
      // Transform for frontend compatibility
      const transformedIdeas = existingIdeas.map((idea) => ({
        ...idea,
        // Convert numeric to string for backwards compatibility with frontend
        complexity: complexityToString(idea.complexity),
        potentialImpact: impactToString(idea.potentialImpact),
        generatedAt: new Date(idea.generatedAt).toISOString(),
      }));
      return NextResponse.json({ ideas: transformedIdeas });
    }

    // Check for API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      // Return mock ideas if no API key
      const mockIdeas = generateMockIdeas(updateData.title, updateData.contentText);
      const insertedIdeas = await insertIdeas(updateId, mockIdeas, "mock");
      return NextResponse.json({ ideas: insertedIdeas });
    }

    // Generate ideas with OpenAI using Structured Outputs
    const openai = getOpenAIClient();
    const contentPreview = updateData.contentText.slice(0, 1500);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `AI Update from ${updateData.provider}:\n\nTitle: ${updateData.title}\n\nDetails:\n${contentPreview}\n\nGenerate 3-5 product ideas that leverage this specific capability.`,
        },
      ],
      response_format: IDEAS_SCHEMA,
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    let parsedResponse: IdeasResponse;

    try {
      parsedResponse = JSON.parse(responseText) as IdeasResponse;
    } catch (e) {
      console.error("Failed to parse OpenAI response:", e);
      // Fallback to mock ideas
      const mockIdeas = generateMockIdeas(updateData.title, updateData.contentText);
      const insertedIdeas = await insertIdeas(updateId, mockIdeas, "mock-fallback");
      return NextResponse.json({ ideas: insertedIdeas });
    }

    // Insert ideas into database
    const insertedIdeas = await insertIdeas(
      updateId, 
      parsedResponse.ideas.slice(0, 5),
      completion.model
    );

    return NextResponse.json({ ideas: insertedIdeas });
  } catch (error) {
    console.error("Idea generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate ideas" },
      { status: 500 }
    );
  }
}

/**
 * Insert ideas into the database and return transformed results.
 */
async function insertIdeas(
  updateId: string,
  ideas: StructuredIdea[],
  model: string
): Promise<Array<{
  id: string;
  title: string;
  description: string;
  complexity: string;
  potentialImpact: string;
  techStack: string | null;
  generatedAt: string;
}>> {
  const now = Date.now();
  
  const insertedIdeas = await Promise.all(
    ideas.map(async (idea) => {
      const id = ulid();
      await db.insert(schema.ideas).values({
        id,
        updateId,
        title: idea.title,
        description: idea.description,
        complexity: idea.complexity,
        potentialImpact: idea.potentialImpact,
        techStack: idea.techStack,
        model,
        generatedAt: new Date(now),
      });
      
      return {
        id,
        title: idea.title,
        description: idea.description,
        complexity: complexityToString(idea.complexity),
        potentialImpact: impactToString(idea.potentialImpact),
        techStack: idea.techStack,
        generatedAt: new Date(now).toISOString(),
      };
    })
  );
  
  return insertedIdeas;
}

/**
 * Convert numeric complexity to string for frontend compatibility.
 */
function complexityToString(complexity: number | null): string {
  if (complexity === null) return "medium";
  if (complexity <= 2) return "low";
  if (complexity <= 3) return "medium";
  return "high";
}

/**
 * Convert numeric impact to string for frontend compatibility.
 */
function impactToString(impact: number | null): string {
  if (impact === null) return "medium";
  if (impact <= 2) return "low";
  if (impact <= 3) return "medium";
  return "high";
}

/**
 * Generate mock ideas when no API key is available.
 */
function generateMockIdeas(title: string, content: string): StructuredIdea[] {
  const keywords = `${title} ${content}`.toLowerCase();
  
  const ideas: StructuredIdea[] = [
    {
      title: "AI-Powered Content Analyzer",
      description: `Leverage this new capability to build a tool that automatically analyzes content and provides actionable insights. Perfect for marketers and content creators looking to optimize their work.`,
      complexity: 3,
      potentialImpact: 4,
      techStack: "Next.js, OpenAI API, Tailwind CSS",
    },
    {
      title: "Smart Automation Assistant",
      description: `Create a no-code automation platform that uses this AI update to help users automate repetitive tasks. Target small businesses and solo entrepreneurs.`,
      complexity: 4,
      potentialImpact: 4,
      techStack: "React, Node.js, PostgreSQL",
    },
    {
      title: "Developer Productivity Tool",
      description: `Build a VS Code extension or CLI tool that integrates this capability to help developers work faster. Focus on code review, documentation, or testing.`,
      complexity: 2,
      potentialImpact: 3,
      techStack: "TypeScript, VS Code API",
    },
  ];

  // Customize based on keywords
  if (keywords.includes("vision") || keywords.includes("image")) {
    ideas[0] = {
      title: "Visual Content Moderator",
      description: "An automated image moderation service for user-generated content platforms. Uses the new vision capabilities to detect and flag inappropriate content.",
      complexity: 3,
      potentialImpact: 4,
      techStack: "Next.js, OpenAI Vision API, AWS S3",
    };
  }

  if (keywords.includes("voice") || keywords.includes("audio") || keywords.includes("speech")) {
    ideas[1] = {
      title: "Podcast Transcription & Insights",
      description: "Automatically transcribe podcasts and generate chapter markers, summaries, and shareable quotes. Perfect for podcast creators and listeners.",
      complexity: 3,
      potentialImpact: 4,
      techStack: "Next.js, Whisper API, Supabase",
    };
  }

  if (keywords.includes("function") || keywords.includes("tool") || keywords.includes("agent")) {
    ideas[2] = {
      title: "AI Agent Marketplace",
      description: "A platform where users can create, share, and monetize custom AI agents for specific tasks. Think Zapier but for AI workflows.",
      complexity: 5,
      potentialImpact: 5,
      techStack: "Next.js, LangChain, PostgreSQL, Stripe",
    };
  }

  return ideas;
}

