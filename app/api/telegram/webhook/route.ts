import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";

type TelegramMessage = {
  chat: {
    id: number | string;
  };
  from?: {
    username?: string;
  };
  text?: string;
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

const ACTIVE_STATUSES: TaskStatus[] = ["todo", "doing", "waiting"];
const DEFAULT_PRIORITY: TaskPriority = "normal";

export async function POST(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!botToken) {
    return NextResponse.json({ error: "Missing Telegram bot token" }, { status: 500 });
  }

  if (expectedSecret) {
    const actualSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (actualSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;

  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);

  try {
    const reply = await handleCommand({
      chatId,
      username: message.from?.username ?? null,
      text: message.text.trim()
    });
    await sendTelegramMessage(botToken, chatId, reply);
  } catch (error) {
    const fallback = error instanceof Error ? error.message : "Co loi khi xu ly lenh.";
    await sendTelegramMessage(botToken, chatId, fallback);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}

async function handleCommand({
  chatId,
  username,
  text
}: {
  chatId: string;
  username: string | null;
  text: string;
}) {
  const supabase = getSupabaseAdminClient();
  const [command, ...args] = text.split(/\s+/);
  const normalizedCommand = command.toLowerCase();

  if (normalizedCommand === "/start" || normalizedCommand === "/help") {
    return [
      "Task Tele da san sang.",
      "Lenh dung duoc:",
      "/link MA_LIEN_KET - lien ket tai khoan",
      "/add Ten viec | ghi chu - them viec nhanh",
      "/today - viec hom nay",
      "/week - viec trong 7 ngay",
      "/high - viec uu tien cao",
      "/done MA_VIEC - danh dau xong",
      "/report - bao cao nhanh"
    ].join("\n");
  }

  if (normalizedCommand === "/link") {
    return linkTelegramAccount(chatId, username, args[0]);
  }

  const userId = await getLinkedUserId(chatId);
  if (!userId) {
    return "Telegram chua lien ket. Vao app web tao ma roi gui /link MA_LIEN_KET.";
  }

  if (normalizedCommand === "/add") {
    const raw = args.join(" ").trim();
    if (!raw) {
      return "Them viec theo dang: /add Ten viec | ghi chu tuy chon";
    }
    return createTaskFromTelegram(userId, raw);
  }

  if (normalizedCommand === "/today") {
    const tasks = await getActiveTasks(userId);
    const todayTasks = tasks.filter((task) => !task.due_at || isToday(task.due_at));
    return formatTaskList("Viec hom nay", todayTasks);
  }

  if (normalizedCommand === "/week") {
    const tasks = await getActiveTasks(userId);
    return formatTaskList(
      "Viec trong 7 ngay",
      tasks.filter((task) => task.due_at && isWithinDays(task.due_at, 7))
    );
  }

  if (normalizedCommand === "/high") {
    const tasks = await getActiveTasks(userId);
    return formatTaskList(
      "Viec uu tien cao",
      tasks.filter((task) => task.priority === "high")
    );
  }

  if (normalizedCommand === "/report") {
    return buildReport(userId);
  }

  if (normalizedCommand === "/done") {
    return markTaskDone(userId, args[0]);
  }

  return "Lenh ho tro: /help, /add, /today, /week, /high, /done MA_VIEC, /report";
}

async function linkTelegramAccount(chatId: string, username: string | null, token?: string) {
  if (!token) {
    return "Gui ma lien ket theo dang: /link MA_LIEN_KET";
  }

  const supabase = getSupabaseAdminClient();
  const { data: link, error: linkError } = await supabase
    .from("telegram_link_tokens")
    .select("id,user_id,expires_at,used_at")
    .eq("token", token.toUpperCase())
    .is("used_at", null)
    .single();

  if (linkError || !link) {
    return "Ma lien ket khong dung hoac da duoc dung.";
  }

  if (new Date(link.expires_at).getTime() < Date.now()) {
    return "Ma lien ket da het han. Tao ma moi trong app web.";
  }

  const { error: upsertError } = await supabase.from("telegram_accounts").upsert(
    {
      user_id: link.user_id,
      telegram_chat_id: chatId,
      telegram_username: username,
      linked_at: new Date().toISOString()
    },
    { onConflict: "telegram_chat_id" }
  );

  if (upsertError) {
    throw new Error(`Khong lien ket duoc Telegram: ${upsertError.message}`);
  }

  await supabase
    .from("telegram_link_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", link.id);

  return "Da lien ket Telegram voi tai khoan Task Tele.";
}

async function createTaskFromTelegram(userId: string, raw: string) {
  const [titlePart, notesPart] = raw.split("|").map((part) => part.trim());
  const title = titlePart.slice(0, 160);
  const notes = notesPart || null;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title,
      notes,
      status: "todo",
      priority: DEFAULT_PRIORITY,
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Khong them duoc viec: ${error.message}`);
  }

  const task = data as Task;
  return [`Da them viec: ${task.title}`, `Ma viec: ${task.id.slice(0, 8)}`].join("\n");
}

async function markTaskDone(userId: string, shortId?: string) {
  if (!shortId) {
    return "Danh dau xong theo dang: /done MA_VIEC";
  }

  const tasks = await getActiveTasks(userId);
  const task = tasks.find((item) => item.id.startsWith(shortId));
  if (!task) {
    return "Khong tim thay viec voi ma do. Dung /today de xem ma viec.";
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", task.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Khong cap nhat duoc viec: ${error.message}`);
  }

  return `Da danh dau xong: ${task.title}`;
}

