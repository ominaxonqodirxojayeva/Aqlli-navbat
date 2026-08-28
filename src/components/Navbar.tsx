import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/lib/notifications';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-electric-500 to-accent-500 flex items-center justify-center shadow-lg shadow-electric-500/30">
        <Clock className="w-5 h-5 text-white" strokeWidth={2.5} />
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-400 animate-pulse" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-white font-bold text-lg tracking-tight">
          Aqlli Navbat
        </span>
      </div>
    </Link>
  );
}

export function Navbar() {
  const { profile, signOut, isStaff } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const { notifications, unreadCount, markAllRead } = useNotifications(profile?.id);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleToggleNotifications = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) markAllRead();
  };

  const dashboardLink = isStaff ? '/admin' : '/dashboard';

  const navLinks = [
    { label: 'Bosh sahifa', href: '/' },
    { label: 'Qanday ishlaydi', href: '/#how' },
    { label: 'Mening navbatim', href: '/my-queue' },
    { label: 'Dashboard', href: dashboardLink },
    { label: 'Display', href: '/display' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-white/10 bg-navy-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} className="btn-ghost text-sm">
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {profile ? (
                <>
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
                      <div className="absolute right-0 mt-2 w-80 glass-card p-2 animate-scale-in origin-top-right bg-navy-950/95">
                        <div className="px-3 py-2 text-xs font-semibold text-navy-400 uppercase tracking-wider">
                          Bildirishnomalar
                        </div>
                        {notifications.length > 0 ? (
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
                    to={dashboardLink}
                    className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl glass-light hover:bg-white/10 transition-colors text-sm font-medium text-white"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="p-2.5 rounded-xl glass-light hover:bg-error-500/20 transition-colors"
                    title="Chiqish"
                  >
                    <LogOut className="w-5 h-5 text-navy-200" />
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost text-sm hidden sm:block">
                    Kirish
                  </Link>
                  <Link to="/register" className="btn-primary text-sm hidden sm:block">
                    Ro'yxatdan o'tish
                  </Link>
                </>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2.5 rounded-xl glass-light"
              >
                {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="lg:hidden pb-4 animate-fade-in-up">
              <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="btn-ghost text-sm py-3"
                  >
                    {link.label}
                  </a>
                ))}
                {!profile && (
                  <div className="flex gap-2 mt-2">
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1 text-center text-sm">
                      Kirish
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1 text-center text-sm">
                      Ro'yxatdan o'tish
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
