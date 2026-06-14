export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          age: number | null;
          avatar_url: string | null;
          birthdate: string | null;
          bio: string | null;
          city: string | null;
          country: string | null;
          created_at: string | null;
          current_curriculum_week: number;
          curriculum_completed_at: string | null;
          curriculum_started_at: string | null;
          first_name: string | null;
          full_name: string | null;
          home_chapter_id: string | null;
          id: string;
          appearance: 'dark' | 'light' | 'system' | null;
          language: string | null;
          last_curriculum_activity_at: string | null;
          last_name: string | null;
          onboarding_complete: boolean | null;
          personal_goal: string | null;
          role: 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin' | 'corporate_bloke' | 'participant' | 'facilitator' | 'admin' | null;
          state: string | null;
          username: string | null;
        };
        Insert: {
          age?: number | null;
          avatar_url?: string | null;
          birthdate?: string | null;
          bio?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          current_curriculum_week?: number;
          curriculum_completed_at?: string | null;
          curriculum_started_at?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          home_chapter_id?: string | null;
          id: string;
          appearance?: 'dark' | 'light' | 'system' | null;
          language?: string | null;
          last_curriculum_activity_at?: string | null;
          last_name?: string | null;
          onboarding_complete?: boolean | null;
          personal_goal?: string | null;
          role?: 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin' | 'corporate_bloke' | 'participant' | 'facilitator' | 'admin' | null;
          state?: string | null;
          username?: string | null;
        };
        Update: {
          age?: number | null;
          avatar_url?: string | null;
          birthdate?: string | null;
          bio?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          current_curriculum_week?: number;
          curriculum_completed_at?: string | null;
          curriculum_started_at?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          home_chapter_id?: string | null;
          id?: string;
          appearance?: 'dark' | 'light' | 'system' | null;
          language?: string | null;
          last_curriculum_activity_at?: string | null;
          last_name?: string | null;
          onboarding_complete?: boolean | null;
          personal_goal?: string | null;
          role?: 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin' | 'corporate_bloke' | 'participant' | 'facilitator' | 'admin' | null;
          state?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      profile_details: {
        Row: {
          career_interests: string[];
          created_at: string;
          goals: string[];
          interests: string[];
          languages_spoken: string[];
          personal_aspirations: string | null;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          career_interests?: string[];
          created_at?: string;
          goals?: string[];
          interests?: string[];
          languages_spoken?: string[];
          personal_aspirations?: string | null;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          career_interests?: string[];
          created_at?: string;
          goals?: string[];
          interests?: string[];
          languages_spoken?: string[];
          personal_aspirations?: string | null;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_details_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      interest_options: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          label: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id: string;
          is_active?: boolean;
          label: string;
          sort_order: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      goal_options: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          label: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id: string;
          is_active?: boolean;
          label: string;
          sort_order: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      profile_interests: {
        Row: {
          created_at: string;
          interest_id: string;
          profile_id: string;
        };
        Insert: {
          created_at?: string;
          interest_id: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          interest_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_interests_interest_id_fkey';
            columns: ['interest_id'];
            isOneToOne: false;
            referencedRelation: 'interest_options';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_interests_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_goals: {
        Row: {
          created_at: string;
          goal_id: string;
          profile_id: string;
        };
        Insert: {
          created_at?: string;
          goal_id: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          goal_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_goals_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goal_options';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_goals_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      curriculum_weeks: {
        Row: {
          act_text: string | null;
          activity_title: string | null;
          created_at: string | null;
          id: string;
          identity_statement: string | null;
          lesson_title: string | null;
          learn_text: string | null;
          log_prompts: Json | null;
          milestone_name: string | null;
          program_phase: string | null;
          title: string;
          week_number: number;
        };
        Insert: {
          act_text?: string | null;
          activity_title?: string | null;
          created_at?: string | null;
          id?: string;
          identity_statement?: string | null;
          lesson_title?: string | null;
          learn_text?: string | null;
          log_prompts?: Json | null;
          milestone_name?: string | null;
          program_phase?: string | null;
          title: string;
          week_number: number;
        };
        Update: {
          act_text?: string | null;
          activity_title?: string | null;
          created_at?: string | null;
          id?: string;
          identity_statement?: string | null;
          lesson_title?: string | null;
          learn_text?: string | null;
          log_prompts?: Json | null;
          milestone_name?: string | null;
          program_phase?: string | null;
          title?: string;
          week_number?: number;
        };
        Relationships: [];
      };
      weekly_progress: {
        Row: {
          act_completed_at: string | null;
          act_complete: boolean | null;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          learn_completed_at: string | null;
          learn_complete: boolean | null;
          log_completed_at: string | null;
          log_complete: boolean | null;
          profile_id: string | null;
          started_at: string | null;
          submitted_at: string | null;
          updated_at: string;
          week_number: number | null;
        };
        Insert: {
          act_completed_at?: string | null;
          act_complete?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          learn_completed_at?: string | null;
          learn_complete?: boolean | null;
          log_completed_at?: string | null;
          log_complete?: boolean | null;
          profile_id?: string | null;
          started_at?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
          week_number?: number | null;
        };
        Update: {
          act_completed_at?: string | null;
          act_complete?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          learn_completed_at?: string | null;
          learn_complete?: boolean | null;
          log_completed_at?: string | null;
          log_complete?: boolean | null;
          profile_id?: string | null;
          started_at?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
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
          cover_image_url: string | null;
          created_at: string | null;
          feed_priority: number;
          featured_until: string | null;
          id: string;
          is_featured: boolean;
          is_public: boolean;
          moderation_status: 'approved' | 'needs_review' | 'hidden' | 'removed';
          post_type:
            | 'announcement'
            | 'weekly_prompt'
            | 'win'
            | 'chapter_event'
            | 'success_story'
            | 'member_highlight'
            | 'volunteer_opportunity'
            | 'challenge'
            | 'inspiration'
            | 'corporate_announcement'
            | 'chapter_spotlight'
            | 'promoted_activity'
            | 'curriculum_update'
            | 'featured_challenge'
            | 'weekly_reflection'
            | 'national_announcement'
            | null;
          published_at: string | null;
          status: 'draft' | 'published' | 'hidden' | 'archived';
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          author_id?: string | null;
          body?: string | null;
          chapter_id?: string | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          feed_priority?: number;
          featured_until?: string | null;
          id?: string;
          is_featured?: boolean;
          is_public?: boolean;
          moderation_status?: 'approved' | 'needs_review' | 'hidden' | 'removed';
          post_type?:
            | 'announcement'
            | 'weekly_prompt'
            | 'win'
            | 'chapter_event'
            | 'success_story'
            | 'member_highlight'
            | 'volunteer_opportunity'
            | 'challenge'
            | 'inspiration'
            | 'corporate_announcement'
            | 'chapter_spotlight'
            | 'promoted_activity'
            | 'curriculum_update'
            | 'featured_challenge'
            | 'weekly_reflection'
            | 'national_announcement'
            | null;
          published_at?: string | null;
          status?: 'draft' | 'published' | 'hidden' | 'archived';
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string | null;
          body?: string | null;
          chapter_id?: string | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          feed_priority?: number;
          featured_until?: string | null;
          id?: string;
          is_featured?: boolean;
          is_public?: boolean;
          moderation_status?: 'approved' | 'needs_review' | 'hidden' | 'removed';
          post_type?:
            | 'announcement'
            | 'weekly_prompt'
            | 'win'
            | 'chapter_event'
            | 'success_story'
            | 'member_highlight'
            | 'volunteer_opportunity'
            | 'challenge'
            | 'inspiration'
            | 'corporate_announcement'
            | 'chapter_spotlight'
            | 'promoted_activity'
            | 'curriculum_update'
            | 'featured_challenge'
            | 'weekly_reflection'
            | 'national_announcement'
            | null;
          published_at?: string | null;
          status?: 'draft' | 'published' | 'hidden' | 'archived';
          title?: string | null;
          updated_at?: string | null;
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
          reaction_type: 'respect' | 'like' | 'celebrate' | 'inspired' | 'accountable';
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          post_id: string;
          profile_id: string;
          reaction_type?: 'respect' | 'like' | 'celebrate' | 'inspired' | 'accountable';
        };
        Update: {
          created_at?: string | null;
          id?: string;
          post_id?: string;
          profile_id?: string;
          reaction_type?: 'respect' | 'like' | 'celebrate' | 'inspired' | 'accountable';
        };
        Relationships: [];
      };
      chapter_post_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string | null;
          id: string;
          moderation_status: 'approved' | 'needs_review' | 'hidden' | 'removed';
          parent_comment_id: string | null;
          post_id: string;
          updated_at: string | null;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string | null;
          id?: string;
          moderation_status?: 'approved' | 'needs_review' | 'hidden' | 'removed';
          parent_comment_id?: string | null;
          post_id: string;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string | null;
          id?: string;
          moderation_status?: 'approved' | 'needs_review' | 'hidden' | 'removed';
          parent_comment_id?: string | null;
          post_id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      chapter_chat_channels: {
        Row: {
          chapter_id: string;
          channel_type: 'general' | 'event' | 'announcements' | 'small_group';
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          event_id: string | null;
          id: string;
          name: string;
          status: 'active' | 'archived' | 'hidden';
          updated_at: string | null;
        };
        Insert: {
          chapter_id: string;
          channel_type?: 'general' | 'event' | 'announcements' | 'small_group';
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          event_id?: string | null;
          id?: string;
          name: string;
          status?: 'active' | 'archived' | 'hidden';
          updated_at?: string | null;
        };
        Update: {
          chapter_id?: string;
          channel_type?: 'general' | 'event' | 'announcements' | 'small_group';
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          event_id?: string | null;
          id?: string;
          name?: string;
          status?: 'active' | 'archived' | 'hidden';
          updated_at?: string | null;
        };
        Relationships: [];
      };
      chapter_chat_channel_members: {
        Row: {
          channel_id: string;
          id: string;
          joined_at: string | null;
          profile_id: string;
          role: 'member' | 'moderator';
        };
        Insert: {
          channel_id: string;
          id?: string;
          joined_at?: string | null;
          profile_id: string;
          role?: 'member' | 'moderator';
        };
        Update: {
          channel_id?: string;
          id?: string;
          joined_at?: string | null;
          profile_id?: string;
          role?: 'member' | 'moderator';
        };
        Relationships: [];
      };
      chapter_chat_messages: {
        Row: {
          attachment_mime_type: string | null;
          attachment_name: string | null;
          attachment_size: number | null;
          attachment_url: string | null;
          author_id: string | null;
          body: string | null;
          channel_id: string;
          chapter_id: string;
          created_at: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          location_label: string | null;
          location_latitude: number | null;
          location_longitude: number | null;
          message_type: 'text' | 'photo' | 'file' | 'location';
          moderation_status: 'visible' | 'reported' | 'hidden' | 'removed';
          updated_at: string | null;
        };
        Insert: {
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_url?: string | null;
          author_id?: string | null;
          body?: string | null;
          channel_id: string;
          chapter_id?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          location_label?: string | null;
          location_latitude?: number | null;
          location_longitude?: number | null;
          message_type?: 'text' | 'photo' | 'file' | 'location';
          moderation_status?: 'visible' | 'reported' | 'hidden' | 'removed';
          updated_at?: string | null;
        };
        Update: {
          attachment_mime_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_url?: string | null;
          author_id?: string | null;
          body?: string | null;
          channel_id?: string;
          chapter_id?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          location_label?: string | null;
          location_latitude?: number | null;
          location_longitude?: number | null;
          message_type?: 'text' | 'photo' | 'file' | 'location';
          moderation_status?: 'visible' | 'reported' | 'hidden' | 'removed';
          updated_at?: string | null;
        };
        Relationships: [];
      };
      chapter_chat_message_reports: {
        Row: {
          chapter_id: string;
          created_at: string | null;
          details: string | null;
          id: string;
          message_id: string;
          reason: 'harassment' | 'unsafe' | 'spam' | 'privacy' | 'other';
          reporter_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
        };
        Insert: {
          chapter_id: string;
          created_at?: string | null;
          details?: string | null;
          id?: string;
          message_id: string;
          reason: 'harassment' | 'unsafe' | 'spam' | 'privacy' | 'other';
          reporter_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: 'open' | 'reviewing' | 'resolved' | 'dismissed';
        };
        Update: {
          chapter_id?: string;
          created_at?: string | null;
          details?: string | null;
          id?: string;
          message_id?: string;
          reason?: 'harassment' | 'unsafe' | 'spam' | 'privacy' | 'other';
          reporter_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: 'open' | 'reviewing' | 'resolved' | 'dismissed';
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
      curriculum_reflection_questions: {
        Row: {
          created_at: string;
          id: string;
          lesson_id: string;
          prompt: string;
          question_order: number;
          updated_at: string;
          week_number: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lesson_id: string;
          prompt: string;
          question_order: number;
          updated_at?: string;
          week_number: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          lesson_id?: string;
          prompt?: string;
          question_order?: number;
          updated_at?: string;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'curriculum_reflection_questions_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_weeks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'curriculum_reflection_questions_week_number_fkey';
            columns: ['week_number'];
            isOneToOne: false;
            referencedRelation: 'curriculum_weeks';
            referencedColumns: ['week_number'];
          },
        ];
      };
      curriculum_reflections: {
        Row: {
          created_at: string;
          id: string;
          lesson_id: string;
          profile_id: string;
          question_id: string;
          reflection_text: string;
          submitted_at: string;
          updated_at: string;
          visibility: 'private' | 'mentor_shared' | 'chapter_shared';
        };
        Insert: {
          created_at?: string;
          id?: string;
          lesson_id: string;
          profile_id: string;
          question_id: string;
          reflection_text: string;
          submitted_at?: string;
          updated_at?: string;
          visibility?: 'private' | 'mentor_shared' | 'chapter_shared';
        };
        Update: {
          created_at?: string;
          id?: string;
          lesson_id?: string;
          profile_id?: string;
          question_id?: string;
          reflection_text?: string;
          submitted_at?: string;
          updated_at?: string;
          visibility?: 'private' | 'mentor_shared' | 'chapter_shared';
        };
        Relationships: [
          {
            foreignKeyName: 'curriculum_reflections_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_weeks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'curriculum_reflections_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'curriculum_reflections_question_lesson_fkey';
            columns: ['question_id', 'lesson_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_reflection_questions';
            referencedColumns: ['id', 'lesson_id'];
          },
        ];
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
      get_admin_profile_interest_stats: {
        Args: {
          limit_count?: number;
        };
        Returns: {
          id: string;
          label: string;
          selection_count: number;
        }[];
      };
      get_admin_profile_goal_stats: {
        Args: {
          limit_count?: number;
        };
        Returns: {
          id: string;
          label: string;
          selection_count: number;
        }[];
      };
      get_admin_profile_geographic_trends: {
        Args: {
          limit_count?: number;
        };
        Returns: {
          city: string;
          member_count: number;
          state: string;
          top_goal: string | null;
          top_interest: string | null;
        }[];
      };
      get_my_chapter_chat_channels: {
        Args: Record<PropertyKey, never>;
        Returns: {
          can_moderate: boolean;
          channel_type: 'general' | 'event' | 'announcements' | 'small_group';
          chapter_id: string;
          chapter_name: string;
          created_at: string | null;
          description: string | null;
          event_id: string | null;
          id: string;
          is_read_only: boolean;
          latest_message_at: string | null;
          name: string;
        }[];
      };
      get_chapter_chat_messages: {
        Args: {
          target_channel_id: string;
        };
        Returns: {
          attachment_mime_type: string | null;
          attachment_name: string | null;
          attachment_size: number | null;
          attachment_url: string | null;
          author_avatar_url: string | null;
          author_id: string | null;
          author_name: string | null;
          body: string | null;
          can_delete: boolean;
          channel_id: string;
          chapter_id: string;
          created_at: string | null;
          id: string;
          location_label: string | null;
          location_latitude: number | null;
          location_longitude: number | null;
          message_type: 'text' | 'photo' | 'file' | 'location';
          moderation_status: 'visible' | 'reported' | 'hidden' | 'removed';
        }[];
      };
      delete_chapter_chat_message: {
        Args: {
          target_message_id: string;
        };
        Returns: string;
      };
      report_chapter_chat_message: {
        Args: {
          target_message_id: string;
          report_reason: 'harassment' | 'unsafe' | 'spam' | 'privacy' | 'other';
          report_details?: string | null;
        };
        Returns: string;
      };
      get_chapter_chat_message_reports: {
        Args: Record<PropertyKey, never>;
        Returns: {
          attachment_name: string | null;
          author_id: string | null;
          author_name: string | null;
          channel_name: string;
          chapter_id: string;
          chapter_name: string;
          created_at: string | null;
          details: string | null;
          id: string;
          message_body: string | null;
          message_id: string;
          message_type: 'text' | 'photo' | 'file' | 'location';
          reason: 'harassment' | 'unsafe' | 'spam' | 'privacy' | 'other';
          reporter_id: string;
          reporter_name: string | null;
          reviewed_at: string | null;
          status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
        }[];
      };
      review_chapter_chat_message_report: {
        Args: {
          target_report_id: string;
          next_status: 'reviewing' | 'resolved' | 'dismissed';
        };
        Returns: string;
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
      get_community_feed_posts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          author_avatar_url: string | null;
          author_id: string | null;
          author_name: string | null;
          author_role: 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin' | 'corporate_bloke' | 'participant' | 'facilitator' | 'admin' | null;
          can_delete: boolean;
          comment_count: number;
          content: string | null;
          created_at: string | null;
          id: string;
          image_url: string | null;
          like_count: number;
        }[];
      };
      get_public_feed_posts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          author_id: string | null;
          author_avatar_url: string | null;
          author_name: string | null;
          author_role: 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin' | 'corporate_bloke' | 'participant' | 'facilitator' | 'admin' | null;
          chapter_id: string | null;
          chapter_name: string | null;
          cover_image_url: string | null;
          created_at: string | null;
          description: string | null;
          feed_priority: number;
          featured_until: string | null;
          id: string;
          is_corporate_bloke: boolean;
          is_featured: boolean;
          post_type: string | null;
          published_at: string | null;
          title: string | null;
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
      save_my_profile_structured_selections: {
        Args: {
          interest_ids: string[];
          goal_ids: string[];
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
