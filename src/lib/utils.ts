import { type QueueStatus, type NavbatQueue, type NavbatService, type NavbatQueueSettings } from '@/lib/supabase';

export function formatMinutes(minutes: number): string {
  if (minutes < 1) return '<1 daqiqa';
  if (minutes < 60) return `${Math.round(minutes)} daqiqa`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} soat ${m} daqiqa` : `${h} soat`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hozir';
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} soat oldin`;
  const days = Math.floor(hrs / 24);
  return `${days} kun oldin`;
}

export function calculateWaitTime(peopleAhead: number, averageTime: number): number {
  if (peopleAhead <= 0) return 0;
  return peopleAhead * averageTime;
}

export function getPeopleAhead(queue: NavbatQueue, settings: NavbatQueueSettings): number {
  if (queue.status !== 'waiting') return 0;
  const num = parseInt(queue.queue_number.split('-')[1] ?? '0', 10);
  return Math.max(0, num - settings.current_number);
}

export function getEstimatedServiceTime(waitMinutes: number): Date {
  return new Date(Date.now() + waitMinutes * 60000);
}

export const STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: 'Kutilmoqda',
  serving: 'Xizmat ko\'rsatilmoqda',
  completed: 'Tugadi',
  skipped: 'O\'tkazib yuborildi',
  cancelled: 'Bekor qilindi',
};

export const STATUS_COLORS: Record<QueueStatus, string> = {
  waiting: 'text-warning-500 bg-warning-500/10 border-warning-500/20',
  serving: 'text-electric-400 bg-electric-500/10 border-electric-500/20',
  completed: 'text-success-500 bg-success-500/10 border-success-500/20',
  skipped: 'text-navy-400 bg-navy-500/10 border-navy-500/20',
  cancelled: 'text-error-500 bg-error-500/10 border-error-500/20',
};

export const STATUS_DOT_COLORS: Record<QueueStatus, string> = {
  waiting: 'bg-warning-500 animate-pulse',
  serving: 'bg-electric-500 animate-pulse',
  completed: 'bg-success-500',
  skipped: 'bg-navy-400',
  cancelled: 'bg-error-500',
};

export function getServiceIcon(service: NavbatService): string {
  const name = service.name.toLowerCase();
  if (name.includes('pasport') || name.includes('hujjat')) return '📄';
  if (name.includes('maslahat') || name.includes('konsult')) return '💬';
  if (name.includes('to\'lov') || name.includes('tolov')) return '💳';
  if (name.includes('ma\'lumot') || name.includes('malumot') || name.includes('sprav')) return '📋';
  return '🎫';
}
