"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeReportMetrics,
  createMissingFollowups,
  daysSince,
  isValidEmail,
  isValidPhone,
  migrateLead,
  migrateTask,
  type Lead,
  type LeadStatus,
  type Priority,
  type Task,
} from "./demo-logic";

const STATUSES: LeadStatus[] = [
  "Új",
  "Visszahívandó",
  "Kapcsolatfelvétel megtörtént",
  "Felmérés egyeztetve",
  "Ajánlat készül",
  "Ajánlat elküldve",
  "Utánkövetés szükséges",
  "Megnyert",
  "Elvesztett",
  "Nem releváns",
];

const SERVICES = [
  "Új klíma telepítése",
  "Meglévő klíma cseréje",
  "Klímatisztítás vagy karbantartás",
  "Klímajavítás",
  "Hőszivattyú telepítése",
  "Hőszivattyú karbantartása",
  "Még nem tudom pontosan",
];

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const INITIAL_LEADS: Lead[] = [
  ["MK-1042", "Kovács Péter", "+36 30 246 8102", "peter.k@example.hu", "Pécs", "7624", "Új klíma telepítése", "Családi ház", "96", "3", "Saját", "1 hónapon belül", "600 000–1 500 000 Ft", "Három hálószobába kér megoldást.", "Telefon", "Délután", "3 készülék • hűtés és fűtés", "Weboldal", "Új", "Magas", "Bálint", 940000, "Visszahívás", today()],
  ["MK-1041", "Nagy Andrea", "+36 30 510 3384", "andrea.n@example.hu", "Kozármisleny", "7761", "Hőszivattyú telepítése", "Családi ház", "142", "6", "Saját", "1–3 hónapon belül", "1 500 000 Ft felett", "Felújítás előtt álló családi ház.", "E-mail", "Délelőtt", "Padlófűtés • jó szigetelés", "Ajánlás", "Felmérés egyeztetve", "Magas", "Dóra", 4600000, "Helyszíni felmérés", addDays(1)],
  ["MK-1040", "Horváth Gábor", "+36 70 334 2960", "gabor.h@example.hu", "Komló", "7300", "Meglévő klíma cseréje", "Lakás", "58", "2", "Saját", "Amint lehetséges", "300 000–600 000 Ft", "Régi készülék cseréje.", "Telefon", "Bármikor", "1 készülék • rövid csövezés", "Google", "Visszahívandó", "Magas", "Bálint", 420000, "Visszahívás", today()],
  ["MK-1039", "Tóth Eszter", "+36 20 481 1190", "eszter.t@example.hu", "Harkány", "7815", "Klímatisztítás vagy karbantartás", "Üzlethelyiség", "74", "3", "Bérelt", "1 hónapon belül", "300 000 Ft alatt", "Három beltéri egység tisztítása.", "E-mail", "Délelőtt", "3 meglévő készülék", "Facebook", "Ajánlat elküldve", "Közepes", "Dóra", 78000, "Ajánlat követése", addDays(-1)],
  ["MK-1038", "Kiss Tamás", "+36 30 621 4015", "tamas.k@example.hu", "Szigetvár", "7900", "Hőszivattyú telepítése", "Családi ház", "118", "5", "Saját", "1–3 hónapon belül", "1 500 000 Ft felett", "Gázfűtés kiváltása.", "Telefon", "Délután", "Radiátor • közepes szigetelés", "Weboldal", "Ajánlat készül", "Magas", "Bálint", 3900000, "Árajánlat elkészítése", today()],
  ["MK-1037", "Farkas Zsófia", "+36 70 250 9918", "zsofia.f@example.hu", "Pécsvárad", "7720", "Klímajavítás", "Lakás", "49", "2", "Saját", "Amint lehetséges", "300 000 Ft alatt", "A készülék nem hűt megfelelően.", "Telefon", "Délelőtt", "1 meglévő készülék", "Google", "Kapcsolatfelvétel megtörtént", "Magas", "Dóra", 65000, "Időpont egyeztetése", addDays(1)],
  ["MK-1036", "Varga László", "+36 30 522 7711", "laszlo.v@example.hu", "Bóly", "7754", "Új klíma telepítése", "Iroda", "110", "4", "Bérelt", "1 hónapon belül", "600 000–1 500 000 Ft", "Kisebb iroda klimatizálása.", "E-mail", "Délután", "2 készülék • hűtés", "Facebook", "Utánkövetés szükséges", "Közepes", "Bálint", 720000, "Ajánlat utáni érdeklődés", today()],
  ["MK-1035", "Balogh Réka", "+36 20 870 1905", "reka.b@example.hu", "Mohács", "7700", "Klímatisztítás vagy karbantartás", "Családi ház", "86", "3", "Saját", "1 hónapon belül", "300 000 Ft alatt", "Éves karbantartás.", "Telefon", "Délután", "2 meglévő készülék", "Ajánlás", "Megnyert", "Alacsony", "Dóra", 52000, "Munkalap előkészítése", addDays(3)],
  ["MK-1034", "Molnár Ádám", "+36 30 742 6640", "adam.m@example.hu", "Pellérd", "7831", "Meglévő klíma cseréje", "Családi ház", "104", "4", "Saját", "1–3 hónapon belül", "600 000–1 500 000 Ft", "Két régi készülék cseréje.", "E-mail", "Bármikor", "2 készülék", "Weboldal", "Ajánlat elküldve", "Közepes", "Bálint", 810000, "Ajánlat követése", addDays(2)],
  ["MK-1033", "Szabó Mónika", "+36 70 116 5022", "monika.s@example.hu", "Siklós", "7800", "Hőszivattyú karbantartása", "Családi ház", "130", "5", "Saját", "Amint lehetséges", "300 000 Ft alatt", "Éves átvizsgálás.", "Telefon", "Délelőtt", "Levegő-víz rendszer", "Google", "Felmérés egyeztetve", "Közepes", "Dóra", 95000, "Helyszíni felmérés", addDays(2)],
  ["MK-1032", "Takács Imre", "+36 20 285 4431", "imre.t@example.hu", "Pécs", "7632", "Új klíma telepítése", "Lakás", "52", "2", "Saját", "Csak tájékozódom", "Még nem tudom", "Általános érdeklődés.", "E-mail", "Este", "1 készülék", "Facebook", "Elvesztett", "Alacsony", "Bálint", 360000, "Nincs következő lépés", addDays(-3)],
  ["MK-1031", "Juhász Júlia", "+36 30 961 7054", "julia.j@example.hu", "Orfű", "7677", "Hőszivattyú telepítése", "Családi ház", "156", "6", "Saját", "1–3 hónapon belül", "1 500 000 Ft felett", "Új építésű ingatlan.", "Telefon", "Délután", "Új építés • padlófűtés", "Ajánlás", "Megnyert", "Magas", "Dóra", 5200000, "Kivitelezés előkészítése", addDays(5)],
].map((item) => ({
  id: item[0] as string, name: item[1] as string, phone: item[2] as string, email: item[3] as string,
  city: item[4] as string, zip: item[5] as string, service: item[6] as string, property: item[7] as string,
  area: item[8] as string, rooms: item[9] as string, ownership: item[10] as string, urgency: item[11] as string,
  budget: item[12] as string, description: item[13] as string, contact: item[14] as string, callTime: item[15] as string,
  technical: item[16] as string, source: item[17] as string, status: item[18] as LeadStatus,
  priority: item[19] as Lead["priority"], owner: item[20] as string, value: item[21] as number,
  nextAction: item[22] as string, nextDate: item[23] as string, createdAt: addDays(-Number(item[0].toString().slice(-2)) % 18),
  notes: [], timeline: [`${item[23]} • ${item[18]}`, `${addDays(-8)} • Érdeklődés rögzítve`],
}));

const INITIAL_TASKS: Task[] = [
  { id: "T-1", leadId: "MK-1042", type: "Visszahívás", due: today(), priority: "Magas", done: false },
  { id: "T-2", leadId: "MK-1040", type: "Visszahívás", due: today(), priority: "Magas", done: false },
  { id: "T-3", leadId: "MK-1039", type: "Ajánlat utáni érdeklődés", due: addDays(-1), priority: "Közepes", done: false },
  { id: "T-4", leadId: "MK-1038", type: "Árajánlat elkészítése", due: today(), priority: "Magas", done: false },
  { id: "T-5", leadId: "MK-1037", type: "Helyszíni felmérés egyeztetése", due: addDays(1), priority: "Magas", done: false },
  { id: "T-6", leadId: "MK-1036", type: "Ajánlat utáni érdeklődés", due: today(), priority: "Közepes", done: false },
  { id: "T-7", leadId: "MK-1035", type: "Munkalap előkészítése", due: addDays(3), priority: "Alacsony", done: false },
];

