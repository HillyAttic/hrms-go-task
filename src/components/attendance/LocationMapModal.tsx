import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModal } from '@/contexts/modal-context';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  title?: string;
}

/**
 * LocationMapModal Component
 * Displays Google Maps in a modal when clicking on location coordinates
 */
export function LocationMapModal({
  isOpen,
  onClose,
  latitude,
  longitude,
  title = 'Location',
}: LocationMapModalProps) {
  const { openModal, closeModal } = useModal();

  // Prevent body scroll when modal is open; sync modal state with context
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      openModal();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      closeModal();
    };
  }, [isOpen, openModal, closeModal]);

  if (!isOpen) return null;

  // Google Maps embed URL
  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}&output=embed`;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[99999] flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Map Content */}
        <div className="relative w-full h-[600px]">
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Maps Location"
            className="w-full h-full"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted">
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            Open in Google Maps
          </a>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to ensure it's at the root level
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
}
