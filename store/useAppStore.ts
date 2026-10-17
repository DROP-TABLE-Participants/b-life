"use client";

import { create } from "zustand";
import { BLOOD_TYPE_LIST, SIMULATION_BOUNDS } from "@/lib/constants";
import { canManageRecommendation, canOperateFacility } from "@/lib/access";
import { runForecastingEngine, attachForecastRisksToHospitals, computeSystemKpis } from "@/lib/forecasting";
import { runRedistributionEngine } from "@/lib/redistribution";
import { getAppState, resetAppState, saveAppState } from "@/lib/storage";
import { createSeedAppState, seededHospitals } from "@/lib/seed";
import { describeTransfer } from "@/lib/labels";
import { lerpCoordinates } from "@/lib/utils";
import type { AppState, ManualShipmentDraft, SessionState, Shipment, ShipmentStatus } from "@/types/domain";

interface AppStore extends AppState {
  initialized: boolean;
  initialize: () => void;
  setSession: (session: SessionState) => void;
  setSimulationDate: (isoDate: string) => void;
  setSimulationDemandMultiplier: (multiplier: number) => void;
  setSimulationShipmentSpeed: (speed: number) => void;
  updateHospitalInventory: (hospitalId: string, bloodType: Shipment["bloodType"], units: number) => void;
  scheduleManualShipment: (draft: ManualShipmentDraft) => boolean;
  approveRecommendation: (recommendationId: string) => void;
  dispatchRecommendation: (recommendationId: string) => void;
  dispatchShipment: (shipmentId: string) => void;
  markShipmentStatus: (shipmentId: string, status: ShipmentStatus) => void;
  markShipmentReceived: (shipmentId: string) => void;
  tickShipments: () => void;
  resetDemoData: () => void;
}

const isActive = (shipment: Shipment) => shipment.status !== "delivered" && shipment.status !== "cancelled";
const isReserved = (shipment: Shipment) => shipment.status === "planned" || shipment.status === "approved";
const facilityProfiles = new Map(seededHospitals().map((facility) => [facility.id, facility]));

const synthesizeState = (base: AppState): AppState => {
  const localizedFacilities = base.hospitals.map((facility) => {
    const profile = facilityProfiles.get(facility.id);
    return profile ? { ...facility, name: profile.name, alerts: profile.alerts } : facility;
  });
  const forecasts = runForecastingEngine(localizedFacilities, base.shipments, base.simulation);
  const hospitals = attachForecastRisksToHospitals(localizedFacilities, forecasts).map((hospital) => ({
    ...hospital,
    incomingShipments: base.shipments.filter((item) => isActive(item) && item.toHospitalId === hospital.id).map((item) => item.id),
    outgoingShipments: base.shipments.filter((item) => isActive(item) && item.fromHospitalId === hospital.id).map((item) => item.id),
  }));
  // Keep approved quantities fixed and retain the lifecycle after a transfer stops
  // appearing in the recalculated suggestions.
  const retained = base.recommendations.filter((item) => item.status !== "pending_approval");
  const retainedIds = new Set(retained.map((item) => item.id));
  const generated = runRedistributionEngine(hospitals, forecasts, base.shipments);
  const recommendations = [...retained, ...generated.filter((item) => !retainedIds.has(item.id))].map((item) => ({
    ...item,
    reason: describeTransfer(hospitals.find((facility) => facility.id === item.fromHospitalId)?.name ?? "Изпращачът",
      hospitals.find((facility) => facility.id === item.toHospitalId)?.name ?? "Получателят"),
  }));
  const nextState = { ...base, hospitals, forecasts, recommendations };
  return { ...nextState, kpis: computeSystemKpis(nextState), lastUpdated: new Date().toISOString() };
};

const applyAndPersist = (state: AppStore, partial: Partial<AppState>): Partial<AppStore> => {
  const merged = synthesizeState({
    version: state.version, seededAt: state.seededAt, lastUpdated: state.lastUpdated,
    hospitals: partial.hospitals ?? state.hospitals, shipments: partial.shipments ?? state.shipments,
    forecasts: partial.forecasts ?? state.forecasts, recommendations: partial.recommendations ?? state.recommendations,
    kpis: partial.kpis ?? state.kpis, session: partial.session ?? state.session, simulation: partial.simulation ?? state.simulation,
  });
  saveAppState(merged);
  return merged;
};

const defaultState = synthesizeState(createSeedAppState());
const generateShipmentId = () => `ship-manual-${crypto.randomUUID()}`;

const availableUnits = (state: AppState, facilityId: string, bloodType: Shipment["bloodType"], excludingId?: string): number => {
  const onHand = state.hospitals.find((item) => item.id === facilityId)?.inventoryByBloodType[bloodType] ?? 0;
  const reserved = state.shipments.filter((item) => item.id !== excludingId && item.fromHospitalId === facilityId && item.bloodType === bloodType && isReserved(item))
    .reduce((sum, item) => sum + item.quantity, 0);
  return Math.max(0, onHand - reserved);
};

