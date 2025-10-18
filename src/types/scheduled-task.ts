export type RecurrenceType = 'once' | 'daily' | 'weekdays' | 'weekly' | 'bi-weekly' | 'monthly' | 'custom_weekly';

export interface ScheduledTask {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  summary?: string | null;
  target_column_id: string;
  recurrence_type: RecurrenceType;
  days_of_week?: number[] | null; // Array of day numbers (0=Sunday to 6=Saturday)
  next_occurrence_date: string; // ISO date string
  scheduled_time: string; // Time string in HH:MM:SS format
  priority: number; // 0=default, 1=low, 2=medium, 3=high
  tag_ids?: string[] | null; // Array of tag IDs to apply to generated cards
  created_at: string;
}

export interface CreateScheduledTaskData {
  title: string;
  summary?: string;
  target_column_id: string;
  recurrence_type: RecurrenceType;
  days_of_week?: number[];
  next_occurrence_date: string;
  scheduled_time?: string; // Time string in HH:MM:SS format, defaults to 18:00:00 for new tasks
  priority?: number;
  tag_ids?: string[];
}