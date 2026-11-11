import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Page, PageHeader, Section } from "@/components/layout/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOutAction } from "@/features/auth/actions";
import { NewPasswordForm } from "@/features/auth/components/new-password-form";
import { PreferencesForm } from "@/features/profile/components/preferences-form";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { SettingsNav } from "@/features/profile/components/settings-nav";
import { getProfile } from "@/lib/auth";
import { avatarUrl } from "@/features/avatar/server";
import { FocusChip } from "@/features/focus/components/focus-chip";
import { getStudyFocus } from "@/features/focus/queries";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { pushConfigured } from "@/features/notifications/dispatch";
import { getPrefs } from "@/features/notifications/queries";
import { BannerEditor } from "@/features/banner/components/banner-editor";
import { readBanner } from "@/features/banner/model";
import { bannerUrl } from "@/features/banner/server";

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
  const [profile, focus, notif] = await Promise.all([getProfile(), getStudyFocus(), getPrefs()]);
  const banner = readBanner(profile);
  const bannerSrc = await bannerUrl(banner.path);
  return (
    <div className="lg:grid lg:grid-cols-[196px_minmax(0,1fr)] lg:gap-10">
      <SettingsNav />
      <div className="flex min-w-0 flex-col gap-5">
        <Section id="perfil" title="Perfil" description="Como você aparece no app.">
          <ProfileForm
            name={profile.display_name}
            email={profile.email}
            userId={profile.id}
            avatarUrl={await avatarUrl(profile.avatar_path)}
          />
        </Section>

        <Section id="objetivo" title="Objetivo atual" description="Aparece no topo do painel. Só você vê.">
          <FocusChip title={focus.title} />
        </Section>

        <Section
          id="aparencia"
          title="Aparência"
          description="Como o painel aparece para você, em todos os aparelhos."
        >
          <div id="banner">
            <h3 className="text-[15px] font-semibold text-fg">Banner do painel</h3>
            <p className="mt-1 mb-4 text-[13px] leading-relaxed text-fg-3">
              Imagem no topo do painel, atrás da saudação. Só você vê.
            </p>
            <BannerEditor
              key={JSON.stringify(banner)}
              userId={profile.id}
              firstName={(profile.display_name || profile.email).split(" ")[0]}
              initial={banner}
              initialSrc={bannerSrc}
            />
          </div>
        </Section>

        <Section
          id="avisos"
          title="Notificações"
          description="Avisos no sino e, se quiser, no celular ou computador."
        >
          <div id="notificacoes" className="scroll-mt-24">
            <NotificationSettings
              initial={notif.prefs}
              available={notif.available}
              vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
              pushReady={pushConfigured()}
            />
          </div>
        </Section>

        <Section id="preferencias" title="Preferências" description="Valem para todos os seus aparelhos.">
          <PreferencesForm
            initial={{
              theme: profile.theme,
              timezone: profile.timezone,
              week_starts_on: profile.week_starts_on === 0 ? 0 : 1,
            }}
          />
        </Section>

        <Section id="senha" title="Senha" description="Troque a senha usada para entrar.">
          <div className="max-w-[420px]">
            <NewPasswordForm submitLabel="Alterar senha" />
          </div>
        </Section>

        <Section id="sessao" title="Sessão" description={`Conectado como ${profile.email}.`}>
          <form action={signOutAction}>
            <SubmitButton variant="secondary">
              <LogOut />
              Sair desta conta
            </SubmitButton>
          </form>
        </Section>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-hidden className="animate-pulse lg:grid lg:grid-cols-[196px_minmax(0,1fr)] lg:gap-10">
      <div className="hidden flex-col gap-2 lg:flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 rounded-lg bg-surface-2/60" />
        ))}
      </div>
      <div className="flex flex-col gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-2xl border border-border bg-surface-1" />
        ))}
      </div>
    </div>
  );
}
