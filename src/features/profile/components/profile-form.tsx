"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { AvatarEditor } from "@/features/avatar/components/avatar-editor";
import { Notice } from "@/components/ui/notice";
import { idle } from "@/lib/form";
import { updateProfileAction } from "../actions";

export function ProfileForm({
  name,
  email,
  userId,
  avatarUrl,
}: {
  name: string;
  email: string;
  userId: string;
  avatarUrl: string | null;
}) {
  const [state, formAction] = useActionState(updateProfileAction, idle);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    if (state.status === "success") toast.success("Perfil salvo");
  }, [state]);

  // `name` vem do servidor e é atualizado pelo refresh() da action.
  const dirty = draft.trim() !== name;

  return (
    <form action={formAction} className="flex max-w-[420px] flex-col gap-5" noValidate>
      <AvatarEditor userId={userId} name={draft.trim() || email} src={avatarUrl} />
      <div className="-mt-1 min-w-0">
        <p className="font-display truncate text-[18px] leading-tight font-semibold text-fg">
          {draft.trim() || email}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-fg-3">{email}</p>
      </div>

      {state.status === "error" && state.message && (
        <Notice tone="error" key={state.at}>
          {state.message}
        </Notice>
      )}

      <Field
        label="Nome"
        error={state.fieldErrors?.display_name}
        hint="Aparece no painel e, se vocês vincularem as contas, para a outra pessoa."
      >
        {(p) => (
          <Input
            {...p}
            name="display_name"
            autoComplete="name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={60}
          />
        )}
      </Field>

      <div>
        <SubmitButton variant="primary" disabled={!dirty}>
          Salvar perfil
        </SubmitButton>
      </div>
    </form>
  );
}
