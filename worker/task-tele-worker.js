const ACTIVE_STATUSES = ["todo", "doing", "waiting"];
const DEFAULT_PRIORITY = "normal";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "task-tele-worker" });
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      return handleWebhook(request, env);
    }

    if (request.method === "GET" && url.pathname === "/cron") {
      const expected = env.CRON_SECRET;
      if (expected && request.headers.get("authorization") !== `Bearer ${expected}`) {
        return json({ error: "Unauthorized" }, 401);
      }
      return json(await runAutomation(env));
    }

    return json({ error: "Not found" }, 404);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runAutomation(env));
  }
};

async function handleWebhook(request, env) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return json({ error: "Missing Telegram bot token" }, 500);
  }

  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const actualSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (actualSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  const update = await request.json();
  const message = update.message;
  if (!message?.text) {
    return json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const username = message.from?.username ?? null;

  try {
    const reply = await handleCommand(env, {
      chatId,
      username,
      text: message.text.trim()
    });
    await sendTelegramMessage(env, chatId, reply);
  } catch (error) {
    await sendTelegramMessage(env, chatId, error instanceof Error ? error.message : "Co loi khi xu ly lenh.");
  }

  return json({ ok: true });
}

async function handleCommand(env, { chatId, username, text }) {
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
    return linkTelegramAccount(env, chatId, username, args[0]);
  }

  const userId = await getLinkedUserId(env, chatId);
  if (!userId) {
    return "Telegram chua lien ket. Vao app web tao ma roi gui /link MA_LIEN_KET.";
  }

  if (normalizedCommand === "/add") {
    const raw = args.join(" ").trim();
    if (!raw) return "Them viec theo dang: /add Ten viec | ghi chu tuy chon";
    return createTaskFromTelegram(env, userId, raw);
  }

  if (normalizedCommand === "/today") {
    const tasks = await getActiveTasks(env, userId);
    return formatTaskList("Viec hom nay", tasks.filter((task) => !task.due_at || isToday(task.due_at)));
  }

  if (normalizedCommand === "/week") {
    const tasks = await getActiveTasks(env, userId);
    return formatTaskList("Viec trong 7 ngay", tasks.filter((task) => task.due_at && isWithinDays(task.due_at, 7)));
  }

  if (normalizedCommand === "/high") {
    const tasks = await getActiveTasks(env, userId);
    return formatTaskList("Viec uu tien cao", tasks.filter((task) => task.priority === "high"));
  }

  if (normalizedCommand === "/report") {
    return buildReport(env, userId);
  }

  if (normalizedCommand === "/done") {
    return markTaskDone(env, userId, args[0]);
  }

  return "Lenh ho tro: /help, /add, /today, /week, /high, /done MA_VIEC, /report";
}

async function linkTelegramAccount(env, chatId, username, token) {
  if (!token) {
    return "Gui ma lien ket theo dang: /link MA_LIEN_KET";
  }

  const links = await supabaseSelect(
    env,
    `/telegram_link_tokens?select=id,user_id,expires_at,used_at&token=eq.${encodeURIComponent(token.toUpperCase())}&used_at=is.null`
  );
  const link = links[0];

  if (!link) {
    return "Ma lien ket khong dung hoac da duoc dung.";
  }

  if (new Date(link.expires_at).getTime() < Date.now()) {
    return "Ma lien ket da het han. Tao ma moi trong app web.";
  }

  await supabaseUpsert(env, "/telegram_accounts?on_conflict=telegram_chat_id", {
    user_id: link.user_id,
    telegram_chat_id: chatId,
    telegram_username: username,
    linked_at: new Date().toISOString()
  });

  await supabasePatch(env, `/telegram_link_tokens?id=eq.${link.id}`, {
    used_at: new Date().toISOString()
  });

  return "Da lien ket Telegram voi tai khoan Task Tele.";
}

async function createTaskFromTelegram(env, userId, raw) {
  const [titlePart, notesPart] = raw.split("|").map((part) => part.trim());
  const title = titlePart.slice(0, 160);
  const notes = notesPart || null;
  const [task] = await supabaseInsert(env, "/tasks", {
    user_id: userId,
    title,
    notes,
    status: "todo",
    priority: DEFAULT_PRIORITY,
    updated_at: new Date().toISOString()
  });

  return [`Da them viec: ${task.title}`, `Ma viec: ${task.id.slice(0, 8)}`].join("\n");
}