const DEFAULT_FORM = {
  service: "", city: "", zip: "", property: "", area: "", rooms: "", ownership: "",
  units: "", mode: "", existing: "", pipe: "", outdoor: "", heating: "", emitter: "",
  insulation: "", consumption: "", projectType: "", urgency: "", budget: "", description: "",
  fileName: "", name: "", phone: "", email: "", contact: "", callTime: "", consent: false,
};

const DEFAULT_CALLBACK = {
  name: "",
  phone: "",
  service: "",
  city: "",
  callTime: "",
  note: "",
  consent: false,
};

const DEFAULT_TASK_FORM = {
  type: "Visszahívás",
  due: addDays(1),
  time: "",
  priority: "Közepes" as Priority,
  owner: "Bálint",
  note: "",
};

const TASK_TYPES = [
  "Visszahívás",
  "Helyszíni felmérés egyeztetése",
  "Helyszíni felmérés",
  "Árajánlat elkészítése",
  "Ajánlat utáni érdeklődés",
  "Hiányzó adatok bekérése",
  "Egyéb",
];

const LOSS_REASONS = [
  "Túl magas ár",
  "Másik szolgáltatót választott",
  "Elhalasztotta a beruházást",
  "Nem sikerült elérni",
  "Nem megfelelő érdeklődés",
  "Egyéb",
];

function nextLeadId(leads: Lead[]) {
  const max = leads.reduce((value, lead) => {
    const numeric = Number(lead.id.replace(/\D/g, ""));
    return Number.isFinite(numeric) ? Math.max(value, numeric) : value;
  }, 1042);
  return `MK-${max + 1}`;
}

