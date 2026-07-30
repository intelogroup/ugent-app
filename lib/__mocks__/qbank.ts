export async function loadQuestions(): Promise<any[]> {
  return [];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr];
}

export async function queryQuestions(opts: {
  subject?: string;
  system?: string;
  difficulty?: string;
  query?: string;
  limit?: number;
}) {
  return { questions: [], matched: 0 };
}
