'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ChevronDown, ChevronUp, FunctionSquare, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { payrollService } from '@/services/payroll.service';
import type { PayrollSettings } from '@/types/payroll.types';
import { cn } from '@/lib/utils';
import {
  FormulaAutocomplete,
  FUNCTION_GROUPS,
  applySuggestion,
  matchSuggestions,
  tokenAtCursor,
  type FormulaSuggestion,
} from '@/components/payroll/FormulaAutocomplete';
import {
  COMPONENT_KEYS,
  DEFAULT_FORMULA_EXPRESSIONS,
  FORMULA_LINES,
  INPUT_KEYS,
  generateFormulaString,
  parseFormulaToExpressions,
} from '@/lib/salary-formula';

export { DEFAULT_FORMULA_EXPRESSIONS, generateFormulaString, parseFormulaToExpressions };

const CHIP_VARIABLE =
  'rounded px-2 py-0.5 font-mono text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50';
const CHIP_COMPONENT =
  'rounded px-2 py-0.5 font-mono text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50';
const CHIP_SQUARE = 'w-9 h-9 rounded-lg font-bold text-sm';
const CHIP_FUNCTION =
  'rounded px-2 py-0.5 font-mono text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50';

interface FormulaEditorProps {
  settings: PayrollSettings | null;
  onSaveSuccess?: () => void;
}

