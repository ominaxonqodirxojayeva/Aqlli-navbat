import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { OrganizationMember, Profile } from '@/lib/supabase';

export interface AuthResult {
  /** Amal bajarilmadi — foydalanuvchiga qizil xabar ko'rsatiladi. */
  error: string | null;
  /** Amal bajarildi, lekin qo'shimcha qadam kerak (masalan emailni tasdiqlash). */
  notice: string | null;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Foydalanuvchi xodim bo'lgan tashkilotlar. */
  memberships: OrganizationMember[];
  /** Superadmin — barcha tashkilotlarni boshqaradi. */
  isSuperAdmin: boolean;
  /** Superadmin yoki biror tashkilotning xodimi. */
  isStaff: boolean;
  /** `'all'` — superadmin; aks holda boshqaruvdagi tashkilot id'lari. */
  managedOrgIds: 'all' | string[];
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth faqat <AuthProvider> ichida ishlatiladi');
  return ctx;
}
