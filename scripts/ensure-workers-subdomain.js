import { pathToFileURL } from 'node:url';

const validSubdomain = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

class BootstrapError extends Error {}

function hasSubdomain(payload) {
  return (
    payload?.success === true &&
    Array.isArray(payload.errors) &&
    payload.errors.length === 0 &&
    typeof payload.result?.subdomain === 'string' &&
    validSubdomain.test(payload.result.subdomain)
  );
}

// Never include response bodies or underlying network errors: either can contain credentials.
async function request(fetchImpl, endpoint, apiToken, method, body) {
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new BootstrapError('Impossible de joindre Cloudflare pour configurer workers.dev.');
  }

  if (
    !response ||
    !Number.isInteger(response.status) ||
    typeof response.ok !== 'boolean' ||
    typeof response.json !== 'function'
  ) {
    throw new BootstrapError('Réponse Cloudflare invalide ; aucune nouvelle tentative effectuée.');
  }
  if (response.status === 401 || response.status === 403) {
    throw new BootstrapError('Cloudflare refuse cet accès ; vérifier les droits du jeton.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new BootstrapError('Réponse Cloudflare illisible ; aucune nouvelle tentative effectuée.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new BootstrapError('Réponse Cloudflare invalide ; aucune nouvelle tentative effectuée.');
  }
  return { response, payload };
}

export async function ensureWorkersSubdomain({
  accountId,
  apiToken,
  subdomain,
  fetchImpl = globalThis.fetch,
}) {
  if (typeof accountId !== 'string' || !/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new BootstrapError('CLOUDFLARE_ACCOUNT_ID est absent ou invalide.');
  }
  if (typeof apiToken !== 'string' || !apiToken.trim() || /[\r\n]/.test(apiToken)) {
    throw new BootstrapError('CLOUDFLARE_API_TOKEN est absent ou invalide.');
  }
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`;
  const current = await request(fetchImpl, endpoint, apiToken, 'GET');
  if (current.response.ok && hasSubdomain(current.payload)) {
    // This namespace belongs to the whole account. Never rename an existing namespace.
    return current.payload.result.subdomain;
  }

  const missing =
    (current.response.ok || current.response.status === 404) &&
    current.payload.success === false &&
    Array.isArray(current.payload.errors) &&
    current.payload.errors.length > 0 &&
    current.payload.errors.every((error) => error?.code === 10007);
  if (!missing) {
    throw new BootstrapError(
      'Cloudflare ne confirme pas l’absence de sous-domaine ; aucune modification effectuée.',
    );
  }
  if (typeof subdomain !== 'string' || !validSubdomain.test(subdomain)) {
    throw new BootstrapError(
      'CLOUDFLARE_WORKERS_SUBDOMAIN doit contenir 1 à 63 lettres minuscules, chiffres ou tirets, sans tiret aux extrémités.',
    );
  }

  const created = await request(fetchImpl, endpoint, apiToken, 'PUT', { subdomain });
  if (
    Array.isArray(created.payload.errors) &&
    created.payload.errors.some((error) => error?.code === 10031)
  ) {
    throw new BootstrapError('Le nom workers.dev demandé est déjà utilisé ; choisir un autre nom.');
  }
  if (
    !created.response.ok ||
    !hasSubdomain(created.payload) ||
    created.payload.result.subdomain !== subdomain
  ) {
    throw new BootstrapError(
      'La création du sous-domaine workers.dev n’est pas confirmée ; vérifier son nom et les droits du jeton.',
    );
  }
  return created.payload.result.subdomain;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const subdomain = await ensureWorkersSubdomain({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      subdomain: process.env.CLOUDFLARE_WORKERS_SUBDOMAIN,
    });
    console.log(`${subdomain}.workers.dev`);
  } catch (error) {
    console.error(
      error instanceof BootstrapError
        ? error.message
        : 'Échec inattendu de la configuration workers.dev.',
    );
    process.exitCode = 1;
  }
}
