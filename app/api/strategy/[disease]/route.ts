import { NextResponse } from "next/server";
import { readDataFile } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ disease: string }> }
) {
  const params = await props.params;
  try {
    const diseaseName = decodeURIComponent(params.disease);
    const lines = (await readDataFile("medicospira-enriched.jsonl")).trim().split("\n");
    
    const mechanismsSet = new Set<string>();
    const cluesSet = new Set<string>();
    const symptomsSet = new Set<string>();
    const prerequisitesSet = new Set<string>();
    const discriminatorsMap = new Map<string, string>(); // distractor -> ruleOutFact
    const clinicalContexts: any[] = [];
    const questionsData: any[] = [];
    let topicType = "DISEASE";
    let matchedCount = 0;

    for (const line of lines) {
      if (!line) continue;
      try {
        const raw = JSON.parse(line);
        const e = raw.enriched;
        if (!e || !e.diseaseName) continue;

        if (e.diseaseName.toLowerCase() === diseaseName.toLowerCase()) {
          matchedCount++;
          if (e.topicType) topicType = e.topicType;
          
          if (e.mechanism && e.mechanism !== "Pending further analysis") {
            mechanismsSet.add(e.mechanism);
          }
          if (e.highLeverageClues) {
            e.highLeverageClues.forEach((c: string) => cluesSet.add(c));
          }
          if (e.keySymptoms) {
            e.keySymptoms.forEach((s: string) => symptomsSet.add(s));
          }
          if (e.prerequisites) {
            e.prerequisites.forEach((p: string) => prerequisitesSet.add(p));
          }
          if (e.discriminators) {
            e.discriminators.forEach((d: { distractor: string; ruleOutFact: string }) => {
              if (d.distractor && !discriminatorsMap.has(d.distractor.toLowerCase())) {
                discriminatorsMap.set(d.distractor.toLowerCase(), d.ruleOutFact || "");
              }
            });
          }
          if (e.clinicalContext) {
            clinicalContexts.push(e.clinicalContext);
          }

          // Build matching question representation
          questionsData.push({
            pattern: {
              ...e,
              _id: `pattern-${matchedCount}`,
            },
            question: {
              text: e.questionText || raw.text || "",
              correctAnswer: e.correctAnswer || raw.correctAnswer || "",
              explanation: e.explanation || raw.explanation || "",
              difficulty: raw.difficulty || "MEDIUM",
              successRate: null,
            },
          });
        }
      } catch (err) {
        // skip malformed
      }
    }

    if (matchedCount === 0) {
      return NextResponse.json({ error: "Disease not found" }, { status: 404 });
    }

    const discriminators = Array.from(discriminatorsMap.entries()).map(([distractor, ruleOutFact]) => ({
      distractor: distractor.replace(/\b\w/g, c => c.toUpperCase()),
      ruleOutFact,
    }));

    const profile = {
      diseaseName,
      topicType,
      questionCount: matchedCount,
      mechanisms: Array.from(mechanismsSet),
      clues: Array.from(cluesSet),
      keySymptoms: Array.from(symptomsSet),
      discriminators,
      prerequisites: Array.from(prerequisitesSet),
      clinicalContexts,
    };

    return NextResponse.json({
      profile,
      questions: questionsData,
    });
  } catch (error) {
    console.error("Failed to fetch disease profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
