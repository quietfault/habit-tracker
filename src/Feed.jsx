import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { EventLine } from "./events.jsx";

const C = {
  surface: "#1C1C24", line: "#2E2E3A", text: "#EDEDF2", muted: "#8C8C9C", faint: "#3A3A48",
};
const MO = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const dayLabel = (iso) => {
  const d = new Date(iso); const t = new Date();
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const y = new Date(t); y.setDate(t.getDate() - 1);
  if (same(d, t)) return "Сегодня";
  if (same(d, y)) return "Вчера";
  return `${d.getDate()} ${MO[d.getMonth()]} ${d.getFullYear()}`;
};

export default function Feed() {
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("goal_events").select("*").order("created_at", { ascending: false });
    setEvents(data || []); setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loaded && events.length === 0)
    return <div style={{ color: C.muted, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Пока пусто. Здесь будет история изменений целей — постановка, сдвиги сроков, выполнение.</div>;

  // группировка по дню
  const groups = [];
  let cur = null;
  events.forEach((e) => {
    const k = dayKey(e.created_at);
    if (!cur || cur.key !== k) { cur = { key: k, label: dayLabel(e.created_at), items: [] }; groups.push(cur); }
    cur.items.push(e);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {groups.map((g) => (
        <div key={g.key}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 10 }}>{g.label}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, borderRadius: 16, background: C.surface, border: `1px solid ${C.line}` }}>
            {g.items.map((e) => <EventLine key={e.id} e={e} showGoalName />)}
          </div>
        </div>
      ))}
    </div>
  );
}
