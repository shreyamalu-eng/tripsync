// DATABASE layer. One interface, two backends:
// - Supabase (production, when SUPABASE_URL + SUPABASE_SECRET_KEY are set)
// - Local JSON file (development / testing without any accounts)
// Only the server ever talks to the database; the browser never gets DB keys.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import type { Preference, Trip, TripOption, Vote } from "./types";

export interface Store {
  createTrip(t: Trip): Promise<void>;
  getTrip(id: string): Promise<Trip | null>;
  updateTrip(id: string, patch: Partial<Trip>): Promise<void>;
  getPreferences(tripId: string): Promise<Preference[]>;
  upsertPreference(p: Preference): Promise<void>;
  deletePreference(tripId: string, member: string): Promise<void>;
  getOptions(tripId: string): Promise<TripOption[]>;
  replaceOptions(tripId: string, opts: TripOption[]): Promise<void>;
  getVotes(tripId: string): Promise<Vote[]>;
  upsertVote(v: Vote): Promise<void>;
  clearVotes(tripId: string): Promise<void>;
  kind: "supabase" | "local";
}

// The newer preference fields (abroad, styles, must-haves, places) live inside the existing
// destination_types text[] column as prefixed entries ("style:party", "place:Bali"), so no
// database migration is needed. Only this file knows about the packing.
const PREFIX = { styles: "style:", must_haves: "must:", places: "place:", abroad: "abroad:", bmin: "bmin:", pace: "pace:", stay: "stay:", passport: "passport:" } as const;

function packPref(p: Preference) {
  const { abroad, styles = [], must_haves = [], places = [], budget_min, pace, stay, passport, ...rest } = p;
  return {
    ...rest,
    destination_types: [
      ...p.destination_types,
      ...styles.map((x) => PREFIX.styles + x),
      ...must_haves.map((x) => PREFIX.must_haves + x),
      ...places.map((x) => PREFIX.places + x),
      ...(abroad ? [PREFIX.abroad + abroad] : []),
      ...(budget_min ? [PREFIX.bmin + budget_min] : []),
      ...(pace ? [PREFIX.pace + pace] : []),
      ...(stay ? [PREFIX.stay + stay] : []),
      ...(passport ? [PREFIX.passport + "1"] : []),
    ],
  };
}

function unpackPref(row: Preference): Preference {
  const all = row.destination_types ?? [];
  const pick = (pre: string) => all.filter((x) => x.startsWith(pre)).map((x) => x.slice(pre.length));
  const abroad = pick(PREFIX.abroad)[0] as Preference["abroad"];
  return {
    ...row,
    destination_types: all.filter((x) => !x.includes(":")),
    styles: pick(PREFIX.styles),
    must_haves: pick(PREFIX.must_haves),
    places: pick(PREFIX.places),
    abroad: abroad ?? "no",
    budget_min: Number(pick(PREFIX.bmin)[0]) || undefined,
    pace: (pick(PREFIX.pace)[0] as Preference["pace"]) || undefined,
    stay: (pick(PREFIX.stay)[0] as Preference["stay"]) || undefined,
    passport: pick(PREFIX.passport)[0] === "1",
  };
}

// Trip settings ride along as a marker entry at the end of date_windows.
const SETTINGS = "~settings";
function packTrip<T extends Partial<Trip>>(t: T) {
  const { settings, ...rest } = t;
  if (!("date_windows" in t) && !settings) return rest;
  const windows = (t.date_windows ?? []).filter((w) => w.id !== SETTINGS);
  return settings ? { ...rest, date_windows: [...windows, { id: SETTINGS, label: "", start: "", end: "", ...settings }] } : { ...rest, date_windows: windows };
}
function unpackTrip(row: Trip): Trip {
  const all = (row.date_windows ?? []) as (Trip["date_windows"][number] & Record<string, unknown>)[];
  const s = all.find((w) => w.id === SETTINGS);
  const { id, label, start, end, ...settings } = s ?? ({} as Record<string, unknown>);
  return { ...row, date_windows: all.filter((w) => w.id !== SETTINGS), settings: s ? (settings as Trip["settings"]) : {} };
}

// Same idea for options: the newer option fields ride along inside the estimates jsonb under "~meta".
const META = "~meta";
function packOpt(o: TripOption) {
  const { international, visa, has, suggested_by, lat, lon, season, ...rest } = o;
  return { ...rest, estimates: { ...o.estimates, [META]: { international, visa, has, suggested_by, lat, lon, season } } };
}
function unpackOpt(row: TripOption): TripOption {
  const { [META]: meta, ...estimates } = (row.estimates ?? {}) as Record<string, any>;
  return { ...row, estimates, ...(meta ?? {}) };
}

