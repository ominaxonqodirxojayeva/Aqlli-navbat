import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { canInstall, promptInstall } from '@/lib/pwa';

const DISMISSED_KEY = 'aqlli-navbat-install-dismissed';

/**
 * "Ilovani telefonga o'rnatish" taklifi.
 *
 * Faqat brauzer o'rnatish mumkinligini bildirganda ko'rinadi va foydalanuvchi
 * yopgach boshqa bezovta qilmaydi.
 */
export function InstallAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      // Maxfiy rejimda localStorage yopiq bo'lishi mumkin — muhim emas
    }
    if (dismissed) return;

    // beforeinstallprompt hodisasi sahifa yuklangandan keyin keladi
    const timer = window.setTimeout(() => setVisible(canInstall()), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // e'tiborsiz qoldiramiz
    }
  };

  return (
    <div className="mb-6 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20 flex flex-wrap items-center gap-3 animate-fade-in-up">
      <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center flex-shrink-0">
        <Smartphone className="w-5 h-5 text-accent-400" />
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-medium text-white">Ilovani telefoningizga o'rnating</p>
        <p className="text-xs text-navy-300 mt-0.5">
          Bosh ekrandan bir bosishda oching, navbat chaqirilganda xabar oling.
        </p>
      </div>
      <button onClick={handleInstall} className="btn-primary text-sm flex items-center gap-2">
        <Download className="w-4 h-4" />
        O'rnatish
      </button>
      <button
        onClick={handleDismiss}
        className="p-2 text-navy-400 hover:text-white transition-colors"
        aria-label="Yopish"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
