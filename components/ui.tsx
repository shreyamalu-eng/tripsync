"use client";
// Small shared UI pieces: avatars, illustrated scenes (photo fallback), progress ring, toast.
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

type SceneKind = "mountains" | "beach" | "city" | "nature" | "desert" | "hero";
export function sceneFor(tags: string[]): SceneKind {
  if (tags.includes("beach")) return "beach";
  if (tags.includes("mountains")) return "mountains";
  if (tags.includes("city") || tags.includes("heritage")) return "city";
  return "nature";
}

/** Illustrated landscape. Used on the landing hero and whenever a destination photo is unavailable. */
export function Scene({ kind, seed = 0 }: { kind: SceneKind; seed?: number }) {
  const id = `g${kind}${seed}`;
  const skies: Record<SceneKind, [string, string]> = {
    hero: ["#9fc9b0", "#f3d9a4"],
    mountains: ["#8fb8c9", "#e8ecd9"],
    beach: ["#7cc3d6", "#f6e3b4"],
    city: ["#e9a77c", "#f5dcb2"],
    nature: ["#a5cfa8", "#eef0d2"],
    desert: ["#f0b27a", "#f8e1b0"],
  };
  const [a, b] = skies[kind];
  return (
    <svg className="scene" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${id})`} />
      <circle cx={kind === "city" ? 300 : 290} cy={kind === "beach" ? 120 : 78} r="30" fill="#fff4d6" opacity="0.95" />
      {(kind === "mountains" || kind === "hero" || kind === "nature") && (
        <>
          <path d="M0 170 L70 90 L120 140 L190 60 L260 150 L320 95 L400 160 L400 260 L0 260Z" fill="#5f8f7a" opacity="0.55" />
          <path d="M190 60 L210 84 L198 82 L186 92 L176 78Z" fill="#fff" opacity="0.8" />
          <path d="M0 200 L90 130 L160 185 L240 120 L330 190 L400 150 L400 260 L0 260Z" fill="#2d5a44" />
          <path d="M0 230 C80 205 160 245 240 222 C300 206 350 232 400 220 L400 260 L0 260Z" fill="#1f3d2f" />
          {[40, 62, 330, 352, 372].map((x, i) => (
            <path key={i} d={`M${x} ${226 - (i % 2) * 6} l10 -30 l10 30z`} fill="#16301f" />
          ))}
        </>
      )}
      {kind === "beach" && (
        <>
          <path d="M0 150 C100 140 300 160 400 146 L400 260 L0 260Z" fill="#3f9bb3" />
          <path d="M0 172 C120 160 260 182 400 168 L400 260 L0 260Z" fill="#62b6c8" opacity="0.8" />
          <path d="M0 205 C120 190 280 214 400 196 L400 260 L0 260Z" fill="#efd8a6" />
          <path d="M70 205 C74 170 80 150 96 130" stroke="#5b3e22" strokeWidth="5" fill="none" />
          <path d="M96 130 c-20 -4 -34 6 -40 14 M96 130 c18 -8 32 -2 40 8 M96 130 c-6 -16 -20 -22 -30 -22 M96 130 c10 -14 24 -16 34 -12" stroke="#2d5a44" strokeWidth="7" strokeLinecap="round" fill="none" />
        </>
      )}
      {kind === "city" && (
        <>
          <path d="M0 190 L400 190 L400 260 L0 260Z" fill="#7b4b35" opacity="0.35" />
          <g fill="#7a3f2c">
            <rect x="40" y="130" width="46" height="70" rx="3" />
            <rect x="96" y="110" width="30" height="90" />
            <path d="M160 200 V140 a40 40 0 0 1 80 0 V200Z" />
            <rect x="196" y="92" width="8" height="16" />
            <rect x="260" y="120" width="40" height="80" />
            <rect x="310" y="145" width="50" height="55" rx="3" />
          </g>
          <path d="M0 214 C100 200 300 226 400 208 L400 260 L0 260Z" fill="#4a2a1d" />
        </>
      )}
    </svg>
  );
}

export function Ring({ done, total }: { done: number; total: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg width="78" height="78">
        <circle cx="39" cy="39" r={r} fill="none" stroke="#efebdd" strokeWidth="7" />
        <circle cx="39" cy="39" r={r} fill="none" stroke="#2b7a4b" strokeWidth="7" strokeLinecap="round"
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
