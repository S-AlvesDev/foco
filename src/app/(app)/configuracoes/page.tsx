import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Page, PageHeader, Section } from "@/components/layout/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOutAction } from "@/features/auth/actions";
import { NewPasswordForm } from "@/features/auth/components/new-password-form";
import { PreferencesForm } from "@/features/profile/components/preferences-form";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <Page>
      <PageHeader title="Configurações" description="Sua conta e como o app funciona para você." />
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </Page>
  );
}

async function Settings() {
  const profile = await getProfile();
  return (
    <>
      <Section title="Perfil" description="Como você aparece no app.">
        <ProfileForm name={profile.display_name} email={profile.email} />
      </Section>

      <Section title="Preferências" description="Valem para todos os seus aparelhos.">
        <PreferencesForm
          initial={{
            theme: profile.theme,
            timezone: profile.timezone,
            week_starts_on: profile.week_starts_on === 0 ? 0 : 1,
          }}
        />
      </Section>

      <Section title="Senha" description="Troque a senha usada para entrar.">
        <div className="max-w-[420px]">
          <NewPasswordForm submitLabel="Alterar senha" />
        </div>
      </Section>

      <Section title="Sessão" description={`Conectado como ${profile.email}.`}>
        <form action={signOutAction}>
          <SubmitButton variant="secondary">
            <LogOut />
            Sair desta conta
          </SubmitButton>
        </form>
      </Section>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="grid gap-5 border-t border-border py-8 first:border-t-0 first:pt-0 md:grid-cols-[240px_1fr] md:gap-10"
        >
          <div className="h-3.5 w-24 rounded bg-surface-2" />
          <div className="flex max-w-[420px] flex-col gap-3">
            <div className="h-3 w-16 rounded bg-surface-2" />
            <div className="h-9 rounded-md bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
