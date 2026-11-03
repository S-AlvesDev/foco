"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    <Button variant="primary" size="lg" onClick={() => location.reload()}>
      <RotateCw />
      Tentar de novo
    </Button>
  );
}
