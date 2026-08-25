import type { Organization } from '@/lib/supabase';

export const demoOrganizations: Organization[] = [
  { id: 'demo-clinic-12', name: '12-son Poliklinika', type: 'clinic', slug: 'clinic-12', prefix: 'P', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
  { id: 'demo-clinic-1', name: '1-son Poliklinika', type: 'clinic', slug: 'clinic-1', prefix: 'P', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
  { id: 'demo-bank-kapital', name: 'Kapitalbank', type: 'bank', slug: 'bank-kapital', prefix: 'B', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
  { id: 'demo-bank-hamkor', name: 'Hamkorbank', type: 'bank', slug: 'bank-hamkor', prefix: 'B', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
];

export type Step = 'type' | 'select' | 'details' | 'result';

export interface QueueResult {
  id: string;
  queue_number: string;
  status: string;
  estimated_wait_time: number;
  organization_name: string;
  organization_prefix: string;
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^\+998\d{9}$/.test(cleaned);
}

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