function money(value: number) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const [mode, setMode] = useState<"public" | "dashboard">("public");
  const [publicView, setPublicView] = useState<"home" | "form" | "success">("home");
  const [section, setSection] = useState("Áttekintés");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [leads, setLeads] = useState<Lead[]>(() => INITIAL_LEADS.map(migrateLead));
  const [tasks, setTasks] = useState<Task[]>(() => INITIAL_TASKS.map(migrateTask));
  const [selected, setSelected] = useState<Lead | null>(null);
  const [lastLead, setLastLead] = useState<Lead | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [booking, setBooking] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackForm, setCallbackForm] = useState(DEFAULT_CALLBACK);
  const [callbackErrors, setCallbackErrors] = useState<Record<string, string>>({});
  const [callbackLead, setCallbackLead] = useState<Lead | null>(null);
  const [tour, setTour] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const callbackTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedLeads = localStorage.getItem("mecsek-leads");
        const savedTasks = localStorage.getItem("mecsek-tasks");
        if (savedLeads) setLeads((JSON.parse(savedLeads) as Lead[]).map(migrateLead));
        if (savedTasks) setTasks((JSON.parse(savedTasks) as Task[]).map(migrateTask));
      } catch {
        setToast("A mentett demóadatokat nem sikerült betölteni.");
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("mecsek-leads", JSON.stringify(leads));
      localStorage.setItem("mecsek-tasks", JSON.stringify(tasks));
      localStorage.setItem("mecsek-data-version", "2");
    } catch {
      window.setTimeout(() => setToast("A helyi mentés nem sikerült. Ellenőrizd a böngésző tárhelyét."), 0);
    }
  }, [leads, tasks, loaded]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const text = `${lead.name} ${lead.city} ${lead.phone} ${lead.id}`.toLowerCase();
      return (!query || text.includes(query.toLowerCase()))
        && (!statusFilter || lead.status === statusFilter)
        && (!serviceFilter || lead.service === serviceFilter)
        && (!cityFilter || lead.city === cityFilter);
    });
  }, [leads, query, statusFilter, serviceFilter, cityFilter]);

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };
  const heatPump = form.service.toLowerCase().includes("hőszivattyú");

  const nextStep = () => {
    const required: Record<number, string[]> = {
      1: ["service"],
      2: ["city", "zip", "property"],
      3: [],
      4: ["urgency"],
      5: ["name", "phone", "email", "contact", "callTime"],
    };
    const errors: Record<string, string> = {};
    required[step].forEach((key) => {
      if (!String(form[key as keyof typeof form] ?? "").trim()) errors[key] = "Ez a mező kötelező.";
    });
    if (step === 5 && !form.consent) errors.consent = "A kapcsolatfelvételhez szükséges a hozzájárulás.";
    if (step === 5 && form.email && !isValidEmail(form.email)) errors.email = "Adj meg érvényes e-mail-címet.";
    if (step === 5 && form.phone && !isValidPhone(form.phone)) errors.phone = "Adj meg legalább 9 számjegyet tartalmazó telefonszámot.";
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      showToast("Néhány mezőt még javítani kell.");
      window.setTimeout(() => document.getElementById(`field-${Object.keys(errors)[0]}`)?.focus(), 0);
      return;
    }
    setFormErrors({});
    if (step < 5) setStep((value) => value + 1);
    else submitLead();
  };

  const submitLead = () => {
    const id = nextLeadId(leads);
    const technical = heatPump
      ? [form.heating, form.emitter, form.insulation && `${form.insulation} szigetelés`, form.projectType].filter(Boolean).join(" • ")
      : [form.units && `${form.units} készülék`, form.mode, form.existing && `meglévő: ${form.existing}`, form.outdoor && `kültéri hely: ${form.outdoor}`].filter(Boolean).join(" • ");
    const lead: Lead = {
      id, name: form.name, phone: form.phone, email: form.email, city: form.city, zip: form.zip,
      service: form.service, property: form.property, area: form.area, rooms: form.rooms,
      ownership: form.ownership, urgency: form.urgency, budget: form.budget, description: form.description,
      contact: form.contact, callTime: form.callTime, technical, source: "Demó űrlap", status: "Új",
      priority: form.urgency === "Amint lehetséges" ? "Magas" : "Közepes", owner: "Bálint",
      value: heatPump ? 4200000 : form.service.includes("tisztítás") ? 65000 : 620000,
      nextAction: "Visszahívás", nextDate: addDays(1), createdAt: today(), notes: [],
      lastContactAt: today(),
      timeline: [`${today()} • Automatikus visszaigazolás előkészítve`, `${today()} • Érdeklődés rögzítve`],
    };
    setLeads((prev) => [lead, ...prev]);
    setTasks((prev) => [{ id: `T-${Date.now()}`, leadId: id, type: "Visszahívás", due: addDays(1), priority: lead.priority, owner: "Bálint", done: false }, ...prev]);
    setLastLead(lead);
    setForm(DEFAULT_FORM);
    setFormErrors({});
    setPublicView("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateLead = (leadId: string, updater: (lead: Lead) => Lead) => {
    setLeads((prev) => prev.map((lead) => lead.id === leadId ? updater(lead) : lead));
    setSelected((prev) => prev?.id === leadId ? updater(prev) : prev);
  };

  const submitCallback = (demo = false) => {
    const errors: Record<string, string> = {};
    ["name", "phone", "service", "city", "callTime"].forEach((key) => {
      if (!String(callbackForm[key as keyof typeof callbackForm] ?? "").trim()) errors[key] = "Ez a mező kötelező.";
    });
    if (callbackForm.phone && !isValidPhone(callbackForm.phone)) errors.phone = "Adj meg legalább 9 számjegyet tartalmazó telefonszámot.";
    if (!callbackForm.consent) errors.consent = "A kapcsolatfelvételhez szükséges a hozzájárulás.";
    if (Object.keys(errors).length) {
      setCallbackErrors(errors);
      window.setTimeout(() => document.getElementById(`callback-${Object.keys(errors)[0]}`)?.focus(), 0);
      return false;
    }

    const id = nextLeadId(leads);
    const lead: Lead = {
      id,
      name: callbackForm.name,
      phone: callbackForm.phone,
      email: "",
      city: callbackForm.city,
      zip: "",
      service: callbackForm.service,
      property: "Még nem ismert",
      area: "",
      rooms: "",
      ownership: "",
      urgency: "Visszahívást kér",
      budget: "Még nem ismert",
      description: callbackForm.note,
      contact: "Telefon",
      callTime: callbackForm.callTime,
      technical: "A műszaki részletek visszahíváskor kerülnek pontosításra.",
      source: demo ? "Vezetett demó" : "Gyors visszahívás",
      status: "Visszahívandó",
      priority: "Magas",
      owner: "Bálint",
      value: callbackForm.service.toLowerCase().includes("hőszivattyú") ? 4200000 : 620000,
      nextAction: "Visszahívás",
      nextDate: today(),
      createdAt: today(),
      lastContactAt: today(),
      notes: callbackForm.note ? [callbackForm.note] : [],
      timeline: [`${today()} • Visszahívási feladat automatikusan létrejött`, `${today()} • Gyors visszahívási igény rögzítve`],
    };
    const task: Task = {
      id: `T-${Date.now()}-callback`,
      leadId: id,
      type: "Visszahívás",
      due: today(),
      priority: "Magas",
      owner: "Bálint",
      note: callbackForm.note,
      done: false,
    };
    setLeads((prev) => [lead, ...prev]);
    setTasks((prev) => [task, ...prev]);
    setCallbackLead(lead);
    setCallbackErrors({});
    showToast(`A visszahívási igény rögzítve: ${id}`);
    return true;
  };

  const closeCallback = () => {
    setCallbackOpen(false);
    setCallbackLead(null);
    setCallbackForm(DEFAULT_CALLBACK);
    setCallbackErrors({});
    window.setTimeout(() => callbackTriggerRef.current?.focus(), 0);
  };

  const changeStatus = (lead: Lead, status: LeadStatus) => {
    const offerSentAt = status === "Ajánlat elküldve" ? lead.offerSentAt ?? today() : lead.offerSentAt;
    const updated = {
      ...lead,
      status,
      offerSentAt,
      lastContactAt: today(),
      nextAction: status === "Ajánlat elküldve" ? "Ajánlat utáni érdeklődés" : lead.nextAction,
      nextDate: status === "Ajánlat elküldve" ? addDays(3) : lead.nextDate,
      timeline: [`${today()} • Státusz: ${status}`, ...lead.timeline],
    };
    setLeads((prev) => prev.map((item) => item.id === lead.id ? updated : item));
    setSelected(updated);
    if (status === "Ajánlat elküldve") {
      setTasks((prev) => {
        const generated = createMissingFollowups(prev, lead.id, offerSentAt ?? today());
        showToast(generated.length ? `${generated.length} utánkövetési feladat létrejött.` : "Az utánkövetési feladatok már léteznek.");
        return generated.length ? [...generated, ...prev] : prev;
      });
    }
  };

  const setLossReason = (lead: Lead, reason: string) => {
    const updated = { ...lead, lossReason: reason, timeline: [`${today()} • Elvesztési ok: ${reason}`, ...lead.timeline] };
    setLeads((prev) => prev.map((item) => item.id === lead.id ? updated : item));
    setSelected(updated);
  };

  const createTask = (lead: Lead, draft: typeof DEFAULT_TASK_FORM) => {
    const task: Task = {
      id: `T-${Date.now()}-manual`,
      leadId: lead.id,
      type: draft.type,
      due: draft.due,
      time: draft.time,
      priority: draft.priority,
      owner: draft.owner,
      note: draft.note,
      done: false,
    };
    setTasks((prev) => [task, ...prev]);
    updateLead(lead.id, (current) => ({
      ...current,
      nextAction: draft.type,
      nextDate: draft.due,
      timeline: [`${today()} • Új feladat: ${draft.type} (${draft.due}${draft.time ? ` ${draft.time}` : ""})`, ...current.timeline],
    }));
    showToast("Az új feladat létrejött.");
  };

  const completeTask = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    setTasks((prev) => prev.map((item) => item.id === id ? { ...item, done: true } : item));
    updateLead(task.leadId, (lead) => ({
      ...lead,
      lastContactAt: today(),
      timeline: [`${today()} • Feladat elvégezve: ${task.type}`, ...lead.timeline],
    }));
    showToast("A feladat elvégezve.");
  };

  const postponeTask = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const nextDue = addDays(1);
    setTasks((prev) => prev.map((item) => item.id === id ? { ...item, due: nextDue } : item));
    updateLead(task.leadId, (lead) => ({
      ...lead,
      nextDate: nextDue,
      timeline: [`${today()} • Feladat elhalasztva: ${task.type} → ${nextDue}`, ...lead.timeline],
    }));
    showToast("A feladat egy nappal elhalasztva.");
  };

  const addNote = () => {
    if (!selected || !note.trim()) return;
    const updated = { ...selected, notes: [note.trim(), ...selected.notes], timeline: [`${today()} • Belső jegyzet hozzáadva`, ...selected.timeline] };
    setLeads((prev) => prev.map((lead) => lead.id === selected.id ? updated : lead));
    setSelected(updated);
    setNote("");
    showToast("A jegyzet elmentve.");
  };

  const resetDemo = () => {
    if (!window.confirm("Biztosan visszaállítod az eredeti fiktív demóadatokat?")) return;
    setLeads(INITIAL_LEADS.map(migrateLead));
    setTasks(INITIAL_TASKS.map(migrateTask));
    setSelected(null);
    localStorage.removeItem("mecsek-leads");
    localStorage.removeItem("mecsek-tasks");
    localStorage.removeItem("mecsek-data-version");
    setCallbackLead(null);
    setCallbackForm(DEFAULT_CALLBACK);
    setForm(DEFAULT_FORM);
    showToast("A demóadatok alaphelyzetbe álltak.");
  };

  const startTour = () => {
    setMode("public");
    setPublicView("home");
    setCallbackLead(null);
    setCallbackForm({
      name: "Minta Márton",
      phone: "+36 30 123 4567",
      service: "Új klíma telepítése",
      city: "Pécs",
      callTime: "Délután",
      note: "Fiktív demóérdeklődő, két szobához kér visszahívást.",
      consent: true,
    });
    setCallbackOpen(true);
    setTour(1);
  };

  const tourNext = () => {
    const currentTourLead = callbackLead ? leads.find((lead) => lead.id === callbackLead.id) ?? callbackLead : null;
    if (tour === 1) {
      if (submitCallback(true)) setTour(2);
    } else if (tour === 2) {
      setCallbackOpen(false);
      setMode("dashboard");
      setSection("Érdeklődők");
      setTour(3);
    } else if (tour === 3 && currentTourLead) {
      setSelected(currentTourLead);
      setTour(4);
    } else if (tour === 4 && currentTourLead) {
      createTask(currentTourLead, { ...DEFAULT_TASK_FORM, type: "Helyszíni felmérés egyeztetése", due: addDays(1), note: "A vezetett demó által létrehozott fiktív feladat." });
      setTour(5);
    } else if (tour === 5 && currentTourLead) {
      changeStatus(currentTourLead, "Ajánlat elküldve");
      setTour(6);
    } else if (tour === 6) {
      setSelected(null);
      setSection("Mai feladatok");
      setTour(7);
    } else if (tour === 7) {
      setSection("Kimutatások");
      setTour(8);
    } else {
      setTour(0);
    }
  };

  return (
    <main>
      <div className="demo-strip">
        <span><strong>Bemutató rendszer</strong> — minden név, elérhetőség és üzleti adat fiktív.</span>
        <button onClick={startTour}>Demó indítása</button>
      </div>
      {mode === "public" ? (
        <>
          <header className="site-header">
            <button className="brand" onClick={() => { setPublicView("home"); setStep(1); }}>
              <span className="brand-mark">M</span>
              <span><strong>Mecsek Klíma</strong><small>Klíma és hőszivattyú szakértelemmel</small></span>
            </button>
            <nav>
              <a href="#szolgaltatasok">Szolgáltatások</a>
              <a href="#folyamat">Hogyan működik?</a>
              <button className="nav-dashboard" onClick={() => setMode("dashboard")}>Demó kezelőfelület</button>
            </nav>
          </header>
          {publicView === "home" && <PublicHome
            onQuote={() => { setPublicView("form"); setStep(1); window.scrollTo(0, 0); }}
            onCallback={() => { setCallbackOpen(true); setCallbackLead(null); }}
            callbackTriggerRef={callbackTriggerRef}
          />}
          {publicView === "form" && (
            <QuoteForm form={form} updateForm={updateForm} errors={formErrors} step={step} setStep={setStep} nextStep={nextStep} heatPump={heatPump} onCancel={() => setPublicView("home")} />
          )}
          {publicView === "success" && lastLead && (
            <Success lead={lastLead} onBooking={() => setBooking(true)} onDashboard={() => { setMode("dashboard"); setSection("Érdeklődők"); }} />
          )}
        </>
      ) : (
        <Dashboard
          section={section} setSection={setSection} setMode={setMode} leads={leads} tasks={tasks}
          setTasks={setTasks} filteredLeads={filteredLeads} query={query} setQuery={setQuery}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter} serviceFilter={serviceFilter}
          setServiceFilter={setServiceFilter} cityFilter={cityFilter} setCityFilter={setCityFilter}
          setSelected={setSelected} resetDemo={resetDemo} completeTask={completeTask} postponeTask={postponeTask}
        />
      )}
      {selected && (
        <LeadDrawer lead={selected} close={() => setSelected(null)} changeStatus={changeStatus}
          setLossReason={setLossReason} createTask={createTask}
          note={note} setNote={setNote} addNote={addNote} tasks={tasks.filter((task) => task.leadId === selected.id && !task.done)} />
      )}
      {booking && <Booking close={() => setBooking(false)} confirm={() => { setBooking(false); showToast("A demó időpontfoglalás rögzítve."); }} />}
      {callbackOpen && <CallbackModal
        form={callbackForm}
        setForm={setCallbackForm}
        errors={callbackErrors}
        setErrors={setCallbackErrors}
        lead={callbackLead}
        close={closeCallback}
        submit={() => submitCallback(false)}
        openDashboard={() => {
          setCallbackOpen(false);
          setMode("dashboard");
          setSection("Érdeklődők");
          if (callbackLead) setSelected(callbackLead);
        }}
      />}
      {tour > 0 && (
        <div className="tour-card" role="dialog" aria-modal="false" aria-live="polite" aria-label="Vezetett demóbemutató">
          <span>{tour}/8</span>
          <strong>{[
            "",
            "1. Előre kitöltött gyors visszahívás",
            "2. Az érdeklődő és a visszahívási feladat létrejött",
            "3. Az új érdeklődő azonnal megjelent",
            "4. Az adatlap minden következő lépést egy helyen mutat",
            "5. Kézi feladat is hozzáadható",
            "6. Az ajánlat után automatikus a 3 és 7 napos követés",
            "7. A napi lista megakadályozza az elfelejtést",
            "8. A kimutatás minden adatból újraszámol",
          ][tour]}</strong>
          <p>{tour === 8
            ? `A rendszer célja, hogy minden érdeklődőnek legyen felelőse, státusza és következő lépése. Jelenleg ${computeReportMetrics(leads, tasks).waitingFollowupCount} ajánlat vár utánkövetésre, összesen ${money(computeReportMetrics(leads, tasks).waitingFollowupValue)} becsült értékben.`
            : "A Tovább gomb a következő működő lépést is végrehajtja fiktív adatokkal."}</p>
          <div><button className="button-ghost" onClick={() => { setTour(0); setCallbackOpen(false); }}>Bezárás</button><button className="button-primary" onClick={tourNext}>{tour === 8 ? "Befejezés" : "Tovább"}</button></div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function PublicHome({ onQuote, onCallback, callbackTriggerRef }: {
  onQuote: () => void;
  onCallback: () => void;
  callbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Pécs és 60 km-es körzete</span>
          <h1>Kérjen előzetes klíma- vagy hőszivattyú-felmérést <em>néhány perc alatt</em></h1>
          <p>Részletes ajánlatkérés 2–3 perc alatt, vagy kérjen gyors visszahívást kevesebb mint egy perc alatt.</p>
          <div className="hero-actions">
            <button className="button-primary large" onClick={onQuote}>Ajánlatot kérek <span>→</span></button>
            <button ref={callbackTriggerRef} className="button-secondary large" onClick={onCallback}>Visszahívást kérek</button>
          </div>
          <div className="trust-line"><span>✓ Gyors visszajelzés</span><span>✓ Átlátható folyamat</span><span>✓ Helyi szakemberek</span></div>
        </div>
        <div className="hero-visual" aria-label="Ajánlatkérési folyamat előnézete">
          <div className="climate-shape"><span></span><i></i><i></i><i></i></div>
          <div className="floating-card card-one"><small>Új érdeklődő</small><strong>Klímatelepítés • Pécs</strong><span>Azonnal rögzítve</span></div>
          <div className="floating-card card-two"><small>Következő lépés</small><strong>Visszahívás ma</strong><span className="status-dot">Nem marad el</span></div>
        </div>
      </section>
      <section className="services" id="szolgaltatasok">
        <div className="section-heading"><span>Szolgáltatások</span><h2>Az otthonához illő megoldás</h2><p>Az űrlap segít összegyűjteni a felméréshez szükséges legfontosabb adatokat.</p></div>
        <div className="service-grid">
          {[
            ["01", "Klímatelepítés", "Új készülék, csere vagy több helyiség klimatizálása."],
            ["02", "Karbantartás és tisztítás", "Meglévő berendezések rendszeres átvizsgálása."],
            ["03", "Hőszivattyú-felmérés", "Új építéshez vagy meglévő rendszer korszerűsítéséhez."],
          ].map(([num, title, body]) => <article key={title}><span>{num}</span><h3>{title}</h3><p>{body}</p><button onClick={onQuote}>Igény megadása →</button></article>)}
        </div>
      </section>
      <section className="process" id="folyamat">
        <div className="section-heading left"><span>Hogyan működik?</span><h2>Három egyszerű lépés a felmérésig</h2></div>
        <div className="process-grid">
          {[
            ["1", "Rövid ajánlatkérés", "Adja meg az ingatlan és az igény alapadatait."],
            ["2", "Szakmai visszajelzés", "Átnézzük a részleteket, majd egy munkanapon belül jelentkezünk."],
            ["3", "Helyszíni felmérés", "Szükség esetén megfelelő időpontot egyeztetünk."],
          ].map(([num, title, body]) => <div key={num}><b>{num}</b><h3>{title}</h3><p>{body}</p></div>)}
        </div>
      </section>
      <section className="cta"><div><span>Mecsek Klíma</span><h2>Mondja el röviden, miben segíthetünk.</h2></div><button className="button-light large" onClick={onQuote}>Ajánlatot kérek →</button></section>
      <footer><div className="brand footer-brand"><span className="brand-mark">M</span><span><strong>Mecsek Klíma</strong><small>Fiktív demóvállalkozás</small></span></div><p>Pécs és Baranya • +36 30 555 1234 • info@mecsekklima-demo.hu</p><p className="legal">Ez az oldal bemutató rendszer. Nem valódi vállalkozás, nem fogad valós megrendelést.</p></footer>
    </>
  );
}

function QuoteForm({ form, updateForm, errors, step, setStep, nextStep, heatPump, onCancel }: {
  form: typeof DEFAULT_FORM; updateForm: (field: string, value: string | boolean) => void;
  errors: Record<string, string>;
  step: number; setStep: (value: number) => void; nextStep: () => void; heatPump: boolean; onCancel: () => void;
}) {
  const input = (label: string, field: keyof typeof DEFAULT_FORM, type = "text", placeholder = "") => (
    <label><span>{label}</span><input id={`field-${field}`} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `error-${field}` : undefined} type={type} value={String(form[field])} placeholder={placeholder} onChange={(e) => updateForm(field, e.target.value)} />{errors[field] && <small className="field-error" id={`error-${field}`}>{errors[field]}</small>}</label>
  );
  const select = (label: string, field: keyof typeof DEFAULT_FORM, options: string[]) => (
    <label><span>{label}</span><select id={`field-${field}`} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `error-${field}` : undefined} value={String(form[field])} onChange={(e) => updateForm(field, e.target.value)}><option value="">Válasszon…</option>{options.map((opt) => <option key={opt}>{opt}</option>)}</select>{errors[field] && <small className="field-error" id={`error-${field}`}>{errors[field]}</small>}</label>
  );
  return (
    <section className="form-shell">
      <div className="form-intro"><button className="back-link" onClick={() => step > 1 ? setStep(step - 1) : onCancel()}>← Vissza</button><span className="eyebrow">Részletes ajánlatkérés</span><h1>Segítsen, hogy felkészülten hívhassuk vissza.</h1><p>A kitöltés körülbelül 2–3 perc. A csillaggal jelölt mezők kötelezők, a többi adat opcionális.</p></div>
      <div className="form-card">
        <div className="progress"><div><strong>{step}. lépés</strong><span>az 5-ből</span></div><div className="progress-track"><i style={{ width: `${step * 20}%` }} /></div></div>
        {step === 1 && <div className="form-step"><h2>Miben segíthetünk?</h2><p>Válassza ki a leginkább megfelelő szolgáltatást.</p><div className="option-grid" id="field-service" tabIndex={-1}>{SERVICES.map((service) => <button aria-pressed={form.service === service} className={form.service === service ? "option selected" : "option"} key={service} onClick={() => updateForm("service", service)}><span aria-hidden="true">{service.includes("Hőszivattyú") ? "♨" : service.includes("tisztítás") ? "✦" : "❄"}</span>{service}<i aria-hidden="true">✓</i></button>)}</div>{errors.service && <small className="field-error" id="error-service">{errors.service}</small>}</div>}
        {step === 2 && <div className="form-step"><h2>Az ingatlan adatai</h2><p>Az alapadatok segítenek a megfelelő kapacitás előzetes felmérésében.</p><div className="field-grid">{input("Település *", "city", "text", "Pécs")}{input("Irányítószám *", "zip", "text", "7621")}{select("Ingatlan típusa *", "property", ["Családi ház", "Lakás", "Iroda", "Üzlethelyiség", "Egyéb"])}{input("Alapterület (m²) – opcionális", "area", "number", "90")}{input("Érintett helyiségek száma – opcionális", "rooms", "number", "3")}{select("Tulajdonviszony – opcionális", "ownership", ["Saját tulajdon", "Bérelt ingatlan"])}</div></div>}
        {step === 3 && <div className="form-step"><h2>Műszaki alapadatok</h2><p>Ha valamiben bizonytalan, nyugodtan hagyja üresen; visszahíváskor pontosítjuk.</p><div className="field-grid">{heatPump ? <>{select("Jelenlegi fűtési rendszer – opcionális", "heating", ["Gázkazán", "Vegyes tüzelés", "Elektromos fűtés", "Nincs még rendszer", "Egyéb"])}{select("Hőleadás – opcionális", "emitter", ["Radiátor", "Padlófűtés", "Mindkettő", "Még nem ismert"])}{select("Szigetelés állapota – opcionális", "insulation", ["Jó", "Közepes", "Gyenge", "Még nem ismert"])}{input("Éves energiafogyasztás – opcionális", "consumption", "text", "Ha ismert")}{select("Projekt típusa – opcionális", "projectType", ["Új építés", "Korszerűsítés"])}</> : <>{input("Készülékek száma – opcionális", "units", "number", "1")}{select("Használat – opcionális", "mode", ["Hűtés", "Fűtés", "Mindkettő"])}{select("Van meglévő készülék? – opcionális", "existing", ["Igen", "Nem"])}{input("Becsült csövezési hossz – opcionális", "pipe", "text", "például 4 méter")}{select("Van megfelelő kültériegység-hely? – opcionális", "outdoor", ["Igen", "Nem", "Nem tudom"])}</>}</div></div>}
        {step === 4 && <div className="form-step"><h2>Időzítés és keret</h2><p>Ezek az adatok nem jelentenek kötelezettségvállalást.</p><div className="field-grid">{select("Mikor szeretné a munkát? *", "urgency", ["Amint lehetséges", "1 hónapon belül", "1–3 hónapon belül", "Csak tájékozódom"])}{select("Tervezett költségkeret – opcionális", "budget", ["300 000 Ft alatt", "300 000–600 000 Ft", "600 000–1 500 000 Ft", "1 500 000 Ft felett", "Még nem tudom"])}<label className="full"><span>Rövid leírás – opcionális</span><textarea value={form.description} placeholder="Írja le röviden az igényét…" onChange={(e) => updateForm("description", e.target.value)} /></label><label className="full file"><span>Opcionális képfeltöltés</span><input type="file" accept="image/*" onChange={(e) => updateForm("fileName", e.target.files?.[0]?.name || "")} /><small>{form.fileName || "A demó csak a fájl nevét jegyzi meg, feltöltés nem történik."}</small></label></div></div>}
        {step === 5 && <div className="form-step"><h2>Hogyan érhetjük el?</h2><p>Az elérhetőségeket kizárólag a demófolyamat szemléltetésére használjuk ezen az eszközön.</p><div className="field-grid">{input("Név *", "name", "text", "Minta Márton")}{input("Telefonszám *", "phone", "tel", "+36 30 123 4567")}{input("E-mail-cím *", "email", "email", "minta@example.hu")}{select("Kapcsolattartás módja *", "contact", ["Telefon", "E-mail"])}{select("Mikor hívható? *", "callTime", ["Délelőtt", "Délután", "Este", "Bármikor"])}<label className="consent full"><input id="field-consent" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "error-consent" : undefined} type="checkbox" checked={form.consent} onChange={(e) => updateForm("consent", e.target.checked)} /><span>Elolvastam az <button type="button" onClick={() => alert("Demó szöveg: éles rendszerhez jogilag ellenőrzött adatkezelési tájékoztató szükséges.")}>adatkezelési tájékoztatót</button>, és kérem, hogy a megadott elérhetőségeimen kapcsolatba lépjenek velem az ajánlatkérésem kezelése érdekében.</span></label>{errors.consent && <small className="field-error full" id="error-consent">{errors.consent}</small>}<div className="demo-legal full">Ez demó szöveg, nem kész jogi dokumentum. A beküldött tesztadatok kizárólag ebben a böngészőben maradnak.</div></div></div>}
        <div className="form-actions">{step > 1 && <button className="button-secondary" onClick={() => setStep(step - 1)}>Vissza</button>}<button className="button-primary" onClick={nextStep}>{step === 5 ? "Ajánlatkérés elküldése" : "Tovább"} →</button></div>
      </div>
    </section>
  );
}

