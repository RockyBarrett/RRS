"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buttonStyle, buttonPrimaryStyle, subtleText } from "@/app/admin/_ui";
import TemplateEditor from "./template-editor";

type TemplateRow = {
  id: string;
  name: string;
  category: "enrollment" | "compliance";
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

function fmt(ts: string | null | undefined) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function TemplatesClient() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"enrollment" | "compliance">("enrollment");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const editing = useMemo(
    () => templates.find((t) => t.id === editingId) || null,
    [templates, editingId]
  );

  // ✅ Variables we support (v1)
  const variableCatalog = useMemo(
    () => [
      { label: "Employee first name", key: "employee.first_name", example: "Michael" },
      { label: "Employee last name", key: "employee.last_name", example: "Smith" },
      { label: "Employee email", key: "employee.email", example: "michael@company.com" },

      { label: "Employer name", key: "employer.name", example: "Bar-All" },
      { label: "Support email", key: "employer.support_email", example: "support@bar-all.com" },

      { label: "Effective date", key: "program.effective_date", example: "March 1, 2026" },
      { label: "Opt-out deadline", key: "program.opt_out_deadline", example: "February 15, 2026" },

      { label: "Notice link", key: "links.notice", example: "https://yourdomain.com/notice/abcdef123" },
      { label: "Learn more link", key: "links.learn_more", example: "https://yourdomain.com/notice/abcdef123/learn-more" },
    ],
    []
  );

  const previewValues = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of variableCatalog) m[v.key] = v.example;
    return m;
  }, [variableCatalog]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/templates", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load templates");
      setTemplates((data?.templates ?? []) as TemplateRow[]);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditingId(null);
    setName("");
    setCategory("enrollment");
    setSubject("");
    setBody("");
    setMsg(null);
  }

  function startEdit(t: TemplateRow) {
    setEditingId(t.id);
    setName(t.name);
    setCategory(t.category);
    setSubject(t.subject);
    setBody(t.body);
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);

    try {
      const payload = {
        name: name.trim(),
        category,
        subject: subject.trim(),
        body: body.trim(),
      };

      if (!payload.name) throw new Error("Name is required");
      if (!payload.subject) throw new Error("Subject is required");
      if (!payload.body) throw new Error("Body is required");

      if (!editingId) {
        // create
        const res = await fetch("/api/admin/templates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Create failed");

        setMsg("Template created.");
        await load();

        const created = (data?.template ?? null) as TemplateRow | null;
        if (created?.id) setEditingId(created.id);
      } else {
        // update
        const res = await fetch(`/api/admin/templates/${editingId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Update failed");

        setMsg("Saved.");
        await load();
      }
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function archive(id: string) {
    if (!confirm("Archive this template?")) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Archive failed");
      setMsg("Archived.");
      if (editingId === id) startNew();
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Archive failed");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    outline: "none",
    fontSize: 14,
    color: "#0f172a",
    background: "#ffffff",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 6,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
      {/* Left: list */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            background: "#f8fafc",
          }}
        >
          <div style={{ fontWeight: 900 }}>Templates</div>
          <button onClick={startNew} style={buttonPrimaryStyle} disabled={saving}>
            + New
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 12, ...subtleText }}>Loading…</div>
        ) : templates.length === 0 ? (
          <div style={{ padding: 12 }}>
            <div style={{ ...subtleText, marginBottom: 10 }}>
              No templates yet. Start with a ready-to-use template:
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <button
                onClick={() => {
                  startNew();
                  setCategory("enrollment");
                  setName("Enrollment – Standard Notice");
                  setSubject("Important: Your Benefits Notice for {{employer.name}}");
                  setBody(
`Hi {{employee.first_name}},

{{employer.name}} is implementing a payroll-based benefits program that may increase your take-home pay.

Your notice link:
{{links.notice}}

If you have questions, contact: {{employer.support_email}}

Thank you,
HR Team`
                  );
                }}
                style={{ ...buttonPrimaryStyle, textAlign: "left", justifyContent: "flex-start" }}
              >
                + Enrollment – Standard Notice
              </button>

              <button
                onClick={() => {
                  startNew();
                  setCategory("enrollment");
                  setName("Enrollment – Reminder #2");
                  setSubject("Reminder: Please review your notice (deadline {{program.opt_out_deadline}})");
                  setBody(
`Hi {{employee.first_name}},

This is a reminder to review your benefits notice.

Notice link:
{{links.notice}}

Opt-out deadline: {{program.opt_out_deadline}}

Questions: {{employer.support_email}}`
                  );
                }}
                style={{ ...buttonStyle, textAlign: "left" }}
              >
                + Enrollment – Reminder #2
              </button>

              <button
                onClick={() => {
                  startNew();
                  setCategory("compliance");
                  setName("Compliance – Action Needed");
                  setSubject("Action needed: Please review your benefits notice");
                  setBody(
`Hi {{employee.first_name}},

Our records show you still need to review your benefits notice.

Notice link:
{{links.notice}}

If you already reviewed it, you can ignore this message.

Questions: {{employer.support_email}}`
                  );
                }}
                style={{ ...buttonStyle, textAlign: "left" }}
              >
                + Compliance – Action Needed
              </button>
            </div>
          </div>
        ) : (
          <div>
            {templates.map((t) => {
              const active = t.id === editingId;
              return (
                <div
                  key={t.id}
                  onClick={() => startEdit(t)}
                  style={{
                    padding: 12,
                    borderTop: "1px solid #e2e8f0",
                    cursor: "pointer",
                    background: active ? "#eef2ff" : "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{t.name}</div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid #e2e8f0",
                        background: t.category === "enrollment" ? "#ecfeff" : "#f5f3ff",
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        opacity: t.is_active ? 1 : 0.55,
                      }}
                    >
                      {t.category}
                      {!t.is_active ? " (archived)" : ""}
                    </div>
                  </div>

                  <div style={{ ...subtleText, fontSize: 12, marginTop: 6 }}>
                    Updated: <strong style={{ color: "#0f172a" }}>{fmt(t.updated_at)}</strong>
                  </div>

                  <div
                    style={{
                      ...subtleText,
                      fontSize: 12,
                      marginTop: 6,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Subject: <strong style={{ color: "#0f172a" }}>{t.subject}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: editor */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            background: "#ffffff",
          }}
        >
          <div style={{ fontWeight: 900 }}>{editing ? "Edit Template" : "New Template"}</div>
          {editing && (
            <button onClick={() => archive(editing.id)} style={buttonStyle} disabled={saving}>
              Archive
            </button>
          )}
        </div>

        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={labelStyle}>Template name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={labelStyle}>Category</div>
            <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={inputStyle}>
              <option value="enrollment">Enrollment</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={labelStyle}>Subject</div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={labelStyle}>Body</div>
            <TemplateEditor value={body} onChange={setBody} previewValues={previewValues} />
            <div style={{ ...subtleText, fontSize: 12, lineHeight: 1.6 }}>
              Tip: Insert protected variables like <code>{"{{employee.first_name}}"}</code> and{" "}
              <code>{"{{links.notice}}"}</code>.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                ...buttonPrimaryStyle,
                opacity: saving ? 0.6 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Create template"}
            </button>

            <button onClick={load} disabled={saving} style={buttonStyle}>
              Reload
            </button>

            {msg && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid " + (msg.toLowerCase().includes("fail") ? "#fecaca" : "#a7f3d0"),
                  background: msg.toLowerCase().includes("fail") ? "#fef2f2" : "#ecfdf5",
                  color: msg.toLowerCase().includes("fail") ? "#991b1b" : "#065f46",
                  fontWeight: 800,
                }}
              >
                {msg}
              </div>
            )}
          </div>

          {editing && (
            <div style={{ ...subtleText, fontSize: 12 }}>
              Last updated: <strong style={{ color: "#0f172a" }}>{fmt(editing.updated_at)}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}