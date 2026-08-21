import { type ReactNode } from 'react';
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
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Navbar';
import { supabase, type Notification } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface DashboardLayoutProps {
  children: ReactNode;
  activePage: string;
  role: 'customer' | 'admin';
}

const navItemsByRole: Record<string, { label: string; href: string; icon: typeof Clock }[]> = {
  customer: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Mening navbatim', href: '/my-queue', icon: Ticket },
    { label: 'Navbat olish', href: '/get-queue', icon: Clock },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Tashkilotlar', href: '/admin/organizations', icon: Building2 },
    { label: 'Xizmatlar', href: '/admin/services', icon: Settings },
    { label: 'Statistika', href: '/admin/stats', icon: BarChart3 },
    { label: 'Display', href: '/display', icon: Monitor },
  ],
};

export function DashboardLayout({ children, activePage, role }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return (data ?? []) as Notification[];
    },
    enabled: !!profile?.id,
    refetchInterval: 15000,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = navItemsByRole[role] ?? [];

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Sidebar */}
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
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-electric-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-navy-400 capitalize">{role}</p>
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

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-white/10 bg-navy-950/80">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg glass-light"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="hidden lg:block">
              <h2 className="text-white font-semibold">{activePage.split('/').pop()}</h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2.5 rounded-xl glass-light hover:bg-white/10 transition-colors"
                >
                  <Bell className="w-5 h-5 text-navy-200" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 glass-card p-2 animate-scale-in origin-top-right z-50">
                    <div className="px-3 py-2 text-xs font-semibold text-navy-400 uppercase tracking-wider">
                      Bildirishnomalar
                    </div>
                    {notifications && notifications.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto scrollbar-thin space-y-1">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`px-3 py-2.5 rounded-lg ${n.is_read ? 'opacity-50' : 'bg-white/5'}`}
                          >
                            <p className="text-sm font-medium text-white">{n.title}</p>
                            <p className="text-xs text-navy-400 mt-0.5">{n.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-3 py-6 text-center text-sm text-navy-400">
                        Bildirishnomalar yo'q
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Link
                to="/"
                className="p-2.5 rounded-xl glass-light hover:bg-white/10 transition-colors"
                title="Bosh sahifa"
              >
                <LayoutDashboard className="w-5 h-5 text-navy-200" />
              </Link>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
