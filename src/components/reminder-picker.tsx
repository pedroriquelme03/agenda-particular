"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ReminderPickerProps {
  isReminder: boolean;
  reminderDate: string;
  onReminderChange: (isReminder: boolean) => void;
  onDateChange: (date: string) => void;
}

export function ReminderPicker({
  isReminder,
  reminderDate,
  onReminderChange,
  onDateChange,
}: ReminderPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is-reminder"
          checked={isReminder}
          onChange={(e) => onReminderChange(e.target.checked)}
          className="rounded border-input"
        />
        <Label htmlFor="is-reminder">Lembrete</Label>
      </div>
      {isReminder && (
        <Input
          type="datetime-local"
          value={reminderDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
      )}
    </div>
  );
}
