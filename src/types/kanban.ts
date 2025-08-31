export type CardType = 'simple' | 'linked';

export interface Board {
  id: string;
  title: string;
  created_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Card {
  id: string;
  column_id: string;
  position: number;
  card_type: CardType;
  title: string;
  content?: any; // JSONB content for simple cards
  note_id?: string; // For linked cards
  summary?: string | null; // optional summary for linked cards
  priority: number; // 0=default, 1=low, 2=medium, 3=high
  tags: Tag[]; // Array of tags associated with this card
  scheduled_at?: string | null; // ISO timestamp when card should appear in To-Do
  recurrence?: string | null; // recurrence rule: 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly'
  activated_at?: string | null; // when the card actually appeared on the board
  completed_at?: string | null; // when the card was moved to Done
  created_at: string;
}

export interface BoardData {
  board: Board;
  columns: Column[];
  cards: Card[];
}