export function FormulaEditor({ settings, onSaveSuccess }: FormulaEditorProps) {
  const [expressions, setExpressions] = useState<Record<string, string>>(() =>
    parseFormulaToExpressions(settings?.salaryFormula)
  );
  const [showReference, setShowReference] = useState(false);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activeValue = focusedKey ? expressions[focusedKey] ?? '' : '';
  const suggestions = useMemo(
    () => (!dismissed && focusedKey ? matchSuggestions(activeValue, caret) : []),
    [dismissed, focusedKey, activeValue, caret]
  );
  const highlighted = suggestions[Math.min(activeIndex, Math.max(suggestions.length - 1, 0))];
  const ghost =
    highlighted && highlighted.label.length > tokenAtCursor(activeValue, caret).length
      ? highlighted.label.slice(tokenAtCursor(activeValue, caret).length)
      : '';

  const setExpression = (key: string, value: string) => {
    setExpressions((previous) => ({ ...previous, [key]: value }));
  };

  const insertAtCursor = (text: string) => {
    if (!focusedKey) {
      toast.info('Click an expression field first, then insert');
      return;
    }
    const input = inputRefs.current[focusedKey];
    const current = expressions[focusedKey] ?? '';
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    setExpression(focusedKey, current.slice(0, start) + text + current.slice(end));
    const nextCaret = start + text.length;
    setCaret(nextCaret);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const acceptSuggestion = (suggestion: FormulaSuggestion) => {
    if (!focusedKey) return;
    const applied = applySuggestion(expressions[focusedKey] ?? '', caret, suggestion);
    setExpression(focusedKey, applied.value);
    setCaret(applied.caret);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      const input = inputRefs.current[focusedKey];
      input?.focus();
      input?.setSelectionRange(applied.caret, applied.caret);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, value: string) => {
    if (event.key === 'Escape') {
      setDismissed(true);
      return;
    }
    if (event.key === 'ArrowDown' && suggestions.length > 1) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' && suggestions.length > 1) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    // ArrowRight still moves the caret when it is not already at the end of the line.
    if (event.key === 'ArrowRight' && caret !== value.length) return;
    if ((event.key === 'Tab' || event.key === 'Enter' || event.key === 'ArrowRight') && ghost && highlighted) {
      event.preventDefault();
      acceptSuggestion(highlighted);
    }
  };

  const handleSave = async () => {
    if (!settings) {
      toast.error('Save your payroll settings first — the formula is stored with them');
      return;
    }
    const incomplete = FORMULA_LINES.filter((line) => !(expressions[line.key] ?? '').trim());
    if (incomplete.length > 0) {
      toast.error(`Formula incomplete — ${incomplete.length} field(s) are still empty`);
      return;
    }
    setSaving(true);
    const payload: Partial<PayrollSettings> = { ...settings };
    delete payload.id;
    delete payload.updatedAt;
    const saved = await payrollService.saveSettings({
      ...payload,
      salaryFormula: generateFormulaString(expressions),
    });
    setSaving(false);
    if (!saved) {
      toast.error('Failed to save the salary formula');
      return;
    }
    toast.success('Salary formula saved');
    onSaveSuccess?.();
  };

  const resetToDefault = () => {
    setExpressions({ ...DEFAULT_FORMULA_EXPRESSIONS });
    toast.success('Formula reset to the default calculation');
  };

  const clearAll = () => {
    setExpressions(Object.fromEntries(FORMULA_LINES.map((line) => [line.key, ''])));
    toast.info('Formula cleared — fill every field before saving');
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border">
      <div className="p-5 border-b border-border">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FunctionSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Salary Calculation Logic
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define how each component is calculated
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setShowReference((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Plus className="h-4 w-4" />
              Quick-Insert Reference
            </span>
            {showReference ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showReference && (
            <div className="space-y-4 border-t border-border px-4 py-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Variables</p>
                <div className="flex flex-wrap gap-2">
                  {INPUT_KEYS.map((key) => (
                    <button key={key} type="button" onClick={() => insertAtCursor(key)} className={CHIP_VARIABLE}>
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Components</p>
                <div className="flex flex-wrap gap-2">
                  {COMPONENT_KEYS.map((key) => (
                    <button key={key} type="button" onClick={() => insertAtCursor(key)} className={CHIP_COMPONENT}>
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Operators &amp; Brackets
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { symbol: '+', insert: ' + ' },
                    { symbol: '−', insert: ' - ' },
                    { symbol: '×', insert: ' * ' },
                    { symbol: '÷', insert: ' / ' },
                  ].map(({ symbol, insert }) => (
                    <button
                      key={symbol}
                      type="button"
                      onClick={() => insertAtCursor(insert)}
                      className={cn(CHIP_SQUARE, 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50')}
                    >
                      {symbol}
                    </button>
                  ))}
                  {['(', ')'].map((parenthesis) => (
                    <button
                      key={parenthesis}
                      type="button"
                      onClick={() => insertAtCursor(parenthesis)}
                      className={cn(CHIP_SQUARE, 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50')}
                    >
                      {parenthesis}
                    </button>
                  ))}
                  {['100', '0'].map((literal) => (
                    <button
                      key={literal}
                      type="button"
                      onClick={() => insertAtCursor(literal)}
                      className={cn(CHIP_SQUARE, 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600')}
                    >
                      {literal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Functions</p>
                <div className="space-y-3">
                  {FUNCTION_GROUPS.map(({ group, functions }) => (
                    <div key={group}>
                      <p className="mb-1.5 text-xs text-muted-foreground">{group}</p>
                      <div className="flex flex-wrap gap-2">
                        {functions.map((fn) => (
                          <button
                            key={fn}
                            type="button"
                            onClick={() => insertAtCursor(`${fn}(`)}
                            className={CHIP_FUNCTION}
                          >
                            {fn}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full table-fixed min-w-[700px]">
            <colgroup>
              <col style={{ width: 180 }} />
              <col style={{ width: '70%' }} />
              <col style={{ width: 80 }} />
            </colgroup>
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Expression
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {FORMULA_LINES.map((line) => {
                const value = expressions[line.key] ?? '';
                const isFocused = focusedKey === line.key;
                return (
                  <tr
                    key={line.key}
                    className={cn('hover:bg-muted/50', isFocused && 'bg-blue-50 dark:bg-blue-900/20')}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-semibold text-foreground">{line.label}</p>
                      <p className="text-xs text-muted-foreground">{line.description}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1">
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {line.key} =
                        </span>
                        <div className="relative flex-1">
                          <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre font-mono text-sm">
                            <span className="invisible">{value.slice(0, caret)}</span>
                            {isFocused && <span className="text-muted-foreground dark:text-muted-foreground">{ghost}</span>}
                          </div>
                          <input
                            ref={(element) => {
                              inputRefs.current[line.key] = element;
                            }}
                            value={value}
                            spellCheck={false}
                            onFocus={(event) => {
                              setFocusedKey(line.key);
                              setCaret(event.currentTarget.selectionStart ?? 0);
                              setActiveIndex(0);
                              setDismissed(false);
                            }}
                            onBlur={() => setDismissed(true)}
                            onSelect={(event) => setCaret(event.currentTarget.selectionStart ?? 0)}
                            onChange={(event) => {
                              setFocusedKey(line.key);
                              setExpression(line.key, event.target.value);
                              setCaret(event.target.selectionStart ?? event.target.value.length);
                              setActiveIndex(0);
                              setDismissed(false);
                            }}
                            onKeyDown={(event) => handleKeyDown(event, value)}
                            placeholder="expression"
                            className="relative w-full bg-transparent border-0 p-0 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 dark:placeholder:text-muted-foreground"
                          />
                          {isFocused && suggestions.length > 1 && (
                            <FormulaAutocomplete
                              suggestions={suggestions}
                              activeIndex={Math.min(activeIndex, suggestions.length - 1)}
                              onSelect={acceptSuggestion}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        aria-label={`Clear ${line.label}`}
                        onClick={() => setExpression(line.key, '')}
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 dark:text-muted-foreground dark:hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default" size="lg" onClick={handleSave} loading={saving} disabled={!settings}>
            <Save className="mr-2 h-4 w-4" />
            Save Formula
          </Button>
          <Button variant="outline" onClick={resetToDefault}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
          <Button variant="destructive" onClick={clearAll}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
        {!settings && (
          <p className="text-xs text-muted-foreground">
            Save your payroll settings first — the formula is stored alongside them.
          </p>
        )}
      </div>
    </div>
  );
}

export default FormulaEditor;
