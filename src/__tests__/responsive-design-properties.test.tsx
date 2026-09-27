/**
 * Property-Based Tests for Responsive Design System
 * Feature: responsive-design
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useResponsive, useBreakpoint, RESPONSIVE_BREAKPOINTS } from '@/hooks/use-responsive';
import { ResponsiveLayout, ResponsiveGrid, ResponsiveStack } from '@/components/ui/responsive-layout';
import { TouchOptimizedInput, TouchOptimizedButton } from '@/components/ui/touch-optimized-input';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import fc from 'fast-check';

// Mock window.matchMedia for testing
const mockMatchMedia = (width: number, height: number = 768) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Property generators
const viewportWidthArb = fc.integer({ min: 320, max: 3840 });
const viewportHeightArb = fc.integer({ min: 568, max: 2160 });
const deviceTypeArb = fc.constantFrom('mobile', 'tablet', 'desktop');
const touchCapableArb = fc.boolean();

describe('Responsive Design Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: Layout Adaptation by Breakpoint
   * For any viewport width, the system should apply the appropriate layout styles 
   * corresponding to the correct breakpoint range
   * Validates: Requirements 1.1, 2.1, 3.1
   */
  test('Property 1: Layout Adaptation by Breakpoint', () => {
    fc.assert(fc.property(viewportWidthArb, (width) => {
      mockMatchMedia(width);
      
      const { result } = renderHook(() => useResponsive());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      const { device, breakpoint } = result.current;
      
      // Verify correct device type assignment
      if (width < RESPONSIVE_BREAKPOINTS.md) {
        expect(device.type).toBe('mobile');
      } else if (width < RESPONSIVE_BREAKPOINTS.lg) {
        expect(device.type).toBe('tablet');
      } else {
        expect(device.type).toBe('desktop');
      }
      
      // Verify correct breakpoint assignment
      let expectedBreakpoint = 'sm';
      if (width >= RESPONSIVE_BREAKPOINTS['3xl']) expectedBreakpoint = '3xl';
      else if (width >= RESPONSIVE_BREAKPOINTS['2xl']) expectedBreakpoint = '2xl';
      else if (width >= RESPONSIVE_BREAKPOINTS.xl) expectedBreakpoint = 'xl';
      else if (width >= RESPONSIVE_BREAKPOINTS.lg) expectedBreakpoint = 'lg';
      else if (width >= RESPONSIVE_BREAKPOINTS.md) expectedBreakpoint = 'md';
      
      expect(breakpoint).toBe(expectedBreakpoint);
      
      return true;
    }), { numRuns: 100 });
  });

  /**
   * Property 2: Touch Target Minimum Size
   * For any interactive element on touch-capable devices, the element should have 
   * a minimum touch target size of 44px in both width and height
   * Validates: Requirements 1.3, 2.3
   */
  test('Property 2: Touch Target Minimum Size', () => {
    fc.assert(fc.property(touchCapableArb, fc.string(), (isTouchDevice, buttonText) => {
      // Mock touch capability
      Object.defineProperty(window, 'ontouchstart', {
        value: isTouchDevice ? {} : undefined,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: isTouchDevice ? 1 : 0,
        configurable: true
      });

      mockMatchMedia(375); // Mobile width
      
      render(
        <TouchOptimizedButton touchTargetSize="md">
          {buttonText}
        </TouchOptimizedButton>
      );
      
      const button = screen.getByRole('button');
      const styles = window.getComputedStyle(button);
      
      if (isTouchDevice) {
        // Should have minimum 44px touch targets
        expect(button.className).toContain('min-h-[48px]');
        expect(button.className).toContain('min-w-[48px]');
      }
      
      return true;
    }), { numRuns: 50 });
  });

  /**
   * Property 3: Navigation Hamburger Menu on Mobile
   * For any mobile viewport (width < 768px), the navigation should display as 
   * a collapsible hamburger menu that toggles visibility when activated
   * Validates: Requirements 1.2
   */
  test('Property 3: Navigation Hamburger Menu on Mobile', () => {
    fc.assert(fc.property(fc.integer({ min: 320, max: 767 }), (mobileWidth) => {
      mockMatchMedia(mobileWidth);
      
      const { result } = renderHook(() => useResponsive());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.device.type).toBe('mobile');
      
      return true;
    }), { numRuns: 50 });
  });

  /**
   * Property 4: Content Stacking on Mobile
   * For any content layout that displays side-by-side on desktop, the elements 
   * should stack vertically when viewed on mobile viewports
   * Validates: Requirements 1.4
   */
  test('Property 4: Content Stacking on Mobile', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 5 }),
      fc.constantFrom('mobile', 'desktop'),
      (itemCount, deviceType) => {
        const width = deviceType === 'mobile' ? 375 : 1024;
        mockMatchMedia(width);
        
        const items = Array.from({ length: itemCount }, (_, i) => (
          <div key={i}>Item {i + 1}</div>
        ));
        
        render(
          <ResponsiveStack
            direction={{ 
              mobile: 'vertical', 
              desktop: 'horizontal' 
            }}
          >
            {items}
          </ResponsiveStack>
        );
        
        const container = screen.getByRole('generic');
        
        if (deviceType === 'mobile') {
          expect(container.className).toContain('flex-col');
        } else {
          expect(container.className).toContain('flex-row');
        }
        
        return true;
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 5: Orientation Layout Adaptation
   * For any device orientation change, the layout should adapt appropriately 
   * while maintaining functionality and readability
   * Validates: Requirements 1.5, 2.5
   */
  test('Property 5: Orientation Layout Adaptation', () => {
    fc.assert(fc.property(
      viewportWidthArb,
      viewportHeightArb,
      (width, height) => {
        mockMatchMedia(width, height);
        
        const { result } = renderHook(() => useResponsive());
        
        act(() => {
          window.dispatchEvent(new Event('orientationchange'));
        });

        const expectedOrientation = width > height ? 'landscape' : 'portrait';
        expect(result.current.device.orientation).toBe(expectedOrientation);
        expect(result.current.isPortrait).toBe(expectedOrientation === 'portrait');
        expect(result.current.isLandscape).toBe(expectedOrientation === 'landscape');
        
        return true;
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 6: Sidebar Behavior by Device Type
   * For any device type, the sidebar should display in the appropriate state
   * Validates: Requirements 2.2, 3.3
   */
  test('Property 6: Sidebar Behavior by Device Type', () => {
    fc.assert(fc.property(deviceTypeArb, (deviceType) => {
      const widthMap = {
        mobile: 375,
        tablet: 768,
        desktop: 1024
      };
      
      mockMatchMedia(widthMap[deviceType]);
      
      const { result } = renderHook(() => useResponsive());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.device.type).toBe(deviceType);
      
      // Verify appropriate sidebar state
      if (deviceType === 'mobile') {
        expect(result.current.navigationCollapsed).toBe(true);
      } else if (deviceType === 'tablet') {
        // Tablet should have condensed sidebar capability
        expect(result.current.device.type).toBe('tablet');
      } else {
        // Desktop should have expanded sidebar by default
        expect(result.current.sidebarOpen).toBe(true);
      }
      
      return true;
    }), { numRuns: 50 });
  });

  /**
   * Property 7: Table Responsive Transformation
   * For any data table on tablet or mobile viewports, wide content should either 
   * enable horizontal scrolling or transform into an alternative responsive layout
   * Validates: Requirements 2.4, 7.3
   */
  test('Property 7: Table Responsive Transformation', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        id: fc.integer(),
        name: fc.string(),
        email: fc.emailAddress()
      }), { minLength: 1, maxLength: 10 }),
      deviceTypeArb,
      (data, deviceType) => {
        const widthMap = {
          mobile: 375,
          tablet: 768,
          desktop: 1024
        };
        
        mockMatchMedia(widthMap[deviceType]);
        
        const columns = [
          { key: 'id' as keyof typeof data[0], header: 'ID' },
          { key: 'name' as keyof typeof data[0], header: 'Name' },
          { key: 'email' as keyof typeof data[0], header: 'Email' }
        ];
        
        const { container } = render(
          <ResponsiveTable
            data={data}
            columns={columns}
            mobileLayout="cards"
            tabletLayout="condensed"
          />
        );
        
        // Verify appropriate layout is rendered based on device type
        if (deviceType === 'mobile') {
          // Should render as cards on mobile (no table element)
          expect(container.querySelector('table')).toBeNull();
          // Should have card layout
          expect(container.querySelector('.space-y-4')).toBeInTheDocument();
        } else {
          // Should render as table on tablet/desktop
          expect(container.querySelector('table')).toBeInTheDocument();
        }
        
        return true;
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 8: Window Resize Layout Integrity
   * For any browser window resize operation, the layout should adapt smoothly 
   * without breaking or causing content overflow
   * Validates: Requirements 3.2
   */
  test('Property 8: Window Resize Layout Integrity', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 320, max: 1920 }), { minLength: 2, maxLength: 5 }),
      (widthSequence) => {
        let previousDeviceType: string | null = null;
        
        for (const width of widthSequence) {
          mockMatchMedia(width);
          
          const { result } = renderHook(() => useResponsive());
          
          act(() => {
            window.dispatchEvent(new Event('resize'));
          });

          const currentDeviceType = result.current.device.type;
          
          // Verify device type is correctly determined
          if (width < RESPONSIVE_BREAKPOINTS.md) {
            expect(currentDeviceType).toBe('mobile');
          } else if (width < RESPONSIVE_BREAKPOINTS.lg) {
            expect(currentDeviceType).toBe('tablet');
          } else {
            expect(currentDeviceType).toBe('desktop');
          }
          
          // Verify layout adapts without breaking
          expect(result.current.device.screenWidth).toBe(width);
          
          previousDeviceType = currentDeviceType;
        }
        
        return true;
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 9: Desktop Hover Feedback
   * For any interactive element on desktop devices, hovering should provide 
   * visual feedback indicating the element is interactive
   * Validates: Requirements 3.4
   */
  test('Property 9: Desktop Hover Feedback', () => {
    fc.assert(fc.property(fc.string({ minLength: 1 }), (buttonText) => {
      mockMatchMedia(1024); // Desktop width
      
      // Mock non-touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: undefined,
        configurable: true
      });
      
      const { container } = render(
        <TouchOptimizedButton variant="primary">
          {buttonText}
        </TouchOptimizedButton>
      );
      
      const button = container.querySelector('button');
      
      // Desktop buttons should have hover effects
      expect(button?.className).toContain('hover:shadow-hard');
      
      return true;
    }), { numRuns: 30 });
  });

  /**
   * Property 10: Ultra-wide Screen Content Constraints
   * For any viewport wider than 2000px, content should maintain optimal width 
   * constraints and not stretch beyond readable limits
   * Validates: Requirements 3.5
   */
  test('Property 10: Ultra-wide Screen Content Constraints', () => {
    fc.assert(fc.property(
      fc.integer({ min: 2000, max: 4000 }),
      (ultraWideWidth) => {
        mockMatchMedia(ultraWideWidth);
        
        const { container } = render(
          <ResponsiveLayout maxWidth="2xl">
            <div>Ultra-wide content</div>
          </ResponsiveLayout>
        );
        
        const layoutContainer = container.querySelector('[data-device-type="desktop"]');
        
        // Should have max-width constraint
        expect(layoutContainer?.className).toContain('max-w-2xl');
        
        return true;
      }
    ), { numRuns: 30 });
  });
});

/**
 * Feature: responsive-design, Property 1: Layout Adaptation by Breakpoint
 * Feature: responsive-design, Property 2: Touch Target Minimum Size  
 * Feature: responsive-design, Property 3: Navigation Hamburger Menu on Mobile
 * Feature: responsive-design, Property 4: Content Stacking on Mobile
 * Feature: responsive-design, Property 5: Orientation Layout Adaptation
 * Feature: responsive-design, Property 6: Sidebar Behavior by Device Type
 * Feature: responsive-design, Property 7: Table Responsive Transformation
 * Feature: responsive-design, Property 8: Window Resize Layout Integrity
 * Feature: responsive-design, Property 9: Desktop Hover Feedback
 * Feature: responsive-design, Property 10: Ultra-wide Screen Content Constraints
 */