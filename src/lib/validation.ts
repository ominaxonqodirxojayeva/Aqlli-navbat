/**
 * Yagona validatsiya joyi.
 *
 * Ilgari telefon/parol/email qoidalari uch joyda (auth.tsx, RegisterPage.tsx,
 * get-queue/shared.ts) alohida yozilgan va bir-biriga mos kelmasdi.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // Supabase/bcrypt cheklovi

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+998\d{9}$/;

/** Telefon raqamdan bo'shliq, defis va qavslarni olib tashlaydi. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '');
}

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(normalizePhone(phone));
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Kiritilayotgan raqamni "+998 90 123 45 67" ko'rinishiga keltiradi. */
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  if (digits.length > 9) digits = digits.slice(0, 9);

  let formatted = '+998 ';
  if (digits.length > 0) formatted += digits.slice(0, 2);
  if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
  if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
  if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
  return formatted;
}

/** Xatolik matnini qaytaradi, hammasi joyida bo'lsa `null`. */
export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email manzilini kiriting.';
  if (!isValidEmail(email)) return 'Email manzilini to\'g\'ri kiriting.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Parol kamida ${PASSWORD_MIN_LENGTH} ta belgidan iborat bo'lishi kerak.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Parol ${PASSWORD_MAX_LENGTH} ta belgidan oshmasligi kerak.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Parolda kamida bitta harf va bitta raqam bo\'lishi kerak.';
  }
  return null;
}

export function validatePhoneNumber(phone: string): string | null {
  if (!phone.trim()) return 'Telefon raqamingizni kiriting.';
  if (!isValidPhone(phone)) {
    return 'Telefon raqamni to\'g\'ri kiriting: +998 XX XXX XX XX';
  }
  return null;
}

export function validateFullName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Ism-familiyangizni kiriting.';
  if (trimmed.length > 100) return 'Ism-familiya juda uzun.';
  return null;
}
