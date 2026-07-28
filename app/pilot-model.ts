import type { Lead, Task } from "./demo-logic";

export type OfferStatus =
  | "Piszkozat"
  | "Jóváhagyásra vár"
  | "Kiküldött"
  | "Megtekintett"
  | "Elfogadott"
  | "Elutasított"
  | "Lejárt";

export type OfferLine = {
  id: string;
  name: string;
  kind: "Anyag" | "Munkadíj" | "Egyéb";
  quantity: number;
  unitPrice: number;
};

export type Offer = {
  id: string;
  leadId: string;
  createdAt: string;
  validUntil: string;
  status: OfferStatus;
  lines: OfferLine[];
  discountPercent: number;
  vatPercent: number;
  notes: string;
  paymentTerms: string;
  sentAt?: string;
};

export type CalendarEntry = {
  id: string;
  leadId: string;
  title: string;
  type: "Telefonos egyeztetés" | "Visszahívás" | "Helyszíni felmérés" | "Ajánlat-utánkövetés" | "Egyéb";
  date: string;
  time: string;
  duration: number;
  owner: string;
  address: string;
  notes: string;
};

export type CompanySettings = {
  name: string;
  phone: string;
  email: string;
  serviceArea: string;
  primaryColor: string;
  services: string[];
  team: string[];
  paymentTerms: string;
  offerValidityDays: number;
  retentionDays: number;
  templates: {
    leadConfirmation: string;
    ownerNotification: string;
    offerEmail: string;
    followupEmail: string;
    appointmentReminder: string;
  };
};

export type CommunicationLog = {
  id: string;
  leadId: string;
  kind: "Visszaigazolás" | "Új érdeklődő" | "Ajánlat" | "Utánkövetés" | "Időpont-emlékeztető";
  subject: string;
  body: string;
  createdAt: string;
  mode: "Demó előnézet";
};

export type PilotState = {
  leads: Lead[];
  tasks: Task[];
  offers: Offer[];
  calendar: CalendarEntry[];
  company: CompanySettings;
  communications: CommunicationLog[];
};

export type DashboardFilter =
  | { scope: "lead"; value: string; label: string }
  | { scope: "task"; value: "overdue" | "today-callback" | "survey" | "followup"; label: string }
  | { scope: "offer"; value: string; label: string }
  | null;

export type DashboardSection =
  | "Áttekintés"
  | "Érdeklődők"
  | "Kanban"
  | "Mai feladatok"
  | "Ajánlatok"
  | "Naptár"
  | "Munkanap"
  | "Kimutatások"
  | "Beállítások";

const SECTION_SLUGS: Record<DashboardSection, string> = {
  "Áttekintés": "attekintes",
  "Érdeklődők": "erdeklodok",
  "Kanban": "kanban",
  "Mai feladatok": "feladatok",
  "Ajánlatok": "ajanlatok",
  "Naptár": "naptar",
  "Munkanap": "munkanap",
  "Kimutatások": "kimutatasok",
  "Beállítások": "beallitasok",
};

export const KANBAN_COLUMNS = [
  { label: "Új", status: "Új" },
  { label: "Visszahívás", status: "Visszahívandó" },
  { label: "Kapcsolatfelvétel", status: "Kapcsolatfelvétel megtörtént" },
  { label: "Felmérés", status: "Felmérés egyeztetve" },
  { label: "Ajánlat készül", status: "Ajánlat készül" },
  { label: "Ajánlat elküldve", status: "Ajánlat elküldve" },
  { label: "Utánkövetés", status: "Utánkövetés szükséges" },
  { label: "Megnyert", status: "Megnyert" },
  { label: "Elvesztett", status: "Elvesztett" },
] as const satisfies ReadonlyArray<{ label: string; status: Lead["status"] }>;

export type KanbanColumnLabel = (typeof KANBAN_COLUMNS)[number]["label"];

export function kanbanColumnForStatus(status: Lead["status"]) {
  return KANBAN_COLUMNS.find((column) => column.status === status)?.label ?? null;
}

export function rankTasks(tasks: Task[], leads: Lead[], currentDate: string) {
  const priorityWeight = { Magas: 3, Közepes: 2, Alacsony: 1 };
  return tasks
    .filter((task) => !task.done)
    .map((task) => {
      const lead = leads.find((item) => item.id === task.leadId);
      const overdueDays = Math.max(
        0,
        Math.floor(
          (new Date(`${currentDate}T12:00:00`).getTime() - new Date(`${task.due}T12:00:00`).getTime()) /
            86_400_000,
        ),
      );
      const score =
        priorityWeight[task.priority] * 10_000_000 +
        overdueDays * 1_000_000 +
        Math.max(0, lead?.value ?? 0);
      return { task, lead, score };
    })
    .sort((a, b) => b.score - a.score || a.task.due.localeCompare(b.task.due));
}

