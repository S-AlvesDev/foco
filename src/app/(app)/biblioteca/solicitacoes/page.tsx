import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Notice } from "@/components/ui/notice";
import { getProfile } from "@/lib/auth";
import { isQuestionAdmin } from "@/features/questions/queries";
import { getAccessRequests, type AccessRequest } from "@/features/library/access";
import { AccessRequestItem, type AdminRequestRow } from "@/features/library/components/access-admin";
import { EmptyState } from "@/features/library/components/parts";

export const metadata: Metadata = { title: "Solicitações de acesso" };

export default function AccessRequestsPage() {
  return (
    <Page>
      <Link
        href="/biblioteca"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-3 hover:text-fg"
      >
        <ChevronLeft className="size-4" />
        Biblioteca
      </Link>
      <PageHeader
        title="Solicitações de acesso"
        description="Quem pediu para estudar as apostilas e o plano de metas de um concurso."
      />
      <Suspense fallback={<div aria-hidden className="h-64 animate-pulse rounded-2xl bg-surface-2/40" />}>
        <Requests />
      </Suspense>
    </Page>
  );
}

async function Requests() {
  if (!(await isQuestionAdmin().catch(() => false)))
    return (
      <EmptyState title="Só a conta administradora vê esta página">
        É ela quem permite ou nega os pedidos de acesso à Biblioteca.
      </EmptyState>
    );
  const [all, profile] = await Promise.all([getAccessRequests(), getProfile()]);
  if (all === null)
    return (
      <Notice tone="warning">
        Para receber pedidos de acesso, rode a migração <strong>0014_library_access.sql</strong> no SQL Editor
        do Supabase.
      </Notice>
    );

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: profile.timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const row = (r: AccessRequest): AdminRequestRow => ({
    userId: r.userId,
    name: r.name,
    email: r.email,
    contestId: r.contestId,
    contestName: r.contestName,
    status: r.status,
    message: r.message,
    when:
      r.status === "pending"
        ? `pediu em ${fmt.format(new Date(r.requestedAt))}`
        : `${r.status === "approved" ? "liberado" : "negado"} em ${fmt.format(new Date(r.decidedAt ?? r.requestedAt))}`,
  });
  const groups = [
    { id: "pendentes", title: "Aguardando sua resposta", items: all.filter((r) => r.status === "pending") },
    { id: "liberados", title: "Com acesso", items: all.filter((r) => r.status === "approved") },
    { id: "negados", title: "Não aprovados", items: all.filter((r) => r.status === "denied") },
  ];

  if (!all.length)
    return (
      <EmptyState title="Nenhum pedido ainda">
        Quando alguém criar uma conta e pedir acesso a um concurso, o pedido aparece aqui e você recebe um
        aviso.
      </EmptyState>
    );

  return (
    <div className="flex flex-col gap-9">
      {groups.map((g) =>
        g.items.length || g.id === "pendentes" ? (
          <section key={g.id} aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="mb-3 flex items-baseline gap-2 text-[15px] font-semibold text-fg">
              {g.title}
              <span className="text-[13px] font-normal text-fg-3 tabular-nums">{g.items.length}</span>
            </h2>
            {g.items.length ? (
              <ul className="flex flex-col gap-3">
                {g.items.map((r) => (
                  <AccessRequestItem key={`${r.userId}:${r.contestId}`} row={row(r)} />
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-fg-3">Nenhum pedido esperando resposta.</p>
            )}
          </section>
        ) : null,
      )}
    </div>
  );
}
