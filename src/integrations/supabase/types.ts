export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_active_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string | null
          id: string
          impersonated_user_id: string | null
          is_impersonating: boolean | null
          last_activity: string | null
          original_session_id: string
          session_data: Json | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          is_impersonating?: boolean | null
          last_activity?: string | null
          original_session_id: string
          session_data?: Json | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          is_impersonating?: boolean | null
          last_activity?: string | null
          original_session_id?: string
          session_data?: Json | null
        }
        Relationships: []
      }
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
      admin_impersonation_log: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          impersonation_ended_at: string | null
          impersonation_started_at: string
          ip_address: unknown | null
          reason: string | null
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          impersonation_ended_at?: string | null
          impersonation_started_at?: string
          ip_address?: unknown | null
          reason?: string | null
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          impersonation_ended_at?: string | null
          impersonation_started_at?: string
          ip_address?: unknown | null
          reason?: string | null
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
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
      auto_assignment_rules: {
        Row: {
          assignment_type: string | null
          conditions: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          rule_name: string
          target_employees: string[] | null
          updated_at: string | null
          working_days: number[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          assignment_type?: string | null
          conditions: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_name: string
          target_employees?: string[] | null
          updated_at?: string | null
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          assignment_type?: string | null
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_name?: string
          target_employees?: string[] | null
          updated_at?: string | null
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
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
      car_rentals: {
        Row: {
          additional_driver_count: number | null
          additional_fees: number | null
          booking_agent_id: string | null
          booking_agent_name: string
          contract_sent: boolean | null
          contract_sent_date: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
          customer_name: string
          daily_rate: number
          damage_notes: string | null
          deposit_paid: number | null
          deposit_returned: number | null
          driver_license_expiry: string | null
          driver_license_number: string | null
          exchange_rate_to_egp: number | null
          fuel_level_pickup: string | null
          fuel_level_return: string | null
          gps_included: boolean | null
          id: string
          insurance_cost: number | null
          insurance_included: boolean | null
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          paid_amount: number | null
          payment_due_date: string | null
          payment_method: string | null
          pickup_location: string
          pickup_notes: string | null
          remaining_amount: number | null
          rental_duration_days: number
          rental_end_date: string
          rental_reference: string
          rental_start_date: string
          return_location: string
          return_notes: string | null
          security_deposit: number | null
          special_requirements: string | null
          status_id: string | null
          supplier_cost_egp: number | null
          supplier_daily_cost: number
          supplier_id: string | null
          supplier_name: string
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          supplier_total_cost: number
          total_cost_egp: number | null
          total_profit: number | null
          total_rental_cost: number
          updated_at: string
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_plate_number: string | null
          vehicle_type_id: string | null
          vehicle_year: number | null
        }
        Insert: {
          additional_driver_count?: number | null
          additional_fees?: number | null
          booking_agent_id?: string | null
          booking_agent_name: string
          contract_sent?: boolean | null
          contract_sent_date?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          daily_rate: number
          damage_notes?: string | null
          deposit_paid?: number | null
          deposit_returned?: number | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          exchange_rate_to_egp?: number | null
          fuel_level_pickup?: string | null
          fuel_level_return?: string | null
          gps_included?: boolean | null
          id?: string
          insurance_cost?: number | null
          insurance_included?: boolean | null
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          pickup_location: string
          pickup_notes?: string | null
          remaining_amount?: number | null
          rental_duration_days: number
          rental_end_date: string
          rental_reference?: string
          rental_start_date: string
          return_location: string
          return_notes?: string | null
          security_deposit?: number | null
          special_requirements?: string | null
          status_id?: string | null
          supplier_cost_egp?: number | null
          supplier_daily_cost: number
          supplier_id?: string | null
          supplier_name: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_total_cost: number
          total_cost_egp?: number | null
          total_profit?: number | null
          total_rental_cost: number
          updated_at?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate_number?: string | null
          vehicle_type_id?: string | null
          vehicle_year?: number | null
        }
        Update: {
          additional_driver_count?: number | null
          additional_fees?: number | null
          booking_agent_id?: string | null
          booking_agent_name?: string
          contract_sent?: boolean | null
          contract_sent_date?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          daily_rate?: number
          damage_notes?: string | null
          deposit_paid?: number | null
          deposit_returned?: number | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          exchange_rate_to_egp?: number | null
          fuel_level_pickup?: string | null
          fuel_level_return?: string | null
          gps_included?: boolean | null
          id?: string
          insurance_cost?: number | null
          insurance_included?: boolean | null
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          pickup_location?: string
          pickup_notes?: string | null
          remaining_amount?: number | null
          rental_duration_days?: number
          rental_end_date?: string
          rental_reference?: string
          rental_start_date?: string
          return_location?: string
          return_notes?: string | null
          security_deposit?: number | null
          special_requirements?: string | null
          status_id?: string | null
          supplier_cost_egp?: number | null
          supplier_daily_cost?: number
          supplier_id?: string | null
          supplier_name?: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_total_cost?: number
          total_cost_egp?: number | null
          total_profit?: number | null
          total_rental_cost?: number
          updated_at?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate_number?: string | null
          vehicle_type_id?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "car_rentals_booking_agent_id_fkey"
            columns: ["booking_agent_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_rentals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_rentals_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_rentals_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_rentals_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          bank_account_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          employee_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_period_end: string
          payment_period_start: string
          reference_number: string | null
          total_commission_amount: number
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          payment_period_end: string
          payment_period_start: string
          reference_number?: string | null
          total_commission_amount: number
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_period_end?: string
          payment_period_start?: string
          reference_number?: string | null
          total_commission_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          created_by: string | null
          email: string | null
          id: string
          last_booking_date: string | null
          last_follow_up_by: string | null
          last_follow_up_date: string | null
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
          created_by?: string | null
          email?: string | null
          id?: string
          last_booking_date?: string | null
          last_follow_up_by?: string | null
          last_follow_up_date?: string | null
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
          created_by?: string | null
          email?: string | null
          id?: string
          last_booking_date?: string | null
          last_follow_up_by?: string | null
          last_follow_up_date?: string | null
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
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_last_follow_up_by_fkey"
            columns: ["last_follow_up_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          attractions: Json | null
          attractions_ar: Json | null
          country: string
          country_ar: string
          created_at: string | null
          created_by: string | null
          description: string | null
          description_ar: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          name_ar: string
          rating: number | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          attractions?: Json | null
          attractions_ar?: Json | null
          country: string
          country_ar: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          name_ar: string
          rating?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          attractions?: Json | null
          attractions_ar?: Json | null
          country?: string
          country_ar?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          name_ar?: string
          rating?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      detailed_permissions: {
        Row: {
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          permission_key: string
          permission_name: string
          permission_name_ar: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          permission_key: string
          permission_name: string
          permission_name_ar: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          permission_key?: string
          permission_name?: string
          permission_name_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "detailed_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      detailed_user_permissions: {
        Row: {
          banking_transactions: boolean
          banking_transfer: boolean
          banking_view: boolean
          bookings_cancel: boolean
          bookings_confirm: boolean
          bookings_create: boolean
          bookings_delete: boolean
          bookings_edit: boolean
          bookings_view: boolean
          created_at: string
          customers_create: boolean
          customers_delete: boolean
          customers_edit: boolean
          customers_export: boolean
          customers_view: boolean
          employees_commission: boolean
          employees_create: boolean
          employees_delete: boolean
          employees_edit: boolean
          employees_salary: boolean
          employees_view: boolean
          expenses_approve: boolean
          expenses_create: boolean
          expenses_reports: boolean
          expenses_view: boolean
          id: string
          invoices_create: boolean
          invoices_delete: boolean
          invoices_edit: boolean
          invoices_payment: boolean
          invoices_send: boolean
          invoices_view: boolean
          reports_advanced: boolean
          reports_export: boolean
          reports_financial: boolean
          reports_operational: boolean
          reports_sales: boolean
          suppliers_contracts: boolean
          suppliers_create: boolean
          suppliers_delete: boolean
          suppliers_edit: boolean
          suppliers_view: boolean
          system_audit: boolean
          system_backup: boolean
          system_settings: boolean
          system_users: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          banking_transactions?: boolean
          banking_transfer?: boolean
          banking_view?: boolean
          bookings_cancel?: boolean
          bookings_confirm?: boolean
          bookings_create?: boolean
          bookings_delete?: boolean
          bookings_edit?: boolean
          bookings_view?: boolean
          created_at?: string
          customers_create?: boolean
          customers_delete?: boolean
          customers_edit?: boolean
          customers_export?: boolean
          customers_view?: boolean
          employees_commission?: boolean
          employees_create?: boolean
          employees_delete?: boolean
          employees_edit?: boolean
          employees_salary?: boolean
          employees_view?: boolean
          expenses_approve?: boolean
          expenses_create?: boolean
          expenses_reports?: boolean
          expenses_view?: boolean
          id?: string
          invoices_create?: boolean
          invoices_delete?: boolean
          invoices_edit?: boolean
          invoices_payment?: boolean
          invoices_send?: boolean
          invoices_view?: boolean
          reports_advanced?: boolean
          reports_export?: boolean
          reports_financial?: boolean
          reports_operational?: boolean
          reports_sales?: boolean
          suppliers_contracts?: boolean
          suppliers_create?: boolean
          suppliers_delete?: boolean
          suppliers_edit?: boolean
          suppliers_view?: boolean
          system_audit?: boolean
          system_backup?: boolean
          system_settings?: boolean
          system_users?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          banking_transactions?: boolean
          banking_transfer?: boolean
          banking_view?: boolean
          bookings_cancel?: boolean
          bookings_confirm?: boolean
          bookings_create?: boolean
          bookings_delete?: boolean
          bookings_edit?: boolean
          bookings_view?: boolean
          created_at?: string
          customers_create?: boolean
          customers_delete?: boolean
          customers_edit?: boolean
          customers_export?: boolean
          customers_view?: boolean
          employees_commission?: boolean
          employees_create?: boolean
          employees_delete?: boolean
          employees_edit?: boolean
          employees_salary?: boolean
          employees_view?: boolean
          expenses_approve?: boolean
          expenses_create?: boolean
          expenses_reports?: boolean
          expenses_view?: boolean
          id?: string
          invoices_create?: boolean
          invoices_delete?: boolean
          invoices_edit?: boolean
          invoices_payment?: boolean
          invoices_send?: boolean
          invoices_view?: boolean
          reports_advanced?: boolean
          reports_export?: boolean
          reports_financial?: boolean
          reports_operational?: boolean
          reports_sales?: boolean
          suppliers_contracts?: boolean
          suppliers_create?: boolean
          suppliers_delete?: boolean
          suppliers_edit?: boolean
          suppliers_view?: boolean
          system_audit?: boolean
          system_backup?: boolean
          system_settings?: boolean
          system_users?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_commission_periods: {
        Row: {
          bank_account_id: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          created_by: string | null
          currency: string
          employee_id: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          status: string
          total_booking_amount: number
          total_bookings_count: number
          total_profit: number
          total_supplier_cost: number
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          employee_id: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          status?: string
          total_booking_amount?: number
          total_bookings_count?: number
          total_profit?: number
          total_supplier_cost?: number
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          employee_id?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_booking_amount?: number
          total_bookings_count?: number
          total_profit?: number
          total_supplier_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_commission_periods_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_commission_periods_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_commissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          booking_amount: number
          booking_id: string | null
          booking_type: string
          commission_amount: number
          commission_date: string
          commission_rate: number
          created_at: string
          created_by: string | null
          currency: string | null
          employee_id: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          booking_amount: number
          booking_id?: string | null
          booking_type: string
          commission_amount: number
          commission_date?: string
          commission_rate: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          booking_amount?: number
          booking_id?: string | null
          booking_type?: string
          commission_amount?: number
          commission_date?: string
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          commission_rate: number | null
          commission_type: string | null
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
          total_commission_earned: number | null
          updated_at: string
        }
        Insert: {
          allowances?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary?: number
          commission_rate?: number | null
          commission_type?: string | null
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
          total_commission_earned?: number | null
          updated_at?: string
        }
        Update: {
          allowances?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary?: number
          commission_rate?: number | null
          commission_type?: string | null
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
          total_commission_earned?: number | null
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
          booking_agent_id: string | null
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
          exchange_rate_to_egp: number | null
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
          supplier_cost_egp: number | null
          supplier_name: string
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          supplier_reference: string | null
          taxes_and_fees: number | null
          ticket_numbers: string[] | null
          ticket_price_per_person: number
          total_cost: number
          total_cost_egp: number | null
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
          booking_agent_id?: string | null
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
          exchange_rate_to_egp?: number | null
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
          supplier_cost_egp?: number | null
          supplier_name: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_reference?: string | null
          taxes_and_fees?: number | null
          ticket_numbers?: string[] | null
          ticket_price_per_person: number
          total_cost: number
          total_cost_egp?: number | null
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
          booking_agent_id?: string | null
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
          exchange_rate_to_egp?: number | null
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
          supplier_cost_egp?: number | null
          supplier_name?: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_reference?: string | null
          taxes_and_fees?: number | null
          ticket_numbers?: string[] | null
          ticket_price_per_person?: number
          total_cost?: number
          total_cost_egp?: number | null
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
            foreignKeyName: "flight_bookings_booking_agent_id_fkey"
            columns: ["booking_agent_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          booking_agent_id: string | null
          booking_agent_name: string
          booking_date: string
          booking_reference_supplier: string | null
          cancellation_policy: string | null
          check_in_date: string
          check_out_date: string
          children_ages: string | null
          cost_per_night: number
          cost_per_night_egp: number | null
          created_at: string
          currency: string | null
          customer_id: string | null
          customer_name: string
          destination_city: string
          exchange_rate_to_egp: number | null
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
          supplier_id: string | null
          supplier_name: string
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          total_cost_customer: number | null
          total_cost_customer_egp: number | null
          total_profit: number | null
          updated_at: string
          voucher_sent: boolean | null
          voucher_sent_date: string | null
        }
        Insert: {
          booking_agent_id?: string | null
          booking_agent_name: string
          booking_date?: string
          booking_reference_supplier?: string | null
          cancellation_policy?: string | null
          check_in_date: string
          check_out_date: string
          children_ages?: string | null
          cost_per_night: number
          cost_per_night_egp?: number | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          destination_city: string
          exchange_rate_to_egp?: number | null
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
          supplier_id?: string | null
          supplier_name: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost_customer?: number | null
          total_cost_customer_egp?: number | null
          total_profit?: number | null
          updated_at?: string
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Update: {
          booking_agent_id?: string | null
          booking_agent_name?: string
          booking_date?: string
          booking_reference_supplier?: string | null
          cancellation_policy?: string | null
          check_in_date?: string
          check_out_date?: string
          children_ages?: string | null
          cost_per_night?: number
          cost_per_night_egp?: number | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          destination_city?: string
          exchange_rate_to_egp?: number | null
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
          supplier_id?: string | null
          supplier_name?: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost_customer?: number | null
          total_cost_customer_egp?: number | null
          total_profit?: number | null
          updated_at?: string
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_booking_agent_id_fkey"
            columns: ["booking_agent_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "hotel_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      hotels: {
        Row: {
          contact_info: Json | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          description_ar: string | null
          destination_id: string | null
          features: Json | null
          features_ar: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          location: string
          location_ar: string
          meta_description: string | null
          meta_title: string | null
          name: string
          name_ar: string
          price_range: string | null
          rating: number | null
          sort_order: number | null
          star_rating: number | null
          updated_at: string | null
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          destination_id?: string | null
          features?: Json | null
          features_ar?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          location: string
          location_ar: string
          meta_description?: string | null
          meta_title?: string | null
          name: string
          name_ar: string
          price_range?: string | null
          rating?: number | null
          sort_order?: number | null
          star_rating?: number | null
          updated_at?: string | null
        }
        Update: {
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          destination_id?: string | null
          features?: Json | null
          features_ar?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          location?: string
          location_ar?: string
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          name_ar?: string
          price_range?: string | null
          rating?: number | null
          sort_order?: number | null
          star_rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
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
      invoice_payments: {
        Row: {
          bank_account_id: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_amount: number
          payment_date: string
          payment_method: string
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_amount: number
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_amount?: number
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
          payment_status: string | null
          payment_terms: string | null
          remaining_amount: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          total_amount_egp: number | null
          total_amount_usd: number | null
          total_paid_amount: number | null
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
          payment_status?: string | null
          payment_terms?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount: number
          total_amount_egp?: number | null
          total_amount_usd?: number | null
          total_paid_amount?: number | null
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
          payment_status?: string | null
          payment_terms?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          total_amount_egp?: number | null
          total_amount_usd?: number | null
          total_paid_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_content: {
        Row: {
          background_image_url: string | null
          badge_text: string | null
          button_link: string | null
          button_text: string | null
          content: string
          created_at: string | null
          icon_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          layout_config: Json | null
          order_index: number | null
          section: string
          section_type: string | null
          style_config: Json | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_image_url?: string | null
          badge_text?: string | null
          button_link?: string | null
          button_text?: string | null
          content: string
          created_at?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          layout_config?: Json | null
          order_index?: number | null
          section: string
          section_type?: string | null
          style_config?: Json | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_image_url?: string | null
          badge_text?: string | null
          button_link?: string | null
          button_text?: string | null
          content?: string
          created_at?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          layout_config?: Json | null
          order_index?: number | null
          section?: string
          section_type?: string | null
          style_config?: Json | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          file_size: number | null
          id: string
          image_name: string
          image_url: string
          is_active: boolean | null
          mime_type: string | null
          section: string | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_size?: number | null
          id?: string
          image_name: string
          image_url: string
          is_active?: boolean | null
          mime_type?: string | null
          section?: string | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_size?: number | null
          id?: string
          image_name?: string
          image_url?: string
          is_active?: boolean | null
          mime_type?: string | null
          section?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      media_library: {
        Row: {
          alt_text: string | null
          caption: string | null
          category: string | null
          created_at: string | null
          file_path: string
          file_size: number | null
          filename: string
          height: number | null
          id: string
          is_public: boolean | null
          mime_type: string | null
          original_name: string
          tags: Json | null
          updated_at: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          file_path: string
          file_size?: number | null
          filename: string
          height?: number | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          original_name: string
          tags?: Json | null
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          filename?: string
          height?: number | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          original_name?: string
          tags?: Json | null
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
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
          currency: string | null
          deductions: number | null
          employee_id: string
          exchange_rate: number | null
          gross_salary: number
          id: string
          insurance_deduction: number | null
          net_salary: number
          net_salary_egp: number | null
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
          currency?: string | null
          deductions?: number | null
          employee_id: string
          exchange_rate?: number | null
          gross_salary: number
          id?: string
          insurance_deduction?: number | null
          net_salary: number
          net_salary_egp?: number | null
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
          currency?: string | null
          deductions?: number | null
          employee_id?: string
          exchange_rate?: number | null
          gross_salary?: number
          id?: string
          insurance_deduction?: number | null
          net_salary?: number
          net_salary_egp?: number | null
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
      payment_intents: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          invoice_id: string | null
          paid_at: string | null
          status: string
          stripe_payment_intent_id: string
          stripe_payment_method_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id: string
          stripe_payment_method_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string
          stripe_payment_method_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
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
      permission_groups: {
        Row: {
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
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          employee_id: string | null
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
          employee_id?: string | null
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
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_global: boolean | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
          maintenance_responsibility: string | null
          monthly_rent: number
          property_address: string
          property_type: string
          renewal_period_months: number | null
          security_deposit: number | null
          start_date: string
          updated_at: string
          utilities_included: boolean | null
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
          maintenance_responsibility?: string | null
          monthly_rent: number
          property_address: string
          property_type: string
          renewal_period_months?: number | null
          security_deposit?: number | null
          start_date: string
          updated_at?: string
          utilities_included?: boolean | null
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
          maintenance_responsibility?: string | null
          monthly_rent?: number
          property_address?: string
          property_type?: string
          renewal_period_months?: number | null
          security_deposit?: number | null
          start_date?: string
          updated_at?: string
          utilities_included?: boolean | null
        }
        Relationships: []
      }
      rent_payments: {
        Row: {
          amount: number
          amount_egp: number | null
          bank_account_id: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          due_date: string
          exchange_rate: number | null
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
          amount_egp?: number | null
          bank_account_id?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date: string
          exchange_rate?: number | null
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
          amount_egp?: number | null
          bank_account_id?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date?: string
          exchange_rate?: number | null
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
      role_permissions: {
        Row: {
          created_at: string
          granted: boolean | null
          id: string
          permission_key: string
          role_name: string
        }
        Insert: {
          created_at?: string
          granted?: boolean | null
          id?: string
          permission_key: string
          role_name: string
        }
        Update: {
          created_at?: string
          granted?: boolean | null
          id?: string
          permission_key?: string
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "detailed_permissions"
            referencedColumns: ["permission_key"]
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
      service_requests: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string
          preferred_contact: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
          preferred_contact?: string
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
          preferred_contact?: string
          service_type?: string
          status?: string
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
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
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
      supplier_currencies: {
        Row: {
          created_at: string
          currency: string
          exchange_rate: number | null
          id: string
          is_primary: boolean | null
          notes: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          exchange_rate?: number | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          exchange_rate?: number | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_currencies_supplier_id_fkey"
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
          payment_method_options: Json | null
          payment_terms: string | null
          payment_type: string | null
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
          payment_method_options?: Json | null
          payment_terms?: string | null
          payment_type?: string | null
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
          payment_method_options?: Json | null
          payment_terms?: string | null
          payment_type?: string | null
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
      transport_bookings: {
        Row: {
          arrival_date: string | null
          arrival_time: string | null
          booking_agent_id: string | null
          booking_agent_name: string
          booking_reference: string
          cost_per_trip: number
          created_at: string
          currency: string | null
          customer_id: string | null
          customer_name: string
          departure_date: string
          departure_time: string | null
          driver_name: string | null
          driver_phone: string | null
          dropoff_location: string
          exchange_rate_to_egp: number | null
          id: string
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          number_of_passengers: number
          paid_amount: number | null
          payment_due_date: string | null
          payment_method: string | null
          pickup_location: string
          remaining_amount: number | null
          route_id: string | null
          selling_price_per_trip: number
          special_requests: string | null
          status_id: string | null
          supplier_cost: number
          supplier_cost_egp: number | null
          supplier_id: string | null
          supplier_name: string
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          total_cost: number
          total_cost_egp: number | null
          total_profit: number | null
          updated_at: string
          vehicle_plate_number: string | null
          vehicle_type_id: string | null
          voucher_sent: boolean | null
          voucher_sent_date: string | null
        }
        Insert: {
          arrival_date?: string | null
          arrival_time?: string | null
          booking_agent_id?: string | null
          booking_agent_name: string
          booking_reference?: string
          cost_per_trip: number
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          departure_date: string
          departure_time?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location: string
          exchange_rate_to_egp?: number | null
          id?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          number_of_passengers?: number
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          pickup_location: string
          remaining_amount?: number | null
          route_id?: string | null
          selling_price_per_trip: number
          special_requests?: string | null
          status_id?: string | null
          supplier_cost: number
          supplier_cost_egp?: number | null
          supplier_id?: string | null
          supplier_name: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost: number
          total_cost_egp?: number | null
          total_profit?: number | null
          updated_at?: string
          vehicle_plate_number?: string | null
          vehicle_type_id?: string | null
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Update: {
          arrival_date?: string | null
          arrival_time?: string | null
          booking_agent_id?: string | null
          booking_agent_name?: string
          booking_reference?: string
          cost_per_trip?: number
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          departure_date?: string
          departure_time?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location?: string
          exchange_rate_to_egp?: number | null
          id?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          number_of_passengers?: number
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          pickup_location?: string
          remaining_amount?: number | null
          route_id?: string | null
          selling_price_per_trip?: number
          special_requests?: string | null
          status_id?: string | null
          supplier_cost?: number
          supplier_cost_egp?: number | null
          supplier_id?: string | null
          supplier_name?: string
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost?: number
          total_cost_egp?: number | null
          total_profit?: number | null
          updated_at?: string
          vehicle_plate_number?: string | null
          vehicle_type_id?: string | null
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_bookings_booking_agent_id_fkey"
            columns: ["booking_agent_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          arrival_city: string
          created_at: string
          departure_city: string
          distance_km: number | null
          estimated_duration_hours: number | null
          id: string
          is_active: boolean | null
          route_name: string
          route_name_ar: string
          route_type: string | null
          updated_at: string
        }
        Insert: {
          arrival_city: string
          created_at?: string
          departure_city: string
          distance_km?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          route_name: string
          route_name_ar: string
          route_type?: string | null
          updated_at?: string
        }
        Update: {
          arrival_city?: string
          created_at?: string
          departure_city?: string
          distance_km?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          route_name?: string
          route_name_ar?: string
          route_type?: string | null
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
      user_permissions: {
        Row: {
          bookings_read: boolean | null
          bookings_write: boolean | null
          created_at: string | null
          customers_read: boolean | null
          customers_write: boolean | null
          employees_read: boolean | null
          employees_write: boolean | null
          expenses_read: boolean | null
          expenses_write: boolean | null
          id: string
          invoices_read: boolean | null
          invoices_write: boolean | null
          reports_read: boolean | null
          reports_write: boolean | null
          settings_read: boolean | null
          settings_write: boolean | null
          suppliers_read: boolean | null
          suppliers_write: boolean | null
          updated_at: string | null
          user_id: string
          users_read: boolean | null
          users_write: boolean | null
        }
        Insert: {
          bookings_read?: boolean | null
          bookings_write?: boolean | null
          created_at?: string | null
          customers_read?: boolean | null
          customers_write?: boolean | null
          employees_read?: boolean | null
          employees_write?: boolean | null
          expenses_read?: boolean | null
          expenses_write?: boolean | null
          id?: string
          invoices_read?: boolean | null
          invoices_write?: boolean | null
          reports_read?: boolean | null
          reports_write?: boolean | null
          settings_read?: boolean | null
          settings_write?: boolean | null
          suppliers_read?: boolean | null
          suppliers_write?: boolean | null
          updated_at?: string | null
          user_id: string
          users_read?: boolean | null
          users_write?: boolean | null
        }
        Update: {
          bookings_read?: boolean | null
          bookings_write?: boolean | null
          created_at?: string | null
          customers_read?: boolean | null
          customers_write?: boolean | null
          employees_read?: boolean | null
          employees_write?: boolean | null
          expenses_read?: boolean | null
          expenses_write?: boolean | null
          id?: string
          invoices_read?: boolean | null
          invoices_write?: boolean | null
          reports_read?: boolean | null
          reports_write?: boolean | null
          settings_read?: boolean | null
          settings_write?: boolean | null
          suppliers_read?: boolean | null
          suppliers_write?: boolean | null
          updated_at?: string | null
          user_id?: string
          users_read?: boolean | null
          users_write?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      vehicle_types: {
        Row: {
          capacity_passengers: number | null
          created_at: string
          description: string | null
          features: Json | null
          fuel_type: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          transmission_type: string | null
          updated_at: string
        }
        Insert: {
          capacity_passengers?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          transmission_type?: string | null
          updated_at?: string
        }
        Update: {
          capacity_passengers?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          transmission_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_analytics: {
        Row: {
          average_response_time: unknown | null
          conversations_closed: number | null
          created_at: string | null
          customer_satisfaction_score: number | null
          date: string
          employee_id: string | null
          id: string
          total_conversations: number | null
          total_messages_received: number | null
          total_messages_sent: number | null
        }
        Insert: {
          average_response_time?: unknown | null
          conversations_closed?: number | null
          created_at?: string | null
          customer_satisfaction_score?: number | null
          date: string
          employee_id?: string | null
          id?: string
          total_conversations?: number | null
          total_messages_received?: number | null
          total_messages_sent?: number | null
        }
        Update: {
          average_response_time?: unknown | null
          conversations_closed?: number | null
          created_at?: string | null
          customer_satisfaction_score?: number | null
          date?: string
          employee_id?: string | null
          id?: string
          total_conversations?: number | null
          total_messages_received?: number | null
          total_messages_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_analytics_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          assignment_reason: string | null
          auto_assigned: boolean | null
          created_at: string | null
          customer_id: string | null
          id: string
          last_message_at: string | null
          phone_number: string
          priority: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          assignment_reason?: string | null
          auto_assigned?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          phone_number: string
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          assignment_reason?: string | null
          auto_assigned?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          phone_number?: string
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_message: string | null
          id: string
          media_mime_type: string | null
          media_url: string | null
          message_id: string | null
          message_type: string | null
          read_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          template_language: string | null
          template_name: string | null
          template_parameters: Json | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          delivered_at?: string | null
          direction: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_language?: string | null
          template_name?: string | null
          template_parameters?: Json | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_language?: string | null
          template_name?: string | null
          template_parameters?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_quick_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_global: boolean | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_quick_replies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          active_conversations_count: number | null
          auto_assignment_enabled: boolean | null
          created_at: string | null
          employee_id: string
          id: string
          last_activity: string | null
          max_conversations: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          active_conversations_count?: number | null
          auto_assignment_enabled?: boolean | null
          created_at?: string | null
          employee_id: string
          id?: string
          last_activity?: string | null
          max_conversations?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          active_conversations_count?: number | null
          auto_assignment_enabled?: boolean | null
          created_at?: string | null
          employee_id?: string
          id?: string
          last_activity?: string | null
          max_conversations?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          access_token: string
          api_version: string | null
          auto_assignment_enabled: boolean | null
          business_account_id: string | null
          business_description: string | null
          business_email: string | null
          business_name: string | null
          business_website: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          phone_number_id: string
          rate_limit_per_minute: number | null
          updated_at: string | null
          webhook_url: string | null
          webhook_verify_token: string
        }
        Insert: {
          access_token: string
          api_version?: string | null
          auto_assignment_enabled?: boolean | null
          business_account_id?: string | null
          business_description?: string | null
          business_email?: string | null
          business_name?: string | null
          business_website?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number_id: string
          rate_limit_per_minute?: number | null
          updated_at?: string | null
          webhook_url?: string | null
          webhook_verify_token: string
        }
        Update: {
          access_token?: string
          api_version?: string | null
          auto_assignment_enabled?: boolean | null
          business_account_id?: string | null
          business_description?: string | null
          business_email?: string | null
          business_name?: string | null
          business_website?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number_id?: string
          rate_limit_per_minute?: number | null
          updated_at?: string | null
          webhook_url?: string | null
          webhook_verify_token?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          category: string
          created_at: string | null
          footer_text: string | null
          header_text: string | null
          header_type: string | null
          id: string
          language: string
          name: string
          status: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          category: string
          created_at?: string | null
          footer_text?: string | null
          header_text?: string | null
          header_type?: string | null
          id?: string
          language: string
          name: string
          status?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          category?: string
          created_at?: string | null
          footer_text?: string | null
          header_text?: string | null
          header_type?: string | null
          id?: string
          language?: string
          name?: string
          status?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          p_email: string
          p_password: string
          p_full_name: string
          p_department?: string
          p_phone?: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          success: boolean
          message: string
          user_id: string
        }[]
      }
      admin_reset_user_password: {
        Args: { p_user_id: string; p_new_password: string }
        Returns: {
          success: boolean
          message: string
        }[]
      }
      admin_update_user_profile: {
        Args: {
          p_user_id: string
          p_email?: string
          p_full_name?: string
          p_department?: string
          p_phone?: string
          p_is_active?: boolean
        }
        Returns: {
          success: boolean
          message: string
        }[]
      }
      auto_assign_conversation: {
        Args: { p_phone_number: string; p_message_content?: string }
        Returns: string
      }
      booking_exists: {
        Args: { booking: string; bookingtype: string }
        Returns: boolean
      }
      calculate_employee_bookings_profit: {
        Args: {
          p_employee_id: string
          p_period_start: string
          p_period_end: string
        }
        Returns: {
          booking_type: string
          booking_id: string
          booking_amount: number
          supplier_cost: number
          profit: number
          booking_date: string
        }[]
      }
      calculate_employee_commission: {
        Args: {
          p_employee_id: string
          p_booking_amount: number
          p_commission_rate?: number
        }
        Returns: number
      }
      calculate_monthly_salary: {
        Args: {
          p_employee_id: string
          p_salary_month: string
          p_overtime_hours?: number
          p_bonus?: number
          p_deductions?: number
          p_notes?: string
        }
        Returns: Json
      }
      can_delete_customers: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_manage_customers: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cancel_commission: {
        Args: { p_commission_id: string; p_reason?: string }
        Returns: boolean
      }
      check_employee_deletion: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      check_user_permission: {
        Args: {
          p_user_id: string
          p_permission_type: string
          p_access_type: string
        }
        Returns: boolean
      }
      create_default_permissions: {
        Args: { p_user_id: string }
        Returns: string
      }
      end_impersonation: {
        Args: { p_session_id: string }
        Returns: {
          success: boolean
          message: string
        }[]
      }
      generate_booking_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_period_commission: {
        Args: {
          p_employee_id: string
          p_period_start: string
          p_period_end: string
          p_notes?: string
        }
        Returns: Json
      }
      get_all_user_permissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          email: string
          full_name: string
          is_active: boolean
          customers_view: boolean
          customers_create: boolean
          customers_edit: boolean
          customers_delete: boolean
          customers_export: boolean
          bookings_view: boolean
          bookings_create: boolean
          bookings_edit: boolean
          bookings_delete: boolean
          bookings_cancel: boolean
          bookings_confirm: boolean
          invoices_view: boolean
          invoices_create: boolean
          invoices_edit: boolean
          invoices_delete: boolean
          invoices_send: boolean
          invoices_payment: boolean
          suppliers_view: boolean
          suppliers_create: boolean
          suppliers_edit: boolean
          suppliers_delete: boolean
          suppliers_contracts: boolean
          reports_financial: boolean
          reports_sales: boolean
          reports_operational: boolean
          reports_export: boolean
          reports_advanced: boolean
          employees_view: boolean
          employees_create: boolean
          employees_edit: boolean
          employees_delete: boolean
          employees_salary: boolean
          employees_commission: boolean
          expenses_view: boolean
          expenses_create: boolean
          expenses_approve: boolean
          expenses_reports: boolean
          system_users: boolean
          system_settings: boolean
          system_backup: boolean
          system_audit: boolean
          banking_view: boolean
          banking_transactions: boolean
          banking_transfer: boolean
          created_at: string
          updated_at: string
        }[]
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
      get_detailed_permissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          permission_key: string
          permission_name: string
          permission_name_ar: string
          description: string
          group_id: string
          is_active: boolean
          created_at: string
        }[]
      }
      get_permission_groups: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          name_ar: string
          description: string
          color: string
          is_active: boolean
          created_at: string
        }[]
      }
      get_system_setting: {
        Args: { setting_key_param: string }
        Returns: string
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          customers_view: boolean
          customers_create: boolean
          customers_edit: boolean
          customers_delete: boolean
          customers_export: boolean
          bookings_view: boolean
          bookings_create: boolean
          bookings_edit: boolean
          bookings_delete: boolean
          bookings_cancel: boolean
          bookings_confirm: boolean
          invoices_view: boolean
          invoices_create: boolean
          invoices_edit: boolean
          invoices_delete: boolean
          invoices_send: boolean
          invoices_payment: boolean
          suppliers_view: boolean
          suppliers_create: boolean
          suppliers_edit: boolean
          suppliers_delete: boolean
          suppliers_contracts: boolean
          reports_financial: boolean
          reports_sales: boolean
          reports_operational: boolean
          reports_export: boolean
          reports_advanced: boolean
          employees_view: boolean
          employees_create: boolean
          employees_edit: boolean
          employees_delete: boolean
          employees_salary: boolean
          employees_commission: boolean
          expenses_view: boolean
          expenses_create: boolean
          expenses_approve: boolean
          expenses_reports: boolean
          system_users: boolean
          system_settings: boolean
          system_backup: boolean
          system_audit: boolean
          banking_view: boolean
          banking_transactions: boolean
          banking_transfer: boolean
          created_at: string
          updated_at: string
        }[]
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
      link_user_to_employee: {
        Args: { p_user_id: string; p_employee_id: string }
        Returns: Json
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
      safe_delete_employee: {
        Args: {
          p_employee_id: string
          p_force_delete?: boolean
          p_reason?: string
        }
        Returns: Json
      }
      start_impersonation: {
        Args: { p_target_user_id: string; p_reason?: string }
        Returns: {
          success: boolean
          message: string
          session_token: string
        }[]
      }
      toggle_employee_status: {
        Args: { p_employee_id: string; p_is_active: boolean; p_reason?: string }
        Returns: Json
      }
      unlink_user_from_employee: {
        Args: { p_user_id: string }
        Returns: Json
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
      update_message_status: {
        Args: { p_message_id: string; p_status: string; p_timestamp?: string }
        Returns: boolean
      }
      update_period_commission_status: {
        Args: {
          p_commission_period_id: string
          p_status: string
          p_payment_date?: string
          p_payment_method?: string
          p_bank_account_id?: string
          p_notes?: string
        }
        Returns: Json
      }
      update_salary_status: {
        Args: {
          p_salary_id: string
          p_status: string
          p_payment_date?: string
          p_payment_method?: string
          p_bank_account_id?: string
          p_notes?: string
        }
        Returns: Json
      }
      update_system_setting: {
        Args: { setting_key_param: string; setting_value_param: string }
        Returns: undefined
      }
      update_user_permissions: {
        Args: { p_user_id: string; p_permissions: Json }
        Returns: string
      }
      user_has_permission: {
        Args: { p_user_id: string; p_permission_key: string }
        Returns: boolean
      }
      validate_employee_commissions: {
        Args: { p_employee_id: string }
        Returns: {
          commission_id: string
          booking_id: string
          issue_description: string
        }[]
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
