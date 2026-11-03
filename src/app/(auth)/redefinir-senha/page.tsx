import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { NewPasswordForm } from "@/features/auth/components/new-password-form";

export const metadata: Metadata = { title: "Nova senha" };

/** Aberta pelo link de recuperação: /auth/confirm já criou a sessão (o proxy exige login aqui). */
export default function NewPasswordPage() {
  return (
    <>
      <AuthHeader
        title="Criar nova senha"
        description="Escolha uma senha que você não use em outros sites."
      />
      <NewPasswordForm next="/painel" submitLabel="Salvar e entrar" autoFocus />
    </>
  );
}
