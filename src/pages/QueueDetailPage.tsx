import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  Users,
  Timer,
  ArrowLeft,
  Bell,
  QrCode,
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Ticket,
  Hospital,
  Banknote,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase, type NavbatQueueWithService, type NavbatQueueSettings, type QueueStatus, type Organization } from '@/lib/supabase';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, formatMinutes } from '@/lib/utils';

export function QueueDetailPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<NavbatQueueWithService | null>(null);
  const [settings, setSettings] = useState<NavbatQueueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [prevStatus, setPrevStatus] = useState<QueueStatus | null>(null);
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
        .maybeSingle();

      if (qErr) throw qErr;
      const q = data as unknown as NavbatQueueWithService | null;
      setQueue(q);

      if (q) {
        // Get settings by organization_id or service_id
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
            .lt('created_at', q.created_at);
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

  // Real-time subscription
  useEffect(() => {
    if (!queue?.id) return;
    setPrevStatus(queue.status);

    const channel = supabase
      .channel(`detail-${queue.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'navbat_queues', filter: `id=eq.${queue.id}` },
        (payload) => {
          const updated = payload.new as { status: QueueStatus };
          if (updated.status === 'serving' && prevStatus === 'waiting') {
            setNotification('Navbatingiz chaqirildi! Xizmat ko\'rsatish joyiga boring.');
            if (Notification.permission === 'granted') {
              new Notification('Aqlli Navbat', { body: 'Navbatingiz chaqirildi!' });
            }
          } else if (updated.status === 'completed' && prevStatus !== 'completed') {
            setNotification('Xizmat yakunlandi.');
          } else if (updated.status === 'skipped' && prevStatus !== 'skipped') {
            setNotification('Navbatingiz o\'tkazib yuborildi.');
          }
          loadData();
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [queue?.id]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleCancel = async () => {
    if (!queue) return;
    setCancelling(true);
    await supabase
      .from('navbat_queues')
      .update({ status: 'cancelled' })
      .eq('id', queue.id);
    setCancelling(false);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <DashboardLayout activePage="/my-queue" role="customer">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout activePage="/my-queue" role="customer">
        <Card>
          <EmptyState
            icon={<AlertCircle className="w-8 h-8" />}
            title="Xatolik"
            description={error}
            action={
              <button onClick={loadData} className="btn-primary">Qayta urinish</button>
            }
          />
        </Card>
      </DashboardLayout>
    );
  }

  if (!queue) {
    return (
      <DashboardLayout activePage="/my-queue" role="customer">
        <Card>
          <EmptyState
            icon={<Ticket className="w-8 h-8" />}
            title="Faol navbat yo'q"
            description="Sizda hozirda faol navbat mavjud emas"
            action={
              <Link to="/get-queue" className="btn-primary">Navbat olish</Link>
            }
          />
        </Card>
      </DashboardLayout>
    );
  }

  const orgName = queue.organization?.name ?? queue.service?.name ?? 'Noma\'lum';
  const orgType = queue.organization?.type;
  const waitTime = queue.estimated_wait_time;

  const qrData = JSON.stringify({
    queueId: queue.id,
    queueNumber: queue.queue_number,
    org: orgName,
  });

  return (
    <DashboardLayout activePage="/my-queue" role="customer">
      <div className="mb-6">
        <Link to="/dashboard" className="btn-ghost inline-flex items-center gap-2 mb-2">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">Mening navbatim</h1>
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

      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-electric-500/5 blur-[60px]" />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-navy-400 mb-1">Sizning navbatingiz</p>
              <h2 className="text-5xl font-extrabold text-white tracking-tight">
                {queue.queue_number}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                {orgType === 'clinic' && <Hospital className="w-4 h-4 text-electric-400" />}
                {orgType === 'bank' && <Banknote className="w-4 h-4 text-accent-400" />}
                <p className="text-sm text-navy-300">{orgName}</p>
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
                <Clock className="w-4 h-4 text-electric-400" />
                <p className="text-xs text-navy-400">Hozir</p>
              </div>
              <p className="text-lg font-bold text-electric-400">
                {settings ? `${settings.prefix}-${String(settings.current_number).padStart(3, '0')}` : '—'}
              </p>
            </div>
            <div className="glass p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-accent-400" />
                <p className="text-xs text-navy-400">Oldinda</p>
              </div>
              <p className="text-lg font-bold text-accent-400">{peopleAhead} kishi</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-warning-400" />
                <p className="text-xs text-navy-400">Taxminiy kutish</p>
              </div>
              <p className="text-lg font-bold text-warning-400">{formatMinutes(waitTime)}</p>
            </div>
          </div>

          {queue.status === 'waiting' && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowQR(!showQR)}
                className="btn-primary flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                {showQR ? 'QR yashirish' : 'QR kod'}
              </button>
              <button onClick={loadData} className="btn-secondary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Yangilash
              </button>
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
                <p className="text-sm text-electric-200 mt-1">Iltimos, xizmat ko'rsatish joyiga boring.</p>
              </div>
            </div>
          )}

          {queue.status === 'completed' && (
            <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-400 flex-shrink-0" />
              <p className="text-sm text-success-300">Xizmat yakunlandi.</p>
            </div>
          )}
        </div>
      </Card>

      {showQR && queue.status === 'waiting' && (
        <Card className="text-center animate-scale-in">
          <h3 className="text-lg font-bold text-white mb-4">QR kod</h3>
          <div className="inline-block p-6 bg-white rounded-2xl mb-4">
            <QRCodeSVG value={qrData} size={200} level="M" />
          </div>
          <p className="text-sm text-navy-400">
            Xodimga ushbu QR kodni ko'rsating
          </p>
          <p className="text-xs text-navy-500 mt-2">
            Navbat: {queue.queue_number}
          </p>
        </Card>
      )}
    </DashboardLayout>
  );
}
