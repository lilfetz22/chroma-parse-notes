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
  dayOfWeek?: number;
}

interface SchedulingOptionsProps {
  scheduleData: ScheduleData;
  onScheduleChange: (data: ScheduleData) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function SchedulingOptions({ scheduleData, onScheduleChange }: SchedulingOptionsProps) {
  const handleScheduleToggle = (isScheduled: boolean) => {
    onScheduleChange({
      ...scheduleData,
      isScheduled,
    });
  };

  const handleRecurrenceChange = (recurrenceType: RecurrenceType) => {
    onScheduleChange({
      ...scheduleData,
      recurrenceType,
      selectedDate: recurrenceType === 'once' ? scheduleData.selectedDate : undefined,
      dayOfWeek: recurrenceType === 'weekly' ? scheduleData.dayOfWeek : undefined,
    });
  };

  const handleDateSelect = (selectedDate?: Date) => {
    onScheduleChange({
      ...scheduleData,
      selectedDate,
    });
  };

  const handleDayOfWeekChange = (dayOfWeek: number) => {
    onScheduleChange({
      ...scheduleData,
      dayOfWeek,
    });
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
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          {scheduleData.recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <Select value={scheduleData.dayOfWeek?.toString()} onValueChange={(value) => handleDayOfWeekChange(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}