'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Megaphone,
  TrendingUp,
  BarChart3,
  Heart,
  CalendarDays,
  Bell,
  LogOut,
  Droplets,
  ChevronRight,
} from 'lucide-react';

const institutionNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/forecast', label: 'Forecast', icon: TrendingUp },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const donorNav = [
  { href: '/portal', label: 'My Portal', icon: Heart },
  { href: '/portal/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/portal/notifications', label: 'Notifications', icon: Bell },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isDonor = user?.role === 'donor';
  const navItems = isDonor ? donorNav : institutionNav;

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/portal') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 flex flex-col z-40"
      style={{ background: '#0F172A' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: '#C41E3A' }}
        >
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-white font-bold text-lg leading-none">B-Live</span>
          <p className="text-slate-500 text-xs mt-0.5">Blood Shortage Prevention</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-5 py-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-300">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#C41E3A' }}
          />
          {user?.role?.replace('_', ' ') || 'Guest'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                active
                  ? 'bg-[#C41E3A] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium flex-1">{label}</span>
              {active && <ChevronRight className="w-4 h-4 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-white/10 space-y-0.5">
        <div className="px-3 py-2.5 rounded-lg">
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
