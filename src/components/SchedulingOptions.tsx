import React from 'react';
import { format, addDays, nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RecurrenceType } from '@/types/scheduled-task';

export interface ScheduleData {
  isScheduled: boolean;
  recurrenceType: RecurrenceType;
  selectedDate?: Date;
  daysOfWeek?: number[];
}

interface SchedulingOptionsProps {
  scheduleData: ScheduleData;
  onScheduleChange: (data: ScheduleData) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'S', fullLabel: 'Sunday' },
  { value: 1, label: 'M', fullLabel: 'Monday' },
  { value: 2, label: 'T', fullLabel: 'Tuesday' },
  { value: 3, label: 'W', fullLabel: 'Wednesday' },
  { value: 4, label: 'T', fullLabel: 'Thursday' },
  { value: 5, label: 'F', fullLabel: 'Friday' },
  { value: 6, label: 'S', fullLabel: 'Saturday' },
];

/**
 * Enhanced scheduling options component supporting advanced recurrence patterns
 * including weekdays, bi-weekly, monthly, and custom weekly schedules
 */
export function SchedulingOptions({ scheduleData, onScheduleChange }: SchedulingOptionsProps) {
  const handleScheduleToggle = (isScheduled: boolean) => {
    onScheduleChange({
      ...scheduleData,
      isScheduled,
    });
  };

  const handleRecurrenceChange = (recurrenceType: RecurrenceType) => {
    // Reset related fields when changing recurrence type
    const resetData: Partial<ScheduleData> = {
      recurrenceType,
      selectedDate: recurrenceType === 'once' ? scheduleData.selectedDate : undefined,
      daysOfWeek: undefined,
    };

    // Set default days for certain recurrence types
    if (recurrenceType === 'weekdays') {
      resetData.daysOfWeek = [1, 2, 3, 4, 5]; // Monday to Friday
    } else if (recurrenceType === 'weekly') {
      resetData.daysOfWeek = scheduleData.daysOfWeek && scheduleData.daysOfWeek.length === 1 
        ? scheduleData.daysOfWeek 
        : [1]; // Default to Monday
    } else if (recurrenceType === 'custom_weekly') {
      resetData.daysOfWeek = scheduleData.daysOfWeek && scheduleData.daysOfWeek.length > 0 
        ? scheduleData.daysOfWeek 
        : [1, 4]; // Default to Monday and Thursday
    }

    onScheduleChange({
      ...scheduleData,
      ...resetData,
    });
  };

  const handleDateSelect = (selectedDate?: Date) => {
    onScheduleChange({
      ...scheduleData,
      selectedDate,
    });
  };

  const handleDayOfWeekToggle = (dayValue: number) => {
    const currentDays = scheduleData.daysOfWeek || [];
    const newDays = currentDays.includes(dayValue)
      ? currentDays.filter(day => day !== dayValue)
      : [...currentDays, dayValue].sort((a, b) => a - b);

    onScheduleChange({
      ...scheduleData,
      daysOfWeek: newDays.length > 0 ? newDays : undefined,
    });
  };

  const getRecurrenceDescription = (): string => {
    switch (scheduleData.recurrenceType) {
      case 'once':
        return 'One-time task';
      case 'daily':
        return 'Every day';
      case 'weekdays':
        return 'Every weekday (Monday-Friday)';
      case 'weekly':
        return scheduleData.daysOfWeek && scheduleData.daysOfWeek.length === 1
          ? `Every ${DAYS_OF_WEEK.find(d => d.value === scheduleData.daysOfWeek![0])?.fullLabel}`
          : 'Every week';
      case 'bi-weekly':
        return 'Every 2 weeks';
      case 'monthly':
        return 'Every month';
      case 'custom_weekly':
        if (scheduleData.daysOfWeek && scheduleData.daysOfWeek.length > 0) {
          const dayNames = scheduleData.daysOfWeek
            .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.fullLabel)
            .filter(Boolean);
          return `Every ${dayNames.join(' and ')}`;
        }
        return 'Custom weekly schedule';
      default:
        return 'Select recurrence';
    }
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
      <div className="flex items-center space-x-2">
        <Switch
          id="schedule-toggle"
          checked={scheduleData.isScheduled}
          onCheckedChange={handleScheduleToggle}
        />
        <Label htmlFor="schedule-toggle">Schedule this task for later?</Label>
      </div>

      {scheduleData.isScheduled && (
        <div className="space-y-4 ml-6">
          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrence</Label>
            <Select value={scheduleData.recurrenceType} onValueChange={handleRecurrenceChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly (every 2 weeks)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom_weekly">Custom Weekly...</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Show description of selected recurrence */}
            <p className="text-sm text-muted-foreground">
              {getRecurrenceDescription()}
            </p>
          </div>

          {/* Date picker for one-time tasks */}
          {scheduleData.recurrenceType === 'once' && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduleData.selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleData.selectedDate ? format(scheduleData.selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleData.selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Day selector for weekly and custom weekly */}
          {(scheduleData.recurrenceType === 'weekly' || scheduleData.recurrenceType === 'custom_weekly') && (
            <div className="space-y-2">
              <Label>
                {scheduleData.recurrenceType === 'weekly' ? 'Day of Week' : 'Days of Week'}
              </Label>
              
              {scheduleData.recurrenceType === 'weekly' ? (
                // Single day selector for weekly
                <Select 
                  value={scheduleData.daysOfWeek?.[0]?.toString()} 
                  onValueChange={(value) => {
                    // For weekly, set exactly one day (don't toggle)
                    onScheduleChange({
                      ...scheduleData,
                      daysOfWeek: [parseInt(value)],
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.fullLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                // Multiple day selector for custom weekly
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      variant={scheduleData.daysOfWeek?.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDayOfWeekToggle(day.value)}
                      className="w-10 h-10 p-0"
                      title={day.fullLabel}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              )}
              
              {scheduleData.recurrenceType === 'custom_weekly' && scheduleData.daysOfWeek && scheduleData.daysOfWeek.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Selected: {scheduleData.daysOfWeek
                    .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.fullLabel)
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Start date for recurring tasks */}
          {scheduleData.recurrenceType !== 'once' && (
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduleData.selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleData.selectedDate ? format(scheduleData.selectedDate, "PPP") : <span>Pick start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleData.selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}
    </div>
  );
}