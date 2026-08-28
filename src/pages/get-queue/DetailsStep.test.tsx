import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetailsStep } from './DetailsStep';
import type { Organization } from '@/lib/supabase';

const org: Organization = {
  id: 'org-1',
  name: 'Kapitalbank',
  type: 'bank',
  slug: 'bank-kapital',
  prefix: 'B',
  is_active: true,
  description: null,
  logo_url: null,
  created_at: new Date().toISOString(),
};

type Props = React.ComponentProps<typeof DetailsStep>;

function renderStep(overrides: Partial<Props> = {}) {
  const props: Props = {
    selectedOrg: org,
    selectedService: null,
    hideBack: false,
    fullName: 'Aziz Karimov',
    onFullNameChange: vi.fn(),
    phone: '+998 90 123 45 67',
    onPhoneChange: vi.fn(),
    issueError: null,
    issuing: false,
    hasActiveQueue: false,
    queueClosed: false,
    onBack: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };

  render(<DetailsStep {...props} />);
  return props;
}

describe('DetailsStep', () => {
  it('tanlangan tashkilotni ko\'rsatadi', () => {
    renderStep();
    expect(screen.getByText('Kapitalbank')).toBeInTheDocument();
  });

  it('telefon raqamni kiritish paytida formatlaydi', async () => {
    const user = userEvent.setup();
    const onPhoneChange = vi.fn();
    renderStep({ phone: '', onPhoneChange });

    await user.type(screen.getByLabelText('Telefon raqamingiz'), '9');

    // "9" kiritilganda darhol +998 prefiksi qo'shiladi
    expect(onPhoneChange).toHaveBeenCalledWith('+998 9');
  });

  it('navbat yopiq bo\'lsa ogohlantiradi va tugmani bloklaydi', () => {
    renderStep({ queueClosed: true });

    expect(screen.getByText(/navbat qabuli hozircha yopiq/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /navbat olish/i })).toBeDisabled();
  });

  it('faol navbat bo\'lsa tugma bloklanadi', () => {
    renderStep({ hasActiveQueue: true });
    expect(screen.getByRole('button', { name: /navbat olish/i })).toBeDisabled();
  });

  it('xatolik matnini ko\'rsatadi', () => {
    renderStep({ issueError: 'Telefon raqamni to\'g\'ri kiriting' });
    expect(screen.getByText('Telefon raqamni to\'g\'ri kiriting')).toBeInTheDocument();
  });

  it('yuborilayotganda holatni bildiradi', () => {
    renderStep({ issuing: true });
    expect(screen.getByRole('button', { name: /navbat olinmoqda/i })).toBeDisabled();
  });

  it('tanlangan xizmatni ko\'rsatadi', () => {
    renderStep({
      selectedService: {
        id: 'svc-1',
        organization_id: org.id,
        name: 'Plastik karta',
        description: null,
        average_time: 8,
        prefix: 'B',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    });

    expect(screen.getByText(/Plastik karta/)).toBeInTheDocument();
  });

  it('hideBack bo\'lsa orqaga tugmasi ko\'rinmaydi', () => {
    renderStep({ hideBack: true });
    expect(screen.queryByRole('button', { name: /orqaga/i })).not.toBeInTheDocument();
  });
});
