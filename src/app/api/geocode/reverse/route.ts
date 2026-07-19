import { NextRequest, NextResponse } from 'next/server';

interface CoordPair {
  lat: number;
  lon: number;
}

// In-memory cache across requests (survives for the life of the server process)
const addressCache = new Map<string, string>();

async function geocodeOne(lat: number, lon: number): Promise<string> {
  const cacheKey = `${lat},${lon}`;
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey)!;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'EdVentureHub-AttendanceExport/1.0 (internal-tool)',
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) {
      console.error(`Nominatim returned ${res.status} for ${lat},${lon}`);
      const fallback = `${lat}, ${lon}`;
      addressCache.set(cacheKey, fallback);
      return fallback;
    }

    const data = await res.json();
    const address = data.display_name || `${lat}, ${lon}`;
    addressCache.set(cacheKey, address);
    return address;
  } catch (err) {
    console.error(`Geocode fetch error for ${lat},${lon}:`, err);
    const fallback = `${lat}, ${lon}`;
    addressCache.set(cacheKey, fallback);
    return fallback;
  }
}

// POST: Batch reverse-geocode an array of coordinates
// Body: { coordinates: [{ lat: number, lon: number }, ...] }
// Response: { results: { [index]: string } }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const coordinates: CoordPair[] = body.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return NextResponse.json({ error: 'coordinates array is required' }, { status: 400 });
    }

    // Cap at 200 to prevent abuse
    const coords = coordinates.slice(0, 200);

    const results: Record<number, string> = {};

    for (let i = 0; i < coords.length; i++) {
      const { lat, lon } = coords[i];
      if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
        results[i] = '';
        continue;
      }

      results[i] = await geocodeOne(lat, lon);

      // Nominatim rate limit: max 1 req/sec — only delay if not cached
      if (i < coords.length - 1 && !addressCache.has(`${coords[i + 1].lat},${coords[i + 1].lon}`)) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Batch geocode error:', err);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}

// Keep single GET for simple lookups
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const address = await geocodeOne(latNum, lonNum);
  return NextResponse.json({ address });
}
