export type LeadStatus =
  | "Új"
  | "Visszahívandó"
  | "Kapcsolatfelvétel megtörtént"
  | "Felmérés egyeztetve"
  | "Ajánlat készül"
  | "Ajánlat elküldve"
  | "Utánkövetés szükséges"
  | "Megnyert"
  | "Elvesztett"
  | "Nem releváns";

export type Priority = "Magas" | "Közepes" | "Alacsony";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  zip: string;
  service: string;
  property: string;
  area: string;
  rooms: string;
  ownership: string;
  urgency: string;
  budget: string;
  description: string;
  contact: string;
  callTime: string;
  technical: string;
  source: string;
  status: LeadStatus;
  priority: Priority;
  owner: string;
  value: number;
  nextAction: string;
  nextDate: string;
  createdAt: string;
  notes: string[];
  timeline: string[];
  offerSentAt?: string;
  lastContactAt?: string;
  lossReason?: string;
};

export type Task = {
  id: string;
  leadId: string;
  type: string;
  due: string;
  time?: string;
  priority: Priority;
  owner?: string;
  note?: string;
  done: boolean;
  followupKey?: "offer-3" | "offer-7";
};

export const OFFER_STATUSES: LeadStatus[] = [
  "Ajánlat elküldve",
  "Utánkövetés szükséges",
  "Megnyert",
  "Elvesztett",
];

export function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function shiftIsoDate(base: string, days: number) {
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export function createMissingFollowups(tasks: Task[], leadId: string, sentAt: string) {
  const definitions = [
    { key: "offer-3" as const, days: 3, type: "Ajánlat utáni érdeklődés – 1." },
    { key: "offer-7" as const, days: 7, type: "Ajánlat utáni érdeklődés – 2." },
  ];

  return definitions
    .filter(({ key }) => !tasks.some((task) => task.leadId === leadId && task.followupKey === key))
    .map(({ key, days, type }) => ({
      id: `T-${leadId}-${key}`,
      leadId,
      type,
      due: shiftIsoDate(sentAt, days),
      priority: "Közepes" as const,
      owner: "Bálint",
      done: false,
      followupKey: key,
    }));
}

export function daysSince(date: string | undefined, current = isoDate()) {
  if (!date) return null;
  const start = new Date(`${date}T12:00:00`).getTime();
  const end = new Date(`${current}T12:00:00`).getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

export function migrateLead(lead: Lead): Lead {
  return {
    ...lead,
    notes: Array.isArray(lead.notes) ? lead.notes : [],
    timeline: Array.isArray(lead.timeline) ? lead.timeline : [],
    lastContactAt: lead.lastContactAt ?? lead.createdAt,
    offerSentAt:
      lead.offerSentAt ??
      (OFFER_STATUSES.includes(lead.status) ? lead.createdAt : undefined),
  };
}

export function migrateTask(task: Task): Task {
  const followupKey =
    task.followupKey ??
    (task.type.includes("– 1.") ? "offer-3" : task.type.includes("– 2.") ? "offer-7" : undefined);
  return { ...task, owner: task.owner ?? "Bálint", followupKey };
}

export function computeReportMetrics(leads: Lead[], tasks: Task[]) {
  const total = leads.length;
  const sentOffers = leads.filter((lead) => OFFER_STATUSES.includes(lead.status));
  const won = leads.filter((lead) => lead.status === "Megnyert");
  const lost = leads.filter((lead) => lead.status === "Elvesztett");
  const active = leads.filter((lead) => !["Elvesztett", "Nem releváns"].includes(lead.status));
  const withoutFollowup = sentOffers.filter(
    (lead) =>
      !tasks.some(
        (task) =>
          task.leadId === lead.id &&
          !task.done &&
          (task.followupKey === "offer-3" || task.followupKey === "offer-7"),
      ),
  );

  return {
    total,
    newCount: leads.filter((lead) => lead.status === "Új").length,
    sentCount: sentOffers.length,
    wonCount: won.length,
    lostCount: lost.length,
    leadToOfferRate: total ? Math.round((sentOffers.length / total) * 100) : null,
    offerToWinRate: sentOffers.length ? Math.round((won.length / sentOffers.length) * 100) : null,
    averageOfferValue: sentOffers.length
      ? Math.round(sentOffers.reduce((sum, lead) => sum + lead.value, 0) / sentOffers.length)
      : null,
    pipelineValue: active.reduce((sum, lead) => sum + lead.value, 0),
    withoutFollowup: withoutFollowup.length,
    waitingFollowupCount: leads.filter((lead) =>
      ["Ajánlat elküldve", "Utánkövetés szükséges"].includes(lead.status),
    ).length,
    waitingFollowupValue: leads
      .filter((lead) => ["Ajánlat elküldve", "Utánkövetés szükséges"].includes(lead.status))
      .reduce((sum, lead) => sum + lead.value, 0),
  };
}
