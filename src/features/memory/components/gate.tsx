import "server-only";
import { libraryGate } from "@/features/library/components/gate";
import { EmptyState } from "@/features/library/components/parts";
import { getMemorySettings, MemoryNotInstalled } from "../queries";

/** Biblioteca acessível e revisão adaptativa instalada? Devolve a mensagem a mostrar quando não. */
export async function memoryGate(): Promise<React.ReactNode | null> {
  const lib = await libraryGate();
  if (lib) return lib;
  try {
    await getMemorySettings();
    return null;
  } catch (e) {
    if (!(e instanceof MemoryNotInstalled)) throw e;
    return (
      <EmptyState title="A revisão adaptativa ainda não foi instalada">
        No Supabase, abra SQL Editor e rode o arquivo supabase/migrations/0012_memory.sql. Depois, recarregue
        esta página.
      </EmptyState>
    );
  }
}
