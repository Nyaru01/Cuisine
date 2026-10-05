export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const prefix = "a-table-cache:";
export function clearCache() {
  for (const key of Object.keys(localStorage))
    if (key.startsWith(prefix)) localStorage.removeItem(key);
}
export async function api<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const key = `${prefix}${url}`;
  try {
    const {getIdentityToken}=await import('./firebase');
    const token=await getIdentityToken();
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "A-Table",
        "X-Cuisine-Version": "2",
        ...(token?{Authorization:`Bearer ${token}`} : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && url !== "/api/auth/login") clearCache();
      throw new HttpError(
        response.status,
        data.error || "Une erreur est survenue.",
      );
    }
    if (method === "GET") {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        /* Le quota du cache ne bloque pas l'utilisation. */
      }
    }
    return data as T;
  } catch (error) {
    if (method === "GET" && !(error instanceof HttpError)) {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          return JSON.parse(cached) as T;
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
    if (error instanceof HttpError) throw error;
    throw new Error(
      "Connexion indisponible. Les pages déjà consultées restent accessibles.",
    );
  }
}
