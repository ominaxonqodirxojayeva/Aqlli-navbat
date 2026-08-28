/**
 * Xatoliklarni bir joyda tarjima qilish va loglash.
 *
 * Ilgari har bir `catch` bloki xatoni butunlay yutib yuborardi va foydalanuvchi
 * doim bitta umumiy "Xatolik yuz berdi" xabarini ko'rardi.
 */

/** Bazadagi `RAISE EXCEPTION` kodlari -> foydalanuvchiga ko'rinadigan matn. */
const DB_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: 'Bu amal uchun ruxsatingiz yo\'q.',
  ACTIVE_QUEUE_EXISTS: 'Sizda allaqachon faol navbat bor. Yangi navbat olish uchun avval uni bekor qiling.',
  ORGANIZATION_NOT_FOUND: 'Tashkilot topilmadi yoki hozircha faol emas.',
  SERVICE_NOT_FOUND: 'Tanlangan xizmat topilmadi yoki faol emas.',
  QUEUE_CLOSED: 'Bu tashkilotda navbat qabuli hozircha yopiq.',
  QUEUE_NOT_FOUND: 'Navbat topilmadi.',
  QUEUE_NOT_CANCELLABLE: 'Bu navbatni bekor qilib bo\'lmaydi — u allaqachon yakunlangan.',
  QUEUE_ALREADY_CLOSED: 'Bu navbat allaqachon yakunlangan.',
  INVALID_STATUS: 'Noto\'g\'ri holat tanlandi.',
  ORG_HAS_ACTIVE_QUEUES: 'Tashkilotda faol navbatlar bor. Avval ularni yakunlang yoki tashkilotni nofaol qiling.',
};

/** Postgres/PostgREST kodlari. */
const PG_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'Bunday yozuv allaqachon mavjud.',
  '23503': 'Bog\'liq ma\'lumot mavjudligi sababli amalni bajarib bo\'lmadi.',
  '42501': 'Bu amal uchun ruxsatingiz yo\'q.',
  PGRST301: 'Sessiya muddati tugagan. Qaytadan kiring.',
};

interface SupabaseLikeError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

function asError(err: unknown): SupabaseLikeError {
  if (err && typeof err === 'object') return err as SupabaseLikeError;
  return { message: String(err) };
}

/**
 * Xatoni foydalanuvchi tushunadigan o'zbekcha matnga aylantiradi.
 * @param fallback ma'lum bo'lmagan xatolar uchun matn
 */
export function translateError(err: unknown, fallback = 'Kutilmagan xatolik yuz berdi. Qaytadan urinib ko\'ring.'): string {
  const e = asError(err);
  const message = e.message ?? '';

  for (const [token, text] of Object.entries(DB_ERROR_MESSAGES)) {
    if (message.includes(token)) return text;
  }
  if (e.code && PG_ERROR_MESSAGES[e.code]) return PG_ERROR_MESSAGES[e.code];

  const lower = message.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Internet aloqasi yo\'q. Ulanishni tekshiring.';
  }
  if (lower.includes('jwt') || lower.includes('token is expired')) {
    return 'Sessiya muddati tugagan. Qaytadan kiring.';
  }
  return fallback;
}

export interface LoggedError {
  at: string;
  context: string;
  message: string;
  code?: string;
}

const errorLog: LoggedError[] = [];
const MAX_LOG_ENTRIES = 50;

/**
 * Xatoni konsolga chiqaradi va oxirgi 50 tasini xotirada saqlaydi.
 * `window.__aqlliNavbatErrors` orqali brauzer konsolidan ko'rish mumkin.
 */
export function logError(context: string, err: unknown): void {
  const e = asError(err);
  const entry: LoggedError = {
    at: new Date().toISOString(),
    context,
    message: e.message ?? String(err),
    code: e.code,
  };

  errorLog.push(entry);
  if (errorLog.length > MAX_LOG_ENTRIES) errorLog.shift();

  console.error(`[aqlli-navbat] ${context}:`, err);

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__aqlliNavbatErrors = errorLog;
  }
}

export function getErrorLog(): readonly LoggedError[] {
  return errorLog;
}

/** Loglaydi va tarjima qilingan matnni qaytaradi — eng ko'p ishlatiladigan kombinatsiya. */
export function reportError(context: string, err: unknown, fallback?: string): string {
  logError(context, err);
  return translateError(err, fallback);
}
