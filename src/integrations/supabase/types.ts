export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      argument_interactions: {
        Row: {
          argument_id: string
          created_at: string
          id: string
          mind_changed: boolean
          stars: number | null
          user_id: string
        }
        Insert: {
          argument_id: string
          created_at?: string
          id?: string
          mind_changed?: boolean
          stars?: number | null
          user_id: string
        }
        Update: {
          argument_id?: string
          created_at?: string
          id?: string
          mind_changed?: boolean
          stars?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "argument_interactions_argument_id_fkey"
            columns: ["argument_id"]
            isOneToOne: false
            referencedRelation: "arguments"
            referencedColumns: ["id"]
          },
        ]
      }
      arguments: {
        Row: {
          avg_stars: number
          changed_minds_count: number
          content: string
          created_at: string
          debates_used_in: number
          id: string
          pinned: boolean
          posted: boolean
          stance: string
          title: string
          topic_id: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          avg_stars?: number
          changed_minds_count?: number
          content: string
          created_at?: string
          debates_used_in?: number
          id?: string
          pinned?: boolean
          posted?: boolean
          stance: string
          title: string
          topic_id: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          avg_stars?: number
          changed_minds_count?: number
          content?: string
          created_at?: string
          debates_used_in?: number
          id?: string
          pinned?: boolean
          posted?: boolean
          stance?: string
          title?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "arguments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_replies: {
        Row: {
          argument_id: string
          avg_stars: number
          changed_minds_count: number
          content: string
          created_at: string
          id: string
          parent_id: string | null
          reply_type: string
          user_id: string
          username: string
        }
        Insert: {
          argument_id: string
          avg_stars?: number
          changed_minds_count?: number
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          reply_type: string
          user_id: string
          username: string
        }
        Update: {
          argument_id?: string
          avg_stars?: number
          changed_minds_count?: number
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          reply_type?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_replies_argument_id_fkey"
            columns: ["argument_id"]
            isOneToOne: false
            referencedRelation: "arguments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_replies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "debate_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      debates: {
        Row: {
          against_argument: string | null
          against_ready: boolean
          against_user_id: string | null
          against_vote: string | null
          created_at: string
          ended_at: string | null
          ended_reason: string | null
          for_argument: string | null
          for_ready: boolean
          for_user_id: string | null
          for_vote: string | null
          id: string
          status: string
          timer_end: string | null
          topic_id: string
          topic_title: string
        }
        Insert: {
          against_argument?: string | null
          against_ready?: boolean
          against_user_id?: string | null
          against_vote?: string | null
          created_at?: string
          ended_at?: string | null
          ended_reason?: string | null
          for_argument?: string | null
          for_ready?: boolean
          for_user_id?: string | null
          for_vote?: string | null
          id?: string
          status?: string
          timer_end?: string | null
          topic_id: string
          topic_title?: string
        }
        Update: {
          against_argument?: string | null
          against_ready?: boolean
          against_user_id?: string | null
          against_vote?: string | null
          created_at?: string
          ended_at?: string | null
          ended_reason?: string | null
          for_argument?: string | null
          for_ready?: boolean
          for_user_id?: string | null
          for_vote?: string | null
          id?: string
          status?: string
          timer_end?: string | null
          topic_id?: string
          topic_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "debates_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          debate_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          debate_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          debate_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          changed_minds_count: number
          created_at: string
          debates_count: number
          id: string
          reputation: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          changed_minds_count?: number
          created_at?: string
          debates_count?: number
          id?: string
          reputation?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          changed_minds_count?: number
          created_at?: string
          debates_count?: number
          id?: string
          reputation?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          debate_id: string
          engaged_argument: number
          id: string
          made_me_think: number
          mind_changed: string
          rated_id: string
          rater_id: string
          respectful: number
        }
        Insert: {
          created_at?: string
          debate_id: string
          engaged_argument?: number
          id?: string
          made_me_think?: number
          mind_changed?: string
          rated_id: string
          rater_id: string
          respectful?: number
        }
        Update: {
          created_at?: string
          debate_id?: string
          engaged_argument?: number
          id?: string
          made_me_think?: number
          mind_changed?: string
          rated_id?: string
          rater_id?: string
          respectful?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
        ]
      }
      reply_interactions: {
        Row: {
          created_at: string
          id: string
          mind_changed: boolean
          reply_id: string
          stars: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mind_changed?: boolean
          reply_id: string
          stars?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mind_changed?: boolean
          reply_id?: string
          stars?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_interactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "debate_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: { Enums: {} },
} as const
