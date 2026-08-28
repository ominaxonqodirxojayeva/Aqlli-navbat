import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceStep } from './ServiceStep';
import type { NavbatService, Organization } from '@/lib/supabase';

const org: Organization = {
  id: 'org-1',
  name: '12-son Poliklinika',
  type: 'clinic',
  slug: 'clinic-12',
  prefix: 'P',
  is_active: true,
  description: null,
  logo_url: null,
  created_at: new Date().toISOString(),
};

function makeService(overrides: Partial<NavbatService> = {}): NavbatService {
  return {
    id: 'svc-1',
    organization_id: org.id,
    name: 'Terapevt qabuli',
    description: 'Umumiy ko\'rik',
    average_time: 10,
    prefix: 'P',
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('ServiceStep', () => {
  it('xizmatlar ro\'yxatini ko\'rsatadi', () => {
    render(
      <ServiceStep
        selectedOrg={org}
        services={[makeService(), makeService({ id: 'svc-2', name: 'Analiz topshirish', average_time: 5 })]}
        onBack={vi.fn()}
        onSelectService={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByText('Terapevt qabuli')).toBeInTheDocument();
    expect(screen.getByText('Analiz topshirish')).toBeInTheDocument();
    expect(screen.getByText(/Taxminan 10 daqiqa/)).toBeInTheDocument();
  });

  it('xizmat tanlanganda onSelectService chaqiriladi', async () => {
    const user = userEvent.setup();
    const onSelectService = vi.fn();
    const service = makeService();

    render(
      <ServiceStep
        selectedOrg={org}
        services={[service]}
        onBack={vi.fn()}
        onSelectService={onSelectService}
        onSkip={vi.fn()}
      />
    );

    await user.click(screen.getByText('Terapevt qabuli'));

    expect(onSelectService).toHaveBeenCalledWith(service);
  });

  it('xizmatni tanlamasdan davom etish mumkin', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();

    render(
      <ServiceStep
        selectedOrg={org}
        services={[makeService()]}
        onBack={vi.fn()}
        onSelectService={vi.fn()}
        onSkip={onSkip}
      />
    );

    await user.click(screen.getByRole('button', { name: /umumiy navbatga yozing/i }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('xizmatlar yo\'q bo\'lsa davom etish tugmasini ko\'rsatadi', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();

    render(
      <ServiceStep
        selectedOrg={org}
        services={[]}
        onBack={vi.fn()}
        onSelectService={vi.fn()}
        onSkip={onSkip}
      />
    );

    expect(screen.getByText('Xizmatlar sozlanmagan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Davom etish' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('orqaga tugmasi ishlaydi', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <ServiceStep
        selectedOrg={org}
        services={[makeService()]}
        onBack={onBack}
        onSelectService={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /orqaga/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
