"use client";

import { create } from "zustand";
import { SIMULATION_BOUNDS } from "@/lib/constants";
import { runForecastingEngine, attachForecastRisksToHospitals, computeSystemKpis } from "@/lib/forecasting";
import { runRedistributionEngine } from "@/lib/redistribution";
import { getAppState, resetAppState, saveAppState, seedAppStateIfEmpty } from "@/lib/storage";
import { lerpCoordinates } from "@/lib/utils";
import type {
  AppState,
  RecommendationStatus,
  SessionState,
  Shipment,
  ShipmentStatus,
  TransferRecommendation,
} from "@/types/domain";

interface AppStore extends AppState {
  initialized: boolean;
  initialize: () => void;
  setSession: (session: SessionState) => void;
  setSimulationDate: (isoDate: string) => void;
  setSimulationDemandMultiplier: (multiplier: number) => void;
  setSimulationShipmentSpeed: (speed: number) => void;
  updateHospitalInventory: (hospitalId: string, bloodType: Shipment["bloodType"], units: number) => void;
  approveRecommendation: (recommendationId: string) => void;
  dispatchRecommendation: (recommendationId: string) => void;
  markShipmentStatus: (shipmentId: string, status: ShipmentStatus) => void;
  markShipmentReceived: (shipmentId: string) => void;
  tickShipments: () => void;
  resetDemoData: () => void;
}

const synthesizeState = (base: AppState): AppState => {
  const simulation = base.simulation ?? {
    currentDate: new Date().toISOString(),
    demandMultiplier: 1,
    shipmentSpeed: 1,
  };
  const forecasts = runForecastingEngine(base.hospitals, base.shipments, simulation);
  const hospitals = attachForecastRisksToHospitals(base.hospitals, forecasts);
  const recommendations = runRedistributionEngine(hospitals, forecasts).map((recommendation) => {
    const existing = base.recommendations.find((item) => item.id === recommendation.id);
    return existing ? { ...recommendation, status: existing.status } : recommendation;
  });

  const nextState: AppState = {
    ...base,
    simulation,
    hospitals,
    forecasts,
    recommendations,
  };

  return {
    ...nextState,
    kpis: computeSystemKpis(nextState),
    lastUpdated: new Date().toISOString(),
  };
};

const applyAndPersist = (state: AppStore, partial: Partial<AppState>): Partial<AppStore> => {
  const merged = synthesizeState({
    version: state.version,
    seededAt: state.seededAt,
    lastUpdated: state.lastUpdated,
    hospitals: partial.hospitals ?? state.hospitals,
    shipments: partial.shipments ?? state.shipments,
    forecasts: partial.forecasts ?? state.forecasts,
    recommendations: partial.recommendations ?? state.recommendations,
    kpis: partial.kpis ?? state.kpis,
    session: partial.session ?? state.session,
    simulation: partial.simulation ?? state.simulation ?? defaultState.simulation,
  });

  saveAppState(merged);
  return { ...merged };
};

const defaultState = synthesizeState(seedAppStateIfEmpty());

