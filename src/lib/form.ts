import type { z } from "zod";

/** Estado devolvido por Server Actions usadas com useActionState. */
export type FormState<F extends string = string> = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<F, string>>;
  /** Valores enviados, para repovoar o formulário após um erro. */
  values?: Partial<Record<F, string>>;
  /** Muda a cada envio, para o cliente reagir mesmo a mensagens repetidas. */
  at?: number;
};

export const idle: FormState = { status: "idle" };

export function fieldErrorsFrom<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const out: Partial<Record<F, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as F | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function formValues<F extends string>(formData: FormData, keys: readonly F[]) {
  const out = {} as Record<F, string>;
  for (const k of keys) {
    const v = formData.get(k);
    out[k] = typeof v === "string" ? v : "";
  }
  return out;
}
