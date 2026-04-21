const KV_KEY = 'flights';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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

export async function onRequestPut({ request, env, params }) {
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

  const { id } = params;
  let updates;
  try {
    updates = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const flights = await getFlights(env);
  const idx = flights.findIndex(f => f.id === id);
  if (idx === -1) return json({ error: 'Not found' }, 404);

  flights[idx] = { ...flights[idx], ...updates, id };
  await env.EMPTY_LEGS.put(KV_KEY, JSON.stringify(flights));

  return json(flights[idx]);
}

export async function onRequestDelete({ request, env, params }) {
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

  const { id } = params;
  const flights = await getFlights(env);
  const filtered = flights.filter(f => f.id !== id);

  if (filtered.length === flights.length) return json({ error: 'Not found' }, 404);

  await env.EMPTY_LEGS.put(KV_KEY, JSON.stringify(filtered));
  return json({ deleted: id });
}
