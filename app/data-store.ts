import type { PilotState } from "./pilot-model";

export type DataMode = "Helyi demó" | "Supabase pilot";

export interface PilotDataAdapter {
  mode: DataMode;
  load(defaults: PilotState): Promise<PilotState>;
  save(state: PilotState): Promise<void>;
  clear(): Promise<void>;
}

const STATE_KEY = "mecsek-pilot-state-v3";

function mergeState(defaults: PilotState, stored: Partial<PilotState>): PilotState {
  return {
    leads: Array.isArray(stored.leads) ? stored.leads : defaults.leads,
    tasks: Array.isArray(stored.tasks) ? stored.tasks : defaults.tasks,
    offers: Array.isArray(stored.offers) ? stored.offers : defaults.offers,
    calendar: Array.isArray(stored.calendar) ? stored.calendar : defaults.calendar,
    company: stored.company ? { ...defaults.company, ...stored.company } : defaults.company,
    communications: Array.isArray(stored.communications) ? stored.communications : defaults.communications,
  };
}

class LocalDemoAdapter implements PilotDataAdapter {
  mode: DataMode = "Helyi demó";

  async load(defaults: PilotState) {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) return mergeState(defaults, JSON.parse(saved) as Partial<PilotState>);

    const legacyLeads = localStorage.getItem("mecsek-leads");
    const legacyTasks = localStorage.getItem("mecsek-tasks");
    return mergeState(defaults, {
      leads: legacyLeads ? JSON.parse(legacyLeads) : undefined,
      tasks: legacyTasks ? JSON.parse(legacyTasks) : undefined,
    });
  }

  async save(state: PilotState) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  async clear() {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem("mecsek-leads");
    localStorage.removeItem("mecsek-tasks");
    localStorage.removeItem("mecsek-data-version");
  }
}

class SupabasePilotAdapter implements PilotDataAdapter {
  mode: DataMode = "Supabase pilot";

  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    private readonly workspaceId: string,
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  async load(defaults: PilotState) {
    const response = await fetch(
      `${this.url}/rest/v1/mecsek_demo_state?workspace_id=eq.${encodeURIComponent(this.workspaceId)}&select=payload&limit=1`,
      { headers: this.headers() },
    );
    if (!response.ok) throw new Error("A központi pilotadatok betöltése sikertelen.");
    const rows = await response.json() as { payload: Partial<PilotState> }[];
    return rows[0]?.payload ? mergeState(defaults, rows[0].payload) : defaults;
  }

  async save(state: PilotState) {
    const response = await fetch(`${this.url}/rest/v1/mecsek_demo_state`, {
      method: "POST",
      headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        workspace_id: this.workspaceId,
        payload: state,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error("A központi pilotmentés sikertelen.");
  }

  async clear() {
    const response = await fetch(
      `${this.url}/rest/v1/mecsek_demo_state?workspace_id=eq.${encodeURIComponent(this.workspaceId)}`,
      { method: "DELETE", headers: this.headers() },
    );
    if (!response.ok) throw new Error("A központi pilotadatok törlése sikertelen.");
  }
}

export function createPilotDataAdapter(): PilotDataAdapter {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const workspaceId = process.env.NEXT_PUBLIC_DEMO_WORKSPACE_ID;
  if (url && anonKey && workspaceId) {
    return new SupabasePilotAdapter(url.replace(/\/$/, ""), anonKey, workspaceId);
  }
  return new LocalDemoAdapter();
}
