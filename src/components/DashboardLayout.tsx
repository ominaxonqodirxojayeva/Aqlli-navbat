import { useState, type ComponentType, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  LogOut,
  Menu,
  X,
  Bell,
  Settings,
  BarChart3,
  Monitor,
  Ticket,
  Building2,
  History,
  Home,
  Users,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/Navbar';
import { useNotifications } from '@/lib/notifications';
import { timeAgo } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

interface DashboardLayoutProps {
  children: ReactNode;
  activePage: string;
  role: 'customer' | 'admin';
}

const CUSTOMER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mening navbatim', href: '/my-queue', icon: Ticket },
  { label: 'Navbat olish', href: '/get-queue', icon: Clock },
  { label: 'Navbatlar tarixi', href: '/history', icon: History },
];

const STAFF_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Tashkilotlar', href: '/admin/organizations', icon: Building2 },
  { label: 'Xizmatlar', href: '/admin/services', icon: Settings },
  { label: 'Statistika', href: '/admin/stats', icon: BarChart3 },
  { label: 'Display', href: '/display', icon: Monitor },
];

const SUPER_ADMIN_NAV: NavItem[] = [
  { label: 'Xodimlar', href: '/admin/staff', icon: Users },
];

/** Sahifa manzilidan sarlavha yasaydi (masalan "/admin/stats" -> "Statistika"). */
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/my-queue': 'Mening navbatim',
  '/get-queue': 'Navbat olish',
  '/history': 'Navbatlar tarixi',
  '/admin': 'Admin dashboard',
  '/admin/organizations': 'Tashkilotlar',
  '/admin/services': 'Xizmatlar',
  '/admin/stats': 'Statistika',
  '/admin/staff': 'Xodimlar',
};

export function DashboardLayout({ children, activePage, role }: DashboardLayoutProps) {
  const { profile, signOut, isStaff, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { notifications, unreadCount, markAllRead } = useNotifications(profile?.id);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleToggleNotifications = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    // Ochilganda hammasini o'qilgan deb belgilaymiz — ilgari qizil belgi
    // hech qachon o'chmasdi.
    if (opening) markAllRead();
  };

  const navItems: NavItem[] =
    role === 'admin'
      ? [...STAFF_NAV, ...(isSuperAdmin ? SUPER_ADMIN_NAV : [])]
      : CUSTOMER_NAV;

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Yon panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 glass border-r border-white/10 bg-navy-950/90 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-white/10">
          <Logo />
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activePage === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-electric-500/15 text-electric-300 border border-electric-500/20'
                    : 'text-navy-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Xodim mijoz sahifalariga ham o'tishi mumkin */}
          {role === 'admin' && (
            <Link
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-400 hover:text-white hover:bg-white/5 border border-transparent transition-all"
            >
              <Ticket className="w-4 h-4" />
              Mijoz rejimi
            </Link>
          )}
          {role === 'customer' && isStaff && (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-400 hover:text-white hover:bg-white/5 border border-transparent transition-all"
            >
              <Settings className="w-4 h-4" />
              Admin panel
            </Link>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-electric-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-navy-400">
                {isSuperAdmin ? 'Superadmin' : isStaff ? 'Xodim' : 'Mijoz'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-navy-300 hover:text-error-400 hover:bg-error-500/10 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Chiqish
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 glass border-b border-white/10 bg-navy-950/80">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg glass-light"
              aria-label="Menyuni ochish"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="hidden lg:block">
              <h2 className="text-white font-semibold">
                {PAGE_TITLES[activePage] ?? 'Aqlli Navbat'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={handleToggleNotifications}
                  className="relative p-2.5 rounded-xl glass-light hover:bg-white/10 transition-colors"
                  aria-label="Bildirishnomalar"
                >
                  <Bell className="w-5 h-5 text-navy-200" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 glass-card p-2 animate-scale-in origin-top-right z-50 bg-navy-950/95">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider">
                          Bildirishnomalar
                        </span>
                        {notifications.length > 0 && (
                          <span className="text-[10px] text-navy-500 flex items-center gap-1">
                            <CheckCheck className="w-3 h-3" /> o'qildi
                          </span>
                        )}
                      </div>
                      {notifications.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto scrollbar-thin space-y-1">
                          {notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`px-3 py-2.5 rounded-lg ${n.is_read ? 'opacity-60' : 'bg-white/5'}`}
                            >
                              <p className="text-sm font-medium text-white">{n.title}</p>
                              <p className="text-xs text-navy-400 mt-0.5">{n.body}</p>
                              <p className="text-[10px] text-navy-500 mt-1">{timeAgo(n.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-6 text-center text-sm text-navy-400">
                          Bildirishnomalar yo'q
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <Link
                to="/"
                className="p-2.5 rounded-xl glass-light hover:bg-white/10 transition-colors"
                title="Bosh sahifa"
              >
                <Home className="w-5 h-5 text-navy-200" />
              </Link>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
