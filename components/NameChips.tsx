"use client";
// Friends' names as chips. Type + Enter/comma, or paste a whole list.
import { useState } from "react";
import { X } from "lucide-react";
import { Avatar } from "./ui";

export default function NameChips({ names, onChange, exclude, max = 11 }: { names: string[]; onChange: (n: string[]) => void; exclude?: string; max?: number }) {
  const [draft, setDraft] = useState("");
  const clean = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 40);

  function commit(raw: string) {
    const parts = raw.split(/[,\n;]+/).map(clean).filter(Boolean);
    const next = [...names];
    for (const p of parts) {
      const dup = next.some((n) => n.toLowerCase() === p.toLowerCase()) || (exclude && exclude.toLowerCase() === p.toLowerCase());
      if (!dup && next.length < max) next.push(p);
    }
    onChange(next);
    setDraft("");
  }

  return (
    <div className="chip-input" onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}>
      {names.map((n) => (
        <span key={n} className="chip static person">
          <Avatar name={n} size="sm" /> {n}
          <button type="button" className="x" style={{ background: "none", border: 0, cursor: "pointer", padding: 2 }}
            aria-label={`Remove ${n}`} onClick={() => onChange(names.filter((x) => x !== n))}>
            <X size={14} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        placeholder={names.length ? "Add another…" : "Type a name, press Enter"}
        enterKeyHint="done"
        onChange={(e) => (/[,\n;]/.test(e.target.value) ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); if (draft.trim()) commit(draft); }
          if (e.key === "Backspace" && !draft && names.length) onChange(names.slice(0, -1));
        }}
        onBlur={() => draft.trim() && commit(draft)}
        onPaste={(e) => { const t = e.clipboardData.getData("text"); if (/[,\n;]/.test(t)) { e.preventDefault(); commit(draft + t); } }}
        aria-label="Friend's name"
      />
    </div>
  );
}
