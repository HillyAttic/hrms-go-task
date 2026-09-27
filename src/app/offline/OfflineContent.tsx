'use client';

export default function OfflineContent() {
  return (
    <div className="min-h-screen bg-card flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-card rounded-lg shadow-hard p-8">
          {/* Offline Icon */}
          <div className="w-16 h-16 mx-auto mb-6 text-gray-4 dark:text-gray-6">
            <svg 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              className="w-full h-full"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75 9.75 9.75 0 019.75-9.75z" 
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-dark dark:text-white mb-4">
            You're Offline
          </h1>

          {/* Description */}
          <p className="text-gray-5 dark:text-gray-6 mb-6 leading-relaxed">
            It looks like you've lost your internet connection. Don't worry - you can still access 
            cached pages and some features will continue to work.
          </p>

          {/* Features Available Offline */}
          <div className="text-left mb-6">
            <h3 className="text-sm font-semibold text-dark dark:text-white mb-3">
              Available Offline:
            </h3>
            <ul className="space-y-2 text-sm text-gray-5 dark:text-gray-6">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Previously visited pages
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Cached dashboard data
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Form data (queued for sync)
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-md border-2 border-border bg-foreground py-3 px-4 font-semibold text-background transition-transform hover:-translate-y-px"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.history.back()}
              className="w-full bg-card border-2 border-border hover:bg-muted text-foreground font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Go Back
            </button>
          </div>

          {/* Connection Status */}
          <div className="mt-6 pt-6 border-t border-stroke dark:border-stroke-dark">
            <div className="flex items-center justify-center text-sm text-gray-5 dark:text-gray-6">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              Connection Status: Offline
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 text-xs text-gray-4 dark:text-gray-6">
          <p>
            Tip: This app works offline! Your actions will be saved and synced when you're back online.
          </p>
        </div>
      </div>
    </div>
  );
}