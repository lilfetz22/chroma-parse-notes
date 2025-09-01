import { RecurrenceType } from '@/types/scheduled-task';
import { format } from 'date-fns';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Formats a recurrence rule into a human-readable string
 */
export function formatRecurrenceRule(
  recurrenceType: RecurrenceType,
  daysOfWeek?: number[] | null,
  nextOccurrenceDate?: string
): string {
  switch (recurrenceType) {
    case 'once':
      return nextOccurrenceDate 
        ? `Once on ${format(new Date(nextOccurrenceDate), 'MMM d, yyyy')}`
        : 'One-time task';
    
    case 'daily':
      return 'Every day';
    
    case 'weekdays':
      return 'Every weekday (Mon-Fri)';
    
    case 'weekly':
      if (daysOfWeek && daysOfWeek.length === 1) {
        const dayName = DAYS_OF_WEEK[daysOfWeek[0]];
        return `Weekly on ${dayName}s`;
      }
      return 'Weekly';
    
    case 'bi-weekly':
      return 'Bi-weekly (every 2 weeks)';
    
    case 'monthly':
      return 'Monthly';
    
    case 'custom_weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = daysOfWeek
          .map(day => DAYS_OF_WEEK[day])
          .filter(Boolean);
        
        if (dayNames.length === 1) {
          return `Weekly on ${dayNames[0]}s`;
        } else if (dayNames.length === 2) {
          return `Weekly on ${dayNames.join(' and ')}`;
        } else {
          return `Weekly on ${dayNames.slice(0, -1).join(', ')}, and ${dayNames[dayNames.length - 1]}`;
        }
      }
      return 'Custom weekly schedule';
    
    default:
      return 'Unknown schedule';
  }
}
