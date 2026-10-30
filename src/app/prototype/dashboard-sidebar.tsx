/**
 * THROWAWAY PROTOTYPE — shared sidebar.
 * Renders the real /dashboard sidebar: 290px, production NAV_DATA, edVenture
 * logo, section headers and the reports promo card. Colours come from the
 * host variant's --v-* tokens, so every prototype theme inherits it.
 */

import { ArrowRight, ChevronUp, GraduationCap } from 'lucide-react';
import { NAV_DATA } from '@/components/Layouts/sidebar/data';

export function DashboardSidebar() {
  return (
    <aside className="dz-rail" aria-label="Main navigation">
      <div className="dz-brand">
        <img className="dz-logo-light" src="/images/branding_edVenture-5.png" alt="edVenture Logo" />
        <img className="dz-logo-dark" src="/images/dark-mode.png" alt="edVenture Logo" />
      </div>

      <div className="dz-nav-scroll">
        {NAV_DATA.map((section) => (
          <div className="dz-section" key={section.label}>
            <div className="dz-nav-label">
              <span>{section.label}</span>
              <ChevronUp aria-hidden="true" />
            </div>
            <ul>
              {section.items.map((item) => (
                <li key={item.title}>
                  <a className={`dz-nav-item${item.url === '/dashboard' ? ' is-active' : ''}`} href="#">
                    <item.icon className="dz-nav-icon" aria-hidden="true" />
                    <span>{item.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="dz-rail-promo">
        <div className="dz-rail-promo-inner">
          <span className="dz-rail-promo-mark"><GraduationCap /></span>
          <p>Empowering Better Learning Together.</p>
          <button className="dz-rail-promo-btn" type="button">View Reports <ArrowRight /></button>
        </div>
      </div>
    </aside>
  );
}
