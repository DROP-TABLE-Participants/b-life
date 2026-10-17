import type { BloodOrder, Hospital, SessionState, Shipment, TransferRecommendation } from "@/types/domain";
import { canManageRecommendation } from "@/lib/access";

const isActive = (shipment: Shipment) => shipment.status !== "delivered" && shipment.status !== "cancelled";

export interface TransferQueue {
  incomingRequests: BloodOrder[];
  recommendationsToApprove: TransferRecommendation[];
  recommendationsToDispatch: TransferRecommendation[];
  toDispatch: Shipment[];
  toReceive: Shipment[];
  recommendationsForMe: TransferRecommendation[];
  myRequests: BloodOrder[];
  awaitingSupplier: Shipment[];
  inTransit: Shipment[];
  history: Shipment[];
  closedOrders: BloodOrder[];
  actionCount: number;
  progressCount: number;
}

/** Everything that moves blood for one facility, grouped by who has to act next. */
export const transferQueue = (
  facilityId: string, session: SessionState, shipments: Shipment[], orders: BloodOrder[], recommendations: TransferRecommendation[],
): TransferQueue => {
  const mine = shipments.filter((item) => item.fromHospitalId === facilityId || item.toHospitalId === facilityId);
  const incomingRequests = orders.filter((item) => item.supplierHospitalId === facilityId && item.status === "pending");
  const recommendationsToApprove = recommendations.filter((item) => item.status === "pending_approval" && canManageRecommendation(session, item));
  const recommendationsToDispatch = recommendations.filter((item) => item.status === "approved" && canManageRecommendation(session, item));
  const toDispatch = mine.filter((item) => item.fromHospitalId === facilityId && (item.status === "planned" || item.status === "approved"));
  const toReceive = mine.filter((item) => item.toHospitalId === facilityId && (item.status === "in_transit" || item.status === "delayed"));
  const recommendationsForMe = recommendations.filter((item) => item.toHospitalId === facilityId && item.status === "pending_approval");
  const myRequests = orders.filter((item) => item.requesterHospitalId === facilityId && item.status === "pending");
  const awaitingSupplier = mine.filter((item) => item.toHospitalId === facilityId && (item.status === "planned" || item.status === "approved"));
  const inTransit = mine.filter((item) => item.status === "in_transit" || item.status === "delayed");
  const history = mine.filter((item) => !isActive(item));
  const closedOrders = orders.filter((item) => (item.requesterHospitalId === facilityId || item.supplierHospitalId === facilityId) &&
    (item.status === "rejected" || item.status === "cancelled" || item.status === "fulfilled"));
  return {
    incomingRequests, recommendationsToApprove, recommendationsToDispatch, toDispatch, toReceive, recommendationsForMe,
    myRequests, awaitingSupplier, inTransit, history, closedOrders,
    actionCount: incomingRequests.length + recommendationsToApprove.length + recommendationsToDispatch.length + toDispatch.length + toReceive.length,
    progressCount: myRequests.length + awaitingSupplier.length + recommendationsForMe.length,
  };
};

/** Network-wide view for the read-only Ministry account. */
export const networkTransfers = (shipments: Shipment[], orders: BloodOrder[], recommendations: TransferRecommendation[]) => ({
  pendingOrders: orders.filter((item) => item.status === "pending"),
  pendingRecommendations: recommendations.filter((item) => item.status === "pending_approval" || item.status === "approved"),
  active: shipments.filter(isActive),
  history: shipments.filter((item) => !isActive(item)),
});

export const facilityShortName = (facility?: Hospital): string => {
  if (!facility) return "Непознат обект";
  return facility.kind === "national_center" ? "Национален център" : facility.city;
};
