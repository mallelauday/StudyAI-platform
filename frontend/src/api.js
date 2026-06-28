/**
 * ============================================================
 * StudyAI Frontend — Centralized Axios API Client
 * ============================================================
 */

import axios from "axios";

// ── Environment-based API Base URL ───────────────────────────
const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

// Ensure base URL points to /api, avoiding missing or duplicate /api paths
const cleanBaseUrl = (url) => {
  if (!url) return "https://your-render-backend.onrender.com/api";
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const BASE_URL = cleanBaseUrl(envUrl);
const ACCESS_KEY = "studyai_access_token";
const REFRESH_KEY = "studyai_refresh_token";
const USER_KEY = "studyai_user";

// ── Token helpers ────────────────────────────────────────────
export const tokenStore = {
  getAccess:  () => localStorage.getItem(ACCESS_KEY)  || null,
  getRefresh: () => localStorage.getItem(REFRESH_KEY) || null,
  setAccess:  (t) => localStorage.setItem(ACCESS_KEY,  t),
  setRefresh: (t) => localStorage.setItem(REFRESH_KEY, t),
  setUser:    (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clearAll:   () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("studyai_token");
  },
};

// ── Axios instance ───────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor — attach Bearer token ────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.getAccess();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Refresh-token state ───────────────────────────────────────
let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, newToken = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(newToken);
  });
  refreshQueue = [];
}

async function silentRefresh() {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error("No refresh token available.");

  const response = await axios.post(`${BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.error || "Refresh failed.");
  }

  const { access_token } = response.data.data;
  tokenStore.setAccess(access_token);
  return access_token;
}

function forceLogout() {
  tokenStore.clearAll();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// ── Response interceptor — handle 401 with auto-refresh ─────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const isAuthEndpoint = originalRequest.url?.includes("/auth/");
    if (isAuthEndpoint) {
      forceLogout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const newToken = await silentRefresh();
      processQueue(null, newToken);
      originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Custom Domain Helpers attached to apiClient ──────────────
apiClient.generateStudyPlan = (payload) => apiClient.post("/study-plan/generate", payload);
apiClient.getStudyPlan = () => apiClient.get("/study-plan");
apiClient.updateStudyPlan = (days) => apiClient.put("/study-plan", { days });

apiClient.exportPDF = async (type = "study-plan", id = "") => {
  const response = await apiClient.get("/export/pdf", {
    params: { type, id },
    responseType: "arraybuffer"
  });
  response.blob = async () => response.data;
  return response;
};

export default apiClient;

// ── Named auth convenience wrapper ──────────────────────────
export const authApi = {
  login:    (credentials)  => apiClient.post("/auth/login",    credentials),
  register: (payload)      => apiClient.post("/auth/register", payload),
  refresh:  (refreshToken) => apiClient.post("/auth/refresh",  { refresh_token: refreshToken }),
  logout:   ()             => apiClient.post("/auth/logout"),
  me:       ()             => apiClient.get("/auth/me"),
};
