import { AlarmClock, CalendarClock, Flame, Megaphone, Target, Trophy, type LucideIcon } from "lucide-react";

export const NOTIFICATION_KINDS = [
  "reviews",
  "study_reminder",
  "daily_goal",
  "streak",
  "goal_reached",
  "system",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const KIND_META: Record<
  NotificationKind,
  { label: string; hint: string; icon: LucideIcon; pref: string }
> = {
  reviews: {
    label: "Revisões programadas",
    hint: "Quantas revisões vencem hoje.",
    icon: CalendarClock,
    pref: "cat_reviews",
  },
  study_reminder: {
    label: "Lembrete de estudo",
    hint: "Se você ainda não estudou no dia.",
    icon: AlarmClock,
    pref: "cat_study_reminder",
  },
  daily_goal: {
    label: "Meta diária não concluída",
    hint: "À noite, quanto falta para a meta do dia.",
    icon: Target,
    pref: "cat_daily_goal",
  },
  streak: {
    label: "Sequência em risco",
    hint: "À noite, se a sequência de dias pode quebrar.",
    icon: Flame,
    pref: "cat_streak",
  },
  goal_reached: {
    label: "Metas alcançadas",
    hint: "Quando você completa uma meta.",
    icon: Trophy,
    pref: "cat_goal_reached",
  },
  system: {
    label: "Avisos importantes",
    hint: "Novidades e avisos do app.",
    icon: Megaphone,
    pref: "cat_system",
  },
};

export type Prefs = {
  push_enabled: boolean;
  cat_reviews: boolean;
  cat_daily_goal: boolean;
  cat_study_reminder: boolean;
  cat_streak: boolean;
  cat_goal_reached: boolean;
  cat_system: boolean;
  reviews_time: string;
  study_reminder_time: string;
  evening_check_time: string;
};

export const DEFAULT_PREFS: Prefs = {
  push_enabled: false,
  cat_reviews: true,
  cat_daily_goal: true,
  cat_study_reminder: true,
  cat_streak: true,
  cat_goal_reached: true,
  cat_system: true,
  reviews_time: "08:00",
  study_reminder_time: "19:00",
  evening_check_time: "20:30",
};
