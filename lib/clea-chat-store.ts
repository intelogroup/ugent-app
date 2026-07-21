import type { UIMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';

export async function loadChat(id: string): Promise<UIMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('clea_chats').select('messages').eq('id', id).maybeSingle();
  return (data?.messages as UIMessage[] | undefined) ?? [];
}

export async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('clea_chats')
    .upsert(
      { id: chatId, user_id: user.id, messages, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
}

export type ChatSummary = {
  text: string;
  // Count of messages (from the start of the full history) already folded
  // into `text` — lets the caller re-summarize only the newly aged-out
  // messages instead of redoing the whole conversation each time.
  upTo: number;
};

export async function loadSummary(id: string): Promise<ChatSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('clea_chats')
    .select('summary_text, summary_up_to')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return { text: data.summary_text, upTo: data.summary_up_to };
}

export async function saveSummary(id: string, summary: ChatSummary): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('clea_chats')
    .upsert(
      {
        id,
        user_id: user.id,
        summary_text: summary.text,
        summary_up_to: summary.upTo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
}

export async function deleteChat(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('clea_chats').delete().eq('id', id);
}
