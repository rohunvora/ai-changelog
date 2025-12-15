import { NextRequest, NextResponse } from "next/server";
import { seedLeaderboard } from "@/lib/seed-leaderboard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Only allow in development or with secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  
  if (process.env.NODE_ENV === "production" && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    await seedLeaderboard();
    return NextResponse.json({ success: true, message: "Leaderboard seeded successfully" });
  } catch (error) {
    console.error("Error seeding leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to seed leaderboard", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
