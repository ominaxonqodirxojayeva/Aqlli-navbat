/**
 * Display ekrani uchun ovozli e'lon.
 *
 * Ikki qismdan iborat:
 *  1. "ding" signali — Web Audio API bilan generatsiya qilinadi (fayl kerak emas),
 *  2. matnni ovoz bilan o'qish — Web Speech API.
 *
 * Brauzerlar avtomatik ovozni bloklaydi, shuning uchun `enableAudio()` ni
 * albatta foydalanuvchi bosgan tugmadan chaqirish kerak.
 */

let audioCtx: AudioContext | null = null;
let enabled = false;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function isAudioSupported(): boolean {
  return getAudioContextCtor() !== null || (typeof window !== 'undefined' && 'speechSynthesis' in window);
}

export function isAudioEnabled(): boolean {
  return enabled;
}

/** Foydalanuvchi bosgan tugmadan chaqiriladi — brauzer ovozga ruxsat beradi. */
export async function enableAudio(): Promise<boolean> {
  const Ctor = getAudioContextCtor();
  try {
    if (Ctor && !audioCtx) audioCtx = new Ctor();
    if (audioCtx?.state === 'suspended') await audioCtx.resume();
    enabled = true;
    return true;
  } catch {
    enabled = false;
    return false;
  }
}

export function disableAudio(): void {
  enabled = false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/** Ikki notali qisqa signal. */
function playChime(): void {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const notes = [880, 1174.7];

  notes.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const start = now + i * 0.18;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

    osc.connect(gain).connect(audioCtx!.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

/** "P-014" -> "P 0 1 4" — raqamlar aniq eshitilishi uchun. */
function spellQueueNumber(queueNumber: string): string {
  return queueNumber
    .replace(/-/g, ' ')
    .split('')
    .map((ch) => (/\d/.test(ch) ? `${ch} ` : ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang.toLowerCase().startsWith('uz')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('ru')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('tr'));

  if (preferred) utterance.voice = preferred;
  utterance.lang = preferred?.lang ?? 'ru-RU';

  window.speechSynthesis.speak(utterance);
}

/**
 * Navbatni e'lon qiladi: signal + ovozli matn.
 * Ovoz yoqilmagan bo'lsa hech narsa qilmaydi.
 */
export function announceQueue(queueNumber: string, organizationName?: string): void {
  if (!enabled) return;

  playChime();

  const spelled = spellQueueNumber(queueNumber);
  const where = organizationName ? `, ${organizationName}` : '';
  const text = `${spelled} raqamli navbat${where}. Iltimos, xizmat ko'rsatish joyiga o'ting.`;

  // Signal tugashini kutamiz, keyin gapiramiz
  window.setTimeout(() => speak(text), 700);
}
