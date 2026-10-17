import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

const storage = new Map();
globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) } };
const { useAppStore: store } = await import("@/store/useAppStore");
const { forecastFacilities, sessionForFacility, visibleRecommendations } = await import("@/lib/access");
const { STORAGE_KEY, APP_STATE_VERSION } = await import("@/lib/constants");
const { runForecastingEngine } = await import("@/lib/forecasting");
const { availableInventoryUnits, eligibleOrderSuppliers } = await import("@/lib/inventory");
const state = () => store.getState();
const stock = (id, type) => state().hospitals.find((item) => item.id === id).inventoryByBloodType[type];
const login = (facility) => state().setSession(sessionForFacility(facility));
const shipment = (id) => state().shipments.find((item) => item.id === id);
const draft = (from, to, overrides = {}) => ({ fromHospitalId: from.id, toHospitalId: to.id, bloodType: "O-", quantity: 4, priority: "high", etaMinutes: 90, status: "planned", ...overrides });
const data = () => JSON.stringify({ hospitals: state().hospitals, shipments: state().shipments, recommendations: state().recommendations, orders: state().orders });
const orderDraft = (requester, supplier, overrides = {}) => ({ requesterHospitalId: requester.id, supplierHospitalId: supplier.id, bloodType: "O-", quantity: 4, priority: "high", ...overrides });

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

test("order suppliers are filtered by the selected type, quantity, and unreserved stock", () => {
  const [national, regional, hospital] = state().hospitals;
  // National B- stock is 75, with 14 already reserved for an approved shipment.
  assert.equal(availableInventoryUnits(state(), national.id, "B-"), 61);
  assert.deepEqual(eligibleOrderSuppliers(state(), hospital.id, "B-", 61).map((item) => item.id), [national.id]);
  assert.deepEqual(eligibleOrderSuppliers(state(), hospital.id, "B-", 62), []);
  assert.deepEqual(eligibleOrderSuppliers(state(), hospital.id, "B-", 18).map((item) => item.id), [national.id, regional.id]);
  assert.deepEqual(eligibleOrderSuppliers(state(), hospital.id, "O+", 62).map((item) => item.id), [national.id, regional.id]);
  assert.ok(!eligibleOrderSuppliers(state(), national.id, "O-", 1).some((item) => item.id === national.id));
  for (const invalid of [0, -1, 0.5, NaN, Infinity]) assert.deepEqual(eligibleOrderSuppliers(state(), hospital.id, "O-", invalid), []);
});

test("an order awaits its supplier, reserves on acceptance, and fulfills through dispatch and receipt", () => {
  const [national, supplier, requester] = state().hospitals;
  login(requester);
  const originalCount = state().shipments.length;
  const supplierBefore = stock(supplier.id, "AB+");
  const requesterBefore = stock(requester.id, "AB+");
  assert.equal(state().placeBloodOrder(orderDraft(requester, supplier, { bloodType: "AB+", quantity: 8 })), true);
  const order = state().orders[0];
  assert.equal(order.status, "pending");
  assert.equal(state().shipments.length, originalCount);
  assert.equal(state().acceptBloodOrder(order.id), false);
  assert.equal(state().rejectBloodOrder(order.id), false);
  login(national);
  assert.equal(state().acceptBloodOrder(order.id), false);
  login(supplier);
  assert.equal(state().acceptBloodOrder(order.id), true);
  assert.equal(state().acceptBloodOrder(order.id), false);
  const accepted = state().orders.find((item) => item.id === order.id);
  assert.equal(accepted.status, "accepted");
  assert.equal(state().shipments.filter((item) => item.orderId === order.id).length, 1);
  assert.equal(shipment(accepted.shipmentId).status, "approved");
  assert.equal(stock(supplier.id, "AB+"), supplierBefore);
  assert.equal(availableInventoryUnits(state(), supplier.id, "AB+"), supplierBefore - 8);
  login(requester);
  assert.equal(state().cancelBloodOrder(order.id), false);
  state().markShipmentReceived(accepted.shipmentId);
  assert.equal(stock(requester.id, "AB+"), requesterBefore);
  login(supplier);
  state().dispatchShipment(accepted.shipmentId);
  state().dispatchShipment(accepted.shipmentId);
  assert.equal(stock(supplier.id, "AB+"), supplierBefore - 8);
  login(requester);
  state().markShipmentReceived(accepted.shipmentId);
  state().markShipmentReceived(accepted.shipmentId);
  assert.equal(stock(requester.id, "AB+"), requesterBefore + 8);
  assert.equal(state().orders.find((item) => item.id === order.id).status, "fulfilled");
});

