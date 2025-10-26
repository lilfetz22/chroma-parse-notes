import { useState } from 'react';
import { subMonths, format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import { FileDown, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';

interface AccomplishmentsExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportResult {
  project_name: string;
  task_title: string;
  task_summary: string;
  tags: string;
  completion_count: number;
  completion_dates: string;
}

/**
 * Converts JSON data to CSV format and triggers browser download
 */
function downloadCSV(data: ExportResult[], filename: string) {
  if (!data || data.length === 0) {
    toast.error('No data to export');
    return;
  }

  // CSV Headers
  const headers = [
    'Project',
    'Task Title',
    'Summary',
    'Tags',
    'Completion Count',
    'Completion Dates',
  ];

  // Convert data to CSV rows
  const csvRows = [
    headers.join(','),
    ...data.map(row => [
      `"${row.project_name.replace(/"/g, '""')}"`,
      `"${row.task_title.replace(/"/g, '""')}"`,
      `"${row.task_summary.replace(/"/g, '""')}"`,
      `"${row.tags.replace(/"/g, '""')}"`,
      row.completion_count,
      `"${row.completion_dates.replace(/"/g, '""')}"`,
    ].join(',')),
  ];

  const csvContent = csvRows.join('\n');

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function AccomplishmentsExportModal({ 
  open, 
  onOpenChange 
}: AccomplishmentsExportModalProps) {
  // Default to last 6 months
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange?.from || !dateRange?.to) {
        throw new Error('Please select a date range');
      }

      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');

      const { data, error } = await supabase.rpc('export_accomplishments', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) {
        console.error('[AccomplishmentsExport] RPC Error:', error);
        throw new Error(`Export failed: ${error.message}`);
      }

      return data as ExportResult[];
    },
    onSuccess: (data) => {
      if (!data || data.length === 0) {
        toast.info('No completed tasks found in the selected date range');
        return;
      }

      const filename = `accomplishments_${format(dateRange?.from || new Date(), 'yyyy-MM-dd')}_to_${format(dateRange?.to || new Date(), 'yyyy-MM-dd')}.csv`;
      downloadCSV(data, filename);
      
      toast.success(`Exported ${data.length} task${data.length === 1 ? '' : 's'} successfully`);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error('[AccomplishmentsExport] Error:', error);
      toast.error(error.message || 'Failed to export accomplishments');
    },
  });

  const handleExport = () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select a date range');
      return;
    }
    exportMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Accomplishments
          </DialogTitle>
          <DialogDescription>
            Export a summary of your completed tasks to analyze for performance reviews.
            Recurring tasks are grouped together with all completion dates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} -{' '}
                        {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Default: Last 6 months. Adjust to match your review period.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={exportMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending || !dateRange?.from || !dateRange?.to}
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export to CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
