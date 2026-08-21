import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Users,
  Timer,
  CalendarClock,
  PlusCircle,
  Ticket,
  XCircle,
  Bell,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Hospital,
  Banknote,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner, StatCard } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase, type NavbatQueue, type NavbatQueueWithService, type NavbatQueueSettings } from '@/lib/supabase';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, formatMinutes } from '@/lib/utils';

export function UserDashboard() {
  const { profile } = useAuth();
  const [activeQueue, setActiveQueue] = useState<NavbatQueueWithService | null>(null);
  const [settings, setSettings] = useState<NavbatQueueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [peopleAhead, setPeopleAhead] = useState(0);

  const loadData = async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('navbat_queues')
        .select('*, service:navbat_services(*), organization:organizations(*)')
        .eq('user_id', profile.id)
        .in('status', ['waiting', 'serving'])
            .order('created_at', { ascending: true })
            .limit(1)
        .maybeSingle();

      if (qErr) throw qErr;

      const q = data as unknown as NavbatQueueWithService | null;
      setActiveQueue(q);

      if (q) {
        let settingsQuery = supabase.from('navbat_queue_settings').select('*');
        if (q.organization_id) {
          settingsQuery = settingsQuery.eq('organization_id', q.organization_id);
        } else if (q.service_id) {
          settingsQuery = settingsQuery.eq('service_id', q.service_id);
        }
        const { data: s } = await settingsQuery.maybeSingle();
        setSettings(s as NavbatQueueSettings | null);

        // Count people ahead: waiting queues in same org created before this one
        if (q.organization_id) {
          const { count } = await supabase
            .from('navbat_queues')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', q.organization_id)
            .eq('status', 'waiting')
            .lt('created_at', q.created_at)
            .neq('id', q.id);
          setPeopleAhead(count ?? 0);
        }
      }
    } catch {
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  // Real-time subscription for active queue
  useEffect(() => {
    if (!activeQueue?.id) return;
    const previousStatus = activeQueue.status;

    const channel = supabase
      .channel(`queue-${activeQueue.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'navbat_queues', filter: `id=eq.${activeQueue.id}` },
        (payload) => {
          const updated = payload.new as NavbatQueue;
          if (updated.status === 'serving' && previousStatus === 'waiting') {
            setNotification('Navbatingiz chaqirildi! Xizmat ko\'rsatish joyiga boring.');
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Aqlli Navbat', { body: 'Navbatingiz chaqirildi!' });
            }
          }
          loadData();
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [activeQueue?.id]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleCancel = async () => {
    if (!activeQueue) return;
    await supabase
      .from('navbat_queues')
      .update({ status: 'cancelled' })
      .eq('id', activeQueue.id);
    await loadData();
  };

  if (loading) {
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
            description={error}
            action={
              <button onClick={loadData} className="btn-primary">
                Qayta urinish
              </button>
            }
          />
        </Card>
      </DashboardLayout>
    );
  }

  const orgName = activeQueue?.organization?.name ?? activeQueue?.service?.name ?? '';
  const orgType = activeQueue?.organization?.type;

  return (
    <DashboardLayout activePage="/dashboard" role="customer">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Salom, {profile?.full_name}!</h1>
        <p className="text-navy-400 text-sm mt-1">Mening navbatlarim</p>
      </div>

      {notification && (
        <div className="mb-6 p-4 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center gap-3 animate-fade-in-up">
          <Bell className="w-5 h-5 text-electric-400 flex-shrink-0" />
          <p className="text-sm text-electric-300">{notification}</p>
          <button onClick={() => setNotification(null)} className="ml-auto text-electric-400 hover:text-electric-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Queue Section */}
      {activeQueue ? (
        <Card className="mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-electric-500/5 blur-[60px]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-navy-400 mb-1">Hozirgi navbatingiz</p>
                <h2 className="text-5xl font-extrabold text-white tracking-tight">
                  {activeQueue.queue_number}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {orgType === 'clinic' && <Hospital className="w-4 h-4 text-electric-400" />}
                  {orgType === 'bank' && <Banknote className="w-4 h-4 text-accent-400" />}
                  <p className="text-sm text-navy-300">{orgName}</p>
                </div>
              </div>
              <Badge className={STATUS_COLORS[activeQueue.status]}>
                <span className={`status-dot ${STATUS_DOT_COLORS[activeQueue.status]}`} />
                {STATUS_LABELS[activeQueue.status]}
              </Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="glass p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-accent-400" />
                  <p className="text-xs text-navy-400">Oldingizda</p>
                </div>
                <p className="text-lg font-bold text-accent-400">
                  {peopleAhead} kishi
                </p>
              </div>
              <div className="glass p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Timer className="w-4 h-4 text-warning-400" />
                  <p className="text-xs text-navy-400">Taxminiy kutish</p>
                </div>
                <p className="text-lg font-bold text-warning-400">
                  {formatMinutes(activeQueue.estimated_wait_time)}
                </p>
              </div>
              <div className="glass p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className="w-4 h-4 text-success-400" />
                  <p className="text-xs text-navy-400">Hozir</p>
                </div>
                <p className="text-lg font-bold text-success-400">
                  {settings ? `${settings.prefix}-${String(settings.current_number).padStart(3, '0')}` : '—'}
                </p>
              </div>
            </div>

            {activeQueue.status === 'waiting' && (
              <div className="flex flex-wrap gap-3">
                <Link to="/my-queue" className="btn-primary flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  Tafsilotlarni ko'rish
                </Link>
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 font-semibold hover:bg-error-500/20 transition-all flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Navbatni bekor qilish
                </button>
              </div>
            )}

            {activeQueue.status === 'serving' && (
              <div className="p-6 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center gap-4 animate-fade-in-up">
                <div className="w-12 h-12 rounded-xl bg-electric-500/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-electric-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-electric-300">Navbatingiz chaqirildi!</p>
                  <p className="text-sm text-electric-200 mt-1">Iltimos, xizmat ko'rsatish joyiga boring.</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Faol navbat"
          value={activeQueue ? '1' : '0'}
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
          value={activeQueue ? STATUS_LABELS[activeQueue.status] : 'Bo\'sh'}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="success"
        />
      </div>

      {/* Quick actions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Tezkor amallar</h3>
          <button onClick={loadData} className="btn-ghost text-sm flex items-center gap-1">
            <RefreshCw className="w-4 h-4" />
            Yangilash
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to="/get-queue"
            className="glass p-5 rounded-xl card-hover group flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-electric-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6 text-electric-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">Navbat olish</h4>
              <p className="text-sm text-navy-400">Poliklinika yoki bank tanlang</p>
            </div>
          </Link>

          <Link
            to="/my-queue"
            className="glass p-5 rounded-xl card-hover group flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ticket className="w-6 h-6 text-accent-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">Mening navbatim</h4>
              <p className="text-sm text-navy-400">Faol navbatni kuzatish</p>
            </div>
          </Link>
        </div>
      </Card>
    </DashboardLayout>
  );
}
