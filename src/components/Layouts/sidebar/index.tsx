"use client";


import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { useAuthEnhanced } from "@/hooks/use-auth-enhanced";
import { authenticatedFetch } from "@/lib/api-client";

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, isTablet, isDesktop, toggleSidebar, variant } = useSidebarContext();
  const { device, isTouchDevice } = useResponsive();
  const { hasRole, user } = useAuthEnhanced();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<string[]>(
    NAV_DATA.filter((s) => s.label !== 'MAIN MENU').map((s) => s.label)
  );
  const [misConfig, setMisConfig] = useState<any>(null);
  const [misConfigLoaded, setMisConfigLoaded] = useState(false);
  const [isExclusivityLocked, setIsExclusivityLocked] = useState(true);

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));
  };

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [pathname, isMobile]);

  // Fetch MIS config for dynamic visibility
  useEffect(() => {
    if (user && !misConfigLoaded) {
      authenticatedFetch('/api/mis-config')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setMisConfig(data.data);
          }
          setMisConfigLoaded(true);
        })
        .catch((err) => {
          console.error('Error fetching MIS config:', err);
          setMisConfigLoaded(true);
        });
    }
  }, [user, misConfigLoaded]);

  useEffect(() => {
    // Keep collapsible open when its subpage is active
    NAV_DATA.some((section) => {
      return section.items.some((item) => {
        if (item.items && item.items.length > 0) {
          return item.items.some((subItem: any) => {
            if (subItem.url === pathname) {
              if (!expandedItems.includes(item.title)) {
                toggleExpanded(item.title);
              }
              return true;
            }
            return false;
          });
        }
        return false;
      });
    });
  }, [pathname]);

  // Touch gesture handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0];
      const deltaX = currentTouch.clientX - startX;
      
      // Swipe right to open, swipe left to close
      if (deltaX > 50 && !isOpen) {
        setIsOpen(true);
        document.removeEventListener('touchmove', handleTouchMove);
      } else if (deltaX < -50 && isOpen) {
        setIsOpen(false);
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    setTimeout(() => document.removeEventListener('touchmove', handleTouchMove), 300);
  };

  const getSidebarWidth = () => {
    if (variant === 'mobile') return isOpen ? 'w-full' : 'w-0';
    if (variant === 'tablet') return isOpen ? 'w-64' : 'w-0';
    return isOpen ? 'w-[290px]' : 'w-0';
  };

  const getSidebarClasses = () => {
    const baseClasses = "overflow-hidden border-r border-gray-100 bg-white text-dark transition-all duration-200 ease-in-out dark:border-white/[0.06] dark:bg-[#1c1c1e]";
    
    if (variant === 'mobile') {
      return cn(
        baseClasses,
        "fixed bottom-0 top-0 z-50 max-w-[290px]",
        getSidebarWidth()
      );
    }
    
    if (variant === 'tablet') {
      return cn(
        baseClasses,
        "sticky top-0 h-screen",
        getSidebarWidth()
      );
    }
    
    return cn(
      baseClasses,
      "sticky top-0 h-screen max-w-[290px]",
      getSidebarWidth()
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          onTouchStart={handleTouchStart}
          aria-hidden="true"
        />
      )}

      <aside
        className={getSidebarClasses()}
        aria-label="Main navigation"
        aria-hidden={!isOpen && variant !== 'tablet'}
        inert={!isOpen && variant !== 'tablet'}
        onTouchStart={handleTouchStart}
      >
        <div className="flex h-full flex-col py-6 pl-6 pr-2 md:py-10 md:pl-[25px] md:pr-[7px]">
          {/* Header */}
          <div className="relative pr-4.5">
            {/* Tablet open button - shown when sidebar is closed */}
            {isTablet && !isOpen && (
              <button
                onClick={toggleSidebar}
                className={cn(
                  "absolute right-4.5 top-1/2 -translate-y-1/2",
                  // Touch-optimized sizing
                  "min-h-[44px] min-w-[44px] flex items-center justify-center"
                )}
                aria-label="Open Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>

          {/* Logo - edVenture branding (light/dark) */}
          <div className="px-3.5" style={{ marginBottom: '-0.5rem' }}>
            {/* Light mode logo */}
            <img
              src="/images/branding_edVenture-5.png"
              alt="edVenture Logo"
              className="h-auto w-full block dark:hidden"
              style={{ maxWidth: '220px' }}
            />
            {/* Dark mode logo */}
            <img
              src="/images/dark-mode.png"
              alt="edVenture Logo"
              className="h-auto w-full hidden dark:block"
              style={{ maxWidth: '220px' }}
            />
          </div>

          {/* Navigation */}
          <div className={cn(
            "mt-6 flex-1 overflow-y-scroll pr-3 custom-sidebar-scrollbar",
            "md:mt-10",
            "pb-20 md:pb-0"
          )}>
            {NAV_DATA.map((section) => {
              // Filter items based on role and mobile visibility
              const visibleItems = section.items.filter((item: any) => {
                // Filter out items hidden on mobile
                if (isMobile && item.hideOnMobile) {
                  return false;
                }
                // Handle dynamic visibility for MIS Tracker
                if (item.dynamicVisibility && item.url === '/mis-tracker') {
                  if (!misConfigLoaded) return false;
                  return misConfig?.hasSheetAccess || false;
                }
                // Filter out items that require specific roles
                if (item.requiresRole) {
                  return hasRole(item.requiresRole);
                }
                return true;
              });

              // Don't render the section if there are no visible items
              if (visibleItems.length === 0) {
                return null;
              }

              const isSectionCollapsed = collapsedSections.includes(section.label);

              return (
              <div key={section.label} className="mb-6">
                {/* Section header */}
                <div className={cn(
                  "mb-4 flex w-full items-center",
                  variant === 'tablet' && !isOpen && "hidden"
                )}>
                  <button
                    onClick={() => toggleSection(section.label)}
                    className={cn(
                      "flex flex-1 items-center justify-between",
                      "text-sm font-semibold uppercase tracking-widest text-dark-4 dark:text-gray-500",
                      "hover:text-dark dark:hover:text-gray-300 transition-colors duration-200"
                    )}
                    aria-expanded={!isSectionCollapsed}
                  >
                    <span>{section.label}</span>
                    <ChevronUp
                      className={cn(
                        "size-4 transition-transform duration-200",
                        isSectionCollapsed && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {section.label === "EXCLUSIVITY" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExclusivityLocked((prev) => !prev);
                      }}
                      className={cn(
                        "ml-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200",
                        isExclusivityLocked
                          ? "text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                          : "text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                      )}
                      title={isExclusivityLocked ? "Unlock exclusivity section" : "Lock exclusivity section"}
                    >
                      {isExclusivityLocked ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>

                {!isSectionCollapsed && (
                <div className={cn(
                  "relative",
                  section.label === "EXCLUSIVITY" && isExclusivityLocked && "select-none"
                )}>
                  {/* Frozen overlay for locked EXCLUSIVITY section */}
                  {section.label === "EXCLUSIVITY" && isExclusivityLocked && (
                    <div
                      className="absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-[1px]"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div className="flex flex-col items-center gap-1 py-8">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 dark:text-amber-400">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-amber-500 dark:text-amber-400">
                          Locked
                        </span>
                      </div>
                    </div>
                  )}

                  <nav role="navigation" aria-label={section.label} className={cn(
                    section.label === "EXCLUSIVITY" && isExclusivityLocked && "pointer-events-none opacity-40 blur-[1px]"
                  )}>
                    <ul className="space-y-0.5">
                      {visibleItems.map((item: any) => {
                          // Filter subitems based on role requirements
                          const filteredSubItems = item.items.filter((subItem: any) => {
                            if (subItem.requiresRole) {
                              return hasRole(subItem.requiresRole);
                            }
                            return true;
                          });

                          const menuItemContent = (
                            <li key={item.title}>
                              {filteredSubItems.length ? (
                                <div>
                                  <MenuItem
                                    isActive={filteredSubItems.some(
                                      ({ url }: any) => url === pathname,
                                    )}
                                    onClick={() => toggleExpanded(item.title)}
                                    className={cn(
                                    // Touch-optimized sizing
                                    isTouchDevice && "min-h-[44px]",
                                    // Tablet condensed state
                                    variant === 'tablet' && !isOpen && "justify-center px-2"
                                  )}
                                >
                                  <item.icon
                                    className={cn(
                                      "size-5 shrink-0",
                                      variant === 'tablet' && !isOpen && "size-5"
                                    )}
                                    aria-hidden="true"
                                  />

                                  <span className={cn(
                                    variant === 'tablet' && !isOpen && "hidden"
                                  )}>{item.title}</span>
                                  {(variant !== 'tablet' || isOpen) && filteredSubItems.length > 0 && (
                                    <ChevronUp
                                      className={cn(
                                        "ml-auto rotate-180 transition-transform duration-200",
                                        expandedItems.includes(item.title) && "rotate-0",
                                        variant === 'tablet' && !isOpen && "hidden"
                                      )}
                                      aria-hidden="true"
                                    />
                                  )}
                                </MenuItem>

                                {/* Submenu */}
                                {expandedItems.includes(item.title) && (variant !== 'tablet' || isOpen) && (
                                  <ul className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2" role="menu">
                                    {filteredSubItems.map((subItem: any) => (
                                      <li key={subItem.title} role="none">
                                        <MenuItem
                                          as="link"
                                          href={subItem.url}
                                          isActive={pathname === subItem.url}
                                          className={cn(
                                            // Touch-optimized sizing
                                            isTouchDevice && "min-h-[44px]"
                                          )}
                                        >
                                          <span>{subItem.title}</span>
                                        </MenuItem>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ) : (
                              (() => {
                                const href = "url" in item ? item.url + "" : "/" + item.title.toLowerCase().split(" ").join("-");

                                return (
                                  <MenuItem
                                    className={cn(
                                      "flex items-center gap-3 py-2.5",
                                      // Touch-optimized sizing
                                      isTouchDevice && "min-h-[44px]",
                                      // Tablet condensed state
                                      variant === 'tablet' && !isOpen && "justify-center px-2"
                                    )}
                                    as="link"
                                    href={href}
                                    isActive={pathname === href}
                                  >
                                    <item.icon
                                      className={cn(
                                        "size-5 shrink-0",
                                        variant === 'tablet' && !isOpen && "size-5"
                                      )}
                                      aria-hidden="true"
                                    />

                                    <span className={cn(
                                      variant === 'tablet' && !isOpen && "hidden"
                                    )}>{item.title}</span>
                                  </MenuItem>
                                );
                              })()
                            )}
                          </li>
                        );

                        return menuItemContent;
                      })}
                    </ul>
                  </nav>
                </div>
                )}
              </div>
            );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
