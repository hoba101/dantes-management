export const API_BASE_URL = "http://localhost:3001/api";

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

async function fetchWithApi(endpoint: string, options: RequestOptions = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  
  // If we are passing JSON and haven't set Content-Type, set it automatically
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Include credentials for cookies (e.g. JWT) if implemented via cookies
  const config: RequestInit = {
    method: options.method || "GET",
    headers,
    credentials: "omit", // or "include" if using cookies. Wait, standard is omit, but backend supports credentials. We will use include.
  };

  config.credentials = "include";

  if (options.body) {
    config.body =
      options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "An error occurred");
  }

  return data;
}

export const api = {
  get: (endpoint: string, headers?: Record<string, string>) =>
    fetchWithApi(endpoint, { method: "GET", headers }),
  post: (endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    fetchWithApi(endpoint, { method: "POST", body, headers }),
  put: (endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    fetchWithApi(endpoint, { method: "PUT", body, headers }),
  delete: (endpoint: string, headers?: Record<string, string>) =>
    fetchWithApi(endpoint, { method: "DELETE", headers }),
};