export function attentionSummary(leads: Lead[], tasks: Task[], currentDate: string) {
  const openStatuses = ["Új", "Visszahívandó", "Kapcsolatfelvétel megtörtént", "Felmérés egyeztetve", "Ajánlat készül", "Ajánlat elküldve", "Utánkövetés szükséges"];
  const activeTasks = tasks.filter((task) => !task.done);
  const unansweredBefore = new Date(`${currentDate}T12:00:00`);
  unansweredBefore.setDate(unansweredBefore.getDate() - 3);
  const unansweredLimit = unansweredBefore.toISOString().slice(0, 10);
  return {
    overdueTasks: activeTasks.filter((task) => task.due < currentDate).length,
    withoutOwner: leads.filter((lead) => openStatuses.includes(lead.status) && !lead.owner.trim()).length,
    withoutNextStep: leads.filter(
      (lead) =>
        openStatuses.includes(lead.status) &&
        (!lead.nextAction.trim() || !activeTasks.some((task) => task.leadId === lead.id)),
    ).length,
    offersWithoutFollowup: leads.filter(
      (lead) =>
        ["Ajánlat elküldve", "Utánkövetés szükséges"].includes(lead.status) &&
        !activeTasks.some((task) => task.leadId === lead.id && Boolean(task.followupKey)),
    ).length,
    unansweredLeads: leads.filter(
      (lead) =>
        ["Új", "Visszahívandó"].includes(lead.status) &&
        (lead.lastContactAt ?? lead.createdAt) < unansweredLimit,
    ).length,
  };
}

export function salesSummary(leads: Lead[], offers: Offer[]) {
  const openOffers = offers.filter((offer) =>
    ["Kiküldött", "Megtekintett", "Jóváhagyásra vár"].includes(offer.status),
  );
  const won = leads.filter((lead) => lead.status === "Megnyert");
  const closed = leads.filter((lead) => ["Megnyert", "Elvesztett"].includes(lead.status));
  const responseDays = leads
    .map((lead) => {
      if (!lead.lastContactAt) return null;
      return Math.max(
        0,
        (new Date(`${lead.lastContactAt}T12:00:00`).getTime() -
          new Date(`${lead.createdAt}T12:00:00`).getTime()) /
          86_400_000,
      );
    })
    .filter((value): value is number => value !== null);
  return {
    openOfferCount: openOffers.length,
    openOfferValue: openOffers.reduce((sum, offer) => sum + calculateOfferTotals(offer).gross, 0),
    wonValue: won.reduce((sum, lead) => sum + lead.value, 0),
    averageFirstResponseDays: responseDays.length
      ? Math.round((responseDays.reduce((sum, value) => sum + value, 0) / responseDays.length) * 10) / 10
      : null,
    estimatedConversionRate: closed.length ? Math.round((won.length / closed.length) * 100) : null,
  };
}

const SLUG_SECTIONS = Object.fromEntries(
  Object.entries(SECTION_SLUGS).map(([section, slug]) => [slug, section]),
) as Record<string, DashboardSection>;

export function calculateOfferTotals(offer: Pick<Offer, "lines" | "discountPercent" | "vatPercent">) {
  const subtotal = offer.lines.reduce(
    (sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice),
    0,
  );
  const discount = Math.round(subtotal * (Math.max(0, offer.discountPercent) / 100));
  const net = Math.max(0, subtotal - discount);
  const vat = Math.round(net * (Math.max(0, offer.vatPercent) / 100));
  return { subtotal, discount, net, vat, gross: net + vat };
}

export function calendarEntriesConflict(candidate: CalendarEntry, entries: CalendarEntry[]) {
  const minutes = (value: string) => {
    const [hours, mins] = value.split(":").map(Number);
    return hours * 60 + mins;
  };
  const start = minutes(candidate.time);
  const end = start + candidate.duration;
  return entries.some((entry) => {
    if (
      entry.id === candidate.id ||
      entry.date !== candidate.date ||
      entry.owner !== candidate.owner
    ) return false;
    const otherStart = minutes(entry.time);
    const otherEnd = otherStart + entry.duration;
    return start < otherEnd && end > otherStart;
  });
}

