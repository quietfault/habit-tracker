import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, ArrowUp, ArrowDown, Target, Gem } from "lucide-react";
import { supabase } from "./supabaseClient";

const C = {
  bg: "#131319", surface: "#1C1C24", surface2: "#23232E", line: "#2E2E3A",
  text: "#EDEDF2", muted: "#8C8C9C", faint: "#3A3A48", gold: "#F5B544", goldHot: "#FFCB5C", danger: "#E0656B",
};
const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
const STATUS_COLOR = { not_started: C.faint, in_progress: C.goldHot, done: C.gold };
const STATUS_LABEL = { not_started: "не начата", in_progress: "в работе", done: "выполнена" };

export default function Values({ values = [], valueLinks = [], addValue, updateValue, removeValue, moveValue }) {
  const [goals, setGoals] = useState([]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");

  // цели грузим сами (только для обратной связи «ценность → её цели»)
  const load = useCallback(async () => {
    const { data } = await supabase.from("goals").select("id, name, status");
    setGoals(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  const goalsById = Object.fromEntries(goals.map((g) => [g.id, g]));
  const goalsForValue = (valueId) => valueLinks.filter((l) => l.value_id === valueId).map((l) => goalsById[l.goal_id]).filter(Boolean);

  const sorted = [...values].sort(bySort);

  const submitAdd = () => {
    const name = draftName.trim(); if (!name) return;
    addValue(name);
    // описание допишешь в «Править» — оставляем добавление максимально быстрым
    setDraftName(""); setDraftDesc(""); setAdding(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{values.length ? `${values.length} ценностей` : "ради чего всё это"}</span>
        <button onClick={() => setEditing((e) => !e)} style={iconBtn(editing ? C.gold : C.muted)}>
          {editing ? <X size={13} /> : <Pencil size={13} />} {editing ? "Готово" : "Править"}
        </button>
      </div>

      {values.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "44px 0", borderRadius: 16, background: C.surface, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Ценностей пока нет</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>То, ради чего ставятся цели. Добавь первую.</div>
          <button onClick={() => setAdding(true)} style={primaryBtn()}><Plus size={16} /> Добавить</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((v, i) => {
          const linkedGoals = goalsForValue(v.id);
          const bare = linkedGoals.length === 0;
          return (
            <div key={v.id} style={{ borderRadius: 16, background: C.surface, border: `1px solid ${C.line}`, padding: 14 }}>
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input className="ht-input" defaultValue={v.name}
                    onBlur={(e) => { const val = e.target.value.trim(); if (val && val !== v.name) updateValue(v.id, { name: val }); }}
                    style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 15, fontWeight: 600 }} />
                  <textarea className="ht-input" defaultValue={v.description || ""} rows={2}
                    onBlur={(e) => { const val = e.target.value.trim(); if (val !== (v.description || "")) updateValue(v.id, { description: val || null }); }}
                    placeholder="Описание…"
                    style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => moveValue(v, -1)} disabled={i === 0} style={miniBtn(i === 0)}><ArrowUp size={15} /></button>
                    <button onClick={() => moveValue(v, 1)} disabled={i === sorted.length - 1} style={miniBtn(i === sorted.length - 1)}><ArrowDown size={15} /></button>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => removeValue(v.id)} style={{ padding: 7, borderRadius: 9, color: C.danger, background: C.surface2, border: "none", cursor: "pointer", display: "flex" }}><Trash2 size={15} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: v.description ? 6 : 0 }}>
                    <Gem size={16} color={C.gold} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{v.name}</span>
                  </div>
                  {v.description && <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45, marginLeft: 24 }}>{v.description}</div>}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10, marginLeft: 24 }}>
                    {bare ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, color: C.gold, background: C.gold + "1F", padding: "2px 8px", borderRadius: 999 }}><Target size={10} /> нет целей</span>
                    ) : (
                      linkedGoals.map((g) => (
                        <span key={g.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "3px 8px", borderRadius: 999, background: C.surface2, border: `1px solid ${C.line}`, color: C.text }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: STATUS_COLOR[g.status], flexShrink: 0 }} title={STATUS_LABEL[g.status]} />
                          {g.name}
                        </span>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {values.length > 0 && !adding && (
        <button onClick={() => setAdding(true)} style={dashedBtn()}><Plus size={16} /> Новая ценность</button>
      )}
      {adding && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 16, background: C.surface, border: `1px solid ${C.gold}55` }}>
          <input autoFocus className="ht-input" value={draftName} onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); if (e.key === "Escape") { setAdding(false); setDraftName(""); } }}
            placeholder="Название ценности…" style={{ background: "transparent", border: "none", padding: "4px 4px", fontSize: 15, fontWeight: 600, color: C.text, outline: "none" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setAdding(false); setDraftName(""); }} style={{ padding: "7px 12px", borderRadius: 10, fontSize: 13, background: "transparent", color: C.muted, border: `1px solid ${C.line}`, cursor: "pointer" }}>Отмена</button>
            <button onClick={submitAdd} style={{ padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: C.gold, color: "#1A1208", border: "none", cursor: "pointer" }}>Добавить</button>
          </div>
          <div style={{ fontSize: 11.5, color: C.faint }}>Описание добавишь в режиме «Править».</div>
        </div>
      )}
    </div>
  );
}

function iconBtn(color) { return { display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, padding: "5px 8px", borderRadius: 8, color, background: "transparent", border: "none", cursor: "pointer" }; }
function miniBtn(disabled) { return { padding: 7, borderRadius: 9, color: disabled ? C.faint : C.text, background: C.surface2, border: `1px solid ${C.line}`, cursor: disabled ? "default" : "pointer", display: "flex", opacity: disabled ? 0.5 : 1 }; }
function primaryBtn() { return { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, fontWeight: 500, fontSize: 14, background: C.gold, color: "#1A1208", border: "none", cursor: "pointer" }; }
function dashedBtn() { return { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 16, fontSize: 14, fontWeight: 500, color: C.muted, border: `1px dashed ${C.line}`, background: "transparent", cursor: "pointer", marginTop: 10 }; }
