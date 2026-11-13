export type ReminderType = 'wake-up' | 'meal' | 'break' | 'work' | 'personal' | 'family';

export interface ScheduleItem {
  id: string;
  type: ReminderType;
  time: string; // HH:mm format
  label: string;
  message: string;
  enabled: boolean;
  icon: string;
}

export interface AppState {
  schedule: ScheduleItem[];
  isStressed: boolean;
  lastBreakTime?: number;
}
