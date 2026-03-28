"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, House } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarLayout,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import styles from "./MainView.module.css";

interface MainViewNavigationItem {
  label: string;
  href: string;
}

interface MainViewLogin {
  title: string;
  role: string;
  details: string[];
}

interface MainViewProps {
  navigation: MainViewNavigationItem[];
  login: MainViewLogin;
  children: React.ReactNode;
}

function MainViewContent({ navigation, login, children }: MainViewProps) {
  const pathname = usePathname();
  const { open } = useSidebar();
  const [expanded, setExpanded] = useState(false);

  return (
      <SidebarLayout className={styles.mainViewLayout}>
        <Sidebar className={styles.mainViewSidebar}>
          <SidebarHeader className="gap-4">
            <div className="flex flex-col gap-1">
              {open && <p className="m-0 text-xs font-semibold uppercase">B.Life</p>}
              {open && <h1 className="m-0 text-2xl font-semibold">Main View</h1>}
            </div>

            <SidebarTrigger className="w-full">
              {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </SidebarTrigger>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              {open && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href}>
                            <House size={18} />
                            {open && <span>{item.label}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  {open && (
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-xs font-semibold uppercase">Current Login</p>
                      <p className="m-0 mt-1 truncate">{login.title}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    className="inline-flex min-h-8 items-center justify-center rounded-md border bg-background px-2"
                    onClick={() => setExpanded((current) => !current)}
                    aria-expanded={expanded}
                  >
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {open && expanded && (
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="m-0 text-sm">{login.role}</p>
                    {login.details.map((detail) => (
                      <p key={detail} className="m-0 text-sm">
                        {detail}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className={styles.mainViewRouterView}>
        <Card className={styles.mainViewRouterCard}>
          <CardContent className={styles.mainViewRouterCardContent}>{children}</CardContent>
        </Card>
      </SidebarInset>
    </SidebarLayout>
  );
}

export function MainView({ navigation, login, children }: MainViewProps) {
  return (
    <div className={styles.mainView}>
      <SidebarProvider defaultOpen>
        <MainViewContent navigation={navigation} login={login}>
          {children}
        </MainViewContent>
      </SidebarProvider>
    </div>
  );
}
