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
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          changes: Json
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          institution_id: string | null
          ip_address: unknown
          risk_level: Database["public"]["Enums"]["audit_risk_level"]
          summary: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          institution_id?: string | null
          ip_address?: unknown
          risk_level?: Database["public"]["Enums"]["audit_risk_level"]
          summary?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          institution_id?: string | null
          ip_address?: unknown
          risk_level?: Database["public"]["Enums"]["audit_risk_level"]
          summary?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_uploads: {
        Row: {
          completed_at: string | null
          created_at: string
          error_report: Json
          failed_rows: number
          id: string
          institution_id: string
          processed_rows: number
          source_filename: string
          status: string
          total_rows: number
          upload_type: string
          uploaded_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_report?: Json
          failed_rows?: number
          id?: string
          institution_id: string
          processed_rows?: number
          source_filename: string
          status?: string
          total_rows?: number
          upload_type?: string
          uploaded_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_report?: Json
          failed_rows?: number
          id?: string
          institution_id?: string
          processed_rows?: number
          source_filename?: string
          status?: string
          total_rows?: number
          upload_type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_uploads_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          city: string | null
          code: string
          country: string | null
          created_at: string
          id: string
          institution_id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          campus_id: string | null
          certificate_id: string
          certificate_pdf_url: string | null
          created_at: string
          department_id: string | null
          department_name: string
          full_name: string
          graduation_year: number
          hash_signature: string
          id: string
          institution_id: string
          issue_date: string
          issued_by: string | null
          matric_number: string
          metadata: Json
          qr_payload: string
          qualification: string
          revoked_reason: string | null
          seal_area: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          status_changed_at: string | null
          status_changed_by: string | null
          student_id: string | null
          suspended_reason: string | null
          updated_at: string
          verification_url: string | null
        }
        Insert: {
          campus_id?: string | null
          certificate_id: string
          certificate_pdf_url?: string | null
          created_at?: string
          department_id?: string | null
          department_name: string
          full_name: string
          graduation_year: number
          hash_signature: string
          id?: string
          institution_id: string
          issue_date?: string
          issued_by?: string | null
          matric_number: string
          metadata?: Json
          qr_payload: string
          qualification: string
          revoked_reason?: string | null
          seal_area?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          student_id?: string | null
          suspended_reason?: string | null
          updated_at?: string
          verification_url?: string | null
        }
        Update: {
          campus_id?: string | null
          certificate_id?: string
          certificate_pdf_url?: string | null
          created_at?: string
          department_id?: string | null
          department_name?: string
          full_name?: string
          graduation_year?: number
          hash_signature?: string
          id?: string
          institution_id?: string
          issue_date?: string
          issued_by?: string | null
          matric_number?: string
          metadata?: Json
          qr_payload?: string
          qualification?: string
          revoked_reason?: string | null
          seal_area?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          status_changed_at?: string | null
          status_changed_by?: string | null
          student_id?: string | null
          suspended_reason?: string | null
          updated_at?: string
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          campus_id: string | null
          code: string
          created_at: string
          faculty: string | null
          id: string
          institution_id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          campus_id?: string | null
          code: string
          created_at?: string
          faculty?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          campus_id?: string | null
          code?: string
          created_at?: string
          faculty?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          address: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string
          domain: string | null
          email: string | null
          id: string
          institution_type: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          seal_url: string | null
          state_province: string | null
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
          verification_enabled: boolean
          website_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          country?: string | null
          institution_type?: string | null
          state_province?: string | null
          created_at?: string
          domain?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          seal_url?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          verification_enabled?: boolean
          website_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          domain?: string | null
          email?: string | null
          id?: string
          institution_type?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          seal_url?: string | null
          state_province?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          verification_enabled?: boolean
          website_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          id: string
          institution_id: string | null
          message: string
          priority: Database["public"]["Enums"]["audit_risk_level"]
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          message: string
          priority?: Database["public"]["Enums"]["audit_risk_level"]
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          message?: string
          priority?: Database["public"]["Enums"]["audit_risk_level"]
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          contact_person_name: string | null
          contact_person_role: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          notification_email: string | null
          org_type: string
          phone: string | null
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_person_name?: string | null
          contact_person_role?: string | null
          country?: string | null
          industry?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          notification_email?: string | null
          org_type?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_person_name?: string | null
          contact_person_role?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          notification_email?: string | null
          org_type?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          avatar_url: string | null
          campus_id: string | null
          created_at: string
          department_id: string | null
          display_name: string | null
          email: string | null
          id: string
          institution_id: string | null
          is_active: boolean
          job_title: string | null
          last_seen_at: string | null
          organization_id: string | null
          organization_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          campus_id?: string | null
          created_at?: string
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean
          job_title?: string | null
          last_seen_at?: string | null
          organization_id?: string | null
          organization_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          campus_id?: string | null
          created_at?: string
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean
          job_title?: string | null
          last_seen_at?: string | null
          organization_id?: string | null
          organization_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          campus_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          email: string | null
          enrollment_year: number | null
          full_name: string
          graduation_year: number | null
          id: string
          institution_id: string
          matric_number: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          campus_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          email?: string | null
          enrollment_year?: number | null
          full_name: string
          graduation_year?: number | null
          id?: string
          institution_id: string
          matric_number: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          email?: string | null
          enrollment_year?: number | null
          full_name?: string
          graduation_year?: number | null
          id?: string
          institution_id?: string
          matric_number?: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          institution_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_events: {
        Row: {
          certificate_id: string | null
          certificate_identifier: string | null
          created_at: string
          id: string
          institution_id: string | null
          ip_address: unknown
          organization: string | null
          organization_id: string | null
          receipt_sent_at: string | null
          report_url: string | null
          result: Database["public"]["Enums"]["verification_result"]
          search_method: string
          user_agent: string | null
          verifier_email: string | null
          verifier_name: string | null
        }
        Insert: {
          certificate_id?: string | null
          certificate_identifier?: string | null
          created_at?: string
          id?: string
          institution_id?: string | null
          ip_address?: unknown
          organization?: string | null
          organization_id?: string | null
          receipt_sent_at?: string | null
          report_url?: string | null
          result: Database["public"]["Enums"]["verification_result"]
          search_method?: string
          user_agent?: string | null
          verifier_email?: string | null
          verifier_name?: string | null
        }
        Update: {
          certificate_id?: string | null
          certificate_identifier?: string | null
          created_at?: string
          id?: string
          institution_id?: string | null
          ip_address?: unknown
          organization?: string | null
          organization_id?: string | null
          receipt_sent_at?: string | null
          report_url?: string | null
          result?: Database["public"]["Enums"]["verification_result"]
          search_method?: string
          user_agent?: string | null
          verifier_email?: string | null
          verifier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_events_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_demo_org_access: {
        Args: { _org_name?: string }
        Returns: string
      }
      bootstrap_demo_staff_access: { Args: never; Returns: string }
      bootstrap_institution_access: {
        Args: { _institution_name?: string | null }
        Returns: string
      }
      register_institution_onboarding: {
        Args: { _payload: Json }
        Returns: string
      }
      register_organization_onboarding: {
        Args: { _payload: Json }
        Returns: string
      }
      grant_super_admin: { Args: { _email: string }; Returns: string }
      has_institution_role: {
        Args: {
          _institution_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_institution_id: { Args: { _user_id: string }; Returns: string }
      user_organization_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "super_admin" | "staff" | "verifier" | "organization"
      audit_risk_level: "low" | "medium" | "high" | "critical"
      certificate_status: "valid" | "revoked" | "suspended"
      org_status: "pending" | "active" | "suspended" | "rejected"
      student_status: "active" | "graduated" | "withdrawn" | "suspended"
      verification_result:
        | "authentic"
        | "invalid"
        | "revoked"
        | "suspended"
        | "tampered"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["super_admin", "staff", "verifier", "organization"],
      audit_risk_level: ["low", "medium", "high", "critical"],
      certificate_status: ["valid", "revoked", "suspended"],
      org_status: ["pending", "active", "suspended", "rejected"],
      student_status: ["active", "graduated", "withdrawn", "suspended"],
      verification_result: [
        "authentic",
        "invalid",
        "revoked",
        "suspended",
        "tampered",
      ],
    },
  },
} as const
