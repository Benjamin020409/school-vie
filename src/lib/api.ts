import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    Accept: "application/json",
  },
});

// Ajoute le token à chaque requête si présent
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type Role = { name: string };
export type User = { id: number; name: string; email: string; roles: Role[] };

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post("/login", { email, password });
  localStorage.setItem("auth_token", data.token);
  return data.user;
}

export async function getUser(): Promise<User> {
  const { data } = await api.get<User>("/me");
  return data;
}

export async function logout() {
  await api.post("/logout");
  localStorage.removeItem("auth_token");
}