function CallbackModal({ form, setForm, errors, setErrors, lead, close, submit, openDashboard }: {
  form: typeof DEFAULT_CALLBACK;
  setForm: React.Dispatch<React.SetStateAction<typeof DEFAULT_CALLBACK>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lead: Lead | null;
  close: () => void;
  submit: () => boolean;
  openDashboard: () => void;
}) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab" && modalRef.current) {
        const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])"))
          .filter((element) => !element.hasAttribute("disabled"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  const update = (field: keyof typeof DEFAULT_CALLBACK, value: string | boolean) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const error = (field: string) => errors[field] ? <small className="field-error" id={`callback-error-${field}`}>{errors[field]}</small> : null;

  return <div className="modal-backdrop" onMouseDown={close}>
    <div ref={modalRef} className="callback-modal" role="dialog" aria-modal="true" aria-labelledby="callback-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" aria-label="Gyors visszahívás bezárása" onClick={close}>×</button>
      {lead ? <>
        <div className="success-icon small">✓</div>
        <span className="eyebrow">Sikeres rögzítés</span>
        <h2 id="callback-title">Visszahívási igénye megérkezett</h2>
        <p>Az érdeklődés azonosítója: <strong>{lead.id}</strong>. A demó kezelőfelületen már látható a visszahívási feladat.</p>
        <div className="callback-summary"><span>{lead.name}</span><span>{lead.city}</span><span>{lead.service}</span><span>{lead.callTime}</span></div>
        <div className="modal-actions"><button className="button-secondary" onClick={close}>Bezárás</button><button className="button-primary" onClick={openDashboard}>Megnyitás a kezelőfelületen</button></div>
      </> : <>
        <span className="eyebrow">Kevesebb mint egy perc</span>
        <h2 id="callback-title">Kérjen gyors visszahívást</h2>
        <p>Adja meg az alapadatokat, és egy munkanapon belül jelentkezünk. Ez nem minősül végleges ajánlatnak vagy időpontnak.</p>
        <div className="callback-grid">
          <label><span>Név *</span><input ref={firstFieldRef} id="callback-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "callback-error-name" : undefined} value={form.name} onChange={(event) => update("name", event.target.value)} />{error("name")}</label>
          <label><span>Telefonszám *</span><input id="callback-phone" type="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "callback-error-phone" : undefined} value={form.phone} placeholder="+36 30 123 4567" onChange={(event) => update("phone", event.target.value)} />{error("phone")}</label>
          <label><span>Szolgáltatás *</span><select id="callback-service" aria-invalid={Boolean(errors.service)} aria-describedby={errors.service ? "callback-error-service" : undefined} value={form.service} onChange={(event) => update("service", event.target.value)}><option value="">Válasszon…</option>{SERVICES.map((service) => <option key={service}>{service}</option>)}</select>{error("service")}</label>
          <label><span>Település *</span><input id="callback-city" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "callback-error-city" : undefined} value={form.city} placeholder="Pécs" onChange={(event) => update("city", event.target.value)} />{error("city")}</label>
          <label className="full"><span>Mikor hívható? *</span><select id="callback-callTime" aria-invalid={Boolean(errors.callTime)} aria-describedby={errors.callTime ? "callback-error-callTime" : undefined} value={form.callTime} onChange={(event) => update("callTime", event.target.value)}><option value="">Válasszon…</option>{["Délelőtt", "Délután", "Este", "Bármikor"].map((option) => <option key={option}>{option}</option>)}</select>{error("callTime")}</label>
          <label className="full"><span>Rövid megjegyzés – opcionális</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Például: két szobához szeretnék klímát." /></label>
          <label className="consent full"><input id="callback-consent" type="checkbox" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "callback-error-consent" : undefined} checked={form.consent} onChange={(event) => update("consent", event.target.checked)} /><span>Elolvastam a demó adatkezelési tájékoztatót, és kérem, hogy kapcsolatba lépjenek velem.</span></label>
          {errors.consent && <small className="field-error full" id="callback-error-consent">{errors.consent}</small>}
        </div>
        <div className="demo-legal">Ez demó szöveg, nem kész jogi dokumentum. Valódi adatot ne adjon meg.</div>
        <div className="modal-actions"><button className="button-secondary" onClick={close}>Mégsem</button><button className="button-primary" onClick={submit}>Visszahívást kérek</button></div>
      </>}
    </div>
  </div>;
}

