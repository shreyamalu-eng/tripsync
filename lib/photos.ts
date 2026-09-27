// Curated destination photos (Wikimedia Commons, hotlinked at Wikimedia's standard thumbnail sizes).
// Used for the landing page, trip banners, and whenever an option has no photo of its own.

const W = (path: string, w: 960 | 1280 = 960) => {
  const file = path.split("/").pop();
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${w}px-${file}`;
};

export type Photo = { place: string; region: string; src: string; big: string; tags: string[] };

const P = (place: string, region: string, path: string, tags: string[]): Photo => ({
  place, region, src: W(path), big: W(path, 1280), tags,
});

export const PHOTOS = {
  coorg: P("Coorg", "Karnataka", "1/17/Tadiandamol_Valley%2C_Western_Ghats.jpg", ["nature", "mountains"]),
  munnar: P("Munnar", "Kerala", "b/b9/Munnar_Overview.jpg", ["nature", "chill"]),
  kasol: P("Kasol", "Himachal", "a/a2/Kasol_mountain_view.jpg", ["mountains", "adventure"]),
  varkala: P("Varkala", "Kerala", "4/49/Varkala_Beach%2C_Varkala%2C_Kerala.jpg", ["beach", "chill"]),
  alleppey: P("Alleppey", "Kerala", "e/e4/Alappuzha_Boat_Beauty_W.jpg", ["nature", "food"]),
  udaipur: P("Udaipur", "Rajasthan", "6/6f/Evening_view%2C_City_Palace%2C_Udaipur.jpg", ["heritage", "city"]),
  jaipur: P("Jaipur", "Rajasthan", "4/41/East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg", ["heritage", "city", "food"]),
  ooty: P("Ooty", "Tamil Nadu", "d/db/Ooty_lake.jpg", ["nature", "chill"]),
  leh: P("Leh", "Ladakh", "4/4d/Leh_City_seen_from_Shanti_Stupa.JPG", ["mountains", "adventure"]),
  lonavala: P("Lonavala", "Maharashtra", "6/60/Tiger_Valley_Bridge_view_3.jpg", ["nature", "mountains"]),
};

export const HERO = PHOTOS.coorg;
export const SHOWCASE = [PHOTOS.varkala, PHOTOS.kasol, PHOTOS.udaipur, PHOTOS.munnar, PHOTOS.alleppey, PHOTOS.jaipur];

/** A fitting photo for an option with no photo of its own. */
export function photoForTags(tags: string[]): Photo {
  if (tags.includes("beach")) return PHOTOS.varkala;
  if (tags.includes("mountains") || tags.includes("adventure")) return PHOTOS.kasol;
  if (tags.includes("heritage") || tags.includes("city")) return PHOTOS.udaipur;
  return PHOTOS.munnar;
}

/** A stable banner photo for a trip, picked from its id so every friend sees the same one. */
export function bannerFor(id: string): Photo {
  const list = [PHOTOS.coorg, PHOTOS.munnar, PHOTOS.kasol, PHOTOS.varkala, PHOTOS.ooty, PHOTOS.lonavala];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
