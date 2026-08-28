import type { NavbatService, Organization } from '@/lib/supabase';

/** Supabase sozlanmagan bo'lsa (demo rejim) ko'rsatiladigan tashkilotlar. */
export const demoOrganizations: Organization[] = [
  { id: 'demo-clinic-12', name: '12-son Poliklinika', type: 'clinic', slug: 'clinic-12', prefix: 'P', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
  { id: 'demo-clinic-1', name: '1-son Poliklinika', type: 'clinic', slug: 'clinic-1', prefix: 'P', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
  { id: 'demo-bank-kapital', name: 'Kapitalbank', type: 'bank', slug: 'bank-kapital', prefix: 'B', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
  { id: 'demo-bank-hamkor', name: 'Hamkorbank', type: 'bank', slug: 'bank-hamkor', prefix: 'B', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
];

export const demoServices: NavbatService[] = [
  { id: 'demo-service-1', organization_id: 'demo-clinic-12', name: 'Terapevt qabuli', description: 'Umumiy ko\'rik', average_time: 10, prefix: 'P', is_active: true, created_at: new Date().toISOString() },
  { id: 'demo-service-2', organization_id: 'demo-clinic-12', name: 'Analiz topshirish', description: 'Qon va siydik tahlili', average_time: 5, prefix: 'P', is_active: true, created_at: new Date().toISOString() },
  { id: 'demo-service-3', organization_id: 'demo-bank-kapital', name: 'Plastik karta', description: 'Karta ochish va olish', average_time: 8, prefix: 'B', is_active: true, created_at: new Date().toISOString() },
];

/** Navbat olish sehrgarining qadamlari. */
export type Step = 'type' | 'select' | 'service' | 'details' | 'result';

export const STEP_TITLES: Record<Step, string> = {
  type: 'Tashkilot turini tanlang',
  select: 'Tashkilotni tanlang',
  service: 'Kerakli xizmatni tanlang',
  details: 'Ma\'lumotlaringizni kiriting',
  result: 'Navbatingiz',
};
