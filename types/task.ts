export type TaskStatus = "todo" | "doing" | "waiting" | "done" | "cancelled";
export type TaskPriority = "low" | "normal" | "high";

export type Task = {
  id: string;
  user_id?: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  completed_at: string | null;
  reminded_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInput = {
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  telegram_reports_enabled: boolean;
  telegram_reminders_enabled: boolean;
  morning_report_time: string;
  evening_report_time: string;
  created_at: string;
};
