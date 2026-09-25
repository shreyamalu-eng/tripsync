// Indian cities with approximate coordinates. Bundled so city search, "use my
// location" and distance maths work instantly with no API key or network.
// [name, state, lat, lon, popular?]
type Row = [string, string, number, number, 1?];

const ROWS: Row[] = [
  ["Bengaluru", "Karnataka", 12.97, 77.59, 1], ["Mumbai", "Maharashtra", 19.07, 72.88, 1],
  ["Delhi", "Delhi", 28.61, 77.21, 1], ["Hyderabad", "Telangana", 17.39, 78.49, 1],
  ["Chennai", "Tamil Nadu", 13.08, 80.27, 1], ["Pune", "Maharashtra", 18.52, 73.86, 1],
  ["Kolkata", "West Bengal", 22.57, 88.36, 1], ["Gurugram", "Haryana", 28.46, 77.03, 1],
  ["Noida", "Uttar Pradesh", 28.54, 77.39], ["Ghaziabad", "Uttar Pradesh", 28.67, 77.45],
  ["Faridabad", "Haryana", 28.41, 77.32], ["Ahmedabad", "Gujarat", 23.02, 72.57, 1],
  ["Surat", "Gujarat", 21.17, 72.83], ["Vadodara", "Gujarat", 22.31, 73.18],
  ["Rajkot", "Gujarat", 22.30, 70.80], ["Gandhinagar", "Gujarat", 23.22, 72.65],
  ["Jaipur", "Rajasthan", 26.91, 75.79], ["Jodhpur", "Rajasthan", 26.24, 73.02],
  ["Udaipur", "Rajasthan", 24.58, 73.71], ["Kota", "Rajasthan", 25.18, 75.83],
  ["Ajmer", "Rajasthan", 26.45, 74.64], ["Bikaner", "Rajasthan", 28.02, 73.31],
  ["Chandigarh", "Chandigarh", 30.73, 76.78], ["Mohali", "Punjab", 30.70, 76.72],
  ["Ludhiana", "Punjab", 30.90, 75.86], ["Amritsar", "Punjab", 31.63, 74.87],
  ["Jalandhar", "Punjab", 31.33, 75.58], ["Patiala", "Punjab", 30.34, 76.39],
  ["Dehradun", "Uttarakhand", 30.32, 78.03], ["Haridwar", "Uttarakhand", 29.95, 78.16],
  ["Shimla", "Himachal Pradesh", 31.10, 77.17], ["Jammu", "Jammu & Kashmir", 32.73, 74.86],
  ["Srinagar", "Jammu & Kashmir", 34.08, 74.80], ["Lucknow", "Uttar Pradesh", 26.85, 80.95],
  ["Kanpur", "Uttar Pradesh", 26.45, 80.33], ["Agra", "Uttar Pradesh", 27.18, 78.01],
  ["Varanasi", "Uttar Pradesh", 25.32, 82.97], ["Prayagraj", "Uttar Pradesh", 25.44, 81.85],
  ["Meerut", "Uttar Pradesh", 28.98, 77.71], ["Bareilly", "Uttar Pradesh", 28.37, 79.43],
  ["Aligarh", "Uttar Pradesh", 27.88, 78.08], ["Gorakhpur", "Uttar Pradesh", 26.76, 83.37],
  ["Patna", "Bihar", 25.59, 85.14], ["Gaya", "Bihar", 24.79, 85.00],
  ["Ranchi", "Jharkhand", 23.34, 85.31], ["Jamshedpur", "Jharkhand", 22.80, 86.20],
  ["Dhanbad", "Jharkhand", 23.80, 86.43], ["Bhubaneswar", "Odisha", 20.30, 85.82],
  ["Cuttack", "Odisha", 20.46, 85.88], ["Puri", "Odisha", 19.81, 85.83],
  ["Guwahati", "Assam", 26.14, 91.74], ["Shillong", "Meghalaya", 25.58, 91.89],
  ["Imphal", "Manipur", 24.82, 93.94], ["Agartala", "Tripura", 23.83, 91.28],
  ["Gangtok", "Sikkim", 27.33, 88.61], ["Siliguri", "West Bengal", 26.73, 88.40],
  ["Durgapur", "West Bengal", 23.52, 87.31], ["Howrah", "West Bengal", 22.59, 88.26],
  ["Bhopal", "Madhya Pradesh", 23.26, 77.41], ["Indore", "Madhya Pradesh", 22.72, 75.86],
  ["Gwalior", "Madhya Pradesh", 26.22, 78.18], ["Jabalpur", "Madhya Pradesh", 23.18, 79.99],
  ["Ujjain", "Madhya Pradesh", 23.18, 75.78], ["Raipur", "Chhattisgarh", 21.25, 81.63],
  ["Bilaspur", "Chhattisgarh", 22.08, 82.15], ["Nagpur", "Maharashtra", 21.15, 79.09],
  ["Nashik", "Maharashtra", 20.00, 73.79], ["Aurangabad", "Maharashtra", 19.88, 75.34],
  ["Thane", "Maharashtra", 19.22, 72.98], ["Navi Mumbai", "Maharashtra", 19.03, 73.03],
  ["Kolhapur", "Maharashtra", 16.70, 74.24], ["Solapur", "Maharashtra", 17.66, 75.91],
  ["Amravati", "Maharashtra", 20.93, 77.75], ["Panaji", "Goa", 15.49, 73.83],
  ["Margao", "Goa", 15.27, 73.96], ["Mysuru", "Karnataka", 12.30, 76.64],
  ["Mangaluru", "Karnataka", 12.91, 74.86], ["Hubballi", "Karnataka", 15.36, 75.12],
  ["Belagavi", "Karnataka", 15.85, 74.50], ["Manipal", "Karnataka", 13.35, 74.79],
  ["Davanagere", "Karnataka", 14.46, 75.92], ["Kochi", "Kerala", 9.93, 76.27],
  ["Thiruvananthapuram", "Kerala", 8.52, 76.94], ["Kozhikode", "Kerala", 11.26, 75.78],
  ["Thrissur", "Kerala", 10.53, 76.21], ["Kannur", "Kerala", 11.87, 75.37],
  ["Kollam", "Kerala", 8.89, 76.61], ["Coimbatore", "Tamil Nadu", 11.02, 76.96],
  ["Madurai", "Tamil Nadu", 9.93, 78.12], ["Tiruchirappalli", "Tamil Nadu", 10.79, 78.70],
  ["Salem", "Tamil Nadu", 11.66, 78.15], ["Tirunelveli", "Tamil Nadu", 8.71, 77.76],
  ["Vellore", "Tamil Nadu", 12.92, 79.13], ["Erode", "Tamil Nadu", 11.34, 77.72],
  ["Puducherry", "Puducherry", 11.93, 79.83], ["Visakhapatnam", "Andhra Pradesh", 17.69, 83.22],
  ["Vijayawada", "Andhra Pradesh", 16.51, 80.65], ["Guntur", "Andhra Pradesh", 16.31, 80.44],
  ["Tirupati", "Andhra Pradesh", 13.63, 79.42], ["Nellore", "Andhra Pradesh", 14.44, 79.99],
  ["Kakinada", "Andhra Pradesh", 16.99, 82.25], ["Warangal", "Telangana", 17.97, 79.59],
  ["Karimnagar", "Telangana", 18.44, 79.13], ["Nizamabad", "Telangana", 18.67, 78.09],
  ["Jhansi", "Uttar Pradesh", 25.45, 78.57], ["Mathura", "Uttar Pradesh", 27.49, 77.67],
  ["Rishikesh", "Uttarakhand", 30.09, 78.27], ["Nainital", "Uttarakhand", 29.38, 79.46],
  ["Sonipat", "Haryana", 28.99, 77.02], ["Panipat", "Haryana", 29.39, 76.97],
  ["Karnal", "Haryana", 29.69, 76.99], ["Ambala", "Haryana", 30.38, 76.78],
  ["Hisar", "Haryana", 29.15, 75.72], ["Rohtak", "Haryana", 28.90, 76.61],
  ["Bhilai", "Chhattisgarh", 21.19, 81.38], ["Rourkela", "Odisha", 22.26, 84.85],
  ["Asansol", "West Bengal", 23.68, 86.98], ["Dibrugarh", "Assam", 27.47, 94.91],
  ["Silchar", "Assam", 24.83, 92.78], ["Port Blair", "Andaman & Nicobar", 11.62, 92.73],
  ["Leh", "Ladakh", 34.15, 77.58], ["Vapi", "Gujarat", 20.37, 72.90],
  ["Bhavnagar", "Gujarat", 21.76, 72.15], ["Jamnagar", "Gujarat", 22.47, 70.06],
  ["Anand", "Gujarat", 22.56, 72.95], ["Udupi", "Karnataka", 13.34, 74.75],
  ["Hosur", "Tamil Nadu", 12.74, 77.83], ["Kharagpur", "West Bengal", 22.35, 87.23],
  ["Roorkee", "Uttarakhand", 29.85, 77.89], ["Pilani", "Rajasthan", 28.36, 75.60],
];

