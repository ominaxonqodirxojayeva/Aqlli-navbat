import { logError } from '@/lib/errors';

/**
 * Service Worker'ni ro'yxatdan o'tkazadi.
 *
 * Faqat production build'da ishlaydi — dev rejimda SW eski fayllarni
 * keshlab, o'zgarishlarni ko'rsatmay qo'yishi mumkin.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      logError('pwa.register', err);
    });
  });
}

/** Ilova "Bosh ekranga qo'shish" uchun tayyor bo'lgan paytni ushlaydi. */
export interface InstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPrompt | null = null;

export function captureInstallPrompt(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as unknown as InstallPrompt;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
}

export function canInstall(): boolean {
  return deferredPrompt !== null;
}

/** "Ilovani o'rnatish" tugmasi bosilganda chaqiriladi. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (err) {
    logError('pwa.promptInstall', err);
    return false;
  }
}
