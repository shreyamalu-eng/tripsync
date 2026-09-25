// RULES-ONLY fallback: a small, hand-checked list of Indian destinations and
// city coordinates. Used when there is no Gemini key, or Gemini fails.
// Costs are rough per-person estimates (INR) - labelled as estimates in the UI.

export type Place = {
  name: string;
  region: string;
  lat: number;
  lon: number;
  tags: string[];
  perNight: number; // stay + food + local transport, per person, mid-range
  blurb: string;
};

export const PLACES: Place[] = [
  { name: "Goa (North)", region: "Goa", lat: 15.55, lon: 73.75, tags: ["beach", "nightlife", "food", "chill"], perNight: 3200, blurb: "Beach shacks, cafes and nightlife." },
  { name: "Goa (South)", region: "Goa", lat: 15.0, lon: 74.02, tags: ["beach", "chill", "nature", "food"], perNight: 3500, blurb: "Quiet beaches and long lazy lunches." },
  { name: "Gokarna", region: "Karnataka", lat: 14.55, lon: 74.32, tags: ["beach", "chill", "nature", "adventure"], perNight: 2200, blurb: "Beach-hopping on cliff trails, far calmer than Goa." },
  { name: "Pondicherry", region: "Tamil Nadu", lat: 11.93, lon: 79.83, tags: ["beach", "heritage", "food", "chill"], perNight: 2800, blurb: "French quarter, cafes and a slow seaside pace." },
  { name: "Varkala", region: "Kerala", lat: 8.73, lon: 76.71, tags: ["beach", "chill", "nature"], perNight: 2600, blurb: "Cliff-top cafes over the Arabian Sea." },
  { name: "Alleppey", region: "Kerala", lat: 9.5, lon: 76.34, tags: ["nature", "chill", "food"], perNight: 3400, blurb: "Houseboat days on the backwaters." },
  { name: "Coorg", region: "Karnataka", lat: 12.42, lon: 75.74, tags: ["mountains", "nature", "chill", "food"], perNight: 3000, blurb: "Coffee estates, mist and homestays." },
  { name: "Udaipur", region: "Rajasthan", lat: 24.58, lon: 73.71, tags: ["heritage", "city", "food", "chill"], perNight: 3300, blurb: "Lakes, palaces and rooftop dinners." },
  { name: "Jaipur", region: "Rajasthan", lat: 26.91, lon: 75.79, tags: ["heritage", "city", "food"], perNight: 2800, blurb: "Forts, bazaars and big food." },
  { name: "Rishikesh", region: "Uttarakhand", lat: 30.09, lon: 78.27, tags: ["adventure", "nature", "mountains", "chill"], perNight: 2200, blurb: "Rafting, riverside cafes, easy hills." },
  { name: "Manali", region: "Himachal Pradesh", lat: 32.24, lon: 77.19, tags: ["mountains", "adventure", "nature", "nightlife"], perNight: 2600, blurb: "Snow views, cafes in Old Manali." },
  { name: "Kasol", region: "Himachal Pradesh", lat: 32.01, lon: 77.31, tags: ["mountains", "nature", "chill", "adventure"], perNight: 1900, blurb: "Pine forests and riverside hangs." },
  { name: "Lonavala", region: "Maharashtra", lat: 18.75, lon: 73.41, tags: ["nature", "chill", "mountains"], perNight: 3000, blurb: "Quick hill escape with villas and views." },
  { name: "Hampi", region: "Karnataka", lat: 15.33, lon: 76.46, tags: ["heritage", "adventure", "nature", "chill"], perNight: 1800, blurb: "Boulders, ruins and sunset points." },
  { name: "Mumbai", region: "Maharashtra", lat: 19.07, lon: 72.88, tags: ["city", "food", "nightlife"], perNight: 4500, blurb: "City weekend - food, bars, sea face." },
  { name: "Munnar", region: "Kerala", lat: 10.09, lon: 77.06, tags: ["mountains", "nature", "chill"], perNight: 2900, blurb: "Rolling tea hills and cool misty mornings." },
  { name: "Ooty", region: "Tamil Nadu", lat: 11.41, lon: 76.70, tags: ["mountains", "nature", "chill"], perNight: 2700, blurb: "Toy train, lakes and eucalyptus hills." },
  { name: "Jaisalmer", region: "Rajasthan", lat: 26.91, lon: 70.91, tags: ["heritage", "adventure", "food"], perNight: 2600, blurb: "Golden fort and a night under desert stars." },
  { name: "McLeod Ganj", region: "Himachal Pradesh", lat: 32.24, lon: 76.32, tags: ["mountains", "nature", "chill", "food"], perNight: 2100, blurb: "Himalayan cafes, monasteries and short trails." },
  { name: "Shillong", region: "Meghalaya", lat: 25.58, lon: 91.89, tags: ["nature", "mountains", "chill", "food"], perNight: 2800, blurb: "Waterfalls, living-root bridges and live music." },
  { name: "Alibaug", region: "Maharashtra", lat: 18.64, lon: 72.87, tags: ["beach", "chill", "food"], perNight: 3600, blurb: "Easy beach villas a ferry ride from Mumbai." },
  { name: "Darjeeling", region: "West Bengal", lat: 27.04, lon: 88.26, tags: ["mountains", "heritage", "nature", "chill"], perNight: 2700, blurb: "Tea gardens and Kanchenjunga views." },
];

export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.25; // x1.25: roads/rails are not straight lines
}
