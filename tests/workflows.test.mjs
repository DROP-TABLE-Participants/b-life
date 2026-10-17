import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

const storage = new Map();
globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) } };
const { useAppStore: store } = await import("@/store/useAppStore");
const { forecastFacilities, sessionForFacility, visibleRecommendations } = await import("@/lib/access");
const { STORAGE_KEY, APP_STATE_VERSION } = await import("@/lib/constants");
const { runForecastingEngine } = await import("@/lib/forecasting");
const state = () => store.getState();
const stock = (id, type) => state().hospitals.find((item) => item.id === id).inventoryByBloodType[type];
const login = (facility) => state().setSession(sessionForFacility(facility));
const shipment = (id) => state().shipments.find((item) => item.id === id);
const draft = (from, to, overrides = {}) => ({ fromHospitalId: from.id, toHospitalId: to.id, bloodType: "O-", quantity: 4, priority: "high", etaMinutes: 90, status: "planned", ...overrides });
const data = () => JSON.stringify({ hospitals: state().hospitals, shipments: state().shipments, recommendations: state().recommendations });

beforeEach(() => {
  state().setSession({ mode: null, hospitalId: null });
  state().resetDemoData();
});

test("forecast scope follows national, regional, and hospital roles", () => {
  const [national, regional, hospital] = state().hospitals;
  const unrelated = { ...hospital, id: "unrelated", regionalCenterId: "another-region" };
  const facilities = [...state().hospitals, unrelated];
  assert.deepEqual(forecastFacilities(national, facilities).map((item) => item.id), facilities.map((item) => item.id));
  assert.deepEqual(forecastFacilities(regional, facilities).map((item) => item.id), [regional.id, hospital.id]);
  assert.deepEqual(forecastFacilities(hospital, facilities).map((item) => item.id), [hospital.id]);
  assert.ok(visibleRecommendations(hospital, facilities, state().recommendations).every((item) => item.fromHospitalId === hospital.id || item.toHospitalId === hospital.id));
});

test("ministry cannot approve, dispatch, send, receive, change status, or edit stock", () => {
  const [national, regional] = state().hospitals;
  const recommendation = state().recommendations.find((item) => item.fromHospitalId === national.id);
  assert.ok(recommendation);
  state().setSession({ mode: "control_tower", hospitalId: null });
  const before = data();
  state().approveRecommendation(recommendation.id);
  state().dispatchRecommendation(recommendation.id);
  state().dispatchShipment("ship-bg-003");
  state().markShipmentReceived("ship-bg-001");
  state().markShipmentStatus("ship-bg-003", "cancelled");
  state().markShipmentStatus("ship-bg-001", "delivered");
  state().updateHospitalInventory(national.id, "O-", 999);
  assert.equal(state().scheduleManualShipment(draft(national, regional)), false);
  assert.equal(data(), before);
});

test("hospital recommendations are advisory even for an outgoing recommendation", () => {
  const [, regional, hospital] = state().hospitals;
  const advice = { ...state().recommendations[0], id: "hospital-advice", fromHospitalId: hospital.id, toHospitalId: regional.id, status: "pending_approval" };
  login(hospital);
  store.setState({ recommendations: [...state().recommendations, advice] });
  state().approveRecommendation(advice.id);
  state().dispatchRecommendation(advice.id);
  assert.equal(state().recommendations.find((item) => item.id === advice.id)?.status, "pending_approval");
  store.setState({ recommendations: state().recommendations.map((item) => item.id === advice.id ? { ...item, status: "approved" } : item) });
  state().dispatchRecommendation(advice.id);
  assert.ok(!state().shipments.some((item) => item.recommendationId === advice.id));
});

test("only the sender dispatches and only the recipient receives, exactly once", () => {
  const [national, regional, hospital] = state().hospitals;
  const senderBefore = stock(national.id, "B-");
  const recipientBefore = stock(hospital.id, "B-");
  login(hospital);
  state().markShipmentReceived("ship-bg-003");
  assert.equal(shipment("ship-bg-003").status, "approved");
  login(regional);
  state().dispatchShipment("ship-bg-003");
  assert.equal(shipment("ship-bg-003").status, "approved");
  login(national);
  state().dispatchShipment("ship-bg-003");
  state().dispatchShipment("ship-bg-003");
  assert.equal(stock(national.id, "B-"), senderBefore - 14);
  state().markShipmentReceived("ship-bg-003");
  assert.equal(shipment("ship-bg-003").status, "in_transit");
  login(hospital);
  state().markShipmentReceived("ship-bg-003");
  state().markShipmentReceived("ship-bg-003");
  assert.equal(stock(hospital.id, "B-"), recipientBefore + 14);
  assert.equal(shipment("ship-bg-003").status, "delivered");
  assert.equal(shipment("ship-bg-003").progress, 1);
});

