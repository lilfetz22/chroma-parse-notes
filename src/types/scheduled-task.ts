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
  created_at: string;
}

export interface CreateScheduledTaskData {
  title: string;
  summary?: string;
  target_column_id: string;
  recurrence_type: RecurrenceType;
  days_of_week?: number[];
  next_occurrence_date: string;
}