test("competing pending orders cannot reserve the same stock or bypass manual shipment reservations", () => {
  const [national, supplier, hospital] = state().hospitals;
  login(national);
  assert.equal(state().placeBloodOrder(orderDraft(national, supplier, { bloodType: "AB+", quantity: 40 })), true);
  const first = state().orders[0];
  login(hospital);
  assert.equal(state().placeBloodOrder(orderDraft(hospital, supplier, { bloodType: "AB+", quantity: 40 })), true);
  const second = state().orders[0];
  login(supplier);
  assert.equal(state().acceptBloodOrder(first.id), true);
  const before = data();
  assert.equal(state().acceptBloodOrder(second.id), false);
  assert.equal(state().scheduleManualShipment(draft(supplier, hospital, { bloodType: "AB+", quantity: 1 })), false);
  assert.equal(data(), before);
  login(hospital);
  assert.equal(state().placeBloodOrder(orderDraft(hospital, supplier, { bloodType: "AB+", quantity: 1 })), false);
});

test("pending orders may be declined by the supplier or cancelled by the requester", () => {
  const [, supplier, requester] = state().hospitals;
  login(requester);
  state().placeBloodOrder(orderDraft(requester, supplier));
  const first = state().orders[0];
  login(supplier);
  assert.equal(state().cancelBloodOrder(first.id), false);
  assert.equal(state().rejectBloodOrder(first.id), true);
  assert.equal(state().acceptBloodOrder(first.id), false);
  assert.equal(state().orders[0].status, "rejected");
  login(requester);
  state().placeBloodOrder(orderDraft(requester, supplier));
  const second = state().orders[0];
  assert.equal(state().cancelBloodOrder(second.id), true);
  login(supplier);
  assert.equal(state().acceptBloodOrder(second.id), false);
  assert.equal(state().orders[0].status, "cancelled");
});

test("cancelling an accepted order's shipment releases its reservation and closes the order", () => {
  const [, supplier, requester] = state().hospitals;
  login(requester);
  state().placeBloodOrder(orderDraft(requester, supplier));
  const orderId = state().orders[0].id;
  login(supplier);
  const before = availableInventoryUnits(state(), supplier.id, "O-");
  state().acceptBloodOrder(orderId);
  const accepted = state().orders.find((item) => item.id === orderId);
  assert.equal(availableInventoryUnits(state(), supplier.id, "O-"), before - accepted.quantity);
  state().markShipmentStatus(accepted.shipmentId, "cancelled");
  assert.equal(availableInventoryUnits(state(), supplier.id, "O-"), before);
  assert.equal(state().orders.find((item) => item.id === orderId).status, "cancelled");
});

test("order validation and ministry permissions cannot be bypassed through store actions", () => {
  const [national, supplier, requester] = state().hospitals;
  login(requester);
  for (const overrides of [{ quantity: 0 }, { quantity: -1 }, { quantity: 0.1 }, { quantity: NaN }, { quantity: Infinity }, { quantity: 9999 }, { bloodType: "X" }, { priority: "X" }, { supplierHospitalId: requester.id }, { supplierHospitalId: "missing" }, { requesterHospitalId: national.id }]) {
    assert.equal(state().placeBloodOrder(orderDraft(requester, supplier, overrides)), false);
  }
  state().placeBloodOrder(orderDraft(requester, supplier));
  const orderId = state().orders[0].id;
  state().setSession({ mode: "control_tower", hospitalId: null });
  const before = data();
  assert.equal(state().placeBloodOrder(orderDraft(requester, supplier)), false);
  assert.equal(state().acceptBloodOrder(orderId), false);
  assert.equal(state().rejectBloodOrder(orderId), false);
  assert.equal(state().cancelBloodOrder(orderId), false);
  assert.equal(data(), before);
});

test("saved data gains orders without losing inventory, and accepted orders survive reload", () => {
  const [, supplier, requester] = state().hospitals;
  login(requester);
  state().updateHospitalInventory(requester.id, "O-", 17);
  const legacy = { ...state() };
  delete legacy.orders;
  storage.set(STORAGE_KEY, JSON.stringify(legacy));
  store.setState({ initialized: false });
  state().initialize();
  assert.deepEqual(state().orders, []);
  assert.equal(stock(requester.id, "O-"), 17);
  assert.deepEqual(state().session, sessionForFacility(requester));
  state().placeBloodOrder(orderDraft(requester, supplier));
  const id = state().orders[0].id;
  login(supplier);
  state().acceptBloodOrder(id);
  const accepted = state().orders[0];
  store.setState({ initialized: false });
  state().initialize();
  assert.deepEqual(state().orders[0], accepted);
  assert.equal(shipment(accepted.shipmentId).orderId, id);
});

test("tab synchronization refreshes orders without switching the local account or rewriting shared storage", () => {
  const [, supplier, requester] = state().hospitals;
  login(requester);
  state().placeBloodOrder(orderDraft(requester, supplier));
  const id = state().orders[0].id;
  const shared = storage.get(STORAGE_KEY);
  login(supplier);
  store.setState({ orders: [] });
  storage.set(STORAGE_KEY, shared);
  state().syncFromStorage();
  assert.equal(state().orders[0].id, id);
  assert.deepEqual(state().session, sessionForFacility(supplier));
  assert.equal(storage.get(STORAGE_KEY), shared);
  assert.equal(state().acceptBloodOrder(id), true);
});
