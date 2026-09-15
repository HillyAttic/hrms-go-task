'use client';

import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { toast } from 'react-toastify';
import { Copy, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { payrollService } from '@/services/payroll.service';
import {
  DEFAULT_SALARY_SLIP_TEMPLATE,
  type SalarySlipTemplate,
} from '@/types/payroll.types';
import { cn } from '@/lib/utils';

const MOCK: Record<string, string> = {
  name: 'Amit Sharma',
  pan: 'ABCDE1234F',
  employeeId: 'EMP001',
  department: 'Engineering',
  designation: 'Software Engineer',
  doj: '01/04/2024',
  totalDaysInMonth: '30',
  paidDays: '26',
  present: '22',
  wfh: '3',
  holiday: '5',
  leaveTaken: '2',
  paidLeave: '2',
  unpaidLeave: '0',
  approvedLeave: '2',
  unapprovedLeave: '0',
  halfDay: '0',
  basic: '₹25,000',
  hra: '₹10,000',
  special: '₹15,000',
  epf: '₹1,800',
  esi: '₹500',
  professionalTax: '₹200',
  tds: '₹0',
  loanRecovery: '₹0',
  otherDeduction: '₹0',
  leaveDeduction: '₹0',
};

const clone = (template: SalarySlipTemplate): SalarySlipTemplate =>
  JSON.parse(JSON.stringify(template)) as SalarySlipTemplate;

const toPayload = (template: SalarySlipTemplate): Omit<SalarySlipTemplate, 'id' | 'updatedAt'> => ({
  title: template.title,
  sections: template.sections,
  showFooterNote: template.showFooterNote,
  showSlipNumber: template.showSlipNumber,
  footerNote: template.footerNote,
});

export function TemplateManager() {
  const [templates, setTemplates] = useState<SalarySlipTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<SalarySlipTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<SalarySlipTemplate | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    setTemplates(await payrollService.getTemplates());
    setLoading(false);
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const openEditor = (template?: SalarySlipTemplate) => {
    setDraft(
      clone(
        template ?? {
          ...DEFAULT_SALARY_SLIP_TEMPLATE,
          title: '',
          sections: DEFAULT_SALARY_SLIP_TEMPLATE.sections.map((section) => ({ ...section, fields: section.fields.map((field) => ({ ...field })) })),
        }
      )
    );
    setEditorOpen(true);
  };

  const patchDraft = (patch: Partial<SalarySlipTemplate>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  const toggleSection = (sectionIndex: number) =>
    setDraft((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, index) =>
        index === sectionIndex ? { ...section, visible: !section.visible } : section
      );
      return { ...current, sections };
    });

  const toggleField = (sectionIndex: number, fieldIndex: number) =>
    setDraft((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              fields: section.fields.map((field, position) =>
                position === fieldIndex ? { ...field, visible: !field.visible } : field
              ),
            }
          : section
      );
      return { ...current, sections };
    });

  const relabelField = (sectionIndex: number, fieldIndex: number, label: string) =>
    setDraft((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              fields: section.fields.map((field, position) =>
                position === fieldIndex ? { ...field, label } : field
              ),
            }
          : section
      );
      return { ...current, sections };
    });

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error('Template name is required');
      return;
    }
    setSaving(true);
    const payload = toPayload({ ...draft, title: draft.title.trim() });
    const saved = draft.id
      ? await payrollService.updateTemplate(draft.id, payload)
      : Boolean(await payrollService.createTemplate(payload));
    setSaving(false);
    if (!saved) {
      toast.error('Failed to save the template');
      return;
    }
    toast.success(draft.id ? 'Template updated' : 'Template created');
    setEditorOpen(false);
    setDraft(null);
    await loadTemplates();
  };

  const duplicateTemplate = async (template: SalarySlipTemplate) => {
    const created = await payrollService.createTemplate({
      ...toPayload(template),
      title: `${template.title} (Copy)`,
    });
    if (!created) {
      toast.error('Failed to duplicate the template');
      return;
    }
    toast.success('Template duplicated');
    await loadTemplates();
  };

  const deleteTemplate = async (template: SalarySlipTemplate) => {
    if (!template.id) return;
    if (!window.confirm(`Delete the template "${template.title}"? This cannot be undone.`)) return;
    const deleted = await payrollService.deleteTemplate(template.id);
    if (!deleted) {
      toast.error('Failed to delete the template');
      return;
    }
    toast.success('Template deleted');
    await loadTemplates();
  };

  const meta = (template: SalarySlipTemplate) => {
    const visibleSections = template.sections.filter((section) => section.visible).length;
    const fieldsShown = template.sections.reduce(
      (total, section) =>
        total + (section.visible ? section.fields.filter((field) => field.visible).length : 0),
      0
    );
    return `${visibleSections}/${template.sections.length} sections visible · ${fieldsShown} fields shown · footer note ${
      template.showFooterNote ? 'on' : 'off'
    } · slip number ${template.showSlipNumber ? 'shown' : 'hidden'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Salary Slip Templates</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Control which sections, fields and labels appear on a generated slip.
          </p>
        </div>
        <Button size="sm" onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading templates…</p>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              No templates yet. Create one to control how slips are laid out.
            </p>
            <Button variant="outline" onClick={() => openEditor()}>
              Create Template
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {templates.map((template) => (
              <li key={template.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{template.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{meta(template)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setPreview(template)}>
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${template.title}`}
                    onClick={() => openEditor(template)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Duplicate ${template.title}`}
                    onClick={() => void duplicateTemplate(template)}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${template.title}`}
                    onClick={() => void deleteTemplate(template)}
                    className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogPrimitive.Root open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <DialogPrimitive.Content
            // A stray click outside must not discard an unsaved template.
            onPointerDownOutside={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-gray-800 z-50 overflow-y-auto shadow-xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <DialogPrimitive.Title className="text-base font-semibold text-gray-900 dark:text-white">
                {draft?.id ? 'Edit Template' : 'New Template'}
              </DialogPrimitive.Title>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setEditorOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {draft && (
              <div className="p-4 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Template Name
                  </label>
                  <input
                    value={draft.title}
                    onChange={(event) => patchDraft({ title: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {draft.sections.map((section, sectionIndex) => (
                  <div
                    key={section.key}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
                      <label className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={section.visible}
                          onChange={() => toggleSection(sectionIndex)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <span
                          className={cn(
                            'text-sm font-medium truncate',
                            section.visible
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-400 line-through dark:text-gray-500'
                          )}
                        >
                          {section.title}
                        </span>
                      </label>
                      <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        {section.fields.filter((field) => field.visible).length}/{section.fields.length} fields
                      </span>
                    </div>

                    <div className="space-y-2 p-3">
                      {section.fields.map((field, fieldIndex) => (
                        <div
                          key={field.key}
                          className="grid grid-cols-[120px_1fr] gap-2 items-center"
                        >
                          <label className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={field.visible}
                              disabled={!section.visible}
                              onChange={() => toggleField(sectionIndex, fieldIndex)}
                              className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="text-xs font-mono truncate text-gray-500 dark:text-gray-400">
                              {field.key}
                            </span>
                          </label>
                          <input
                            value={field.label}
                            onChange={(event) => relabelField(sectionIndex, fieldIndex, event.target.value)}
                            className="h-8 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={draft.showFooterNote}
                      onChange={(event) => patchDraft({ showFooterNote: event.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    Show footer note
                  </label>
                  <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={draft.showSlipNumber}
                      onChange={(event) => patchDraft({ showSlipNumber: event.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    Show slip number
                  </label>

                  {draft.showFooterNote && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Footer note override
                      </label>
                      <Textarea
                        rows={2}
                        value={draft.footerNote ?? ''}
                        onChange={(event) => patchDraft({ footerNote: event.target.value })}
                        placeholder="Leave blank to use the note from Payroll Settings."
                        className="rounded-lg border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void saveDraft()} loading={saving}>
                {draft?.id ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {preview?.title ?? 'Template'} — Preview
            </DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700">
              <div className="border-b-2 border-gray-800 pb-2 text-center dark:border-gray-300">
                <p className="text-lg font-bold text-gray-900 dark:text-white">SALARY SLIP</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pay Slip for June, 2026</p>
              </div>

              {preview.sections
                .filter((section) => section.visible)
                .map((section) => (
                  <div key={section.key}>
                    <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">{section.title}</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      {section.fields
                        .filter((field) => field.visible)
                        .map((field) => (
                          <div key={field.key} className="flex justify-between gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{field.label}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {MOCK[field.key] ?? '-'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

              {preview.showFooterNote && (
                <p className="border-t border-gray-300 pt-3 text-xs italic text-gray-600 dark:border-gray-600 dark:text-gray-400">
                  {preview.footerNote || 'This is a computer-generated salary slip.'}
                </p>
              )}
              {preview.showSlipNumber && (
                <p className="text-xs text-gray-500 dark:text-gray-400">SAL-202606-EMP001</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TemplateManager;
