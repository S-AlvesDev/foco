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
      notifications: {
        Row: {
          body: string;
          created_at: string;
          dedupe_key: string;
          id: string;
          kind: string;
          push_claimed_at: string | null;
          push_state: string;
          read_at: string | null;
          title: string;
          url: string;
          user_id: string;
        };
        Insert: never;
        Update: { read_at?: string | null };
        Relationships: [];
      };
      notification_prefs: {
        Row: {
          cat_daily_goal: boolean;
          cat_goal_reached: boolean;
          cat_reviews: boolean;
          cat_streak: boolean;
          cat_study_reminder: boolean;
          cat_system: boolean;
          evening_check_time: string;
          push_enabled: boolean;
          reviews_time: string;
          study_reminder_time: string;
          updated_at: string;
          user_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notification_prefs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["notification_prefs"]["Row"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_used_at: string | null;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          banner_focus_x: number;
          banner_focus_y: number;
          banner_overlay: number;
          banner_path: string | null;
          banner_style: string;
          banner_zoom: number;
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
          banner_focus_x?: number;
          banner_focus_y?: number;
          banner_overlay?: number;
          banner_path?: string | null;
          banner_style?: string;
          banner_zoom?: number;
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
          banner_focus_x?: number;
          banner_focus_y?: number;
          banner_overlay?: number;
          banner_path?: string | null;
          banner_style?: string;
          banner_zoom?: number;
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
      study_focus: {
        Row: { title: string; updated_at: string; user_id: string };
        Insert: { title: string; updated_at?: string; user_id: string };
        Update: { title?: string; updated_at?: string; user_id?: string };
        Relationships: [];
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
      question_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_admins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      question_attempts: {
        Row: {
          answer: string;
          answered_on: string;
          created_at: string;
          id: string;
          is_correct: boolean;
          question_id: string;
          response: string | null;
          user_id: string;
        };
        Insert: {
          answer: string;
          answered_on?: string;
          created_at?: string;
          id?: string;
          is_correct?: boolean;
          question_id: string;
          response?: string | null;
          user_id?: string;
        };
        Update: {
          answer?: string;
          answered_on?: string;
          created_at?: string;
          id?: string;
          is_correct?: boolean;
          question_id?: string;
          response?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_attempts_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      question_notes: {
        Row: {
          favorite: boolean;
          note: string | null;
          question_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          favorite?: boolean;
          note?: string | null;
          question_id: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          favorite?: boolean;
          note?: string | null;
          question_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_notes_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      question_prefs: {
        Row: {
          area: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          area?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          area?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_prefs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      question_reports: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          message: string | null;
          question_id: string;
          resolved_at: string | null;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          question_id: string;
          resolved_at?: string | null;
          user_id?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          question_id?: string;
          resolved_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          alternativas: Json | null;
          area: string;
          assunto: string;
          banca_referencia: string | null;
          cargo: string | null;
          comentario: string | null;
          concurso: string;
          created_at: string;
          curso_referencia: string | null;
          data_producao: string | null;
          dificuldade: string;
          disciplina: string;
          enunciado: string;
          especialidade_referencia: string | null;
          explicacoes_incorretas: Json | null;
          fonte: string | null;
          gabarito: string | null;
          id: string;
          imported_by: string | null;
          justificativa: string | null;
          licenca: string | null;
          lote_producao: number | null;
          origem: string | null;
          referencias: Json;
          resposta_esperada: string | null;
          status_revisao: string | null;
          subassunto: string | null;
          tipo: string;
          updated_at: string;
          versao_schema: string | null;
        };
        Insert: {
          alternativas?: Json | null;
          area: string;
          assunto: string;
          banca_referencia?: string | null;
          cargo?: string | null;
          comentario?: string | null;
          concurso: string;
          created_at?: string;
          curso_referencia?: string | null;
          data_producao?: string | null;
          dificuldade: string;
          disciplina: string;
          enunciado: string;
          especialidade_referencia?: string | null;
          explicacoes_incorretas?: Json | null;
          fonte?: string | null;
          gabarito?: string | null;
          id: string;
          imported_by?: string | null;
          justificativa?: string | null;
          licenca?: string | null;
          lote_producao?: number | null;
          origem?: string | null;
          referencias?: Json;
          resposta_esperada?: string | null;
          status_revisao?: string | null;
          subassunto?: string | null;
          tipo: string;
          updated_at?: string;
          versao_schema?: string | null;
        };
        Update: {
          alternativas?: Json | null;
          area?: string;
          assunto?: string;
          banca_referencia?: string | null;
          cargo?: string | null;
          comentario?: string | null;
          concurso?: string;
          created_at?: string;
          curso_referencia?: string | null;
          data_producao?: string | null;
          dificuldade?: string;
          disciplina?: string;
          enunciado?: string;
          especialidade_referencia?: string | null;
          explicacoes_incorretas?: Json | null;
          fonte?: string | null;
          gabarito?: string | null;
          id?: string;
          imported_by?: string | null;
          justificativa?: string | null;
          licenca?: string | null;
          lote_producao?: number | null;
          origem?: string | null;
          referencias?: Json;
          resposta_esperada?: string | null;
          status_revisao?: string | null;
          subassunto?: string | null;
          tipo?: string;
          updated_at?: string;
          versao_schema?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_imported_by_fkey";
            columns: ["imported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      library_blocks: {
        Row: {
          anchor_text: string;
          archived_at: string | null;
          created_at: string;
          data: Json;
          id: string;
          kind: string;
          position: number;
          search: unknown | null;
          search_text: string;
          sources: Json;
          text_hash: string;
          topic_id: string;
          updated_at: string;
        };
        Insert: {
          anchor_text?: string;
          archived_at?: string | null;
          created_at?: string;
          data: Json;
          id: string;
          kind: string;
          position?: number;
          search_text?: string;
          sources?: Json;
          text_hash?: string;
          topic_id: string;
          updated_at?: string;
        };
        Update: {
          anchor_text?: string;
          archived_at?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          kind?: string;
          position?: number;
          search_text?: string;
          sources?: Json;
          text_hash?: string;
          topic_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "library_blocks_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "library_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      library_chapters: {
        Row: {
          archived_at: string | null;
          created_at: string;
          discipline_id: string;
          id: string;
          number: string | null;
          position: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          discipline_id: string;
          id: string;
          number?: string | null;
          position?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          discipline_id?: string;
          id?: string;
          number?: string | null;
          position?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "library_chapters_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "library_disciplines";
            referencedColumns: ["id"];
          },
        ];
      };
      library_contests: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          name: string;
          position: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id: string;
          name: string;
          position?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      library_disciplines: {
        Row: {
          archived_at: string | null;
          contest_id: string;
          created_at: string;
          description: string | null;
          id: string;
          imported_by: string | null;
          name: string;
          position: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          contest_id: string;
          created_at?: string;
          description?: string | null;
          id: string;
          imported_by?: string | null;
          name: string;
          position?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          contest_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          imported_by?: string | null;
          name?: string;
          position?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "library_disciplines_contest_id_fkey";
            columns: ["contest_id"];
            isOneToOne: false;
            referencedRelation: "library_contests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_disciplines_imported_by_fkey";
            columns: ["imported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      library_marks: {
        Row: {
          block_id: string | null;
          body: string | null;
          color: string | null;
          created_at: string;
          end_offset: number | null;
          id: string;
          kind: string;
          quote: string | null;
          start_offset: number | null;
          status: string;
          topic_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          block_id?: string | null;
          body?: string | null;
          color?: string | null;
          created_at?: string;
          end_offset?: number | null;
          id?: string;
          kind: string;
          quote?: string | null;
          start_offset?: number | null;
          status?: string;
          topic_id: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          block_id?: string | null;
          body?: string | null;
          color?: string | null;
          created_at?: string;
          end_offset?: number | null;
          id?: string;
          kind?: string;
          quote?: string | null;
          start_offset?: number | null;
          status?: string;
          topic_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "library_marks_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "library_blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_marks_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "library_topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_marks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      library_progress: {
        Row: {
          completed_at: string | null;
          last_block_id: string | null;
          last_read_at: string;
          percent: number;
          status: string;
          topic_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          last_block_id?: string | null;
          last_read_at?: string;
          percent?: number;
          status?: string;
          topic_id: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          completed_at?: string | null;
          last_block_id?: string | null;
          last_read_at?: string;
          percent?: number;
          status?: string;
          topic_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "library_progress_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "library_topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      library_sources: {
        Row: {
          created_at: string;
          discipline_id: string;
          file_name: string;
          id: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          discipline_id: string;
          file_name: string;
          id: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          discipline_id?: string;
          file_name?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "library_sources_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "library_disciplines";
            referencedColumns: ["id"];
          },
        ];
      };
      library_topics: {
        Row: {
          archived_at: string | null;
          block_count: number;
          chapter_id: string;
          created_at: string;
          discipline_id: string;
          id: string;
          number: string | null;
          parent_id: string | null;
          position: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          block_count?: number;
          chapter_id: string;
          created_at?: string;
          discipline_id: string;
          id: string;
          number?: string | null;
          parent_id?: string | null;
          position?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          block_count?: number;
          chapter_id?: string;
          created_at?: string;
          discipline_id?: string;
          id?: string;
          number?: string | null;
          parent_id?: string | null;
          position?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "library_topics_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "library_chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_topics_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "library_disciplines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_topics_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "library_topics";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      push_claim: {
        Args: { p_secret: string; p_limit?: number };
        Returns: {
          notification_id: string;
          title: string;
          body: string;
          url: string;
          kind: string;
          subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[];
        }[];
      };
      notify_test: { Args: never; Returns: undefined };
      push_report: { Args: { p_secret: string; p_results: Json }; Returns: undefined };
      push_subscribe: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string; p_user_agent: string };
        Returns: undefined;
      };
      timer_finish_offline: {
        Args: {
          p_timer_id: string;
          p_subject_id: string;
          p_study_type: Database["public"]["Enums"]["study_type"];
          p_started_at: string;
          p_ended_at: string;
          p_duration_seconds: number;
          p_topic?: string;
          p_notes?: string;
          p_questions_answered?: number;
          p_questions_correct?: number;
        };
        Returns: Database["public"]["Tables"]["study_sessions"]["Row"];
      };
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
      claim_question_admin: { Args: never; Returns: boolean };
      import_questions: { Args: { p_items: Json }; Returns: Json };
      is_question_admin: { Args: never; Returns: boolean };
      question_admin_exists: { Args: never; Returns: boolean };
      question_base: {
        Args: never;
        Returns: {
          id: string;
          area: string;
          concurso: string;
          disciplina: string;
          assunto: string;
          banca: string;
          dificuldade: string;
          tipo: string;
          search: string;
          last_correct: boolean;
          favorite: boolean;
          noted: boolean;
        }[];
      };
      question_community: { Args: { p_id: string }; Returns: Json };
      question_daily: {
        Args: { p_from: string; p_to: string };
        Returns: {
          day: string;
          area: string;
          disciplina: string;
          assunto: string;
          answered: number;
          correct: number;
        }[];
      };
      question_facets: { Args: { p: Json }; Returns: { field: string; value: string; n: number }[] };
      question_filter: {
        Args: { p: Json; p_skip?: string };
        Returns: {
          id: string;
          area: string;
          concurso: string;
          disciplina: string;
          assunto: string;
          banca: string;
          dificuldade: string;
          tipo: string;
          search: string;
          last_correct: boolean;
          favorite: boolean;
          noted: boolean;
        }[];
      };
      question_match: {
        Args: {
          p: Json;
          p_skip: string;
          area: string;
          concurso: string;
          disciplina: string;
          assunto: string;
          banca: string;
          dificuldade: string;
          tipo: string;
          search: string;
          last_correct: boolean;
          favorite: boolean;
          noted: boolean;
        };
        Returns: boolean;
      };
      question_search: {
        Args: { p: Json; p_offset?: number; p_limit?: number; p_seed?: string };
        Returns: { id: string; total: number }[];
      };
      library_archive: { Args: { p_kind: string; p_id: string; p_restore?: boolean }; Returns: undefined };
      library_can_read: { Args: never; Returns: boolean };
      library_import_blocks: { Args: { p_topic: string; p_blocks: Json }; Returns: Json };
      library_import_structure: { Args: { p: Json; p_mode?: string }; Returns: Json };
      library_overview: {
        Args: never;
        Returns: {
          contest_id: string;
          contest_name: string;
          discipline_id: string;
          discipline_name: string;
          description: string;
          chapters: number;
          topics: number;
          done: number;
          read_percent: number;
          last_topic_id: string;
          last_read_at: string;
        }[];
      };
      library_search: {
        Args: { p_query: string; p_discipline?: string; p_limit?: number };
        Returns: {
          kind: string;
          discipline_id: string;
          discipline_name: string;
          chapter_title: string;
          topic_id: string;
          topic_title: string;
          block_id: string;
          block_text: string;
          rank: number;
        }[];
      };
      library_touch: {
        Args: { p_topic: string; p_percent?: number; p_block?: string; p_status?: string };
        Returns: Database["public"]["Tables"]["library_progress"]["Row"];
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
