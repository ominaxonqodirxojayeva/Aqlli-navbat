import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import {
  isSupabaseConfigured,
  supabase,
  type CreatedQueue,
  type NavbatService,
  type Organization,
  type PublicOrgState,
} from '@/lib/supabase';
import { useMyQueue } from '@/lib/queue';
import { reportError } from '@/lib/errors';
import { validateFullName, validatePhoneNumber, normalizePhone } from '@/lib/validation';
import { TypeStep } from './get-queue/TypeStep';
import { SelectStep } from './get-queue/SelectStep';
import { ServiceStep } from './get-queue/ServiceStep';
import { DetailsStep } from './get-queue/DetailsStep';
import { ResultStep } from './get-queue/ResultStep';
import { demoOrganizations, demoServices, STEP_TITLES, type Step } from './get-queue/shared';

export function GetQueuePage() {
  const { profile } = useAuth();
  const { slug } = useParams<{ slug: string }>();

  const [step, setStep] = useState<Step>('type');
  const [orgType, setOrgType] = useState<'clinic' | 'bank' | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [services, setServices] = useState<NavbatService[]>([]);
  const [selectedService, setSelectedService] = useState<NavbatService | null>(null);
  const [orgState, setOrgState] = useState<PublicOrgState | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedQueue | null>(null);

  const { data: activeQueue, invalidate: invalidateMyQueue } = useMyQueue(profile?.id);

  // Profildan ism va telefonni oldindan to'ldiramiz
  useEffect(() => {
    if (profile?.full_name && !fullName) setFullName(profile.full_name);
    if (profile?.phone && !phone) setPhone(profile.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const loadServices = useCallback(async (orgId: string): Promise<NavbatService[]> => {
    if (!isSupabaseConfigured) {
      return demoServices.filter((s) => s.organization_id === orgId);
    }
    const { data, error } = await supabase
      .from('navbat_services')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      reportError('GetQueue.loadServices', error);
      return [];
    }
    return (data ?? []) as NavbatService[];
  }, []);

  const loadOrgState = useCallback(async (orgId: string) => {
    if (!isSupabaseConfigured) {
      setOrgState({ is_open: true, waiting_count: 0, serving_number: null });
      return;
    }
    const { data, error } = await supabase.rpc('get_public_org_state', { p_org_id: orgId });
    if (error) {
      reportError('GetQueue.loadOrgState', error);
      return;
    }
    const rows = (data ?? []) as PublicOrgState[];
    setOrgState(rows[0] ?? null);
  }, []);

  /** Tashkilot tanlangach: xizmatlarni yuklab, keyingi qadamni aniqlaydi. */
  const goToOrg = useCallback(
    async (org: Organization) => {
      setSelectedOrg(org);
      setSelectedService(null);
      const [orgServices] = await Promise.all([loadServices(org.id), loadOrgState(org.id)]);
      setServices(orgServices);
      setStep(orgServices.length > 0 ? 'service' : 'details');
    },
    [loadServices, loadOrgState]
  );

  // Tashkilotlarni yuklash (va /join/:slug bo'lsa darhol tanlash)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let orgs: Organization[];

      if (!isSupabaseConfigured) {
        orgs = demoOrganizations;
      } else {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) reportError('GetQueue.loadOrganizations', error);
        orgs = (data ?? []) as Organization[];
      }

      setOrganizations(orgs);

      if (slug) {
        const found = orgs.find((o) => o.slug === slug);
        if (found) {
          setOrgType(found.type as 'clinic' | 'bank');
          await goToOrg(found);
        }
      }
      setLoading(false);
    };
    void load();
  }, [slug, goToOrg]);

  const filteredOrgs = organizations.filter((org) => {
    if (orgType && org.type !== orgType) return false;
    if (search) return org.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const handleGetQueue = async () => {
    if (!profile?.id || !selectedOrg) return;

    const nameError = validateFullName(fullName);
    if (nameError) {
      setIssueError(nameError);
      return;
    }
    const phoneError = validatePhoneNumber(phone);
    if (phoneError) {
      setIssueError(phoneError);
      return;
    }

    setIssuing(true);
    setIssueError(null);

    try {
      if (!isSupabaseConfigured) {
        // Demo rejim — brauzer xotirasida raqam beramiz
        const key = `demo-queue-${selectedOrg.id}`;
        const nextNumber = Number(window.localStorage.getItem(key) ?? '0') + 1;
        window.localStorage.setItem(key, String(nextNumber));
        const prefix = selectedOrg.prefix ?? (orgType === 'bank' ? 'B' : 'P');
        setResult({
          id: `demo-queue-${Date.now()}`,
          queue_number: `${prefix}-${String(nextNumber).padStart(3, '0')}`,
          status: 'waiting',
          estimated_wait_time: 0,
          organization_name: selectedOrg.name,
          organization_prefix: prefix,
          service_name: selectedService?.name ?? null,
          people_ahead: 0,
        });
        setStep('result');
        return;
      }

      const { data, error } = await supabase.rpc('create_org_queue', {
        p_org_id: selectedOrg.id,
        p_user_id: profile.id,
        p_full_name: fullName.trim(),
        p_phone: normalizePhone(phone),
        p_service_id: selectedService?.id ?? null,
      });

      if (error) throw error;

      const created = (data as CreatedQueue[] | null)?.[0];
      if (!created) {
        setIssueError('Navbat yaratilmadi. Qaytadan urinib ko\'ring.');
        return;
      }

      setResult(created);
      setStep('result');
      await Promise.all([loadOrgState(selectedOrg.id), invalidateMyQueue()]);
    } catch (err) {
      // Bazadagi aniq xato kodlari (QUEUE_CLOSED, ACTIVE_QUEUE_EXISTS, ...)
      // foydalanuvchi tushunadigan matnga aylantiriladi.
      setIssueError(reportError('GetQueue.create', err, 'Navbat olishda xatolik yuz berdi.'));
    } finally {
      setIssuing(false);
    }
  };

  // Natija sahifasida tashkilot holatini yangilab turamiz
  useEffect(() => {
    if (step !== 'result' || !selectedOrg || !isSupabaseConfigured) return;

    const timer = window.setInterval(() => void loadOrgState(selectedOrg.id), 15000);
    return () => window.clearInterval(timer);
  }, [step, selectedOrg, loadOrgState]);

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
        <p className="text-navy-400 text-sm mt-1">{STEP_TITLES[step]}</p>
      </div>

      {activeQueue && step !== 'result' && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <AlertCircle className="w-5 h-5 text-warning-400 flex-shrink-0" />
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm text-white font-medium">
                Sizda faol navbat bor:{' '}
                <span className="text-electric-400">{activeQueue.queue_number}</span>
                {activeQueue.organization_name ? ` — ${activeQueue.organization_name}` : ''}
              </p>
              <p className="text-xs text-navy-400 mt-1">
                Bir vaqtda faqat bitta navbatda turish mumkin. Yangi navbat olish uchun avval
                joriysini bekor qiling.
              </p>
            </div>
            <Link to="/my-queue" className="btn-secondary text-sm">
              Mening navbatim
            </Link>
          </div>
        </Card>
      )}

      {step === 'type' && (
        <TypeStep
          onSelect={(type) => {
            setOrgType(type);
            setSearch('');
            setStep('select');
          }}
        />
      )}

      {step === 'select' && (
        <SelectStep
          orgType={orgType}
          search={search}
          onSearchChange={setSearch}
          filteredOrgs={filteredOrgs}
          onBack={() => setStep('type')}
          onSelectOrg={(org) => void goToOrg(org)}
        />
      )}

      {step === 'service' && selectedOrg && (
        <ServiceStep
          selectedOrg={selectedOrg}
          services={services}
          onBack={() => setStep(slug ? 'service' : 'select')}
          onSelectService={(service) => {
            setSelectedService(service);
            setStep('details');
          }}
          onSkip={() => {
            setSelectedService(null);
            setStep('details');
          }}
        />
      )}

      {step === 'details' && selectedOrg && (
        <DetailsStep
          selectedOrg={selectedOrg}
          selectedService={selectedService}
          hideBack={Boolean(slug) && services.length === 0}
          fullName={fullName}
          onFullNameChange={setFullName}
          phone={phone}
          onPhoneChange={setPhone}
          issueError={issueError}
          issuing={issuing}
          hasActiveQueue={Boolean(activeQueue)}
          queueClosed={orgState ? !orgState.is_open : false}
          onBack={() => setStep(services.length > 0 ? 'service' : 'select')}
          onSubmit={handleGetQueue}
        />
      )}

      {step === 'result' && result && selectedOrg && (
        <ResultStep
          result={result}
          selectedOrg={selectedOrg}
          servingQueue={orgState?.serving_number ?? null}
          peopleAhead={activeQueue?.people_ahead ?? result.people_ahead}
          estimatedWait={activeQueue?.estimated_wait_minutes ?? result.estimated_wait_time}
        />
      )}
    </DashboardLayout>
  );
}
