/**
 * The eye toggle on password fields is opt-in on `type === 'password'`.
 *
 * It lives in the shared Form/Input so every auth page gets it, which means a
 * mistake here switches a field to `text` uninvited (visible password) or drops
 * the toggle on a field that needs it. Both failure modes are silent in the UI.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/Form/Input';

describe('Input password reveal', () => {
  it('masks by default, reveals on toggle, and keeps the value', async () => {
    const user = userEvent.setup();
    render(<Input label="Current Password" name="currentPassword" type="password" defaultValue="hunter2" />);

    const field = screen.getByLabelText(/Current Password/) as HTMLInputElement;
    expect(field.type).toBe('password');
    expect(field.value).toBe('hunter2');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(field.type).toBe('text');
    expect(field.value).toBe('hunter2');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(field.type).toBe('password');
  });

  it('leaves non-password fields alone', () => {
    render(<Input label="Email Address" name="email" type="email" />);

    expect(screen.getByLabelText(/Email Address/)).toHaveAttribute('type', 'email');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('toggles each field independently', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Input label="New Password" name="newPassword" type="password" />
        <Input label="Confirm New Password" name="confirmNewPassword" type="password" />
      </>,
    );

    await user.click(screen.getAllByRole('button', { name: 'Show password' })[0]);

    expect(screen.getByLabelText('New Password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Confirm New Password')).toHaveAttribute('type', 'password');
  });
});
