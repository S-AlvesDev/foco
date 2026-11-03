import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage() {
  return (
    <>
      <AuthHeader title="Entrar" description="Continue de onde parou." />
      <SignInForm />
    </>
  );
}
