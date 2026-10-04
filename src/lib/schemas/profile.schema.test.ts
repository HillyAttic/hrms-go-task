import { profileUpdateSchema } from './profile.schema';

const parse = (salary: unknown) =>
  profileUpdateSchema.safeParse({ displayName: 'Test User', salary });

describe('profileUpdateSchema salary', () => {
  it('accepts a numeric salary', () => {
    const result = parse(50000);
    expect(result.success).toBe(true);
    expect(result.success && result.data.salary).toBe(50000);
  });

  it('coerces the string a number input submits', () => {
    const result = parse('75000');
    expect(result.success && result.data.salary).toBe(75000);
  });

  // A cleared box means "leave my salary alone", not "set it to 0".
  it('drops an empty string instead of coercing it to 0', () => {
    const result = parse('');
    expect(result.success).toBe(true);
    expect(result.success && result.data.salary).toBeUndefined();
  });

  it('rejects a negative salary', () => {
    expect(parse(-1).success).toBe(false);
  });

  it('still strips admin-only fields', () => {
    const result = profileUpdateSchema.safeParse({
      displayName: 'Test User',
      role: 'admin',
      status: 'active',
      employeeId: 'EMP999',
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty('role');
    expect(result.success && result.data).not.toHaveProperty('employeeId');
  });
});
