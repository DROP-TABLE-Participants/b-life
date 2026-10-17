import { AccountWorkspace } from "@/components/layout/AccountWorkspace";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AccountWorkspace admin>{children}</AccountWorkspace>;
}
