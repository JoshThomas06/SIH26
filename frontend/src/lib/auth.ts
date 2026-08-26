const TOKEN_KEY = "aegis-token";
const PROFILE_KEY = "aegis-profile";

export type OperatorProfile = {
  token: string;
  email: string;
  name: string;
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getProfile(): OperatorProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  const token = getToken();
  if (!raw || !token) return null;
  try {
    return { ...JSON.parse(raw), token } as OperatorProfile;
  } catch {
    return null;
  }
}

export function setSession(profile: OperatorProfile): void {
  localStorage.setItem(TOKEN_KEY, profile.token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ email: profile.email, name: profile.name }));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export async function authRequest(
  path: "/api/v1/auth/login" | "/api/v1/auth/register",
  body: { email: string; password: string; name?: string },
): Promise<OperatorProfile> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || "Authentication failed");
  }
  return (await res.json()) as OperatorProfile;
}

export async function commandSimulation(action: "start" | "pause" | "reset"): Promise<void> {
  const token = getToken();
  const res = await fetch(`/api/v1/simulation/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Simulation command failed");
}

export async function setSchedulerConfig(payload: Record<string, unknown>): Promise<void> {
  const token = getToken();
  const res = await fetch("/api/v1/scheduler/config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Scheduler config failed");
}
