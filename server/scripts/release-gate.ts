import '../config/loadEnvironment.js';

type PlanResponse = {
  itinerary?: {
    title?: string;
    city?: string;
    venues?: Array<{
      name?: string;
      activityDescription?: string | null;
      photoUrl?: string | null;
    }>;
    travelTimes?: Array<unknown>;
  };
  processingTimeMs?: number;
  error?: string;
  message?: string;
};

type GateCase = {
  name: string;
  city: string;
  query: string;
  minVenues: number;
  expectedTravelLegs?: number;
  maxProcessingTimeMs: number;
  requireAllVenuePhotos?: boolean;
};

const baseUrl = process.env.RELEASE_GATE_BASE_URL || 'https://london-day-planner-1.vercel.app';
const requestTimeoutMs = Number(process.env.RELEASE_GATE_TIMEOUT_MS || 95_000);
const date = process.env.RELEASE_GATE_DATE || new Date().toISOString().slice(0, 10);
const startTime = process.env.RELEASE_GATE_START_TIME || '11:00';

const cases: GateCase[] = [
  {
    name: 'London two-stop dining',
    city: 'london',
    query: 'lunch in Mayfair, dinner in Holborn',
    minVenues: 2,
    expectedTravelLegs: 1,
    maxProcessingTimeMs: 45_000,
    requireAllVenuePhotos: true,
  },
  {
    name: 'London four-stop mixed day',
    city: 'london',
    query: 'British Museum in the morning, then lunch at Borough Market, then drinks in Soho, then dinner in Covent Garden',
    minVenues: 4,
    expectedTravelLegs: 3,
    maxProcessingTimeMs: 65_000,
    requireAllVenuePhotos: true,
  },
  {
    name: 'NYC two-stop day',
    city: 'nyc',
    query: 'coffee in West Village, dinner in Soho',
    minVenues: 2,
    expectedTravelLegs: 1,
    maxProcessingTimeMs: 45_000,
    requireAllVenuePhotos: true,
  },
  {
    name: 'Austin two-stop day',
    city: 'austin',
    query: 'coffee near UT Austin, dinner downtown',
    minVenues: 2,
    expectedTravelLegs: 1,
    maxProcessingTimeMs: 45_000,
    requireAllVenuePhotos: true,
  },
];

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlaceholderVenue(venue: { name?: string; activityDescription?: string | null }): boolean {
  return (venue.activityDescription || '').includes('No specific venue found');
}

async function verifyPhoto(urlString: string): Promise<void> {
  const response = await fetchJson(urlString, { method: 'GET' }, 15_000);
  assert(response.ok, `Photo request failed with ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  assert(contentType.startsWith('image/'), `Photo content-type was ${contentType || 'missing'}`);
  await response.body?.cancel();
}

async function runCase(testCase: GateCase): Promise<void> {
  const requestUrl = `${baseUrl}/api/${testCase.city}/plan`;
  const startedAt = Date.now();
  const response = await fetchJson(
    requestUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: testCase.query,
        date,
        startTime,
      }),
    },
    requestTimeoutMs
  );

  assert(response.ok, `${testCase.name}: API returned ${response.status}`);

  const payload = (await response.json()) as PlanResponse;
  assert(!payload.error, `${testCase.name}: API error ${payload.error} ${payload.message || ''}`.trim());
  assert(payload.itinerary, `${testCase.name}: missing itinerary payload`);

  const venues = payload.itinerary.venues || [];
  const travelTimes = payload.itinerary.travelTimes || [];
  const processingTimeMs = payload.processingTimeMs ?? (Date.now() - startedAt);

  assert(venues.length >= testCase.minVenues, `${testCase.name}: expected at least ${testCase.minVenues} venues, got ${venues.length}`);
  assert(processingTimeMs <= testCase.maxProcessingTimeMs, `${testCase.name}: processingTimeMs ${processingTimeMs} exceeded ${testCase.maxProcessingTimeMs}`);
  assert(venues.every((venue) => venue.name && venue.name.trim().length > 0), `${testCase.name}: one or more venues had empty names`);
  assert(venues.every((venue) => !isPlaceholderVenue(venue)), `${testCase.name}: placeholder venue text detected`);

  if (typeof testCase.expectedTravelLegs === 'number') {
    assert(
      travelTimes.length === testCase.expectedTravelLegs,
      `${testCase.name}: expected ${testCase.expectedTravelLegs} travel legs, got ${travelTimes.length}`
    );
  }

  if (testCase.requireAllVenuePhotos) {
    assert(venues.every((venue) => !!venue.photoUrl), `${testCase.name}: missing one or more venue photos`);
  }

  const firstPhotoUrl = venues.find((venue) => venue.photoUrl)?.photoUrl;
  assert(firstPhotoUrl, `${testCase.name}: no photo URL available to verify`);
  const absolutePhotoUrl = new URL(firstPhotoUrl, baseUrl).toString();
  await verifyPhoto(absolutePhotoUrl);

  console.log(
    `PASS ${testCase.name} | venues=${venues.length} travel=${travelTimes.length} processing=${processingTimeMs}ms photo=ok`
  );
}

async function main() {
  console.log(`Running itinerary release gate against ${baseUrl}`);
  console.log(`Using date=${date} startTime=${startTime}`);

  for (const testCase of cases) {
    await runCase(testCase);
  }

  console.log('All itinerary release-gate checks passed.');
}

main().catch((error) => {
  console.error('Itinerary release gate failed.');
  console.error(error);
  process.exitCode = 1;
});
