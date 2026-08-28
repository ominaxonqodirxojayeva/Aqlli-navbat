import { describe, expect, it } from 'vitest';
import {
  formatMinutes,
  formatDate,
  formatTime,
  generateSlug,
  timeAgo,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_DOT_COLORS,
} from '@/lib/utils';
import type { QueueStatus } from '@/lib/supabase';

describe('formatMinutes', () => {
  it('nol va manfiy qiymatlarni "0 daqiqa" deb ko\'rsatadi', () => {
    expect(formatMinutes(0)).toBe('0 daqiqa');
    expect(formatMinutes(-5)).toBe('0 daqiqa');
  });

  it('bir daqiqadan kam vaqtni belgilaydi', () => {
    expect(formatMinutes(0.4)).toBe('<1 daqiqa');
  });

  it('bir soatdan kam vaqtni daqiqada beradi', () => {
    expect(formatMinutes(45)).toBe('45 daqiqa');
    expect(formatMinutes(45.6)).toBe('46 daqiqa');
  });

  it('butun soatlarni beradi', () => {
    expect(formatMinutes(120)).toBe('2 soat');
  });

  it('soat va qolgan daqiqalarni beradi', () => {
    expect(formatMinutes(125)).toBe('2 soat 5 daqiqa');
  });

  it('noto\'g\'ri qiymatlarda ham yiqilmaydi', () => {
    expect(formatMinutes(Number.NaN)).toBe('0 daqiqa');
    expect(formatMinutes(Number.POSITIVE_INFINITY)).toBe('0 daqiqa');
  });
});

describe('timeAgo', () => {
  it('hozirgi vaqt uchun "hozir" qaytaradi', () => {
    expect(timeAgo(new Date().toISOString())).toBe('hozir');
  });

  it('daqiqalarni hisoblaydi', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5 daqiqa oldin');
  });

  it('soatlarni hisoblaydi', () => {
    expect(timeAgo(new Date(Date.now() - 3 * 3600_000).toISOString())).toBe('3 soat oldin');
  });

  it('kunlarni hisoblaydi', () => {
    expect(timeAgo(new Date(Date.now() - 2 * 86400_000).toISOString())).toBe('2 kun oldin');
  });
});

describe('generateSlug', () => {
  it('bo\'shliqlarni defisga aylantiradi', () => {
    expect(generateSlug('12-son Poliklinika')).toBe('12-son-poliklinika');
  });

  it('apostrof va maxsus belgilarni olib tashlaydi', () => {
    expect(generateSlug("Ipak Yo'li Bank")).toBe('ipak-yoli-bank');
  });

  it('chetdagi va takroriy defislarni tozalaydi', () => {
    expect(generateSlug('  --Xalq   Banki--  ')).toBe('xalq-banki');
  });

  it('lotin bo\'lmagan belgilarni tashlab yuboradi', () => {
    expect(generateSlug('Bank №1')).toBe('bank-1');
  });
});

describe('sana formatlari', () => {
  const iso = '2026-03-15T09:05:00.000Z';

  it('formatDate sanani qaytaradi', () => {
    expect(formatDate(iso)).toMatch(/\d{2}/);
  });

  it('formatTime soat:daqiqa qaytaradi', () => {
    expect(formatTime(iso)).toMatch(/\d{1,2}[:.]\d{2}/);
  });
});

describe('holat jadvallari', () => {
  const statuses: QueueStatus[] = ['waiting', 'serving', 'completed', 'skipped', 'cancelled'];

  it('har bir holat uchun o\'zbekcha nom bor', () => {
    for (const status of statuses) {
      expect(STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('har bir holat uchun rang sinflari bor', () => {
    for (const status of statuses) {
      expect(STATUS_COLORS[status]).toBeTruthy();
      expect(STATUS_DOT_COLORS[status]).toBeTruthy();
    }
  });
});
