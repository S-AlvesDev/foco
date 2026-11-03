"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { idle } from "@/lib/form";
import { signInAction } from "../actions";
import { authLinkClass } from "./auth-header";

const URL_ERRORS: Record<string, string> = {
  link: "Esse link é inválido ou já foi usado. Entre com sua senha ou peça um novo link.",
};

function UrlNotice() {
  const erro = useSearchParams().get("erro");
  const message = erro ? URL_ERRORS[erro] : null;
  return message ? <Notice tone="error">{message}</Notice> : null;
}

export function SignInForm() {
  const [state, formAction] = useActionState(signInAction, idle);

  // Para onde voltar depois de entrar (definido pelo proxy ao bloquear uma rota).
  const action = (formData: FormData) => {
    formData.set("next", new URLSearchParams(window.location.search).get("next") ?? "");
    return formAction(formData);
  };

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message ? (
        <Notice tone="error" key={state.at}>
          {state.message}
        </Notice>
      ) : (
        <Suspense fallback={null}>
          <UrlNotice />
        </Suspense>
      )}

      <Field label="E-mail" error={state.fieldErrors?.email}>
        {(p) => (
          <Input
            {...p}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.values?.email}
            autoFocus
          />
        )}
      </Field>

      <Field
        label="Senha"
        error={state.fieldErrors?.password}
        aside={
          <Link href="/recuperar-senha" className="text-[12.5px] text-fg-3 transition-colors hover:text-fg-2">
            Esqueci a senha
          </Link>
        }
      >
        {(p) => <PasswordInput {...p} name="password" autoComplete="current-password" />}
      </Field>

      <SubmitButton variant="primary" size="lg" className="mt-2 w-full">
        Entrar
      </SubmitButton>

      <p className="mt-4 text-center text-[13px] text-fg-2">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className={authLinkClass}>
          Criar conta
        </Link>
      </p>
    </form>
  );
}