const deductInventory = (state: AppState, shipment: Pick<Shipment, "fromHospitalId" | "bloodType" | "quantity">) =>
  state.hospitals.map((hospital) => hospital.id !== shipment.fromHospitalId ? hospital : {
    ...hospital,
    inventoryByBloodType: { ...hospital.inventoryByBloodType, [shipment.bloodType]: hospital.inventoryByBloodType[shipment.bloodType] - shipment.quantity },
    lastUpdated: new Date().toISOString(),
  });

export const useAppStore = create<AppStore>((set, get) => ({
  ...defaultState,
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    const hydrated = synthesizeState(getAppState() ?? createSeedAppState());
    saveAppState(hydrated);
    set({ ...hydrated, initialized: true });
  },

  setSession: (session) => {
    const facility = get().hospitals.find((item) => item.id === session.hospitalId);
    const valid = (session.mode === null && session.hospitalId === null) ||
      (session.mode === "control_tower" && session.hospitalId === null) ||
      (facility && facility.kind === session.mode);
    if (valid) set((state) => applyAndPersist(state, { session }));
  },

  setSimulationDate: (isoDate) => {
    if (!Number.isFinite(Date.parse(isoDate))) return;
    set((state) => applyAndPersist(state, { simulation: { ...state.simulation, currentDate: isoDate } }));
  },
  setSimulationDemandMultiplier: (multiplier) => {
    if (!Number.isFinite(multiplier)) return;
    set((state) => applyAndPersist(state, { simulation: { ...state.simulation, demandMultiplier:
      Math.min(SIMULATION_BOUNDS.demandMultiplier.max, Math.max(SIMULATION_BOUNDS.demandMultiplier.min, multiplier)) } }));
  },
  setSimulationShipmentSpeed: (speed) => {
    if (!Number.isFinite(speed)) return;
    set((state) => applyAndPersist(state, { simulation: { ...state.simulation, shipmentSpeed:
      Math.min(SIMULATION_BOUNDS.shipmentSpeed.max, Math.max(SIMULATION_BOUNDS.shipmentSpeed.min, speed)) } }));
  },

  updateHospitalInventory: (hospitalId, bloodType, units) => {
    set((state) => {
      if (!canOperateFacility(state.session, hospitalId) || !Number.isFinite(units) || units < 0 || !BLOOD_TYPE_LIST.includes(bloodType)) return state;
      const reserved = state.shipments.filter((item) => item.fromHospitalId === hospitalId && item.bloodType === bloodType && isReserved(item))
        .reduce((sum, item) => sum + item.quantity, 0);
      if (Math.round(units) < reserved) return state;
      const hospitals = state.hospitals.map((hospital) => hospital.id !== hospitalId ? hospital : {
        ...hospital, inventoryByBloodType: { ...hospital.inventoryByBloodType, [bloodType]: Math.round(units) }, lastUpdated: new Date().toISOString(),
      });
      return applyAndPersist(state, { hospitals });
    });
  },

  scheduleManualShipment: (draft) => {
    let created = false;
    set((state) => {
      const from = state.hospitals.find((item) => item.id === draft.fromHospitalId);
      const to = state.hospitals.find((item) => item.id === draft.toHospitalId);
      if (!from || !to || from.id === to.id || !canOperateFacility(state.session, from.id) ||
        !Number.isInteger(draft.quantity) || draft.quantity <= 0 || !Number.isFinite(draft.etaMinutes) || draft.etaMinutes < 5 ||
        !BLOOD_TYPE_LIST.includes(draft.bloodType) || !["low", "medium", "high", "critical"].includes(draft.priority) ||
        !["planned", "approved", "in_transit", "delayed"].includes(draft.status) ||
        draft.quantity > availableUnits(state, from.id, draft.bloodType)) return state;
      const inTransit = draft.status === "in_transit" || draft.status === "delayed";
      const shipment: Shipment = {
        ...draft, id: generateShipmentId(), etaMinutes: Math.round(draft.etaMinutes), progress: 0,
        currentCoordinates: from.coordinates, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      created = true;
      return applyAndPersist(state, { hospitals: inTransit ? deductInventory(state, shipment) : state.hospitals, shipments: [shipment, ...state.shipments] });
    });
    return created;
  },

  approveRecommendation: (recommendationId) => {
    set((state) => {
      const recommendation = state.recommendations.find((item) => item.id === recommendationId);
      if (!recommendation || recommendation.status !== "pending_approval" || !canManageRecommendation(state.session, recommendation)) return state;
      return applyAndPersist(state, { recommendations: state.recommendations.map((item) => item.id === recommendationId ? { ...item, status: "approved" } : item) });
    });
  },

  dispatchRecommendation: (recommendationId) => {
    set((state) => {
      const recommendation = state.recommendations.find((item) => item.id === recommendationId);
      if (!recommendation || recommendation.status !== "approved" || !canManageRecommendation(state.session, recommendation) ||
        recommendation.suggestedQuantity > availableUnits(state, recommendation.fromHospitalId, recommendation.bloodType) ||
        state.shipments.some((item) => item.recommendationId === recommendationId)) return state;
      const from = state.hospitals.find((item) => item.id === recommendation.fromHospitalId);
      if (!from) return state;
      const shipment: Shipment = {
        id: generateShipmentId(), recommendationId, fromHospitalId: recommendation.fromHospitalId, toHospitalId: recommendation.toHospitalId,
        bloodType: recommendation.bloodType, quantity: recommendation.suggestedQuantity, status: "in_transit", priority: recommendation.urgency,
        etaMinutes: Math.max(5, recommendation.etaMinutes), progress: 0, currentCoordinates: from.coordinates,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      return applyAndPersist(state, {
        hospitals: deductInventory(state, shipment), shipments: [shipment, ...state.shipments],
        recommendations: state.recommendations.map((item) => item.id === recommendationId ? { ...item, status: "dispatched" } : item),
      });
    });
  },

  dispatchShipment: (shipmentId) => {
    set((state) => {
      const shipment = state.shipments.find((item) => item.id === shipmentId);
      if (!shipment || !canOperateFacility(state.session, shipment.fromHospitalId) || !isReserved(shipment) ||
        shipment.quantity > availableUnits(state, shipment.fromHospitalId, shipment.bloodType, shipment.id)) return state;
      return applyAndPersist(state, {
        hospitals: deductInventory(state, shipment),
        shipments: state.shipments.map((item) => item.id === shipmentId ? { ...item, status: "in_transit", updatedAt: new Date().toISOString() } : item),
      });
    });
  },

  markShipmentStatus: (shipmentId, status) => {
    if (status === "in_transit") { get().dispatchShipment(shipmentId); return; }
    set((state) => {
      const shipment = state.shipments.find((item) => item.id === shipmentId);
      if (!shipment) return state;
      if (status === "delivered") {
        if (!canOperateFacility(state.session, shipment.toHospitalId) || !["in_transit", "delayed"].includes(shipment.status)) return state;
        const hospitals = state.hospitals.map((hospital) => hospital.id !== shipment.toHospitalId ? hospital : {
          ...hospital, inventoryByBloodType: { ...hospital.inventoryByBloodType, [shipment.bloodType]: hospital.inventoryByBloodType[shipment.bloodType] + shipment.quantity },
          lastUpdated: new Date().toISOString(),
        });
        const destination = hospitals.find((item) => item.id === shipment.toHospitalId)!;
        return applyAndPersist(state, {
          hospitals,
          shipments: state.shipments.map((item) => item.id === shipmentId ? { ...item, status: "delivered", progress: 1, etaMinutes: 0, currentCoordinates: destination.coordinates, updatedAt: new Date().toISOString() } : item),
          recommendations: state.recommendations.map((item) => item.id === shipment.recommendationId ? { ...item, status: "fulfilled" } : item),
        });
      }
      if (!canOperateFacility(state.session, shipment.fromHospitalId)) return state;
      const valid = (status === "cancelled" && isReserved(shipment)) ||
        (status === "approved" && shipment.status === "planned") ||
        (status === "delayed" && shipment.status === "in_transit");
      if (!valid) return state;
      return applyAndPersist(state, { shipments: state.shipments.map((item) => item.id === shipmentId ? { ...item, status, updatedAt: new Date().toISOString() } : item) });
    });
  },

  markShipmentReceived: (shipmentId) => get().markShipmentStatus(shipmentId, "delivered"),

  tickShipments: () => {
    set((state) => {
      let changed = false;
      const shipments = state.shipments.map((shipment) => {
        if (!["in_transit", "delayed"].includes(shipment.status) || shipment.progress >= 1) return shipment;
        const from = state.hospitals.find((item) => item.id === shipment.fromHospitalId);
        const to = state.hospitals.find((item) => item.id === shipment.toHospitalId);
        if (!from || !to) return shipment;
        const speed = (shipment.status === "delayed" ? 0.004 : 0.008) * state.simulation.shipmentSpeed;
        const progress = Math.min(1, shipment.progress + speed);
        changed = true;
        // Arrival awaits explicit confirmation by the receiving facility.
        return { ...shipment, progress, currentCoordinates: lerpCoordinates(from.coordinates, to.coordinates, progress),
          etaMinutes: progress === 1 ? 0 : Math.max(0, shipment.etaMinutes - 1.2 * state.simulation.shipmentSpeed), updatedAt: new Date().toISOString() };
      });
      return changed ? applyAndPersist(state, { shipments }) : state;
    });
  },

  resetDemoData: () => {
    const reset = synthesizeState({ ...resetAppState(), session: get().session });
    saveAppState(reset);
    set({ ...reset, initialized: true });
  },
}));
