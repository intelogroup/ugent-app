import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("enriched_questions")
      .select("id, disease_name, topic_type, mechanism, key_symptoms, clinical_context, question_text")
      .not("disease_name", "is", null)
      .not("mechanism", "is", null)
      .neq("mechanism", "Pending further analysis")
      .limit(200);

    if (error) throw error;

    const feed = (data ?? [])
      .filter((row) => Array.isArray(row.key_symptoms) && row.key_symptoms.length > 0)
      .slice(0, 50)
      .map((row) => ({
        _id: row.id,
        diseaseName: row.disease_name,
        topicType: row.topic_type || "DISEASE",
        mechanism: row.mechanism,
        keySymptoms: row.key_symptoms,
        clinicalContext: row.clinical_context || "",
        questionText: row.question_text || "",
      }));

    return NextResponse.json({ feed });
  } catch (error) {
    console.error("Failed to fetch clue training feed:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
