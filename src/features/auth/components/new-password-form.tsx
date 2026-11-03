"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Field, PasswordInput } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { idle } from "@/lib/form";
import { updatePasswordAction } from "../actions";

/**
 * Formulário de nova senha. Usado na redefinição (com `next`, redireciona ao terminar)
 * e em Configurações (sem `next`, limpa os campos e confirma com um aviso).
 */
export function NewPasswordForm({
  next,
  submitLabel = "Salvar nova senha",
  autoFocus = false,
}: {
  next?: string;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const [state, formAction] = useActionState(updatePasswordAction, idle);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      toast.success("Senha alterada");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {state.status === "error" && state.message && (
        <Notice tone="error" key={state.at}>
          {state.message}
        </Notice>
      )}
      <Field label="Nova senha" error={state.fieldErrors?.password} hint="Ao menos 8 caracteres.">
        {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" autoFocus={autoFocus} />}
      </Field>
      <Field label="Repita a nova senha" error={state.fieldErrors?.confirm}>
        {(p) => <PasswordInput {...p} name="confirm" autoComplete="new-password" />}
      </Field>
      <div>
        <SubmitButton variant="primary" size={next ? "lg" : "md"} className={next ? "mt-2 w-full" : ""}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
