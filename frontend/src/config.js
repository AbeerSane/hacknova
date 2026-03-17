export const API_BASE_URL =
 import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

export async function apiRequest(path, options = {}) {
 const response = await fetch(`${API_BASE_URL}${path}`, {
  headers: {
   "Content-Type": "application/json",
   ...(options.headers || {})
  },
  ...options
 });

 if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    let errorMessage = "Request failed";

    if (contentType.includes("application/json")) {
     const errorBody = await response.json().catch(() => ({}));
     errorMessage = errorBody.error || errorBody.message || errorMessage;
    } else {
     const errorText = await response.text().catch(() => "");
     if (errorText && errorText.trim()) {
        errorMessage = errorText.trim();
     }
    }

    throw new Error(errorMessage);
 }

 return response.json();
}
