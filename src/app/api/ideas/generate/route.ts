import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

// Lazy initialize OpenAI client
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
  });
}

interface GeneratedIdea {
  title: string;
  description: string;
  complexity: "low" | "medium" | "high";
  potentialImpact: "low" | "medium" | "high";
  techStack: string;
}

const SYSTEM_PROMPT = `You are an expert product strategist and developer who specializes in turning AI capabilities into actionable product ideas. 

Given an AI update or announcement, generate 3 creative and practical app/tool ideas that leverage this new capability. Focus on:
- Real problems that can be solved
- Ideas that are feasible to build as an indie developer or small team
- Products that could be launched quickly (MVP in 1-2 weeks)
- Ideas that take full advantage of the specific new capability

For each idea, provide:
1. A catchy but descriptive title
2. A 2-3 sentence description of what it does and why it's valuable
3. Complexity (low/medium/high) - how hard it is to build
4. Potential Impact (low/medium/high) - market opportunity
5. Suggested tech stack (brief, e.g., "Next.js, OpenAI API, Vercel")

Respond in JSON format as an array of ideas.`;

// POST /api/ideas/generate - Generate ideas for an update
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ ideas: existingIdeas });
    }

    // Check for API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      // Return mock ideas if no API key
      const mockIdeas = generateMockIdeas(updateData.title, updateData.content);
      const insertedIds = await Promise.all(
        mockIdeas.map(async (idea) => {
          const result = await db.insert(schema.ideas).values({
            updateId: updateId,
            title: idea.title,
            description: idea.description,
            complexity: idea.complexity,
            potentialImpact: idea.potentialImpact,
            techStack: idea.techStack,
            generatedAt: new Date().toISOString(),
          }).returning();
          return result[0];
        })
      );
      return NextResponse.json({ ideas: insertedIds });
    }

    // Generate ideas with OpenAI
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `AI Update from ${updateData.provider}:\n\nTitle: ${updateData.title}\n\nDetails: ${updateData.content}\n\nGenerate 3 product ideas that leverage this capability.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    let generatedIdeas: GeneratedIdea[] = [];

    try {
      const parsed = JSON.parse(responseText);
      generatedIdeas = parsed.ideas || parsed || [];
    } catch (e) {
      console.error("Failed to parse OpenAI response:", e);
      generatedIdeas = generateMockIdeas(updateData.title, updateData.content);
    }

    // Insert ideas into database
    const insertedIdeas = await Promise.all(
      generatedIdeas.slice(0, 3).map(async (idea) => {
        const result = await db.insert(schema.ideas).values({
          updateId: updateId,
          title: idea.title,
          description: idea.description,
          complexity: idea.complexity,
          potentialImpact: idea.potentialImpact,
          techStack: idea.techStack,
          generatedAt: new Date().toISOString(),
        }).returning();
        return result[0];
      })
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

// Generate mock ideas when no API key is available
function generateMockIdeas(title: string, content: string): GeneratedIdea[] {
  const keywords = `${title} ${content}`.toLowerCase();
  
  const ideas: GeneratedIdea[] = [
    {
      title: "AI-Powered Content Analyzer",
      description: `Leverage this new capability to build a tool that automatically analyzes content and provides actionable insights. Perfect for marketers and content creators looking to optimize their work.`,
      complexity: "medium",
      potentialImpact: "high",
      techStack: "Next.js, OpenAI API, Tailwind CSS",
    },
    {
      title: "Smart Automation Assistant",
      description: `Create a no-code automation platform that uses this AI update to help users automate repetitive tasks. Target small businesses and solo entrepreneurs.`,
      complexity: "high",
      potentialImpact: "high",
      techStack: "React, Node.js, PostgreSQL",
    },
    {
      title: "Developer Productivity Tool",
      description: `Build a VS Code extension or CLI tool that integrates this capability to help developers work faster. Focus on code review, documentation, or testing.`,
      complexity: "low",
      potentialImpact: "medium",
      techStack: "TypeScript, VS Code API",
    },
  ];

  // Customize based on keywords
  if (keywords.includes("vision") || keywords.includes("image")) {
    ideas[0] = {
      title: "Visual Content Moderator",
      description: "An automated image moderation service for user-generated content platforms. Uses the new vision capabilities to detect and flag inappropriate content.",
      complexity: "medium",
      potentialImpact: "high",
      techStack: "Next.js, OpenAI Vision API, AWS S3",
    };
  }

  if (keywords.includes("voice") || keywords.includes("audio") || keywords.includes("speech")) {
    ideas[1] = {
      title: "Podcast Transcription & Insights",
      description: "Automatically transcribe podcasts and generate chapter markers, summaries, and shareable quotes. Perfect for podcast creators and listeners.",
      complexity: "medium",
      potentialImpact: "high",
      techStack: "Next.js, Whisper API, Supabase",
    };
  }

  if (keywords.includes("function") || keywords.includes("tool") || keywords.includes("agent")) {
    ideas[2] = {
      title: "AI Agent Marketplace",
      description: "A platform where users can create, share, and monetize custom AI agents for specific tasks. Think Zapier but for AI workflows.",
      complexity: "high",
      potentialImpact: "high",
      techStack: "Next.js, LangChain, PostgreSQL, Stripe",
    };
  }

  return ideas;
}

