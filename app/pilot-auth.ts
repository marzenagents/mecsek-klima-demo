"use client";

export type PilotAuthUser = {
  id: string;
  email: string;
};

export type PilotAuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: PilotAuthUser | null;
};

export type PilotConfig = {
  supabaseUrl: string;
  anonKey: string;
  workspaceId: string;
};

const SESSION_KEY = "mecsek-pilot-auth-v1";

export function getPilotConfig(): PilotConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const workspaceId = process.env.NEXT_PUBLIC_DEMO_WORKSPACE_ID;
  if (!supabaseUrl || !anonKey || !workspaceId) return null;
  return { supabaseUrl, anonKey, workspaceId };
}

function authHeaders(config: PilotConfig, accessToken = config.anonKey) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function readStoredSession(): PilotAuthSession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as PilotAuthSession;
    return session.accessToken && session.refreshToken ? session : null;
  } catch {
    return null;
  }
}

function storeSession(session: PilotAuthSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export function parsePilotAuthHash(hash: string, now = Date.now()): PilotAuthSession | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  const expiresIn = Number(params.get("expires_in") ?? "3600");
  return {
    accessToken,
    refreshToken,
    expiresAt: now + Math.max(60, Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
    user: null,
  };
}

function sessionFromLocationHash(): PilotAuthSession | null {
  const session = parsePilotAuthHash(window.location.hash);
  if (!session) return null;
  storeSession(session);
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  return session;
}

async function readError(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { error_description?: string; msg?: string; message?: string };
    return payload.error_description ?? payload.msg ?? payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function refreshSession(config: PilotConfig, refreshToken: string) {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(config),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    storeSession(null);
    return null;
  }
  const payload = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user?: { id: string; email?: string };
  };
  const session: PilotAuthSession = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    user: payload.user?.email ? { id: payload.user.id, email: payload.user.email } : null,
  };
  storeSession(session);
  return session;
}

async function attachUser(config: PilotConfig, session: PilotAuthSession) {
  if (session.user) return session;
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: authHeaders(config, session.accessToken),
  });
  if (!response.ok) return null;
  const payload = await response.json() as { id: string; email?: string };
  if (!payload.email) return null;
  const updated = { ...session, user: { id: payload.id, email: payload.email } };
  storeSession(updated);
  return updated;
}

export async function getPilotSession(): Promise<PilotAuthSession | null> {
  const config = getPilotConfig();
  if (!config) return null;

  let session = sessionFromLocationHash() ?? readStoredSession();
  if (!session) return null;
  if (session.expiresAt <= Date.now() + 60_000) {
    session = await refreshSession(config, session.refreshToken);
  }
  return session ? attachUser(config, session) : null;
}

export async function getPilotAccessToken() {
  return (await getPilotSession())?.accessToken ?? null;
}

export async function requestPilotMagicLink(email: string) {
  const config = getPilotConfig();
  if (!config) throw new Error("A központi pilotkapcsolat nincs beállítva.");
  const response = await fetch(`${config.supabaseUrl}/auth/v1/otp`, {
    method: "POST",
    headers: authHeaders(config),
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      create_user: true,
      email_redirect_to: window.location.origin,
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "A belépési e-mail küldése sikertelen."));
  }
}

export async function signOutPilot() {
  const config = getPilotConfig();
  const session = readStoredSession();
  try {
    if (config && session) {
      await fetch(`${config.supabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: authHeaders(config, session.accessToken),
      });
    }
  } finally {
    storeSession(null);
  }
}
