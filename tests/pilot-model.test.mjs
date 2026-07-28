import assert from "node:assert/strict";
import test from "node:test";

import {
  attentionSummary,
  calculateOfferTotals,
  calendarEntriesConflict,
  dashboardHash,
  KANBAN_COLUMNS,
  kanbanColumnForStatus,
  overviewCards,
  parseDashboardHash,
  rankTasks,
  salesSummary,
} from "../app/pilot-model.ts";

const lead = (status = "Új") => ({
  id: `MK-${status}`,
  name: "Minta Márton",
  phone: "+36 30 123 4567",
  email: "minta@example.hu",
  city: "Pécs",
  zip: "7621",
  service: "Új klíma telepítése",
  property: "Lakás",
  area: "60",
  rooms: "2",
  ownership: "Saját",
  urgency: "1 hónapon belül",
  budget: "300 000–600 000 Ft",
  description: "Fiktív tesztadat",
  contact: "Telefon",
  callTime: "Délután",
  technical: "1 készülék",
  source: "Demó",
  status,
  priority: "Közepes",
  owner: "Bálint",
  value: 620000,
  nextAction: "Visszahívás",
  nextDate: "2026-07-24",
  createdAt: "2026-07-24",
  notes: [],
  timeline: [],
});

test("a hét áttekintőkártya valós szűrt célpontot ad", () => {
  const cards = overviewCards(
    [lead("Új"), lead("Ajánlat elküldve"), lead("Megnyert")],
    [{ id: "T-1", leadId: "MK-Új", type: "Visszahívás", due: "2026-07-24", priority: "Magas", done: false }],
    "2026-07-24",
  );
  assert.equal(cards.length, 7);
  assert.equal(cards.find((card) => card.label === "Új érdeklődők")?.value, 1);
  assert.equal(cards.find((card) => card.label === "Ma visszahívandók")?.value, 1);
  assert.ok(cards.every((card) => card.filter && card.section));
});

test("az admin URL megőrzi és visszaolvassa az aktív szűrést", () => {
  const hash = dashboardHash("Érdeklődők", { scope: "lead", value: "Új", label: "Új érdeklődők" });
  assert.match(hash, /^#admin\/erdeklodok\?/);
  assert.deepEqual(parseDashboardHash(hash), {
    section: "Érdeklődők",
    filter: { scope: "lead", value: "Új", label: "Új érdeklődők" },
  });
  assert.equal(parseDashboardHash("#ismeretlen"), null);
  assert.deepEqual(parseDashboardHash(dashboardHash("Kanban")), { section: "Kanban", filter: null });
});

test("a Kanban kilenc üzleti oszlopa minden fontos státuszt lefed", () => {
  assert.equal(KANBAN_COLUMNS.length, 9);
  assert.equal(kanbanColumnForStatus("Visszahívandó"), "Visszahívás");
  assert.equal(kanbanColumnForStatus("Nem releváns"), null);
});

test("a teendőranglista a prioritást, lejáratot és értéket együtt kezeli", () => {
  const leads = [lead("Új"), { ...lead("Új"), id: "MK-2", value: 2500000 }];
  const ranked = rankTasks([
    { id: "T-1", leadId: "MK-Új", type: "Visszahívás", due: "2026-07-23", priority: "Magas", done: false },
    { id: "T-2", leadId: "MK-2", type: "Ajánlat", due: "2026-07-24", priority: "Közepes", done: false },
  ], leads, "2026-07-24");
  assert.equal(ranked[0].task.id, "T-1");
});

test("a figyelmeztetések és értékesítési összefoglaló az aktuális adatokból számol", () => {
  const sent = { ...lead("Ajánlat elküldve"), owner: "", nextAction: "", lastContactAt: "2026-07-18" };
  const attention = attentionSummary([sent], [], "2026-07-24");
  assert.equal(attention.withoutOwner, 1);
  assert.equal(attention.withoutNextStep, 1);
  assert.equal(attention.offersWithoutFollowup, 1);

  const offer = {
    id: "AJ-1", leadId: sent.id, createdAt: "2026-07-20", validUntil: "2026-08-01", status: "Kiküldött",
    lines: [{ id: "L-1", name: "Szerelés", kind: "Munkadíj", quantity: 1, unitPrice: 100000 }],
    discountPercent: 0, vatPercent: 27, notes: "", paymentTerms: "",
  };
  const summary = salesSummary([sent, lead("Megnyert")], [offer]);
  assert.equal(summary.openOfferCount, 1);
  assert.equal(summary.openOfferValue, 127000);
  assert.equal(summary.estimatedConversionRate, 100);
});

test("az ajánlat nettó, áfa- és bruttó összege helyesen számolódik", () => {
  const totals = calculateOfferTotals({
    lines: [
      { id: "1", name: "Készülék", kind: "Anyag", quantity: 2, unitPrice: 300000 },
      { id: "2", name: "Szerelés", kind: "Munkadíj", quantity: 1, unitPrice: 100000 },
    ],
    discountPercent: 10,
    vatPercent: 27,
  });
  assert.deepEqual(totals, {
    subtotal: 700000,
    discount: 70000,
    net: 630000,
    vat: 170100,
    gross: 800100,
  });
});

test("a naptár azonos munkatárs átfedő időpontját jelzi", () => {
  const existing = {
    id: "CAL-1",
    leadId: "MK-1",
    title: "Felmérés",
    type: "Helyszíni felmérés",
    date: "2026-07-24",
    time: "10:00",
    duration: 60,
    owner: "Bálint",
    address: "Pécs",
    notes: "",
  };
  assert.equal(calendarEntriesConflict({ ...existing, id: "CAL-2", time: "10:30" }, [existing]), true);
  assert.equal(calendarEntriesConflict({ ...existing, id: "CAL-3", time: "11:00" }, [existing]), false);
  assert.equal(calendarEntriesConflict({ ...existing, id: "CAL-4", owner: "Dóra" }, [existing]), false);
});
