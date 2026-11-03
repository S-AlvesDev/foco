import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mensagem de formulário (erro geral ou confirmação). */
export function Notice({
  tone,
  children,
  className,
}: {
  tone: "error" | "success" | "warning";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "error" ? CircleAlert : tone === "warning" ? TriangleAlert : CircleCheck;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-[13px] leading-snug",
        tone === "error" && "border-danger/25 bg-danger-subtle text-fg",
        tone === "success" && "border-success/25 bg-success/8 text-fg",
        tone === "warning" && "border-warning/30 bg-warning/10 text-fg",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-px size-4 shrink-0",
          tone === "error" ? "text-danger" : tone === "warning" ? "text-warning" : "text-success",
        )}
      />
      <div>{children}</div>
    </div>
  );
}
