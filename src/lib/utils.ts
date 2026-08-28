import { type QueueStatus } from '@/lib/supabase';

/**
 * Daqiqalarni o'qishga qulay matnga aylantiradi: 5 -> "5 daqiqa",
 * 125 -> "2 soat 5 daqiqa".
 */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 daqiqa';
  if (minutes < 1) return '<1 daqiqa';
  if (minutes < 60) return `${Math.round(minutes)} daqiqa`;

  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest > 0 ? `${hours} soat ${rest} daqiqa` : `${hours} soat`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "5 daqiqa oldin" ko'rinishidagi nisbiy vaqt. */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hozir';
  if (mins < 60) return `${mins} daqiqa oldin`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;

  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}

/** Nomdan URL uchun qisqa nom yasaydi: "12-son Poliklinika" -> "12-son-poliklinika". */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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
