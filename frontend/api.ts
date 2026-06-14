const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000";

const TOKEN_KEY = "shelf_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export interface Link {
  id: number;
  url: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AnalyzeResult {
  title: string;
  description: string;
  category: string;
  tags: string[];
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const resp = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (resp.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await resp.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!resp.ok) {
    const detail =
      (data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : null) || `Request failed (${resp.status})`;
    throw new ApiError(resp.status, detail);
  }
  return data as T;
}

export const api = {
  register: (username: string, email: string, password: string) =>
    request<{ id: number; username: string; email: string }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ username, email, password }) }
    ),

  login: (username: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  listLinks: () => request<Link[]>("/api/links"),

  getLink: (id: number) => request<Link>(`/api/links/${id}`),

  analyzeUrl: (url: string) =>
    request<AnalyzeResult>("/api/links/analyze-url", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  createLink: (payload: {
    url: string;
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
    use_ai?: boolean;
  }) =>
    request<Link>("/api/links", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateLink: (
    id: number,
    payload: Partial<Pick<Link, "title" | "description" | "category" | "tags">>
  ) =>
    request<Link>(`/api/links/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteLink: (id: number) =>
    request<void>(`/api/links/${id}`, { method: "DELETE" }),

  search: (params: {
    q?: string;
    category?: string;
    tag?: string;
    sort?: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    return request<Link[]>(`/api/search?${qs.toString()}`);
  },

  importBookmarks: (file: File, useAi: boolean) => {
    const form = new FormData();
    form.append("file", file);
    return request<{
      total_found: number;
      imported: number;
      skipped_duplicates: number;
    }>(`/api/bookmarks/import?use_ai=${useAi}`, {
      method: "POST",
      body: form,
    });
  },
};
