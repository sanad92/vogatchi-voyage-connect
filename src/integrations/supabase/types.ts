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
      admin_audit_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          description: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      airlines: {
        Row: {
          country: string | null
          created_at: string
          iata_code: string | null
          icao_code: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          iata_code?: string | null
          icao_code?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
        }
        Update: {
          country?: string | null
          created_at?: string
          iata_code?: string | null
          icao_code?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      airports: {
        Row: {
          city: string
          country: string
          created_at: string
          iata_code: string
          icao_code: string | null
          id: string
          is_active: boolean | null
          name: string
          timezone: string | null
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          iata_code: string
          icao_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          timezone?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          iata_code?: string
          icao_code?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          timezone?: string | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_by: string | null
          error_message: string | null
          file_path: string | null
          file_size: number | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          started_at?: string
          status: string
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      bank_account_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference_number: string | null
          related_invoice_id: string | null
          related_payment_order_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_number?: string | null
          related_invoice_id?: string | null
          related_payment_order_id?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_number?: string | null
          related_invoice_id?: string | null
          related_payment_order_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_account_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_account_transactions_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_account_transactions_related_payment_order_id_fkey"
            columns: ["related_payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string | null
          bank_name: string
          created_at: string
          currency: string
          current_balance: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type?: string | null
          bank_name: string
          created_at?: string
          currency: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string
          created_at?: string
          currency?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      booking_special_requests: {
        Row: {
          booking_id: string
          created_at: string
          custom_request_text: string | null
          id: string
          notes: string | null
          special_request_type_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          custom_request_text?: string | null
          id?: string
          notes?: string | null
          special_request_type_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          custom_request_text?: string | null
          id?: string
          notes?: string | null
          special_request_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_special_requests_special_request_type_id_fkey"
            columns: ["special_request_type_id"]
            isOneToOne: false
            referencedRelation: "special_request_types"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          status_id: string
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status_id: string
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_statuses: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          sort_order?: number | null
        }
        Relationships: []
      }
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
      budget_allocations: {
        Row: {
          allocated_amount: number
          budget_month: number | null
          budget_year: number
          category_id: string
          created_at: string
          created_by: string
          currency: string | null
          id: string
          notes: string | null
          remaining_amount: number | null
          spent_amount: number | null
          updated_at: string
        }
        Insert: {
          allocated_amount: number
          budget_month?: number | null
          budget_year: number
          category_id: string
          created_at?: string
          created_by: string
          currency?: string | null
          id?: string
          notes?: string | null
          remaining_amount?: number | null
          spent_amount?: number | null
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          budget_month?: number | null
          budget_year?: number
          category_id?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          id?: string
          notes?: string | null
          remaining_amount?: number | null
          spent_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_allocations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          campaign_id: string
          created_at: string
          customer_id: string
          id: string
          response: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          customer_id: string
          id?: string
          response?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          response?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      custom_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          permission_value: boolean
          role_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          permission_value?: boolean
          role_name: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          permission_value?: boolean
          role_name?: string
        }
        Relationships: []
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
          customer_value: string | null
          follow_up_type: string
          id: string
          last_contact_date: string | null
          notes: string | null
          priority: string | null
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
          customer_value?: string | null
          follow_up_type: string
          id?: string
          last_contact_date?: string | null
          notes?: string | null
          priority?: string | null
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
          customer_value?: string | null
          follow_up_type?: string
          id?: string
          last_contact_date?: string | null
          notes?: string | null
          priority?: string | null
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
      customer_loyalty_points: {
        Row: {
          booking_id: string | null
          created_at: string
          current_balance: number
          customer_id: string
          description: string | null
          id: string
          points_earned: number
          points_used: number
          transaction_type: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          current_balance?: number
          customer_id: string
          description?: string | null
          id?: string
          points_earned?: number
          points_used?: number
          transaction_type: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          current_balance?: number
          customer_id?: string
          description?: string | null
          id?: string
          points_earned?: number
          points_used?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_points_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_points_customer_id_fkey"
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
      customer_segments: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          minimum_bookings: number | null
          minimum_total_spent: number | null
          name: string
          name_ar: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_bookings?: number | null
          minimum_total_spent?: number | null
          name: string
          name_ar: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_bookings?: number | null
          minimum_total_spent?: number | null
          name?: string
          name_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          communication_preferences: Json | null
          created_at: string
          email: string | null
          id: string
          last_booking_date: string | null
          loyalty_points: number | null
          name: string
          nationality: string | null
          passport_number: string | null
          phone: string
          preferences: Json | null
          segment_id: string | null
          total_bookings: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          communication_preferences?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          last_booking_date?: string | null
          loyalty_points?: number | null
          name: string
          nationality?: string | null
          passport_number?: string | null
          phone: string
          preferences?: Json | null
          segment_id?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          communication_preferences?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          last_booking_date?: string | null
          loyalty_points?: number | null
          name?: string
          nationality?: string | null
          passport_number?: string | null
          phone?: string
          preferences?: Json | null
          segment_id?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          allowances: number | null
          bank_account_number: string | null
          bank_name: string | null
          base_salary: number
          created_at: string
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_code: string
          full_name: string
          hire_date: string
          id: string
          is_active: boolean | null
          national_id: string | null
          phone: string | null
          position: string
          salary_scale_level: number | null
          updated_at: string
        }
        Insert: {
          allowances?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary?: number
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code: string
          full_name: string
          hire_date?: string
          id?: string
          is_active?: boolean | null
          national_id?: string | null
          phone?: string | null
          position: string
          salary_scale_level?: number | null
          updated_at?: string
        }
        Update: {
          allowances?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary?: number
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string
          full_name?: string
          hire_date?: string
          id?: string
          is_active?: boolean | null
          national_id?: string | null
          phone?: string | null
          position?: string
          salary_scale_level?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          from_currency: string
          id: string
          is_active: boolean | null
          rate: number
          to_currency: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          from_currency: string
          id?: string
          is_active?: boolean | null
          rate: number
          to_currency: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          from_currency?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          to_currency?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          budget_limit: number | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          updated_at: string
        }
        Insert: {
          budget_limit?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          updated_at?: string
        }
        Update: {
          budget_limit?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string | null
          category_id: string
          created_at: string
          created_by: string
          currency: string | null
          description: string
          id: string
          invoice_number: string | null
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string | null
          transaction_date: string
          transaction_number: string
          updated_at: string
          vendor_name: string | null
          vendor_phone: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          category_id: string
          created_at?: string
          created_by: string
          currency?: string | null
          description: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          transaction_date?: string
          transaction_number?: string
          updated_at?: string
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          category_id?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          transaction_date?: string
          transaction_number?: string
          updated_at?: string
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_bookings: {
        Row: {
          airline_id: string
          arrival_airport_id: string
          arrival_date: string
          arrival_time: string | null
          baggage_info: Json | null
          booking_agent_name: string
          booking_date: string
          booking_reference: string
          confirmation_number: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
          customer_name: string
          departure_airport_id: string
          departure_date: string
          departure_time: string | null
          flight_class_id: string
          flight_number: string | null
          id: string
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          is_round_trip: boolean | null
          meal_preferences: string | null
          number_of_passengers: number
          paid_amount: number | null
          passenger_details: Json | null
          payment_due_date: string | null
          payment_method: string | null
          remaining_amount: number | null
          return_flight_id: string | null
          seat_preferences: string | null
          special_requests: string | null
          status_id: string | null
          supplier_cost: number
          supplier_name: string
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          supplier_reference: string | null
          taxes_and_fees: number | null
          ticket_numbers: string[] | null
          ticket_price_per_person: number
          total_cost: number
          total_profit: number | null
          updated_at: string
          voucher_sent: boolean | null
          voucher_sent_date: string | null
        }
        Insert: {
          airline_id: string
          arrival_airport_id: string
          arrival_date: string
          arrival_time?: string | null
          baggage_info?: Json | null
          booking_agent_name: string
          booking_date?: string
          booking_reference?: string
          confirmation_number?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          departure_airport_id: string
          departure_date: string
          departure_time?: string | null
          flight_class_id: string
          flight_number?: string | null
          id?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          is_round_trip?: boolean | null
          meal_preferences?: string | null
          number_of_passengers?: number
          paid_amount?: number | null
          passenger_details?: Json | null
          payment_due_date?: string | null
          payment_method?: string | null
          remaining_amount?: number | null
          return_flight_id?: string | null
          seat_preferences?: string | null
          special_requests?: string | null
          status_id?: string | null
          supplier_cost: number
          supplier_name: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_reference?: string | null
          taxes_and_fees?: number | null
          ticket_numbers?: string[] | null
          ticket_price_per_person: number
          total_cost: number
          total_profit?: number | null
          updated_at?: string
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Update: {
          airline_id?: string
          arrival_airport_id?: string
          arrival_date?: string
          arrival_time?: string | null
          baggage_info?: Json | null
          booking_agent_name?: string
          booking_date?: string
          booking_reference?: string
          confirmation_number?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          departure_airport_id?: string
          departure_date?: string
          departure_time?: string | null
          flight_class_id?: string
          flight_number?: string | null
          id?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          is_round_trip?: boolean | null
          meal_preferences?: string | null
          number_of_passengers?: number
          paid_amount?: number | null
          passenger_details?: Json | null
          payment_due_date?: string | null
          payment_method?: string | null
          remaining_amount?: number | null
          return_flight_id?: string | null
          seat_preferences?: string | null
          special_requests?: string | null
          status_id?: string | null
          supplier_cost?: number
          supplier_name?: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_reference?: string | null
          taxes_and_fees?: number | null
          ticket_numbers?: string[] | null
          ticket_price_per_person?: number
          total_cost?: number
          total_profit?: number | null
          updated_at?: string
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_bookings_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_bookings_arrival_airport_id_fkey"
            columns: ["arrival_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_bookings_departure_airport_id_fkey"
            columns: ["departure_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_bookings_flight_class_id_fkey"
            columns: ["flight_class_id"]
            isOneToOne: false
            referencedRelation: "flight_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_bookings_return_flight_id_fkey"
            columns: ["return_flight_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_bookings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_classes: {
        Row: {
          baggage_allowance: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          name_ar: string
        }
        Insert: {
          baggage_allowance?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name_ar: string
        }
        Update: {
          baggage_allowance?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name_ar?: string
        }
        Relationships: []
      }
      hotel_bookings: {
        Row: {
          booking_agent_name: string
          booking_date: string
          booking_reference_supplier: string | null
          cancellation_policy: string | null
          check_in_date: string
          check_out_date: string
          children_ages: string | null
          cost_per_night: number
          created_at: string
          currency: string | null
          customer_id: string | null
          customer_name: string
          destination_city: string
          hotel_name: string
          hotel_star_rating: number | null
          id: string
          internal_booking_number: string
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          meal_plan: string
          number_of_adults: number
          number_of_children: number
          number_of_nights: number | null
          paid_amount: number | null
          payment_due_date: string | null
          payment_method: string | null
          remaining_amount: number | null
          room_type: string
          selling_price_per_night: number
          status_id: string | null
          supplier_name: string
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          total_cost_customer: number | null
          total_profit: number | null
          updated_at: string
          voucher_sent: boolean | null
          voucher_sent_date: string | null
        }
        Insert: {
          booking_agent_name: string
          booking_date?: string
          booking_reference_supplier?: string | null
          cancellation_policy?: string | null
          check_in_date: string
          check_out_date: string
          children_ages?: string | null
          cost_per_night: number
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          destination_city: string
          hotel_name: string
          hotel_star_rating?: number | null
          id?: string
          internal_booking_number?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          meal_plan: string
          number_of_adults?: number
          number_of_children?: number
          number_of_nights?: number | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          remaining_amount?: number | null
          room_type: string
          selling_price_per_night: number
          status_id?: string | null
          supplier_name: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost_customer?: number | null
          total_profit?: number | null
          updated_at?: string
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Update: {
          booking_agent_name?: string
          booking_date?: string
          booking_reference_supplier?: string | null
          cancellation_policy?: string | null
          check_in_date?: string
          check_out_date?: string
          children_ages?: string | null
          cost_per_night?: number
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          destination_city?: string
          hotel_name?: string
          hotel_star_rating?: number | null
          id?: string
          internal_booking_number?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          meal_plan?: string
          number_of_adults?: number
          number_of_children?: number
          number_of_nights?: number | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          remaining_amount?: number | null
          room_type?: string
          selling_price_per_night?: number
          status_id?: string | null
          supplier_name?: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost_customer?: number | null
          total_profit?: number | null
          updated_at?: string
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_suppliers: {
        Row: {
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_direct_hotel: boolean | null
          name: string
          payment_terms: string | null
          phone: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_direct_hotel?: boolean | null
          name: string
          payment_terms?: string | null
          phone?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_direct_hotel?: boolean | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
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
          booking_type: string
          created_at: string
          currency: string | null
          customer_id: string
          discount_amount: number | null
          due_date: string | null
          exchange_rate_to_egp: number | null
          exchange_rate_to_usd: number | null
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
          total_amount_egp: number | null
          total_amount_usd: number | null
          updated_at: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          booking_id: string
          booking_type: string
          created_at?: string
          currency?: string | null
          customer_id: string
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate_to_egp?: number | null
          exchange_rate_to_usd?: number | null
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
          total_amount_egp?: number | null
          total_amount_usd?: number | null
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          booking_id?: string
          booking_type?: string
          created_at?: string
          currency?: string | null
          customer_id?: string
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate_to_egp?: number | null
          exchange_rate_to_usd?: number | null
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
          total_amount_egp?: number | null
          total_amount_usd?: number | null
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
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          points_required: number
          reward_type: string
          reward_value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          points_required: number
          reward_type: string
          reward_value: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          points_required?: number
          reward_type?: string
          reward_value?: number
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          campaign_type: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          message_template: string
          name: string
          start_date: string
          status: string | null
          target_segment_id: string | null
          updated_at: string
        }
        Insert: {
          campaign_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          message_template: string
          name: string
          start_date: string
          status?: string | null
          target_segment_id?: string | null
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          message_template?: string
          name?: string
          start_date?: string
          status?: string | null
          target_segment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_target_segment_id_fkey"
            columns: ["target_segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
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
      monthly_salaries: {
        Row: {
          allowances: number | null
          bank_account_id: string | null
          base_salary: number
          bonus: number | null
          created_at: string
          created_by: string | null
          deductions: number | null
          employee_id: string
          gross_salary: number
          id: string
          insurance_deduction: number | null
          net_salary: number
          notes: string | null
          overtime_amount: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          payment_date: string | null
          payment_method: string | null
          salary_month: string
          status: string | null
          tax_amount: number | null
          updated_at: string
        }
        Insert: {
          allowances?: number | null
          bank_account_id?: string | null
          base_salary: number
          bonus?: number | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          employee_id: string
          gross_salary: number
          id?: string
          insurance_deduction?: number | null
          net_salary: number
          notes?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          payment_date?: string | null
          payment_method?: string | null
          salary_month: string
          status?: string | null
          tax_amount?: number | null
          updated_at?: string
        }
        Update: {
          allowances?: number | null
          bank_account_id?: string | null
          base_salary?: number
          bonus?: number | null
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          employee_id?: string
          gross_salary?: number
          id?: string
          insurance_deduction?: number | null
          net_salary?: number
          notes?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          payment_date?: string | null
          payment_method?: string | null
          salary_month?: string
          status?: string | null
          tax_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_salaries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_salaries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          priority: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          priority?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          priority?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          amount_in_account_currency: number | null
          bank_account_id: string | null
          bank_reference: string | null
          created_at: string
          due_date: string
          exchange_rate: number | null
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
          amount_in_account_currency?: number | null
          bank_account_id?: string | null
          bank_reference?: string | null
          created_at?: string
          due_date: string
          exchange_rate?: number | null
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
          amount_in_account_currency?: number | null
          bank_account_id?: string | null
          bank_reference?: string | null
          created_at?: string
          due_date?: string
          exchange_rate?: number | null
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
            foreignKeyName: "payment_orders_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
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
      rent_contracts: {
        Row: {
          annual_increase_percentage: number | null
          contract_number: string
          contract_terms: string | null
          created_at: string
          currency: string | null
          end_date: string
          id: string
          is_active: boolean | null
          landlord_name: string
          landlord_phone: string | null
          monthly_rent: number
          property_address: string
          property_type: string
          renewal_period_months: number | null
          security_deposit: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          annual_increase_percentage?: number | null
          contract_number: string
          contract_terms?: string | null
          created_at?: string
          currency?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          landlord_name: string
          landlord_phone?: string | null
          monthly_rent: number
          property_address: string
          property_type: string
          renewal_period_months?: number | null
          security_deposit?: number | null
          start_date: string
          updated_at?: string
        }
        Update: {
          annual_increase_percentage?: number | null
          contract_number?: string
          contract_terms?: string | null
          created_at?: string
          currency?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          landlord_name?: string
          landlord_phone?: string | null
          monthly_rent?: number
          property_address?: string
          property_type?: string
          renewal_period_months?: number | null
          security_deposit?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      rent_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          due_date: string
          id: string
          late_fee: number | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_month: string
          reference_number: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date: string
          id?: string
          late_fee?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_month: string
          reference_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date?: string
          id?: string
          late_fee?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_month?: string
          reference_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rent_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_scales: {
        Row: {
          annual_increment: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          level: number
          max_salary: number
          min_salary: number
          position: string
          updated_at: string
        }
        Insert: {
          annual_increment?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          max_salary: number
          min_salary: number
          position: string
          updated_at?: string
        }
        Update: {
          annual_increment?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          max_salary?: number
          min_salary?: number
          position?: string
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
      special_request_types: {
        Row: {
          category: string
          created_at: string
          extra_cost_amount: number | null
          has_extra_cost: boolean | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          extra_cost_amount?: number | null
          has_extra_cost?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          extra_cost_amount?: number | null
          has_extra_cost?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      supplier_contracts: {
        Row: {
          contract_number: string
          contract_type: string
          contract_value: number
          created_at: string | null
          currency: string
          end_date: string
          id: string
          is_active: boolean | null
          payment_terms: string | null
          start_date: string
          supplier_id: string
          terms_and_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          contract_number: string
          contract_type: string
          contract_value?: number
          created_at?: string | null
          currency?: string
          end_date: string
          id?: string
          is_active?: boolean | null
          payment_terms?: string | null
          start_date: string
          supplier_id: string
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          contract_number?: string
          contract_type?: string
          contract_value?: number
          created_at?: string | null
          currency?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          payment_terms?: string | null
          start_date?: string
          supplier_id?: string
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contracts_supplier_id_fkey"
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
          amount_in_egp: number | null
          booking_id: string
          contract_id: string | null
          created_at: string
          currency: string | null
          due_date: string | null
          exchange_rate: number | null
          id: string
          notes: string | null
          paid_date: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string
          reference_number: string | null
          status: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_in_egp?: number | null
          booking_id: string
          contract_id?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference: string
          reference_number?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_in_egp?: number | null
          booking_id?: string
          contract_id?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string
          reference_number?: string | null
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
            foreignKeyName: "supplier_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
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
      supplier_ratings: {
        Row: {
          communication: number | null
          created_at: string | null
          delivery_time: number | null
          feedback: string | null
          id: string
          overall_rating: number | null
          price_competitiveness: number | null
          rated_by: string | null
          rating_date: string | null
          service_quality: number | null
          supplier_id: string
        }
        Insert: {
          communication?: number | null
          created_at?: string | null
          delivery_time?: number | null
          feedback?: string | null
          id?: string
          overall_rating?: number | null
          price_competitiveness?: number | null
          rated_by?: string | null
          rating_date?: string | null
          service_quality?: number | null
          supplier_id: string
        }
        Update: {
          communication?: number | null
          created_at?: string | null
          delivery_time?: number | null
          feedback?: string | null
          id?: string
          overall_rating?: number | null
          price_competitiveness?: number | null
          rated_by?: string | null
          rating_date?: string | null
          service_quality?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ratings_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
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
          credit_limit: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          preferred_currency: string | null
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
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          preferred_currency?: string | null
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
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          preferred_currency?: string | null
          rating?: number | null
          tax_number?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_creation_requests: {
        Row: {
          created_at: string
          created_by: string
          department: string | null
          email: string
          full_name: string
          id: string
          password_expires_at: string | null
          phone: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status: string | null
          temporary_password: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          password_expires_at?: string | null
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status?: string | null
          temporary_password?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          password_expires_at?: string | null
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          temporary_password?: string | null
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
      can_delete_customers: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_manage_customers: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      generate_booking_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_booking_status: {
        Args: { p_booking_id: string }
        Returns: {
          status_name: string
          status_name_ar: string
          color: string
        }[]
      }
      get_current_exchange_rate: {
        Args: { from_curr: string; to_curr: string }
        Returns: number
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_system_setting: {
        Args: { setting_key_param: string }
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
      log_admin_action: {
        Args: {
          p_action_type: string
          p_target_table?: string
          p_target_id?: string
          p_old_values?: Json
          p_new_values?: Json
          p_description?: string
        }
        Returns: undefined
      }
      update_booking_status: {
        Args: {
          p_booking_id: string
          p_status_id: string
          p_changed_by?: string
          p_notes?: string
        }
        Returns: boolean
      }
      update_system_setting: {
        Args: { setting_key_param: string; setting_value_param: string }
        Returns: undefined
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
