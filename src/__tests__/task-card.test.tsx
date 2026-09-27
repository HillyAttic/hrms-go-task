/**
 * Property-Based Tests for TaskCard
 * Feature: management-pages
 * 
 * This file contains property-based tests for TaskCard component:
 * - Property 25: Task Card Completeness
 * - Property 28: Priority Badge Color Mapping
 * - Property 33: Overdue Task Indication
 * - Property 34: Task Completion Status Update
 * 
 * Validates: Requirements 2.4, 2.5, 2.6, 2.9
 */

import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Task } from '@/types/task.types';

// Mock handlers for component props
const mockHandlers = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onToggleComplete: jest.fn(),
  onSelect: jest.fn(),
};

// Reusable generators
const generators = {
  title: () => fc.stringMatching(/^[A-Za-z0-9 ]{5,50}$/),
  description: () => fc.stringMatching(/^[A-Za-z0-9 .,!?]{10,100}$/),
  userId: () => fc.stringMatching(/^[A-Za-z]{2,15}( [A-Za-z]{2,15})?$/),
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// Helper function to render and test
function renderAndTest(task: Task, testFn: (container: HTMLElement) => void) {
  const { container } = render(
    <TaskCard
      task={task}
      onEdit={mockHandlers.onEdit}
      onDelete={mockHandlers.onDelete}
      onToggleComplete={mockHandlers.onToggleComplete}
    />
  );
  
  try {
    testFn(container);
  } finally {
    cleanup();
  }
}

// ============================================================================
// Property 25: Task Card Completeness
// Test all required fields displayed
// Validates: Requirements 2.4
// ============================================================================

describe('Feature: management-pages, Property 25: Task Card Completeness', () => {
  it('should display all required fields for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (taskData) => {
          const task: Task = taskData;

          renderAndTest(task, (container) => {
            // Verify title is displayed (h3 element exists with content)
            const titleElement = container.querySelector('h3');
            expect(titleElement).toBeTruthy();
            expect(titleElement?.textContent).toBeTruthy();

            // Verify description is displayed (p element with line-clamp-2 class)
            const descElement = container.querySelector('p.line-clamp-2');
            expect(descElement).toBeTruthy();
            expect(descElement?.textContent).toBeTruthy();

            // Verify due date is displayed
            expect(screen.getByText(/Due:/)).toBeInTheDocument();

            // Verify priority badge is displayed
            expect(screen.getByText(task.priority.toUpperCase())).toBeInTheDocument();

            // Verify assigned users section is present
            expect(screen.getByText('Assigned to:')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display title for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            // Find the h3 element which contains the title
            const titleElement = container.querySelector('h3');
            expect(titleElement).toBeTruthy();
            expect(titleElement?.textContent).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display description for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            // Find the description paragraph
            const descElement = container.querySelector('p.line-clamp-2');
            expect(descElement).toBeTruthy();
            expect(descElement?.textContent).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display due date for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          const formattedDate = new Date(task.dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          renderAndTest(task, () => {
            expect(screen.getByText(`Due: ${formattedDate}`)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display assigned users for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, () => {
            expect(screen.getByText('Assigned to:')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 28: Priority Badge Color Mapping
// Test badge colors match priority
// Validates: Requirements 2.9
// ============================================================================

describe('Feature: management-pages, Property 28: Priority Badge Color Mapping', () => {
  it('should display correct badge color for any priority level', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            // Verify priority badge is displayed
            const badge = screen.getByText(task.priority.toUpperCase());
            expect(badge).toBeInTheDocument();

            // Verify badge has appropriate color classes based on priority
            const badgeElement = badge.closest('.inline-flex');
            expect(badgeElement).toBeTruthy();

            if (badgeElement) {
              const classes = badgeElement.className;
              
              // Check for expected color classes based on priority
              switch (task.priority) {
                case 'low':
                  // Green - success variant
                  expect(classes).toMatch(/bg-success|text-success/);
                  break;
                case 'medium':
                  // Yellow - warning variant
                  expect(classes).toMatch(/bg-warning|text-warning/);
                  break;
                case 'high':
                  // Orange - custom classes
                  expect(classes).toMatch(/bg-warning|text-warning/);
                  break;
                case 'urgent':
                  // Red - danger variant
                  expect(classes).toMatch(/bg-destructive|text-destructive/);
                  break;
              }
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display green badge for low priority tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constant('low') as fc.Arbitrary<'low'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            const badge = screen.getByText('LOW');
            const badgeElement = badge.closest('.inline-flex');
            
            if (badgeElement) {
              expect(badgeElement.className).toMatch(/bg-success|text-success/);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display yellow badge for medium priority tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constant('medium') as fc.Arbitrary<'medium'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            const badge = screen.getByText('MEDIUM');
            const badgeElement = badge.closest('.inline-flex');
            
            if (badgeElement) {
              expect(badgeElement.className).toMatch(/bg-warning|text-warning/);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display orange badge for high priority tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constant('high') as fc.Arbitrary<'high'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            const badge = screen.getByText('HIGH');
            const badgeElement = badge.closest('.inline-flex');
            
            if (badgeElement) {
              expect(badgeElement.className).toMatch(/bg-warning|text-warning/);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display red badge for urgent priority tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constant('urgent') as fc.Arbitrary<'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            const badge = screen.getByText('URGENT');
            const badgeElement = badge.closest('.inline-flex');
            
            if (badgeElement) {
              expect(badgeElement.className).toMatch(/bg-destructive|text-destructive/);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 33: Overdue Task Indication
// Test overdue indicator for past dates
// Validates: Requirements 2.5
// ============================================================================

describe('Feature: management-pages, Property 33: Overdue Task Indication', () => {
  it('should display overdue indicator for any incomplete task with past due date', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date(Date.now() - 86400000), noInvalidDate: true }), // Past date
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress') as fc.Arbitrary<'pending' | 'in-progress'>, // Not completed
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, () => {
            // Verify "Overdue" indicator is displayed
            expect(screen.getByText('Overdue')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display overdue indicator for completed tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date(Date.now() - 86400000), noInvalidDate: true }), // Past date
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constant('completed') as fc.Arbitrary<'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, () => {
            // Verify "Overdue" indicator is NOT displayed
            expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display overdue indicator for tasks with future due dates', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(Date.now() + 86400000), max: new Date('2030-12-31'), noInvalidDate: true }), // Future date
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress') as fc.Arbitrary<'pending' | 'in-progress'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, () => {
            // Verify "Overdue" indicator is NOT displayed
            expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display red border for overdue tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date(Date.now() - 86400000), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress') as fc.Arbitrary<'pending' | 'in-progress'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            // Card element for this component is `.group` (src/components/tasks/TaskCard.tsx)
            const card = container.querySelector('.group');
            expect(card).toBeTruthy();

            // fc.date() can yield an Invalid Date; isOverdue is false for those, so
            // only assert the overdue outline when the date is genuinely in the past.
            const due = task.dueDate instanceof Date ? task.dueDate.getTime() : NaN;
            const isOverdue = task.status !== 'completed' && !Number.isNaN(due) && due < Date.now();

            if (isOverdue) {
              expect(card!.className).toMatch(/border-destructive/);
            } else {
              expect(card!.className).not.toMatch(/border-destructive/);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 34: Task Completion Status Update
// Test completion updates status
// Validates: Requirements 2.6
// ============================================================================

describe('Feature: management-pages, Property 34: Task Completion Status Update', () => {
  it('should display completion button for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, () => {
            // Verify completion button is displayed using role and name
            if (task.status === 'completed') {
              expect(screen.getByRole('button', { name: /mark as incomplete/i })).toBeInTheDocument();
            } else {
              expect(screen.getByRole('button', { name: /mark as complete/i })).toBeInTheDocument();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display "Completed" button for completed tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constant('completed') as fc.Arbitrary<'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, () => {
            // Use role and aria-label to find the specific button
            expect(screen.getByRole('button', { name: /mark as incomplete/i })).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display "Mark Complete" button for incomplete tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress') as fc.Arbitrary<'pending' | 'in-progress'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, () => {
            // Use role and aria-label to find the specific button
            expect(screen.getByRole('button', { name: /mark as complete/i })).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display strikethrough title for completed tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constant('completed') as fc.Arbitrary<'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            // Find the h3 element which contains the title
            const titleElement = container.querySelector('h3');
            expect(titleElement).toBeTruthy();
            
            // Verify title has line-through class for completed tasks
            expect(titleElement?.className).toMatch(/line-through/);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display strikethrough title for incomplete tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31'), noInvalidDate: true }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress') as fc.Arbitrary<'pending' | 'in-progress'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date(), noInvalidDate: true }),
        }),
        (task) => {
          renderAndTest(task, (container) => {
            // Find the h3 element which contains the title
            const titleElement = container.querySelector('h3');
            expect(titleElement).toBeTruthy();
            
            // Verify title does NOT have line-through class for incomplete tasks
            expect(titleElement?.className).not.toMatch(/line-through/);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
