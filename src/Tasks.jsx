import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, Pencil, X, ChevronDown, ChevronRight,
  Circle, CheckCircle2, ArrowUp, ArrowDown, Calendar, Inbox, Eye, EyeOff, Square, CheckSquare,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { C } from "./theme";


const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY = ymd(new Date());
const MO = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
const COLLAPSE_KEY = "tk-collapsed";
const fmtDate = (s) => { if (!s) return null; const d = new Date(s + "T00:00:00"); return `${d.getDate()} ${MO[d.getMonth()]}`; };

// секции: инбокс + 4 квадранта
const SECTIONS = [
  { key: "inbox", name: "Не разобрано", accent: C.muted, match: (t) => !t.triaged },
  { key: "q1", name: "Срочно и важно", accent: C.danger, match: (t) => t.triaged && t.important && t.urgent },
  { key: "q2", name: "Важно, не срочно", accent: C.accent, match: (t) => t.triaged && t.important && !t.urgent },
  { key: "q3", name: "Срочно, не важно", accent: C.info, match: (t) => t.triaged && !t.important && t.urgent },
  { key: "q4", name: "Не срочно, не важно", accent: C.faint, match: (t) => t.triaged && !t.important && !t.urgent },
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [quick, setQuick] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [collapsed, setCollapsed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "[]")); } catch { return new Set(); }
  });
  const [addingSubFor, setAddingSubFor] = useState(null);
  const [subDraft, setSubDraft] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const persistCollapsed = (s) => localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...s]));

  const load = useCallback(async () => {
    const [{ data: ts }, { data: ss }] = await Promise.all([
      supabase.from("tasks").select("*").order("sort_order"),
      supabase.from("subtasks").select("*").order("sort_order"),
    ]);
    setTasks(ts || []); setSubtasks(ss || []); setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  const subsFor = (taskId) => subtasks.filter((s) => s.task_id === taskId).sort(bySort);

  // ── quick capture → инбокс ──
  const quickAdd = async () => {
    const title = quick.trim(); if (!title) return;
    setQuick("");
    const maxSort = tasks.reduce((m, t) => Math.max(m, t.sort_order ?? 0), 0);
    const { data, error } = await supabase.from("tasks")
      .insert({ title, triaged: false, sort_order: maxSort + 1 }).select().single();
    if (!error && data) setTasks((t) => [data, ...t]);
  };

  // ── task mutations ──
  const patchTask = async (id, patch) => {
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from("tasks").update(patch).eq("id", id);
  };
  const toggleDone = (task) => patchTask(task.id, { done: !task.done });
  const setImportant = (task, v) => patchTask(task.id, { important: v, triaged: true });
  const setUrgent = (task, v) => patchTask(task.id, { urgent: v, triaged: true });
  const setTitle = (id, title) => patchTask(id, { title });
  const setDue = (id, due_date) => patchTask(id, { due_date: due_date || null });
  const removeTask = async (id) => {
    setTasks((t) => t.filter((x) => x.id !== id));
    setSubtasks((s) => s.filter((x) => x.task_id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };
  const moveTask = async (task, dir, section) => {
    const sibs = tasks.filter((t) => section.match(t)).sort(bySort);
    const i = sibs.findIndex((x) => x.id === task.id); const j = i + dir;
    if (j < 0 || j >= sibs.length) return;
    const other = sibs[j]; const a = task.sort_order ?? 0, b = other.sort_order ?? 0;
    setTasks((prev) => prev.map((x) => x.id === task.id ? { ...x, sort_order: b } : x.id === other.id ? { ...x, sort_order: a } : x));
    await Promise.all([
      supabase.from("tasks").update({ sort_order: b }).eq("id", task.id),
      supabase.from("tasks").update({ sort_order: a }).eq("id", other.id),
    ]);
  };

  // ── subtask mutations ──
  const addSub = async (taskId) => {
    const title = subDraft.trim(); if (!title) return;
    setSubDraft(""); setAddingSubFor(null);
    const cnt = subsFor(taskId).length;
    const { data, error } = await supabase.from("subtasks").insert({ task_id: taskId, title, sort_order: cnt }).select().single();
    if (!error && data) { setSubtasks((s) => [...s, data]); setExpanded((p) => new Set(p).add(taskId)); }
  };
  const toggleSub = async (sub) => {
    setSubtasks((s) => s.map((x) => (x.id === sub.id ? { ...x, done: !x.done } : x)));
    await supabase.from("subtasks").update({ done: !sub.done }).eq("id", sub.id);
  };
  const setSubTitle = async (id, title) => {
    setSubtasks((s) => s.map((x) => (x.id === id ? { ...x, title } : x)));
    await supabase.from("subtasks").update({ title }).eq("id", id);
  };
  const removeSub = async (id) => { setSubtasks((s) => s.filter((x) => x.id !== id)); await supabase.from("subtasks").delete().eq("id", id); };
  const moveSub = async (sub, dir) => {
    const sibs = subsFor(sub.task_id);
    const i = sibs.findIndex((x) => x.id === sub.id); const j = i + dir;
    if (j < 0 || j >= sibs.length) return;
    const other = sibs[j]; const a = sub.sort_order ?? 0, b = other.sort_order ?? 0;
    setSubtasks((prev) => prev.map((x) => x.id === sub.id ? { ...x, sort_order: b } : x.id === other.id ? { ...x, sort_order: a } : x));
    await Promise.all([
      supabase.from("subtasks").update({ sort_order: b }).eq("id", sub.id),
      supabase.from("subtasks").update({ sort_order: a }).eq("id", other.id),
    ]);
  };

  const toggleExpand = (id) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCollapse = (key) => setCollapsed((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); persistCollapsed(n); return n; });

  const doneTasks = tasks.filter((t) => t.done);
  const toggleSelect = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllDone = () => setSelected(new Set(doneTasks.map((t) => t.id)));
  const exitSelect = () => { setSelecting(false); setSelected(new Set()); };
  const clearSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) { exitSelect(); return; }
    setTasks((t) => t.filter((x) => !selected.has(x.id)));
    setSubtasks((s) => s.filter((x) => !selected.has(x.task_id)));
    exitSelect();
    await supabase.from("tasks").delete().in("id", ids);
  };

  const rp = {
    editing, subsFor, toggleDone, setImportant, setUrgent, setTitle, setDue, removeTask, moveTask,
    addingSubFor, setAddingSubFor, subDraft, setSubDraft, addSub, toggleSub, setSubTitle, removeSub, moveSub,
    expanded, toggleExpand, showDone, selecting, selected, toggleSelect,
  };

  const inboxCount = tasks.filter((t) => !t.triaged && !t.done).length;

  return (
    <div>
      {/* быстрый инбокс */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 14, background: C.surface, border: `1px solid ${C.line}`, marginBottom: 16 }}>
        <Inbox size={16} style={{ color: C.muted, flexShrink: 0, marginLeft: 4 }} />
        <input className="ht-input" value={quick} onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") quickAdd(); }}
          placeholder="+ быстро записать…" style={{ flex: 1, background: "transparent", border: "none", padding: "6px 4px", fontSize: 14, color: C.text, outline: "none" }} />
        {quick.trim() && (
          <button onClick={quickAdd} style={{ padding: "6px 12px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: C.accent, color: C.onFill, border: "none", cursor: "pointer" }}>В инбокс</button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{inboxCount > 0 ? `${inboxCount} не разобрано` : "инбокс пуст"}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {doneTasks.length > 0 && (
            <button onClick={() => { setShowDone((v) => !v); if (selecting) exitSelect(); }} style={iconBtn(showDone ? C.accent : C.muted)}>
              {showDone ? <EyeOff size={13} /> : <Eye size={13} />} {showDone ? "Скрыть готовые" : `Готовые (${doneTasks.length})`}
            </button>
          )}
          <button onClick={() => setEditing((e) => !e)} style={iconBtn(editing ? C.accent : C.muted)}>
            {editing ? <X size={13} /> : <Pencil size={13} />} {editing ? "Готово" : "Править"}
          </button>
        </div>
      </div>

      {showDone && doneTasks.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: 12, background: C.surface, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          {selecting ? (
            <>
              <button onClick={selectAllDone} style={{ fontSize: 12.5, color: C.text, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>Выбрать все</button>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={clearSelected} disabled={selected.size === 0} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: selected.size ? "pointer" : "default", border: "none", background: selected.size ? C.danger : C.surface2, color: selected.size ? C.onFill : C.faint }}>Удалить{selected.size ? ` (${selected.size})` : ""}</button>
                <button onClick={exitSelect} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12.5, background: "transparent", color: C.muted, border: `1px solid ${C.line}`, cursor: "pointer" }}>Отмена</button>
              </div>
            </>
          ) : (
            <>
              <span style={{ fontSize: 12, color: C.muted }}>Выполненные показаны</span>
              <button onClick={() => setSelecting(true)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: C.danger, background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={13} /> Очистить</button>
            </>
          )}
        </div>
      )}

      {loaded && tasks.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", borderRadius: 16, background: C.surface, border: `1px solid ${C.line}` }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Задач пока нет</div>
          <div style={{ fontSize: 14, color: C.muted }}>Кинь мысль в строку сверху — разберёшь потом.</div>
        </div>
      )}

      {SECTIONS.map((sec) => {
        const all = tasks.filter((t) => sec.match(t)).sort(bySort);
        if (all.length === 0) return null;
        const items = showDone ? all : all.filter((t) => !t.done);
        const isCol = collapsed.has(sec.key);
        const openCount = all.filter((t) => !t.done).length;
        if (items.length === 0) return null;
        return (
          <div key={sec.key} style={{ marginBottom: 14 }}>
            <button onClick={() => toggleCollapse(sec.key)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: "4px 2px", marginBottom: 8 }}>
              {isCol ? <ChevronRight size={16} style={{ color: C.muted }} /> : <ChevronDown size={16} style={{ color: C.muted }} />}
              <span style={{ width: 8, height: 8, borderRadius: 999, background: sec.accent, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: C.text, flex: 1, textAlign: "left" }}>{sec.name}</span>
              <span style={{ fontSize: 12, color: C.muted, fontFamily: C.mono, fontVariantNumeric: "tabular-nums" }}>{openCount}/{all.length}</span>
            </button>
            {!isCol && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((task, i) => (
                  <TaskRow key={task.id} task={task} section={sec} canUp={i > 0} canDown={i < items.length - 1} {...rp} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({
  task, section, canUp, canDown, editing, subsFor, toggleDone, setImportant, setUrgent, setTitle, setDue,
  removeTask, moveTask, addingSubFor, setAddingSubFor, subDraft, setSubDraft, addSub, toggleSub, setSubTitle,
  removeSub, moveSub, expanded, toggleExpand, showDone, selecting, selected, toggleSelect,
}) {
  const subs = subsFor(task.id);
  const hasSubs = subs.length > 0;
  const visibleSubs = (showDone || editing) ? subs : subs.filter((s) => !s.done);
  const isExp = expanded.has(task.id);
  const overdue = task.due_date && !task.done && task.due_date < TODAY;
  const picking = selecting && task.done;
  const isSel = selected?.has(task.id);

  return (
    <div style={{ borderRadius: 14, background: C.surface, border: `1px solid ${task.done ? C.line : C.line}`, overflow: "hidden", opacity: task.done ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: editing ? "stretch" : "center", gap: 10, padding: "10px 12px" }}>
        <button onClick={() => toggleDone(task)} aria-label="Готово" style={{ flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", padding: 0, marginTop: editing ? 4 : 0 }}>
          {task.done ? <CheckCircle2 size={20} style={{ color: C.accent }} fill="currentColor" fillOpacity={0.18} /> : <Circle size={20} style={{ color: C.faint }} />}
        </button>

        {editing ? (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="ht-input" defaultValue={task.title}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== task.title) setTitle(task.id, v); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              style={{ width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 8px", color: C.text, fontSize: 14 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <button onClick={() => setImportant(task, !task.important)} style={flagBtn(task.important)}>важное</button>
              <button onClick={() => setUrgent(task, !task.urgent)} style={flagBtn(task.urgent)}>срочное</button>
              <input type="date" defaultValue={task.due_date || ""} onChange={(e) => setDue(task.id, e.target.value)} style={dateInputStyle()} />
              <button onClick={() => moveTask(task, -1, section)} disabled={!canUp} aria-label="Выше" style={miniBtn(!canUp)}><ArrowUp size={14} /></button>
              <button onClick={() => moveTask(task, 1, section)} disabled={!canDown} aria-label="Ниже" style={miniBtn(!canDown)}><ArrowDown size={14} /></button>
              <button onClick={() => removeTask(task.id)} aria-label="Удалить" style={{ padding: 6, borderRadius: 8, color: C.danger, background: C.surface2, border: "none", cursor: "pointer" }}><Trash2 size={14} /></button>
            </div>
          </div>
        ) : (
          <div style={{ minWidth: 0, flex: 1, cursor: hasSubs ? "pointer" : "default" }} onClick={() => hasSubs && toggleExpand(task.id)}>
            <div style={{ fontSize: 14, color: task.done ? C.muted : C.text, textDecoration: task.done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</div>
            {(task.due_date || hasSubs) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                {task.due_date && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: overdue ? C.danger : C.muted }}>
                    <Calendar size={11} /> {fmtDate(task.due_date)}
                  </span>
                )}
                {hasSubs && <span style={{ fontSize: 12, color: C.muted, fontFamily: C.mono, fontVariantNumeric: "tabular-nums" }}>{subs.filter((s) => s.done).length}/{subs.length}</span>}
              </div>
            )}
          </div>
        )}

        {!editing && hasSubs && (
          <button onClick={() => toggleExpand(task.id)} aria-label="Развернуть" style={{ flexShrink: 0, background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: 4 }}>
            {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {picking && (
          <button onClick={() => toggleSelect(task.id)} aria-label="Выбрать" style={{ flexShrink: 0, background: "transparent", border: "none", color: isSel ? C.danger : C.muted, cursor: "pointer", padding: 4 }}>
            {isSel ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
        )}
      </div>

      {(isExp || editing) && (
        <div style={{ padding: "8px 12px 12px 40px", borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 6 }}>
          {visibleSubs.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => toggleSub(s)} aria-label="Готово" style={{ flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                {s.done ? <CheckCircle2 size={16} style={{ color: C.accent }} fill="currentColor" fillOpacity={0.18} /> : <Circle size={16} style={{ color: C.faint }} />}
              </button>
              {editing ? (
                <>
                  <input className="ht-input" defaultValue={s.title}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.title) setSubTitle(s.id, v); }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    style={{ flex: 1, minWidth: 0, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "4px 8px", color: C.text, fontSize: 13 }} />
                  <button onClick={() => moveSub(s, -1)} disabled={i === 0} aria-label="Выше" style={miniBtn(i === 0)}><ArrowUp size={13} /></button>
                  <button onClick={() => moveSub(s, 1)} disabled={i === subs.length - 1} aria-label="Ниже" style={miniBtn(i === subs.length - 1)}><ArrowDown size={13} /></button>
                  <button onClick={() => removeSub(s.id)} aria-label="Удалить" style={{ padding: 5, borderRadius: 8, color: C.danger, background: C.surface2, border: "none", cursor: "pointer" }}><Trash2 size={13} /></button>
                </>
              ) : (
                <span style={{ fontSize: 13, color: s.done ? C.muted : C.text, textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
              )}
            </div>
          ))}
          {addingSubFor === task.id ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <input autoFocus className="ht-input" value={subDraft} onChange={(e) => setSubDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addSub(task.id); if (e.key === "Escape") { setAddingSubFor(null); setSubDraft(""); } }}
                placeholder="Подзадача…" style={{ flex: 1, minWidth: 0, background: C.surface2, border: `1px solid ${C.accentEdge}`, borderRadius: 8, padding: "4px 8px", color: C.text, fontSize: 13 }} />
              <button onClick={() => addSub(task.id)} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: C.accent, color: C.onFill, border: "none", cursor: "pointer" }}>+</button>
              <button onClick={() => { setAddingSubFor(null); setSubDraft(""); }} aria-label="Отмена" style={{ padding: 5, borderRadius: 8, color: C.muted, background: "transparent", border: "none", cursor: "pointer" }}><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingSubFor(task.id)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: C.muted, background: "transparent", border: "none", cursor: "pointer", padding: "2px 0" }}>
              <Plus size={13} /> Подзадача
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function iconBtn(color) { return { display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, padding: "5px 8px", borderRadius: 8, color, background: "transparent", border: "none", cursor: "pointer" }; }
function miniBtn(disabled) { return { padding: 6, borderRadius: 8, color: disabled ? C.faint : C.text, background: C.surface2, border: `1px solid ${C.line}`, cursor: disabled ? "default" : "pointer", display: "flex", opacity: disabled ? 0.5 : 1 }; }
function flagBtn(on) { return { padding: "5px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: "pointer", border: `1px solid ${on ? C.accent : C.line}`, background: on ? C.accentSoft : "transparent", color: on ? C.accentHot : C.muted }; }
function dateInputStyle() { return { background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "4px 6px", fontSize: 12, color: C.text, colorScheme: "dark" }; }
