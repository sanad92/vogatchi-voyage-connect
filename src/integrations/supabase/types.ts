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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          notes: string | null
          organization_id: string
          period_name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          organization_id: string
          period_name: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          period_name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_name: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          target_id: string | null
          target_table: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_actions_log: {
        Row: {
          created_at: string
          id: string
          input: Json | null
          organization_id: string
          output: Json | null
          status: string
          thread_id: string | null
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input?: Json | null
          organization_id: string
          output?: Json | null
          status?: string
          thread_id?: string | null
          tool_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input?: Json | null
          organization_id?: string
          output?: Json | null
          status?: string
          thread_id?: string | null
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_actions_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assistant_actions_log_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          metadata: Json | null
          role: string
          thread_id: string
          tool_call_id: string | null
          tool_calls: Json | null
          tool_name: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          thread_id: string
          tool_call_id?: string | null
          tool_calls?: Json | null
          tool_name?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          thread_id?: string
          tool_call_id?: string | null
          tool_calls?: Json | null
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_threads: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_threads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      airlines: {
        Row: {
          country: string | null
          created_at: string | null
          iata_code: string | null
          icao_code: string | null
          id: string
          is_active: boolean | null
          is_global: boolean
          name: string
          organization_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          iata_code?: string | null
          icao_code?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean
          name: string
          organization_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          iata_code?: string | null
          icao_code?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airlines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      airports: {
        Row: {
          city: string
          country: string | null
          created_at: string | null
          iata_code: string
          icao_code: string | null
          id: string
          is_active: boolean | null
          is_global: boolean
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string | null
        }
        Insert: {
          city: string
          country?: string | null
          created_at?: string | null
          iata_code: string
          icao_code?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id?: string | null
        }
        Update: {
          city?: string
          country?: string | null
          created_at?: string | null
          iata_code?: string
          icao_code?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      allotment_usage: {
        Row: {
          allotment_id: string
          booking_id: string
          booking_type: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          quantity_used: number
          usage_date: string
        }
        Insert: {
          allotment_id: string
          booking_id: string
          booking_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          quantity_used?: number
          usage_date?: string
        }
        Update: {
          allotment_id?: string
          booking_id?: string
          booking_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          quantity_used?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "allotment_usage_allotment_id_fkey"
            columns: ["allotment_id"]
            isOneToOne: false
            referencedRelation: "supplier_allotments"
            referencedColumns: ["id"]
          },
        ]
      }
      api_logs: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          ip_address: string | null
          method: string
          organization_id: string | null
          request_body: Json | null
          response_summary: string | null
          response_time_ms: number | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          ip_address?: string | null
          method?: string
          organization_id?: string | null
          request_body?: Json | null
          response_summary?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          ip_address?: string | null
          method?: string
          organization_id?: string | null
          request_body?: Json | null
          response_summary?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_actions: {
        Row: {
          action_config: Json | null
          action_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          rule_id: string
          sort_order: number | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_id: string
          sort_order?: number | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          action_type: string
          booking_id: string | null
          booking_type: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          rule_id: string | null
          status: string | null
          trigger_type: string
        }
        Insert: {
          action_type: string
          booking_id?: string | null
          booking_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          rule_id?: string | null
          status?: string | null
          trigger_type: string
        }
        Update: {
          action_type?: string
          booking_id?: string | null
          booking_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          rule_id?: string | null
          status?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_logs: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          file_size: string | null
          file_url: string | null
          id: string
          notes: string | null
          organization_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          file_size?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          file_size?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_account_transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string | null
          reference_number: string | null
          related_invoice_id: string | null
          related_payment_order_id: string | null
          transaction_date: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          reference_number?: string | null
          related_invoice_id?: string | null
          related_payment_order_id?: string | null
          transaction_date?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          reference_number?: string | null
          related_invoice_id?: string | null
          related_payment_order_id?: string | null
          transaction_date?: string | null
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
            foreignKeyName: "bank_account_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          created_at: string | null
          currency: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          account_type?: string | null
          bank_name: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transfer_requests: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string | null
          created_by: string | null
          currency: string
          id: string
          notes: string | null
          organization_id: string
          plan_id: string
          receipt_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transfer_reference: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_cycle?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          organization_id: string
          plan_id: string
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transfer_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          organization_id?: string
          plan_id?: string
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transfer_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfer_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfer_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          organization_id: string | null
          page_id: string | null
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          organization_id?: string | null
          page_id?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          organization_id?: string | null
          page_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_automation_runs: {
        Row: {
          booking_id: string
          completion_score: number
          created_at: string
          error_message: string | null
          id: string
          last_run_at: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          completion_score?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_run_at?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          completion_score?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_run_at?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_automation_runs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_runs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_runs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_runs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_runs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_automation_steps: {
        Row: {
          attempts: number
          booking_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          organization_id: string
          run_id: string
          status: string
          step_key: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          booking_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          organization_id: string
          run_id: string
          status?: string
          step_key: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          booking_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          organization_id?: string
          run_id?: string
          status?: string
          step_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_automation_steps_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_steps_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_steps_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_steps_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_steps_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_automation_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "booking_automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_car_details: {
        Row: {
          booking_id: string
          car_type: string | null
          created_at: string | null
          daily_rate: number | null
          dropoff_date: string | null
          dropoff_location: string | null
          id: string
          insurance_included: boolean | null
          pickup_date: string | null
          pickup_location: string | null
        }
        Insert: {
          booking_id: string
          car_type?: string | null
          created_at?: string | null
          daily_rate?: number | null
          dropoff_date?: string | null
          dropoff_location?: string | null
          id?: string
          insurance_included?: boolean | null
          pickup_date?: string | null
          pickup_location?: string | null
        }
        Update: {
          booking_id?: string
          car_type?: string | null
          created_at?: string | null
          daily_rate?: number | null
          dropoff_date?: string | null
          dropoff_location?: string | null
          id?: string
          insurance_included?: boolean | null
          pickup_date?: string | null
          pickup_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_car_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_car_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_car_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_car_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_car_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_financial_snapshots: {
        Row: {
          booking_id: string
          created_at: string
          currency: string
          expected_margin_pct: number
          expected_profit: number
          id: string
          organization_id: string
          payable_amount: number
          receivable_amount: number
          snapshot_at: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          currency?: string
          expected_margin_pct?: number
          expected_profit?: number
          id?: string
          organization_id: string
          payable_amount?: number
          receivable_amount?: number
          snapshot_at?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          currency?: string
          expected_margin_pct?: number
          expected_profit?: number
          id?: string
          organization_id?: string
          payable_amount?: number
          receivable_amount?: number
          snapshot_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_financial_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_financial_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_financial_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_financial_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_financial_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_financial_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_flight_details: {
        Row: {
          airline: string | null
          arrival_airport: string | null
          arrival_date: string | null
          arrival_time: string | null
          booking_id: string
          created_at: string | null
          departure_airport: string | null
          departure_date: string | null
          departure_time: string | null
          flight_class: string | null
          flight_number: string | null
          id: string
          is_round_trip: boolean | null
          meal_preferences: string | null
          passengers_count: number | null
          pnr: string | null
          seat_preferences: string | null
          taxes_and_fees: number | null
          ticket_number: string | null
          ticket_price_per_person: number | null
        }
        Insert: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_date?: string | null
          arrival_time?: string | null
          booking_id: string
          created_at?: string | null
          departure_airport?: string | null
          departure_date?: string | null
          departure_time?: string | null
          flight_class?: string | null
          flight_number?: string | null
          id?: string
          is_round_trip?: boolean | null
          meal_preferences?: string | null
          passengers_count?: number | null
          pnr?: string | null
          seat_preferences?: string | null
          taxes_and_fees?: number | null
          ticket_number?: string | null
          ticket_price_per_person?: number | null
        }
        Update: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_date?: string | null
          arrival_time?: string | null
          booking_id?: string
          created_at?: string | null
          departure_airport?: string | null
          departure_date?: string | null
          departure_time?: string | null
          flight_class?: string | null
          flight_number?: string | null
          id?: string
          is_round_trip?: boolean | null
          meal_preferences?: string | null
          passengers_count?: number | null
          pnr?: string | null
          seat_preferences?: string | null
          taxes_and_fees?: number | null
          ticket_number?: string | null
          ticket_price_per_person?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_flight_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_flight_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_flight_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_flight_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_flight_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_hotel_details: {
        Row: {
          adults: number | null
          board_type: string | null
          booking_id: string
          booking_reference: string | null
          cancellation_policy: string | null
          check_in: string | null
          check_out: string | null
          children: number | null
          children_ages: string | null
          city: string | null
          created_at: string | null
          hotel_name: string | null
          id: string
          meal_plan: string | null
          nights: number | null
          room_type: string | null
          rooms: number | null
          star_rating: number | null
        }
        Insert: {
          adults?: number | null
          board_type?: string | null
          booking_id: string
          booking_reference?: string | null
          cancellation_policy?: string | null
          check_in?: string | null
          check_out?: string | null
          children?: number | null
          children_ages?: string | null
          city?: string | null
          created_at?: string | null
          hotel_name?: string | null
          id?: string
          meal_plan?: string | null
          nights?: number | null
          room_type?: string | null
          rooms?: number | null
          star_rating?: number | null
        }
        Update: {
          adults?: number | null
          board_type?: string | null
          booking_id?: string
          booking_reference?: string | null
          cancellation_policy?: string | null
          check_in?: string | null
          check_out?: string | null
          children?: number | null
          children_ages?: string | null
          city?: string | null
          created_at?: string | null
          hotel_name?: string | null
          id?: string
          meal_plan?: string | null
          nights?: number | null
          room_type?: string | null
          rooms?: number | null
          star_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_hotel_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_hotel_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_hotel_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_hotel_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_hotel_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_special_requests: {
        Row: {
          booking_id: string | null
          created_at: string | null
          custom_request_text: string | null
          id: string
          notes: string | null
          organization_id: string | null
          special_request_type_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          custom_request_text?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          special_request_type_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          custom_request_text?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          special_request_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_special_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_special_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          booking_id: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string | null
          status_id: string | null
        }
        Insert: {
          booking_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          status_id?: string | null
        }
        Update: {
          booking_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          status_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      booking_tasks: {
        Row: {
          assignee_id: string | null
          booking_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          organization_id: string
          priority: string
          source: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          booking_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id: string
          priority?: string
          source?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id?: string
          priority?: string
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_timeline_events: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          booking_id: string
          created_at: string
          id: string
          kind: string
          occurred_at: string
          organization_id: string
          payload: Json
          summary: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          booking_id: string
          created_at?: string
          id?: string
          kind: string
          occurred_at?: string
          organization_id: string
          payload?: Json
          summary?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          organization_id?: string
          payload?: Json
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_timeline_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_timeline_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_timeline_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_timeline_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_timeline_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_transport_details: {
        Row: {
          booking_id: string
          created_at: string | null
          dropoff_point: string | null
          id: string
          passengers: number | null
          pickup_point: string | null
          route: string | null
          vehicle_type: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          dropoff_point?: string | null
          id?: string
          passengers?: number | null
          pickup_point?: string | null
          route?: string | null
          vehicle_type?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          dropoff_point?: string | null
          id?: string
          passengers?: number | null
          pickup_point?: string | null
          route?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_transport_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_transport_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_transport_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_transport_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_transport_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_vouchers: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          issued_at: string
          organization_id: string
          pdf_url: string | null
          qr_payload: Json
          updated_at: string
          voucher_number: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          issued_at?: string
          organization_id: string
          pdf_url?: string | null
          qr_payload?: Json
          updated_at?: string
          voucher_number: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          organization_id?: string
          pdf_url?: string | null
          qr_payload?: Json
          updated_at?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_vouchers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_vouchers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_vouchers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_vouchers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_vouchers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_vouchers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_number: string
          booking_type: string
          cost_price: number | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          data_quality_status: string | null
          employee_id: string | null
          end_date: string | null
          id: string
          legacy_id: string | null
          legacy_table: string | null
          notes: string | null
          organization_id: string
          profit: number | null
          quote_id: string | null
          selling_price: number | null
          start_date: string | null
          status: string | null
          status_id: string | null
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string | null
          workflow_stage: Database["public"]["Enums"]["booking_workflow_stage"]
        }
        Insert: {
          booking_number: string
          booking_type: string
          cost_price?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          data_quality_status?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          legacy_id?: string | null
          legacy_table?: string | null
          notes?: string | null
          organization_id: string
          profit?: number | null
          quote_id?: string | null
          selling_price?: number | null
          start_date?: string | null
          status?: string | null
          status_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          workflow_stage?: Database["public"]["Enums"]["booking_workflow_stage"]
        }
        Update: {
          booking_number?: string
          booking_type?: string
          cost_price?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          data_quality_status?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          legacy_id?: string | null
          legacy_table?: string | null
          notes?: string | null
          organization_id?: string
          profit?: number | null
          quote_id?: string | null
          selling_price?: number | null
          start_date?: string | null
          status?: string | null
          status_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          workflow_stage?: Database["public"]["Enums"]["booking_workflow_stage"]
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
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          organization_id: string | null
          response: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          organization_id?: string | null
          response?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          organization_id?: string | null
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
          {
            foreignKeyName: "campaign_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      car_rentals: {
        Row: {
          additional_costs: number | null
          additional_driver_count: number | null
          additional_fees: number | null
          booking_agent_id: string | null
          booking_agent_name: string | null
          contract_sent: boolean | null
          contract_sent_date: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string
          daily_rate: number | null
          damage_notes: string | null
          deposit_paid: number | null
          deposit_returned: number | null
          driver_license_expiry: string | null
          driver_license_number: string | null
          employee_id: string | null
          exchange_rate_to_egp: number | null
          fuel_level_pickup: string | null
          fuel_level_return: string | null
          gps_included: boolean | null
          id: string
          insurance_cost: number | null
          insurance_included: boolean | null
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          organization_id: string | null
          paid_amount: number | null
          payment_due_date: string | null
          payment_method: string | null
          pickup_location: string | null
          pickup_notes: string | null
          quote_id: string | null
          remaining_amount: number | null
          rental_duration_days: number | null
          rental_end_date: string
          rental_reference: string
          rental_start_date: string
          return_location: string | null
          return_notes: string | null
          security_deposit: number | null
          special_requirements: string | null
          status_id: string | null
          supplier_cost_egp: number | null
          supplier_daily_cost: number | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          supplier_total_cost: number | null
          total_cost_egp: number | null
          total_profit: number | null
          total_rental_cost: number | null
          updated_at: string | null
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_plate_number: string | null
          vehicle_type_id: string | null
          vehicle_year: number | null
        }
        Insert: {
          additional_costs?: number | null
          additional_driver_count?: number | null
          additional_fees?: number | null
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          contract_sent?: boolean | null
          contract_sent_date?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          daily_rate?: number | null
          damage_notes?: string | null
          deposit_paid?: number | null
          deposit_returned?: number | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          employee_id?: string | null
          exchange_rate_to_egp?: number | null
          fuel_level_pickup?: string | null
          fuel_level_return?: string | null
          gps_included?: boolean | null
          id?: string
          insurance_cost?: number | null
          insurance_included?: boolean | null
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          pickup_notes?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          rental_duration_days?: number | null
          rental_end_date: string
          rental_reference?: string
          rental_start_date: string
          return_location?: string | null
          return_notes?: string | null
          security_deposit?: number | null
          special_requirements?: string | null
          status_id?: string | null
          supplier_cost_egp?: number | null
          supplier_daily_cost?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_total_cost?: number | null
          total_cost_egp?: number | null
          total_profit?: number | null
          total_rental_cost?: number | null
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate_number?: string | null
          vehicle_type_id?: string | null
          vehicle_year?: number | null
        }
        Update: {
          additional_costs?: number | null
          additional_driver_count?: number | null
          additional_fees?: number | null
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          contract_sent?: boolean | null
          contract_sent_date?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          daily_rate?: number | null
          damage_notes?: string | null
          deposit_paid?: number | null
          deposit_returned?: number | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          employee_id?: string | null
          exchange_rate_to_egp?: number | null
          fuel_level_pickup?: string | null
          fuel_level_return?: string | null
          gps_included?: boolean | null
          id?: string
          insurance_cost?: number | null
          insurance_included?: boolean | null
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          pickup_notes?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          rental_duration_days?: number | null
          rental_end_date?: string
          rental_reference?: string
          rental_start_date?: string
          return_location?: string | null
          return_notes?: string | null
          security_deposit?: number | null
          special_requirements?: string | null
          status_id?: string | null
          supplier_cost_egp?: number | null
          supplier_daily_cost?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_total_cost?: number | null
          total_cost_egp?: number | null
          total_profit?: number | null
          total_rental_cost?: number | null
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate_number?: string | null
          vehicle_type_id?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "car_rentals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_rentals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_rentals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_rentals_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_name_ar: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_name_ar?: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_name_ar?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          employee_id: string | null
          id: string
          notes: string | null
          organization_id: string | null
          payment_date: string | null
          payment_method: string | null
          payment_period_end: string | null
          payment_period_start: string | null
          reference_number: string | null
          total_commission_amount: number | null
          updated_at: string | null
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_period_end?: string | null
          payment_period_start?: string | null
          reference_number?: string | null
          total_commission_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_period_end?: string | null
          payment_period_start?: string | null
          reference_number?: string | null
          total_commission_amount?: number | null
          updated_at?: string | null
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
          {
            foreignKeyName: "commission_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blocks: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          layout_settings: Json | null
          order_index: number | null
          organization_id: string | null
          section: string | null
          style_settings: Json | null
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          layout_settings?: Json | null
          order_index?: number | null
          organization_id?: string | null
          section?: string | null
          style_settings?: Json | null
          title?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          layout_settings?: Json | null
          order_index?: number | null
          organization_id?: string | null
          section?: string | null
          style_settings?: Json | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_assignments_history: {
        Row: {
          action: string
          conversation_id: string
          created_at: string
          from_user_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
          performed_by: string | null
          reason: string | null
          to_user_id: string | null
        }
        Insert: {
          action: string
          conversation_id: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          performed_by?: string | null
          reason?: string | null
          to_user_id?: string | null
        }
        Update: {
          action?: string
          conversation_id?: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          performed_by?: string | null
          reason?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_assignments_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_internal_notes: {
        Row: {
          author_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          mentions: string[] | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_internal_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tag_assignments: {
        Row: {
          assigned_by: string | null
          conversation_id: string
          created_at: string
          id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          assigned_by?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          organization_id: string
          tag_id: string
        }
        Update: {
          assigned_by?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tag_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "conversation_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          manager_employee_id: string | null
          name: string
          name_ar: string | null
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_employee_id?: string | null
          name: string
          name_ar?: string | null
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_employee_id?: string | null
          name?: string
          name_ar?: string | null
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
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
          created_at: string | null
          customer_id: string | null
          direction: string
          duration_minutes: number | null
          follow_up_id: string | null
          handled_by: string | null
          id: string
          organization_id: string | null
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          communication_type: string
          completed_at?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction: string
          duration_minutes?: number | null
          follow_up_id?: string | null
          handled_by?: string | null
          id?: string
          organization_id?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          communication_type?: string
          completed_at?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction?: string
          duration_minutes?: number | null
          follow_up_id?: string | null
          handled_by?: string | null
          id?: string
          organization_id?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
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
            foreignKeyName: "customer_communications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_follow_ups: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          customer_value: string | null
          follow_up_type: string
          id: string
          last_contact_date: string | null
          notes: string | null
          organization_id: string | null
          priority: string | null
          scheduled_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_value?: string | null
          follow_up_type: string
          id?: string
          last_contact_date?: string | null
          notes?: string | null
          organization_id?: string | null
          priority?: string | null
          scheduled_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_value?: string | null
          follow_up_type?: string
          id?: string
          last_contact_date?: string | null
          notes?: string | null
          organization_id?: string | null
          priority?: string | null
          scheduled_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_follow_up_assigned"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          is_private: boolean | null
          note_type: string | null
          organization_id: string | null
          priority: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_private?: boolean | null
          note_type?: string | null
          organization_id?: string | null
          priority?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_private?: boolean | null
          note_type?: string | null
          organization_id?: string | null
          priority?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_satisfaction: {
        Row: {
          booking_id: string | null
          communication_rating: number | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          feedback: string | null
          id: string
          organization_id: string | null
          overall_rating: number | null
          service_rating: number | null
          survey_sent_at: string | null
        }
        Insert: {
          booking_id?: string | null
          communication_rating?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          feedback?: string | null
          id?: string
          organization_id?: string | null
          overall_rating?: number | null
          service_rating?: number | null
          survey_sent_at?: string | null
        }
        Update: {
          booking_id?: string | null
          communication_rating?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          feedback?: string | null
          id?: string
          organization_id?: string | null
          overall_rating?: number | null
          service_rating?: number | null
          survey_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_satisfaction_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_satisfaction_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          minimum_bookings: number | null
          minimum_total_spent: number | null
          name: string
          name_ar: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_bookings?: number | null
          minimum_total_spent?: number | null
          name: string
          name_ar: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_bookings?: number | null
          minimum_total_spent?: number | null
          name?: string
          name_ar?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          communication_preferences: Json | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          last_booking_date: string | null
          last_follow_up_by: string | null
          last_follow_up_date: string | null
          loyalty_points: number | null
          name: string
          nationality: string | null
          organization_id: string | null
          passport_number: string | null
          phone: string | null
          preferences: Json | null
          segment_id: string | null
          total_bookings: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          communication_preferences?: Json | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          last_booking_date?: string | null
          last_follow_up_by?: string | null
          last_follow_up_date?: string | null
          loyalty_points?: number | null
          name: string
          nationality?: string | null
          organization_id?: string | null
          passport_number?: string | null
          phone?: string | null
          preferences?: Json | null
          segment_id?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          communication_preferences?: Json | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          last_booking_date?: string | null
          last_follow_up_by?: string | null
          last_follow_up_date?: string | null
          loyalty_points?: number | null
          name?: string
          nationality?: string | null
          organization_id?: string | null
          passport_number?: string | null
          phone?: string | null
          preferences?: Json | null
          segment_id?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string | null
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
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          name_ar: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destinations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          accent_color: string | null
          bank_details: string | null
          created_at: string | null
          document_type: string
          footer_text: string | null
          header_color: string | null
          id: string
          is_default: boolean | null
          notes_text: string | null
          organization_id: string
          show_bank_details: boolean | null
          show_logo: boolean | null
          template_name: string
          terms_text: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          bank_details?: string | null
          created_at?: string | null
          document_type: string
          footer_text?: string | null
          header_color?: string | null
          id?: string
          is_default?: boolean | null
          notes_text?: string | null
          organization_id: string
          show_bank_details?: boolean | null
          show_logo?: boolean | null
          template_name?: string
          terms_text?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          bank_details?: string | null
          created_at?: string | null
          document_type?: string
          footer_text?: string | null
          header_color?: string | null
          id?: string
          is_default?: boolean | null
          notes_text?: string | null
          organization_id?: string
          show_bank_details?: boolean | null
          show_logo?: boolean | null
          template_name?: string
          terms_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          max_attempts: number
          organization_id: string | null
          recipient_email: string
          recipient_name: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          organization_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_data?: Json
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          organization_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_commission_periods: {
        Row: {
          bank_account_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          employee_id: string | null
          id: string
          notes: string | null
          organization_id: string | null
          payment_date: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          status: string | null
          total_booking_amount: number | null
          total_bookings_count: number | null
          total_profit: number | null
          total_supplier_cost: number | null
          updated_at: string | null
        }
        Insert: {
          bank_account_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          status?: string | null
          total_booking_amount?: number | null
          total_bookings_count?: number | null
          total_profit?: number | null
          total_supplier_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          total_booking_amount?: number | null
          total_bookings_count?: number | null
          total_profit?: number | null
          total_supplier_cost?: number | null
          updated_at?: string | null
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
          {
            foreignKeyName: "employee_commission_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_commissions: {
        Row: {
          booking_amount: number | null
          booking_id: string | null
          booking_type: string | null
          commission_amount: number | null
          commission_date: string | null
          commission_rate: number | null
          created_at: string | null
          currency: string | null
          employee_id: string | null
          id: string
          notes: string | null
          organization_id: string | null
          payment_date: string | null
          payment_status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_amount?: number | null
          booking_id?: string | null
          booking_type?: string | null
          commission_amount?: number | null
          commission_date?: string | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string | null
          payment_status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_amount?: number | null
          booking_id?: string | null
          booking_type?: string | null
          commission_amount?: number | null
          commission_date?: string | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string | null
          payment_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          allowances: number | null
          bank_account_number: string | null
          bank_name: string | null
          base_salary: number | null
          commission_rate: number | null
          commission_type: string | null
          created_at: string | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_code: string
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          national_id: string | null
          organization_id: string | null
          phone: string | null
          position: string | null
          salary_scale_level: number | null
          total_commission_earned: number | null
          updated_at: string | null
        }
        Insert: {
          allowances?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary?: number | null
          commission_rate?: number | null
          commission_type?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code: string
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          national_id?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          salary_scale_level?: number | null
          total_commission_earned?: number | null
          updated_at?: string | null
        }
        Update: {
          allowances?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary?: number | null
          commission_rate?: number | null
          commission_type?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_code?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          national_id?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          salary_scale_level?: number | null
          total_commission_earned?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component_name: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_date: string | null
          from_currency: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          rate: number
          to_currency: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          from_currency: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          rate: number
          to_currency: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          from_currency?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          rate?: number
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          budget_limit: number | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          budget_limit?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_limit?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string | null
          booking_id: string | null
          booking_type: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string
          id: string
          invoice_number: string | null
          notes: string | null
          organization_id: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string | null
          transaction_date: string | null
          transaction_number: string
          updated_at: string | null
          vendor_name: string | null
          vendor_phone: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          booking_id?: string | null
          booking_type?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          transaction_date?: string | null
          transaction_number?: string
          updated_at?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          booking_id?: string | null
          booking_type?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          transaction_date?: string | null
          transaction_number?: string
          updated_at?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Relationships: [
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
            foreignKeyName: "expense_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_bookings: {
        Row: {
          additional_costs: number | null
          airline_id: string | null
          arrival_airport_id: string | null
          arrival_date: string
          arrival_time: string | null
          baggage_info: Json | null
          booking_agent_id: string | null
          booking_agent_name: string | null
          booking_date: string | null
          booking_reference: string
          confirmation_number: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string
          departure_airport_id: string | null
          departure_date: string
          departure_time: string | null
          employee_id: string | null
          exchange_rate_to_egp: number | null
          flight_class_id: string | null
          flight_number: string | null
          id: string
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          is_round_trip: boolean | null
          meal_preferences: string | null
          number_of_passengers: number | null
          organization_id: string | null
          paid_amount: number | null
          passenger_details: Json | null
          payment_due_date: string | null
          payment_method: string | null
          quote_id: string | null
          remaining_amount: number | null
          return_flight_id: string | null
          seat_preferences: string | null
          special_requests: string | null
          status_id: string | null
          supplier_cost: number | null
          supplier_cost_egp: number | null
          supplier_name: string | null
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          supplier_reference: string | null
          taxes_and_fees: number | null
          ticket_numbers: Json | null
          ticket_price_per_person: number | null
          total_cost: number | null
          total_cost_egp: number | null
          total_profit: number | null
          updated_at: string | null
          voucher_sent: boolean | null
          voucher_sent_date: string | null
        }
        Insert: {
          additional_costs?: number | null
          airline_id?: string | null
          arrival_airport_id?: string | null
          arrival_date: string
          arrival_time?: string | null
          baggage_info?: Json | null
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          booking_date?: string | null
          booking_reference?: string
          confirmation_number?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          departure_airport_id?: string | null
          departure_date: string
          departure_time?: string | null
          employee_id?: string | null
          exchange_rate_to_egp?: number | null
          flight_class_id?: string | null
          flight_number?: string | null
          id?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          is_round_trip?: boolean | null
          meal_preferences?: string | null
          number_of_passengers?: number | null
          organization_id?: string | null
          paid_amount?: number | null
          passenger_details?: Json | null
          payment_due_date?: string | null
          payment_method?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          return_flight_id?: string | null
          seat_preferences?: string | null
          special_requests?: string | null
          status_id?: string | null
          supplier_cost?: number | null
          supplier_cost_egp?: number | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_reference?: string | null
          taxes_and_fees?: number | null
          ticket_numbers?: Json | null
          ticket_price_per_person?: number | null
          total_cost?: number | null
          total_cost_egp?: number | null
          total_profit?: number | null
          updated_at?: string | null
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Update: {
          additional_costs?: number | null
          airline_id?: string | null
          arrival_airport_id?: string | null
          arrival_date?: string
          arrival_time?: string | null
          baggage_info?: Json | null
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          booking_date?: string | null
          booking_reference?: string
          confirmation_number?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          departure_airport_id?: string | null
          departure_date?: string
          departure_time?: string | null
          employee_id?: string | null
          exchange_rate_to_egp?: number | null
          flight_class_id?: string | null
          flight_number?: string | null
          id?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          is_round_trip?: boolean | null
          meal_preferences?: string | null
          number_of_passengers?: number | null
          organization_id?: string | null
          paid_amount?: number | null
          passenger_details?: Json | null
          payment_due_date?: string | null
          payment_method?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          return_flight_id?: string | null
          seat_preferences?: string | null
          special_requests?: string | null
          status_id?: string | null
          supplier_cost?: number | null
          supplier_cost_egp?: number | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          supplier_reference?: string | null
          taxes_and_fees?: number | null
          ticket_numbers?: Json | null
          ticket_price_per_person?: number | null
          total_cost?: number | null
          total_cost_egp?: number | null
          total_profit?: number | null
          updated_at?: string | null
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
            foreignKeyName: "flight_bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
            foreignKeyName: "flight_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
          code: string | null
          created_at: string | null
          id: string
          name: string
          name_ar: string | null
          organization_id: string | null
        }
        Insert: {
          baggage_allowance?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          name_ar?: string | null
          organization_id?: string | null
        }
        Update: {
          baggage_allowance?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string | null
          field_label: string
          field_name: string
          field_type: string | null
          form_id: string | null
          id: string
          is_required: boolean | null
          options: Json | null
          organization_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          field_label: string
          field_name: string
          field_type?: string | null
          form_id?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          organization_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          field_label?: string
          field_name?: string
          field_type?: string | null
          form_id?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          organization_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string | null
          data: Json
          form_id: string | null
          id: string
          organization_id: string | null
          submitted_by: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json
          form_id?: string | null
          id?: string
          organization_id?: string | null
          submitted_by?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          form_id?: string | null
          id?: string
          organization_id?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string | null
          description: string | null
          failure_message: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          success_message: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          failure_message?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          success_message?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          failure_message?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          success_message?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          booking_id: string | null
          booking_type: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          document_number: string
          document_type: string
          file_path: string | null
          file_url: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          organization_id: string
          sent_via_email: boolean | null
          sent_via_whatsapp: boolean | null
          title: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          booking_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          document_number: string
          document_type: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          organization_id: string
          sent_via_email?: boolean | null
          sent_via_whatsapp?: boolean | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          booking_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          document_number?: string
          document_type?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          organization_id?: string
          sent_via_email?: boolean | null
          sent_via_whatsapp?: boolean | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_bookings: {
        Row: {
          additional_costs: number | null
          additional_costs_breakdown: Json | null
          attachment_urls: string[] | null
          booking_agent_id: string | null
          booking_agent_name: string | null
          booking_date: string | null
          booking_reference_supplier: string | null
          booking_source: string | null
          cancellation_policy: string | null
          check_in_date: string
          check_out_date: string
          children_ages: string | null
          commission_amount: number
          cost_per_night: number | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string
          destination_city: string | null
          employee_id: string | null
          hotel_id: string | null
          hotel_name: string | null
          hotel_star_rating: number | null
          id: string
          internal_booking_number: string
          internal_notes: string | null
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          meal_plan: string | null
          number_of_adults: number | null
          number_of_children: number | null
          number_of_nights: number | null
          number_of_rooms: number
          organization_id: string | null
          paid_amount: number | null
          payment_due_date: string | null
          payment_method: string | null
          quote_id: string | null
          remaining_amount: number | null
          room_type: string | null
          room_view: string | null
          selling_price_per_night: number | null
          status_id: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          total_cost_customer: number | null
          total_profit: number | null
          updated_at: string | null
          vat_amount: number
          vat_included: boolean
          voucher_sent: boolean | null
          voucher_sent_date: string | null
        }
        Insert: {
          additional_costs?: number | null
          additional_costs_breakdown?: Json | null
          attachment_urls?: string[] | null
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          booking_date?: string | null
          booking_reference_supplier?: string | null
          booking_source?: string | null
          cancellation_policy?: string | null
          check_in_date: string
          check_out_date: string
          children_ages?: string | null
          commission_amount?: number
          cost_per_night?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          destination_city?: string | null
          employee_id?: string | null
          hotel_id?: string | null
          hotel_name?: string | null
          hotel_star_rating?: number | null
          id?: string
          internal_booking_number?: string
          internal_notes?: string | null
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          meal_plan?: string | null
          number_of_adults?: number | null
          number_of_children?: number | null
          number_of_nights?: number | null
          number_of_rooms?: number
          organization_id?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          room_type?: string | null
          room_view?: string | null
          selling_price_per_night?: number | null
          status_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost_customer?: number | null
          total_profit?: number | null
          updated_at?: string | null
          vat_amount?: number
          vat_included?: boolean
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Update: {
          additional_costs?: number | null
          additional_costs_breakdown?: Json | null
          attachment_urls?: string[] | null
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          booking_date?: string | null
          booking_reference_supplier?: string | null
          booking_source?: string | null
          cancellation_policy?: string | null
          check_in_date?: string
          check_out_date?: string
          children_ages?: string | null
          commission_amount?: number
          cost_per_night?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          destination_city?: string | null
          employee_id?: string | null
          hotel_id?: string | null
          hotel_name?: string | null
          hotel_star_rating?: number | null
          id?: string
          internal_booking_number?: string
          internal_notes?: string | null
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          meal_plan?: string | null
          number_of_adults?: number | null
          number_of_children?: number | null
          number_of_nights?: number | null
          number_of_rooms?: number
          organization_id?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          room_type?: string | null
          room_view?: string | null
          selling_price_per_night?: number | null
          status_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost_customer?: number | null
          total_profit?: number | null
          updated_at?: string | null
          vat_amount?: number
          vat_included?: boolean
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
            foreignKeyName: "hotel_bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
          created_at: string | null
          email: string | null
          id: string
          is_direct_hotel: boolean | null
          name: string
          organization_id: string | null
          payment_terms: string | null
          phone: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_direct_hotel?: boolean | null
          name: string
          organization_id?: string | null
          payment_terms?: string | null
          phone?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_direct_hotel?: boolean | null
          name?: string
          organization_id?: string | null
          payment_terms?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          amenities: Json | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          description: string | null
          destination_id: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_global: boolean
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string | null
          phone: string | null
          star_rating: number | null
          tbo_hotel_code: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_global?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id?: string | null
          phone?: string | null
          star_rating?: number | null
          tbo_hotel_code?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_global?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          star_rating?: number | null
          tbo_hotel_code?: string | null
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
          {
            foreignKeyName: "hotels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
          organization_id: string | null
          quantity: number | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          organization_id?: string | null
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          organization_id?: string | null
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
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
            foreignKeyName: "invoice_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          booking_id: string | null
          booking_type: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          discount_amount: number | null
          due_date: string | null
          final_amount: number | null
          id: string
          invoice_number: string
          issued_date: string | null
          notes: string | null
          organization_id: string | null
          payment_status: string | null
          payment_terms: string | null
          quote_id: string | null
          remaining_amount: number | null
          status: string | null
          subtotal: number | null
          total_paid_amount: number | null
          updated_at: string | null
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          booking_id?: string | null
          booking_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          due_date?: string | null
          final_amount?: number | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          organization_id?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          total_paid_amount?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          booking_id?: string | null
          booking_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          due_date?: string | null
          final_amount?: number | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          organization_id?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number | null
          total_paid_amount?: number | null
          updated_at?: string | null
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
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          auto_generated: boolean
          booking_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          entry_date: string
          entry_number: string
          functional_currency: string | null
          fx_rate: number | null
          id: string
          is_locked: boolean
          organization_id: string
          posted_at: string | null
          reference_id: string | null
          reference_type: string | null
          source_id: string | null
          source_type: string | null
          status: string
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          auto_generated?: boolean
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          entry_date?: string
          entry_number: string
          functional_currency?: string | null
          fx_rate?: number | null
          id?: string
          is_locked?: boolean
          organization_id: string
          posted_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          auto_generated?: boolean
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          entry_date?: string
          entry_number?: string
          functional_currency?: string | null
          fx_rate?: number | null
          id?: string
          is_locked?: boolean
          organization_id?: string
          posted_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          cost_center_id: string | null
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
          line_order: number
        }
        Insert: {
          account_id: string
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          line_order?: number
        }
        Update: {
          account_id?: string
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          line_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          booking_id: string | null
          created_at: string | null
          current_balance: number | null
          customer_id: string | null
          description: string | null
          id: string
          organization_id: string | null
          points_earned: number | null
          points_used: number | null
          transaction_type: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          customer_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          points_earned?: number | null
          points_used?: number | null
          transaction_type?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          customer_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          points_earned?: number | null
          points_used?: number | null
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          organization_id: string | null
          points_required: number | null
          reward_type: string | null
          reward_value: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          organization_id?: string | null
          points_required?: number | null
          reward_type?: string | null
          reward_value?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          organization_id?: string | null
          points_required?: number | null
          reward_type?: string | null
          reward_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          campaign_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          message_template: string | null
          name: string
          organization_id: string | null
          start_date: string | null
          status: string | null
          target_segment_id: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          message_template?: string | null
          name: string
          organization_id?: string | null
          start_date?: string | null
          status?: string | null
          target_segment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          message_template?: string | null
          name?: string
          organization_id?: string | null
          start_date?: string | null
          status?: string | null
          target_segment_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          original_name: string | null
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          original_name?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          original_name?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: []
      }
      messaging_suggestions: {
        Row: {
          booking_id: string
          channel: string
          created_at: string
          id: string
          organization_id: string
          status: string
          template_key: string
          template_variables: Json
          updated_at: string
        }
        Insert: {
          booking_id: string
          channel: string
          created_at?: string
          id?: string
          organization_id: string
          status?: string
          template_key: string
          template_variables?: Json
          updated_at?: string
        }
        Update: {
          booking_id?: string
          channel?: string
          created_at?: string
          id?: string
          organization_id?: string
          status?: string
          template_key?: string
          template_variables?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_salaries: {
        Row: {
          absence_days: number | null
          allowances: number | null
          attendance_days: number | null
          bank_account_id: string | null
          base_salary: number | null
          bonus: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deductions: number | null
          employee_id: string | null
          exchange_rate: number | null
          gross_salary: number | null
          id: string
          insurance_deduction: number | null
          late_hours: number | null
          net_salary: number | null
          net_salary_egp: number | null
          notes: string | null
          organization_id: string
          overtime_amount: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          payment_date: string | null
          payment_method: string | null
          salary_month: string
          status: string | null
          tax_amount: number | null
          updated_at: string | null
        }
        Insert: {
          absence_days?: number | null
          allowances?: number | null
          attendance_days?: number | null
          bank_account_id?: string | null
          base_salary?: number | null
          bonus?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deductions?: number | null
          employee_id?: string | null
          exchange_rate?: number | null
          gross_salary?: number | null
          id?: string
          insurance_deduction?: number | null
          late_hours?: number | null
          net_salary?: number | null
          net_salary_egp?: number | null
          notes?: string | null
          organization_id: string
          overtime_amount?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          payment_date?: string | null
          payment_method?: string | null
          salary_month: string
          status?: string | null
          tax_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          absence_days?: number | null
          allowances?: number | null
          attendance_days?: number | null
          bank_account_id?: string | null
          base_salary?: number | null
          bonus?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deductions?: number | null
          employee_id?: string | null
          exchange_rate?: number | null
          gross_salary?: number | null
          id?: string
          insurance_deduction?: number | null
          late_hours?: number | null
          net_salary?: number | null
          net_salary_egp?: number | null
          notes?: string | null
          organization_id?: string
          overtime_amount?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          payment_date?: string | null
          payment_method?: string | null
          salary_month?: string
          status?: string | null
          tax_amount?: number | null
          updated_at?: string | null
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
            foreignKeyName: "monthly_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_salaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          organization_id: string | null
          priority: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          organization_id?: string | null
          priority?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          organization_id?: string | null
          priority?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          accent_color: string | null
          address: string | null
          commercial_register: string | null
          company_name: string | null
          company_name_ar: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          organization_id: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          tax_number: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          commercial_register?: string | null
          company_name?: string | null
          company_name_ar?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          organization_id: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tax_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          commercial_register?: string | null
          company_name?: string | null
          company_name_ar?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tax_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          commercial_registration: string | null
          created_at: string
          email: string | null
          has_demo_data: boolean
          id: string
          is_active: boolean
          logo_url: string | null
          max_users: number
          name: string
          onboarding_completed: boolean
          phone: string | null
          plan: string
          plan_expires_at: string | null
          slug: string
          tax_number: string | null
          updated_at: string
          zatca_enabled: boolean
        }
        Insert: {
          address?: string | null
          commercial_registration?: string | null
          created_at?: string
          email?: string | null
          has_demo_data?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_users?: number
          name: string
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          slug: string
          tax_number?: string | null
          updated_at?: string
          zatca_enabled?: boolean
        }
        Update: {
          address?: string | null
          commercial_registration?: string | null
          created_at?: string
          email?: string | null
          has_demo_data?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_users?: number
          name?: string
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          slug?: string
          tax_number?: string | null
          updated_at?: string
          zatca_enabled?: boolean
        }
        Relationships: []
      }
      pages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          organization_id: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          organization_id?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          organization_id?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          billing_email: string | null
          billing_name: string | null
          billing_phone: string | null
          card_brand: string | null
          card_last_four: string | null
          created_at: string
          currency: string | null
          error_message: string | null
          hmac_valid: boolean | null
          id: string
          organization_id: string | null
          payment_method: string | null
          paymob_order_id: string | null
          paymob_transaction_id: string | null
          processed_at: string | null
          raw_payload: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          hmac_valid?: boolean | null
          id?: string
          organization_id?: string | null
          payment_method?: string | null
          paymob_order_id?: string | null
          paymob_transaction_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          hmac_valid?: boolean | null
          id?: string
          organization_id?: string | null
          payment_method?: string | null
          paymob_order_id?: string | null
          paymob_transaction_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_logs: {
        Row: {
          cls: number | null
          connection_type: string | null
          created_at: string
          fcp_ms: number | null
          fid_ms: number | null
          id: string
          lcp_ms: number | null
          load_time_ms: number | null
          metadata: Json | null
          organization_id: string | null
          page_url: string
          ttfb_ms: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          cls?: number | null
          connection_type?: string | null
          created_at?: string
          fcp_ms?: number | null
          fid_ms?: number | null
          id?: string
          lcp_ms?: number | null
          load_time_ms?: number | null
          metadata?: Json | null
          organization_id?: string | null
          page_url: string
          ttfb_ms?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          cls?: number | null
          connection_type?: string | null
          created_at?: string
          fcp_ms?: number | null
          fid_ms?: number | null
          id?: string
          lcp_ms?: number | null
          load_time_ms?: number | null
          metadata?: Json | null
          organization_id?: string | null
          page_url?: string
          ttfb_ms?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          employee_id: string | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          linked_employee_id: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string
          hire_date?: string | null
          id: string
          is_active?: boolean
          linked_employee_id?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          linked_employee_id?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_linked_employee_id_fkey"
            columns: ["linked_employee_id"]
            isOneToOne: false
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          cost_price: number | null
          created_at: string | null
          description: string
          details: Json | null
          id: string
          item_type: string
          organization_id: string | null
          quantity: number | null
          quote_id: string
          selling_price: number | null
          sort_order: number | null
          supplier_id: string | null
          total_cost: number | null
          total_selling: number | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          description: string
          details?: Json | null
          id?: string
          item_type: string
          organization_id?: string | null
          quantity?: number | null
          quote_id: string
          selling_price?: number | null
          sort_order?: number | null
          supplier_id?: string | null
          total_cost?: number | null
          total_selling?: number | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          description?: string
          details?: Json | null
          id?: string
          item_type?: string
          organization_id?: string | null
          quantity?: number | null
          quote_id?: string
          selling_price?: number | null
          sort_order?: number | null
          supplier_id?: string | null
          total_cost?: number | null
          total_selling?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          assigned_employee_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          destination: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          number_of_travelers: number | null
          organization_id: string | null
          quote_number: string
          return_date: string | null
          status: string | null
          subtotal: number | null
          total_amount: number | null
          total_cost: number | null
          total_profit: number | null
          travel_date: string | null
          updated_at: string | null
          valid_until: string | null
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          assigned_employee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          destination?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          number_of_travelers?: number | null
          organization_id?: string | null
          quote_number: string
          return_date?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          total_cost?: number | null
          total_profit?: number | null
          travel_date?: string | null
          updated_at?: string | null
          valid_until?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          assigned_employee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          destination?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          number_of_travelers?: number | null
          organization_id?: string | null
          quote_number?: string
          return_date?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          total_cost?: number | null
          total_profit?: number | null
          travel_date?: string | null
          updated_at?: string | null
          valid_until?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_contracts: {
        Row: {
          annual_increase_percentage: number | null
          bank_account_id: string | null
          commission_rate: number | null
          contract_duration_months: number | null
          contract_end_date: string
          contract_notes: string | null
          contract_number: string | null
          contract_start_date: string
          contract_terms: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          landlord_name: string
          landlord_phone: string | null
          maintenance_responsibility: string | null
          monthly_rent: number
          organization_id: string
          payment_day_of_month: number | null
          payment_method: string | null
          property_address: string | null
          property_name: string | null
          property_type: string | null
          renewal_period_months: number | null
          security_deposit: number | null
          start_date: string | null
          updated_at: string | null
          utilities_included: boolean | null
        }
        Insert: {
          annual_increase_percentage?: number | null
          bank_account_id?: string | null
          commission_rate?: number | null
          contract_duration_months?: number | null
          contract_end_date: string
          contract_notes?: string | null
          contract_number?: string | null
          contract_start_date: string
          contract_terms?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          landlord_name: string
          landlord_phone?: string | null
          maintenance_responsibility?: string | null
          monthly_rent: number
          organization_id: string
          payment_day_of_month?: number | null
          payment_method?: string | null
          property_address?: string | null
          property_name?: string | null
          property_type?: string | null
          renewal_period_months?: number | null
          security_deposit?: number | null
          start_date?: string | null
          updated_at?: string | null
          utilities_included?: boolean | null
        }
        Update: {
          annual_increase_percentage?: number | null
          bank_account_id?: string | null
          commission_rate?: number | null
          contract_duration_months?: number | null
          contract_end_date?: string
          contract_notes?: string | null
          contract_number?: string | null
          contract_start_date?: string
          contract_terms?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          landlord_name?: string
          landlord_phone?: string | null
          maintenance_responsibility?: string | null
          monthly_rent?: number
          organization_id?: string
          payment_day_of_month?: number | null
          payment_method?: string | null
          property_address?: string | null
          property_name?: string | null
          property_type?: string | null
          renewal_period_months?: number | null
          security_deposit?: number | null
          start_date?: string | null
          updated_at?: string | null
          utilities_included?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_contracts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount: number
          amount_egp: number | null
          bank_account_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          due_date: string
          exchange_rate: number | null
          id: string
          late_fee: number | null
          notes: string | null
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          payment_month: string | null
          reference_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_egp?: number | null
          bank_account_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          due_date: string
          exchange_rate?: number | null
          id?: string
          late_fee?: number | null
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          payment_month?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_egp?: number | null
          bank_account_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          due_date?: string
          exchange_rate?: number | null
          id?: string
          late_fee?: number | null
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_month?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
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
            foreignKeyName: "rent_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          name: string
          organization_id: string | null
          phone: string
          preferred_contact: string | null
          service_type: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          name: string
          organization_id?: string | null
          phone: string
          preferred_contact?: string | null
          service_type?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          organization_id?: string | null
          phone?: string
          preferred_contact?: string | null
          service_type?: string | null
          status?: string | null
        }
        Relationships: []
      }
      special_request_types: {
        Row: {
          category: string | null
          created_at: string | null
          extra_cost_amount: number | null
          has_extra_cost: boolean | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          extra_cost_amount?: number | null
          has_extra_cost?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          extra_cost_amount?: number | null
          has_extra_cost?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          duration_days: number | null
          features: Json
          id: string
          is_active: boolean
          max_bookings_per_month: number
          max_storage_mb: number
          max_users: number
          name: string
          name_ar: string
          price_monthly: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          max_bookings_per_month?: number
          max_storage_mb?: number
          max_users?: number
          name: string
          name_ar: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          max_bookings_per_month?: number
          max_storage_mb?: number
          max_users?: number
          name?: string
          name_ar?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          activated_by: string | null
          created_at: string
          expires_at: string | null
          grace_period_days: number | null
          id: string
          notes: string | null
          organization_id: string
          payment_method: string | null
          payment_reference: string | null
          paymob_transaction_id: string | null
          plan_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_by?: string | null
          created_at?: string
          expires_at?: string | null
          grace_period_days?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          payment_reference?: string | null
          paymob_transaction_id?: string | null
          plan_id: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_by?: string | null
          created_at?: string
          expires_at?: string | null
          grace_period_days?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          paymob_transaction_id?: string | null
          plan_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_allotments: {
        Row: {
          allotment_name: string
          contract_id: string | null
          cost_per_unit: number | null
          created_at: string
          created_by: string | null
          currency: string
          end_date: string
          id: string
          notes: string | null
          organization_id: string
          release_days: number | null
          service_reference: string | null
          service_type: string
          start_date: string
          status: string
          supplier_id: string
          total_quantity: number
          updated_at: string
          used_quantity: number
        }
        Insert: {
          allotment_name: string
          contract_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date: string
          id?: string
          notes?: string | null
          organization_id: string
          release_days?: number | null
          service_reference?: string | null
          service_type: string
          start_date: string
          status?: string
          supplier_id: string
          total_quantity?: number
          updated_at?: string
          used_quantity?: number
        }
        Update: {
          allotment_name?: string
          contract_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          release_days?: number | null
          service_reference?: string | null
          service_type?: string
          start_date?: string
          status?: string
          supplier_id?: string
          total_quantity?: number
          updated_at?: string
          used_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_allotments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_allotments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contracts: {
        Row: {
          contract_number: string
          contract_type: string | null
          contract_value: number | null
          created_at: string | null
          currency: string | null
          end_date: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          payment_terms: string | null
          start_date: string
          supplier_id: string | null
          terms_and_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          contract_number: string
          contract_type?: string | null
          contract_value?: number | null
          created_at?: string | null
          currency?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          payment_terms?: string | null
          start_date: string
          supplier_id?: string | null
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          contract_number?: string
          contract_type?: string | null
          contract_value?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          payment_terms?: string | null
          start_date?: string
          supplier_id?: string | null
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
          created_at: string | null
          currency: string
          exchange_rate: number | null
          id: string
          is_primary: boolean | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          exchange_rate?: number | null
          id?: string
          is_primary?: boolean | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          exchange_rate?: number | null
          id?: string
          is_primary?: boolean | null
          supplier_id?: string | null
          updated_at?: string | null
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
      supplier_payment_orders: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          reference_number: string
          service_type: string
          source_id: string | null
          source_type: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          reference_number: string
          service_type: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          reference_number?: string
          service_type?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payment_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_orders_supplier_id_fkey"
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
          booking_id: string | null
          booking_type: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          exchange_rate: number | null
          id: string
          notes: string | null
          organization_id: string | null
          paid_date: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          reference_number: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_in_egp?: number | null
          booking_id?: string | null
          booking_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          reference_number?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_in_egp?: number | null
          booking_id?: string | null
          booking_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          reference_number?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_rates: {
        Row: {
          cancellation_policy: string | null
          contract_id: string | null
          cost_price: number
          created_at: string
          created_by: string | null
          currency: string
          end_date: string
          id: string
          is_active: boolean | null
          is_refundable: boolean | null
          markup_percentage: number | null
          max_nights: number | null
          min_nights: number | null
          notes: string | null
          organization_id: string
          season_name: string | null
          selling_price: number
          service_reference: string | null
          service_type: string
          start_date: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          cancellation_policy?: string | null
          contract_id?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date: string
          id?: string
          is_active?: boolean | null
          is_refundable?: boolean | null
          markup_percentage?: number | null
          max_nights?: number | null
          min_nights?: number | null
          notes?: string | null
          organization_id: string
          season_name?: string | null
          selling_price?: number
          service_reference?: string | null
          service_type: string
          start_date: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          cancellation_policy?: string | null
          contract_id?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_refundable?: boolean | null
          markup_percentage?: number | null
          max_nights?: number | null
          min_nights?: number | null
          notes?: string | null
          organization_id?: string
          season_name?: string | null
          selling_price?: number
          service_reference?: string | null
          service_type?: string
          start_date?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_rates_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_rates_supplier_id_fkey"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          overall_rating?: number | null
          price_competitiveness?: number | null
          rated_by?: string | null
          rating_date?: string | null
          service_quality?: number | null
          supplier_id?: string
        }
        Relationships: [
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
          created_at: string | null
          credit_limit: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          organization_id: string | null
          payment_method_options: Json | null
          payment_terms: string | null
          payment_type: string | null
          phone: string | null
          rating: number | null
          supplier_type: string | null
          tax_number: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          organization_id?: string | null
          payment_method_options?: Json | null
          payment_terms?: string | null
          payment_type?: string | null
          phone?: string | null
          rating?: number | null
          supplier_type?: string | null
          tax_number?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          payment_method_options?: Json | null
          payment_terms?: string | null
          payment_type?: string | null
          phone?: string | null
          rating?: number | null
          supplier_type?: string | null
          tax_number?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_type: string | null
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transport_bookings: {
        Row: {
          additional_costs: number | null
          arrival_date: string | null
          arrival_time: string | null
          booking_agent_id: string | null
          booking_agent_name: string | null
          booking_reference: string
          cost_per_trip: number | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string
          departure_date: string
          departure_time: string | null
          driver_name: string | null
          driver_phone: string | null
          dropoff_location: string | null
          employee_id: string | null
          exchange_rate_to_egp: number | null
          id: string
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          number_of_passengers: number | null
          organization_id: string | null
          paid_amount: number | null
          payment_due_date: string | null
          payment_method: string | null
          pickup_location: string | null
          quote_id: string | null
          remaining_amount: number | null
          route_id: string | null
          selling_price_per_trip: number | null
          special_requests: string | null
          status_id: string | null
          supplier_cost: number | null
          supplier_cost_egp: number | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          total_cost: number | null
          total_cost_egp: number | null
          total_profit: number | null
          updated_at: string | null
          vehicle_plate_number: string | null
          vehicle_type_id: string | null
          voucher_sent: boolean | null
          voucher_sent_date: string | null
        }
        Insert: {
          additional_costs?: number | null
          arrival_date?: string | null
          arrival_time?: string | null
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          booking_reference?: string
          cost_per_trip?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          departure_date: string
          departure_time?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location?: string | null
          employee_id?: string | null
          exchange_rate_to_egp?: number | null
          id?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          number_of_passengers?: number | null
          organization_id?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          route_id?: string | null
          selling_price_per_trip?: number | null
          special_requests?: string | null
          status_id?: string | null
          supplier_cost?: number | null
          supplier_cost_egp?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost?: number | null
          total_cost_egp?: number | null
          total_profit?: number | null
          updated_at?: string | null
          vehicle_plate_number?: string | null
          vehicle_type_id?: string | null
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Update: {
          additional_costs?: number | null
          arrival_date?: string | null
          arrival_time?: string | null
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          booking_reference?: string
          cost_per_trip?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          departure_date?: string
          departure_time?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location?: string | null
          employee_id?: string | null
          exchange_rate_to_egp?: number | null
          id?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          number_of_passengers?: number | null
          organization_id?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          quote_id?: string | null
          remaining_amount?: number | null
          route_id?: string | null
          selling_price_per_trip?: number | null
          special_requests?: string | null
          status_id?: string | null
          supplier_cost?: number | null
          supplier_cost_egp?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost?: number | null
          total_cost_egp?: number | null
          total_profit?: number | null
          updated_at?: string | null
          vehicle_plate_number?: string | null
          vehicle_type_id?: string | null
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
          created_at: string | null
          departure_city: string
          distance_km: number | null
          estimated_duration_hours: number | null
          id: string
          is_active: boolean | null
          route_name: string
          route_name_ar: string | null
          route_type: string | null
          updated_at: string | null
        }
        Insert: {
          arrival_city: string
          created_at?: string | null
          departure_city: string
          distance_km?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          route_name: string
          route_name_ar?: string | null
          route_type?: string | null
          updated_at?: string | null
        }
        Update: {
          arrival_city?: string
          created_at?: string | null
          departure_city?: string
          distance_km?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          route_name?: string
          route_name_ar?: string | null
          route_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_creation_requests: {
        Row: {
          approved_by: string | null
          created_at: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          requested_by: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          requested_by?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          requested_by?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicle_types: {
        Row: {
          capacity_passengers: number | null
          created_at: string | null
          description: string | null
          features: Json | null
          fuel_type: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          transmission_type: string | null
          updated_at: string | null
        }
        Insert: {
          capacity_passengers?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          transmission_type?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity_passengers?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          transmission_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_automation_executions: {
        Row: {
          actions_executed: Json | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          message_id: string | null
          organization_id: string
          rule_id: string
          status: string
          trigger_type: string
        }
        Insert: {
          actions_executed?: Json | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          message_id?: string | null
          organization_id: string
          rule_id: string
          status: string
          trigger_type: string
        }
        Update: {
          actions_executed?: Json | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          message_id?: string | null
          organization_id?: string
          rule_id?: string
          status?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automation_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_executions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_automation_rules_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_automation_rules_v2: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          execution_count: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          organization_id: string
          priority: number
          trigger_config: Json
          trigger_type: string
          updated_at: string
          whatsapp_settings_id: string | null
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          organization_id: string
          priority?: number
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          organization_id?: string
          priority?: number
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automation_rules_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_rules_v2_whatsapp_settings_id_fkey"
            columns: ["whatsapp_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          delivered_at: string | null
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          failed_at: string | null
          id: string
          message_id: string | null
          organization_id: string
          personalization: Json | null
          phone_number: string
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
          whatsapp_settings_id: string | null
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message_id?: string | null
          organization_id: string
          personalization?: Json | null
          phone_number: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message_id?: string | null
          organization_id?: string
          personalization?: Json | null
          phone_number?: string
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_recipients_whatsapp_settings_id_fkey"
            columns: ["whatsapp_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcasts: {
        Row: {
          audience_filter: Json | null
          audience_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivered_count: number
          description: string | null
          failed_count: number
          id: string
          message_body: string | null
          name: string
          organization_id: string
          read_count: number
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          template_id: string | null
          total_recipients: number
          updated_at: string
          whatsapp_settings_id: string | null
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          description?: string | null
          failed_count?: number
          id?: string
          message_body?: string | null
          name: string
          organization_id: string
          read_count?: number
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          description?: string | null
          failed_count?: number
          id?: string
          message_body?: string | null
          name?: string
          organization_id?: string
          read_count?: number
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcasts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcasts_whatsapp_settings_id_fkey"
            columns: ["whatsapp_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_chatbot_interactions: {
        Row: {
          bot_reply: string | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          handoff_reason: string | null
          id: string
          latency_ms: number | null
          message_id: string | null
          model_used: string | null
          organization_id: string
          user_message: string | null
          was_handed_off: boolean
        }
        Insert: {
          bot_reply?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          handoff_reason?: string | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          model_used?: string | null
          organization_id: string
          user_message?: string | null
          was_handed_off?: boolean
        }
        Update: {
          bot_reply?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          handoff_reason?: string | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          model_used?: string | null
          organization_id?: string
          user_message?: string | null
          was_handed_off?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chatbot_interactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chatbot_interactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chatbot_interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_chatbot_settings: {
        Row: {
          auto_handoff_on_error: boolean
          bot_name: string
          created_at: string
          handoff_keywords: Json
          id: string
          is_enabled: boolean
          max_bot_replies: number
          model: string
          organization_id: string
          respond_only_outside_hours: boolean
          system_prompt: string
          updated_at: string
          welcome_message: string | null
          whatsapp_settings_id: string | null
        }
        Insert: {
          auto_handoff_on_error?: boolean
          bot_name?: string
          created_at?: string
          handoff_keywords?: Json
          id?: string
          is_enabled?: boolean
          max_bot_replies?: number
          model?: string
          organization_id: string
          respond_only_outside_hours?: boolean
          system_prompt?: string
          updated_at?: string
          welcome_message?: string | null
          whatsapp_settings_id?: string | null
        }
        Update: {
          auto_handoff_on_error?: boolean
          bot_name?: string
          created_at?: string
          handoff_keywords?: Json
          id?: string
          is_enabled?: boolean
          max_bot_replies?: number
          model?: string
          organization_id?: string
          respond_only_outside_hours?: boolean
          system_prompt?: string
          updated_at?: string
          welcome_message?: string | null
          whatsapp_settings_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chatbot_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chatbot_settings_whatsapp_settings_id_fkey"
            columns: ["whatsapp_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connection_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          organization_id: string | null
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connection_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          ai_summary: string | null
          ai_summary_updated_at: string | null
          assigned_to: string | null
          assignment_reason: string | null
          auto_assigned: boolean | null
          category: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          customer_id: string | null
          first_response_at: string | null
          id: string
          is_starred: boolean
          last_activity_at: string | null
          last_message_at: string | null
          last_note_preview: string | null
          organization_id: string | null
          phone_number: string
          pinned_booking_id: string | null
          priority: string | null
          resolved_at: string | null
          sla_breached_first_response: boolean
          sla_breached_resolution: boolean
          sla_first_response_deadline: string | null
          status: string | null
          updated_at: string | null
          whatsapp_settings_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          assigned_to?: string | null
          assignment_reason?: string | null
          auto_assigned?: boolean | null
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          first_response_at?: string | null
          id?: string
          is_starred?: boolean
          last_activity_at?: string | null
          last_message_at?: string | null
          last_note_preview?: string | null
          organization_id?: string | null
          phone_number: string
          pinned_booking_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          sla_breached_first_response?: boolean
          sla_breached_resolution?: boolean
          sla_first_response_deadline?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_settings_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          assigned_to?: string | null
          assignment_reason?: string | null
          auto_assigned?: boolean | null
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          first_response_at?: string | null
          id?: string
          is_starred?: boolean
          last_activity_at?: string | null
          last_message_at?: string | null
          last_note_preview?: string | null
          organization_id?: string | null
          phone_number?: string
          pinned_booking_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          sla_breached_first_response?: boolean
          sla_breached_resolution?: boolean
          sla_first_response_deadline?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_settings_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_wa_conv_assigned"
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
          {
            foreignKeyName: "whatsapp_conversations_pinned_booking_id_fkey"
            columns: ["pinned_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_pinned_booking_id_fkey"
            columns: ["pinned_booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_pinned_booking_id_fkey"
            columns: ["pinned_booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_pinned_booking_id_fkey"
            columns: ["pinned_booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_pinned_booking_id_fkey"
            columns: ["pinned_booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_settings_id_fkey"
            columns: ["whatsapp_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_followups: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          conversation_id: string
          created_at: string
          created_by: string
          id: string
          note: string | null
          organization_id: string
          remind_at: string
          status: string
          updated_at: string
          whatsapp_settings_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          conversation_id: string
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          organization_id: string
          remind_at: string
          status?: string
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          organization_id?: string
          remind_at?: string
          status?: string
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_followups_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_followups_whatsapp_settings_id_fkey"
            columns: ["whatsapp_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_message: string | null
          id: string
          media_caption: string | null
          media_download_attempts: number | null
          media_download_error: string | null
          media_download_status: string | null
          media_duration_seconds: number | null
          media_file_name: string | null
          media_last_attempt_at: string | null
          media_mime_type: string | null
          media_provider_id: string | null
          media_storage_path: string | null
          media_url: string | null
          message_id: string
          message_type: string | null
          organization_id: string | null
          read_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          template_language: string | null
          template_name: string | null
          template_parameters: Json | null
          whatsapp_settings_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_caption?: string | null
          media_download_attempts?: number | null
          media_download_error?: string | null
          media_download_status?: string | null
          media_duration_seconds?: number | null
          media_file_name?: string | null
          media_last_attempt_at?: string | null
          media_mime_type?: string | null
          media_provider_id?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          message_id: string
          message_type?: string | null
          organization_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_language?: string | null
          template_name?: string | null
          template_parameters?: Json | null
          whatsapp_settings_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_caption?: string | null
          media_download_attempts?: number | null
          media_download_error?: string | null
          media_download_status?: string | null
          media_duration_seconds?: number | null
          media_file_name?: string | null
          media_last_attempt_at?: string | null
          media_mime_type?: string | null
          media_provider_id?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          message_id?: string
          message_type?: string | null
          organization_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_language?: string | null
          template_name?: string | null
          template_parameters?: Json | null
          whatsapp_settings_id?: string | null
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
            foreignKeyName: "whatsapp_messages_whatsapp_settings_id_fkey"
            columns: ["whatsapp_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          active_conversations_count: number | null
          auto_assignment_enabled: boolean | null
          created_at: string | null
          employee_id: string | null
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
          employee_id?: string | null
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
          employee_id?: string | null
          id?: string
          last_activity?: string | null
          max_conversations?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_settings: {
        Row: {
          access_token: string | null
          api_version: string | null
          auto_assignment_enabled: boolean | null
          business_account_id: string | null
          business_description: string | null
          business_email: string | null
          business_name: string | null
          business_website: string | null
          connected_at: string | null
          connection_method: string | null
          created_at: string | null
          disconnected_at: string | null
          display_phone_number: string | null
          id: string
          is_active: boolean | null
          is_default: boolean
          label: string | null
          meta_user_id: string | null
          onboarding_status: string | null
          organization_id: string | null
          phone_number_id: string | null
          rate_limit_per_minute: number | null
          token_expires_at: string | null
          updated_at: string | null
          waba_id: string | null
          webhook_url: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          access_token?: string | null
          api_version?: string | null
          auto_assignment_enabled?: boolean | null
          business_account_id?: string | null
          business_description?: string | null
          business_email?: string | null
          business_name?: string | null
          business_website?: string | null
          connected_at?: string | null
          connection_method?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          display_phone_number?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          label?: string | null
          meta_user_id?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          phone_number_id?: string | null
          rate_limit_per_minute?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          waba_id?: string | null
          webhook_url?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          access_token?: string | null
          api_version?: string | null
          auto_assignment_enabled?: boolean | null
          business_account_id?: string | null
          business_description?: string | null
          business_email?: string | null
          business_name?: string | null
          business_website?: string | null
          connected_at?: string | null
          connection_method?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          display_phone_number?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          label?: string | null
          meta_user_id?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          phone_number_id?: string | null
          rate_limit_per_minute?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          waba_id?: string | null
          webhook_url?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sla_settings: {
        Row: {
          auto_reply_enabled: boolean
          business_hours: Json
          created_at: string
          id: string
          organization_id: string
          out_of_hours_message: string | null
          sla_first_response_minutes: number
          sla_resolution_minutes: number
          timezone: string
          updated_at: string
          whatsapp_settings_id: string | null
        }
        Insert: {
          auto_reply_enabled?: boolean
          business_hours?: Json
          created_at?: string
          id?: string
          organization_id: string
          out_of_hours_message?: string | null
          sla_first_response_minutes?: number
          sla_resolution_minutes?: number
          timezone?: string
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Update: {
          auto_reply_enabled?: boolean
          business_hours?: Json
          created_at?: string
          id?: string
          organization_id?: string
          out_of_hours_message?: string | null
          sla_first_response_minutes?: number
          sla_resolution_minutes?: number
          timezone?: string
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sla_settings_whatsapp_settings_id_fkey"
            columns: ["whatsapp_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_template_analytics: {
        Row: {
          created_at: string
          date: string
          delivered_count: number
          failed_count: number
          id: string
          organization_id: string
          read_count: number
          replied_count: number
          sent_count: number
          template_id: string | null
          template_language: string | null
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          organization_id: string
          read_count?: number
          replied_count?: number
          sent_count?: number
          template_id?: string | null
          template_language?: string | null
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          organization_id?: string
          read_count?: number
          replied_count?: number
          sent_count?: number
          template_id?: string | null
          template_language?: string | null
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_template_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          approval_status: string | null
          body_text: string
          buttons: Json | null
          category: string | null
          category_key: string | null
          created_at: string | null
          description: string | null
          footer_text: string | null
          header_text: string | null
          header_type: string | null
          id: string
          is_library_seed: boolean
          language: string | null
          last_used_at: string | null
          library_source_key: string | null
          locale: string
          meta_rejection_reason: string | null
          meta_status: string | null
          meta_synced_at: string | null
          meta_template_id: string | null
          name: string
          organization_id: string | null
          preview_variables: Json | null
          rejection_reason: string | null
          status: string | null
          subcategory: string | null
          tags: string[] | null
          template_id: string | null
          updated_at: string | null
          usage_count: number
          variable_schema: Json | null
          variables: Json | null
          whatsapp_settings_id: string | null
        }
        Insert: {
          approval_status?: string | null
          body_text: string
          buttons?: Json | null
          category?: string | null
          category_key?: string | null
          created_at?: string | null
          description?: string | null
          footer_text?: string | null
          header_text?: string | null
          header_type?: string | null
          id?: string
          is_library_seed?: boolean
          language?: string | null
          last_used_at?: string | null
          library_source_key?: string | null
          locale?: string
          meta_rejection_reason?: string | null
          meta_status?: string | null
          meta_synced_at?: string | null
          meta_template_id?: string | null
          name: string
          organization_id?: string | null
          preview_variables?: Json | null
          rejection_reason?: string | null
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string | null
          usage_count?: number
          variable_schema?: Json | null
          variables?: Json | null
          whatsapp_settings_id?: string | null
        }
        Update: {
          approval_status?: string | null
          body_text?: string
          buttons?: Json | null
          category?: string | null
          category_key?: string | null
          created_at?: string | null
          description?: string | null
          footer_text?: string | null
          header_text?: string | null
          header_type?: string | null
          id?: string
          is_library_seed?: boolean
          language?: string | null
          last_used_at?: string | null
          library_source_key?: string | null
          locale?: string
          meta_rejection_reason?: string | null
          meta_status?: string | null
          meta_synced_at?: string | null
          meta_template_id?: string | null
          name?: string
          organization_id?: string | null
          preview_variables?: Json | null
          rejection_reason?: string | null
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string | null
          usage_count?: number
          variable_schema?: Json | null
          variables?: Json | null
          whatsapp_settings_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_whatsapp_settings_id_fkey"
            columns: ["whatsapp_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      zatca_invoice_data: {
        Row: {
          created_at: string
          id: string
          invoice_hash: string | null
          invoice_id: string
          organization_id: string
          qr_code: string | null
          status: string
          submission_response: Json | null
          submitted_at: string | null
          updated_at: string
          xml_content: string | null
          zatca_uuid: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_hash?: string | null
          invoice_id: string
          organization_id: string
          qr_code?: string | null
          status?: string
          submission_response?: Json | null
          submitted_at?: string | null
          updated_at?: string
          xml_content?: string | null
          zatca_uuid?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_hash?: string | null
          invoice_id?: string
          organization_id?: string
          qr_code?: string | null
          status?: string
          submission_response?: Json | null
          submitted_at?: string | null
          updated_at?: string
          xml_content?: string | null
          zatca_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "zatca_invoice_data_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zatca_invoice_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      car_rentals_unified: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          daily_rate: number | null
          employee_id: string | null
          id: string | null
          insurance_included: boolean | null
          invoice_sent: boolean | null
          organization_id: string | null
          paid_amount: number | null
          pickup_location: string | null
          remaining_amount: number | null
          rental_duration_days: number | null
          rental_end_date: string | null
          rental_reference: string | null
          rental_start_date: string | null
          return_location: string | null
          special_requirements: string | null
          status_id: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_payment_sent: boolean | null
          supplier_total_cost: number | null
          total_profit: number | null
          total_rental_cost: number | null
          updated_at: string | null
          vehicle_type_name: string | null
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
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_bookings_unified: {
        Row: {
          airline_name: string | null
          arrival_airport_code: string | null
          arrival_date: string | null
          arrival_time: string | null
          booking_agent_name: string | null
          booking_reference: string | null
          confirmation_number: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          departure_airport_code: string | null
          departure_date: string | null
          departure_time: string | null
          employee_id: string | null
          flight_class_name: string | null
          flight_number: string | null
          id: string | null
          invoice_sent: boolean | null
          is_round_trip: boolean | null
          meal_preferences: string | null
          number_of_passengers: number | null
          organization_id: string | null
          paid_amount: number | null
          remaining_amount: number | null
          seat_preferences: string | null
          special_requests: string | null
          status_id: string | null
          supplier_cost: number | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_payment_sent: boolean | null
          taxes_and_fees: number | null
          ticket_number: string | null
          ticket_price_per_person: number | null
          total_cost: number | null
          total_profit: number | null
          updated_at: string | null
          voucher_sent: boolean | null
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
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_bookings_unified: {
        Row: {
          booking_agent_name: string | null
          booking_date: string | null
          booking_reference_supplier: string | null
          cancellation_policy: string | null
          check_in_date: string | null
          check_out_date: string | null
          children_ages: string | null
          cost_per_night: number | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          destination_city: string | null
          employee_id: string | null
          hotel_name: string | null
          hotel_star_rating: number | null
          id: string | null
          internal_booking_number: string | null
          internal_notes: string | null
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          meal_plan: string | null
          number_of_adults: number | null
          number_of_children: number | null
          number_of_nights: number | null
          number_of_rooms: number | null
          organization_id: string | null
          paid_amount: number | null
          remaining_amount: number | null
          room_type: string | null
          selling_price_per_night: number | null
          status_id: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          total_cost_customer: number | null
          total_cost_supplier: number | null
          total_profit: number | null
          updated_at: string | null
          voucher_sent: boolean | null
          voucher_sent_date: string | null
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
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_bookings_unified: {
        Row: {
          booking_reference: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          departure_date: string | null
          departure_time: string | null
          driver_name: string | null
          driver_phone: string | null
          dropoff_location: string | null
          employee_id: string | null
          id: string | null
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          number_of_passengers: number | null
          organization_id: string | null
          paid_amount: number | null
          pickup_location: string | null
          remaining_amount: number | null
          route_name: string | null
          special_requests: string | null
          status_id: string | null
          supplier_cost: number | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          total_cost: number | null
          total_profit: number | null
          updated_at: string | null
          vehicle_plate_number: string | null
          vehicle_type_name: string | null
          voucher_sent: boolean | null
          voucher_sent_date: string | null
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
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "booking_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _can_read_org_finance: { Args: { _org_id: string }; Returns: boolean }
      _next_entry_number: { Args: { _org: string }; Returns: string }
      _resolve_account: {
        Args: { _code: string; _org: string }
        Returns: string
      }
      accept_invitation: { Args: { _token: string }; Returns: Json }
      backfill_journals: {
        Args: { _org_id: string }
        Returns: {
          expenses_posted: number
          invoices_posted: number
          supplier_payments_posted: number
        }[]
      }
      booking_make_journal: {
        Args: { b: Database["public"]["Tables"]["bookings"]["Row"] }
        Returns: undefined
      }
      calculate_monthly_salary: {
        Args: {
          p_bonus?: number
          p_deductions?: number
          p_employee_id: string
          p_notes?: string
          p_overtime_hours?: number
          p_salary_month: string
        }
        Returns: Json
      }
      can_manage_customers: { Args: never; Returns: boolean }
      can_org_write: { Args: { _org_id: string }; Returns: boolean }
      check_subscription_active: { Args: { _org_id: string }; Returns: boolean }
      check_subscription_limits: { Args: { _org_id: string }; Returns: Json }
      close_accounting_period: { Args: { _period_id: string }; Returns: Json }
      convert_quote_to_bookings: {
        Args: { p_quote_id: string }
        Returns: {
          booking_id: string
        }[]
      }
      count_org_bookings_this_month: {
        Args: { _org_id: string }
        Returns: number
      }
      count_org_members: { Args: { _org_id: string }; Returns: number }
      create_manual_journal_entry: {
        Args: {
          _description: string
          _entry_date: string
          _lines: Json
          _org_id: string
        }
        Returns: string
      }
      create_organization_onboarding: {
        Args: {
          _address?: string
          _email?: string
          _name: string
          _phone?: string
          _slug: string
        }
        Returns: string
      }
      employee_org_match: { Args: { _employee_id: string }; Returns: boolean }
      ensure_employee_for_user: {
        Args: { _org_id: string; _user_id: string }
        Returns: string
      }
      extend_trial: {
        Args: { _extra_days?: number; _org_id: string }
        Returns: Json
      }
      find_duplicate_customers: {
        Args: { _org_id: string }
        Returns: {
          customer_count: number
          customer_ids: string[]
          emails: string[]
          names: string[]
          normalized_phone: string
        }[]
      }
      find_supplier_rate: {
        Args: {
          _org_id: string
          _service_date: string
          _service_reference?: string
          _service_type: string
          _supplier_id: string
        }
        Returns: {
          cost_price: number
          currency: string
          markup_percentage: number
          rate_id: string
          season_name: string
          selling_price: number
        }[]
      }
      generate_booking_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_journal_entry_number: {
        Args: { _org_id: string }
        Returns: string
      }
      generate_quote_number: { Args: never; Returns: string }
      generate_zatca_qr: { Args: { _invoice_id: string }; Returns: Json }
      get_account_balance: {
        Args: { _account_id: string; _end_date?: string; _start_date?: string }
        Returns: number
      }
      get_account_id_by_code: {
        Args: { _code: string; _org_id: string }
        Returns: string
      }
      get_active_currencies: {
        Args: { _org_id: string }
        Returns: {
          currency: string
          entries_count: number
        }[]
      }
      get_balance_sheet:
        | {
            Args: { _as_of_date?: string; _org_id: string }
            Returns: {
              account_code: string
              account_name: string
              account_name_ar: string
              account_type: string
              balance: number
            }[]
          }
        | {
            Args: { _as_of_date?: string; _currency?: string; _org_id: string }
            Returns: {
              account_code: string
              account_name: string
              account_name_ar: string
              account_type: Database["public"]["Enums"]["account_type"]
              balance: number
              currency: string
            }[]
          }
      get_booking_status_id: { Args: { _name: string }; Returns: string }
      get_cash_flow:
        | {
            Args: { _end_date: string; _org_id: string; _start_date: string }
            Returns: {
              inflows: number
              net_flow: number
              outflows: number
              period_date: string
            }[]
          }
        | {
            Args: {
              _currency?: string
              _end_date: string
              _org_id: string
              _start_date: string
            }
            Returns: {
              currency: string
              inflows: number
              net_flow: number
              outflows: number
              period_date: string
            }[]
          }
      get_cost_center_pnl: {
        Args: { _end_date: string; _org_id: string; _start_date: string }
        Returns: {
          cost_center_code: string
          cost_center_id: string
          cost_center_name: string
          expenses: number
          profit: number
          revenue: number
        }[]
      }
      get_customer_aging: {
        Args: { _as_of_date?: string; _org_id: string }
        Returns: {
          current_due: number
          customer_id: string
          customer_name: string
          days_30: number
          days_60: number
          days_90: number
          days_over_90: number
          total_due: number
        }[]
      }
      get_data_quality_details: { Args: { _org_id: string }; Returns: Json }
      get_duplicate_customers: {
        Args: never
        Returns: {
          count: number
          customer_ids: string[]
          phone: string
        }[]
      }
      get_general_ledger: {
        Args: {
          _account_id: string
          _end_date?: string
          _org_id: string
          _start_date?: string
        }
        Returns: {
          booking_id: string
          credit: number
          currency: string
          debit: number
          description: string
          entry_date: string
          entry_id: string
          entry_number: string
          is_locked: boolean
          line_description: string
          line_id: string
          reference_id: string
          reference_type: string
          running_balance: number
          source_id: string
          source_type: string
          status: string
        }[]
      }
      get_income_statement: {
        Args: {
          _currency?: string
          _end_date: string
          _org_id: string
          _start_date: string
        }
        Returns: {
          account_code: string
          account_name: string
          account_name_ar: string
          account_type: string
          amount: number
          currency: string
        }[]
      }
      get_incomplete_records: { Args: { _org_id: string }; Returns: Json }
      get_org_plan_limits: {
        Args: { _org_id: string }
        Returns: {
          max_bookings_per_month: number
          max_storage_mb: number
          max_users: number
        }[]
      }
      get_supplier_performance: {
        Args: { _org_id: string; _supplier_id: string }
        Returns: Json
      }
      get_trial_balance:
        | {
            Args: { _end_date?: string; _org_id: string }
            Returns: {
              account_code: string
              account_id: string
              account_name: string
              account_name_ar: string
              account_type: string
              balance: number
              total_credit: number
              total_debit: number
            }[]
          }
        | {
            Args: { _currency?: string; _end_date?: string; _org_id: string }
            Returns: {
              account_code: string
              account_id: string
              account_name: string
              account_name_ar: string
              account_type: Database["public"]["Enums"]["account_type"]
              balance: number
              currency: string
              total_credit: number
              total_debit: number
            }[]
          }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      has_platform_role: {
        Args: {
          _role: Database["public"]["Enums"]["platform_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_expired: { Args: { _org_id: string }; Returns: boolean }
      is_org_in_grace_period: { Args: { _org_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_platform_admin_v2: { Args: { _user_id: string }; Returns: boolean }
      link_user_to_employee: {
        Args: { p_employee_id: string; p_user_id: string }
        Returns: Json
      }
      merge_customers: {
        Args: { _keep_id: string; _merge_ids: string[]; _org_id: string }
        Returns: Json
      }
      normalize_phone_digits: { Args: { _phone: string }; Returns: string }
      org_has_active_subscription: {
        Args: { _org_id: string }
        Returns: boolean
      }
      post_expense_transaction: {
        Args: { _expense_id: string }
        Returns: string
      }
      post_invoice: { Args: { _invoice_id: string }; Returns: string }
      post_journal_entry:
        | {
            Args: {
              _description: string
              _entry_date: string
              _lines: Json
              _org_id: string
              _reference_id: string
              _reference_type: string
            }
            Returns: string
          }
        | {
            Args: {
              _currency?: string
              _description: string
              _entry_date: string
              _lines: Json
              _org_id: string
              _reference_id: string
              _reference_type: string
            }
            Returns: string
          }
      post_supplier_payment: { Args: { _payment_id: string }; Returns: string }
      reconcile_bookings_for_org: { Args: { _org_id: string }; Returns: Json }
      reopen_accounting_period: { Args: { _period_id: string }; Returns: Json }
      retry_booking_automation_step: {
        Args: { p_step_id: string }
        Returns: string
      }
      run_booking_automation: {
        Args: { p_booking_id: string }
        Returns: string
      }
      seed_default_chart_of_accounts: {
        Args: { _org_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      supplier_org_match: { Args: { _supplier_id: string }; Returns: boolean }
      unlink_user_from_employee: { Args: { p_user_id: string }; Returns: Json }
      unpost_journal: {
        Args: { _source_id: string; _source_type: string }
        Returns: boolean
      }
      update_booking_status: {
        Args: {
          p_booking_id: string
          p_booking_type?: string
          p_new_status_id?: string
          p_notes?: string
          p_status_id?: string
        }
        Returns: boolean
      }
      update_salary_status: {
        Args: {
          p_bank_account_id?: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method?: string
          p_salary_id: string
          p_status: string
        }
        Returns: Json
      }
      update_system_setting: {
        Args: { setting_key_param: string; setting_value_param: string }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_any_org: { Args: never; Returns: boolean }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      booking_workflow_stage:
        | "lead"
        | "qualified"
        | "quoted"
        | "confirmed"
        | "paid"
        | "operations"
        | "traveling"
        | "completed"
        | "post_travel"
        | "cancelled"
      org_role: "owner" | "admin" | "manager" | "agent" | "viewer"
      platform_role: "platform_admin" | "platform_owner"
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
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      booking_workflow_stage: [
        "lead",
        "qualified",
        "quoted",
        "confirmed",
        "paid",
        "operations",
        "traveling",
        "completed",
        "post_travel",
        "cancelled",
      ],
      org_role: ["owner", "admin", "manager", "agent", "viewer"],
      platform_role: ["platform_admin", "platform_owner"],
    },
  },
} as const
