/**
 * Unit tests for ProjectModal - Team Members User Selector
 *
 * These tests verify that the user list rendering handles all
 * possible API response shapes without "filteredUsers.map is not a function".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectModal } from '@/components/projects/ProjectModal';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/api-client', () => ({
  authenticatedFetch: jest.fn(),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ label, error, ...props }: any) => (
    <div>
      {label && <label htmlFor={props.id}>{label}</label>}
      <input {...props} />
      {error && <p className="text-red-600">{error}</p>}
    </div>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@heroicons/react/24/outline', () => ({
  PlusIcon: () => <svg data-testid="plus-icon" />,
  XMarkIcon: () => <svg data-testid="x-icon" />,
  MagnifyingGlassIcon: () => <svg data-testid="search-icon" />,
  CheckCircleIcon: () => <svg data-testid="circle-icon" />,
}));

jest.mock('@heroicons/react/24/solid', () => ({
  CheckCircleIcon: () => <svg data-testid="circle-solid-icon" />,
}));

const mockAuthenticatedFetch = jest.requireMock('@/lib/api-client')
  .authenticatedFetch as jest.Mock;

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
    status: ok ? 200 : 401,
  } as Response;
}

const noop = async () => {};

function renderModal(overrides = {}) {
  return render(
    <ProjectModal
      isOpen={true}
      onClose={jest.fn()}
      onSubmit={noop}
      isLoading={false}
      {...overrides}
    />
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ProjectModal - Team Members User Selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: return a valid clients response
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(
          createMockResponse({
            data: [
              { id: 'c1', clientName: 'ACME Corp' },
            ],
          })
        );
      }
      return Promise.resolve(createMockResponse({}));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── API returns map object { uid: name } (actual shape) ─────────────────

  it('renders user list when API returns object map { uid: name }', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(
        createMockResponse({
          user1: 'Alice',
          user2: 'Bob',
          user3: 'Charlie',
        })
      );
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  // ── API returns empty array ─────────────────────────────────────────────

  it('shows "No users found" when API returns empty array', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(createMockResponse([]));
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  // ── API returns empty object ────────────────────────────────────────────

  it('shows "No users found" when API returns empty object map', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(createMockResponse({}));
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  // ── API returns null ────────────────────────────────────────────────────

  it('shows "No users found" when API returns null', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(createMockResponse(null));
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  // ── API returns string (edge case) ──────────────────────────────────────

  it('shows "No users found" when API returns a string', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(createMockResponse('not-an-array'));
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  // ── API returns wrapped { data: [...] } ─────────────────────────────────

  it('handles API returning wrapped { data: [...] } array', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(
        createMockResponse({
          data: [
            { uid: 'u1', displayName: 'Alice', email: 'alice@test.com' },
            { uid: 'u2', displayName: 'Bob', email: 'bob@test.com' },
          ],
        })
      );
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  // ── Filter users by search ──────────────────────────────────────────────

  it('filters users when typing in search', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(
        createMockResponse({
          u1: 'Alice Johnson',
          u2: 'Bob Smith',
          u3: 'Charlie Brown',
        })
      );
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search team members...');
    await userEvent.type(searchInput, 'Bob');

    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
  });

  // ── Search matches nothing ──────────────────────────────────────────────

  it('shows "No users found" when search matches nothing', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(
        createMockResponse({
          u1: 'Alice',
          u2: 'Bob',
        })
      );
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search team members...');
    await userEvent.type(searchInput, 'Zzzz');

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  // ── Non-ok API response ─────────────────────────────────────────────────

  it('shows "No users found" when API returns 401', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(createMockResponse({ error: 'Unauthorized' }, false));
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  // ── User selection works ────────────────────────────────────────────────

  it('allows selecting and deselecting users', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(
        createMockResponse({
          u1: 'Alice',
          u2: 'Bob',
        })
      );
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Click Alice's checkbox
    const aliceCheckbox = screen.getByText('Alice')
      .closest('label')!
      .querySelector('input[type="checkbox"]')!;
    await userEvent.click(aliceCheckbox);

    // Alice should be checked
    expect(aliceCheckbox).toBeChecked();

    // Deselect
    await userEvent.click(aliceCheckbox);
    expect(aliceCheckbox).not.toBeChecked();
  });

  // ── Sequential open/close does not break ────────────────────────────────

  it('handles modal closing and reopening without crash', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve(createMockResponse({ data: [{ id: 'c1', clientName: 'ACME' }] }));
      }
      return Promise.resolve(
        createMockResponse({
          u1: 'Alice',
          u2: 'Bob',
        })
      );
    });

    const onClose = jest.fn();
    const { rerender } = render(
      <ProjectModal isOpen={true} onClose={onClose} onSubmit={noop} />
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Close modal
    rerender(<ProjectModal isOpen={false} onClose={onClose} onSubmit={noop} />);

    // Re-open modal
    rerender(<ProjectModal isOpen={true} onClose={onClose} onSubmit={noop} />);

    // Should render again without crash
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  // ── API fails entirely ──────────────────────────────────────────────────

  it('shows "No users found" when API throws', async () => {
    mockAuthenticatedFetch.mockRejectedValue(new Error('Network error'));

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });
});
