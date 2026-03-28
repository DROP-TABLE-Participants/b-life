"use client";

import { create } from "zustand";
import { SIMULATION_BOUNDS } from "@/lib/constants";
import { runForecastingEngine, attachForecastRisksToHospitals, computeSystemKpis } from "@/lib/forecasting";
import { runRedistributionEngine } from "@/lib/redistribution";
import { getAppState, resetAppState, saveAppState } from "@/lib/storage";
import { createSeedAppState } from "@/lib/seed";
import { lerpCoordinates } from "@/lib/utils";
import type {
  AppState,
  ManualShipmentDraft,
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
  scheduleManualShipment: (draft: ManualShipmentDraft) => void;
  approveRecommendation: (recommendationId: string) => void;
  dispatchRecommendation: (recommendationId: string) => void;
  dispatchShipment: (shipmentId: string) => void;
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

const defaultState = synthesizeState(createSeedAppState());

const generateShipmentId = (): string => {
  const entropy = Math.random().toString(36).slice(2, 8);
  return `ship-manual-${Date.now()}-${entropy}`;
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...defaultState,
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    const existing = getAppState();
    const seeded = existing ?? createSeedAppState();
    if (!existing) {
      saveAppState(seeded);
    }
    const hydrated = synthesizeState(seeded);
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

  scheduleManualShipment: (draft) => {
    set((state) => {
      if (draft.fromHospitalId === draft.toHospitalId) return state;

      const from = state.hospitals.find((hospital) => hospital.id === draft.fromHospitalId);
      const to = state.hospitals.find((hospital) => hospital.id === draft.toHospitalId);
      if (!from || !to) return state;

      const quantity = Math.max(1, Math.round(draft.quantity));
      const etaMinutes = Math.max(5, Math.round(draft.etaMinutes));
      const shouldDeductNow = draft.status === "in_transit" || draft.status === "delayed";

      const hospitals = shouldDeductNow
        ? state.hospitals.map((hospital) => {
            if (hospital.id !== draft.fromHospitalId) return hospital;
            const currentUnits = hospital.inventoryByBloodType[draft.bloodType] ?? 0;

            return {
              ...hospital,
              inventoryByBloodType: {
                ...hospital.inventoryByBloodType,
                [draft.bloodType]: Math.max(0, currentUnits - quantity),
              },
              lastUpdated: new Date().toISOString(),
            };
          })
        : state.hospitals;

      const newShipment: Shipment = {
        id: generateShipmentId(),
        fromHospitalId: draft.fromHospitalId,
        toHospitalId: draft.toHospitalId,
        bloodType: draft.bloodType,
        quantity,
        status: draft.status,
        priority: draft.priority,
        etaMinutes,
        progress: shouldDeductNow ? 0.04 : 0,
        currentCoordinates: from.coordinates,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return applyAndPersist(state, { hospitals, shipments: [newShipment, ...state.shipments] });
    });
  },

  approveRecommendation: (recommendationId) => {
    set((state) => {
      const recommendation = state.recommendations.find((item) => item.id === recommendationId);
      if (!recommendation) return state;

      const canApprove =
        state.session.mode === "control_tower" ||
        (state.session.mode === "hospital" && state.session.hospitalId === recommendation.fromHospitalId);

      if (!canApprove) return state;

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

      const canDispatch =
        state.session.mode === "control_tower" ||
        (state.session.mode === "hospital" && state.session.hospitalId === recommendation.fromHospitalId);

      if (!canDispatch) return state;

      const recommendations: TransferRecommendation[] = state.recommendations.map((item) =>
        item.id === recommendationId ? { ...item, status: "dispatched" } : item,
      );

      const from = state.hospitals.find((hospital) => hospital.id === recommendation.fromHospitalId);
      if (!from) return applyAndPersist(state, { recommendations });
      const to = state.hospitals.find((hospital) => hospital.id === recommendation.toHospitalId);
      if (!to) return applyAndPersist(state, { recommendations });

      const hospitals = state.hospitals.map((hospital) => {
        if (hospital.id !== recommendation.fromHospitalId) return hospital;
        const currentUnits = hospital.inventoryByBloodType[recommendation.bloodType] ?? 0;
        return {
          ...hospital,
          inventoryByBloodType: {
            ...hospital.inventoryByBloodType,
            [recommendation.bloodType]: Math.max(0, currentUnits - recommendation.suggestedQuantity),
          },
          lastUpdated: new Date().toISOString(),
        };
      });

      const newShipment: Shipment = {
        id: generateShipmentId(),
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

      return applyAndPersist(state, { hospitals, shipments: [newShipment, ...state.shipments], recommendations });
    });
  },

  dispatchShipment: (shipmentId) => {
    set((state) => {
      const shipment = state.shipments.find((item) => item.id === shipmentId);
      if (!shipment) return state;

      const canDispatch =
        state.session.mode === "control_tower" ||
        (state.session.mode === "hospital" && state.session.hospitalId === shipment.fromHospitalId);

      if (!canDispatch) return state;
      if (shipment.status === "in_transit" || shipment.status === "delivered" || shipment.status === "cancelled") {
        return state;
      }

      const shouldDeductNow = shipment.status === "planned" || shipment.status === "approved";

      const hospitals = shouldDeductNow
        ? state.hospitals.map((hospital) => {
            if (hospital.id !== shipment.fromHospitalId) return hospital;
            const currentUnits = hospital.inventoryByBloodType[shipment.bloodType] ?? 0;

            return {
              ...hospital,
              inventoryByBloodType: {
                ...hospital.inventoryByBloodType,
                [shipment.bloodType]: Math.max(0, currentUnits - shipment.quantity),
              },
              lastUpdated: new Date().toISOString(),
            };
          })
        : state.hospitals;

      const shipments = state.shipments.map((item) =>
        item.id === shipmentId
          ? {
              ...item,
              status: "in_transit" as ShipmentStatus,
              progress: Math.max(0.04, item.progress),
              updatedAt: new Date().toISOString(),
            }
          : item,
      );

      return applyAndPersist(state, { hospitals, shipments });
    });
  },

  markShipmentStatus: (shipmentId, status) => {
    set((state) => {
      const previousShipment = state.shipments.find((shipment) => shipment.id === shipmentId);
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

      let hospitals = state.hospitals;
      const updatedShipment = shipments.find((shipment) => shipment.id === shipmentId);
      const shouldCreditRecipient =
        status === "delivered" &&
        previousShipment?.status !== "delivered" &&
        updatedShipment;

      if (shouldCreditRecipient && updatedShipment) {
        hospitals = state.hospitals.map((hospital) => {
          if (hospital.id !== updatedShipment.toHospitalId) return hospital;
          const currentUnits = hospital.inventoryByBloodType[updatedShipment.bloodType] ?? 0;

          return {
            ...hospital,
            inventoryByBloodType: {
              ...hospital.inventoryByBloodType,
              [updatedShipment.bloodType]: currentUnits + updatedShipment.quantity,
            },
            lastUpdated: new Date().toISOString(),
          };
        });
      }

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

      return applyAndPersist(state, { hospitals, shipments, recommendations });
    });
  },

  markShipmentReceived: (shipmentId) => {
    get().markShipmentStatus(shipmentId, "delivered");
  },

  tickShipments: () => {
    set((state) => {
      let hasChange = false;
      const newlyDeliveredIds: string[] = [];

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
        const willBeDelivered = progress >= 1;

        if (willBeDelivered) {
          newlyDeliveredIds.push(shipment.id);
        }

        hasChange = true;

        return {
          ...shipment,
          progress,
          currentCoordinates,
          etaMinutes,
          status: willBeDelivered ? "delivered" : shipment.status,
          updatedAt: new Date().toISOString(),
        } satisfies Shipment;
      });

      if (!hasChange) return state;

      const deliveredSet = new Set(newlyDeliveredIds);
      const hospitals = state.hospitals.map((hospital) => {
        const deliveries = shipments.filter(
          (shipment) =>
            deliveredSet.has(shipment.id) &&
            shipment.status === "delivered" &&
            shipment.toHospitalId === hospital.id,
        );
        if (deliveries.length === 0) return hospital;

        const nextInventory = { ...hospital.inventoryByBloodType };
        deliveries.forEach((delivery) => {
          nextInventory[delivery.bloodType] = (nextInventory[delivery.bloodType] ?? 0) + delivery.quantity;
        });

        return {
          ...hospital,
          inventoryByBloodType: nextInventory,
          lastUpdated: new Date().toISOString(),
        };
      });

      const recommendations = state.recommendations.map((recommendation) => {
        const matchingDelivery = shipments.find(
          (shipment) =>
            deliveredSet.has(shipment.id) &&
            shipment.fromHospitalId === recommendation.fromHospitalId &&
            shipment.toHospitalId === recommendation.toHospitalId &&
            shipment.bloodType === recommendation.bloodType,
        );

        if (!matchingDelivery) return recommendation;
        return { ...recommendation, status: "fulfilled" as RecommendationStatus };
      });

      return applyAndPersist(state, { hospitals, shipments, recommendations });
    });
  },

  resetDemoData: () => {
    const reset = synthesizeState(resetAppState());
    set({ ...reset, initialized: true });
  },
}));
