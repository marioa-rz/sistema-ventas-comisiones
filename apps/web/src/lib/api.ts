const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  statusCode: number;
  errorPayload: unknown;

  constructor(statusCode: number, message: string, errorPayload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorPayload = errorPayload;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  idempotencyKey?: string;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, idempotencyKey, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
    });
  } catch (networkError: any) {
    if (networkError instanceof TypeError) {
      throw new ApiError(
        0,
        `No se pudo conectar con la API en ${API_BASE_URL}. Asegúrate de que el backend esté iniciado con 'npm run dev' y escuchando en el puerto 3000.`,
      );
    }
    throw networkError;
  }

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    let errorPayload: unknown;

    if (contentType.includes('application/json')) {
      try {
        errorPayload = await response.json();
        const payload = errorPayload as { message?: string | string[]; error?: string | { message?: string } };
        if (typeof payload?.message === 'string') {
          errorMessage = payload.message;
        } else if (Array.isArray(payload?.message)) {
          errorMessage = payload.message.join(', ');
        } else if (typeof payload?.error === 'string') {
          errorMessage = payload.error;
        } else if (payload?.error && typeof payload.error.message === 'string') {
          errorMessage = payload.error.message;
        }
      } catch {
        // Fallback al mensaje base
      }
    } else {
      try {
        errorMessage = await response.text();
      } catch {
        // Fallback al mensaje base
      }
    }

    throw new ApiError(response.status, errorMessage, errorPayload);
  }

  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return response.text() as unknown as Promise<T>;
}

export async function apiDownload(endpoint: string, token: string): Promise<Blob> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, */*',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (networkError) {
    if (networkError instanceof TypeError) {
      throw new ApiError(0, `No se pudo conectar con la API en ${API_BASE_URL}.`);
    }
    throw networkError;
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let message = `HTTP Error ${response.status}`;
    let payload: unknown;
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => undefined);
      const error = payload as { message?: string | string[] } | undefined;
      if (typeof error?.message === 'string') message = error.message;
      else if (Array.isArray(error?.message)) message = error.message.join(', ');
    }
    throw new ApiError(response.status, message, payload);
  }

  return response.blob();
}
