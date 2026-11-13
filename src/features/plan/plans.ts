import type { Plan } from "./model";
import { PRF_PLAN } from "./plan-prf";
import { PMPE_PLAN } from "./plan-pmpe";

/** Planos disponíveis, na ordem em que aparecem para escolher. */
export const PLANS: Plan[] = [PRF_PLAN, PMPE_PLAN];
export const getPlan = (id: string) => PLANS.find((p) => p.id === id) ?? null;

/** Cookie com o plano escolhido (vale para o aparelho). */
export const PLAN_COOKIE = "alpha_plano";
