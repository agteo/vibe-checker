export async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  return parseJsonResponse<T>(response);
}

export async function postJson<T>(
  url: string,
  body: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse<T>(response);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${response.status} ${response.statusText}${errorBody ? `: ${errorBody}` : ''}`);
  }

  return response.json() as Promise<T>;
}
