import { profileUpdateSchema } from '@/lib/schemas/profile.schema';

describe('profileUpdateSchema — self-service allowlist', () => {
  it('accepts the fields an employee is allowed to edit', () => {
    const result = profileUpdateSchema.safeParse({
      displayName: 'Rajeshwari',
      firstName: 'Rajeshwari',
      lastName: 'Patil',
      department: 'Finance',
      phoneNumber: '9876543210',
      dateOfJoining: '2024-01-15',
      workAnniversary: '2025-01-15',
      bankName: 'HDFC Bank',
      bankAccountNumber: '50100123456789',
      bankIfsc: 'HDFC0001234',
    });

    expect(result.success).toBe(true);
  });

  it.each(['salary', 'role', 'status', 'managerId', 'managerName', 'employeeId', 'email', 'isActive', 'permissions'])(
    'silently drops the admin-only field %s',
    (field) => {
      const result = profileUpdateSchema.safeParse({
        displayName: 'Rajeshwari',
        [field]: field === 'salary' ? 9999999 : 'admin',
      });

      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty(field);
    }
  );

  it('keeps documents, which the employee uploads themselves', () => {
    const result = profileUpdateSchema.safeParse({
      displayName: 'Rajeshwari',
      documents: { panCard: { url: 'https://example.com/pan.pdf', path: 'employees/u1/pan.pdf' } },
    });

    expect(result.success).toBe(true);
    expect(result.data?.documents?.panCard).toEqual({
      url: 'https://example.com/pan.pdf',
      path: 'employees/u1/pan.pdf',
    });
  });

  it('rejects a malformed IFSC and a non-10-digit phone', () => {
    expect(profileUpdateSchema.safeParse({ displayName: 'A', bankIfsc: 'not-an-ifsc' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ displayName: 'A', phoneNumber: '123' }).success).toBe(false);
  });
});
