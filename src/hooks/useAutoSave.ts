import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

export function useAutoSave(
  data: any,
  onSave: (data: any) => Promise<void>,
  delay: number = 2000
) {
  const saveRef = useRef(onSave);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!data) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveRef.current(data);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Failed to save changes');
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay]);

  return { isSaving, lastSaved };
}
