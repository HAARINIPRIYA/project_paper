const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function searchPlaces(query, district = null, state = null, country = "India", limit = 10) {
  if (!query || !query.trim()) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    country,
    limit: String(limit),
  });
  if (district) params.set("district", district);
  if (state) params.set("state", state);

  const res = await fetch(`${API_BASE}/geocode/search?${params.toString()}`);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Search failed: ${res.status}`);
  }

  const data = await res.json();
  return data.results || [];
}

export async function reverseGeocode(latitude, longitude) {
  return null;
}

export function validateCoordinates(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function parseLocationFromText(text) {
  if (!text || typeof text !== "string") return null;

  const cleaned = text.trim();

  const googleMapsRegex = /(?:https?:\/\/)?(?:www\.)?google\.com\/maps.*?[?&](?:q|query|center)=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/i;
  const googleMapsMatch = cleaned.match(googleMapsRegex);
  if (googleMapsMatch) {
    return { latitude: parseFloat(googleMapsMatch[1]), longitude: parseFloat(googleMapsMatch[2]) };
  }

  const shortLinkRegex = /(?:https?:\/\/)?(?:www\.)?google\.com\/maps\/place\/.*?@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/i;
  const shortLinkMatch = cleaned.match(shortLinkRegex);
  if (shortLinkMatch) {
    return { latitude: parseFloat(shortLinkMatch[1]), longitude: parseFloat(shortLinkMatch[2]) };
  }

  const osmRegex = /(?:https?:\/\/)?(?:www\.)?(?:osm|openstreetmap)\.org.*?[?&](?:mlat|lat)=(-?\d+\.?\d*).*?(?:mlon|lon)=(-?\d+\.?\d*)/i;
  const osmMatch = cleaned.match(osmRegex);
  if (osmMatch) {
    return { latitude: parseFloat(osmMatch[1]), longitude: parseFloat(osmMatch[2]) };
  }

  const bingRegex = /(?:https?:\/\/)?(?:www\.)?bing\.com\/maps.*?[?&]cp=(-?\d+\.?\d*)~(-?\d+\.?\d*)/i;
  const bingMatch = cleaned.match(bingRegex);
  if (bingMatch) {
    return { latitude: parseFloat(bingMatch[1]), longitude: parseFloat(bingMatch[2]) };
  }

  const what3wordsRegex = /\/\/([a-z]+\.[a-z]+\.[a-z]+)/i;
  const w3wMatch = cleaned.match(what3wordsRegex);
  if (w3wMatch && cleaned.includes("w3w")) {
    return null;
  }

  const dmRegex = /(-?\d{1,3})[°]\s*(\d{1,2})['′]?\s*([\d.]+)["″]?\s*([NSEW])\s*[,\s]+(-?\d{1,3})[°]\s*(\d{1,2})['′]?\s*([\d.]+)["″]?\s*([NSEW])/i;
  const dmMatch = cleaned.match(dmRegex);
  if (dmMatch) {
    const toDec = (d, m, s, dir) => {
      let dec = parseInt(d) + parseInt(m) / 60 + parseFloat(s) / 3600;
      if (dir.toUpperCase() === "S" || dir.toUpperCase() === "W") dec = -dec;
      return dec;
    };
    return {
      latitude: toDec(dmMatch[1], dmMatch[2], dmMatch[3], dmMatch[4]),
      longitude: toDec(dmMatch[5], dmMatch[6], dmMatch[7], dmMatch[8]),
    };
  }

  const plainCoordsRegex = /^(-?\d{1,3}\.\d{2,8})\s*[,\s]\s*(-?\d{1,3}\.\d{2,8})$/;
  const plainMatch = cleaned.match(plainCoordsRegex);
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1]);
    const lon = parseFloat(plainMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { latitude: lat, longitude: lon };
    }
  }

  return null;
}

export async function parseLocationFromBackend(text) {
  const res = await fetch(`${API_BASE}/parse-location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Parse failed: ${res.status}`);
  }
  return res.json();
}

export const DISTRICTS = [
  { name: "Ariyalur", state: "Tamil Nadu", region: "central" },
  { name: "Chengalpattu", state: "Tamil Nadu", region: "south" },
  { name: "Chennai", state: "Tamil Nadu", region: "north" },
  { name: "Coimbatore", state: "Tamil Nadu", region: "west" },
  { name: "Cuddalore", state: "Tamil Nadu", region: "central" },
  { name: "Dharmapuri", state: "Tamil Nadu", region: "north" },
  { name: "Dindigul", state: "Tamil Nadu", region: "south" },
  { name: "Erode", state: "Tamil Nadu", region: "west" },
  { name: "Kallakurichi", state: "Tamil Nadu", region: "central" },
  { name: "Kancheepuram", state: "Tamil Nadu", region: "north" },
  { name: "Karur", state: "Tamil Nadu", region: "west" },
  { name: "Krishnagiri", state: "Tamil Nadu", region: "north" },
  { name: "Madurai", state: "Tamil Nadu", region: "south" },
  { name: "Mayiladuthurai", state: "Tamil Nadu", region: "central" },
  { name: "Nagapattinam", state: "Tamil Nadu", region: "central" },
  { name: "Namakkal", state: "Tamil Nadu", region: "west" },
  { name: "Nilgiris", state: "Tamil Nadu", region: "west" },
  { name: "Perambalur", state: "Tamil Nadu", region: "central" },
  { name: "Pudukkottai", state: "Tamil Nadu", region: "south" },
  { name: "Ramanathapuram", state: "Tamil Nadu", region: "south" },
  { name: "Ranipet", state: "Tamil Nadu", region: "north" },
  { name: "Salem", state: "Tamil Nadu", region: "west" },
  { name: "Sivaganga", state: "Tamil Nadu", region: "south" },
  { name: "Tenkasi", state: "Tamil Nadu", region: "south" },
  { name: "Thanjavur", state: "Tamil Nadu", region: "central" },
  { name: "Theni", state: "Tamil Nadu", region: "south" },
  { name: "Thoothukudi", state: "Tamil Nadu", region: "south" },
  { name: "Tiruchirappalli", state: "Tamil Nadu", region: "central" },
  { name: "Tirunelveli", state: "Tamil Nadu", region: "south" },
  { name: "Tirupattur", state: "Tamil Nadu", region: "north" },
  { name: "Tiruvallur", state: "Tamil Nadu", region: "north" },
  { name: "Tiruvannamalai", state: "Tamil Nadu", region: "north" },
  { name: "Tiruvarur", state: "Tamil Nadu", region: "central" },
  { name: "Vellore", state: "Tamil Nadu", region: "north" },
  { name: "Viluppuram", state: "Tamil Nadu", region: "central" },
  { name: "Virudhunagar", state: "Tamil Nadu", region: "south" },
  { name: "Pune", state: "Maharashtra", region: "west" },
  { name: "Kolhapur", state: "Maharashtra", region: "west" },
  { name: "Sangli", state: "Maharashtra", region: "west" },
  { name: "Solapur", state: "Maharashtra", region: "west" },
  { name: "Ahmednagar", state: "Maharashtra", region: "west" },
  { name: "Mysuru", state: "Karnataka", region: "south" },
  { name: "Mandya", state: "Karnataka", region: "south" },
  { name: "Hassan", state: "Karnataka", region: "south" },
  { name: "Belgaum", state: "Karnataka", region: "south" },
  { name: "Lucknow", state: "Uttar Pradesh", region: "north" },
  { name: "Bareilly", state: "Uttar Pradesh", region: "north" },
  { name: "Meerut", state: "Uttar Pradesh", region: "north" },
  { name: "Ghaziabad", state: "Uttar Pradesh", region: "north" },
  { name: "Surat", state: "Gujarat", region: "west" },
  { name: "Junagadh", state: "Gujarat", region: "west" },
  { name: "Rajkot", state: "Gujarat", region: "west" },
  { name: "Haridwar", state: "Uttarakhand", region: "north" },
  { name: "East Godavari", state: "Andhra Pradesh", region: "south" },
  { name: "West Godavari", state: "Andhra Pradesh", region: "south" },
  { name: "Nalgonda", state: "Telangana", region: "south" },
];
