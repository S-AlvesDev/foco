import type { Plan } from "./model";
import { PRF_PLAN } from "./plan-prf";
import { PMPE_PLAN } from "./plan-pmpe";
import { PCRN_PLAN } from "./plan-pcrn";
import { PPF_PLAN } from "./plan-ppf";

/** Planos disponíveis, na ordem em que aparecem para escolher. */
export const PLANS: Plan[] = [PRF_PLAN, PCRN_PLAN, PMPE_PLAN, PPF_PLAN];
export const getPlan = (id: string) => PLANS.find((p) => p.id === id) ?? null;

/** Cookie com o plano escolhido (vale para o aparelho). */
export const PLAN_COOKIE = "alpha_plano";
