const KV_KEY = 'flights';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function getFlights(env) {
  const raw = await env.EMPTY_LEGS.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.ADMIN_TOKEN}`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ env }) {
  const flights = await getFlights(env);
  return json(flights);
}

export async function onRequestPost({ request, env }) {
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const required = ['from', 'to', 'date', 'departs', 'aircraft', 'pax', 'saving_pct', 'price', 'original_price'];
  for (const field of required) {
    if (body[field] === undefined || body[field] === '') {
      return json({ error: `Missing field: ${field}` }, 400);
    }
  }

  const flight = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    from: String(body.from),
    to: String(body.to),
    from_code: String(body.from_code || ''),
    to_code: String(body.to_code || ''),
    duration: String(body.duration || ''),
    date: String(body.date),
    departs: String(body.departs),
    aircraft: String(body.aircraft),
    pax: Number(body.pax),
    saving_pct: Number(body.saving_pct),
    price: Number(body.price),
    original_price: Number(body.original_price),
    badge: String(body.badge || ''),
    region: String(body.region || ''),
    jet_class: String(body.jet_class || ''),
  };

  const flights = await getFlights(env);
  flights.push(flight);
  await env.EMPTY_LEGS.put(KV_KEY, JSON.stringify(flights));

  return json(flight, 201);
}
