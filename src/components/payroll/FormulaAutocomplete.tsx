'use client';

import { cn } from '@/lib/utils';

export interface FormulaSuggestion {
  /** Text inserted into the expression when the suggestion is accepted. */
  label: string;
  /** Short right-aligned hint describing where the name comes from. */
  detail: string;
  kind: 'variable' | 'function';
}

/** Function names the formula engine exposes, grouped for the quick-insert panel. */
export const FUNCTION_GROUPS: { group: string; functions: string[] }[] = [
  { group: 'Logical', functions: ['IF', 'IFS', 'AND', 'OR', 'NOT', 'IFERROR'] },
  {
    group: 'Math',
    functions: [
      'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'COUNTBLANK', 'PRODUCT', 'ABS',
      'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'CEILING', 'FLOOR', 'MOD', 'INT', 'SQRT', 'POWER',
      'RAND', 'RANDBETWEEN',
    ],
  },
  {
    group: 'Text',
    functions: [
      'CONCAT', 'TEXTJOIN', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'UPPER', 'LOWER',
      'PROPER', 'REPLACE', 'SUBSTITUTE', 'FIND', 'SEARCH', 'TEXT',
    ],
  },
  {
    group: 'Date',
    functions: [
      'TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'EDATE', 'DATEDIF',
      'NETWORKDAYS', 'WORKDAY',
    ],
  },
  { group: 'Statistical', functions: ['MEDIAN', 'MODE', 'LARGE', 'SMALL', 'RANK', 'PERCENTILE', 'STDEV', 'VAR'] },
  { group: 'Conditional', functions: ['SUMIF', 'SUMIFS', 'COUNTIF', 'COUNTIFS', 'AVERAGEIF', 'AVERAGEIFS'] },
];

/**
 * Every name the editor can offer. Variables come first so an exact-name match
 * wins over a same-prefixed function.
 */
export const SUGGESTION_LIBRARY: FormulaSuggestion[] = [
  ...[
    'grossSalary', 'totalDaysInMonth', 'basicPercentage', 'hraPercentage', 'specialPercentage',
    'allowedPaidLeaves', 'present', 'wfh', 'halfDay', 'holidays', 'approvedLeave',
    'totalWorkingDays', 'unapprovedLeave', 'paidLeave', 'leaveTaken', 'unpaidLeave', 'paidDays',
    'proratedGross', 'basic', 'hra', 'special', 'totalDeductions', 'netSalary',
  ].map((label): FormulaSuggestion => ({ label, detail: 'variable', kind: 'variable' })),
  ...FUNCTION_GROUPS.flatMap(({ group, functions }) =>
    functions.map((fn): FormulaSuggestion => ({ label: `${fn}(`, detail: group, kind: 'function' }))
  ),
];

/** The partial word immediately left of the caret, e.g. `gro` in `basic + gro`. */
export function tokenAtCursor(value: string, caret: number): string {
  const match = value.slice(0, caret).match(/[A-Za-z_]\w*$/);
  return match ? match[0] : '';
}

/** Names whose start matches the word being typed. Empty token offers nothing. */
export function matchSuggestions(value: string, caret: number): FormulaSuggestion[] {
  const token = tokenAtCursor(value, caret);
  if (!token) return [];
  const lower = token.toLowerCase();
  return SUGGESTION_LIBRARY.filter((s) => s.label.toLowerCase().startsWith(lower)).slice(0, 8);
}

/** Replaces the word under the caret with the full suggestion. */
export function applySuggestion(
  value: string,
  caret: number,
  suggestion: FormulaSuggestion
): { value: string; caret: number } {
  const start = caret - tokenAtCursor(value, caret).length;
  return {
    value: value.slice(0, start) + suggestion.label + value.slice(caret),
    caret: start + suggestion.label.length,
  };
}

interface FormulaAutocompleteProps {
  suggestions: FormulaSuggestion[];
  activeIndex: number;
  onSelect: (suggestion: FormulaSuggestion) => void;
  className?: string;
}

export function FormulaAutocomplete({
  suggestions,
  activeIndex,
  onSelect,
  className,
}: FormulaAutocompleteProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      role="listbox"
      className={cn(
        'absolute left-0 top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800',
        className
      )}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.label}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => {
            // Keep focus in the expression input — a blur would close the dropdown first.
            event.preventDefault();
            onSelect(suggestion);
          }}
          className={cn(
            'flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left font-mono text-xs',
            index === activeIndex
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-300'
          )}
        >
          <span>{suggestion.label}</span>
          <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500">
            {suggestion.detail}
          </span>
        </button>
      ))}
    </div>
  );
}

export default FormulaAutocomplete;
