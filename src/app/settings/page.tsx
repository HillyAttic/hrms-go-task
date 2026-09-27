"use client";

import { Settings as SettingsIcon, CheckSquare } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* My Tasks - Mobile Only */}
        <Link
          href="/my-tasks"
          className="block md:hidden bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                My Tasks
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage your personal task lists
              </p>
            </div>
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>

        {/* Coming Soon Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-muted rounded-full">
                <SettingsIcon className="w-12 h-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              More Settings Coming Soon
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Additional settings and preferences will be available here in future updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