function Success({ lead, onBooking, onDashboard }: { lead: Lead; onBooking: () => void; onDashboard: () => void }) {
  return (
    <section className="success-page">
      <div className="success-icon">✓</div><span className="eyebrow">Sikeres beküldés</span><h1>Köszönjük, megkaptuk az ajánlatkérését!</h1>
      <p>Ez még nem minősül végleges árajánlatnak vagy lefoglalt időpontnak. Munkatársunk egy munkanapon belül átnézi az adatokat, és jelentkezik a következő lépéssel.</p>
      <div className="summary-card"><div><span>Azonosító</span><strong>{lead.id}</strong></div><div><span>Szolgáltatás</span><strong>{lead.service}</strong></div><div><span>Település</span><strong>{lead.city}</strong></div><div><span>Kapcsolattartás</span><strong>{lead.contact}</strong></div><div><span>Következő lépés</span><strong>Adatok áttekintése és visszajelzés</strong></div></div>
      <div className="email-preview"><div><span>Automatikus e-mail előnézete</span><strong>Megkaptuk ajánlatkérését – Mecsek Klíma</strong></div><p>Kedves {lead.name}!</p><p>Köszönjük a megkeresést. Rögzítettük a(z) {lead.service.toLowerCase()} iránti érdeklődését.</p><p>Munkatársunk egy munkanapon belül áttekinti a megadott adatokat, majd a választott módon kapcsolatba lép Önnel.</p><p>Az érdeklődés azonosítója: <strong>{lead.id}</strong></p><small>Fontos: ez az üzenet nem minősül végleges árajánlatnak vagy visszaigazolt szerelési időpontnak.</small></div>
      <div className="success-actions"><button className="button-primary" onClick={onBooking}>15 perces telefonos egyeztetés foglalása</button><button className="button-secondary" onClick={onDashboard}>Megnézem a kezelőfelületen</button></div>
    </section>
  );
}

