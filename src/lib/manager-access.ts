import { adminDb } from '@/lib/firebase-admin';

/**
 * Which employees a user is allowed to see payroll data for.
 * Admins: everyone with an employee/manager role. Managers: their manager-hierarchies
 * doc. Everyone else: nobody.
 */
export async function getAccessibleEmployeeIds(userId: string, role: string): Promise<string[]> {
  if (role === 'admin') {
    const snapshot = await adminDb
      .collection('users')
      .where('role', 'in', ['employee', 'manager'])
      .get();
    return snapshot.docs.map((doc) => doc.id);
  }

  if (role === 'manager') {
    const snapshot = await adminDb
      .collection('manager-hierarchies')
      .where('managerId', '==', userId)
      .limit(1)
      .get();
    if (snapshot.empty) return [];
    return (snapshot.docs[0].data().employeeIds as string[]) ?? [];
  }

  return [];
}

export async function hasAccessToEmployee(
  userId: string,
  role: string,
  targetEmployeeId: string
): Promise<boolean> {
  if (role === 'admin') return true;
  if (role !== 'manager') return false;
  const ids = await getAccessibleEmployeeIds(userId, role);
  return ids.includes(targetEmployeeId);
}
