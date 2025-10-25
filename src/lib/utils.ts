import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Gets the user's timezone as an IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
 * Falls back to 'UTC' if timezone detection fails
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect user timezone, falling back to UTC:', error);
    return 'UTC';
  }
}

/**
 * Extracts time in HH:MM format from a scheduled_timestamp
 * @param scheduledTimestamp - ISO timestamp string or null
 * @returns Time in HH:MM format or '00:00' as default
 */
export function extractTimeFromTimestamp(scheduledTimestamp: string | null): string {
  if (!scheduledTimestamp) return '00:00';
  
  try {
    const date = new Date(scheduledTimestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: getUserTimezone()
    });
  } catch (error) {
    console.warn('Failed to extract time from timestamp:', error);
    return '00:00';
  }
}

/**
 * Creates a scheduled_timestamp from date and time inputs
 * @param date - Date object or ISO date string
 * @param time - Time in HH:MM format
 * @returns ISO timestamp string in user's timezone
 */
export function createScheduledTimestamp(date: Date | string, time: string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const [hours, minutes] = time.split(':').map(Number);
    
    // Create a new date with the specified time
    const combinedDate = new Date(dateObj);
    combinedDate.setHours(hours, minutes, 0, 0);
    
    return combinedDate.toISOString();
  } catch (error) {
    console.warn('Failed to create scheduled timestamp:', error);
    // Fallback: create timestamp with current date and provided time
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    now.setHours(hours, minutes, 0, 0);
    return now.toISOString();
  }
}
