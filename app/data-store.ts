import type { Lead, Task } from "./demo-logic";
import { getPilotAccessToken, getPilotConfig, type PilotConfig } from "./pilot-auth";
import type { PilotState } from "./pilot-model";

export type DataMode = "Helyi demó" | "Supabase pilot";

export interface PilotDataAdapter {
  mode: DataMode;
  load(defaults: PilotState): Promise<PilotState>;
  save(state: PilotState): Promise<void>;
  clear(): Promise<void>;
  submitIntake(lead: Lead, honeypot?: string): Promise<string>;
  removeIntake(leadId: string): Promise<void>;
}

export class PilotAuthRequiredError extends Error {
  constructor() {
    super("A központi kezelőfelülethez bejelentkezés szükséges.");
    this.name = "PilotAuthRequiredError";
  }
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

function emptyPilotState(defaults: PilotState): PilotState {
  return {
    ...defaults,
    leads: [],
    tasks: [],
    offers: [],
    calendar: [],
    communications: [],
  };
}

function intakeTask(lead: Lead): Task {
  return {
    id: `T-${lead.id}-intake`,
    leadId: lead.id,
    type: "Visszahívás",
    due: lead.nextDate,
    priority: lead.priority,
    owner: lead.owner,
    note: "Nyilvános ajánlatkérésből automatikusan létrehozva.",
    done: false,
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

  async submitIntake(lead: Lead) {
    return lead.id;
  }

  async removeIntake() {}
}

class SupabasePilotAdapter implements PilotDataAdapter {
  mode: DataMode = "Supabase pilot";

  constructor(private readonly config: PilotConfig) {}

  private headers(accessToken: string, extra: Record<string, string> = {}) {
    return {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private async authenticatedHeaders(extra: Record<string, string> = {}) {
    const accessToken = await getPilotAccessToken();
    if (!accessToken) throw new PilotAuthRequiredError();
    return this.headers(accessToken, extra);
  }

  private async errorMessage(response: Response, fallback: string) {
    try {
      const payload = await response.json() as { message?: string; hint?: string };
      return payload.message ?? payload.hint ?? fallback;
    } catch {
      return fallback;
    }
  }

  async load(defaults: PilotState) {
    const headers = await this.authenticatedHeaders();
    const [stateResponse, intakeResponse] = await Promise.all([
      fetch(
        `${this.config.supabaseUrl}/rest/v1/mecsek_demo_state?workspace_id=eq.${encodeURIComponent(this.config.workspaceId)}&select=payload&limit=1`,
        { headers },
      ),
      fetch(
        `${this.config.supabaseUrl}/rest/v1/mecsek_intake_leads?workspace_id=eq.${encodeURIComponent(this.config.workspaceId)}&select=lead_id,payload&order=created_at.desc`,
        { headers },
      ),
    ]);
    if (!stateResponse.ok || !intakeResponse.ok) {
      const failed = !stateResponse.ok ? stateResponse : intakeResponse;
      throw new Error(await this.errorMessage(failed, "A központi pilotadatok betöltése sikertelen."));
    }

    const stateRows = await stateResponse.json() as { payload: Partial<PilotState> }[];
    const intakeRows = await intakeResponse.json() as { lead_id: string; payload: Lead }[];
    const stored = stateRows[0]?.payload
      ? mergeState(emptyPilotState(defaults), stateRows[0].payload)
      : emptyPilotState(defaults);
    const knownLeadIds = new Set(stored.leads.map((lead) => lead.id));
    const newLeads = intakeRows
      .map((row) => ({ ...row.payload, id: row.lead_id }))
      .filter((lead) => !knownLeadIds.has(lead.id));
    const knownTaskLeadIds = new Set(stored.tasks.map((task) => task.leadId));
    const newTasks = newLeads.filter((lead) => !knownTaskLeadIds.has(lead.id)).map(intakeTask);
    return {
      ...stored,
      leads: [...newLeads, ...stored.leads],
      tasks: [...newTasks, ...stored.tasks],
    };
  }

  async save(state: PilotState) {
    const response = await fetch(`${this.config.supabaseUrl}/rest/v1/mecsek_demo_state`, {
      method: "POST",
      headers: await this.authenticatedHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        workspace_id: this.config.workspaceId,
        payload: state,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      throw new Error(await this.errorMessage(response, "A központi pilotmentés sikertelen."));
    }
  }

  async clear() {
    const headers = await this.authenticatedHeaders();
    const [stateResponse, intakeResponse] = await Promise.all([
      fetch(
        `${this.config.supabaseUrl}/rest/v1/mecsek_demo_state?workspace_id=eq.${encodeURIComponent(this.config.workspaceId)}`,
        { method: "DELETE", headers },
      ),
      fetch(
        `${this.config.supabaseUrl}/rest/v1/mecsek_intake_leads?workspace_id=eq.${encodeURIComponent(this.config.workspaceId)}`,
        { method: "DELETE", headers },
      ),
    ]);
    if (!stateResponse.ok || !intakeResponse.ok) {
      const failed = !stateResponse.ok ? stateResponse : intakeResponse;
      throw new Error(await this.errorMessage(failed, "A központi pilotadatok törlése sikertelen."));
    }
  }

  async submitIntake(lead: Lead, honeypot = "") {
    const response = await fetch(`${this.config.supabaseUrl}/rest/v1/rpc/mecsek_submit_public_lead`, {
      method: "POST",
      headers: this.headers(this.config.anonKey),
      body: JSON.stringify({
        p_workspace_id: this.config.workspaceId,
        p_payload: lead,
        p_honeypot: honeypot,
      }),
    });
    if (!response.ok) {
      throw new Error(await this.errorMessage(response, "Az ajánlatkérés központi rögzítése sikertelen."));
    }
    return await response.json() as string;
  }

  async removeIntake(leadId: string) {
    const response = await fetch(
      `${this.config.supabaseUrl}/rest/v1/mecsek_intake_leads?workspace_id=eq.${encodeURIComponent(this.config.workspaceId)}&lead_id=eq.${encodeURIComponent(leadId)}`,
      { method: "DELETE", headers: await this.authenticatedHeaders() },
    );
    if (!response.ok) {
      throw new Error(await this.errorMessage(response, "A központi érdeklődő törlése sikertelen."));
    }
  }
}

export function createPilotDataAdapter(): PilotDataAdapter {
  const config = getPilotConfig();
  return config ? new SupabasePilotAdapter(config) : new LocalDemoAdapter();
}