export type City = { name: string; state: string; lat: number; lon: number; popular?: boolean };

export const CITY_LIST: City[] = ROWS.map(([name, state, lat, lon, p]) => ({ name, state, lat, lon, popular: !!p }));
export const POPULAR_CITIES = CITY_LIST.filter((c) => c.popular);

const ALIASES: Record<string, string> = {
  bangalore: "Bengaluru", bombay: "Mumbai", "new delhi": "Delhi", gurgaon: "Gurugram", madras: "Chennai",
  calcutta: "Kolkata", pondicherry: "Puducherry", pondy: "Puducherry", mysore: "Mysuru", mangalore: "Mangaluru",
  trivandrum: "Thiruvananthapuram", calicut: "Kozhikode", cochin: "Kochi", ernakulam: "Kochi", vizag: "Visakhapatnam",
  baroda: "Vadodara", allahabad: "Prayagraj", banaras: "Varanasi", benares: "Varanasi", hubli: "Hubballi",
  belgaum: "Belagavi", trichy: "Tiruchirappalli", goa: "Panaji", ncr: "Delhi", hyd: "Hyderabad", blr: "Bengaluru",
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z ]/g, "");

export function searchCities(q: string, limit = 6): City[] {
  const k = norm(q);
  if (!k) return POPULAR_CITIES.slice(0, limit);
  const alias = ALIASES[k] ? CITY_LIST.find((c) => c.name === ALIASES[k]) : undefined;
  const starts = CITY_LIST.filter((c) => norm(c.name).startsWith(k));
  const aliasStarts = Object.entries(ALIASES)
    .filter(([a]) => a.startsWith(k))
    .map(([, n]) => CITY_LIST.find((c) => c.name === n)!)
    .filter(Boolean);
  const contains = CITY_LIST.filter((c) => norm(c.name).includes(k) || norm(c.state).startsWith(k));
  const seen = new Set<string>();
  const out: City[] = [];
  for (const c of [alias, ...starts, ...aliasStarts, ...contains]) {
    if (!c || seen.has(c.name)) continue;
    seen.add(c.name);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

export function findCity(name: string): City | null {
  const k = norm(name);
  if (!k) return null;
  const a = ALIASES[k];
  return (
    CITY_LIST.find((c) => norm(c.name) === k || (a && c.name === a)) ??
    CITY_LIST.find((c) => k.includes(norm(c.name)) || norm(c.name).includes(k)) ??
    null
  );
}

export function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestCity(lat: number, lon: number): City {
  let best = CITY_LIST[0];
  let d = Infinity;
  for (const c of CITY_LIST) {
    const x = haversineKm([lat, lon], [c.lat, c.lon]);
    if (x < d) [best, d] = [c, x];
  }
  return best;
}
