import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getErrorLog, logError, reportError, translateError } from '@/lib/errors';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('translateError', () => {
  it('bazadagi xato kodini o\'zbekcha matnga aylantiradi', () => {
    const err = { message: 'ACTIVE_QUEUE_EXISTS', code: 'P0001' };
    expect(translateError(err)).toContain('faol navbat');
  });

  it('navbat yopiqligini tushuntiradi', () => {
    expect(translateError({ message: 'QUEUE_CLOSED' })).toContain('yopiq');
  });

  it('ruxsat yo\'qligini tushuntiradi', () => {
    expect(translateError({ message: 'NOT_AUTHORIZED' })).toContain('ruxsat');
  });

  it('Postgres kodlarini taniydi', () => {
    expect(translateError({ message: 'duplicate key', code: '23505' })).toContain('mavjud');
  });

  it('tarmoq xatosini alohida ko\'rsatadi', () => {
    expect(translateError({ message: 'Failed to fetch' })).toContain('Internet');
  });

  it('noma\'lum xatolar uchun zaxira matnni qaytaradi', () => {
    expect(translateError({ message: 'something odd' }, 'Zaxira matn')).toBe('Zaxira matn');
  });

  it('xato obyekt bo\'lmasa ham ishlaydi', () => {
    expect(translateError('shunchaki matn', 'Zaxira')).toBe('Zaxira');
    expect(translateError(null, 'Zaxira')).toBe('Zaxira');
  });
});

describe('logError', () => {
  it('xatoni jurnalda saqlaydi', () => {
    logError('test.context', new Error('sinov xatosi'));
    const log = getErrorLog();
    const last = log[log.length - 1];

    expect(last.context).toBe('test.context');
    expect(last.message).toBe('sinov xatosi');
    expect(console.error).toHaveBeenCalled();
  });

  it('jurnal cheksiz o\'smaydi', () => {
    for (let i = 0; i < 80; i++) logError('spam', new Error(`e${i}`));
    expect(getErrorLog().length).toBeLessThanOrEqual(50);
  });
});

describe('reportError', () => {
  it('ham loglaydi, ham tarjima qilingan matnni qaytaradi', () => {
    const message = reportError('ctx', { message: 'QUEUE_CLOSED' });
    expect(message).toContain('yopiq');
    expect(getErrorLog().some((e) => e.context === 'ctx')).toBe(true);
  });
});
