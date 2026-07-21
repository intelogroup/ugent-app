import { NextResponse } from 'next/server';
import { analyzeQuestions } from '@/lib/curriculum/analyzer';
import { generateCurriculum } from '@/lib/curriculum/generator';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const analysis = await analyzeQuestions();
    const curriculum = generateCurriculum(analysis.graph, analysis.frequencyStats, analysis.systemDiseaseMap);

    return NextResponse.json({
      curriculum,
      graph: {
        nodeCount: analysis.graph.nodes.length,
        edgeCount: analysis.graph.edges.length,
        topoOrderLength: analysis.graph.topologicalOrder.length,
      },
      frequencies: analysis.frequencyStats,
    });
  } catch (error) {
    console.error('Curriculum generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate curriculum', details: String(error) },
      { status: 500 },
    );
  }
}
