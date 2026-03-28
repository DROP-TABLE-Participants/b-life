"use client";

import { create } from "zustand";
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
  approveRecommendation: (recommendationId: string) => void;
  dispatchRecommendation: (recommendationId: string) => void;
  markShipmentStatus: (shipmentId: string, status: ShipmentStatus) => void;
  markShipmentReceived: (shipmentId: string) => void;
  tickShipments: () => void;
  resetDemoData: () => void;
}

const synthesizeState = (base: AppState): AppState => {
  const forecasts = runForecastingEngine(base.hospitals, base.shipments);
  const hospitals = attachForecastRisksToHospitals(base.hospitals, forecasts);
  const recommendations = runRedistributionEngine(hospitals, forecasts).map((recommendation) => {
    const existing = base.recommendations.find((item) => item.id === recommendation.id);
    return existing ? { ...recommendation, status: existing.status } : recommendation;
  });

  const nextState: AppState = {
    ...base,
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

        const speed = shipment.status === "delayed" ? 0.004 : 0.008;
        const progress = Math.min(1, shipment.progress + speed);
        const currentCoordinates = lerpCoordinates(from.coordinates, to.coordinates, progress);
        const etaMinutes = Math.max(0, shipment.etaMinutes - (shipment.status === "delayed" ? 0.4 : 1.2));

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
