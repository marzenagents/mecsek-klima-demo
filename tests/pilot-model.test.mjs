import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateOfferTotals,
  calendarEntriesConflict,
  dashboardHash,
  overviewCards,
  parseDashboardHash,
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
