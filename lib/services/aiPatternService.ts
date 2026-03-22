import { OpenAI } from 'openai';
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractionResult {
  diseaseName: string;
  clues: string[];
  distractors: string[];
  clinicalContext: {
    ageRange?: string;
    geography?: string;
    typicalProfessions?: string;
    onsetPattern?: string;
  };
  keySymptoms: string[];
}

/**
 * AI Pattern Service - Extracting USMLE intelligence
 */
export class AIPatternService {
  /**
   * Analyze a question and extract diagnostic patterns
   */
  async analyzeQuestion(questionId: string) {
    try {
      // 1. Fetch question details from Convex
      const question = await fetchQuery(api.questions.getQuestionById, { 
        id: questionId as Id<"questions"> 
      });

      if (!question) {
        throw new Error(`Question with ID ${questionId} not found`);
      }

      const correctAnswer = question.options.find((opt) => opt.isCorrect)?.text || 'Unknown';

      // 2. Call LLM to extract patterns
      const prompt = `
        Analyze the following USMLE medical question and its correct answer.
        Extract diagnostic patterns, pathognomonic clues, and clinical context.

        Question: ${question.text}
        Correct Answer: ${correctAnswer}
        Explanation: ${question.explanation || 'No explanation provided'}

        Return ONLY a JSON object with the following structure:
        {
          "diseaseName": "The specific diagnosis or condition name",
          "clues": ["unique finding 1", "pathognomonic term 2", ...],
          "distractors": ["similar disease 1", "common misdiagnosis 2", ...],
          "clinicalContext": {
            "ageRange": "e.g., elderly, pediatrics, 20-40s",
            "geography": "e.g., Ohio River valley, travel to tropics",
            "typicalProfessions": "e.g., construction worker, healthcare",
            "onsetPattern": "e.g., acute, subacute, insidious"
          },
          "keySymptoms": ["fever", "weight loss", "night sweats", ...]
        }
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('AI returned empty response');

      const result: ExtractionResult = JSON.parse(content);

      // 3. Save to extracted_patterns in Convex
      await fetchMutation(api.patterns.savePattern, {
        questionId: question._id,
        diseaseName: result.diseaseName,
        clues: result.clues,
        distractors: result.distractors,
        clinicalContext: result.clinicalContext,
        keySymptoms: result.keySymptoms,
      });

      // 4. Update Frequencies in Convex
      await this.updateFrequencies(result, question);

      return result;
    } catch (error) {
      console.error('Error in AIPatternService.analyzeQuestion:', error);
      throw error;
    }
  }

  /**
   * Update pattern and subject frequencies in Convex
   */
  private async updateFrequencies(result: ExtractionResult, question: any) {
    const frequencies = [
      { type: 'DISEASE', name: result.diseaseName },
      ...(question.subject ? [{ type: 'SUBJECT', name: question.subject }] : []),
      ...(question.system ? [{ type: 'SYSTEM', name: question.system }] : []),
      ...result.clues.map((clue) => ({ type: 'CLUE', name: clue })),
    ];

    await fetchMutation(api.patterns.updateFrequencies, {
      frequencies: frequencies.filter(f => f.name) as any
    });
  }

  /**
   * Get top patterns for analytics from Convex
   */
  async getTopPatterns(type: string = 'DISEASE', limit: number = 20) {
    return await fetchQuery(api.patterns.getTopPatterns, { type, limit });
  }
}

export const aiPatternService = new AIPatternService();