test("all facility roles can plan and send their own stock with reservation checks", () => {
  for (const facility of state().hospitals) {
    login(facility);
    const destination = state().hospitals.find((item) => item.id !== facility.id);
    const before = stock(facility.id, "AB+");
    assert.equal(state().scheduleManualShipment(draft(facility, destination, { bloodType: "AB+", quantity: before })), true);
    const planned = state().shipments[0];
    assert.equal(stock(facility.id, "AB+"), before);
    assert.equal(state().scheduleManualShipment(draft(facility, destination, { bloodType: "AB+", quantity: 1, status: "in_transit" })), false);
    state().dispatchShipment(planned.id);
    assert.equal(stock(facility.id, "AB+"), 0);
    assert.equal(shipment(planned.id).status, "in_transit");
  }
});

test("invalid, excessive, and other-facility shipments are rejected", () => {
  const [national, regional, hospital] = state().hospitals;
  login(hospital);
  for (const overrides of [{ quantity: -1 }, { quantity: NaN }, { quantity: 0.5 }, { quantity: 999 }, { etaMinutes: NaN }, { bloodType: "X" }, { status: "delivered" }]) {
    assert.equal(state().scheduleManualShipment(draft(hospital, regional, overrides)), false);
  }
  assert.equal(state().scheduleManualShipment(draft(national, regional)), false);
  assert.equal(state().scheduleManualShipment(draft(hospital, hospital)), false);
});

test("center recommendations retain approval, dispatch once, and fulfill on receipt", () => {
  const national = state().hospitals[0];
  login(national);
  const recommendation = state().recommendations.find((item) => item.fromHospitalId === national.id && item.status === "pending_approval");
  assert.ok(recommendation);
  state().dispatchRecommendation(recommendation.id);
  assert.ok(!state().shipments.some((item) => item.recommendationId === recommendation.id));
  state().approveRecommendation(recommendation.id);
  state().tickShipments();
  assert.equal(state().recommendations.find((item) => item.id === recommendation.id).status, "approved");
  const before = stock(national.id, recommendation.bloodType);
  state().dispatchRecommendation(recommendation.id);
  state().dispatchRecommendation(recommendation.id);
  const deliveries = state().shipments.filter((item) => item.recommendationId === recommendation.id);
  assert.equal(deliveries.length, 1);
  assert.equal(stock(national.id, recommendation.bloodType), before - recommendation.suggestedQuantity);
  const recipient = state().hospitals.find((item) => item.id === recommendation.toHospitalId);
  login(recipient);
  state().markShipmentReceived(deliveries[0].id);
  assert.equal(state().recommendations.find((item) => item.id === recommendation.id).status, "fulfilled");
});

test("simulation arrivals await receipt and cannot credit inventory automatically", () => {
  const regional = state().hospitals[1];
  const before = stock(regional.id, "O-");
  for (let i = 0; i < 160; i++) state().tickShipments();
  assert.equal(shipment("ship-bg-001").progress, 1);
  assert.equal(shipment("ship-bg-001").status, "in_transit");
  assert.equal(stock(regional.id, "O-"), before);
});

test("delivered history and stock already in transit are not counted twice in forecasts", () => {
  const baseline = runForecastingEngine(state().hospitals, [], state().simulation);
  const history = runForecastingEngine(state().hospitals, state().shipments.filter((item) => item.status === "delivered"), state().simulation);
  assert.deepEqual(history, baseline);
  const departing = { ...shipment("ship-bg-001"), progress: 0 };
  const forecast = runForecastingEngine(state().hospitals, [departing], state().simulation);
  assert.deepEqual(forecast.filter((item) => item.hospitalId === departing.fromHospitalId), baseline.filter((item) => item.hospitalId === departing.fromHospitalId));
});

test("old local data is replaced with the new mock network and reset preserves account", () => {
  storage.set(STORAGE_KEY, JSON.stringify({ ...state(), version: "1.0.0", hospitals: [{ id: "old-hospital" }] }));
  store.setState({ initialized: false });
  state().initialize();
  assert.equal(state().version, APP_STATE_VERSION);
  assert.equal(state().hospitals.length, 3);
  assert.ok(!state().hospitals.some((item) => item.id === "old-hospital"));
  const regional = state().hospitals[1];
  login(regional);
  state().resetDemoData();
  assert.deepEqual(state().session, sessionForFacility(regional));
  assert.equal(JSON.parse(storage.get(STORAGE_KEY)).version, APP_STATE_VERSION);
});
