'use client';

import { useState } from 'react';

export default function GeocodeTestPage() {
  const [testLat, setTestLat] = useState('26.77967');
  const [testLon, setTestLon] = useState('82.16935');
  const [results, setResults] = useState<{ step: string; status: 'ok' | 'fail' | 'pending'; detail: string }[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setResults([]);
    setRunning(true);

    const lat = parseFloat(testLat);
    const lon = parseFloat(testLon);

    // ── Test 1: Direct Nominatim call from browser ────────────────────
    try {
      setResults((p) => [...p, { step: '1. Browser → Nominatim (direct)', status: 'pending', detail: 'Calling...' }]);
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const text = await res.text();
      setResults((p) => {
        const copy = [...p];
        if (res.ok) {
          try {
            const data = JSON.parse(text);
            copy[copy.length - 1] = {
              step: '1. Browser → Nominatim (direct)',
              status: data.display_name ? 'ok' : 'fail',
              detail: data.display_name
                ? `Address: ${data.display_name}`
                : `Response OK but no display_name. Keys: ${Object.keys(data).join(', ')}`,
            };
          } catch {
            copy[copy.length - 1] = {
              step: '1. Browser → Nominatim (direct)',
              status: 'fail',
              detail: `Invalid JSON: ${text.slice(0, 200)}`,
            };
          }
        } else {
          copy[copy.length - 1] = {
            step: '1. Browser → Nominatim (direct)',
            status: 'fail',
            detail: `HTTP ${res.status}: ${text.slice(0, 200)}`,
          };
        }
        return copy;
      });
    } catch (err: any) {
      setResults((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { step: '1. Browser → Nominatim (direct)', status: 'fail', detail: `Network error: ${err.message}` };
        return copy;
      });
    }

    // ── Test 2: GET /api/geocode/reverse ──────────────────────────────
    try {
      setResults((p) => [...p, { step: '2. GET /api/geocode/reverse', status: 'pending', detail: 'Calling...' }]);
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      const text = await res.text();
      setResults((p) => {
        const copy = [...p];
        if (res.ok) {
          try {
            const data = JSON.parse(text);
            const looksLikeAddress = data.address && !/^\d+\.\d+,\s*\d+\.\d+$/.test(data.address);
            copy[copy.length - 1] = {
              step: '2. GET /api/geocode/reverse',
              status: looksLikeAddress ? 'ok' : 'fail',
              detail: looksLikeAddress
                ? `Address: ${data.address}`
                : `Got coordinates back (not address): "${data.address}"`,
            };
          } catch {
            copy[copy.length - 1] = { step: '2. GET /api/geocode/reverse', status: 'fail', detail: `Invalid JSON: ${text.slice(0, 200)}` };
          }
        } else {
          copy[copy.length - 1] = { step: '2. GET /api/geocode/reverse', status: 'fail', detail: `HTTP ${res.status}: ${text.slice(0, 200)}` };
        }
        return copy;
      });
    } catch (err: any) {
      setResults((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { step: '2. GET /api/geocode/reverse', status: 'fail', detail: `Network error: ${err.message}` };
        return copy;
      });
    }

    // ── Test 3: POST /api/geocode/reverse (batch) ────────────────────
    try {
      setResults((p) => [...p, { step: '3. POST /api/geocode/reverse (batch)', status: 'pending', detail: 'Calling...' }]);
      const res = await fetch('/api/geocode/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: [
            { lat, lon },
            { lat: 28.6353, lon: 77.2250 },
          ],
        }),
      });
      const text = await res.text();
      setResults((p) => {
        const copy = [...p];
        if (res.ok) {
          try {
            const data = JSON.parse(text);
            const r = data.results || {};
            const addr0 = r[0] || '(empty)';
            const addr1 = r[1] || '(empty)';
            const looks0 = !/^\d+\.\d+,\s*\d+\.\d+$/.test(addr0);
            const looks1 = !/^\d+\.\d+,\s*\d+\.\d+$/.test(addr1);
            copy[copy.length - 1] = {
              step: '3. POST /api/geocode/reverse (batch)',
              status: looks0 && looks1 ? 'ok' : 'fail',
              detail: `Coord 1: ${looks0 ? 'OK' : 'FAIL'} → ${addr0}\nCoord 2: ${looks1 ? 'OK' : 'FAIL'} → ${addr1}`,
            };
          } catch {
            copy[copy.length - 1] = { step: '3. POST /api/geocode/reverse (batch)', status: 'fail', detail: `Invalid JSON: ${text.slice(0, 300)}` };
          }
        } else {
          copy[copy.length - 1] = { step: '3. POST /api/geocode/reverse (batch)', status: 'fail', detail: `HTTP ${res.status}: ${text.slice(0, 300)}` };
        }
        return copy;
      });
    } catch (err: any) {
      setResults((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { step: '3. POST /api/geocode/reverse (batch)', status: 'fail', detail: `Network error: ${err.message}` };
        return copy;
      });
    }

    // ── Test 4: Fetch real attendance records, check location shape ───
    try {
      setResults((p) => [...p, { step: '4. Attendance record location shape', status: 'pending', detail: 'Fetching...' }]);
      const { authenticatedFetch } = await import('@/lib/api-client');
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const attRes = await authenticatedFetch(
        `/api/attendance/records?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`
      );
      const attRaw = await attRes.json();
      const records: any[] = Array.isArray(attRaw) ? attRaw : attRaw?.data ?? [];

      const withLoc = records.filter((r) => r.location && (r.location.clockIn || r.location.clockOut));

      if (withLoc.length === 0) {
        setResults((p) => {
          const copy = [...p];
          copy[copy.length - 1] = {
            step: '4. Attendance record location shape',
            status: 'fail',
            detail: `Found ${records.length} records this month but NONE have location data.\nFirst record keys: ${records[0] ? Object.keys(records[0]).join(', ') : '(no records)'}\nFirst record location: ${records[0] ? JSON.stringify(records[0].location) : 'N/A'}`,
          };
          return copy;
        });
      } else {
        const sample = withLoc[0];
        const ci = sample.location?.clockIn;
        const co = sample.location?.clockOut;
        setResults((p) => {
          const copy = [...p];
          copy[copy.length - 1] = {
            step: '4. Attendance record location shape',
            status: ci?.latitude != null ? 'ok' : 'fail',
            detail: [
              `${withLoc.length}/${records.length} records have location data`,
              `Sample employee: ${sample.employeeName}`,
              `location.clockIn: ${JSON.stringify(ci)}`,
              `location.clockOut: ${JSON.stringify(co)}`,
              `typeof clockIn.latitude: ${typeof ci?.latitude}`,
              `typeof clockIn.lat: ${typeof ci?.lat}`,
              ci?.latitude != null
                ? `Accessing .latitude works: ${ci.latitude}`
                : ci?.lat != null
                  ? `WARNING: Field is .lat NOT .latitude! Value: ${ci.lat}`
                  : `PROBLEM: Neither .latitude nor .lat found`,
            ].join('\n'),
          };
          return copy;
        });
      }
    } catch (err: any) {
      setResults((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { step: '4. Attendance record location shape', status: 'fail', detail: `Error: ${err.message}` };
        return copy;
      });
    }

    setRunning(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Geocoding Diagnostic</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Tests whether reverse geocoding (coordinates → address) is working end-to-end.</p>

      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
            <input
              value={testLat}
              onChange={(e) => setTestLat(e.target.value)}
              className="px-3 py-2 border rounded-md w-40 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
            <input
              value={testLon}
              onChange={(e) => setTestLon(e.target.value)}
              className="px-3 py-2 border rounded-md w-40 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={runDiagnostics}
            disabled={running}
            className="px-6 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:opacity-50"
          >
            {running ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {results.map((r, i) => (
          <div
            key={i}
            className={`rounded-lg border p-4 ${
              r.status === 'ok'
                ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                : r.status === 'fail'
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                  : 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
            }`}
          >
            <div className="font-semibold text-sm mb-1">
              {r.status === 'ok' ? '✅' : r.status === 'fail' ? '❌' : '⏳'} {r.step}
            </div>
            <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-mono">{r.detail}</pre>
          </div>
        ))}
      </div>

      {results.length > 0 && !running && (
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h2 className="font-bold mb-2">Summary</h2>
          {results.every((r) => r.status === 'ok') ? (
            <p className="text-green-700 dark:text-green-400 font-medium">All tests passed! Geocoding is working. Try exporting again from the Attendance Sheet.</p>
          ) : (
            <div className="text-red-700 dark:text-red-400">
              <p className="font-medium mb-2">Some tests failed:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {results.some((r) => r.step.includes('1.') && r.status === 'fail') && (
                  <li>Test 1: Nominatim blocked from browser — OK if Test 2/3 pass (server proxy handles it).</li>
                )}
                {results.some((r) => r.step.includes('2.') && r.status === 'fail') && (
                  <li>Test 2: GET API route broken — check Next.js terminal for errors.</li>
                )}
                {results.some((r) => r.step.includes('3.') && r.status === 'fail') && (
                  <li>Test 3: Batch POST endpoint broken — check Next.js terminal for errors.</li>
                )}
                {results.some((r) => r.step.includes('4.') && r.status === 'fail') && (
                  <li>Test 4: Attendance records missing location data or unexpected shape — see details above.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
