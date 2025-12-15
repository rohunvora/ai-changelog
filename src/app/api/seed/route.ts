import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";

// POST /api/seed - Seed the database with sample data
export async function POST() {
  try {
    await seedDatabase();
    return NextResponse.json({ success: true, message: "Database seeded" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}

