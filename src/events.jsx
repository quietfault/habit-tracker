import { Plus, Flag, CalendarClock, Trash2, ListPlus, CheckCircle2, ListX } from "lucide-react";
import { C } from "./theme";

const MO = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];

// тип события → иконка + цвет
export const EVENT_META = {
  created:       { icon: Plus,          color: C.muted,   label: "создана" },
  status:        { icon: Flag,          color: C.accent,    label: "статус" },
  due:           { icon: CalendarClock, color: C.info, label: "срок" },
  deleted:       { icon: Trash2,        color: C.danger,  label: "удалена" },
  stage_added:   { icon: ListPlus,      color: C.muted,   label: "этап" },
  stage_done:    { icon: CheckCircle2,  color: C.accent,    label: "этап" },
  stage_deleted: { icon: ListX,         color: C.faint,   label: "этап" },
};

export const fmtWhen = (iso) => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MO[d.getMonth()]}, ${hh}:${mm}`;
};

// одна строка события — используется в мини-истории цели и в общей ленте
export function EventLine({ e, showGoalName = false }) {
  const meta = EVENT_META[e.kind] || EVENT_META.status;
  const Icon = meta.icon;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <Icon size={14} style={{ color: meta.color, marginTop: 2, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, color: C.text }}>
          {showGoalName && <span style={{ fontWeight: 600 }}>{e.goal_name}: </span>}
          {e.detail || meta.label}
        </div>
        {e.reason && <div style={{ fontSize: 12, color: C.accentHot, marginTop: 1 }}>причина: {e.reason}</div>}
        <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{fmtWhen(e.created_at)}</div>
      </div>
    </div>
  );
}
