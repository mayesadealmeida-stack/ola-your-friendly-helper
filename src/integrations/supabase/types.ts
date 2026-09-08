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
      contributions: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          group_id: string
          id: string
          paid_at: string | null
          participant_id: string
          payment_method:
            | Database["public"]["Enums"]["payment_method_key"]
            | null
          round_number: number
          status: Database["public"]["Enums"]["contribution_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          group_id: string
          id?: string
          paid_at?: string | null
          participant_id: string
          payment_method?:
            | Database["public"]["Enums"]["payment_method_key"]
            | null
          round_number: number
          status?: Database["public"]["Enums"]["contribution_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          group_id?: string
          id?: string
          paid_at?: string | null
          participant_id?: string
          payment_method?:
            | Database["public"]["Enums"]["payment_method_key"]
            | null
          round_number?: number
          status?: Database["public"]["Enums"]["contribution_status"]
        }
        Relationships: [
          {
            foreignKeyName: "contributions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "group_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      group_participants: {
        Row: {
          display_name: string
          group_id: string
          id: string
          joined_at: string
          position: number
          quotas: number
          user_id: string
        }
        Insert: {
          display_name?: string
          group_id: string
          id?: string
          joined_at?: string
          position: number
          quotas?: number
          user_id: string
        }
        Update: {
          display_name?: string
          group_id?: string
          id?: string
          joined_at?: string
          position?: number
          quotas?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_rounds: {
        Row: {
          confirmed_amount: number
          expected_amount: number
          group_id: string
          id: string
          round_number: number
          scheduled_date: string
          status: Database["public"]["Enums"]["round_status"]
        }
        Insert: {
          confirmed_amount?: number
          expected_amount: number
          group_id: string
          id?: string
          round_number: number
          scheduled_date: string
          status?: Database["public"]["Enums"]["round_status"]
        }
        Update: {
          confirmed_amount?: number
          expected_amount?: number
          group_id?: string
          id?: string
          round_number?: number
          scheduled_date?: string
          status?: Database["public"]["Enums"]["round_status"]
        }
        Relationships: [
          {
            foreignKeyName: "group_rounds_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          beneficiaries_per_round: number
          code: string
          contribution: number
          created_at: string
          entry_fee: number
          fee_percent: number
          frequency: Database["public"]["Enums"]["group_frequency"]
          id: string
          min_level: Database["public"]["Enums"]["compliance_level"]
          name: string
          participants_current: number
          participants_max: number
          round_amount: number
          start_date: string
          status: Database["public"]["Enums"]["group_status"]
        }
        Insert: {
          beneficiaries_per_round?: number
          code: string
          contribution: number
          created_at?: string
          entry_fee?: number
          fee_percent?: number
          frequency: Database["public"]["Enums"]["group_frequency"]
          id?: string
          min_level?: Database["public"]["Enums"]["compliance_level"]
          name: string
          participants_current?: number
          participants_max: number
          round_amount: number
          start_date: string
          status?: Database["public"]["Enums"]["group_status"]
        }
        Update: {
          beneficiaries_per_round?: number
          code?: string
          contribution?: number
          created_at?: string
          entry_fee?: number
          fee_percent?: number
          frequency?: Database["public"]["Enums"]["group_frequency"]
          id?: string
          min_level?: Database["public"]["Enums"]["compliance_level"]
          name?: string
          participants_current?: number
          participants_max?: number
          round_amount?: number
          start_date?: string
          status?: Database["public"]["Enums"]["group_status"]
        }
        Relationships: []
      }
      investment_plans: {
        Row: {
          created_at: string
          created_by: string
          description: string
          entry_price: number
          estimated_return: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          entry_price: number
          estimated_return: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          entry_price?: number
          estimated_return?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      kyc_basic: {
        Row: {
          address: string
          address_reference: string
          birth_date: string
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
        }
        Insert: {
          address: string
          address_reference?: string
          birth_date: string
          city: string
          country: string
          created_at?: string
          full_name: string
          id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
        }
        Update: {
          address?: string
          address_reference?: string
          birth_date?: string
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
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
      payment_methods: {
        Row: {
          account_holder: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          method: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          method: string
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          method?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          body: string | null
          category: string
          comments_count: number
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          shares_count: number
          title: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string
          body?: string | null
          category?: string
          comments_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          shares_count?: number
          title: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          body?: string | null
          category?: string
          comments_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          shares_count?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string
          updated_at?: string
          username?: string
        }
        Update: {
          avatar_url?: string | null
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
      wallet_transactions: {
        Row: {
          amount: number
          confirmed_at: string | null
          contribution_id: string | null
          created_at: string
          group_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method_key"] | null
          note: string | null
          proof_url: string | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          contribution_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method_key"] | null
          note?: string | null
          proof_url?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          contribution_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method_key"] | null
          note?: string | null
          proof_url?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_finance_summary: {
        Args: never
        Returns: {
          depositos_pendentes: number
          n_contribuicoes_pendentes: number
          n_depositos_pendentes: number
          n_saques_pendentes: number
          n_utilizadores: number
          saldo_plataforma: number
          saques_pendentes: number
          total_contribuicoes_pagas: number
          total_entradas: number
          total_saidas: number
        }[]
      }
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
      admin_review_transaction: {
        Args: {
          p_approve: boolean
          p_reason?: string
          p_transaction_id: string
        }
        Returns: {
          amount: number
          confirmed_at: string | null
          contribution_id: string | null
          created_at: string
          group_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method_key"] | null
          note: string | null
          proof_url: string | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
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
      contribute_from_wallet: {
        Args: { p_contribution_id: string }
        Returns: {
          amount: number
          created_at: string
          due_date: string
          group_id: string
          id: string
          paid_at: string | null
          participant_id: string
          payment_method:
            | Database["public"]["Enums"]["payment_method_key"]
            | null
          round_number: number
          status: Database["public"]["Enums"]["contribution_status"]
        }
        SetofOptions: {
          from: "*"
          to: "contributions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_group_rounds: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      get_wallet_balance: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_group: {
        Args: { p_group_id: string }
        Returns: {
          display_name: string
          group_id: string
          id: string
          joined_at: string
          position: number
          quotas: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "group_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_contribution_paid: {
        Args: {
          p_contribution_id: string
          p_payment_method: Database["public"]["Enums"]["payment_method_key"]
        }
        Returns: {
          amount: number
          created_at: string
          due_date: string
          group_id: string
          id: string
          paid_at: string | null
          participant_id: string
          payment_method:
            | Database["public"]["Enums"]["payment_method_key"]
            | null
          round_number: number
          status: Database["public"]["Enums"]["contribution_status"]
        }
        SetofOptions: {
          from: "*"
          to: "contributions"
          isOneToOne: true
          isSetofReturn: false
        }
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
      request_deposit: {
        Args: {
          p_amount: number
          p_method: Database["public"]["Enums"]["payment_method_key"]
          p_proof_url: string
        }
        Returns: {
          amount: number
          confirmed_at: string | null
          contribution_id: string | null
          created_at: string
          group_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method_key"] | null
          note: string | null
          proof_url: string | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_method: Database["public"]["Enums"]["payment_method_key"]
          p_note?: string
        }
        Returns: {
          amount: number
          confirmed_at: string | null
          contribution_id: string | null
          created_at: string
          group_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method_key"] | null
          note: string | null
          proof_url: string | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
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
      contribution_status: "pendente" | "confirmada" | "atrasada"
      group_frequency: "semanal" | "mensal"
      group_status: "aberto" | "completo" | "andamento" | "encerrado"
      kyc_status: "pending" | "verified" | "rejected"
      payment_method_key: "unitel_money" | "paypay_africa" | "bank_transfer"
      round_status: "agendada" | "concluida"
      wallet_transaction_status: "pendente" | "confirmado" | "rejeitado"
      wallet_transaction_type:
        | "deposito"
        | "levantamento"
        | "contribuicao_grupo"
        | "recebimento_grupo"
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
      contribution_status: ["pendente", "confirmada", "atrasada"],
      group_frequency: ["semanal", "mensal"],
      group_status: ["aberto", "completo", "andamento", "encerrado"],
      kyc_status: ["pending", "verified", "rejected"],
      payment_method_key: ["unitel_money", "paypay_africa", "bank_transfer"],
      round_status: ["agendada", "concluida"],
      wallet_transaction_status: ["pendente", "confirmado", "rejeitado"],
      wallet_transaction_type: [
        "deposito",
        "levantamento",
        "contribuicao_grupo",
        "recebimento_grupo",
      ],
    },
  },
} as const
