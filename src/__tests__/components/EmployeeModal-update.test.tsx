/**
 * Regression test: clicking "Update Employee" must actually submit.
 *
 * Bug: employees whose stored record has no `employeeId` (the minimal profile
 * auto-created by verifyAuthToken on first login) fail client-side validation,
 * so handleSubmit never fires and the button silently does nothing.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmployeeModal } from '@/components/employees/EmployeeModal';
import { ModalProvider } from '@/contexts/modal-context';
import type { Employee } from '@/services/employee.service';

jest.mock('@/services/employee-document.service', () => ({
  uploadEmployeeDocument: jest.fn(),
  deleteEmployeeDocument: jest.fn(),
  deleteMultipleEmployeeDocuments: jest.fn(),
  validateDocumentFile: jest.fn(() => null),
  viewDocument: jest.fn(),
  formatFileSize: jest.fn(),
  DOCUMENT_LABELS: {},
}));

const baseEmployee: Employee = {
  id: 'Dxeszz55bCZfhxySFZCeylaiGNj1',
  employeeId: 'EMP011',
  name: 'HRMS Admin',
  firstName: 'HRMS',
  lastName: 'Admin',
  email: 'admin@hrms.com',
  phone: '9898989898',
  role: 'Admin',
  status: 'active',
};

const submit = async (employee: Employee) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  render(
    <ModalProvider>
      <EmployeeModal
        isOpen
        onClose={jest.fn()}
        onSubmit={onSubmit}
        employee={employee}
        isLoading={false}
      />
    </ModalProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Update Employee' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  return onSubmit.mock.calls[0][0];
};

describe('EmployeeModal — update submit', () => {
  it('submits a normal employee', async () => {
    const payload = await submit(baseEmployee);
    expect(payload.name).toBe('HRMS Admin');
    expect(payload.phone).toBe('9898989898');
  });

  // Regression: rows with no stored employeeId fall back to the Firebase UID, which
  // used to fail `.max(20)` on a hidden tab — the button silently did nothing.
  it('submits when employeeId is a raw Firebase UID (no EMP id stored)', async () => {
    const payload = await submit({
      ...baseEmployee,
      employeeId: 'Dxeszz55bCZfhxySFZCeylaiGNj1',
    });
    expect(payload.employeeId).toBe('Dxeszz55bCZfhxySFZCeylaiGNj1');
  });

  it('jumps to the tab holding the first invalid field', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <ModalProvider>
        <EmployeeModal
          isOpen
          onClose={jest.fn()}
          onSubmit={onSubmit}
          employee={{ ...baseEmployee, phone: '' }}
        />
      </ModalProvider>
    );

    // Start on Personal Info, then submit with an invalid phone on that tab.
    fireEvent.click(screen.getByRole('button', { name: 'Employment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update Employee' }));

    // Invalid submit must surface an error rather than look like a no-op.
    expect(await screen.findByText(/10 digits/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits when firstName/phone are missing but displayed values are filled in', async () => {
    const payload = await submit({ ...baseEmployee, firstName: '', lastName: undefined });
    expect(payload.name).toBe('HRMS Admin');
  });
});
