import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  isSupabaseConfigured,
  supabase,
  type OrganizationMember,
  type Profile,
} from '@/lib/supabase';
import { AuthContext, type AuthContextValue, type AuthResult } from '@/lib/auth-context';
import { logError, translateError } from '@/lib/errors';
import {
  normalizePhone,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhoneNumber,
} from '@/lib/validation';
import type { Session, User } from '@supabase/supabase-js';

const DEMO_PROFILE_KEY = 'aqlli-navbat-demo-profile';
const DEMO_CREDENTIALS_KEY = 'aqlli-navbat-demo-credentials';

function fallbackProfileFromUser(user: User): Profile {
  return {
    id: user.id,
    full_name: String(user.user_metadata?.full_name ?? user.email ?? 'Foydalanuvchi'),
    phone: (user.user_metadata?.phone as string | undefined) ?? user.phone ?? null,
    email: user.email ?? null,
    role: 'customer',
    created_at: user.created_at,
  };
}

// Rol `profiles` jadvalidan (RLS bilan himoyalangan) olinadi, JWT metadata'dan
// emas — metadata ro'yxatdan o'tishda mijoz tomonidan boshqariladi va har kim
// o'zini admin deb e'lon qila olardi.
async function fetchProfile(user: User): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    // Ilgari bu xato jimgina yutilardi va foydalanuvchi sababsiz "customer"
    // bo'lib qolardi — endi hech bo'lmasa konsolda ko'rinadi.
    logError('auth.fetchProfile', error);
    return fallbackProfileFromUser(user);
  }
  if (!data) return fallbackProfileFromUser(user);

  return {
    id: data.id,
    full_name: data.full_name ?? user.email ?? 'Foydalanuvchi',
    phone: data.phone ?? null,
    email: data.email ?? user.email ?? null,
    role: String(data.role ?? '').toLowerCase() === 'admin' ? 'admin' : 'customer',
    created_at: data.created_at,
  };
}

async function fetchMemberships(userId: string): Promise<OrganizationMember[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, user_id, role, created_at')
    .eq('user_id', userId);

  if (error) {
    logError('auth.fetchMemberships', error);
    return [];
  }
  return (data ?? []) as OrganizationMember[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const savedProfile = window.localStorage.getItem(DEMO_PROFILE_KEY);
      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile) as Profile);
        } catch (err) {
          logError('auth.demoProfileParse', err);
          window.localStorage.removeItem(DEMO_PROFILE_KEY);
        }
      }
      setLoading(false);
      return;
    }

    let cancelled = false;

    const applySession = async (nextSession: Session | null) => {
      if (cancelled) return;
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setMemberships([]);
        setLoading(false);
        return;
      }

      const [nextProfile, nextMemberships] = await Promise.all([
        fetchProfile(nextSession.user),
        fetchMemberships(nextSession.user.id),
      ]);

      if (cancelled) return;
      setProfile(nextProfile);
      setMemberships(nextMemberships);
      setLoading(false);
    };

    void supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch((err) => {
        logError('auth.getSession', err);
        if (!cancelled) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      void applySession(sess);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const [nextProfile, nextMemberships] = await Promise.all([
      fetchProfile(session.user),
      fetchMemberships(session.user.id),
    ]);
    setProfile(nextProfile);
    setMemberships(nextMemberships);
  }, [session]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      const savedProfile = window.localStorage.getItem(DEMO_PROFILE_KEY);
      const savedCredentials = window.localStorage.getItem(DEMO_CREDENTIALS_KEY);
      try {
        const credentials = savedCredentials
          ? (JSON.parse(savedCredentials) as { email: string; password: string })
          : null;
        if (credentials?.email === normalizedEmail && credentials.password === password && savedProfile) {
          setProfile(JSON.parse(savedProfile) as Profile);
          return { error: null, notice: null };
        }
      } catch (err) {
        logError('auth.demoSignIn', err);
      }
      return { error: 'Email yoki parol noto\'g\'ri.', notice: null };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (!error) return { error: null, notice: null };

    const message = error.message.toLowerCase();
    if (message.includes('email not confirmed')) {
      return { error: 'Email manzilingiz hali tasdiqlanmagan. Pochtangizdagi havolani bosing.', notice: null };
    }
    if (message.includes('invalid login credentials')) {
      return { error: 'Email yoki parol noto\'g\'ri.', notice: null };
    }
    logError('auth.signIn', error);
    return { error: translateError(error, 'Kirishda xatolik yuz berdi.'), notice: null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, phone: string): Promise<AuthResult> => {
      const nameError = validateFullName(fullName);
      if (nameError) return { error: nameError, notice: null };

      const emailError = validateEmail(email);
      if (emailError) return { error: emailError, notice: null };

      const passwordError = validatePassword(password);
      if (passwordError) return { error: passwordError, notice: null };

      const phoneError = validatePhoneNumber(phone);
      if (phoneError) return { error: phoneError, notice: null };

      const normalizedPhone = normalizePhone(phone);
      const normalizedEmail = email.trim().toLowerCase();

      if (!isSupabaseConfigured) {
        const demoProfile: Profile = {
          id: `demo-${Date.now()}`,
          full_name: fullName.trim(),
          phone: normalizedPhone,
          email: normalizedEmail,
          role: 'customer',
          created_at: new Date().toISOString(),
        };
        window.localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(demoProfile));
        window.localStorage.setItem(
          DEMO_CREDENTIALS_KEY,
          JSON.stringify({ email: demoProfile.email, password })
        );
        setProfile(demoProfile);
        return { error: null, notice: null };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          // `role` bu yerda ataylab yuborilmaydi: rol faqat `profiles`
          // jadvalida saqlanadi va trigger orqali 'customer' qilib qo'yiladi.
          data: { full_name: fullName.trim(), phone: normalizedPhone },
        },
      });

      if (error) {
        if (error.code === 'weak_password') {
          return {
            error: 'Bu parol juda oddiy yoki avval sizib chiqqan. Boshqa parol tanlang.',
            notice: null,
          };
        }
        if (error.message.toLowerCase().includes('already registered')) {
          return { error: 'Bu email allaqachon ro\'yxatdan o\'tgan. Kirish sahifasidan foydalaning.', notice: null };
        }
        logError('auth.signUp', error);
        return { error: translateError(error, 'Ro\'yxatdan o\'tishda xatolik yuz berdi.'), notice: null };
      }

      // Email tasdiqlash yoqilgan bo'lsa sessiya darhol berilmaydi.
      if (data.user && !data.session) {
        return {
          error: null,
          notice: 'Hisobingiz yaratildi. Email manzilingizga yuborilgan havolani bosing, so\'ng tizimga kiring.',
        };
      }

      return { error: null, notice: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) logError('auth.signOut', error);
    }
    window.localStorage.removeItem(DEMO_PROFILE_KEY);
    window.localStorage.removeItem(DEMO_CREDENTIALS_KEY);
    setProfile(null);
    setSession(null);
    setMemberships([]);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isSuperAdmin = profile?.role === 'admin';
    const isStaff = isSuperAdmin || memberships.length > 0;

    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      memberships,
      isSuperAdmin,
      isStaff,
      managedOrgIds: isSuperAdmin ? 'all' : memberships.map((m) => m.organization_id),
      signIn,
      signUp,
      signOut,
      refreshProfile,
    };
  }, [session, profile, loading, memberships, signIn, signUp, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
