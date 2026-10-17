export const WORKSPACE_SECTIONS = ["inventory", "forecast", "orders", "shipments", "recommendations", "map"] as const;
export type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];
export type AdminSection = WorkspaceSection | "overview";

export const SECTION_LABELS: Record<AdminSection, string> = {
  overview: "Общ преглед", inventory: "Наличности", forecast: "Прогнози", orders: "Заявки",
  shipments: "Пратки", recommendations: "Препоръки", map: "Карта",
};

export const workspaceHref = (base: string, section: AdminSection): string =>
  section === "overview" || (section === "inventory" && base !== "/control-tower") ? base : `${base}/${section}`;

export const workspaceNavigation = (base: string) =>
  (base === "/control-tower" ? ["overview" as const, ...WORKSPACE_SECTIONS] : WORKSPACE_SECTIONS)
    .map((section) => ({ label: SECTION_LABELS[section], href: workspaceHref(base, section), icon: section }));
