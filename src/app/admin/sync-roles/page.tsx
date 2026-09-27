"use client";

import { useState } from 'react';
import { syncAllUserRoles } from '@/utils/sync-user-roles';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { toast } from 'react-toastify';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function SyncRolesPage() {
  const { isAdmin, loading: authLoading } = useEnhancedAuth();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSync = async () => {
    if (!isAdmin) {
      toast.error('Only admins can sync user roles');
      return;
    }

    setSyncing(true);
    setResult(null);

    try {
      const syncResult = await syncAllUserRoles();
      setResult(syncResult);

      if (syncResult.success) {
        toast.success(syncResult.message);
      } else {
        toast.error('Sync completed with errors');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync user roles');
      setResult({
        success: false,
        message: error.message || 'Failed to sync user roles',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            Only administrators can access this page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Sync User Roles
        </h1>
        <p className="text-muted-foreground">
          Sync user roles from Firestore to Firebase Auth custom claims
        </p>
      </div>

      {/* Warning Card */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
              Important Information
            </h3>
            <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
              <li>• This will sync ALL user roles from Firestore to Firebase Auth</li>
              <li>• Users will need to refresh their tokens to see the changes</li>
              <li>• This is a one-time fix for existing users</li>
              <li>• New role assignments will sync automatically</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sync Button */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full sm:w-auto px-6 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
        >
          {syncing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              <span>Sync All User Roles</span>
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-card rounded-lg shadow p-6">
          <div className="flex items-start space-x-3 mb-4">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                {result.success ? 'Sync Completed' : 'Sync Failed'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {result.message}
              </p>
            </div>
          </div>

          {result.successCount !== undefined && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {result.successCount}
                </div>
                <div className="text-sm text-green-800 dark:text-green-300">
                  Users Synced
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {result.errorCount}
                </div>
                <div className="text-sm text-red-800 dark:text-red-300">
                  Errors
                </div>
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-foreground mb-2">
                Errors:
              </h4>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 max-h-60 overflow-y-auto">
                <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                  {result.errors.map((error: any, index: number) => (
                    <li key={index}>
                      User {error.uid}: {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          After Syncing
        </h3>
        <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
          <li>Users should log out and log back in to refresh their tokens</li>
          <li>Or wait up to 1 hour for tokens to refresh automatically</li>
          <li>Verify roles are correct in the user management page</li>
          <li>Future role changes will sync automatically</li>
        </ol>
      </div>
    </div>
  );
}
