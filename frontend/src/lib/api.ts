const DEFAULT_API_URL = '/api';

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  return configured && configured.length > 0 ? configured.replace(/\/$/, '') : DEFAULT_API_URL;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const payload = (await response.json()) as {
        message?: string | string[];
        error?: { message?: string };
      };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (payload.message) {
        message = payload.message;
      } else if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
