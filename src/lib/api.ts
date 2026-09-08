import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
  },
});

export type Role = { name: string };
export type User = { id: number; name: string; email: string; roles: Role[] };

export async function ensureCsrfCookie() {
  await axios.get(`${API_URL}/sanctum/csrf-cookie`, { withCredentials: true });
}

export async function login(email: string, password: string): Promise<User> {
  await ensureCsrfCookie();
  await api.post("/login", { email, password });
  const { data } = await api.get<User>("/me");
  return data;
}

export async function getUser(): Promise<User> {
  const { data } = await api.get<User>("/me");
  return data;
}

export async function logout() {
  await api.post("/logout");
}