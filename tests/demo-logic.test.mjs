import assert from "node:assert/strict";
import test from "node:test";

import {
  computeReportMetrics,
  createMissingFollowups,
  isValidEmail,
  isValidPhone,
} from "../app/demo-logic.ts";

const baseLead = (overrides = {}) => ({
  id: "MK-2001",
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
  source: "Demó űrlap",
  status: "Új",
  priority: "Közepes",
  owner: "Bálint",
  value: 620000,
  nextAction: "Visszahívás",
  nextDate: "2026-07-25",
  createdAt: "2026-07-24",
  notes: [],
  timeline: [],
  ...overrides,
});

test("a magyar telefonszám és e-mail ellenőrzése működik", () => {
  assert.equal(isValidPhone("+36 30 123 4567"), true);
  assert.equal(isValidPhone("123"), false);
  assert.equal(isValidEmail("minta@example.hu"), true);
  assert.equal(isValidEmail("hibas-cim"), false);
});

test("az ajánlati utánkövetés csak a hiányzó feladatokat hozza létre", () => {
  const initial = createMissingFollowups([], "MK-2001", "2026-07-24");
  assert.equal(initial.length, 2);
  assert.deepEqual(initial.map((task) => task.due), ["2026-07-27", "2026-07-31"]);

  const repeated = createMissingFollowups(initial, "MK-2001", "2026-07-24");
  assert.equal(repeated.length, 0);

  const oneMissing = createMissingFollowups([initial[0]], "MK-2001", "2026-07-24");
  assert.equal(oneMissing.length, 1);
  assert.equal(oneMissing[0].followupKey, "offer-7");
});

test("a kimutatások az aktuális érdeklődőkből és feladatokból számolnak", () => {
  const leads = [
    baseLead(),
    baseLead({ id: "MK-2002", status: "Ajánlat elküldve", value: 800000 }),
    baseLead({ id: "MK-2003", status: "Megnyert", value: 1200000 }),
    baseLead({ id: "MK-2004", status: "Elvesztett", value: 400000 }),
  ];
  const tasks = createMissingFollowups([], "MK-2002", "2026-07-24");
  const metrics = computeReportMetrics(leads, tasks);

  assert.equal(metrics.total, 4);
  assert.equal(metrics.sentCount, 3);
  assert.equal(metrics.wonCount, 1);
  assert.equal(metrics.lostCount, 1);
  assert.equal(metrics.leadToOfferRate, 75);
  assert.equal(metrics.offerToWinRate, 33);
  assert.equal(metrics.averageOfferValue, 800000);
  assert.equal(metrics.withoutFollowup, 2);
});
