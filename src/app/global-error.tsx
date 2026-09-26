'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[GlobalError] Application error:', error);
    }, [error]);

    const handleClearCacheAndReload = async () => {
        try {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }

            // Force reload from server
            window.location.reload();
        } catch (e) {
            console.error('[Recovery] Error during cache clear:', e);
            window.location.reload();
        }
    };

    // Inline styles, not Tailwind: this boundary can render when the stylesheet
    // itself failed to load, so the palette is duplicated from src/css/style.css.
    return (
        <html>
            <body style={{
                margin: 0,
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#191A23',
                color: '#ffffff',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    maxWidth: '400px'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        margin: '0 auto 1.5rem',
                        borderRadius: '16px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px'
                    }}>
                        ⚠️
                    </div>

                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#B5B5B5', marginBottom: '1.5rem' }}>
                        The application encountered an unexpected error. This may be caused by outdated cached files.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                            onClick={reset}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#B9FF66',
                                color: '#191A23',
                                border: '2px solid #191A23',
                                borderRadius: '12px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Try Again
                        </button>
                        <button
                            onClick={handleClearCacheAndReload}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'transparent',
                                color: '#ffffff',
                                border: '2px solid #3A3A42',
                                borderRadius: '12px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Clear Cache &amp; Reload
                        </button>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: '#B5B5B5', marginTop: '1.5rem' }}>
                        If the problem persists, clear your browser data or open in a new private tab.
                    </p>
                </div>
            </body>
        </html>
    );
}
