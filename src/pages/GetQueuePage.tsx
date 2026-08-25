import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase, type Organization, type NavbatQueue } from '@/lib/supabase';
import { TypeStep } from './get-queue/TypeStep';
import { SelectStep } from './get-queue/SelectStep';
import { DetailsStep } from './get-queue/DetailsStep';
import { ResultStep } from './get-queue/ResultStep';
import { demoOrganizations, validatePhone, type QueueResult, type Step } from './get-queue/shared';

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

      {step === 'type' && <TypeStep onSelect={handleSelectType} />}

      {step === 'select' && (
        <SelectStep
          orgType={orgType}
          search={search}
          onSearchChange={setSearch}
          filteredOrgs={filteredOrgs}
          onBack={() => setStep('type')}
          onSelectOrg={handleSelectOrg}
        />
      )}

      {step === 'details' && selectedOrg && (
        <DetailsStep
          selectedOrg={selectedOrg}
          hideBack={!!slug}
          fullName={fullName}
          onFullNameChange={setFullName}
          defaultFullName={profile?.full_name ?? ''}
          phone={phone}
          onPhoneChange={setPhone}
          issueError={issueError}
          issuing={issuing}
          activeQueue={activeQueue}
          onBack={() => setStep('select')}
          onSubmit={handleGetQueue}
        />
      )}

      {step === 'result' && result && selectedOrg && (
        <ResultStep
          result={result}
          selectedOrg={selectedOrg}
          servingQueue={servingQueue}
          peopleAhead={peopleAhead}
        />
      )}
    </DashboardLayout>
  );
}