async function getLinkedUserId(chatId: string) {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("telegram_accounts")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .single();

  return data?.user_id as string | undefined;
}

async function getUserTasks(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Khong doc duoc danh sach viec: ${error.message}`);
  }

  return (data ?? []) as Task[];
}

async function getActiveTasks(userId: string) {
  const tasks = await getUserTasks(userId);
  return tasks.filter((task) => ACTIVE_STATUSES.includes(task.status));
}

async function buildReport(userId: string) {
  const tasks = await getUserTasks(userId);
  const activeTasks = tasks.filter((task) => ACTIVE_STATUSES.includes(task.status));
  const todayCount = activeTasks.filter((task) => !task.due_at || isToday(task.due_at)).length;
  const weekCount = activeTasks.filter((task) => task.due_at && isWithinDays(task.due_at, 7)).length;
  const overdueCount = activeTasks.filter(isOverdue).length;
  const doneCount = tasks.filter((task) => task.status === "done" && isToday(task.completed_at)).length;

  return [
    "Bao cao Task Tele",
    `Hom nay: ${todayCount} viec`,
    `7 ngay toi: ${weekCount} viec`,
    `Qua han: ${overdueCount} viec`,
    `Da xong hom nay: ${doneCount} viec`,
    "",
    "Dung /today, /week hoac /high de xem chi tiet."
  ].join("\n");
}

export async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Khong gui duoc tin nhan Telegram: ${errorText}`);
  }
}

export function formatTaskList(title: string, tasks: Task[]) {
  if (tasks.length === 0) {
    return `${title}: khong co viec.`;
  }

  return [
    `${title}:`,
    ...tasks.slice(0, 20).map((task) => {
      const code = task.id.slice(0, 8);
      const due = task.due_at ? formatDate(task.due_at) : "chua co han";
      return `- ${code} | ${task.title} | ${priorityLabel(task.priority)} | ${due}`;
    }),
    "",
    "Danh dau xong: /done MA_VIEC"
  ].join("\n");
}

function isToday(date: string | null) {
  if (!date) return false;
  const target = new Date(date);
  const now = new Date();
  return target.toDateString() === now.toDateString();
}

function isWithinDays(date: string | null, days: number) {
  if (!date) return false;
  const target = new Date(date).getTime();
  const now = Date.now();
  return target >= now && target <= now + days * 24 * 60 * 60 * 1000;
}

function isOverdue(task: Task) {
  if (!task.due_at) return false;
  return new Date(task.due_at) < new Date() && !isToday(task.due_at);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(date));
}

function priorityLabel(priority: TaskPriority) {
  return { low: "thap", normal: "vua", high: "cao" }[priority];
}
