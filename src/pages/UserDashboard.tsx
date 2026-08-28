import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Users,
  Timer,
  PlusCircle,
  Ticket,
  XCircle,
  Bell,
  RefreshCw,
  AlertCircle,
  History,
  Hospital,
  Banknote,
  Megaphone,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner, StatCard } from '@/components/ui';
import { InstallAppBanner } from '@/components/InstallAppBanner';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useMyQueue } from '@/lib/queue';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, formatMinutes } from '@/lib/utils';
import { reportError } from '@/lib/errors';
import { showBrowserNotification, useBrowserNotificationPermission } from '@/lib/notifications';

export function UserDashboard() {
  const { profile } = useAuth();
  const [notification, setNotification] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const previousStatus = useRef<string | null>(null);

  useBrowserNotificationPermission();

  const { data: queue, isLoading, error, refetch, invalidate } = useMyQueue(profile?.id);

  // Holat o'zgarishini kuzatib, bannerni va brauzer bildirishnomasini ko'rsatamiz
  useEffect(() => {
    const current = queue?.status ?? null;
    const previous = previousStatus.current;
    previousStatus.current = current;

    if (!current || !previous || current === previous) return;

    if (current === 'serving') {
      setNotification('Navbatingiz chaqirildi! Xizmat ko\'rsatish joyiga boring.');
      showBrowserNotification('Aqlli Navbat', `${queue?.queue_number} — navbatingiz keldi!`);
    }
  }, [queue?.status, queue?.queue_number]);

  const handleCancel = async () => {
    if (!queue) return;
    setCancelling(true);
    setActionError(null);
    try {
      const { error: rpcError } = await supabase.rpc('cancel_my_queue', { p_queue_id: queue.id });
      if (rpcError) throw rpcError;
      await invalidate();
    } catch (err) {
      setActionError(reportError('UserDashboard.cancel', err, 'Navbatni bekor qilishda xatolik yuz berdi.'));
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout activePage="/dashboard" role="customer">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout activePage="/dashboard" role="customer">
        <Card>
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Xatolik"
            description={reportError('UserDashboard.load', error, 'Ma\'lumotlarni yuklashda xatolik yuz berdi.')}
            action={
              <button onClick={() => void refetch()} className="btn-primary">
                Qayta urinish
              </button>
            }
          />
        </Card>
      </DashboardLayout>
    );
  }

  const orgName = queue?.organization_name ?? '';
  const orgType = queue?.organization_type;

  return (
    <DashboardLayout activePage="/dashboard" role="customer">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Salom, {profile?.full_name}!</h1>
        <p className="text-navy-400 text-sm mt-1">Mening navbatim</p>
      </div>

      <InstallAppBanner />

      {notification && (
        <div className="mb-6 p-4 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center gap-3 animate-fade-in-up">
          <Bell className="w-5 h-5 text-electric-400 flex-shrink-0" />
          <p className="text-sm text-electric-300">{notification}</p>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-electric-400 hover:text-electric-300"
            aria-label="Yopish"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0" />
          <p className="text-sm text-error-300">{actionError}</p>
        </div>
      )}

      {queue ? (
        <Card className="mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-electric-500/5 blur-[60px]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-navy-400 mb-1">Hozirgi navbatingiz</p>
                <h2 className="text-5xl font-extrabold text-white tracking-tight">
                  {queue.queue_number}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {orgType === 'clinic' && <Hospital className="w-4 h-4 text-electric-400" />}
                  {orgType === 'bank' && <Banknote className="w-4 h-4 text-accent-400" />}
                  <p className="text-sm text-navy-300">
                    {orgName}
                    {queue.service_name ? ` · ${queue.service_name}` : ''}
                  </p>
                </div>
              </div>
              <Badge className={STATUS_COLORS[queue.status]}>
                <span className={`status-dot ${STATUS_DOT_COLORS[queue.status]}`} />
                {STATUS_LABELS[queue.status]}
              </Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="glass p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone className="w-4 h-4 text-electric-400" />
                  <p className="text-xs text-navy-400">Hozir chaqirilmoqda</p>
                </div>
                <p className="text-lg font-bold text-electric-400">
                  {queue.serving_number ?? '—'}
                </p>
              </div>
              <div className="glass p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-accent-400" />
                  <p className="text-xs text-navy-400">Oldingizda</p>
                </div>
                <p className="text-lg font-bold text-accent-400">{queue.people_ahead} kishi</p>
              </div>
              <div className="glass p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Timer className="w-4 h-4 text-warning-400" />
                  <p className="text-xs text-navy-400">Taxminiy kutish</p>
                </div>
                <p className="text-lg font-bold text-warning-400">
                  {formatMinutes(queue.estimated_wait_minutes)}
                </p>
              </div>
            </div>

            {queue.status === 'waiting' && (
              <div className="flex flex-wrap gap-3">
                <Link to="/my-queue" className="btn-primary flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  Tafsilotlarni ko'rish
                </Link>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-6 py-3 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 font-semibold hover:bg-error-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelling ? 'Bekor qilinmoqda...' : 'Navbatni bekor qilish'}
                </button>
              </div>
            )}

            {queue.status === 'serving' && (
              <div className="p-6 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center gap-4 animate-fade-in-up">
                <div className="w-12 h-12 rounded-xl bg-electric-500/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-electric-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-electric-300">Navbatingiz chaqirildi!</p>
                  <p className="text-sm text-electric-200 mt-1">
                    Iltimos, xizmat ko'rsatish joyiga boring.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="mb-6">
          <EmptyState
            icon={<Ticket className="w-8 h-8" />}
            title="Faol navbatingiz yo'q"
            description="Navbat olish uchun quyidagi tugmani bosing"
            action={
              <Link to="/get-queue" className="btn-primary flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Navbat olish
              </Link>
            }
          />
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Faol navbat"
          value={queue ? '1' : '0'}
          icon={<Clock className="w-5 h-5" />}
          color="electric"
        />
        <StatCard
          label="Tashkilot"
          value={orgName || '—'}
          icon={orgType === 'bank' ? <Banknote className="w-5 h-5" /> : <Hospital className="w-5 h-5" />}
          color="accent"
        />
        <StatCard
          label="Holat"
          value={queue ? STATUS_LABELS[queue.status] : 'Bo\'sh'}
          icon={<Ticket className="w-5 h-5" />}
          color="success"
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Tezkor amallar</h3>
          <button onClick={() => void refetch()} className="btn-ghost text-sm flex items-center gap-1">
            <RefreshCw className="w-4 h-4" />
            Yangilash
          </button>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link to="/get-queue" className="glass p-5 rounded-xl card-hover group flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-electric-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6 text-electric-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">Navbat olish</h4>
              <p className="text-sm text-navy-400">Poliklinika yoki bank</p>
            </div>
          </Link>

          <Link to="/my-queue" className="glass p-5 rounded-xl card-hover group flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ticket className="w-6 h-6 text-accent-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">Mening navbatim</h4>
              <p className="text-sm text-navy-400">Faol navbatni kuzatish</p>
            </div>
          </Link>

          <Link to="/history" className="glass p-5 rounded-xl card-hover group flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <History className="w-6 h-6 text-success-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">Tarix</h4>
              <p className="text-sm text-navy-400">Oldingi navbatlaringiz</p>
            </div>
          </Link>
        </div>
      </Card>
    </DashboardLayout>
  );
}
