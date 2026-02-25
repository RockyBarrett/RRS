"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { buttonStyle, buttonPrimaryStyle, subtleText } from "@/app/admin/_ui";

type VarDef = {
  key: string; // e.g. "employee.first_name"
  label: string; // e.g. "First name"
  group: string; // e.g. "Employee"
  description: string; // tooltip/popover
  example: string; // preview example
};

type Props = {
  value: string; // stored template string with {{var}}
  onChange: (next: string) => void;

  // Optional: for preview mode
  previewValues?: Record<string, string>;

  // Optional: allow custom vars
  variables?: VarDef[];

  // ✅ NEW: HTML (rich) channel (optional wiring)
  valueHtml?: string;
  onChangeHtml?: (nextHtml: string) => void;
};

const DEFAULT_VARS: VarDef[] = [
  {
    group: "Employee",
    label: "First name",
    key: "employee.first_name",
    description: "Replaced with the employee’s first name.",
    example: "Michael",
  },
  {
    group: "Employee",
    label: "Last name",
    key: "employee.last_name",
    description: "Replaced with the employee’s last name.",
    example: "Smith",
  },
  {
    group: "Employee",
    label: "Email",
    key: "employee.email",
    description: "Replaced with the employee’s email.",
    example: "michael@company.com",
  },
  {
    group: "Employer",
    label: "Employer name",
    key: "employer.name",
    description: "Replaced with the employer/company name.",
    example: "Bar-All",
  },
  {
    group: "Employer",
    label: "Support email",
    key: "employer.support_email",
    description: "Replaced with the support email shown to employees.",
    example: "support@bar-all.com",
  },
  {
    group: "Program",
    label: "Effective date",
    key: "program.effective_date",
    description: "Replaced with the plan/program effective date.",
    example: "March 1, 2026",
  },
  {
    group: "Program",
    label: "Opt-out deadline",
    key: "program.opt_out_deadline",
    description: "Replaced with the opt-out deadline date.",
    example: "February 15, 2026",
  },
  {
    group: "Links",
    label: "Notice link",
    key: "links.notice",
    description: "The employee’s unique notice link.",
    example: "https://yourdomain.com/notice/abcdef123",
  },
  {
    group: "Links",
    label: "Learn more link",
    key: "links.learn_more",
    description: "The employee’s unique Learn More link.",
    example: "https://yourdomain.com/notice/abcdef123/learn-more",
  },
];

function normalizeVarKey(k: string) {
  return String(k || "").trim();
}

function varTokenText(key: string) {
  return `{{${normalizeVarKey(key)}}}`;
}

function tokenizeTemplate(input: string) {
  const re = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;
  const out: Array<{ type: "text"; value: string } | { type: "var"; key: string }> = [];

  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input)) !== null) {
    const start = m.index;
    const end = re.lastIndex;
    if (start > lastIndex) out.push({ type: "text", value: input.slice(lastIndex, start) });

    out.push({ type: "var", key: m[1] });
    lastIndex = end;
  }

  if (lastIndex < input.length) out.push({ type: "text", value: input.slice(lastIndex) });
  return out;
}

function createVarSpan(doc: Document, def: VarDef | undefined, key: string) {
  const span = doc.createElement("span");
  span.setAttribute("data-var", normalizeVarKey(key));
  span.setAttribute("contenteditable", "false");
  span.style.display = "inline-flex";
  span.style.alignItems = "center";
  span.style.gap = "6px";
  span.style.padding = "2px 8px";
  span.style.margin = "0 1px";
  span.style.borderRadius = "999px";
  span.style.border = "1px solid #bfdbfe";
  span.style.background = "#eff6ff";
  span.style.color = "#1e3a8a";
  span.style.fontWeight = "900";
  span.style.fontSize = "12px";
  span.style.lineHeight = "1.6";
  span.style.whiteSpace = "nowrap";
  span.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
  span.style.cursor = "pointer";
  span.title = def?.description || key;

  const dot = doc.createElement("span");
  dot.style.width = "6px";
  dot.style.height = "6px";
  dot.style.borderRadius = "999px";
  dot.style.background = "#3b82f6";
  dot.style.display = "inline-block";
  dot.style.opacity = "0.9";

  const txt = doc.createElement("span");
  txt.textContent = def?.label ? def.label : key;

  span.appendChild(dot);
  span.appendChild(txt);

  return span;
}

function setCaretAfter(node: Node) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.setEndAfter(node);
  sel.removeAllRanges();
  sel.addRange(range);
}

