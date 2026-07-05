import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const enrichedPath = path.resolve(process.cwd(), "data/medicospira-enriched.jsonl");

    if (!fs.existsSync(enrichedPath)) {
      return NextResponse.json({ feed: [] });
    }

    const lines = fs.readFileSync(enrichedPath, "utf-8").trim().split("\n");
    const feed: any[] = [];

    for (const line of lines) {
      if (!line) continue;
      try {
        const raw = JSON.parse(line);
        const e = raw.enriched;
        if (!e || !e.diseaseName) continue;

        // Skip cards with no key symptoms or pending mechanism
        if (!e.keySymptoms || e.keySymptoms.length === 0) continue;
        if (!e.mechanism || e.mechanism === "Pending further analysis") continue;

        feed.push({
          _id: raw.textHash || `clue-${feed.length}`,
          diseaseName: e.diseaseName,
          topicType: e.topicType || "DISEASE",
          mechanism: e.mechanism,
          keySymptoms: e.keySymptoms,
          clinicalContext: e.clinicalContext || "",
          questionText: e.questionText || raw.text || "",
        });
      } catch (err) {
        // Skip malformed
      }
    }

    // Limit to 50 items for the training session
    return NextResponse.json({ feed: feed.slice(0, 50) });
  } catch (error) {
    console.error("Failed to fetch clue training feed:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
