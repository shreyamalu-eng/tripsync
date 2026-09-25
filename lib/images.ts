// Destination photos. One Wikipedia lookup per option at generate time (server only),
// with a short timeout. If it fails, the UI shows an illustrated card instead.

async function wiki(title: string): Promise<string | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 3500);
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
      signal: ctl.signal,
      headers: { "user-agent": "TripSync/1.0 (group trip planner)", accept: "application/json" },
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.type === "disambiguation") return null;
    const src: string | undefined = j.originalimage?.source ?? j.thumbnail?.source;
    if (!src || /\.svg/i.test(src) || /map|flag|locator|emblem|seal/i.test(src)) return null;
    // Ask for a phone-sized rendition when Wikimedia gives us a thumbnail URL.
    return j.thumbnail?.source ? j.thumbnail.source.replace(/\/\d+px-/, "/960px-") : src;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function destinationImage(destination: string, region: string): Promise<string | null> {
  const base = destination.replace(/\s*\(.*?\)\s*/g, "").trim();
  for (const title of [base, `${base}, ${region}`, region]) {
    if (!title) continue;
    const img = await wiki(title);
    if (img) return img;
  }
  return null;
}
