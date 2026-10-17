export const WORKSPACE_SECTIONS = ["overview", "forecast", "transfers", "recommendations", "map"] as const;
export type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];
export const ADMIN_SECTIONS = ["overview", "inventory", "forecast", "transfers", "recommendations", "map"] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const SECTION_LABELS: Record<AdminSection, string> = {
  overview: "Общ преглед", inventory: "Наличности", forecast: "Прогнози", transfers: "Трансфери",
  recommendations: "Препоръки", map: "Карта",
};

export const workspaceHref = (base: string, section: AdminSection): string =>
  section === "overview" ? base : `${base}/${section}`;

// Facilities have no separate inventory page: their overview shows it.
export const facilitySection = (section: AdminSection): WorkspaceSection =>
  (WORKSPACE_SECTIONS as readonly string[]).includes(section) ? section as WorkspaceSection : "overview";

export const workspaceNavigation = (base: string) =>
  (base === "/control-tower" ? ADMIN_SECTIONS : WORKSPACE_SECTIONS)
    .map((section) => ({ label: SECTION_LABELS[section], href: workspaceHref(base, section), icon: section }));
