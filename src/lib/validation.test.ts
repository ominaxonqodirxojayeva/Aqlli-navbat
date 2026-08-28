import { describe, expect, it } from 'vitest';
import {
  formatPhoneInput,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhoneNumber,
} from '@/lib/validation';

describe('normalizePhone', () => {
  it('bo\'shliq, defis va qavslarni olib tashlaydi', () => {
    expect(normalizePhone('+998 (90) 123-45-67')).toBe('+998901234567');
  });
});

describe('isValidPhone', () => {
  it('to\'g\'ri O\'zbekiston raqamini qabul qiladi', () => {
    expect(isValidPhone('+998 90 123 45 67')).toBe(true);
    expect(isValidPhone('+998901234567')).toBe(true);
  });

  it('kalta yoki uzun raqamlarni rad etadi', () => {
    expect(isValidPhone('+99890123456')).toBe(false);
    expect(isValidPhone('+9989012345678')).toBe(false);
  });

  it('boshqa mamlakat kodlarini rad etadi', () => {
    expect(isValidPhone('+79012345678')).toBe(false);
  });

  it('bo\'sh qatorni rad etadi', () => {
    expect(isValidPhone('')).toBe(false);
  });
});

describe('formatPhoneInput', () => {
  it('raqamlarni bosqichma-bosqich formatlaydi', () => {
    expect(formatPhoneInput('90')).toBe('+998 90');
    expect(formatPhoneInput('901')).toBe('+998 90 1');
    expect(formatPhoneInput('901234567')).toBe('+998 90 123 45 67');
  });

  it('boshidagi 998 ni takrorlamaydi', () => {
    expect(formatPhoneInput('998901234567')).toBe('+998 90 123 45 67');
  });

  it('9 ta raqamdan ortig\'ini kesib tashlaydi', () => {
    expect(formatPhoneInput('9012345678999')).toBe('+998 90 123 45 67');
  });

  it('natijasi har doim to\'g\'ri formatda bo\'ladi', () => {
    expect(isValidPhone(formatPhoneInput('901234567'))).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('oddiy manzilni qabul qiladi', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('noto\'g\'ri manzillarni rad etadi', () => {
    expect(isValidEmail('user@example')).toBe(false);
    expect(isValidEmail('user example.com')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('qisqa parolni rad etadi', () => {
    expect(validatePassword('abc1')).toContain(String(PASSWORD_MIN_LENGTH));
  });

  it('faqat harfdan iborat parolni rad etadi', () => {
    expect(validatePassword('parolparol')).toBeTruthy();
  });

  it('faqat raqamdan iborat parolni rad etadi', () => {
    expect(validatePassword('12345678')).toBeTruthy();
  });

  it('harf va raqam aralash parolni qabul qiladi', () => {
    expect(validatePassword('parol123')).toBeNull();
  });

  it('juda uzun parolni rad etadi', () => {
    expect(validatePassword('a1'.repeat(50))).toBeTruthy();
  });
});

describe('validateEmail / validatePhoneNumber / validateFullName', () => {
  it('bo\'sh maydonlar uchun xabar qaytaradi', () => {
    expect(validateEmail('')).toBeTruthy();
    expect(validatePhoneNumber('')).toBeTruthy();
    expect(validateFullName('')).toBeTruthy();
  });

  it('to\'g\'ri qiymatlarda null qaytaradi', () => {
    expect(validateEmail('a@b.uz')).toBeNull();
    expect(validatePhoneNumber('+998 90 123 45 67')).toBeNull();
    expect(validateFullName('Aziz Karimov')).toBeNull();
  });

  it('bir harfli ismni rad etadi', () => {
    expect(validateFullName('A')).toBeTruthy();
  });
});
