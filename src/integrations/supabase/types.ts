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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          ticket_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          ticket_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          ticket_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          sku: string
          warranty_months: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sku: string
          warranty_months?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sku?: string
          warranty_months?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repair_center_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          repair_center_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          repair_center_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          repair_center_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_center_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_center_products_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "repair_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_centers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          region: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          region: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          region?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_internal: boolean | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          by_user_id: string | null
          created_at: string
          id: string
          note: string | null
          ticket_id: string
          type: string
        }
        Insert: {
          by_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          ticket_id: string
          type: string
        }
        Update: {
          by_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          ticket_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_email: string
          customer_name: string
          decision_by_repair_center: string | null
          estimated_completion_date: string | null
          id: string
          issue: string
          owner_id: string
          photos: Json | null
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          product_id: string
          purchase_date: string | null
          repair_center_id: string | null
          repair_status: Database["public"]["Enums"]["repair_status"] | null
          return_reason: Database["public"]["Enums"]["return_reason"] | null
          serial_number: string
          sla_due_at: string | null
          sla_hours: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: number
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
          warranty_eligible: boolean
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          decision_by_repair_center?: string | null
          estimated_completion_date?: string | null
          id?: string
          issue: string
          owner_id: string
          photos?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          product_id: string
          purchase_date?: string | null
          repair_center_id?: string | null
          repair_status?: Database["public"]["Enums"]["repair_status"] | null
          return_reason?: Database["public"]["Enums"]["return_reason"] | null
          serial_number: string
          sla_due_at?: string | null
          sla_hours?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: number
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          warranty_eligible?: boolean
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          decision_by_repair_center?: string | null
          estimated_completion_date?: string | null
          id?: string
          issue?: string
          owner_id?: string
          photos?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          product_id?: string
          purchase_date?: string | null
          repair_center_id?: string | null
          repair_status?: Database["public"]["Enums"]["repair_status"] | null
          return_reason?: Database["public"]["Enums"]["return_reason"] | null
          serial_number?: string
          sla_due_at?: string | null
          sla_hours?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: number
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          warranty_eligible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_repair_center_id_fkey"
            columns: ["repair_center_id"]
            isOneToOne: false
            referencedRelation: "repair_centers"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      warranty_policies: {
        Row: {
          created_at: string
          description: string
          id: string
          months: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          months: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          months?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "CUSTOMER" | "STAFF" | "ADMIN" | "REPAIR_CENTER"
      repair_status: "IN_PROGRESS" | "BLOCKED" | "DONE"
      return_reason: "WITHIN_15_DAYS" | "AFTER_15_DAYS"
      ticket_priority: "LOW" | "NORMAL" | "URGENT"
      ticket_status:
        | "OPEN"
        | "UNDER_REVIEW"
        | "IN_REPAIR"
        | "AWAITING_CUSTOMER"
        | "RESOLVED"
        | "REJECTED"
        | "CANCELLED"
        | "RETURN_REQUESTED"
        | "RETURN_APPROVED"
        | "RETURN_COMPLETED"
        | "REPLACEMENT_APPROVED"
        | "REJECTED_OUT_OF_WARRANTY"
      ticket_type: "REPAIR" | "RETURN"
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
      app_role: ["CUSTOMER", "STAFF", "ADMIN", "REPAIR_CENTER"],
      repair_status: ["IN_PROGRESS", "BLOCKED", "DONE"],
      return_reason: ["WITHIN_15_DAYS", "AFTER_15_DAYS"],
      ticket_priority: ["LOW", "NORMAL", "URGENT"],
      ticket_status: [
        "OPEN",
        "UNDER_REVIEW",
        "IN_REPAIR",
        "AWAITING_CUSTOMER",
        "RESOLVED",
        "REJECTED",
        "CANCELLED",
        "RETURN_REQUESTED",
        "RETURN_APPROVED",
        "RETURN_COMPLETED",
        "REPLACEMENT_APPROVED",
        "REJECTED_OUT_OF_WARRANTY",
      ],
      ticket_type: ["REPAIR", "RETURN"],
    },
  },
} as const
