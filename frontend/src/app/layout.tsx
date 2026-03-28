import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'B-Live | Blood Shortage Prevention Platform',
  description: 'AI-powered blood shortage prevention and donor management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
