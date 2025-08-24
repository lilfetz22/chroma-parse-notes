export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  created_at: string;
}