export const useAppStore = create<AppStore>((set, get) => ({
  ...defaultState,
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    const existing = getAppState() ?? seedAppStateIfEmpty();
    const hydrated = synthesizeState(existing);
    set({ ...hydrated, initialized: true });
  },

  setSession: (session) => {
    set((state) => applyAndPersist(state, { session }));
  },

  setSimulationDate: (isoDate) => {
    set((state) => applyAndPersist(state, { simulation: { ...state.simulation, currentDate: isoDate } }));
  },

  setSimulationDemandMultiplier: (multiplier) => {
    set((state) =>
      applyAndPersist(state, {
        simulation: {
          ...state.simulation,
          demandMultiplier: Math.min(
            SIMULATION_BOUNDS.demandMultiplier.max,
            Math.max(SIMULATION_BOUNDS.demandMultiplier.min, multiplier),
          ),
        },
      }),
    );
  },

  setSimulationShipmentSpeed: (speed) => {
    set((state) =>
      applyAndPersist(state, {
        simulation: {
          ...state.simulation,
          shipmentSpeed: Math.min(
            SIMULATION_BOUNDS.shipmentSpeed.max,
            Math.max(SIMULATION_BOUNDS.shipmentSpeed.min, speed),
          ),
        },
      }),
    );
  },

  updateHospitalInventory: (hospitalId, bloodType, units) => {
    set((state) => {
      const hospitals = state.hospitals.map((hospital) =>
        hospital.id === hospitalId
          ? {
              ...hospital,
              inventoryByBloodType: {
                ...hospital.inventoryByBloodType,
                [bloodType]: Math.max(0, Math.round(units)),
              },
              lastUpdated: new Date().toISOString(),
            }
          : hospital,
      );
      return applyAndPersist(state, { hospitals });
    });
  },

  approveRecommendation: (recommendationId) => {
    set((state) => {
      const recommendations = state.recommendations.map((recommendation) =>
        recommendation.id === recommendationId
          ? { ...recommendation, status: "approved" as RecommendationStatus }
          : recommendation,
      );
      return applyAndPersist(state, { recommendations });
    });
  },

  dispatchRecommendation: (recommendationId) => {
    set((state) => {
      const recommendation = state.recommendations.find((item) => item.id === recommendationId);
      if (!recommendation) return state;

      const recommendations: TransferRecommendation[] = state.recommendations.map((item) =>
        item.id === recommendationId ? { ...item, status: "dispatched" } : item,
      );

      const from = state.hospitals.find((hospital) => hospital.id === recommendation.fromHospitalId);
      if (!from) return applyAndPersist(state, { recommendations });
      const to = state.hospitals.find((hospital) => hospital.id === recommendation.toHospitalId);
      if (!to) return applyAndPersist(state, { recommendations });

      const newShipment: Shipment = {
        id: `ship-${Date.now()}`,
        fromHospitalId: recommendation.fromHospitalId,
        toHospitalId: recommendation.toHospitalId,
        bloodType: recommendation.bloodType,
        quantity: recommendation.suggestedQuantity,
        status: "in_transit",
        priority: recommendation.urgency,
        etaMinutes: recommendation.etaMinutes,
        progress: 0,
        currentCoordinates: from.coordinates,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return applyAndPersist(state, { shipments: [newShipment, ...state.shipments], recommendations });
    });
  },

  markShipmentStatus: (shipmentId, status) => {
    set((state) => {
      const shipments = state.shipments.map((shipment) =>
        shipment.id === shipmentId
          ? {
              ...shipment,
              status,
              progress: status === "delivered" ? 1 : shipment.progress,
              etaMinutes: status === "delivered" ? 0 : shipment.etaMinutes,
              updatedAt: new Date().toISOString(),
            }
          : shipment,
      );

      const recommendations = state.recommendations.map((recommendation) => {
        const matchingShipment = shipments.find(
          (shipment) =>
            shipment.fromHospitalId === recommendation.fromHospitalId &&
            shipment.toHospitalId === recommendation.toHospitalId &&
            shipment.bloodType === recommendation.bloodType,
        );

        if (!matchingShipment || matchingShipment.id !== shipmentId) return recommendation;
        return {
          ...recommendation,
          status: status === "delivered" ? "fulfilled" : recommendation.status,
        };
      });

      return applyAndPersist(state, { shipments, recommendations });
    });
  },

  markShipmentReceived: (shipmentId) => {
    get().markShipmentStatus(shipmentId, "delivered");
  },

  tickShipments: () => {
    set((state) => {
      let hasChange = false;

      const shipments = state.shipments.map((shipment) => {
        if (!["in_transit", "delayed"].includes(shipment.status)) return shipment;

        const from = state.hospitals.find((hospital) => hospital.id === shipment.fromHospitalId);
        const to = state.hospitals.find((hospital) => hospital.id === shipment.toHospitalId);
        if (!from || !to) return shipment;

        const speedScale = state.simulation.shipmentSpeed;
        const speed = (shipment.status === "delayed" ? 0.004 : 0.008) * speedScale;
        const progress = Math.min(1, shipment.progress + speed);
        const currentCoordinates = lerpCoordinates(from.coordinates, to.coordinates, progress);
        const etaMinutes = Math.max(0, shipment.etaMinutes - (shipment.status === "delayed" ? 0.4 : 1.2) * speedScale);

        hasChange = true;

        return {
          ...shipment,
          progress,
          currentCoordinates,
          etaMinutes,
          status: progress >= 1 ? "delivered" : shipment.status,
          updatedAt: new Date().toISOString(),
        } satisfies Shipment;
      });

      if (!hasChange) return state;
      return applyAndPersist(state, { shipments });
    });
  },

  resetDemoData: () => {
    const reset = synthesizeState(resetAppState());
    set({ ...reset, initialized: true });
  },
}));
