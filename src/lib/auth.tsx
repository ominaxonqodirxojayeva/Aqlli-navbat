import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { isSupabaseConfigured, supabase, type Profile, type UserRole } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const savedProfile = window.localStorage.getItem('aqlli-navbat-demo-profile');
      if (savedProfile) setProfile(JSON.parse(savedProfile) as Profile);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!cancelled) {
        setProfile(data as Profile | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const refreshProfile = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const savedProfile = window.localStorage.getItem('aqlli-navbat-demo-profile');
      const savedCredentials = window.localStorage.getItem('aqlli-navbat-demo-credentials');
      const credentials = savedCredentials ? JSON.parse(savedCredentials) as { email: string; password: string } : null;
      if (credentials?.email === email && credentials.password === password && savedProfile) {
        setProfile(JSON.parse(savedProfile) as Profile);
        return { error: null };
      }
      return { error: 'Email yoki parol noto\'g\'ri.' };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (!error) return { error: null };
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'Email manzilingizni tasdiqlang, keyin qayta kiring.' };
    }
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { error: 'Email yoki parol noto\'g\'ri.' };
    }
    return { error: error.message };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return { error: 'Email manzilini to\'g\'ri kiriting.' };
    }
    if (password.length !== 6) {
      return { error: 'Parol aynan 6 ta belgidan iborat bo\'lishi kerak.' };
    }
    const normalizedPhone = phone.replace(/[\s\-()]/g, '');
    if (!/^\+998\d{9}$/.test(normalizedPhone)) {
      return { error: 'Telefon raqamni to\'g\'ri kiriting: +998 XX XXX XX XX.' };
    }
    if (!isSupabaseConfigured) {
      const demoProfile: Profile = {
        id: `demo-${Date.now()}`,
        full_name: fullName.trim(),
        phone: normalizedPhone,
        email: email.trim().toLowerCase(),
        role: 'customer',
        created_at: new Date().toISOString(),
      };
      window.localStorage.setItem('aqlli-navbat-demo-profile', JSON.stringify(demoProfile));
      window.localStorage.setItem('aqlli-navbat-demo-credentials', JSON.stringify({ email: demoProfile.email, password }));
      setProfile(demoProfile);
      return { error: null };
    }
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { full_name: fullName.trim(), role: 'customer' as UserRole, phone: normalizedPhone } },
    });
    if (error) {
      if (error.code === 'weak_password') {
        return { error: 'Bu parol zaif yoki avval sizib chiqqan. Harf, raqam va belgilardan iborat yangi parol tanlang.' };
      }
      return { error: error.message };
    }
    if (data.user && !data.session) {
      return { error: 'Hisob yaratildi. Email manzilingizni tasdiqlang, keyin login qiling.' };
    }
    return { error: null };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    window.localStorage.removeItem('aqlli-navbat-demo-profile');
    window.localStorage.removeItem('aqlli-navbat-demo-credentials');
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
