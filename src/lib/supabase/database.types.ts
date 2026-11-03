// Gerado a partir do schema do banco. Não edite à mão.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          achieved_on: string;
          created_at: string;
          detail: string | null;
          id: string;
          is_shared: boolean;
          kind: string;
          title: string;
          user_id: string;
        };
        Insert: {
          achieved_on: string;
          created_at?: string;
          detail?: string | null;
          id?: string;
          is_shared?: boolean;
          kind: string;
          title: string;
          user_id?: string;
        };
        Update: {
          achieved_on?: string;
          created_at?: string;
          detail?: string | null;
          id?: string;
          is_shared?: boolean;
          kind?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      active_timers: {
        Row: {
          accumulated_seconds: number;
          id: string;
          segment_started_at: string | null;
          started_at: string;
          status: Database["public"]["Enums"]["timer_status"];
          study_type: Database["public"]["Enums"]["study_type"];
          subject_id: string;
          topic: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accumulated_seconds?: number;
          id?: string;
          segment_started_at?: string | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["timer_status"];
          study_type?: Database["public"]["Enums"]["study_type"];
          subject_id: string;
          topic?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          accumulated_seconds?: number;
          id?: string;
          segment_started_at?: string | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["timer_status"];
          study_type?: Database["public"]["Enums"]["study_type"];
          subject_id?: string;
          topic?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "active_timers_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "active_timers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      couple_members: {
        Row: {
          couple_id: string;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          couple_id: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          couple_id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "couple_members_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "couple_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      couples: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          invite_code: string | null;
          invite_expires_at: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          name?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "couples_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      note_labels: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["label_kind"];
          name: string;
          position: number;
          user_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["label_kind"];
          name: string;
          position?: number;
          user_id?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["label_kind"];
          name?: string;
          position?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "note_labels_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string;
          id: string;
          theme: Database["public"]["Enums"]["theme_pref"];
          timezone: string;
          updated_at: string;
          week_starts_on: number;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          theme?: Database["public"]["Enums"]["theme_pref"];
          timezone?: string;
          updated_at?: string;
          week_starts_on?: number;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          theme?: Database["public"]["Enums"]["theme_pref"];
          timezone?: string;
          updated_at?: string;
          week_starts_on?: number;
        };
        Relationships: [];
      };
      shared_settings: {
        Row: {
          couple_id: string;
          share_goal_progress: boolean;
          share_study_time: boolean;
          share_subject_breakdown: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          couple_id: string;
          share_goal_progress?: boolean;
          share_study_time?: boolean;
          share_subject_breakdown?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          couple_id?: string;
          share_goal_progress?: boolean;
          share_study_time?: boolean;
          share_subject_breakdown?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shared_settings_couple_id_user_id_fkey";
            columns: ["couple_id", "user_id"];
            isOneToOne: true;
            referencedRelation: "couple_members";
            referencedColumns: ["couple_id", "user_id"];
          },
        ];
      };
      study_challenges: {
        Row: {
          archived_at: string | null;
          couple_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_on: string;
          id: string;
          kind: Database["public"]["Enums"]["challenge_kind"];
          metric: Database["public"]["Enums"]["challenge_metric"];
          scope: Database["public"]["Enums"]["challenge_scope"];
          starts_on: string;
          target: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          couple_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_on: string;
          id?: string;
          kind: Database["public"]["Enums"]["challenge_kind"];
          metric: Database["public"]["Enums"]["challenge_metric"];
          scope?: Database["public"]["Enums"]["challenge_scope"];
          starts_on: string;
          target: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          couple_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_on?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["challenge_kind"];
          metric?: Database["public"]["Enums"]["challenge_metric"];
          scope?: Database["public"]["Enums"]["challenge_scope"];
          starts_on?: string;
          target?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_challenges_couple_id_fkey";
            columns: ["couple_id"];
            isOneToOne: false;
            referencedRelation: "couples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_challenges_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_diaries: {
        Row: {
          created_at: string;
          difficulties: string | null;
          entry_date: string;
          id: string;
          learned: string | null;
          studied: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          difficulties?: string | null;
          entry_date: string;
          id?: string;
          learned?: string | null;
          studied?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          difficulties?: string | null;
          entry_date?: string;
          id?: string;
          learned?: string | null;
          studied?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_diaries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_goals: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          metric: Database["public"]["Enums"]["goal_metric"];
          period: Database["public"]["Enums"]["goal_period"];
          subject_id: string | null;
          target: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metric: Database["public"]["Enums"]["goal_metric"];
          period: Database["public"]["Enums"]["goal_period"];
          subject_id?: string | null;
          target: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metric?: Database["public"]["Enums"]["goal_metric"];
          period?: Database["public"]["Enums"]["goal_period"];
          subject_id?: string | null;
          target?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_goals_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_note_tags: {
        Row: {
          label_id: string;
          note_id: string;
          user_id: string;
        };
        Insert: {
          label_id: string;
          note_id: string;
          user_id?: string;
        };
        Update: {
          label_id?: string;
          note_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_note_tags_label_id_user_id_fkey";
            columns: ["label_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "note_labels";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_note_tags_note_id_user_id_fkey";
            columns: ["note_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "study_notes";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      study_notes: {
        Row: {
          category_id: string | null;
          content: Json;
          content_text: string;
          created_at: string;
          id: string;
          is_favorite: boolean;
          search: unknown | null;
          subject_id: string | null;
          title: string;
          topic: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_id?: string | null;
          content?: Json;
          content_text?: string;
          created_at?: string;
          id?: string;
          is_favorite?: boolean;
          subject_id?: string | null;
          title?: string;
          topic?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category_id?: string | null;
          content?: Json;
          content_text?: string;
          created_at?: string;
          id?: string;
          is_favorite?: boolean;
          subject_id?: string | null;
          title?: string;
          topic?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_notes_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "note_labels";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_notes_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_reviews: {
        Row: {
          comment: string | null;
          completed_at: string | null;
          created_at: string;
          due_date: string;
          id: string;
          interval_days: number | null;
          note_id: string | null;
          previous_review_id: string | null;
          session_id: string | null;
          status: Database["public"]["Enums"]["review_status"];
          subject_id: string;
          topic: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          completed_at?: string | null;
          created_at?: string;
          due_date: string;
          id?: string;
          interval_days?: number | null;
          note_id?: string | null;
          previous_review_id?: string | null;
          session_id?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          subject_id: string;
          topic: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          comment?: string | null;
          completed_at?: string | null;
          created_at?: string;
          due_date?: string;
          id?: string;
          interval_days?: number | null;
          note_id?: string | null;
          previous_review_id?: string | null;
          session_id?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          subject_id?: string;
          topic?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_reviews_note_id_user_id_fkey";
            columns: ["note_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "study_notes";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_reviews_previous_review_id_user_id_fkey";
            columns: ["previous_review_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "study_reviews";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_reviews_session_id_user_id_fkey";
            columns: ["session_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_reviews_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_sessions: {
        Row: {
          created_at: string;
          duration_seconds: number;
          ended_at: string | null;
          id: string;
          notes: string | null;
          questions_answered: number | null;
          questions_correct: number | null;
          session_date: string;
          source: string;
          started_at: string | null;
          study_type: Database["public"]["Enums"]["study_type"];
          subject_id: string;
          timer_id: string | null;
          topic: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_seconds: number;
          ended_at?: string | null;
          id?: string;
          notes?: string | null;
          questions_answered?: number | null;
          questions_correct?: number | null;
          session_date: string;
          source?: string;
          started_at?: string | null;
          study_type?: Database["public"]["Enums"]["study_type"];
          subject_id: string;
          timer_id?: string | null;
          topic?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number;
          ended_at?: string | null;
          id?: string;
          notes?: string | null;
          questions_answered?: number | null;
          questions_correct?: number | null;
          session_date?: string;
          source?: string;
          started_at?: string | null;
          study_type?: Database["public"]["Enums"]["study_type"];
          subject_id?: string;
          timer_id?: string | null;
          topic?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_user_id_fkey";
            columns: ["subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subjects: {
        Row: {
          archived_at: string | null;
          color: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          position: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          color?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          archived_at?: string | null;
          color?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      challenge_progress: { Args: { p_challenge_id: string }; Returns: { user_id: string; value: number }[] };
      couple_create: { Args: { p_name?: string }; Returns: Database["public"]["Tables"]["couples"]["Row"] };
      couple_daily_totals: {
        Args: { p_from: string; p_to: string };
        Returns: { user_id: string; day: string; seconds: number; sessions: number }[];
      };
      couple_goal_progress: {
        Args: never;
        Returns: {
          user_id: string;
          goal_id: string;
          period: Database["public"]["Enums"]["goal_period"];
          metric: Database["public"]["Enums"]["goal_metric"];
          target: number;
          subject_name: string;
          has_subject: boolean;
          value: number;
        }[];
      };
      couple_join: { Args: { p_code: string }; Returns: Database["public"]["Tables"]["couples"]["Row"] };
      couple_leave: { Args: never; Returns: undefined };
      couple_regenerate_invite: { Args: never; Returns: string };
      couple_streaks: {
        Args: never;
        Returns: { user_id: string; current_streak: number; best_streak: number }[];
      };
      couple_subject_totals: {
        Args: { p_from: string; p_to: string };
        Returns: { user_id: string; subject_name: string; color: string; seconds: number }[];
      };
      f_unaccent: { Args: { arg0: string }; Returns: string };
      is_couple_member: { Args: { p_couple_id: string }; Returns: boolean };
      local_today: { Args: { p_user: string }; Returns: string };
      my_breakdown: {
        Args: { p_from: string; p_to: string };
        Returns: {
          subject_id: string;
          study_type: Database["public"]["Enums"]["study_type"];
          seconds: number;
          sessions: number;
          questions: number;
          correct: number;
        }[];
      };
      my_couple_id: { Args: never; Returns: string };
      my_daily_totals: {
        Args: { p_from: string; p_to: string };
        Returns: { day: string; seconds: number; sessions: number; questions: number; correct: number }[];
      };
      my_monthly_totals: {
        Args: never;
        Returns: { month: string; seconds: number; sessions: number; study_days: number }[];
      };
      my_streak: { Args: never; Returns: { current_streak: number; best_streak: number }[] };
      my_study_stats: {
        Args: { p_from: string; p_to: string };
        Returns: {
          day: string;
          subject_id: string;
          study_type: Database["public"]["Enums"]["study_type"];
          seconds: number;
          sessions: number;
          questions: number;
        }[];
      };
      my_subject_totals: {
        Args: never;
        Returns: { subject_id: string; seconds: number; sessions: number; last_date: string }[];
      };
      partner_id: { Args: never; Returns: string };
      refresh_my_achievements: { Args: never; Returns: number };
      reorder_subjects: { Args: { p_ids: string[] }; Returns: undefined };
      review_complete: {
        Args: { p_id: string; p_comment?: string; p_next_due?: string; p_skip?: boolean };
        Returns: string;
      };
      review_reopen: { Args: { p_id: string }; Returns: undefined };
      subject_usage: {
        Args: { p_subject_id: string };
        Returns: { sessions: number; seconds: number; notes: number; reviews: number; goals: number }[];
      };
      timer_discard: { Args: never; Returns: undefined };
      timer_finish: {
        Args: {
          p_topic?: string;
          p_notes?: string;
          p_questions_answered?: number;
          p_questions_correct?: number;
          p_duration_seconds?: number;
        };
        Returns: Database["public"]["Tables"]["study_sessions"]["Row"];
      };
      timer_pause: { Args: never; Returns: Database["public"]["Tables"]["active_timers"]["Row"] };
      timer_resume: { Args: never; Returns: Database["public"]["Tables"]["active_timers"]["Row"] };
      timer_start: {
        Args: {
          p_subject_id: string;
          p_topic?: string;
          p_study_type?: Database["public"]["Enums"]["study_type"];
        };
        Returns: Database["public"]["Tables"]["active_timers"]["Row"];
      };
    };
    Enums: {
      challenge_kind: "joint_goal" | "weekly_challenge";
      challenge_metric: "minutes" | "sessions" | "study_days" | "questions";
      challenge_scope: "combined" | "each";
      goal_metric: "minutes" | "sessions" | "questions";
      goal_period: "daily" | "weekly" | "monthly";
      label_kind: "category" | "tag";
      review_status: "pending" | "done" | "skipped";
      study_type: "theory" | "questions" | "review" | "mock_exam" | "reading";
      theme_pref: "dark" | "light" | "system";
      timer_status: "running" | "paused";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