function extractTemplateFromEditor(root: HTMLElement) {
  let out = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent || "";
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      const key = el.getAttribute("data-var");
      if (key) {
        out += varTokenText(key);
        return;
      }

      if (el.tagName === "BR") {
        out += "\n";
        return;
      }

      const children = Array.from(el.childNodes);
      for (const c of children) walk(c);

      if (el.tagName === "DIV" || el.tagName === "P") out += "\n";
      return;
    }
  };

  const nodes = Array.from(root.childNodes);
  for (const n of nodes) walk(n);

  return out.replace(/\n{3,}/g, "\n\n").trimEnd();
}

// ✅ HTML extract while preserving {{var}} tokens
function extractHtmlFromEditor(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement;

  const pills = Array.from(clone.querySelectorAll("[data-var]")) as HTMLElement[];
  for (const pill of pills) {
    const key = pill.getAttribute("data-var") || "";
    pill.replaceWith(clone.ownerDocument.createTextNode(varTokenText(key)));
  }

  return clone.innerHTML;
}

// very light safety: strip script tags (this is an internal admin tool, but still)
function stripScripts(html: string) {
  return String(html || "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

function hydrateHtmlIntoEditor(root: HTMLElement, html: string, defsByKey: Map<string, VarDef>) {
  const doc = root.ownerDocument;
  root.innerHTML = stripScripts(html || "");

  // Replace any {{var}} occurrences inside TEXT NODES with pill spans
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);

  const re = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

  for (const tn of textNodes) {
    const text = tn.nodeValue || "";
    if (!re.test(text)) continue;

    re.lastIndex = 0;

    const frag = doc.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = re.lastIndex;

      if (start > last) frag.appendChild(doc.createTextNode(text.slice(last, start)));

      const key = normalizeVarKey(m[1]);
      const def = defsByKey.get(key);
      frag.appendChild(createVarSpan(doc, def, key));

      last = end;
    }

    if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));

    tn.parentNode?.replaceChild(frag, tn);
  }

  if (root.childNodes.length === 0) root.appendChild(doc.createTextNode(""));
}

function renderTemplateToEditor(root: HTMLElement, template: string, defsByKey: Map<string, VarDef>) {
  const doc = root.ownerDocument;
  root.innerHTML = "";

  const parts = tokenizeTemplate(template || "");
  for (const p of parts) {
    if (p.type === "text") {
      const lines = p.value.split("\n");
      lines.forEach((line, idx) => {
        root.appendChild(doc.createTextNode(line));
        if (idx < lines.length - 1) root.appendChild(doc.createElement("br"));
      });
    } else {
      const def = defsByKey.get(normalizeVarKey(p.key));
      const span = createVarSpan(doc, def, p.key);
      root.appendChild(span);
    }
  }

  if (root.childNodes.length === 0) {
    root.appendChild(doc.createTextNode(""));
  }
}

function getNodeBeforeCaret(root: HTMLElement): Node | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;

  const { startContainer, startOffset } = range;

  if (startContainer.nodeType === Node.TEXT_NODE) {
    if (startOffset > 0) return null;
    return startContainer.previousSibling;
  }

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const el = startContainer as Element;
    const idx = startOffset - 1;
    if (idx >= 0) return el.childNodes[idx] || null;
  }

  return null;
}

function getNodeAfterCaret(root: HTMLElement): Node | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;

  const { startContainer, startOffset } = range;

  if (startContainer.nodeType === Node.TEXT_NODE) {
    const text = startContainer.textContent || "";
    if (startOffset < text.length) return null;
    return startContainer.nextSibling;
  }

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const el = startContainer as Element;
    return el.childNodes[startOffset] || null;
  }

  return null;
}