async function markTaskDone(env, userId, shortId) {
  if (!shortId) {
    return "Danh dau xong theo dang: /done MA_VIEC";
  }

  const tasks = await getActiveTasks(env, userId);
  const task = tasks.find((item) => item.id.startsWith(shortId));
  if (!task) {
    return "Khong tim thay viec voi ma do. Dung /today de xem ma viec.";
  }

  await supabasePatch(env, `/tasks?id=eq.${task.id}&user_id=eq.${userId}`, {
    status: "done",
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  return `Da danh dau xong: ${task.title}`;
}

async function runAutomation(env) {
  const [accounts, profiles] = await Promise.all([
    supabaseSelect(env, "/telegram_accounts?select=user_id,telegram_chat_id"),
    supabaseSelect(
      env,
      "/profiles?select=id,display_name,timezone,telegram_reports_enabled,telegram_reminders_enabled,morning_report_time,evening_report_time,last_morning_report_date,last_evening_report_date,created_at"
    )
  ]);

  const profileByUser = new Map(profiles.map((profile) => [profile.id, profile]));
  const results = { ok: true, accounts: accounts.length, reminders: 0, reports: 0, errors: [] };

  for (const account of accounts) {
    const profile = profileByUser.get(account.user_id);
    if (!profile) continue;

    try {
      if (profile.telegram_reminders_enabled !== false) {
        results.reminders += await sendDueReminders(env, account);
      }

      const reportSlot = getDueReportSlot(profile);
      if (profile.telegram_reports_enabled !== false && reportSlot) {
        await sendDailyReport(env, account);
        await markReportSent(env, profile, reportSlot);
        results.reports += 1;
      }
    } catch (error) {
      results.ok = false;
      results.errors.push(error instanceof Error ? error.message : "Unknown cron error");
    }
  }

  return results;
}

async function sendDueReminders(env, account) {
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000);
  const tasks = await supabaseSelect(
    env,
    `/tasks?select=*&user_id=eq.${account.user_id}&status=in.(${ACTIVE_STATUSES.join(",")})&reminded_at=is.null&due_at=not.is.null&due_at=lte.${soon.toISOString()}&order=due_at.asc&limit=10`
  );

  for (const task of tasks) {
    await sendTelegramMessage(
      env,
      account.telegram_chat_id,
      [`Sap den han: ${task.title}`, `Ma viec: ${task.id.slice(0, 8)}`, task.due_at ? formatDate(task.due_at) : ""]
        .filter(Boolean)
        .join("\n")
    );

    await supabasePatch(env, `/tasks?id=eq.${task.id}&user_id=eq.${account.user_id}`, {
      reminded_at: now.toISOString(),
      updated_at: now.toISOString()
    });
  }

  return tasks.length;
}

async function sendDailyReport(env, account) {
  const tasks = await getActiveTasks(env, account.user_id);
  await sendTelegramMessage(
    env,
    account.telegram_chat_id,
    formatTaskList("Bao cao hom nay", tasks.filter((task) => !task.due_at || isToday(task.due_at)))
  );
}

async function getLinkedUserId(env, chatId) {
  const accounts = await supabaseSelect(env, `/telegram_accounts?select=user_id&telegram_chat_id=eq.${chatId}&limit=1`);
  return accounts[0]?.user_id;
}

async function getUserTasks(env, userId) {
  return supabaseSelect(env, `/tasks?select=*&user_id=eq.${userId}&order=created_at.desc&limit=100`);
}

async function getActiveTasks(env, userId) {
  const tasks = await getUserTasks(env, userId);
  return tasks.filter((task) => ACTIVE_STATUSES.includes(task.status));
}

async function buildReport(env, userId) {
  const tasks = await getUserTasks(env, userId);
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

async function sendTelegramMessage(env, chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    throw new Error(`Khong gui duoc Telegram: ${await response.text()}`);
  }
}

async function supabaseSelect(env, path) {
  return supabaseRequest(env, path, { method: "GET" });
}

async function supabaseInsert(env, path, body) {
  return supabaseRequest(env, path, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body)
  });
}

async function supabaseUpsert(env, path, body) {
  return supabaseRequest(env, path, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body)
  });
}

async function supabasePatch(env, path, body) {
  return supabaseRequest(env, path, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body)
  });
}

async function supabaseRequest(env, path, init) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  }

  if (response.status === 204) return [];
  return response.json();
}

function formatTaskList(title, tasks) {
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

async function markReportSent(env, profile, slot) {
  const field = slot === "morning" ? "last_morning_report_date" : "last_evening_report_date";
  await supabasePatch(env, `/profiles?id=eq.${profile.id}`, {
    [field]: getLocalDate(profile.timezone || "Asia/Bangkok")
  });
}

function getDueReportSlot(profile) {
  const timezone = profile.timezone || "Asia/Bangkok";
  const localHour = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: timezone
  }).format(new Date());
  const localDate = getLocalDate(timezone);

  if (profile.morning_report_time?.slice(0, 2) === localHour && profile.last_morning_report_date !== localDate) {
    return "morning";
  }

  if (profile.evening_report_time?.slice(0, 2) === localHour && profile.last_evening_report_date !== localDate) {
    return "evening";
  }

  return null;
}

function getLocalDate(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isToday(date) {
  if (!date) return false;
  const target = new Date(date);
  const now = new Date();
  return target.toDateString() === now.toDateString();
}

function isWithinDays(date, days) {
  if (!date) return false;
  const target = new Date(date).getTime();
  const now = Date.now();
  return target >= now && target <= now + days * 24 * 60 * 60 * 1000;
}

function isOverdue(task) {
  if (!task.due_at) return false;
  return new Date(task.due_at) < new Date() && !isToday(task.due_at);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(date));
}

function priorityLabel(priority) {
  return { low: "thap", normal: "vua", high: "cao" }[priority] || "vua";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
