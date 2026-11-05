"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck, Mail, Send } from "lucide-react";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { idle } from "@/lib/form";
import { requestPasswordResetAction } from "../actions";
import { AuthHeader, authLinkClass, AuthFooter, authSubmitClass } from "./auth-header";

export function ResetRequestForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, idle);

  if (state.status === "success") {
    return (
      <div>
        <div className="mb-5 flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent">
          <MailCheck className="size-5" />
        </div>
        <AuthHeader
          title="Verifique seu e-mail"
          description={
            <>
              Se existir uma conta para <span className="font-medium text-fg">{state.message}</span>, você vai
              receber um link para criar uma nova senha. Ele vale por 1 hora.
            </>
          }
        />
        <p className="text-center text-[13px] text-fg-2">
          <Link href="/entrar" className={authLinkClass}>
            Voltar para entrar
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <AuthHeader
        title="Recuperar senha"
        description="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      />
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {state.message && (
          <Notice tone="error" key={state.at}>
            {state.message}
          </Notice>
        )}
        <Field label="E-mail" icon={Mail} error={state.fieldErrors?.email}>
          {(p) => (
            <Input
              {...p}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="seu@email.com"
              defaultValue={state.values?.email}
              autoFocus
            />
          )}
        </Field>
        <SubmitButton variant="primary" size="lg" className={authSubmitClass}>
          <Send aria-hidden />
          Enviar link
        </SubmitButton>
        <AuthFooter>
          Lembrou?{" "}
          <Link href="/entrar" className={authLinkClass}>
            Entrar
          </Link>
        </AuthFooter>
      </form>
    </>
  );
}