function Dashboard(props: {
  section: string; setSection: (s: string) => void; setMode: (m: "public" | "dashboard") => void;
  leads: Lead[]; tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  filteredLeads: Lead[]; query: string; setQuery: (s: string) => void; statusFilter: string;
  setStatusFilter: (s: string) => void; serviceFilter: string; setServiceFilter: (s: string) => void;
  cityFilter: string; setCityFilter: (s: string) => void; setSelected: (lead: Lead) => void; resetDemo: () => void;
  completeTask: (id: string) => void; postponeTask: (id: string) => void;
}) {
  const { section, setSection, setMode, leads, tasks, setSelected } = props;
  const activeTasks = tasks.filter((task) => !task.done);
  const nav = [["Áttekintés", "⌂"], ["Érdeklődők", "◎"], ["Mai feladatok", "□"], ["Ajánlatok", "₣"], ["Kimutatások", "↗"], ["Beállítások", "⚙"]];
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand dark"><span className="brand-mark">M</span><span><strong>Mecsek Klíma</strong><small>Demó kezelőfelület</small></span></div>
        <nav>{nav.map(([name, icon]) => <button className={section === name ? "active" : ""} key={name} onClick={() => setSection(name)}><span>{icon}</span>{name}{name === "Mai feladatok" && <i>{activeTasks.length}</i>}</button>)}</nav>
        <div className="sidebar-bottom"><button onClick={() => setMode("public")}>↗ Nyilvános oldal</button><small>Fiktív demóadatok</small></div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header"><div><span className="mobile-demo">Demó kezelőfelület</span><h1>{section}</h1><p>{section === "Áttekintés" ? "A mai nap legfontosabb ügyfélfolyamatai egy helyen." : "Minden megjelenített adat fiktív."}</p></div><div className="user-chip"><span>BM</span><div><strong>Bálint Márk</strong><small>Tulajdonos</small></div></div></header>
        {section === "Áttekintés" && <Overview leads={leads} tasks={activeTasks} openLead={setSelected} go={setSection} />}
        {section === "Érdeklődők" && <LeadList {...props} />}
        {section === "Mai feladatok" && <TaskList tasks={tasks} leads={leads} completeTask={props.completeTask} postponeTask={props.postponeTask} openLead={setSelected} />}
        {section === "Ajánlatok" && <Offers leads={leads} openLead={setSelected} />}
        {section === "Kimutatások" && <Reports leads={leads} tasks={tasks} />}
        {section === "Beállítások" && <Settings resetDemo={props.resetDemo} />}
      </div>
    </div>
  );
}

function Overview({ leads, tasks, openLead, go }: { leads: Lead[]; tasks: Task[]; openLead: (lead: Lead) => void; go: (s: string) => void }) {
  const metrics = [
    ["Új érdeklődők", leads.filter((l) => l.status === "Új").length, "↗"],
    ["Ma visszahívandók", tasks.filter((t) => t.due === today() && t.type.includes("Visszahívás")).length, "☎"],
    ["Felmérésre várók", leads.filter((l) => l.status === "Felmérés egyeztetve").length, "⌂"],
    ["Kiküldött ajánlatok", leads.filter((l) => l.status === "Ajánlat elküldve").length, "₣"],
    ["Utánkövetésre várók", leads.filter((l) => l.status === "Utánkövetés szükséges").length, "↻"],
    ["Megnyert munkák", leads.filter((l) => l.status === "Megnyert").length, "✓"],
    ["Lejárt feladatok", tasks.filter((t) => t.due < today()).length, "!"],
  ];
  return <div className="dashboard-content">
    <div className="metric-grid">{metrics.map(([label, value, icon]) => <article key={label as string}><div><span>{icon}</span><small>{label}</small></div><strong>{value}</strong></article>)}</div>
    <div className="dashboard-columns">
      <section className="panel"><div className="panel-title"><div><h2>Legfrissebb érdeklődők</h2><p>Az utolsó beérkezett megkeresések</p></div><button onClick={() => go("Érdeklődők")}>Összes megnyitása →</button></div>
        <div className="compact-list">{leads.slice(0, 6).map((lead) => <button key={lead.id} onClick={() => openLead(lead)}><span className="avatar">{lead.name.split(" ").map((x) => x[0]).join("")}</span><span><strong>{lead.name}</strong><small>{lead.city} • {lead.service}</small></span><Status status={lead.status} /><b>›</b></button>)}</div>
      </section>
      <section className="panel today-panel"><div className="panel-title"><div><h2>Mai teendők</h2><p>Ne maradjon el egy következő lépés sem</p></div><button onClick={() => go("Mai feladatok")}>Lista →</button></div>
        {tasks.slice(0, 5).map((task) => { const lead = leads.find((l) => l.id === task.leadId)!; return <button className="mini-task" key={task.id} onClick={() => lead && openLead(lead)}><i className={`priority ${task.priority.toLowerCase()}`} /><span><strong>{task.type}</strong><small>{lead?.name} • {lead?.city}</small></span><time>{task.due === today() ? "Ma" : task.due}</time></button>; })}
      </section>
    </div>
    <div className="pipeline"><div className="panel-title"><div><h2>Értékesítési folyamat</h2><p>Az aktuális érdeklődők státusz szerint</p></div><small>A megjelenített számok fiktív demóadatok.</small></div><div className="pipeline-row">{[["Új érdeklődő", ["Új", "Visszahívandó"]], ["Kapcsolatfelvétel", ["Kapcsolatfelvétel megtörtént"]], ["Felmérés", ["Felmérés egyeztetve"]], ["Ajánlat", ["Ajánlat készül", "Ajánlat elküldve", "Utánkövetés szükséges"]], ["Megnyert munka", ["Megnyert"]]].map(([name, statuses], index) => <div key={name as string}><span>{index + 1}</span><strong>{leads.filter((l) => (statuses as string[]).includes(l.status)).length}</strong><small>{name as string}</small></div>)}</div></div>
  </div>;
}

