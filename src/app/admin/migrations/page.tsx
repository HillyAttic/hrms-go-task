'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authenticatedFetch } from '@/lib/api-client';
import { toast } from 'react-toastify';

/**
 * Migration Tool Page
 * Admin-only page to run database migrations
 */
export default function MigrationToolPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runMigration = async () => {
    if (!confirm('Are you sure you want to run the serial number migration? This will update all clients in the database.')) {
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const response = await authenticatedFetch('/api/admin/migrate-serial-numbers', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Migration completed successfully!');
        setResult(data);
      } else {
        toast.error(data.message || 'Migration failed');
        setResult(data);
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Failed to run migration');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Database Migration Tools
        </h1>
        <p className="text-muted-foreground mt-2">
          Admin-only tools for database migrations
        </p>
      </div>

      {/* Migration Card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Add Serial Numbers to Clients
        </h2>

        <div className="space-y-4">
          <div className="bg-info/10 border border-info/30 rounded-lg p-4">
            <h3 className="font-medium text-info mb-2">
              What this does:
            </h3>
            <ul className="text-sm text-info space-y-1 list-disc list-inside">
              <li>Adds a <code>serialNumber</code> field to all existing clients</li>
              <li>Assigns sequential numbers: 001, 002, 003, etc.</li>
              <li>Based on client creation date (oldest first)</li>
              <li>Skips clients that already have a serial number</li>
              <li>Safe to run multiple times</li>
            </ul>
          </div>

          <Button
            onClick={runMigration}
            disabled={isRunning}
            loading={isRunning}
            className="w-full sm:w-auto"
          >
            {isRunning ? 'Running Migration...' : 'Run Migration'}
          </Button>

          {/* Results */}
          {result && (
            <div className={`border rounded-lg p-4 ${
              result.success
                ? 'bg-success/10 border-success/30'
                : 'bg-destructive/10 border-destructive/30'
            }`}>
              <h3 className={`font-medium mb-2 ${
                result.success
                  ? 'text-success'
                  : 'text-destructive'
              }`}>
                {result.message}
              </h3>

              {result.stats && (
                <div className="text-sm space-y-1">
                  <p className={result.success ? 'text-success' : 'text-destructive'}>
                    Total clients: {result.stats.total}
                  </p>
                  <p className={result.success ? 'text-success' : 'text-destructive'}>
                    Updated: {result.stats.updated}
                  </p>
                  <p className={result.success ? 'text-success' : 'text-destructive'}>
                    Skipped: {result.stats.skipped}
                  </p>
                </div>
              )}

              {result.updatedClients && result.updatedClients.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-medium text-sm">
                    View sample updates (first 10)
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {result.updatedClients.map((client: any, index: number) => (
                      <li key={index}>
                        {client.name} → S.No: {client.serialNumber}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
        <h3 className="font-medium text-warning mb-2">
          ⚠️ Important Notes
        </h3>
        <ul className="text-sm text-warning space-y-1 list-disc list-inside">
          <li>This operation updates the database directly</li>
          <li>Make sure you have a backup before running migrations</li>
          <li>Only admins can run this migration</li>
          <li>The migration is safe to run multiple times</li>
        </ul>
      </div>
    </div>
  );
}
