"use client";

import {
  Bell,
  CalendarClock,
  Check,
  Circle,
  Clock3,
  Edit3,
  Filter,
  LogOut,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Trash2
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Task, TaskInput, TaskPriority, TaskStatus } from "@/types/task";

type ViewKey = "today" | "upcoming" | "overdue" | "completed";
type AuthMode = "signin" | "signup";

const emptyTask: TaskInput = {
  title: "",
  notes: "",
  status: "todo",
  priority: "normal",
  due_at: ""
};

const demoTasks: Task[] = [
  {
    id: "demo-1",
    title: "Tạo tài khoản Supabase",
    notes: "Lấy URL và anon key để đưa vào Vercel.",
    status: "doing",
    priority: "high",
    due_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "demo-2",
    title: "Viết danh sách việc hôm nay",
    notes: "Dùng app như sổ điều hành cá nhân.",
    status: "todo",
    priority: "normal",
    due_at: new Date(Date.now() + 86400000).toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default function Home() {
  const supabase = getSupabaseClient();
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [tasks, setTasks] = useState<Task[]>(configured ? [] : demoTasks);
  const [activeView, setActiveView] = useState<ViewKey>("today");
  const [taskInput, setTaskInput] = useState<TaskInput>(emptyTask);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      return;
    }

    void loadTasks();
  }, [session, supabase]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      done: tasks.filter((task) => task.status === "done").length,
      overdue: tasks.filter(isOverdue).length,
      high: tasks.filter((task) => task.priority === "high" && task.status !== "done").length
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (activeView === "today") return isToday(task.due_at) && task.status !== "done";
        if (activeView === "upcoming") return isUpcoming(task.due_at) && task.status !== "done";
        if (activeView === "overdue") return isOverdue(task);
        return task.status === "done";
      })
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
  }, [activeView, tasks]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setAuthMessage("Chưa cấu hình Supabase. Hiện app đang ở chế độ demo.");
      return;
    }

    setLoading(true);
    setAuthMessage("");
    const action =
      authMode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;
    setLoading(false);

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setAuthMessage(
      authMode === "signup"
        ? "Đã tạo tài khoản. Kiểm tra email nếu Supabase yêu cầu xác nhận."
        : "Đã đăng nhập."
    );
  }

  async function loadTasks() {
    if (!supabase || !session) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setTasks((data ?? []) as Task[]);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskInput.title.trim();
    if (!title) return;

    const payload = {
      title,
      notes: taskInput.notes.trim() || null,
      status: taskInput.status,
      priority: taskInput.priority,
      due_at: taskInput.due_at ? new Date(taskInput.due_at).toISOString() : null,
      completed_at: taskInput.status === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    if (!supabase || !session) {
      const localTask: Task = {
        id: editingId ?? crypto.randomUUID(),
        ...payload,
        created_at: new Date().toISOString()
      };
      setTasks((current) =>
        editingId
          ? current.map((task) => (task.id === editingId ? { ...task, ...localTask } : task))
          : [localTask, ...current]
      );
      resetForm();
      return;
    }

    setLoading(true);
    const request = editingId
      ? supabase.from("tasks").update(payload).eq("id", editingId).select("*").single()
      : supabase
          .from("tasks")
          .insert({ ...payload, user_id: session.user.id })
          .select("*")
          .single();

    const { data, error } = await request;
    setLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setTasks((current) =>
      editingId
        ? current.map((task) => (task.id === editingId ? (data as Task) : task))
        : [data as Task, ...current]
    );
    resetForm();
  }

  async function updateStatus(task: Task, status: TaskStatus) {
    const payload = {
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    if (!supabase || !session) {
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, ...payload } : item))
      );
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", task.id)
      .select("*")
      .single();

    if (error) {
      setNotice(error.message);
      return;
    }

    setTasks((current) => current.map((item) => (item.id === task.id ? (data as Task) : item)));
  }

  async function deleteTask(taskId: string) {
    if (!supabase || !session) {
      setTasks((current) => current.filter((task) => task.id !== taskId));
      return;
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      setNotice(error.message);
      return;
    }
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function editTask(task: Task) {
    setEditingId(task.id);
    setTaskInput({
      title: task.title,
      notes: task.notes ?? "",
      status: task.status,
      priority: task.priority,
      due_at: task.due_at ? toDateTimeLocal(task.due_at) : ""
    });
  }

  function resetForm() {
    setTaskInput(emptyTask);
    setEditingId(null);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setTasks([]);
  }

  const shouldShowAuth = configured && !session;

  return (
    <main className="shell">
      <section className="topbar" aria-label="Thanh tổng quan">
        <div>
          <p className="eyebrow">Task Tele</p>
          <h1>Điều hành việc cá nhân, sẵn sàng báo Telegram.</h1>
        </div>
        <div className="top-actions">
          {!configured ? <span className="setup-pill">Demo local</span> : null}
          {session ? (
            <button className="icon-button" onClick={signOut} title="Đăng xuất">
              <LogOut size={18} />
            </button>
          ) : null}
        </div>
      </section>

      {shouldShowAuth ? (
        <section className="auth-panel">
          <div>
            <p className="eyebrow">Supabase Auth</p>
            <h2>{authMode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}</h2>
            <p className="muted">
              Mỗi tài khoản sẽ có dữ liệu riêng nhờ `user_id` và Row Level Security.
            </p>
          </div>
          <form className="auth-form" onSubmit={handleAuth}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>
            <button className="primary-button" disabled={loading}>
              {loading ? "Đang xử lý..." : authMode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
            >
              {authMode === "signin" ? "Tạo tài khoản mới" : "Đã có tài khoản"}
            </button>
            {authMessage ? <p className="form-message">{authMessage}</p> : null}
          </form>
        </section>
      ) : (
        <section className="workspace">
          <aside className="sidebar" aria-label="Tạo việc và cài đặt">
            <form className="task-form" onSubmit={saveTask}>
              <div className="section-heading">
                <Plus size={18} />
                <h2>{editingId ? "Sửa việc" : "Thêm việc"}</h2>
              </div>
              <label>
                Tên việc
                <input
                  value={taskInput.title}
                  onChange={(event) =>
                    setTaskInput((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Ví dụ: Gửi báo giá khách A"
                  required
                />
              </label>
              <label>
                Ghi chú
                <textarea
                  value={taskInput.notes}
                  onChange={(event) =>
                    setTaskInput((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Thông tin cần nhớ"
                  rows={4}
                />
              </label>
              <div className="form-grid">
                <label>
                  Hạn
                  <input
                    type="datetime-local"
                    value={taskInput.due_at}
                    onChange={(event) =>
                      setTaskInput((current) => ({ ...current, due_at: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Ưu tiên
                  <select
                    value={taskInput.priority}
                    onChange={(event) =>
                      setTaskInput((current) => ({
                        ...current,
                        priority: event.target.value as TaskPriority
                      }))
                    }
                  >
                    <option value="low">Thấp</option>
                    <option value="normal">Vừa</option>
                    <option value="high">Cao</option>
                  </select>
                </label>
              </div>
              <label>
                Trạng thái
                <select
                  value={taskInput.status}
                  onChange={(event) =>
                    setTaskInput((current) => ({
                      ...current,
                      status: event.target.value as TaskStatus
                    }))
                  }
                >
                  <option value="todo">Chưa làm</option>
                  <option value="doing">Đang làm</option>
                  <option value="waiting">Chờ</option>
                  <option value="done">Xong</option>
                  <option value="cancelled">Bỏ qua</option>
                </select>
              </label>
              <div className="button-row">
                <button className="primary-button" disabled={loading}>
                  {editingId ? "Lưu sửa" : "Thêm việc"}
                </button>
                {editingId ? (
                  <button className="ghost-button" type="button" onClick={resetForm}>
                    Hủy
                  </button>
                ) : null}
              </div>
            </form>

            <div className="settings-panel">
              <div className="section-heading">
                <Settings size={18} />
                <h2>Cài đặt</h2>
              </div>
              <div className="setting-row">
                <span>Múi giờ</span>
                <strong>Asia/Bangkok</strong>
              </div>
              <div className="telegram-box">
                <Send size={18} />
                <div>
                  <strong>Telegram</strong>
                  <p>Chuẩn bị liên kết bot sau khi Supabase ổn định.</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="main-panel">
            <div className="stat-grid" aria-label="Thống kê">
              <Stat icon={<Circle size={18} />} label="Tổng việc" value={stats.total} />
              <Stat icon={<Check size={18} />} label="Đã xong" value={stats.done} />
              <Stat icon={<Clock3 size={18} />} label="Quá hạn" value={stats.overdue} />
              <Stat icon={<Bell size={18} />} label="Ưu tiên cao" value={stats.high} />
            </div>

            <div className="list-header">
              <div>
                <div className="section-heading">
                  <Filter size={18} />
                  <h2>Danh sách việc</h2>
                </div>
                <p className="muted">
                  {configured
                    ? session?.user.email
                    : "Chưa cấu hình Supabase, dữ liệu đang chạy demo trên trình duyệt."}
                </p>
              </div>
              <button className="icon-button" onClick={loadTasks} disabled={!session || loading} title="Tải lại">
                <RefreshCw size={18} />
              </button>
            </div>

            <div className="tabs" role="tablist" aria-label="Bộ lọc việc">
              {[
                ["today", "Hôm nay"],
                ["upcoming", "Sắp tới"],
                ["overdue", "Quá hạn"],
                ["completed", "Đã xong"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={activeView === key ? "active" : ""}
                  onClick={() => setActiveView(key as ViewKey)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {notice ? <p className="notice">{notice}</p> : null}

            <div className="task-list">
              {visibleTasks.length === 0 ? (
                <div className="empty-state">
                  <CalendarClock size={28} />
                  <h3>Không có việc trong mục này</h3>
                  <p>Thêm việc mới hoặc đổi bộ lọc để xem danh sách khác.</p>
                </div>
              ) : (
                visibleTasks.map((task) => (
                  <article className={`task-card priority-${task.priority}`} key={task.id}>
                    <button
                      className="complete-button"
                      onClick={() => updateStatus(task, task.status === "done" ? "todo" : "done")}
                      title={task.status === "done" ? "Mở lại" : "Đánh dấu xong"}
                    >
                      {task.status === "done" ? <Check size={17} /> : <Circle size={17} />}
                    </button>
                    <div className="task-content">
                      <div className="task-title-row">
                        <h3>{task.title}</h3>
                        <span>{statusLabel(task.status)}</span>
                      </div>
                      {task.notes ? <p>{task.notes}</p> : null}
                      <div className="task-meta">
                        <span>{priorityLabel(task.priority)}</span>
                        <span>{task.due_at ? formatDue(task.due_at) : "Chưa có hạn"}</span>
                      </div>
                    </div>
                    <div className="task-actions">
                      <button onClick={() => editTask(task)} title="Sửa">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => deleteTask(task.id)} title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}

function Stat({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="stat-card">
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function isToday(date: string | null) {
  if (!date) return false;
  const target = new Date(date);
  const now = new Date();
  return target.toDateString() === now.toDateString();
}

function isUpcoming(date: string | null) {
  if (!date) return false;
  const target = new Date(date);
  const now = new Date();
  return target > now && !isToday(date);
}

function isOverdue(task: Task) {
  if (!task.due_at || task.status === "done" || task.status === "cancelled") return false;
  return new Date(task.due_at) < new Date() && !isToday(task.due_at);
}

function priorityRank(priority: TaskPriority) {
  return { low: 1, normal: 2, high: 3 }[priority];
}

function priorityLabel(priority: TaskPriority) {
  return { low: "Ưu tiên thấp", normal: "Ưu tiên vừa", high: "Ưu tiên cao" }[priority];
}

function statusLabel(status: TaskStatus) {
  return {
    todo: "Chưa làm",
    doing: "Đang làm",
    waiting: "Chờ",
    done: "Xong",
    cancelled: "Bỏ qua"
  }[status];
}

function formatDue(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(date));
}

function toDateTimeLocal(date: string) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}
