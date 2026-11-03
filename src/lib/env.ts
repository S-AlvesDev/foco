function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}. Veja .env.example.`);
  }
  return value;
}

// Referências literais para o Next.js embutir os valores no bundle do cliente.
export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
};
