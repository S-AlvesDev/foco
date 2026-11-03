import type { MetadataRoute } from "next";

/** Instalação como app (Android, desktop e iPhone pelo "Adicionar à Tela de Início"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Missão Alpha-01",
    short_name: "Alpha-01",
    description: "Organize seus estudos, registre horas e acompanhe sua evolução.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/painel?origem=app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#08090d",
    theme_color: "#08090d",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Iniciar cronômetro",
        short_name: "Cronômetro",
        url: "/painel?acao=cronometro",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Registrar sessão",
        short_name: "Registrar",
        url: "/painel?acao=registrar",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: "Revisões", url: "/revisoes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
