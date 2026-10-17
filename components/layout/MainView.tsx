"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BadgeCheck, Boxes, ChartNoAxesCombined, ChevronsUpDown, House, LogOut, MapPinned, Route, Truck } from "lucide-react";
import type { AdminSection } from "@/lib/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import styles from "./MainView.module.css";
import Image from "next/image";
import logo from "@/public/b.life-logo.png";

interface MainViewNavigationItem {
  label: string;
  href: string;
  icon?: AdminSection;
}

const navigationIcons = { overview: House, inventory: Boxes, forecast: ChartNoAxesCombined, transfers: Truck, recommendations: Route, map: MapPinned };

interface MainViewLogin {
  title: string;
  role: string;
  details: string[];
  switchOptions?: Array<{
    label: string;
    href: string;
    onSelect?: () => void;
  }>;
  logoutHref?: string;
  onLogout?: () => void;
}

interface MainViewProps {
  navigation: MainViewNavigationItem[];
  login: MainViewLogin;
  children: React.ReactNode;
}

function MainViewContent({ navigation, login, children }: MainViewProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useSidebar();
  const scrollPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollPanelRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className={styles.mainViewLayout}>
      <Sidebar collapsible="icon" variant="inset" className={styles.mainViewSidebar}>
        <SidebarHeader>
          <div className={styles.mainViewSidebarHeaderRow}>
            <SidebarMenu className={styles.mainViewSidebarHeaderMenu}>
              <SidebarMenuItem className={styles.mainViewSidebarHeaderMenuItem}>
                <SidebarMenuButton size="lg" render={<Link href={navigation[0]?.href ?? "#"} />}>
                  <div className={styles.mainViewSidebarBrandLogo}>
                    <Image src={logo} alt="Лого на B.Life" width={24} height={24} className="size-5 object-contain" />
                  </div>
                  <div className={`grid flex-1 text-left text-sm leading-tight ${styles.mainViewSidebarBrandText}`}>
                    <span className="truncate font-medium">B.Life</span>
                    <span className="truncate text-xs">{login.role}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarTrigger className={styles.mainViewSidebarTrigger} />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Навигация</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon ? navigationIcons[item.icon] : Activity;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} aria-current={isActive ? "page" : undefined} />}
                        isActive={isActive}
                        tooltip={item.label}
                      >
                          <Icon size={18} />
                          <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={login.title}>
                    <BadgeCheck className="size-4" />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{login.title}</span>
                      <span className="truncate text-xs">{login.role}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side={open ? "top" : "right"}
                  align="start"
                  collisionPadding={12}
                  className={styles.mainViewSidebarDropdownContent}
                >
                  <DropdownMenuLabel>{login.title}</DropdownMenuLabel>
                  {login.details.map((detail) => (
                    <DropdownMenuLabel key={detail} className="pt-0 text-xs font-normal text-muted-foreground">
                      {detail}
                    </DropdownMenuLabel>
                  ))}
                  {(login.switchOptions?.length || login.onLogout || login.logoutHref) && <DropdownMenuSeparator />}
                  {login.switchOptions?.length ? (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Смяна на акаунт</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className={styles.mainViewSidebarDropdownSubContent}>
                        {login.switchOptions.map((option) => (
                          <DropdownMenuItem
                            className={styles.mainViewSidebarDropdownItem}
                            key={option.href}
                            onClick={() => {
                              option.onSelect?.();
                              router.push(option.href);
                            }}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ) : null}
                  {(login.onLogout || login.logoutHref) ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        login.onLogout?.();
                        if (login.logoutHref) {
                          router.push(login.logoutHref);
                        }
                      }}
                    >
                      <LogOut className="size-4" />
                      Изход
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className={styles.mainViewRouterView}>
        <Card ref={scrollPanelRef} className={styles.mainViewRouterCard}>
          <CardContent className={styles.mainViewRouterCardContent}>
            <div className={styles.mainViewMobileTopBar}>
              <SidebarTrigger className={styles.mainViewMobileTrigger} />
              <div className={styles.mainViewMobileTitleWrap}>
                <p className={styles.mainViewMobileTitle}>B.Life</p>
                <p className={styles.mainViewMobileSubtitle}>{login.title}</p>
              </div>
            </div>
            {children}
          </CardContent>
        </Card>
      </SidebarInset>
    </div>
  );
}

export function MainView({ navigation, login, children }: MainViewProps) {
  return (
    <div className={styles.mainView}>
      <SidebarProvider
        defaultOpen
        className={styles.mainViewProvider}
        style={
          {
            "--sidebar-width": "300px",
            "--sidebar-width-icon": "48px",
          } as React.CSSProperties
        }
      >
        <MainViewContent navigation={navigation} login={login}>
          {children}
        </MainViewContent>
      </SidebarProvider>
    </div>
  );
}
