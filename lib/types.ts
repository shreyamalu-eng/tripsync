// Shared data shapes. Everything the app stores or shows is defined here.

export type DateWindow = {
  id: string; // e.g. "w1"
  label: string; // e.g. "Diwali long weekend"
  start: string; // ISO date "2026-11-06"
  end: string; // ISO date "2026-11-09"
};

export type TripStatus = "collecting" | "reopened" | "options" | "decided";

export type Trip = {
  id: string;
  name: string;
  organiser: string;
  members: string[];
  date_windows: DateWindow[];
  deadline: string; // ISO datetime - when preference collection closes
  admin_token: string; // only the organiser has this
  status: TripStatus;
  decided_option_id: string | null;
  created_at: string;
};

// One person's private preferences. Never sent to other members.
export type Preference = {
  trip_id: string;
  member: string;
  edit_token: string;
  origin_city: string;
  origin_lat: number | null;
  origin_lon: number | null;
  budget_max: number; // per person, all-in (travel + stay + food), INR
  available_windows: string[]; // DateWindow ids the person CAN do
  maybe_windows: string[]; // DateWindow ids that MIGHT work (scored as a stretch)
  trip_nights: number;
  destination_types: string[];
  wont_do: string[];
  notes: string;
  updated_at: string;
};

export type FitLevel = "works" | "stretch" | "no";

export type MemberFit = {
  level: FitLevel;
  score: number; // 0-100
  reasons: string[]; // safe to show the group - no budgets or won't-dos
  mine?: string[]; // private detail (budget, won't-dos): only sent to this person
};

export type MemberEstimate = {
  cost_min: number;
  cost_max: number;
  travel: string; // "~2h flight" / "~9h train"
  conflict: string | null; // clash with a won't-do, phrased neutrally
};

export type TripOption = {
  id: string;
  trip_id: string;
  rank: number;
  destination: string;
  region: string;
  window_id: string;
  nights: number;
  summary: string;
  why: string;
  tags: string[];
  estimates: Record<string, MemberEstimate>;
  fit: Record<string, MemberFit>;
  group_score: number;
  image: string | null; // destination photo URL (Wikipedia), or null -> illustrated fallback
  source: "gemini" | "rules";
  created_at: string;
};

export type Vote = {
  trip_id: string;
  member: string;
  option_id: string;
  vote: "in" | "cant";
  updated_at: string;
};

export const DESTINATION_TYPES = [
  "beach",
  "mountains",
  "city",
  "heritage",
  "nature",
  "adventure",
  "chill",
  "nightlife",
  "food",
] as const;

export const WONT_DO_OPTIONS = [
  "overnight bus",
  "more than 8h one-way travel",
  "flights",
  "trekking / hikes",
  "cold weather",
  "crowded party spots",
  "hostels / shared dorms",
  "long road trips",
] as const;
