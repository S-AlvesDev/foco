import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Settings2 } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { listNotifications } from "@/features/notifications/queries";

export const metadata: Metadata = { title: "Notificações" };

export default function NotificationsPage() {
  return (
    <Page className="max-w-[760px]">
      <PageHeader
        title="Notificações"
        description="Revisões, lembretes, metas e avisos do app."
        actions={
          <Button asChild variant="secondary">
            <Link href="/configuracoes#notificacoes">
              <Settings2 />
              Configurar
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-surface-2/50" aria-hidden />}>
        <List />
      </Suspense>
    </Page>
  );
}

async function List() {
  const { items, available, now } = await listNotifications(150);
  if (!available) {
    return (
      <Notice tone="error">
        Falta aplicar a atualização 0008 do banco no Supabase para usar as notificações.
      </Notice>
    );
  }
  return <NotificationList items={items} now={now} />;
}
