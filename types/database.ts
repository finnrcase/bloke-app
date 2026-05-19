export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          age: number | null;
          country: string | null;
          created_at: string | null;
          full_name: string | null;
          id: string;
          language: string | null;
          onboarding_complete: boolean | null;
          personal_goal: string | null;
          role: 'participant' | 'facilitator' | 'admin' | null;
        };
        Insert: {
          age?: number | null;
          country?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          id: string;
          language?: string | null;
          onboarding_complete?: boolean | null;
          personal_goal?: string | null;
          role?: 'participant' | 'facilitator' | 'admin' | null;
        };
        Update: {
          age?: number | null;
          country?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          id?: string;
          language?: string | null;
          onboarding_complete?: boolean | null;
          personal_goal?: string | null;
          role?: 'participant' | 'facilitator' | 'admin' | null;
        };
        Relationships: [];
      };
      curriculum_weeks: {
        Row: {
          act_text: string | null;
          created_at: string | null;
          id: string;
          identity_statement: string | null;
          learn_text: string | null;
          log_prompts: Json | null;
          milestone_name: string | null;
          title: string;
          week_number: number;
        };
        Insert: {
          act_text?: string | null;
          created_at?: string | null;
          id?: string;
          identity_statement?: string | null;
          learn_text?: string | null;
          log_prompts?: Json | null;
          milestone_name?: string | null;
          title: string;
          week_number: number;
        };
        Update: {
          act_text?: string | null;
          created_at?: string | null;
          id?: string;
          identity_statement?: string | null;
          learn_text?: string | null;
          log_prompts?: Json | null;
          milestone_name?: string | null;
          title?: string;
          week_number?: number;
        };
        Relationships: [];
      };
      weekly_progress: {
        Row: {
          act_complete: boolean | null;
          created_at: string | null;
          id: string;
          learn_complete: boolean | null;
          log_complete: boolean | null;
          profile_id: string | null;
          submitted_at: string | null;
          week_number: number | null;
        };
        Insert: {
          act_complete?: boolean | null;
          created_at?: string | null;
          id?: string;
          learn_complete?: boolean | null;
          log_complete?: boolean | null;
          profile_id?: string | null;
          submitted_at?: string | null;
          week_number?: number | null;
        };
        Update: {
          act_complete?: boolean | null;
          created_at?: string | null;
          id?: string;
          learn_complete?: boolean | null;
          log_complete?: boolean | null;
          profile_id?: string | null;
          submitted_at?: string | null;
          week_number?: number | null;
        };
        Relationships: [];
      };
      chapter_members: {
        Row: {
          chapter_id: string | null;
          id: string;
          joined_at: string | null;
          profile_id: string | null;
          role: 'member' | 'facilitator' | null;
        };
        Insert: {
          chapter_id?: string | null;
          id?: string;
          joined_at?: string | null;
          profile_id?: string | null;
          role?: 'member' | 'facilitator' | null;
        };
        Update: {
          chapter_id?: string | null;
          id?: string;
          joined_at?: string | null;
          profile_id?: string | null;
          role?: 'member' | 'facilitator' | null;
        };
        Relationships: [];
      };
      chapters: {
        Row: {
          country: string | null;
          created_at: string | null;
          facilitator_id: string | null;
          id: string;
          invite_code: string;
          name: string;
          region: string | null;
        };
        Insert: {
          country?: string | null;
          created_at?: string | null;
          facilitator_id?: string | null;
          id?: string;
          invite_code: string;
          name: string;
          region?: string | null;
        };
        Update: {
          country?: string | null;
          created_at?: string | null;
          facilitator_id?: string | null;
          id?: string;
          invite_code?: string;
          name?: string;
          region?: string | null;
        };
        Relationships: [];
      };
      chapter_posts: {
        Row: {
          author_id: string | null;
          body: string | null;
          chapter_id: string | null;
          created_at: string | null;
          id: string;
          post_type: 'announcement' | 'weekly_prompt' | 'win' | null;
          title: string | null;
        };
        Insert: {
          author_id?: string | null;
          body?: string | null;
          chapter_id?: string | null;
          created_at?: string | null;
          id?: string;
          post_type?: 'announcement' | 'weekly_prompt' | 'win' | null;
          title?: string | null;
        };
        Update: {
          author_id?: string | null;
          body?: string | null;
          chapter_id?: string | null;
          created_at?: string | null;
          id?: string;
          post_type?: 'announcement' | 'weekly_prompt' | 'win' | null;
          title?: string | null;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          attended_at: string | null;
          chapter_id: string | null;
          id: string;
          profile_id: string | null;
        };
        Insert: {
          attended_at?: string | null;
          chapter_id?: string | null;
          id?: string;
          profile_id?: string | null;
        };
        Update: {
          attended_at?: string | null;
          chapter_id?: string | null;
          id?: string;
          profile_id?: string | null;
        };
        Relationships: [];
      };
      journal_logs: {
        Row: {
          answers: Json | null;
          created_at: string | null;
          id: string;
          profile_id: string | null;
          week_number: number | null;
        };
        Insert: {
          answers?: Json | null;
          created_at?: string | null;
          id?: string;
          profile_id?: string | null;
          week_number?: number | null;
        };
        Update: {
          answers?: Json | null;
          created_at?: string | null;
          id?: string;
          profile_id?: string | null;
          week_number?: number | null;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          category: string | null;
          code: string;
          description: string | null;
          id: string;
          identity_statement: string | null;
          level: string | null;
          name: string;
        };
        Insert: {
          category?: string | null;
          code: string;
          description?: string | null;
          id?: string;
          identity_statement?: string | null;
          level?: string | null;
          name: string;
        };
        Update: {
          category?: string | null;
          code?: string;
          description?: string | null;
          id?: string;
          identity_statement?: string | null;
          level?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          badge_id: string | null;
          earned_at: string | null;
          id: string;
          profile_id: string | null;
        };
        Insert: {
          badge_id?: string | null;
          earned_at?: string | null;
          id?: string;
          profile_id?: string | null;
        };
        Update: {
          badge_id?: string | null;
          earned_at?: string | null;
          id?: string;
          profile_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_chapter_by_invite_code: {
        Args: {
          target_invite_code: string;
        };
        Returns: string;
      };
      get_chapter_member_count: {
        Args: {
          target_chapter_id: string;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
