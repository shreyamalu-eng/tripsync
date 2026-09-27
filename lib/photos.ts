// Curated destination photos (Wikimedia Commons, hotlinked at Wikimedia's standard thumbnail sizes).
// Used for the landing page, trip banners, and whenever an option has no photo of its own.

const W = (path: string, w: 500 | 960 | 1280 = 960) => {
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

/** Small photos for the "kind of trip" cards (500px thumbnails). */
export const STYLE_PHOTOS: Record<string, string> = {
  relaxed: W("2/27/Hammock11.jpg", 500),
  adventurous: W("e/ea/Paragliding_1350361.jpg", 500),
  party: W("3/32/Wikipedia_space_ibiza%2803%29.jpg", 500),
  exploring: W("8/8d/Road_Padum_Zanskar_Range_Jun24_A7CR_00818.jpg", 500),
  sightseeing: W("1/1d/Taj_Mahal_%28Edited%29.jpeg", 500),
  "food trail": W("e/e9/Pani_Puri1.JPG", 500),
  shopping: W("3/31/Turkey_%2868742801%29.jpeg", 500),
  wellness: W("8/8b/Medicinal_spa_of_Hark%C3%A1ny.jpg", 500),
  culture: W("2/2c/Kathakali_-Play_with_Kaurava.jpg", 500),
  photography: W("5/55/Dawki_River%2C_Meghalaya%2C_India.jpg", 500),
};

/** Popular places people can tap to add to "places in mind". */
export const PICKS: { place: string; src: string }[] = [
  { place: "Goa", src: W("9/9c/Palolem_Beach%2C_South_Goa.jpg", 500) },
  { place: "Manali", src: W("0/03/Manali_City.jpg", 500) },
  { place: "Udaipur", src: W("6/6f/Evening_view%2C_City_Palace%2C_Udaipur.jpg", 500) },
  { place: "Pondicherry", src: W("8/8c/Pondicherry-Rock_beach_aerial_view.jpg", 500) },
  { place: "Ladakh", src: W("4/4d/Leh_City_seen_from_Shanti_Stupa.JPG", 500) },
  { place: "Kerala", src: W("e/e4/Alappuzha_Boat_Beauty_W.jpg", 500) },
  { place: "Jaisalmer", src: W("4/46/Jaisalmer_Fort.jpg", 500) },
  { place: "Meghalaya", src: W("5/55/Dawki_River%2C_Meghalaya%2C_India.jpg", 500) },
  { place: "Kasol", src: W("a/a2/Kasol_mountain_view.jpg", 500) },
  { place: "Coorg", src: W("1/17/Tadiandamol_Valley%2C_Western_Ghats.jpg", 500) },
];
