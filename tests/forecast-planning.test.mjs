import assert from "node:assert/strict";
import { test } from "node:test";
import { projectBloodStock, summarizeStockProjections } from "@/lib/forecast-planning";
import { seededHospitals, seededShipments } from "@/lib/seed";
import { runForecastingEngine } from "@/lib/forecasting";

const hospitals = seededHospitals();
const base = hospitals[2];
const prediction = runForecastingEngine([base], [])[0];
const facility = (stock, type = "O-") => ({ ...base, inventoryByBloodType: { [type]: stock } });
const forecast = (daily = 24, twoDays = 48, type = "O-") => ({ ...prediction, hospitalId: base.id, bloodType: type, predictedDemand24h: daily, predictedDemand48h: twoDays });
const incoming = (overrides = {}) => ({ ...seededShipments(hospitals)[1], id: "incoming", toHospitalId: base.id, fromHospitalId: hospitals[0].id, bloodType: "O-", quantity: 50, status: "in_transit", etaMinutes: 12 * 60, ...overrides });

test("48 h demand is cumulative and each day has its own consumption rate", () => {
  const row = projectBloodStock(facility(30), forecast(24, 72), [], 48);
  assert.equal(row.demandUnits, 72);
  assert.equal(row.balance, -42);
  assert.equal(row.firstShortageHour, 27);
  assert.equal(row.points.find(point => point.hour === 36).withDeliveries, -18);
  assert.equal(projectBloodStock(facility(30), forecast(24, 72), [], 24).replenishmentUnits, 0);
});

test("reserved outbound stock is excluded without subtracting already dispatched stock twice", () => {
  const outgoing = status => incoming({ id: status, fromHospitalId: base.id, toHospitalId: hospitals[0].id, quantity: 5, status });
  const row = projectBloodStock(facility(30), forecast(10, 20), [outgoing("approved"), outgoing("planned"), outgoing("in_transit"), outgoing("delayed"), outgoing("delivered")], 48);
  assert.equal(row.currentUnits, 30);
  assert.equal(row.reservedUnits, 10);
  assert.equal(row.availableUnits, 20);
  assert.equal(row.balance, 0);
  assert.equal(row.replenishmentUnits, 0);
});

test("late delivery cannot hide a temporary shortage even when final balance is positive", () => {
  const row = projectBloodStock(facility(5), forecast(), [incoming({ status: "delayed" })], 48);
  assert.equal(row.balance, 7);
  assert.equal(row.firstShortageHour, 5);
  assert.equal(row.replenishmentUnits, 7);
  assert.equal(row.delayedUnits, 50);
  assert.deepEqual(row.points.filter(point => point.hour === 12).map(point => point.withDeliveries), [-7, 43]);
});

test("delivery exactly at depletion prevents a shortage", () => {
  const row = projectBloodStock(facility(5), forecast(), [incoming({ etaMinutes: 5 * 60 })], 48);
  assert.equal(row.replenishmentUnits, 0);
  assert.equal(row.firstShortageHour, null);
});

test("only matching shipments in motion that arrive within the horizon are included", () => {
  const shipments = [incoming({ quantity: 4, etaMinutes: 60 }), incoming({ id: "late", quantity: 6, status: "delayed", etaMinutes: 180 }),
    ...["planned", "approved", "delivered", "cancelled"].map(status => incoming({ id: status, status })),
    incoming({ id: "tomorrow", etaMinutes: 25 * 60 }), incoming({ id: "other-group", bloodType: "A+" }),
    incoming({ id: "other-facility", toHospitalId: hospitals[1].id })];
  const row = projectBloodStock(facility(30), forecast(), shipments, 24);
  assert.equal(row.incomingUnits, 10);
  assert.equal(row.balance, 16);
  assert.equal(row.currentUnits, 30);
  assert.equal(row.delayedUnits, 6);
  assert.equal(row.awaitingDispatchUnits, 100);
});

test("arrived shipment awaiting receipt is projected once and remains separate from physical stock", () => {
  const row = projectBloodStock(facility(10), forecast(), [incoming({ quantity: 4, etaMinutes: 0, progress: 1 })], 24);
  assert.equal(row.currentUnits, 10);
  assert.equal(row.availableUnits, 10);
  assert.equal(row.incomingUnits, 4);
  assert.equal(row.balance, -10);
  assert.deepEqual(row.points.filter(point => point.hour === 0).map(point => point.withDeliveries), [10, 14]);
});

test("stress scenario increases demand without mutating forecasts, stock or shipments", () => {
  const hospital = facility(30);
  const prediction = forecast(20, 40);
  const shipments = [incoming({ quantity: 10 })];
  const before = JSON.stringify({ hospital, prediction, shipments });
  const row = projectBloodStock(hospital, prediction, shipments, 48, 40);
  assert.equal(row.demandUnits, 56);
  assert.equal(row.replenishmentUnits, 16);
  assert.equal(JSON.stringify({ hospital, prediction, shipments }), before);
  assert.equal(projectBloodStock(hospital, prediction, shipments, 48).replenishmentUnits, 0);
});

test("surplus in one blood group cannot offset another group's shortage", () => {
  const rows = [projectBloodStock(facility(100), forecast(10, 20), [], 48), projectBloodStock(facility(2, "B-"), forecast(10, 20, "B-"), [], 48)];
  const summary = summarizeStockProjections(rows);
  assert.equal(summary.availableUnits, 102);
  assert.equal(summary.demandUnits, 40);
  assert.equal(summary.replenishmentUnits, 18);
  assert.deepEqual(summary.shortages.map(row => row.bloodType), ["B-"]);
});

test("zero demand and stock remain finite and do not invent a shortage", () => {
  const row = projectBloodStock(facility(0), forecast(0, 0), [], 48);
  assert.equal(row.balance, 0);
  assert.equal(row.replenishmentUnits, 0);
  assert.equal(row.firstShortageHour, null);
  assert.ok(row.points.every(point => Number.isFinite(point.withDeliveries)));
});

test("fractional shortages round upward to a whole unit", () => {
  const row = projectBloodStock(facility(10), forecast(5, 10), [], 48, 20);
  assert.equal(row.replenishmentUnits, 2);
  const fractional = projectBloodStock(facility(10), forecast(5, 11), [], 48, 20);
  assert.equal(fractional.replenishmentUnits, 4);
});

test("total demand sums whole-unit needs per group, so summary and cards agree", () => {
  const rows = [projectBloodStock(facility(100), forecast(5, 11), [], 48, 20), projectBloodStock(facility(100, "B-"), forecast(5, 11, "B-"), [], 48, 20)];
  assert.equal(summarizeStockProjections(rows).demandUnits, 28);
});
