"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import styles from "./AppShell.module.css";

interface AppShellNavigationItem {
  label: string;
  href: string;
  description?: string;
}

interface AppShellProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  navigation?: AppShellNavigationItem[];
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, actionLabel, onAction, navigation = [], children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <div className={styles.backgroundGrid} />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <p className={styles.sidebarEyebrow}>{APP_NAME}</p>
            <h1 className={styles.sidebarTitle}>{title}</h1>
            {subtitle && <p className={styles.sidebarText}>{subtitle}</p>}
          </div>

          <nav className={styles.sidebarNav}>
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.sidebarNavItem} ${isActive ? styles.sidebarNavItemActive : ""}`.trim()}
                >
                  <span className={styles.sidebarNavLabel}>{item.label}</span>
                  {item.description && <span className={styles.sidebarNavDescription}>{item.description}</span>}
                </Link>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <Link href="/" className={styles.sidebarSwitchLink}>
              Switch Account
            </Link>
            {actionLabel && onAction && (
              <div className={styles.sidebarActionWrap}>
                <button type="button" className={styles.sidebarActionButton} onClick={onAction}>
                  {actionLabel}
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className={styles.mainPanel}>
          <section className={styles.mainCard}>
            <header className={styles.mainCardHeader}>
              <h2 className={styles.mainCardTitle}>{title}</h2>
              {subtitle && <p className={styles.mainCardSubtitle}>{subtitle}</p>}
            </header>
            <div className={styles.mainCardBody}>{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
