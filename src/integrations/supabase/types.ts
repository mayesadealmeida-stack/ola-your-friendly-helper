export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      compliance_audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          new_level: Database["public"]["Enums"]["compliance_level"] | null
          new_rate: number | null
          previous_level: Database["public"]["Enums"]["compliance_level"] | null
          previous_rate: number | null
          reason: string
          source: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_level?: Database["public"]["Enums"]["compliance_level"] | null
          new_rate?: number | null
          previous_level?:
            | Database["public"]["Enums"]["compliance_level"]
            | null
          previous_rate?: number | null
          reason?: string
          source?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_level?: Database["public"]["Enums"]["compliance_level"] | null
          new_rate?: number | null
          previous_level?:
            | Database["public"]["Enums"]["compliance_level"]
            | null
          previous_rate?: number | null
          reason?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      compliance_events: {
        Row: {
          created_at: string
          days_late: number
          description: string
          event_type: Database["public"]["Enums"]["compliance_event_type"]
          group_ref: string
          id: string
          occurred_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_late?: number
          description?: string
          event_type: Database["public"]["Enums"]["compliance_event_type"]
          group_ref?: string
          id?: string
          occurred_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_late?: number
          description?: string
          event_type?: Database["public"]["Enums"]["compliance_event_type"]
          group_ref?: string
          id?: string
          occurred_at?: string
          user_id?: string
        }
        Relationships: []
      }
      compliance_stats: {
        Row: {
          compliance_rate: number
          created_at: string
          cycles_completed: number
          history_days: number
          history_started_at: string
          last_rate_change: number
          late_count: number
          level: Database["public"]["Enums"]["compliance_level"]
          level_changed_at: string | null
          missed_count: number
          on_time_count: number
          pending_obligations: number
          recent_late_count: number
          updated_at: string
          user_id: string
          violation_count: number
        }
        Insert: {
          compliance_rate?: number
          created_at?: string
          cycles_completed?: number
          history_days?: number
          history_started_at?: string
          last_rate_change?: number
          late_count?: number
          level?: Database["public"]["Enums"]["compliance_level"]
          level_changed_at?: string | null
          missed_count?: number
          on_time_count?: number
          pending_obligations?: number
          recent_late_count?: number
          updated_at?: string
          user_id: string
          violation_count?: number
        }
        Update: {
          compliance_rate?: number
          created_at?: string
          cycles_completed?: number
          history_days?: number
          history_started_at?: string
          last_rate_change?: number
          late_count?: number
          level?: Database["public"]["Enums"]["compliance_level"]
          level_changed_at?: string | null
          missed_count?: number
          on_time_count?: number
          pending_obligations?: number
          recent_late_count?: number
          updated_at?: string
          user_id?: string
          violation_count?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string
          updated_at?: string
          username?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_override_compliance: {
        Args: {
          _new_level: Database["public"]["Enums"]["compliance_level"]
          _new_rate: number
          _reason: string
          _user_id: string
        }
        Returns: {
          compliance_rate: number
          created_at: string
          cycles_completed: number
          history_days: number
          history_started_at: string
          last_rate_change: number
          late_count: number
          level: Database["public"]["Enums"]["compliance_level"]
          level_changed_at: string | null
          missed_count: number
          on_time_count: number
          pending_obligations: number
          recent_late_count: number
          updated_at: string
          user_id: string
          violation_count: number
        }
        SetofOptions: {
          from: "*"
          to: "compliance_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compliance_eligible_level: {
        Args: {
          _cycles: number
          _history_days: number
          _pending: number
          _rate: number
          _violations: number
        }
        Returns: Database["public"]["Enums"]["compliance_level"]
      }
      compliance_level_rank: {
        Args: { _level: Database["public"]["Enums"]["compliance_level"] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_compliance: {
        Args: { _user_id: string }
        Returns: {
          compliance_rate: number
          created_at: string
          cycles_completed: number
          history_days: number
          history_started_at: string
          last_rate_change: number
          late_count: number
          level: Database["public"]["Enums"]["compliance_level"]
          level_changed_at: string | null
          missed_count: number
          on_time_count: number
          pending_obligations: number
          recent_late_count: number
          updated_at: string
          user_id: string
          violation_count: number
        }
        SetofOptions: {
          from: "*"
          to: "compliance_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      compliance_event_type:
        | "payment_on_time"
        | "payment_late"
        | "payment_missed"
        | "cycle_completed"
        | "obligation_created"
        | "obligation_resolved"
        | "rule_violation"
      compliance_level:
        | "iniciante"
        | "regular"
        | "confiavel"
        | "avancado"
        | "excelente"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      compliance_event_type: [
        "payment_on_time",
        "payment_late",
        "payment_missed",
        "cycle_completed",
        "obligation_created",
        "obligation_resolved",
        "rule_violation",
      ],
      compliance_level: [
        "iniciante",
        "regular",
        "confiavel",
        "avancado",
        "excelente",
      ],
    },
  },
} as const
