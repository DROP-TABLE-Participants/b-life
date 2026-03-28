"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface SidebarContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("Sidebar components must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  children,
  className,
}: React.ComponentProps<"div"> & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div
        className={cn("h-full w-full", className)}
        data-state={open ? "expanded" : "collapsed"}
        style={
          {
            "--sidebar-width": "300px",
            "--sidebar-width-collapsed": "55px",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function SidebarLayout({ className, ...props }: React.ComponentProps<"div">) {
  const { open } = useSidebar();

  return (
    <div
      className={cn(
        "grid h-full w-full gap-4",
        open ? "[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)]" : "[grid-template-columns:var(--sidebar-width-collapsed)_minmax(0,1fr)]",
        className,
      )}
      {...props}
    />
  );
}

function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)} {...props}>
      <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex min-h-0 flex-1 flex-col overflow-auto", className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-auto flex shrink-0 flex-col gap-3 overflow-hidden", className)} {...props} />;
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs font-semibold uppercase", className)} {...props} />;
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col", className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-col gap-2", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("list-none", className)} {...props} />;
}

function SidebarMenuButton({
  className,
  asChild = false,
  isActive = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean; isActive?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent font-medium text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("h-full min-w-0", className)} {...props} />;
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<"button">) {
  const { setOpen } = useSidebar();
  return (
    <button
      type="button"
      className={cn("inline-flex min-h-10 w-full items-center justify-center rounded-md border bg-background", className)}
      onClick={(event) => {
        setOpen((current) => !current);
        onClick?.(event);
      }}
      {...props}
    />
  );
}

export {
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
};
