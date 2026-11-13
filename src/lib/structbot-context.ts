export type Citation = { message_id: string; quote: string };
export type Participant = {
  login: string;
  role: string;
  scope: string;
  state: string;
  certainty: string;
  evidence: Citation[];
};
export type Discussion = { topic: string; summary: string; state: string; evidence: Citation[] };
export type Correction = { description: string; state: string; evidence: Citation[] };
export type Interpretation = {
  item_key: string;
  summary: string;
  state: string;
  certainty: string;
  participants: Participant[];
  discussions: Discussion[];
  corrections: Correction[];
  open_questions: Discussion[];
  evidence: Citation[];
  limitations: string[];
};
export type ConversationAnalysis = {
  id: string;
  content: Interpretation;
  origin: string;
  model: string | null;
  created_at: string;
  stale: boolean;
  reason: string | null;
  author: string | null;
  sources: Record<
    string,
    { id: string; url: string; author: string | null; kind: string; created_at: string | null }
  >;
};
export type Conversation = {
  item_key: string;
  repository: string;
  number: number;
  title: string;
  url: string;
  kind: string;
  item_state: string;
  assignees: string[];
  analysis_state: string;
  collection: { status: string; message_count: number; collected_at: string | null };
  analysis: ConversationAnalysis | null;
};
export type NewsStory = {
  headline: string;
  body: string;
  category: string;
  item_keys: string[];
  evidence_ids: string[];
  conversation_keys: string[];
  release_urls: string[];
  contributors: string[];
};
export type Newspaper = {
  headline: string;
  lead: string;
  stories: NewsStory[];
  call_to_action: string;
};
type Obj = Record<string, unknown>;
const obj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: Obj, ...keys: string[]) => keys.every((k) => typeof v[k] === 'string');
const nullable = (v: unknown) => v === null || typeof v === 'string';
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const list = <T>(v: unknown, check: (v: unknown) => v is T): v is T[] =>
  Array.isArray(v) && v.every(check);
const isCitation = (v: unknown): v is Citation => obj(v) && text(v, 'message_id', 'quote');
const citations = (v: unknown): v is Citation[] => list(v, isCitation);
const isParticipant = (v: unknown): v is Participant =>
  obj(v) && text(v, 'login', 'role', 'scope', 'state', 'certainty') && citations(v.evidence);
const isDiscussion = (v: unknown): v is Discussion =>
  obj(v) && text(v, 'topic', 'summary', 'state') && citations(v.evidence);
const isCorrection = (v: unknown): v is Correction =>
  obj(v) && text(v, 'description', 'state') && citations(v.evidence);
export const isInterpretation = (v: unknown): v is Interpretation =>
  obj(v) &&
  text(v, 'item_key', 'summary', 'state', 'certainty') &&
  list(v.participants, isParticipant) &&
  list(v.discussions, isDiscussion) &&
  list(v.corrections, isCorrection) &&
  list(v.open_questions, isDiscussion) &&
  citations(v.evidence) &&
  strings(v.limitations);
const isAnalysis = (v: unknown): v is ConversationAnalysis => {
  if (
    !obj(v) ||
    !text(v, 'id', 'origin', 'created_at') ||
    !nullable(v.model) ||
    !nullable(v.reason) ||
    !nullable(v.author) ||
    typeof v.stale !== 'boolean' ||
    !isInterpretation(v.content) ||
    !obj(v.sources)
  )
    return false;
  if (
    !Object.values(v.sources).every(
      (s) => obj(s) && text(s, 'id', 'url', 'kind') && nullable(s.author) && nullable(s.created_at),
    )
  )
    return false;
  const refs = [
    ...v.content.evidence,
    ...v.content.participants.flatMap((p) => p.evidence),
    ...v.content.discussions.flatMap((d) => d.evidence),
    ...v.content.corrections.flatMap((c) => c.evidence),
    ...v.content.open_questions.flatMap((d) => d.evidence),
  ];
  return refs.every((r) => Object.hasOwn(v.sources as Obj, r.message_id));
};
export const isConversation = (v: unknown): v is Conversation =>
  obj(v) &&
  text(v, 'item_key', 'repository', 'title', 'url', 'kind', 'item_state', 'analysis_state') &&
  Number.isSafeInteger(v.number) &&
  strings(v.assignees) &&
  obj(v.collection) &&
  text(v.collection, 'status') &&
  Number.isSafeInteger(v.collection.message_count) &&
  nullable(v.collection.collected_at) &&
  (v.analysis === null || isAnalysis(v.analysis));
const isStory = (v: unknown): v is NewsStory =>
  obj(v) &&
  text(v, 'headline', 'body', 'category') &&
  strings(v.item_keys) &&
  strings(v.evidence_ids) &&
  strings(v.conversation_keys) &&
  strings(v.release_urls) &&
  strings(v.contributors);
export const isNewspaper = (v: unknown): v is Newspaper =>
  obj(v) && text(v, 'headline', 'lead', 'call_to_action') && list(v.stories, isStory);
export const roleLabels: Record<string, string> = {
  implementation: 'Implementação',
  review: 'Revisão',
  tests: 'Testes',
  documentation: 'Documentação',
  discussion: 'Discussão',
  coordination: 'Coordenação',
};
export const interpretationLabels: Record<string, string> = {
  unclaimed: 'Responsável não definido',
  claimed: 'Assumida',
  in_progress: 'Em andamento',
  discussion: 'Em discussão',
  changes_requested: 'Ajustes solicitados',
  in_review: 'Em revisão',
  reported_done: 'Entrega declarada',
  integrated: 'Integrada',
  closed: 'Encerrada',
  unclear: 'Situação indefinida',
  offered: 'Ajuda oferecida',
  awaiting_review: 'Aguardando revisão',
  released: 'Responsabilidade liberada',
  requested: 'Solicitada',
  acknowledged: 'Ajuste combinado',
  open: 'Em aberto',
  decided: 'Decisão registrada',
  superseded: 'Decisão substituída',
};
export const certaintyLabels: Record<string, string> = {
  declared: 'Declarado',
  inferred: 'Interpretação provável',
  uncertain: 'A esclarecer',
};
export const collectionLabels: Record<string, string> = {
  pending: 'Aguardando interpretação',
  disabled: 'Interpretação por IA desabilitada',
  collection_incomplete: 'Conversa ainda sem coleta completa',
  context_too_large: 'Conversa excede o limite de análise',
  ready: 'Conversa interpretada',
  outdated: 'Fontes alteradas ou incompletas',
  overridden: 'Síntese corrigida pelo mantenedor',
};
