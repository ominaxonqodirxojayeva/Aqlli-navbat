import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
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
  Megaphone,
  CalendarClock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Badge, EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useMyQueue } from '@/lib/queue';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, formatMinutes, formatTime } from '@/lib/utils';
import { reportError } from '@/lib/errors';
import { showBrowserNotification, useBrowserNotificationPermission } from '@/lib/notifications';

export function QueueDetailPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const previousStatus = useRef<string | null>(null);

  useBrowserNotificationPermission();

  const { data: queue, isLoading, error, refetch, invalidate } = useMyQueue(profile?.id);

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
      navigate('/dashboard');
    } catch (err) {
      setActionError(reportError('QueueDetail.cancel', err, 'Navbatni bekor qilishda xatolik yuz berdi.'));
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
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
            description={reportError('QueueDetail.load', error, 'Ma\'lumotlarni yuklashda xatolik yuz berdi.')}
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

  if (!queue) {
    return (
      <DashboardLayout activePage="/my-queue" role="customer">
        <Card>
          <EmptyState
            icon={<Ticket className="w-8 h-8" />}
            title="Faol navbat yo'q"
            description="Sizda hozirda faol navbat mavjud emas"
            action={
              <Link to="/get-queue" className="btn-primary">
                Navbat olish
              </Link>
            }
          />
        </Card>
      </DashboardLayout>
    );
  }

  const orgName = queue.organization_name ?? 'Noma\'lum';
  const orgType = queue.organization_type;

  // QR kod xodim uchun: shu tashkilotning navbat sahifasiga havola.
  const qrData = queue.organization_slug
    ? `${window.location.origin}/join/${queue.organization_slug}`
    : `${window.location.origin}/get-queue`;

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

      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-electric-500/5 blur-[60px]" />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-navy-400 mb-1">Sizning navbatingiz</p>
              <h2 className="text-5xl font-extrabold text-white tracking-tight">{queue.queue_number}</h2>
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="glass p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-4 h-4 text-electric-400" />
                <p className="text-xs text-navy-400">Hozir chaqirilmoqda</p>
              </div>
              <p className="text-lg font-bold text-electric-400">{queue.serving_number ?? '—'}</p>
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
            <div className="glass p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <CalendarClock className="w-4 h-4 text-success-400" />
                <p className="text-xs text-navy-400">Navbat olingan</p>
              </div>
              <p className="text-lg font-bold text-success-400">{formatTime(queue.created_at)}</p>
            </div>
          </div>

          {!queue.is_open && queue.status === 'waiting' && (
            <div className="mb-6 p-4 rounded-xl bg-warning-500/10 border border-warning-500/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-warning-400 flex-shrink-0" />
              <p className="text-sm text-warning-300">
                Bu tashkilotda navbat qabuli vaqtincha yopilgan. Sizning navbatingiz saqlanib turadi.
              </p>
            </div>
          )}

          {queue.status === 'waiting' && (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowQR(!showQR)} className="btn-primary flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                {showQR ? 'QR yashirish' : 'QR kod'}
              </button>
              <button onClick={() => void refetch()} className="btn-secondary flex items-center gap-2">
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
                <p className="text-sm text-electric-200 mt-1">
                  Iltimos, xizmat ko'rsatish joyiga boring.
                  {queue.called_at ? ` Chaqirilgan vaqt: ${formatTime(queue.called_at)}.` : ''}
                </p>
              </div>
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
          <p className="text-sm text-navy-400">Xodimga ushbu QR kodni ko'rsating</p>
          <p className="text-xs text-navy-500 mt-2">Navbat: {queue.queue_number}</p>
        </Card>
      )}

      <div className="mt-6 flex justify-center">
        <Link to="/history" className="btn-ghost text-sm inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Oldingi navbatlarim
        </Link>
      </div>
    </DashboardLayout>
  );
}
