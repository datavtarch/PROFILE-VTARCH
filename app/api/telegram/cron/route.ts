import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Profile, Task } from "@/types/task";
import { formatTaskList, sendTelegramMessage } from "../webhook/route";

type TelegramAccount = {
  user_id: string;
  telegram_chat_id: string;
};

const ACTIVE_STATUSES = ["todo", "doing", "waiting"];

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!botToken) {
    return NextResponse.json({ error: "Missing Telegram bot token" }, { status: 500 });
  }

  const supabase = getSupabaseAdminClient();
  const [{ data: accounts, error: accountError }, { data: profiles, error: profileError }] =
    await Promise.all([
      supabase.from("telegram_accounts").select("user_id,telegram_chat_id"),
      supabase
        .from("profiles")
        .select(
          "id,display_name,timezone,telegram_reports_enabled,telegram_reminders_enabled,morning_report_time,evening_report_time,created_at"
        )
    ]);

  if (accountError || profileError) {
    return NextResponse.json(
      { error: accountError?.message ?? profileError?.message },
      { status: 500 }
    );
  }

  const profileByUser = new Map((profiles ?? []).map((profile) => [profile.id, profile as Profile]));
  const results = {
    accounts: accounts?.length ?? 0,
    reminders: 0,
    reports: 0,
    errors: [] as string[]
  };

  for (const account of (accounts ?? []) as TelegramAccount[]) {
    const profile = profileByUser.get(account.user_id);
    if (!profile) continue;

    try {
      if (profile.telegram_reminders_enabled) {
        results.reminders += await sendDueReminders(botToken, account);
      }

      if (profile.telegram_reports_enabled && shouldSendReportNow(profile)) {
        await sendDailyReport(botToken, account);
        results.reports += 1;
      }
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : "Unknown cron error");
    }
  }

  return NextResponse.json({ ok: results.errors.length === 0, ...results });
}

async function sendDueReminders(botToken: string, account: TelegramAccount) {
  const supabase = getSupabaseAdminClient();
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", account.user_id)
    .in("status", ACTIVE_STATUSES)
    .is("reminded_at", null)
    .not("due_at", "is", null)
    .lte("due_at", soon.toISOString())
    .order("due_at", { ascending: true })
    .limit(10);

  if (error) {
    throw new Error(`Khong doc duoc viec can nhac: ${error.message}`);
  }

  const tasks = (data ?? []) as Task[];
  for (const task of tasks) {
    await sendTelegramMessage(
      botToken,
      account.telegram_chat_id,
      [`Sap den han: ${task.title}`, `Ma viec: ${task.id.slice(0, 8)}`, task.due_at ? formatDate(task.due_at) : ""]
        .filter(Boolean)
        .join("\n")
    );

    await supabase
      .from("tasks")
      .update({ reminded_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", task.id)
      .eq("user_id", account.user_id);
  }

  return tasks.length;
}

async function sendDailyReport(botToken: string, account: TelegramAccount) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", account.user_id)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Khong doc duoc bao cao: ${error.message}`);
  }

  const tasks = ((data ?? []) as Task[]).filter((task) => !task.due_at || isToday(task.due_at));
  await sendTelegramMessage(botToken, account.telegram_chat_id, formatTaskList("Bao cao hom nay", tasks));
}

function shouldSendReportNow(profile: Profile) {
  const now = new Date();
  const local = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: profile.timezone || "Asia/Bangkok"
  }).format(now);

  const allowed = new Set([profile.morning_report_time.slice(0, 5), profile.evening_report_time.slice(0, 5)]);
  return allowed.has(local);
}

function isToday(date: string | null) {
  if (!date) return false;
  const target = new Date(date);
  const now = new Date();
  return target.toDateString() === now.toDateString();
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(date));
}
