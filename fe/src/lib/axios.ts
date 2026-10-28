import axios from "axios";

export const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // Di browser client, selalu gunakan relative URL "" agar request /api/*
    // otomatis diarahkan ke origin saat ini (mis. http://187.77.155.25 atau domain)
    // dan ditangani langsung oleh reverse proxy Caddy (anti-CORS, anti-localhost leak)
    return "";
  }
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://backend:5000";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token") || localStorage.getItem("kasir_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const isAuthPage =
        window.location.pathname.includes("/login") ||
        window.location.pathname.includes("/register");

      if (!isAuthPage) {
        localStorage.removeItem("token");
        localStorage.removeItem("kasir_token");
        localStorage.removeItem("role");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