function LeadList(props: {
  filteredLeads: Lead[]; query: string; setQuery: (s: string) => void; statusFilter: string;
  setStatusFilter: (s: string) => void; serviceFilter: string; setServiceFilter: (s: string) => void;
  cityFilter: string; setCityFilter: (s: string) => void; setSelected: (lead: Lead) => void; leads: Lead[];
}) {
  const cities = Array.from(new Set(props.leads.map((lead) => lead.city))).sort();
  return <div className="dashboard-content"><div className="filters"><input aria-label="Keresés" value={props.query} onChange={(e) => props.setQuery(e.target.value)} placeholder="Keresés név, telefon vagy azonosító alapján…" /><select aria-label="Státusz" value={props.statusFilter} onChange={(e) => props.setStatusFilter(e.target.value)}><option value="">Minden státusz</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><select aria-label="Szolgáltatás" value={props.serviceFilter} onChange={(e) => props.setServiceFilter(e.target.value)}><option value="">Minden szolgáltatás</option>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select><select aria-label="Település" value={props.cityFilter} onChange={(e) => props.setCityFilter(e.target.value)}><option value="">Minden település</option>{cities.map((s) => <option key={s}>{s}</option>)}</select></div>
    <div className="lead-table"><div className="table-head"><span>Érdeklődő</span><span>Szolgáltatás</span><span>Státusz</span><span>Prioritás</span><span>Következő lépés</span><span></span></div>{props.filteredLeads.length ? props.filteredLeads.map((lead) => <button className="table-row" key={lead.id} onClick={() => props.setSelected(lead)}><span><b>{lead.name}</b><small>{lead.id} • {lead.city}</small></span><span>{lead.service}</span><span><Status status={lead.status} /></span><span><i className={`priority ${lead.priority.toLowerCase()}`} />{lead.priority}</span><span><b>{lead.nextAction}</b><small>{lead.nextDate}</small></span><span>›</span></button>) : <div className="empty-state"><strong>Nincs találat</strong><p>Módosítsd a keresést vagy a szűrőket.</p></div>}</div>
  </div>;
}

function TaskList({ tasks, leads, completeTask, postponeTask, openLead }: {
  tasks: Task[];
  leads: Lead[];
  completeTask: (id: string) => void;
  postponeTask: (id: string) => void;
  openLead: (lead: Lead) => void;
}) {
  const active = tasks.filter((t) => !t.done);
  const groups = [["Lejárt", active.filter((t) => t.due < today())], ["Ma esedékes", active.filter((t) => t.due === today())], ["Következő hét", active.filter((t) => t.due > today())]] as [string, Task[]][];
  return <div className="dashboard-content task-groups">{groups.map(([title, group]) => <section className="panel" key={title}><div className="panel-title"><div><h2>{title}</h2><p>{group.length} aktív feladat</p></div></div>{group.length ? group.map((task) => { const lead = leads.find((l) => l.id === task.leadId); return <div className="task-row" key={task.id}><span className={`priority-label ${task.priority.toLowerCase()}`}><i className={`priority ${task.priority.toLowerCase()}`} />{task.priority}</span><span><strong>{task.type}</strong><small>{lead?.name} • {lead?.phone} • {lead?.service}</small><small>{task.owner ?? "Bálint"}{task.note ? ` • ${task.note}` : ""}</small></span><time>{task.due}{task.time ? ` ${task.time}` : ""}</time><div><button onClick={() => completeTask(task.id)}>✓ Elvégezve</button><button onClick={() => postponeTask(task.id)}>+1 nap</button><button onClick={() => lead && openLead(lead)}>Ügyfél →</button></div></div>; }) : <div className="empty-state small"><strong>Nincs feladat ebben a csoportban</strong></div>}</section>)}</div>;
}

function Offers({ leads, openLead }: { leads: Lead[]; openLead: (lead: Lead) => void }) {
  const offers = leads.filter((lead) => ["Ajánlat készül", "Ajánlat elküldve", "Utánkövetés szükséges", "Megnyert", "Elvesztett"].includes(lead.status));
  return <div className="dashboard-content"><div className="offer-summary"><div><span>Nyitott ajánlati érték</span><strong>{money(offers.filter((l) => !["Megnyert", "Elvesztett"].includes(l.status)).reduce((sum, l) => sum + l.value, 0))}</strong></div><div><span>Megnyert érték</span><strong>{money(offers.filter((l) => l.status === "Megnyert").reduce((sum, l) => sum + l.value, 0))}</strong></div></div><div className="lead-table offer-table"><div className="table-head"><span>Ügyfél</span><span>Becsült érték</span><span>Státusz</span><span>Következő lépés</span><span></span></div>{offers.map((lead) => <button className="table-row" key={lead.id} onClick={() => openLead(lead)}><span><b>{lead.name}</b><small>{lead.city} • {lead.id}</small></span><span><b>{money(lead.value)}</b></span><span><Status status={lead.status} /></span><span>{lead.nextAction}<small>{lead.nextDate}{daysSince(lead.offerSentAt) !== null ? ` • ${daysSince(lead.offerSentAt)} napja vár` : ""}</small></span><span>›</span></button>)}</div></div>;
}

function Reports({ leads, tasks }: { leads: Lead[]; tasks: Task[] }) {
  const metrics = computeReportMetrics(leads, tasks);
  const services = SERVICES.map((service) => ({ service: service.replace(" telepítése", "").replace(" vagy karbantartás", ""), count: leads.filter((lead) => lead.service === service).length })).filter((item) => item.count);
  const sources = Array.from(new Set(leads.map((lead) => lead.source))).map((source) => ({ source, count: leads.filter((lead) => lead.source === source).length }));
  const statuses = STATUSES.map((status) => ({ status, count: leads.filter((lead) => lead.status === status).length })).filter((item) => item.count);
  const lossReasons = Array.from(new Set(leads.filter((lead) => lead.lossReason).map((lead) => lead.lossReason as string))).map((reason) => ({ reason, count: leads.filter((lead) => lead.lossReason === reason).length }));
  const maxCount = (items: { count: number }[]) => Math.max(1, ...items.map((item) => item.count));
  return <div className="dashboard-content reports"><div className="report-note">A megjelenített számok fiktív demóadatok. Minden mutató az aktuális rekordokból számolódik.</div><div className="report-metrics expanded"><article><span>Összes érdeklődő</span><strong>{metrics.total}</strong><small>{metrics.newCount} új státuszú</small></article><article><span>Kiküldött ajánlatok</span><strong>{metrics.sentCount}</strong><small>{metrics.leadToOfferRate === null ? "Nincs elég adat" : `${metrics.leadToOfferRate}% érdeklődőből ajánlat`}</small></article><article><span>Megnyert / elvesztett</span><strong>{metrics.wonCount} / {metrics.lostCount}</strong><small>{metrics.offerToWinRate === null ? "Nincs elég adat" : `${metrics.offerToWinRate}% ajánlatból megnyert`}</small></article><article><span>Átlagos ajánlati érték</span><strong>{metrics.averageOfferValue === null ? "—" : money(metrics.averageOfferValue)}</strong><small>Fiktív becslés</small></article><article><span>Becsült folyamatérték</span><strong>{money(metrics.pipelineValue)}</strong><small>Aktív, nem végleges összeg</small></article><article><span>Utánkövetés nélkül</span><strong>{metrics.withoutFollowup}</strong><small>{metrics.withoutFollowup ? "Beavatkozás szükséges" : "Minden ajánlatnak van feladata"}</small></article></div>
    <div className="chart-grid"><section className="panel"><h2>Érdeklődők szolgáltatásonként</h2>{services.length ? <div className="bars">{services.map((item) => <div key={item.service}><span>{item.service}</span><i><b style={{ width: `${(item.count / maxCount(services)) * 100}%` }} /></i><strong>{item.count}</strong></div>)}</div> : <div className="empty-state small"><strong>Még nincs elegendő adat.</strong></div>}</section><section className="panel"><h2>Érdeklődők forrása</h2>{sources.length ? <div className="bars green">{sources.map((item) => <div key={item.source}><span>{item.source}</span><i><b style={{ width: `${(item.count / maxCount(sources)) * 100}%` }} /></i><strong>{item.count}</strong></div>)}</div> : <div className="empty-state small"><strong>Még nincs elegendő adat.</strong></div>}</section><section className="panel"><h2>Státuszonkénti megoszlás</h2><div className="bars">{statuses.map((item) => <div key={item.status}><span>{item.status}</span><i><b style={{ width: `${(item.count / maxCount(statuses)) * 100}%` }} /></i><strong>{item.count}</strong></div>)}</div></section><section className="panel"><h2>Elvesztési okok</h2>{lossReasons.length ? <div className="bars green">{lossReasons.map((item) => <div key={item.reason}><span>{item.reason}</span><i><b style={{ width: `${(item.count / maxCount(lossReasons)) * 100}%` }} /></i><strong>{item.count}</strong></div>)}</div> : <div className="empty-state small"><strong>Még nincs rögzített elvesztési ok.</strong></div>}</section></div>
  </div>;
}

