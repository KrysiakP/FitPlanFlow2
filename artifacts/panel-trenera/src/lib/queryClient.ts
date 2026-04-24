import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function normalizeUrl(path: string): string {
  // Ensure URL starts with single slash and has no double slashes
  if (!path) return "/";
  let normalized = path;
  // Add leading slash if missing
  if (!normalized.startsWith("/") && !normalized.startsWith("http")) {
    normalized = "/" + normalized;
  }
  // Remove duplicate slashes (except in protocol like http://)
  normalized = normalized.replace(/([^:])\/\/+/g, "$1/");
  return normalized;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const fullUrl = normalizeUrl(url);
  console.log(`[API] ${method} ${fullUrl}`, data ? JSON.stringify(data).slice(0, 100) : "");
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log(`[API] Response: ${res.status} ${res.statusText}`);
    await throwIfResNotOk(res);
    
    // Handle empty responses (204 No Content)
    const contentType = res.headers.get("content-type");
    if (res.status === 204 || !contentType?.includes("application/json")) {
      return {};
    }
    return await res.json();
  } catch (error) {
    console.error(`[API] Error:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from query key segments, handling leading slashes
    const segments = queryKey.map(k => String(k).replace(/^\/+/, "")).filter(Boolean);
    const url = "/" + segments.join("/");
    const fullUrl = normalizeUrl(url);
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
