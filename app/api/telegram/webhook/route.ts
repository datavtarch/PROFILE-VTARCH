import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Task } from "@/types/task";

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

const ACTIVE_STATUSES = ["todo", "doing", "waiting"];

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
  const text = message.text.trim();

  try {
    const reply = await handleCommand({
      chatId,
      username: message.from?.username ?? null,
      text
    });
    await sendTelegramMessage(botToken, chatId, reply);
  } catch (error) {
    await sendTelegramMessage(
      botToken,
      chatId,
      error instanceof Error ? error.message : "Có lỗi khi xử lý lệnh."
    );
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

  if (normalizedCommand === "/start") {
    return [
      "Task Tele đã sẵn sàng.",
      "Vào app web, tạo mã Telegram trong Cài đặt rồi gửi:",
      "/link MA_LIEN_KET"
    ].join("\n");
  }

  if (normalizedCommand === "/link") {
    const token = args[0]?.trim();
    if (!token) {
      return "Gửi mã liên kết theo dạng: /link MA_LIEN_KET";
    }

    const { data: link, error: linkError } = await supabase
      .from("telegram_link_tokens")
      .select("id,user_id,expires_at,used_at")
      .eq("token", token.toUpperCase())
      .is("used_at", null)
      .single();

    if (linkError || !link) {
      return "Mã liên kết không đúng hoặc đã được dùng.";
    }

    if (new Date(link.expires_at).getTime() < Date.now()) {
      return "Mã liên kết đã hết hạn. Tạo mã mới trong app web.";
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
      throw new Error(`Không liên kết được Telegram: ${upsertError.message}`);
    }

    await supabase
      .from("telegram_link_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", link.id);

    return "Đã liên kết Telegram với tài khoản Task Tele.";
  }

  const userId = await getLinkedUserId(chatId);
  if (!userId) {
    return "Telegram chưa liên kết. Vào app web tạo mã rồi gửi /link MA_LIEN_KET.";
  }

  if (normalizedCommand === "/today") {
    const tasks = await getActiveTasks(userId);
    const todayTasks = tasks.filter((task) => !task.due_at || isToday(task.due_at));
    return formatTaskList("Việc hôm nay", todayTasks);
  }

  if (normalizedCommand === "/report") {
    const tasks = await getUserTasks(userId);
    const activeTasks = tasks.filter((task) => ACTIVE_STATUSES.includes(task.status));
    const todayCount = activeTasks.filter((task) => !task.due_at || isToday(task.due_at)).length;
    const overdueCount = activeTasks.filter(isOverdue).length;
    const doneCount = tasks.filter((task) => task.status === "done" && isToday(task.completed_at)).length;

    return [
      "Báo cáo Task Tele",
      `Hôm nay: ${todayCount} việc`,
      `Quá hạn: ${overdueCount} việc`,
      `Đã xong hôm nay: ${doneCount} việc`,
      "",
      "Dùng /today để xem danh sách việc."
    ].join("\n");
  }

  if (normalizedCommand === "/done") {
    const shortId = args[0]?.trim();
    if (!shortId) {
      return "Đánh dấu xong theo dạng: /done MA_VIEC";
    }

    const tasks = await getActiveTasks(userId);
    const task = tasks.find((item) => item.id.startsWith(shortId));
    if (!task) {
      return "Không tìm thấy việc với mã đó. Dùng /today để xem mã việc.";
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
      throw new Error(`Không cập nhật được việc: ${error.message}`);
    }

    return `Đã đánh dấu xong: ${task.title}`;
  }

  return "Lệnh hỗ trợ: /start, /link, /today, /done MA_VIEC, /report";
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
    throw new Error(`Không đọc được danh sách việc: ${error.message}`);
  }

  return (data ?? []) as Task[];
}

async function getActiveTasks(userId: string) {
  const tasks = await getUserTasks(userId);
  return tasks.filter((task) => ACTIVE_STATUSES.includes(task.status));
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
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
    throw new Error("Không gửi được tin nhắn Telegram.");
  }
}

function formatTaskList(title: string, tasks: Task[]) {
  if (tasks.length === 0) {
    return `${title}: không có việc.`;
  }

  return [
    `${title}:`,
    ...tasks.slice(0, 20).map((task) => {
      const code = task.id.slice(0, 8);
      const due = task.due_at ? formatDate(task.due_at) : "chưa có hạn";
      return `- ${code} | ${task.title} | ${due}`;
    }),
    "",
    "Đánh dấu xong: /done MA_VIEC"
  ].join("\n");
}

function isToday(date: string | null) {
  if (!date) return false;
  const target = new Date(date);
  const now = new Date();
  return target.toDateString() === now.toDateString();
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