function Settings({ resetDemo }: { resetDemo: () => void }) {
  return <div className="dashboard-content settings"><section className="panel"><h2>Demóbeállítások</h2><p>Az alkalmazás kizárólag helyi, fiktív adatokat használ. Nincs valódi e-mail-, SMS- vagy fájlküldés.</p><div className="setting-row"><div><strong>Demóadatok visszaállítása</strong><small>Törli az ezen az eszközön végzett módosításokat.</small></div><button className="danger-button" onClick={resetDemo}>Alaphelyzet</button></div><div className="setting-row"><div><strong>Automatikus utánkövetés</strong><small>Ajánlat elküldésekor 3 és 7 napos feladat készül.</small></div><span className="toggle on">Bekapcsolva</span></div><div className="setting-row"><div><strong>Adattárolás</strong><small>A demóadatok csak a böngésző helyi tárhelyén maradnak meg.</small></div><span className="tag">localStorage</span></div></section><section className="panel legal-panel"><h2>Adatvédelmi figyelmeztetés</h2><p>Ez nem kész jogi dokumentum. Éles rendszerhez adatkezelési tájékoztató, szerepkörök, megőrzési idők, hozzáférések és megfelelő technikai védelem szükséges.</p></section></div>;
}

function LeadDrawer({ lead, close, changeStatus, setLossReason, createTask, note, setNote, addNote, tasks }: {
  lead: Lead;
  close: () => void;
  changeStatus: (lead: Lead, status: LeadStatus) => void;
  setLossReason: (lead: Lead, reason: string) => void;
  createTask: (lead: Lead, draft: typeof DEFAULT_TASK_FORM) => void;
  note: string;
  setNote: (s: string) => void;
  addNote: () => void;
  tasks: Task[];
}) {
  const [taskForm, setTaskForm] = useState(DEFAULT_TASK_FORM);
  const [taskError, setTaskError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  const saveTask = () => {
    if (!taskForm.type || !taskForm.due || !taskForm.owner) {
      setTaskError("A feladattípus, a határidő és a felelős kötelező.");
      return;
    }
    createTask(lead, taskForm);
    setTaskForm(DEFAULT_TASK_FORM);
    setTaskError("");
  };

  const waitingDays = daysSince(lead.offerSentAt);

  return <div className="drawer-backdrop" onMouseDown={close}>
    <aside className="lead-drawer" role="dialog" aria-modal="true" aria-labelledby="lead-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>{lead.id}</span><h2 id="lead-title">{lead.name}</h2><p>{lead.city} • {lead.service}</p></div><button aria-label="Érdeklődő adatlapjának bezárása" onClick={close}>×</button></header>
      <div className="drawer-status"><label><span>Státusz</span><select value={lead.status} onChange={(event) => changeStatus(lead, event.target.value as LeadStatus)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><Status status={lead.status} /></div>
      {lead.status === "Elvesztett" && <div className="loss-reason"><label><span>Elvesztési ok *</span><select value={lead.lossReason ?? ""} onChange={(event) => setLossReason(lead, event.target.value)}><option value="">Válasszon…</option>{LOSS_REASONS.map((reason) => <option key={reason}>{reason}</option>)}</select></label></div>}
      <div className="drawer-body">
        <section><h3>Kapcsolat</h3><div className="detail-grid"><div><span>Telefon</span><strong>{lead.phone || "Nincs megadva"}</strong></div><div><span>E-mail</span><strong>{lead.email || "Nincs megadva"}</strong></div><div><span>Kapcsolattartás</span><strong>{lead.contact || "Nincs megadva"}</strong></div><div><span>Hívható</span><strong>{lead.callTime || "Nincs megadva"}</strong></div><div><span>Utolsó kapcsolat</span><strong>{lead.lastContactAt ?? "Még nem történt"}</strong></div></div></section>
        <section><h3>Igény és ingatlan</h3><div className="detail-grid"><div><span>Ingatlan</span><strong>{lead.property || "Még nem ismert"}</strong></div><div><span>Alapterület</span><strong>{lead.area ? `${lead.area} m²` : "Nincs megadva"}</strong></div><div><span>Helyiségek</span><strong>{lead.rooms || "Nincs megadva"}</strong></div><div><span>Időzítés</span><strong>{lead.urgency || "Nincs megadva"}</strong></div><div className="wide"><span>Műszaki adatok</span><strong>{lead.technical || "Visszahíváskor pontosítandó"}</strong></div><div className="wide"><span>Leírás</span><strong>{lead.description || "Nincs megjegyzés"}</strong></div></div></section>
        <section><h3>Üzleti adatok</h3><div className="detail-grid"><div><span>Becsült érték</span><strong>{money(lead.value)}</strong></div><div><span>Prioritás</span><strong><i className={`priority ${lead.priority.toLowerCase()}`} />{lead.priority}</strong></div><div><span>Felelős</span><strong>{lead.owner}</strong></div><div><span>Forrás</span><strong>{lead.source}</strong></div><div><span>Ajánlat elküldve</span><strong>{lead.offerSentAt ?? "Még nem"}</strong></div><div><span>Válaszra vár</span><strong>{waitingDays === null ? "—" : `${waitingDays} napja`}</strong></div>{lead.lossReason && <div className="wide"><span>Elvesztési ok</span><strong>{lead.lossReason}</strong></div>}</div></section>
        <section><h3>Aktív feladatok</h3>{tasks.length ? tasks.map((task) => <div className="drawer-task" key={task.id}><span className={`priority-label ${task.priority.toLowerCase()}`}><i className={`priority ${task.priority.toLowerCase()}`} />{task.priority}</span><span><strong>{task.type}</strong><small>{task.due}{task.time ? ` • ${task.time}` : ""} • {task.owner ?? "Bálint"}</small>{task.note && <small>{task.note}</small>}</span></div>) : <p className="muted">Nincs aktív feladat.</p>}</section>
        <section><h3>Új következő feladat</h3><div className="task-form"><label><span>Feladat típusa *</span><select value={taskForm.type} onChange={(event) => setTaskForm((previous) => ({ ...previous, type: event.target.value }))}>{TASK_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label><span>Határidő *</span><input type="date" value={taskForm.due} onChange={(event) => setTaskForm((previous) => ({ ...previous, due: event.target.value }))} /></label><label><span>Időpont – opcionális</span><input type="time" value={taskForm.time} onChange={(event) => setTaskForm((previous) => ({ ...previous, time: event.target.value }))} /></label><label><span>Prioritás *</span><select value={taskForm.priority} onChange={(event) => setTaskForm((previous) => ({ ...previous, priority: event.target.value as Priority }))}>{["Magas", "Közepes", "Alacsony"].map((priority) => <option key={priority}>{priority}</option>)}</select></label><label><span>Felelős *</span><select value={taskForm.owner} onChange={(event) => setTaskForm((previous) => ({ ...previous, owner: event.target.value }))}>{["Bálint", "Dóra"].map((owner) => <option key={owner}>{owner}</option>)}</select></label><label className="wide"><span>Belső megjegyzés – opcionális</span><textarea value={taskForm.note} onChange={(event) => setTaskForm((previous) => ({ ...previous, note: event.target.value }))} /></label></div>{taskError && <p className="field-error" role="alert">{taskError}</p>}<button className="button-primary task-save" onClick={saveTask}>Feladat létrehozása</button></section>
        <section><h3>Belső jegyzet</h3><div className="note-box"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Új belső jegyzet…" /><button onClick={addNote}>Jegyzet mentése</button></div>{lead.notes.map((item, index) => <p className="saved-note" key={index}>{item}</p>)}</section>
        <section><h3>Események</h3><div className="timeline">{lead.timeline.map((item, index) => <p key={index}><i /><span>{item}</span></p>)}</div></section>
      </div>
    </aside>
  </div>;
}

function Booking({ close, confirm }: { close: () => void; confirm: () => void }) {
  const slots = ["Július 27. 09:00", "Július 27. 14:30", "Július 28. 10:30", "Július 29. 16:00"];
  const [slot, setSlot] = useState("");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);
  return <div className="modal-backdrop" onMouseDown={close}><div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Időpontfoglalás bezárása" onClick={close}>×</button><span className="eyebrow">Szimulált időpontfoglalás</span><h2 id="booking-title">15 perces telefonos egyeztetés</h2><p>Válasszon egy fiktív időpontot. Külső naptárfoglalás nem történik.</p><div className="slot-grid">{slots.map((item) => <button aria-pressed={slot === item} className={slot === item ? "selected" : ""} onClick={() => setSlot(item)} key={item}>{item}</button>)}</div><button className="button-primary full-button" disabled={!slot} onClick={confirm}>Demó időpont rögzítése</button></div></div>;
}

function Status({ status }: { status: LeadStatus }) {
  const tone = status === "Megnyert" ? "success" : status === "Elvesztett" || status === "Nem releváns" ? "neutral" : status.includes("Ajánlat") || status.includes("Utánkövetés") ? "warning" : status === "Új" || status === "Visszahívandó" ? "info" : "progress";
  return <span className={`status ${tone}`}>{status}</span>;
}
