'use client';

import Signin from "@/components/Auth/Signin";
import { AuthCard } from "@/components/Auth/AuthCard";

export default function SignIn() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue to your workspace"
    >
      <Signin />
    </AuthCard>
  );
}
