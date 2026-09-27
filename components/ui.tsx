"use client";
// Small shared UI pieces: avatars, progress ring, toast.
import { useEffect, useState } from "react";
import { Check, Clock3 } from "lucide-react";

const AV = ["#2d5a44", "#b5651d", "#3a5ba0", "#8a3f6f", "#2f7f7a", "#7a5c1e", "#5b4a9e", "#a1403a", "#4f7a28", "#1f6f8b", "#8b5a2b", "#6a4c93"];
export function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AV[h % AV.length];
}
export const initials = (n: string) =>
  n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

export function Avatar({
  name, size, status, ring, dim,
}: { name: string; size?: "sm" | "lg"; status?: "done" | "wait"; ring?: "works" | "stretch" | "no"; dim?: boolean }) {
  return (
    <span className={`av ${size ?? ""} ${ring ? "ring-" + ring : ""} ${dim ? "dim" : ""}`} style={{ background: colorFor(name) }} title={name}>
      {initials(name)}
      {status && (
        <span className={`badge ${status}`}>{status === "done" ? <Check size={11} strokeWidth={3} /> : <Clock3 size={10} />}</span>
      )}
    </span>
  );
}

export function Ring({ done, total }: { done: number; total: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg width="78" height="78">
        <circle cx="39" cy="39" r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="7" />
        <circle cx="39" cy="39" r={r} fill="none" stroke="var(--ring, #2b7a4b)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - (total ? done / total : 0))} style={{ transition: "stroke-dashoffset .5s" }} />
      </svg>
      <div className="lbl"><div>{done}/{total}<small>in</small></div></div>
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return { toast: setMsg, node: msg ? <div className="toast" role="status">{msg}</div> : null };
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const inrK = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L` : `₹${Math.round(n / 1000)}k`);

export const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
export const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
export const safeDel = (k: string) => { try { localStorage.removeItem(k); } catch {} };

export function waLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
