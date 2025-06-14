export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_reference: string
          check_in_date: string | null
          check_out_date: string | null
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          number_of_guests: number | null
          number_of_nights: number | null
          profit_margin: number | null
          selling_price: number
          service_id: string
          status: string | null
          supplier_cost: number
          updated_at: string
        }
        Insert: {
          booking_reference: string
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          number_of_guests?: number | null
          number_of_nights?: number | null
          profit_margin?: number | null
          selling_price: number
          service_id: string
          status?: string | null
          supplier_cost: number
          updated_at?: string
        }
        Update: {
          booking_reference?: string
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          number_of_guests?: number | null
          number_of_nights?: number | null
          profit_margin?: number | null
          selling_price?: number
          service_id?: string
          status?: string | null
          supplier_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          last_message_at: string | null
          phone_number: string
          platform: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          phone_number: string
          platform?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          phone_number?: string
          platform?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communications: {
        Row: {
          booking_id: string | null
          communication_type: string
          completed_at: string | null
          content: string | null
          created_at: string
          customer_id: string
          direction: string
          duration_minutes: number | null
          follow_up_id: string | null
          handled_by: string
          id: string
          scheduled_at: string | null
          status: string
        }
        Insert: {
          booking_id?: string | null
          communication_type: string
          completed_at?: string | null
          content?: string | null
          created_at?: string
          customer_id: string
          direction: string
          duration_minutes?: number | null
          follow_up_id?: string | null
          handled_by: string
          id?: string
          scheduled_at?: string | null
          status: string
        }
        Update: {
          booking_id?: string | null
          communication_type?: string
          completed_at?: string | null
          content?: string | null
          created_at?: string
          customer_id?: string
          direction?: string
          duration_minutes?: number | null
          follow_up_id?: string | null
          handled_by?: string
          id?: string
          scheduled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_follow_up_id_fkey"
            columns: ["follow_up_id"]
            isOneToOne: false
            referencedRelation: "customer_follow_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_follow_ups: {
        Row: {
          assigned_to: string | null
          booking_id: string
          completed_at: string | null
          created_at: string
          customer_id: string
          follow_up_type: string
          id: string
          notes: string | null
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          booking_id: string
          completed_at?: string | null
          created_at?: string
          customer_id: string
          follow_up_type: string
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          follow_up_type?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_follow_ups_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string
          created_by: string
          customer_id: string
          id: string
          is_private: boolean
          note_type: string
          priority: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          is_private?: boolean
          note_type: string
          priority?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          is_private?: boolean
          note_type?: string
          priority?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_pricing: {
        Row: {
          created_at: string
          custom_price: number
          customer_id: string
          id: string
          is_active: boolean | null
          profit_margin: number | null
          service_id: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          custom_price: number
          customer_id: string
          id?: string
          is_active?: boolean | null
          profit_margin?: number | null
          service_id: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          custom_price?: number
          customer_id?: string
          id?: string
          is_active?: boolean | null
          profit_margin?: number | null
          service_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_pricing_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_satisfaction: {
        Row: {
          booking_id: string
          communication_rating: number | null
          completed_at: string | null
          created_at: string
          customer_id: string
          feedback: string | null
          id: string
          overall_rating: number | null
          service_rating: number | null
          survey_sent_at: string | null
        }
        Insert: {
          booking_id: string
          communication_rating?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          feedback?: string | null
          id?: string
          overall_rating?: number | null
          service_rating?: number | null
          survey_sent_at?: string | null
        }
        Update: {
          booking_id?: string
          communication_rating?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          feedback?: string | null
          id?: string
          overall_rating?: number | null
          service_rating?: number | null
          survey_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_satisfaction_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_satisfaction_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          nationality: string | null
          passport_number: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          nationality?: string | null
          passport_number?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          nationality?: string | null
          passport_number?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number | null
          service_id: string | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number | null
          service_id?: string | null
          total_price?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number | null
          service_id?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          id: string
          last_number: number | null
          prefix: string | null
          year: number
        }
        Insert: {
          id?: string
          last_number?: number | null
          prefix?: string | null
          year: number
        }
        Update: {
          id?: string
          last_number?: number | null
          prefix?: string | null
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          booking_id: string
          created_at: string
          currency: string | null
          customer_id: string
          discount_amount: number | null
          due_date: string | null
          final_amount: number
          id: string
          invoice_number: string
          issued_date: string | null
          notes: string | null
          paid_date: string | null
          payment_terms: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          updated_at: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          currency?: string | null
          customer_id: string
          discount_amount?: number | null
          due_date?: string | null
          final_amount: number
          id?: string
          invoice_number: string
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_terms?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          currency?: string | null
          customer_id?: string
          discount_amount?: number | null
          due_date?: string | null
          final_amount?: number
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_terms?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          id: string
          message_content: string
          message_type: string | null
          read_at: string | null
          sender_type: string
          sent_at: string
        }
        Insert: {
          conversation_id: string
          id?: string
          message_content: string
          message_type?: string | null
          read_at?: string | null
          sender_type: string
          sent_at?: string
        }
        Update: {
          conversation_id?: string
          id?: string
          message_content?: string
          message_type?: string | null
          read_at?: string | null
          sender_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount: number
          bank_reference: string | null
          created_at: string
          due_date: string
          id: string
          invoice_id: string
          notes: string | null
          order_number: string
          payment_date: string | null
          payment_method: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          created_at?: string
          due_date: string
          id?: string
          invoice_id: string
          notes?: string | null
          order_number?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          created_at?: string
          due_date?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          order_number?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          service_category: string | null
          supplier_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          service_category?: string | null
          supplier_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          service_category?: string | null
          supplier_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string | null
          due_date: string | null
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string
          status: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference: string
          status?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string
          status?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          tax_number: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          tax_number?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          tax_number?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_creation_requests: {
        Row: {
          created_at: string
          created_by: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          processed_at: string | null
          processed_by: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          user_id: string
          required_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      has_role_or_higher: {
        Args: {
          user_id: string
          required_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role:
        | "admin"
        | "manager"
        | "sales_agent"
        | "accountant"
        | "viewer"
        | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: [
        "admin",
        "manager",
        "sales_agent",
        "accountant",
        "viewer",
        "super_admin",
      ],
    },
  },
} as const
