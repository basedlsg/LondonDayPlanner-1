import React from 'react';
import { Link } from 'wouter';

export default function LoginPage() {

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Removed "London Day Planner" header */}
          <p className="text-muted-foreground">
            PlanNYC - Day Planner
          </p>
        </div>

        <div className="text-center text-muted-foreground">
          <p className="mb-4">No authentication required.</p>
          <p className="mb-6">You can use the planner as a guest.</p>
          <Link href="/" className="text-blue-600 font-medium hover:underline">
            Go to Planner →
          </Link>
        </div>
      </div>
    </div>
  );
}