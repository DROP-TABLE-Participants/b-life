import type { PriorityLevel, RecommendationStatus, RiskLevel, ShipmentStatus } from "@/types/domain";

export const NATIONAL_CENTER_NAME = "Национален център по трансфузионна хематология";
export const MINISTRY_NAME = "Министерство на здравеопазването";

export const describeTransfer = (fromName: string, toName: string): string =>
  `${toName} се нуждае от попълване на запасите за следващите 72 часа. ${fromName} може да предостави кръв, като запази необходимия резерв.`;

export const RISK_LABELS: Record<RiskLevel, string> = {
  safe: "Нисък риск", elevated: "Повишен риск", high: "Висок риск", critical: "Критичен риск",
};
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: "Нисък", medium: "Среден", high: "Висок", critical: "Критичен",
};
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  planned: "Планирана", approved: "Одобрена", in_transit: "В движение",
  delayed: "Забавена", delivered: "Получена", cancelled: "Отменена",
};
export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  pending_approval: "Очаква одобрение", approved: "Одобрена", dispatched: "Изпратена",
  fulfilled: "Изпълнена", cancelled: "Отменена",
};

export const MAP_LOCALE = {
  "LogoControl.Title": "Начална страница на Mapbox",
  "Map.Title": "Карта",
  "NavigationControl.ZoomIn": "Приближаване",
  "NavigationControl.ZoomOut": "Отдалечаване",
  "NavigationControl.ResetBearing": "Ориентиране на север",
  "NavigationControl.Pitch": "Наклон на картата",
  "AttributionControl.ToggleAttribution": "Източници на картата",
  "AttributionControl.MapFeedback": "Обратна връзка за картата",
  "FullscreenControl.Enter": "На цял екран",
  "FullscreenControl.Exit": "Изход от цял екран",
};
