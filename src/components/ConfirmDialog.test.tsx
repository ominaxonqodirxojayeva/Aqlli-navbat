import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/components/ConfirmDialog';

function setup(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmDialog
      open
      title="Tashkilotni o'chirish"
      message="Rostdan ham o'chirmoqchimisiz?"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />
  );

  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('yopiq holatda hech narsa chizmaydi', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={false}
        title="Sarlavha"
        message="Matn"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sarlavha va matnni ko\'rsatadi', () => {
    setup();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Tashkilotni o\'chirish')).toBeInTheDocument();
    expect(screen.getByText('Rostdan ham o\'chirmoqchimisiz?')).toBeInTheDocument();
  });

  it('tasdiqlash tugmasi onConfirm ni chaqiradi', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup({ confirmLabel: 'O\'chirish' });

    await user.click(screen.getByRole('button', { name: 'O\'chirish' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('bekor qilish tugmasi onCancel ni chaqiradi', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup();

    await user.click(screen.getByRole('button', { name: 'Bekor qilish' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Escape tugmasi oynani yopadi', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('busy holatida tugmalar bloklanadi', () => {
    setup({ busy: true, confirmLabel: 'O\'chirish' });

    expect(screen.getByRole('button', { name: 'Bekor qilish' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajarilmoqda...' })).toBeDisabled();
  });
});
