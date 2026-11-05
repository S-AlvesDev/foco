"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LockKeyhole, Mail, MailCheck, UserRound, UserRoundPlus } from "lucide-react";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { idle } from "@/lib/form";
import { resendConfirmationAction, signUpAction } from "../actions";
import { AuthFooter, AuthHeader, authLinkClass, authSubmitClass } from "./auth-header";

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, idle);
  const [password, setPassword] = useState("");

  if (state.status === "success" && state.message) {
    return <CheckEmail email={state.message} />;
  }

  const action = (formData: FormData) => {
    formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    return formAction(formData);
  };

  return (
    <>
      <AuthHeader
        title="Criar conta"
        description="Seus estudos, suas matérias, seu ritmo. Cada conta é individual."
      />
      <form action={action} className="flex flex-col gap-4" noValidate>
        {state.message && (
          <Notice tone="error" key={state.at}>
            {state.message}
          </Notice>
        )}

        <Field label="Nome" icon={UserRound} error={state.fieldErrors?.name}>
          {(p) => (
            <Input
              {...p}
              name="name"
              autoComplete="given-name"
              placeholder="Como quer ser chamado"
              defaultValue={state.values?.name}
              autoFocus
            />
          )}
        </Field>

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
            />
          )}
        </Field>

        <Field
          label="Senha"
          icon={LockKeyhole}
          error={state.fieldErrors?.password}
          hint={<PasswordHint length={password.length} />}
        >
          {(p) => (
            <PasswordInput
              {...p}
              name="password"
              autoComplete="new-password"
              placeholder="Crie uma senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        <SubmitButton variant="primary" size="lg" className={authSubmitClass}>
          <UserRoundPlus aria-hidden />
          Criar conta
        </SubmitButton>

        <AuthFooter>
          Já tem conta?{" "}
          <Link href="/entrar" className={authLinkClass}>
            Entrar
          </Link>
        </AuthFooter>
      </form>
    </>
  );
}

function PasswordHint({ length }: { length: number }) {
  if (length === 0) return <>Ao menos 8 caracteres.</>;
  if (length < 8) return <>Faltam {8 - length} caracteres.</>;
  return <span className="text-success">Tamanho ok.</span>;
}

function CheckEmail({ email }: { email: string }) {
  const [state, resend] = useActionState(resendConfirmationAction, idle);
  return (
    <div>
      <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-accent-subtle text-accent">
        <MailCheck className="size-5" />
      </div>
      <AuthHeader
        title="Confirme seu e-mail"
        description={
          <>
            Enviamos um link para <span className="font-medium text-fg">{email}</span>. Abra-o neste aparelho
            para ativar a conta.
          </>
        }
      />
      {state.message && (
        <Notice tone={state.status === "error" ? "error" : "success"} key={state.at} className="mb-4">
          {state.message}
        </Notice>
      )}
      <form action={resend} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <SubmitButton variant="secondary" size="lg" className="h-12 w-full rounded-[10px] text-[15px]">
          Reenviar link
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-[13px] text-fg-2">
        Não chegou? Veja a caixa de spam ou {/* Recarrega a página para limpar o formulário. */}
        <a href="/cadastro" className={authLinkClass}>
          use outro e-mail
        </a>
        .
      </p>
    </div>
  );
}
