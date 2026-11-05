import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage() {
  return (
    <>
      <AuthHeader title="Bem-vindo de volta" description="Continue sua preparação de onde parou." />
      <SignInForm />
    </>
  );
}
