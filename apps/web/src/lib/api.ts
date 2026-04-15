const TOKEN_KEY = "datamemo_access_token";

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001"
  );
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

function resolveBearer(
  init?: RequestInit & { token?: string | null },
): string | null {
  if (init && Object.prototype.hasOwnProperty.call(init, "token")) {
    return init.token ?? null;
  }
  return getAccessToken();
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const token = resolveBearer(init);
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (e) {
    const hint =
      `Cannot reach API at ${base}. Start the backend in another terminal: npm run dev:api (port 3001). ` +
      `If the API uses another URL, set NEXT_PUBLIC_API_URL in apps/web/.env.local.`;
    if (e instanceof TypeError || (e instanceof Error && /fetch|network/i.test(e.message))) {
      throw new Error(hint);
    }
    throw e;
  }
  if (!res.ok) {
    const text = await res.text();
    let message = res.statusText;
    try {
      const j = JSON.parse(text) as { message?: unknown };
      if (typeof j.message === "string") message = j.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
