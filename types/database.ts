export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          age: number | null;
          avatar_url: string | null;
          bio: string | null;
          country: string | null;
          created_at: string | null;
          full_name: string | null;
          home_chapter_id: string | null;
          id: string;
          appearance: 'dark' | 'light' | 'system' | null;
          language: string | null;
          onboarding_complete: boolean | null;
          personal_goal: string | null;
          role: 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin' | 'participant' | 'facilitator' | 'admin' | null;
          username: string | null;
        };
        Insert: {
          age?: number | null;
          avatar_url?: string | null;
          bio?: string | null;
          country?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          home_chapter_id?: string | null;
          id: string;
          appearance?: 'dark' | 'light' | 'system' | null;
          language?: string | null;
          onboarding_complete?: boolean | null;
          personal_goal?: string | null;
          role?: 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin' | 'participant' | 'facilitator' | 'admin' | null;
          username?: string | null;
        };
        Update: {
          age?: number | null;
          avatar_url?: string | null;
          bio?: string | null;
          country?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          home_chapter_id?: string | null;
          id?: string;
          appearance?: 'dark' | 'light' | 'system' | null;
          language?: string | null;
          onboarding_complete?: boolean | null;
          personal_goal?: string | null;
          role?: 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin' | 'participant' | 'facilitator' | 'admin' | null;
          username?: string | null;
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
      weekly_checkins: {
        Row: {
          consistency_score: number;
          created_at: string | null;
          habit_completed: number;
          habit_name: string;
          habit_target: number;
          id: string;
          profile_id: string;
          reflection: string | null;
          submitted_at: string | null;
          week_start: string;
          weekly_goal: string;
          workout_completed: number;
          workout_target: number;
        };
        Insert: {
          consistency_score?: number;
          created_at?: string | null;
          habit_completed?: number;
          habit_name: string;
          habit_target?: number;
          id?: string;
          profile_id: string;
          reflection?: string | null;
          submitted_at?: string | null;
          week_start: string;
          weekly_goal: string;
          workout_completed?: number;
          workout_target?: number;
        };
        Update: {
          consistency_score?: number;
          created_at?: string | null;
          habit_completed?: number;
          habit_name?: string;
          habit_target?: number;
          id?: string;
          profile_id?: string;
          reflection?: string | null;
          submitted_at?: string | null;
          week_start?: string;
          weekly_goal?: string;
          workout_completed?: number;
          workout_target?: number;
        };
        Relationships: [];
      };
      chapter_members: {
        Row: {
          chapter_id: string | null;
          id: string;
          joined_at: string | null;
          profile_id: string | null;
          role: 'chapter_member' | 'chapter_leader' | 'member' | 'facilitator' | null;
          status: 'pending' | 'active' | 'rejected' | 'removed';
          user_id: string | null;
        };
        Insert: {
          chapter_id?: string | null;
          id?: string;
          joined_at?: string | null;
          profile_id?: string | null;
          role?: 'chapter_member' | 'chapter_leader' | 'member' | 'facilitator' | null;
          status?: 'pending' | 'active' | 'rejected' | 'removed';
          user_id?: string | null;
        };
        Update: {
          chapter_id?: string | null;
          id?: string;
          joined_at?: string | null;
          profile_id?: string | null;
          role?: 'chapter_member' | 'chapter_leader' | 'member' | 'facilitator' | null;
          status?: 'pending' | 'active' | 'rejected' | 'removed';
          user_id?: string | null;
        };
        Relationships: [];
      };
      chapters: {
        Row: {
          city: string | null;
          country: string | null;
          created_at: string | null;
          created_by: string | null;
          facilitator_id: string | null;
          id: string;
          invite_code: string;
          is_verified: boolean;
          latitude: number | null;
          longitude: number | null;
          description: string | null;
          is_public: boolean | null;
          join_policy: 'invite_code' | 'request' | 'open' | null;
          member_count: number;
          meeting_day: string | null;
          meeting_location: string | null;
          name: string;
          public_join_enabled: boolean | null;
          region: string | null;
          slug: string;
          state: string | null;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          facilitator_id?: string | null;
          id?: string;
          invite_code: string;
          is_verified?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          description?: string | null;
          is_public?: boolean | null;
          join_policy?: 'invite_code' | 'request' | 'open' | null;
          member_count?: number;
          meeting_day?: string | null;
          meeting_location?: string | null;
          name: string;
          public_join_enabled?: boolean | null;
          region?: string | null;
          slug?: string;
          state?: string | null;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          facilitator_id?: string | null;
          id?: string;
          invite_code?: string;
          is_verified?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          description?: string | null;
          is_public?: boolean | null;
          join_policy?: 'invite_code' | 'request' | 'open' | null;
          member_count?: number;
          meeting_day?: string | null;
          meeting_location?: string | null;
          name?: string;
          public_join_enabled?: boolean | null;
          region?: string | null;
          slug?: string;
          state?: string | null;
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
      chapter_prompt_responses: {
        Row: {
          author_id: string;
          body: string;
          chapter_id: string;
          created_at: string | null;
          id: string;
          prompt_post_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          chapter_id: string;
          created_at?: string | null;
          id?: string;
          prompt_post_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          chapter_id?: string;
          created_at?: string | null;
          id?: string;
          prompt_post_id?: string;
        };
        Relationships: [];
      };
      chapter_post_reactions: {
        Row: {
          created_at: string | null;
          id: string;
          post_id: string;
          profile_id: string;
          reaction_type: 'respect';
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          post_id: string;
          profile_id: string;
          reaction_type?: 'respect';
        };
        Update: {
          created_at?: string | null;
          id?: string;
          post_id?: string;
          profile_id?: string;
          reaction_type?: 'respect';
        };
        Relationships: [];
      };
      chapter_join_requests: {
        Row: {
          chapter_id: string;
          created_at: string | null;
          id: string;
          message: string | null;
          profile_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: 'pending' | 'approved' | 'rejected';
        };
        Insert: {
          chapter_id: string;
          created_at?: string | null;
          id?: string;
          message?: string | null;
          profile_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
        };
        Update: {
          chapter_id?: string;
          created_at?: string | null;
          id?: string;
          message?: string | null;
          profile_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
        };
        Relationships: [];
      };
      invite_codes: {
        Row: {
          chapter_id: string;
          code: string;
          created_at: string | null;
          created_by: string | null;
          current_uses: number;
          expires_at: string | null;
          id: string;
          max_uses: number | null;
        };
        Insert: {
          chapter_id: string;
          code: string;
          created_at?: string | null;
          created_by?: string | null;
          current_uses?: number;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
        };
        Update: {
          chapter_id?: string;
          code?: string;
          created_at?: string | null;
          created_by?: string | null;
          current_uses?: number;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
        };
        Relationships: [];
      };
      chapter_events: {
        Row: {
          chapter_id: string;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          event_date: string;
          id: string;
          location: string | null;
          title: string;
        };
        Insert: {
          chapter_id: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          event_date: string;
          id?: string;
          location?: string | null;
          title: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          event_date?: string;
          id?: string;
          location?: string | null;
          title?: string;
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
      get_public_chapter_directory: {
        Args: {
          search_text?: string | null;
        };
        Returns: {
          country: string | null;
          description: string | null;
          id: string;
          is_public: boolean | null;
          join_policy: 'invite_code' | 'request' | 'open' | null;
          latitude: number | null;
          longitude: number | null;
          meeting_day: string | null;
          meeting_location: string | null;
          member_count: number;
          name: string;
          public_join_enabled: boolean | null;
          region: string | null;
        }[];
      };
      join_public_chapter: {
        Args: {
          target_chapter_id: string;
        };
        Returns: string;
      };
      request_chapter_join: {
        Args: {
          target_chapter_id: string;
          request_message?: string | null;
        };
        Returns: string;
      };
      redeem_invite_code: {
        Args: {
          target_invite_code: string;
        };
        Returns: string;
      };
      review_chapter_join_request: {
        Args: {
          target_request_id: string;
          next_status: 'approved' | 'rejected';
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
