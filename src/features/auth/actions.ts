"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/errors";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/form";
import { safeNextPath } from "@/lib/utils";
import { newPasswordSchema, resetRequestSchema, signInSchema, signUpSchema } from "./schemas";

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

const now = () => Date.now();

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email", "password", "next"] as const);
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { email: values.email },
      at: now(),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: authErrorMessage(error), values: { email: values.email }, at: now() };
  }
  redirect(safeNextPath(values.next));
}

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["name", "email", "password", "timezone"] as const);
  const parsed = signUpSchema.safeParse(values);
  const keep = { name: values.name, email: values.email };
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values: keep, at: now() };
  }

  const { name, email, password, timezone } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // O gatilho handle_new_user lê estes campos para criar o perfil.
      data: { display_name: name, timezone },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/painel`,
    },
  });
  if (error) {
    return { status: "error", message: authErrorMessage(error), values: keep, at: now() };
  }
  // Com confirmação de e-mail desligada, a sessão já vem pronta.
  if (data.session) redirect("/painel");

  return {
    status: "success",
    message: email,
    at: now(),
  };
}

export async function resendConfirmationAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse(formValues(formData, ["email"] as const));
  if (!parsed.success) return { status: "error", message: "E-mail inválido.", at: now() };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/painel` },
  });
  if (error) return { status: "error", message: authErrorMessage(error), at: now() };
  return { status: "success", message: "Enviamos um novo link.", at: now() };
}

export async function requestPasswordResetAction(_: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"] as const);
  const parsed = resetRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values, at: now() };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/redefinir-senha`,
  });
  // Limite de envio é o único erro que mostramos; os demais não revelam se a conta existe.
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) {
    return { status: "error", message: authErrorMessage(error), values, at: now() };
  }
  return { status: "success", message: parsed.data.email, at: now() };
}

export async function updatePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password", "confirm", "next"] as const);
  const parsed = newPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), at: now() };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: authErrorMessage(error), at: now() };
  }
  if (values.next) redirect(safeNextPath(values.next));
  return { status: "success", message: "Senha alterada.", at: now() };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
