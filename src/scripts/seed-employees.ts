/**
 * Script to seed initial employees in Firestore
 * Run this script to populate the employees collection with sample data
 */

import { employeeService } from '@/services/employee.service';
import { Employee } from '@/services/employee.service';

const sampleEmployees: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    employeeId: 'EMP001',
    name: 'John Smith',
    email: 'john.smith@company.com',
    phone: '+1-555-0101',
    role: 'Employee',
    status: 'active',
  },
  {
    employeeId: 'EMP002',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    phone: '+1-555-0102',
    role: 'Manager',
    status: 'active',
  },
  {
    employeeId: 'EMP003',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    phone: '+1-555-0103',
    role: 'Employee',
    status: 'active',
  },
  {
    employeeId: 'EMP004',
    name: 'Emily Davis',
    email: 'emily.davis@company.com',
    phone: '+1-555-0104',
    role: 'Admin',
    status: 'active',
  },
  {
    employeeId: 'EMP005',
    name: 'David Wilson',
    email: 'david.wilson@company.com',
    phone: '+1-555-0105',
    role: 'Employee',
    status: 'on-leave',
  },
];

async function seedEmployees() {
  console.log('Starting employee seeding...');
  
  try {
    for (const employee of sampleEmployees) {
      console.log(`Creating employee: ${employee.name}`);
      await employeeService.create(employee);
    }
    
    console.log('✅ Successfully seeded all employees!');
  } catch (error) {
    console.error('❌ Error seeding employees:', error);
    throw error;
  }
}

export { seedEmployees };

// Run the seed function if executed directly
if (require.main === module) {
  seedEmployees()
    .then(() => {
      console.log('Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