export function dashboardHash(section: DashboardSection, filter: DashboardFilter = null) {
  const params = new URLSearchParams();
  if (filter) {
    params.set("scope", filter.scope);
    params.set("filter", filter.value);
    params.set("label", filter.label);
  }
  const query = params.toString();
  return `#admin/${SECTION_SLUGS[section]}${query ? `?${query}` : ""}`;
}

export function parseDashboardHash(hash: string): { section: DashboardSection; filter: DashboardFilter } | null {
  const match = hash.match(/^#admin\/([^?]+)(?:\?(.*))?$/);
  if (!match) return null;
  const section = SLUG_SECTIONS[match[1]];
  if (!section) return null;
  const params = new URLSearchParams(match[2] ?? "");
  const scope = params.get("scope");
  const value = params.get("filter");
  const label = params.get("label");
  if (!scope || !value || !label) return { section, filter: null };
  if (scope === "lead") return { section, filter: { scope, value, label } };
  if (scope === "offer") return { section, filter: { scope, value, label } };
  if (scope === "task" && ["overdue", "today-callback", "survey", "followup"].includes(value)) {
    return { section, filter: { scope, value: value as "overdue" | "today-callback" | "survey" | "followup", label } };
  }
  return { section, filter: null };
}

export function overviewCards(leads: Lead[], tasks: Task[], currentDate: string) {
  const activeTasks = tasks.filter((task) => !task.done);
  return [
    {
      label: "Új érdeklődők",
      description: "Frissen beérkezett, még feldolgozatlan igények",
      value: leads.filter((lead) => lead.status === "Új").length,
      icon: "↗",
      group: "Beérkező munkák",
      section: "Érdeklődők" as const,
      filter: { scope: "lead", value: "Új", label: "Új érdeklődők" } as DashboardFilter,
    },
    {
      label: "Ma visszahívandók",
      description: "A mai napra ütemezett telefonos feladatok",
      value: activeTasks.filter((task) => task.due === currentDate && task.type.includes("Visszahívás")).length,
      icon: "☎",
      group: "Beérkező munkák",
      section: "Mai feladatok" as const,
      filter: { scope: "task", value: "today-callback", label: "Ma visszahívandók" } as DashboardFilter,
    },
    {
      label: "Felmérésre várók",
      description: "Egyeztetésre vagy helyszíni felmérésre várnak",
      value: leads.filter((lead) => lead.status === "Felmérés egyeztetve").length,
      icon: "⌂",
      group: "Beérkező munkák",
      section: "Érdeklődők" as const,
      filter: { scope: "lead", value: "Felmérés egyeztetve", label: "Felmérésre várók" } as DashboardFilter,
    },
    {
      label: "Kiküldött ajánlatok",
      description: "Kiküldött, még nem lezárt ajánlatok",
      value: leads.filter((lead) => lead.status === "Ajánlat elküldve").length,
      icon: "₣",
      group: "Aktív értékesítés",
      section: "Ajánlatok" as const,
      filter: { scope: "offer", value: "Kiküldött", label: "Kiküldött ajánlatok" } as DashboardFilter,
    },
    {
      label: "Utánkövetésre várók",
      description: "Ajánlatok, amelyeknél új kapcsolatfelvétel kell",
      value: leads.filter((lead) => lead.status === "Utánkövetés szükséges").length,
      icon: "↻",
      group: "Aktív értékesítés",
      section: "Mai feladatok" as const,
      filter: { scope: "task", value: "followup", label: "Utánkövetésre várók" } as DashboardFilter,
    },
    {
      label: "Megnyert munkák",
      description: "Sikeresen lezárt értékesítési lehetőségek",
      value: leads.filter((lead) => lead.status === "Megnyert").length,
      icon: "✓",
      group: "Eredmények",
      section: "Érdeklődők" as const,
      filter: { scope: "lead", value: "Megnyert", label: "Megnyert munkák" } as DashboardFilter,
    },
    {
      label: "Lejárt feladatok",
      description: "Azonnali figyelmet igénylő, elmulasztott teendők",
      value: activeTasks.filter((task) => task.due < currentDate).length,
      icon: "!",
      group: "Figyelmeztetések",
      section: "Mai feladatok" as const,
      filter: { scope: "task", value: "overdue", label: "Lejárt feladatok" } as DashboardFilter,
    },
  ];
}
