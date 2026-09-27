import { redirect } from 'next/navigation';

/** Short alias — the real page lives under /admin, matching the other admin tools. */
export default function ThemeSettingAlias() {
  redirect('/admin/theme-setting');
}