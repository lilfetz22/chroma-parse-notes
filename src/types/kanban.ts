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

export interface Card {
  id: string;
  column_id: string;
  position: number;
  card_type: CardType;
  title: string;
  content?: any; // JSONB content for simple cards
  note_id?: string; // For linked cards
  created_at: string;
}

export interface BoardData {
  board: Board;
  columns: Column[];
  cards: Card[];
}