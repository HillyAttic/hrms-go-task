"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface BreadcrumbProps {
  pageName?: string;
}

const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Split the pathname into segments
    const segments = pathname.split("/").filter(Boolean);
    
    // Build breadcrumb items
    const items: { label: string; href: string }[] = [];
    let currentPath = "";

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Format the segment label
      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      items.push({
        label,
        href: currentPath,
      });
    });

    return items;
  }, [pathname]);

  // Use provided pageName or the last breadcrumb item
  const displayName = pageName || breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard";

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-[26px] font-bold leading-[30px] text-dark dark:text-white">
        {displayName}
      </h2>

      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link 
              className="font-medium hover:text-foreground transition-colors" 
              href="/dashboard"
            >
              Dashboard
            </Link>
          </li>
          {breadcrumbs.map((item, index) => (
            <li key={item.href} className="flex items-center gap-2">
              <span className="text-dark-5 dark:text-dark-6">/</span>
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-foreground">{item.label}</span>
              ) : (
                <Link
                  className="font-medium hover:text-foreground transition-colors"
                  href={item.href}
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;
