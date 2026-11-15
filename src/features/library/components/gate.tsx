import "server-only";
import { canReadLibrary, LibraryNotInstalled } from "../queries";
import { getAccessState } from "../access";
import { AccessRequestList } from "./access-request";
import { EmptyState } from "./parts";

/** Biblioteca instalada e acessível? Devolve a mensagem a mostrar quando não. */
export async function libraryGate(): Promise<React.ReactNode | null> {
  try {
    if (await canReadLibrary()) return null;
    const access = await getAccessState();
    if (!access.installed)
      return (
        <EmptyState title="A Biblioteca é só de vocês dois">
          Ela fica disponível para a conta administradora e para quem está no mesmo espaço da Nossa Jornada.
          Entre no espaço pela página Nossa Jornada para ter acesso.
        </EmptyState>
      );
    return <AccessRequestPanel contests={access.contests} />;
  } catch (e) {
    if (!(e instanceof LibraryNotInstalled)) throw e;
    return (
      <EmptyState title="A Biblioteca ainda não foi instalada">
        No Supabase, abra SQL Editor e rode o arquivo supabase/migrations/0011_library.sql. Depois, recarregue
        esta página.
      </EmptyState>
    );
  }
}

/** Para quem ainda não tem acesso: escolher o concurso e pedir. */
export function AccessRequestPanel({
  contests,
  title = "Peça acesso ao seu concurso",
}: {
  contests: Parameters<typeof AccessRequestList>[0]["contests"];
  title?: string;
}) {
  return (
    <section aria-labelledby="acesso-titulo" className="max-w-[720px]">
      <h2 id="acesso-titulo" className="font-display text-[22px] leading-tight font-semibold text-fg">
        {title}
      </h2>
      <p className="mt-2 mb-5 max-w-[60ch] text-[14px] leading-relaxed text-fg-2">
        As apostilas são liberadas por concurso. Escolha o seu e envie o pedido: quando a administradora
        permitir, você passa a ver as apostilas dele aqui e a missão do dia no painel.
      </p>
      <AccessRequestList contests={contests} />
    </section>
  );
}