export default function TemplateEditor({
  value,
  onChange,
  previewValues,
  variables,
  valueHtml,
  onChangeHtml,
}: Props) {
  const vars = variables ?? DEFAULT_VARS;

  const defsByKey = useMemo(() => {
    const m = new Map<string, VarDef>();
    for (const v of vars) m.set(normalizeVarKey(v.key), v);
    return m;
  }, [vars]);

  const grouped = useMemo(() => {
    const g = new Map<string, VarDef[]>();
    for (const v of vars) {
      const arr = g.get(v.group) ?? [];
      arr.push(v);
      g.set(v.group, arr);
    }
    return Array.from(g.entries()).map(([group, items]) => ({ group, items }));
  }, [vars]);

  const editorRef = useRef<HTMLDivElement | null>(null);

  // ✅ Keep a live html buffer so preview shows bold immediately even before DB wiring
  const [liveHtml, setLiveHtml] = useState<string>("");

  // Variable popover
  const [pillOpen, setPillOpen] = useState<{
    key: string;
    x: number;
    y: number;
    label: string;
    description: string;
    example: string;
  } | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
  const root = editorRef.current;
  if (!root) return;

  const incomingHtml = (valueHtml || "").trim();

  // Prefer saved HTML (keeps bold/italic/colors on re-open)
  if (incomingHtml) {
  const currentHtml = stripScripts(extractHtmlFromEditor(root)).trim();
  const wantedHtml = stripScripts(incomingHtml).trim();

  if (currentHtml !== wantedHtml) {
    hydrateHtmlIntoEditor(root, incomingHtml, defsByKey);
  }

  // ✅ always sync liveHtml (even if no changes needed)
  setLiveHtml(extractHtmlFromEditor(root));
  return;
}

  // Fallback to text rendering
  const current = extractTemplateFromEditor(root);
  if (current !== (value || "")) {
    renderTemplateToEditor(root, value || "", defsByKey);
    setLiveHtml(extractHtmlFromEditor(root));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [value, valueHtml, defsByKey]);

  function notifyChange() {
    const root = editorRef.current;
    if (!root) return;

    const nextText = extractTemplateFromEditor(root);
    onChange(nextText);

    const nextHtml = extractHtmlFromEditor(root);
    setLiveHtml(nextHtml);
    if (onChangeHtml) onChangeHtml(nextHtml);
  }

  function insertVariable(key: string) {
    const root = editorRef.current;
    if (!root) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const def = defsByKey.get(normalizeVarKey(key));
    const span = createVarSpan(document, def, key);

    range.insertNode(span);

    const space = document.createTextNode(" ");
    span.after(space);

    setCaretAfter(space);
    notifyChange();
  }

  function applyPreviewText(template: string) {
    const map = previewValues ?? {};
    return String(template || "").replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, k) => {
      const key = normalizeVarKey(k);
      if (map[key] != null) return String(map[key]);
      const def = defsByKey.get(key);
      return def?.example ?? "";
    });
  }

  function applyPreviewHtml(html: string) {
    const map = previewValues ?? {};
    const replaced = String(html || "").replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, k) => {
      const key = normalizeVarKey(k);
      if (map[key] != null) return String(map[key]);
      const def = defsByKey.get(key);
      return def?.example ?? "";
    });
    return stripScripts(replaced);
  }

  function exec(cmd: string, val?: string) {
    const root = editorRef.current;
    if (!root) return;
    root.focus();

    try {
      // @ts-ignore
      document.execCommand(cmd, false, val);
    } catch {
      // ignore
    }

    // allow DOM to update, then extract
    setTimeout(() => notifyChange(), 0);
  }

  function doLink() {
    const url = window.prompt("Paste link URL (https://...):", "https://");
    if (!url) return;
    exec("createLink", url);
  }

  const toolBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,

  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#ffffff",

  color: "#0f172a",          // ✅ makes labels visible
  fontWeight: 900,
  fontSize: 12,
  lineHeight: 1,

  cursor: "pointer",
  userSelect: "none",
};

  const colorDot = (c: string): React.CSSProperties => ({
    width: 16,
    height: 16,
    borderRadius: 999,
    background: c,
    border: "1px solid #e2e8f0",
    display: "inline-block",
  });

  // Prefer saved HTML if parent provides it; otherwise use liveHtml
  const htmlForPreview = valueHtml && valueHtml.trim().length ? valueHtml : liveHtml;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Top controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, color: "#0f172a" }}>Template</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setPreview((p) => !p)}
            style={{
              ...buttonStyle,
              fontWeight: 900,
              background: preview ? "#0f172a" : "#ffffff",
              color: preview ? "#ffffff" : "#0f172a",
              border: preview ? "1px solid #0f172a" : "1px solid #e2e8f0",
            }}
          >
            {preview ? "Previewing" : "Preview"}
          </button>

          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen((o) => !o)} style={{ ...buttonPrimaryStyle, fontWeight: 900 }}>
              Insert variable ▾
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  width: 320,
                  maxHeight: 320,
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  boxShadow: "0 18px 40px rgba(15,23,42,0.14)",
                  padding: 10,
                  zIndex: 50,
                }}
                onWheelCapture={(e) => {
                  e.stopPropagation();
                }}
              >
                {grouped.map((g) => (
                  <div key={g.group} style={{ padding: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>{g.group}</div>

                    <div style={{ display: "grid", gap: 6 }}>
                      {g.items.map((v) => (
                        <button
                          key={v.key}
                          onClick={() => {
                            insertVariable(v.key);
                            setMenuOpen(false);
                          }}
                          style={{
                            textAlign: "left",
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            cursor: "pointer",
                            fontWeight: 800,
                            color: "#0f172a",
                          }}
                          title={v.description}
                        >
                          {v.label}
                          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 2 }}>{v.key}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 8, ...subtleText, fontSize: 12, padding: "0 6px 4px 6px" }}>
                  Tip: variables are stored like{" "}
                  <strong style={{ color: "#0f172a" }}>{`{{employee.first_name}}`}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ NEW: formatting toolbar (hidden in preview) */}
      {!preview && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={toolBtn} onClick={() => exec("bold")} title="Bold">
  Bold
</button>
<button style={toolBtn} onClick={() => exec("italic")} title="Italic">
  Italic
</button>
<button style={toolBtn} onClick={() => exec("underline")} title="Underline">
  Underline
</button>
<button style={toolBtn} onClick={doLink} title="Insert link">
  Link
</button>
<button style={toolBtn} onClick={() => exec("removeFormat")} title="Remove formatting">
  Clear
</button>

<div style={{ width: 1, height: 24, background: "#e2e8f0", margin: "0 4px" }} />

<div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Text color</div>

<button style={toolBtn} onClick={() => exec("foreColor", "#111827")} title="Default">
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <span style={colorDot("#111827")} />
    Default
  </span>
</button>

<button style={toolBtn} onClick={() => exec("foreColor", "#1d4ed8")} title="Blue">
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <span style={colorDot("#1d4ed8")} />
    Blue
  </span>
</button>

<button style={toolBtn} onClick={() => exec("foreColor", "#15803d")} title="Green">
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <span style={colorDot("#15803d")} />
    Green
  </span>
</button>

<button style={toolBtn} onClick={() => exec("foreColor", "#b91c1c")} title="Red">
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <span style={colorDot("#b91c1c")} />
    Red
  </span>
</button>
        </div>
      )}

      {/* Editor / Preview */}
      <div style={{ position: "relative" }}>
        {/* EDIT MODE */}
        <div style={{ display: preview ? "none" : "block" }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={() => {
              setPillOpen(null);
              notifyChange();
            }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const pill = target.closest?.("[data-var]") as HTMLElement | null;
              if (!pill) {
                setPillOpen(null);
                return;
              }

              const key = pill.getAttribute("data-var") || "";
              const def = defsByKey.get(normalizeVarKey(key));
              const r = pill.getBoundingClientRect();

              setPillOpen({
                key,
                x: Math.min(r.left, window.innerWidth - 340),
                y: r.bottom + 8,
                label: def?.label || key,
                description: def?.description || key,
                example: def?.example || "",
              });
            }}
            onKeyDown={(e) => {
              const root = editorRef.current;
              if (!root) return;

              if (e.key === "Backspace") {
                const before = getNodeBeforeCaret(root);
                const el = before && before.nodeType === Node.ELEMENT_NODE ? (before as HTMLElement) : null;
                if (el?.getAttribute?.("data-var")) {
                  e.preventDefault();
                  el.remove();
                  notifyChange();
                  return;
                }
              }

              if (e.key === "Delete") {
                const after = getNodeAfterCaret(root);
                const el = after && after.nodeType === Node.ELEMENT_NODE ? (after as HTMLElement) : null;
                if (el?.getAttribute?.("data-var")) {
                  e.preventDefault();
                  el.remove();
                  notifyChange();
                  return;
                }
              }

              if (e.key === "Escape") {
                setMenuOpen(false);
                setPillOpen(null);
              }
            }}
            style={{
              width: "100%",
              minHeight: 220,
              padding: 14,
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
              outline: "none",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#0f172a",
              whiteSpace: "pre-wrap",
            }}
          />
        </div>

        {/* PREVIEW MODE */}
        <div style={{ display: preview ? "block" : "none" }}>
          <div
            style={{
              width: "100%",
              minHeight: 220,
              padding: 14,
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#0f172a",
              whiteSpace: "pre-wrap",
            }}
          >
            {htmlForPreview && htmlForPreview.trim().length ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: applyPreviewHtml(htmlForPreview),
                }}
              />
            ) : (
              <div style={{ whiteSpace: "pre-wrap" }}>{applyPreviewText(value || "")}</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...subtleText, fontSize: 12, lineHeight: 1.5 }}>
        Variables are protected pills. Backspace/Delete removes the whole variable.
      </div>

      {/* Pill popover */}
      {pillOpen && (
        <div onClick={() => setPillOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: pillOpen.x,
              top: pillOpen.y,
              width: 330,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              boxShadow: "0 18px 40px rgba(15,23,42,0.14)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>{pillOpen.label}</div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, marginBottom: 8 }}>
              {varTokenText(pillOpen.key)}
            </div>

            <div style={{ ...subtleText, fontSize: 13, lineHeight: 1.5 }}>{pillOpen.description}</div>

            {pillOpen.example && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>Example</div>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    color: "#0f172a",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {pillOpen.example}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button onClick={() => setPillOpen(null)} style={buttonStyle}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}