// ---------- Supabase ----------
class SupabaseStore implements Store {
  kind = "supabase" as const;
  db: SupabaseClient;
  constructor(url: string, key: string) {
    this.db = createClient(url, key, { auth: { persistSession: false } });
  }
  private check<T>(res: { data: T; error: { message: string } | null }): T {
    if (res.error) throw new Error("Database error: " + res.error.message);
    return res.data;
  }
  async createTrip(t: Trip) {
    this.check(await this.db.from("trips").insert(packTrip(t)));
  }
  async getTrip(id: string) {
    const rows = this.check(await this.db.from("trips").select("*").eq("id", id).limit(1));
    return rows?.[0] ? unpackTrip(rows[0] as Trip) : null;
  }
  async updateTrip(id: string, patch: Partial<Trip>) {
    // Rewriting date_windows must keep the settings marker that lives inside it.
    if ("date_windows" in patch && !patch.settings) patch = { ...patch, settings: (await this.getTrip(id))?.settings };
    this.check(await this.db.from("trips").update(packTrip(patch)).eq("id", id));
  }
  async getPreferences(tripId: string) {
    return ((this.check(await this.db.from("preferences").select("*").eq("trip_id", tripId)) ?? []) as Preference[]).map(unpackPref);
  }
  async upsertPreference(p: Preference) {
    this.check(await this.db.from("preferences").upsert(packPref(p), { onConflict: "trip_id,member" }));
  }
  async deletePreference(tripId: string, member: string) {
    this.check(await this.db.from("preferences").delete().eq("trip_id", tripId).eq("member", member));
  }
  async getOptions(tripId: string) {
    return ((this.check(
      await this.db.from("options").select("*").eq("trip_id", tripId).order("rank")
    ) ?? []) as TripOption[]).map(unpackOpt);
  }
  async replaceOptions(tripId: string, opts: TripOption[]) {
    this.check(await this.db.from("options").delete().eq("trip_id", tripId));
    if (opts.length) this.check(await this.db.from("options").insert(opts.map(packOpt)));
  }
  async getVotes(tripId: string) {
    return (this.check(await this.db.from("votes").select("*").eq("trip_id", tripId)) ?? []) as Vote[];
  }
  async upsertVote(v: Vote) {
    this.check(await this.db.from("votes").upsert(v, { onConflict: "trip_id,member,option_id" }));
  }
  async clearVotes(tripId: string) {
    this.check(await this.db.from("votes").delete().eq("trip_id", tripId));
  }
}

// ---------- Local JSON file (dev only) ----------
type LocalDB = { trips: Trip[]; preferences: Preference[]; options: TripOption[]; votes: Vote[] };

class LocalStore implements Store {
  kind = "local" as const;
  file = path.join(process.cwd(), ".data", "db.json");
  mem: LocalDB | null = null;
  // Re-read the file every time: in dev each API route can hold its own copy of this module,
  // so a cached copy would go stale. Falls back to memory where the disk is read-only.
  private load(): LocalDB {
    try {
      this.mem = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      this.mem ??= { trips: [], preferences: [], options: [], votes: [] };
    }
    return this.mem!;
  }
  private save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.mem, null, 2));
    } catch {
      // read-only filesystem (e.g. Vercel without Supabase) - keep in memory only
    }
  }
  async createTrip(t: Trip) {
    this.load().trips.push(t);
    this.save();
  }
  async getTrip(id: string) {
    return this.load().trips.find((t) => t.id === id) ?? null;
  }
  async updateTrip(id: string, patch: Partial<Trip>) {
    const t = this.load().trips.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
    this.save();
  }
  async getPreferences(tripId: string) {
    return this.load().preferences.filter((p) => p.trip_id === tripId);
  }
  async upsertPreference(p: Preference) {
    const db = this.load();
    db.preferences = db.preferences.filter((x) => !(x.trip_id === p.trip_id && x.member === p.member));
    db.preferences.push(p);
    this.save();
  }
  async deletePreference(tripId: string, member: string) {
    const db = this.load();
    db.preferences = db.preferences.filter((x) => !(x.trip_id === tripId && x.member === member));
    this.save();
  }
  async getOptions(tripId: string) {
    return this.load()
      .options.filter((o) => o.trip_id === tripId)
      .sort((a, b) => a.rank - b.rank);
  }
  async replaceOptions(tripId: string, opts: TripOption[]) {
    const db = this.load();
    db.options = db.options.filter((o) => o.trip_id !== tripId).concat(opts);
    this.save();
  }
  async getVotes(tripId: string) {
    return this.load().votes.filter((v) => v.trip_id === tripId);
  }
  async upsertVote(v: Vote) {
    const db = this.load();
    db.votes = db.votes.filter(
      (x) => !(x.trip_id === v.trip_id && x.member === v.member && x.option_id === v.option_id)
    );
    db.votes.push(v);
    this.save();
  }
  async clearVotes(tripId: string) {
    const db = this.load();
    db.votes = db.votes.filter((v) => v.trip_id !== tripId);
    this.save();
  }
}

let store: Store | null = null;
export function getStore(): Store {
  if (store) return store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  store = url && key ? new SupabaseStore(url, key) : new LocalStore();
  return store;
}
