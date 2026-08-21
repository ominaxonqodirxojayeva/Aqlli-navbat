import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  PlusCircle,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Loader2,
  Search,
  Building2,
  Banknote,
  Hospital,
  User,
  Phone,
  Ticket,
  Clock,
  Users,
  Timer,
  Bell,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, EmptyState, Spinner, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase, type Organization, type NavbatQueue } from '@/lib/supabase';

const demoOrganizations: Organization[] = [
  { id: 'demo-clinic-12', name: '12-son Poliklinika', type: 'clinic', slug: 'clinic-12', prefix: 'P', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
  { id: 'demo-clinic-1', name: '1-son Poliklinika', type: 'clinic', slug: 'clinic-1', prefix: 'P', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
  { id: 'demo-bank-kapital', name: 'Kapitalbank', type: 'bank', slug: 'bank-kapital', prefix: 'B', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
  { id: 'demo-bank-hamkor', name: 'Hamkorbank', type: 'bank', slug: 'bank-hamkor', prefix: 'B', is_active: true, description: null, logo_url: null, created_at: new Date().toISOString() },
];

type Step = 'type' | 'select' | 'details' | 'result';

interface QueueResult {
  id: string;
  queue_number: string;
  status: string;
  estimated_wait_time: number;
  organization_name: string;
  organization_prefix: string;
}

export function GetQueuePage() {
  const { profile } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<Step>('type');
  const [orgType, setOrgType] = useState<'clinic' | 'bank' | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [activeQueue, setActiveQueue] = useState<NavbatQueue | null>(null);
  const [result, setResult] = useState<QueueResult | null>(null);
  const [servingQueue, setServingQueue] = useState<string | null>(null);
  const [peopleAhead, setPeopleAhead] = useState(0);

  // If navigated via /join/:slug, preselect org
  useEffect(() => {
    const init = async () => {
      if (slug) {
        if (!isSupabaseConfigured) {
          const demoOrg = demoOrganizations.find((organization) => organization.slug === slug);
          if (demoOrg) {
            setSelectedOrg(demoOrg);
            setOrgType(demoOrg.type as 'clinic' | 'bank');
            setStep('details');
          }
          return;
        }
        const { data } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (data) {
          const org = data as Organization;
          setSelectedOrg(org);
          setOrgType(org.type as 'clinic' | 'bank');
          setStep('details');
        }
      }
    };
    void init();
  }, [slug]);

  // Load organizations
  useEffect(() => {
    const loadOrgs = async () => {
      if (!isSupabaseConfigured) {
        setOrganizations(demoOrganizations);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setOrganizations((data ?? []) as Organization[]);
      setLoading(false);
    };
    void loadOrgs();
  }, []);

  // Check for active queue
  useEffect(() => {
    const checkActive = async () => {
      if (!profile?.id) return;
      if (!isSupabaseConfigured) {
        setActiveQueue(null);
        return;
      }
      const { data } = await supabase
        .from('navbat_queues')
        .select('*')
        .eq('user_id', profile.id)
        .in('status', ['waiting', 'serving'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      setActiveQueue(data as NavbatQueue | null);
    };
    void checkActive();
  }, [profile?.id]);

  const filteredOrgs = organizations.filter((org) => {
    if (orgType && org.type !== orgType) return false;
    if (search) {
      return org.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const handleSelectType = (type: 'clinic' | 'bank') => {
    setOrgType(type);
    setStep('select');
    setSearch('');
  };

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setStep('details');
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^\+998\d{9}$/.test(cleaned);
  };

  const formatPhoneInput = (value: string): string => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) digits = digits.slice(3);
    if (digits.length > 9) digits = digits.slice(0, 9);
    let formatted = '+998 ';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
    return formatted;
  };

  const handleGetQueue = async () => {
    if (!profile?.id || !selectedOrg) return;
    if (!fullName.trim()) {
      setIssueError('Ismingizni kiriting.');
      return;
    }
    if (!validatePhone(phone)) {
      setIssueError('Telefon raqamni to\'g\'ri kiriting: +998 XX XXX XX XX');
      return;
    }
    setIssuing(true);
    setIssueError(null);
    try {
      if (!isSupabaseConfigured) {
        const nextNumber = Number(window.localStorage.getItem(`demo-queue-${selectedOrg.id}`) ?? '0') + 1;
        window.localStorage.setItem(`demo-queue-${selectedOrg.id}`, String(nextNumber));
        const demoResult: QueueResult = {
          id: `demo-queue-${Date.now()}`,
          queue_number: `${selectedOrg.prefix ?? (orgType === 'bank' ? 'B' : 'P')}-${String(nextNumber).padStart(3, '0')}`,
          status: 'waiting',
          estimated_wait_time: 0,
          organization_name: selectedOrg.name,
          organization_prefix: selectedOrg.prefix ?? (orgType === 'bank' ? 'B' : 'P'),
        };
        setResult(demoResult);
        setStep('result');
        return;
      }
      const { data, error } = await supabase.rpc('create_org_queue', {
        p_org_id: selectedOrg.id,
        p_user_id: profile.id,
        p_full_name: fullName,
        p_phone: phone,
      });
      if (error) {
        if (error.message.includes('ACTIVE_QUEUE_EXISTS')) {
          setIssueError('Sizda bu tashkilotda faol navbat mavjud.');
        } else {
          setIssueError('Navbat olishda xatolik yuz berdi.');
        }
        return;
      }
      const r = (data as QueueResult[] | null)?.[0];
      if (r) {
        setResult(r);
        // Fetch serving queue and people ahead
        const { data: serving } = await supabase
          .from('navbat_queues')
          .select('queue_number')
          .eq('organization_id', selectedOrg.id)
          .eq('status', 'serving')
          .order('called_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setServingQueue(serving?.queue_number ?? null);

        const { count } = await supabase
          .from('navbat_queues')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', selectedOrg.id)
          .eq('status', 'waiting')
          .neq('id', r.id)
          .lt('created_at', new Date().toISOString());
        setPeopleAhead(count ?? 0);

        setStep('result');
      }
    } catch {
      setIssueError('Navbat olishda xatolik yuz berdi.');
    } finally {
      setIssuing(false);
    }
  };

  // Real-time for result page
  useEffect(() => {
    if (!isSupabaseConfigured || step !== 'result' || !result || !selectedOrg) return;
    const channel = supabase
      .channel(`result-${result.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'navbat_queues', filter: `id=eq.${result.id}` },
        async () => {
          // Reload serving + people ahead
          const { data: serving } = await supabase
            .from('navbat_queues')
            .select('queue_number')
            .eq('organization_id', selectedOrg.id)
            .eq('status', 'serving')
            .order('called_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setServingQueue(serving?.queue_number ?? null);

          const { count } = await supabase
            .from('navbat_queues')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', selectedOrg.id)
            .eq('status', 'waiting')
            .neq('id', result.id)
            .lt('created_at', new Date().toISOString());
          setPeopleAhead(count ?? 0);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'navbat_queues', filter: `id=eq.${result.id}` },
        (payload) => {
          const updated = payload.new as { status: string };
          if (updated.status === 'serving') {
            setResult((prev) => prev ? { ...prev, status: 'serving' } : prev);
          }
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [step, result?.id, selectedOrg?.id]);

  if (loading) {
    return (
      <DashboardLayout activePage="/get-queue" role="customer">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-electric-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="/get-queue" role="customer">
      <div className="mb-6">
        <Link to="/dashboard" className="btn-ghost inline-flex items-center gap-2 mb-2">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">Navbat olish</h1>
        <p className="text-navy-400 text-sm mt-1">
          {step === 'type' && 'Tashkilot turini tanlang'}
          {step === 'select' && 'Tashkilotni tanlang'}
          {step === 'details' && 'Ma\'lumotlaringizni kiriting'}
          {step === 'result' && 'Navbatingiz'}
        </p>
      </div>

      {/* Active queue warning */}
      {activeQueue && step !== 'result' && (
        <Card className="mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-warning-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">
                Sizda faol navbat mavjud: <span className="text-electric-400">{activeQueue.queue_number}</span>
              </p>
              <p className="text-xs text-navy-400 mt-1">
                Yangi navbat olish uchun avval joriy navbatni bekor qiling.
              </p>
            </div>
            <Link to="/my-queue" className="btn-secondary ml-auto text-sm">
              Mening navbatim
            </Link>
          </div>
        </Card>
      )}

      {/* Step: Type selection */}
      {step === 'type' && (
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-8">Qayerda navbat olmoqchisiz?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <button
              onClick={() => handleSelectType('clinic')}
              className="glass-card p-8 rounded-3xl card-hover group text-left animate-fade-in-up"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-500/20 to-electric-600/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Hospital className="w-8 h-8 text-electric-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Poliklinika</h3>
              <p className="text-sm text-navy-400 mb-6">Poliklinikada navbat oling</p>
              <span className="inline-flex items-center gap-2 text-electric-400 font-semibold text-sm">
                Poliklinikani tanlash
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>

            <button
              onClick={() => handleSelectType('bank')}
              className="glass-card p-8 rounded-3xl card-hover group text-left animate-fade-in-up animation-delay-100"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Banknote className="w-8 h-8 text-accent-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Bank</h3>
              <p className="text-sm text-navy-400 mb-6">Bankda navbat oling</p>
              <span className="inline-flex items-center gap-2 text-accent-400 font-semibold text-sm">
                Bankni tanlash
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step: Organization selection */}
      {step === 'select' && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep('type')} className="btn-ghost text-sm flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Orqaga
            </button>
            <Badge className="text-electric-500 bg-electric-500/10 border-electric-500/20">
              {orgType === 'clinic' ? '🏥 Poliklinika' : '🏦 Bank'}
            </Badge>
          </div>

          <h2 className="text-xl font-bold text-white mb-4">
            {orgType === 'clinic' ? 'Poliklinikani tanlang' : 'Bankni tanlang'}
          </h2>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
              placeholder={orgType === 'clinic' ? 'Poliklinika nomi yoki raqamini kiriting...' : 'Bank nomini kiriting...'}
              autoFocus
            />
          </div>

          {filteredOrgs.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Building2 className="w-8 h-8" />}
                title="Natija topilmadi"
                description="Qidiruv so'rovi bo'yicha tashkilot topilmadi"
              />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredOrgs.map((org, i) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className="glass-card p-5 rounded-2xl card-hover group text-left animate-fade-in-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      org.type === 'clinic'
                        ? 'bg-electric-500/10 text-electric-400'
                        : 'bg-accent-500/10 text-accent-400'
                    }`}>
                      {org.type === 'clinic' ? <Hospital className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold text-lg">{org.name}</h4>
                      {org.description && (
                        <p className="text-sm text-navy-400 mt-0.5">{org.description}</p>
                      )}
                      <p className="text-xs text-navy-500 mt-1">Prefix: {org.prefix}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-navy-500 group-hover:text-electric-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Details (name + phone) */}
      {step === 'details' && selectedOrg && (
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            {!slug && (
              <button onClick={() => setStep('select')} className="btn-ghost text-sm flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Orqaga
              </button>
            )}
          </div>

          <Card className="mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selectedOrg.type === 'clinic'
                  ? 'bg-electric-500/10 text-electric-400'
                  : 'bg-accent-500/10 text-accent-400'
              }`}>
                {selectedOrg.type === 'clinic' ? <Hospital className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-xs text-navy-400">Tanlangan tashkilot</p>
                <h3 className="text-lg font-bold text-white">{selectedOrg.name}</h3>
              </div>
            </div>
          </Card>

          {issueError && (
            <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center gap-3 animate-fade-in-up">
              <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0" />
              <p className="text-sm text-error-300">{issueError}</p>
            </div>
          )}

          <Card>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-navy-200 mb-2">Ismingiz</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field pl-11"
                    placeholder="Ismingizni kiriting"
                    defaultValue={profile?.full_name ?? ''}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-200 mb-2">Telefon raqamingiz</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    className="input-field pl-11"
                    placeholder="+998 __ ___ __ __"
                  />
                </div>
                <p className="text-xs text-navy-500 mt-1.5">Format: +998 XX XXX XX XX</p>
              </div>

              <button
                onClick={handleGetQueue}
                disabled={issuing || !!activeQueue}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {issuing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Navbat olinmoqda...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Navbat olish
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && result && selectedOrg && (
        <div className="max-w-2xl mx-auto">
          {result.status === 'serving' && (
            <div className="mb-6 p-6 rounded-2xl bg-electric-500/10 border border-electric-500/20 flex items-center gap-4 animate-fade-in-up">
              <div className="w-14 h-14 rounded-2xl bg-electric-500/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-7 h-7 text-electric-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-electric-300">Navbatingiz keldi!</h3>
                <p className="text-sm text-electric-200 mt-1">Iltimos, xizmat ko'rsatish joyiga boring.</p>
              </div>
            </div>
          )}

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-electric-500/5 blur-[60px]" />
            <div className="relative text-center py-8">
              <p className="text-sm text-navy-400 mb-3">Sizning navbatingiz</p>
              <h2 className="text-7xl sm:text-8xl font-extrabold text-white tracking-tight mb-4">
                {result.queue_number}
              </h2>
              <div className="inline-flex items-center gap-2 mb-8">
                {selectedOrg.type === 'clinic' ? (
                  <Hospital className="w-4 h-4 text-electric-400" />
                ) : (
                  <Banknote className="w-4 h-4 text-accent-400" />
                )}
                <span className="text-sm text-navy-300">{selectedOrg.name}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="glass p-4 rounded-xl">
                  <Clock className="w-5 h-5 text-electric-400 mx-auto mb-2" />
                  <p className="text-xs text-navy-400 mb-1">Hozir xizmatda</p>
                  <p className="text-lg font-bold text-electric-400">
                    {servingQueue ?? '—'}
                  </p>
                </div>
                <div className="glass p-4 rounded-xl">
                  <Users className="w-5 h-5 text-accent-400 mx-auto mb-2" />
                  <p className="text-xs text-navy-400 mb-1">Oldingizda</p>
                  <p className="text-lg font-bold text-accent-400">{peopleAhead} kishi</p>
                </div>
                <div className="glass p-4 rounded-xl">
                  <Timer className="w-5 h-5 text-warning-400 mx-auto mb-2" />
                  <p className="text-xs text-navy-400 mb-1">Taxminiy kutish</p>
                  <p className="text-lg font-bold text-warning-400">
                    {result.estimated_wait_time} daqiqa
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/my-queue" className="btn-primary flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  Navbatni kuzatish
                </Link>
                <Link to="/dashboard" className="btn-secondary">
                  Dashboard
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
