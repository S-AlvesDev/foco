import "server-only";
import { canReadLibrary, LibraryNotInstalled } from "../queries";
import { EmptyState } from "./parts";

/** Biblioteca instalada e acessível? Devolve a mensagem a mostrar quando não. */
export async function libraryGate(): Promise<React.ReactNode | null> {
  try {
    if (await canReadLibrary()) return null;
    return (
      <EmptyState title="A Biblioteca é só de vocês dois">
        Ela fica disponível para a conta administradora e para quem está no mesmo espaço da Nossa Jornada.
        Entre no espaço pela página Nossa Jornada para ter acesso.
      </EmptyState>
    );
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
