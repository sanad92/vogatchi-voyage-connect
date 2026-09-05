Warning: truncated output (original token count: 112926)
Total output lines: 14104

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
          treasury_kind: string
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
          treasury_kind?: string
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
          treasury_kind?: string
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
          deposit_percent: number | null
          employee_id: string | null
          end_date: string | null
          id: string
          is_demo: boolean
          legacy_id: string | null
          legacy_table: string | null
          notes: string | null
          organization_id: string
          payment_policy: string
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
          deposit_percent?: number | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          is_demo?: boolean
          legacy_id?: string | null
          legacy_table?: string | null
          notes?: string | null
          organization_id: string
          payment_policy?: string
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
          deposit_percent?: number | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          is_demo?: boolean
          legacy_id?: string | null
          legacy_table?: string | null
          notes?: string | null
          organization_id?: string
          payment_policy?: string
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
      branches: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          campaign_id: string
          created_at: string | null
          customer_id: string
          id: string
          organization_id: string
          response: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          organization_id: string
          response?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          organization_id?: string
          response?: string | null
          sent_at?: string | null
          status?: string
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
      credit_notes: {
        Row: {
          amount: number
          amount_base: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          exchange_rate: number
          id: string
          invoice_id: string | null
          note_date: string
          note_number: string
          organization_id: string
          party_id: string | null
          party_type: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_base: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          note_date?: string
          note_number: string
          organization_id: string
          party_id?: string | null
          party_type: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_base?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          note_date?: string
          note_number?: string
          organization_id?: string
          party_id?: string | null
          party_type?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "car_rentals_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "transport_bookings_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          customer_id: string
          direction: string
          duration_minutes: number | null
          follow_up_id: string | null
          handled_by: string | null
          id: string
          organization_id: string
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          communication_type: string
          completed_at?: string | null
          content?: string | null
          created_at?: string | null
          customer_id: string
          direction: string
          duration_minutes?: number | null
          follow_up_id?: string | null
          handled_by?: string | null
          id?: string
          organization_id: string
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          communication_type?: string
          completed_at?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string
          direction?: string
          duration_minutes?: number | null
          follow_up_id?: string | null
          handled_by?: string | null
          id?: string
          organization_id?: string
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
          customer_id: string
          customer_value: string | null
          follow_up_type: string
          id: string
          last_contact_date: string | null
          notes: string | null
          organization_id: string
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
          customer_id: string
          customer_value?: string | null
          follow_up_type: string
          id?: string
          last_contact_date?: string | null
          notes?: string | null
          organization_id: string
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
          customer_id?: string
          customer_value?: string | null
          follow_up_type?: string
          id?: string
          last_contact_date?: string | null
          notes?: string | null
          organization_id?: string
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
          customer_id: string
          id: string
          is_private: boolean | null
          note_type: string | null
          organization_id: string
          priority: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          is_private?: boolean | null
          note_type?: string | null
          organization_id: string
          priority?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          is_private?: boolean | null
          note_type?: string | null
          organization_id?: string
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
      customer_payment_allocations: {
        Row: {
          amount: number
          amount_base: number
          created_at: string
          id: string
          invoice_id: string
          organization_id: string
          payment_id: string
        }
        Insert: {
          amount: number
          amount_base: number
          created_at?: string
          id?: string
          invoice_id: string
          organization_id: string
          payment_id: string
        }
        Update: {
          amount?: number
          amount_base?: number
          created_at?: string
          id?: string
          invoice_id?: string
          organization_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_allocations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "customer_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          amount_base: number
          booking_id: string | null
          client_ref: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          exchange_rate: number
          id: string
          invoice_id: string | null
          is_demo: boolean
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string
          reference_number: string | null
          status: string
          treasury_account_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          amount_base: number
          booking_id?: string | null
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
 …62926 tokens truncated…           referencedColumns: ["id"]
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
          attempt_count: number
          completed_at: string | null
          completed_by: string | null
          conversation_id: string
          created_at: string
          created_by: string
          id: string
          last_error: string | null
          locked_at: string | null
          message_body: string | null
          mode: string
          note: string | null
          organization_id: string
          remind_at: string
          sent_at: string | null
          sent_message_id: string | null
          status: string
          template_id: string | null
          template_variables: Json
          updated_at: string
          whatsapp_settings_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          attempt_count?: number
          completed_at?: string | null
          completed_by?: string | null
          conversation_id: string
          created_at?: string
          created_by: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          message_body?: string | null
          mode?: string
          note?: string | null
          organization_id: string
          remind_at: string
          sent_at?: string | null
          sent_message_id?: string | null
          status?: string
          template_id?: string | null
          template_variables?: Json
          updated_at?: string
          whatsapp_settings_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          attempt_count?: number
          completed_at?: string | null
          completed_by?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          message_body?: string | null
          mode?: string
          note?: string | null
          organization_id?: string
          remind_at?: string
          sent_at?: string | null
          sent_message_id?: string | null
          status?: string
          template_id?: string | null
          template_variables?: Json
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
            foreignKeyName: "whatsapp_followups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
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
          broadcast_id: string | null
          content: string | null
          conversation_id: string | null
          correlation_id: string | null
          created_at: string | null
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          followup_id: string | null
          id: string
          idempotency_key: string | null
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
          message_id: string | null
          message_type: string | null
          organization_id: string | null
          provider_error_code: string | null
          provider_error_message: string | null
          provider_response: Json | null
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
          broadcast_id?: string | null
          content?: string | null
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          followup_id?: string | null
          id?: string
          idempotency_key?: string | null
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
          message_id?: string | null
          message_type?: string | null
          organization_id?: string | null
          provider_error_code?: string | null
          provider_error_message?: string | null
          provider_response?: Json | null
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
          broadcast_id?: string | null
          content?: string | null
          conversation_id?: string | null
          correlation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          followup_id?: string | null
          id?: string
          idempotency_key?: string | null
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
          message_id?: string | null
          message_type?: string | null
          organization_id?: string | null
          provider_error_code?: string | null
          provider_error_message?: string | null
          provider_response?: Json | null
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
          approved_at: string | null
          approved_by: string | null
          body_text: string
          body_variable_count: number
          buttons: Json | null
          category: string | null
          category_key: string | null
          components: Json | null
          created_at: string | null
          description: string | null
          footer_text: string | null
          header_format: string | null
          header_text: string | null
          header_type: string | null
          header_variable_count: number
          id: string
          is_library_seed: boolean
          is_org_default: boolean
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
          approved_at?: string | null
          approved_by?: string | null
          body_text: string
          body_variable_count?: number
          buttons?: Json | null
          category?: string | null
          category_key?: string | null
          components?: Json | null
          created_at?: string | null
          description?: string | null
          footer_text?: string | null
          header_format?: string | null
          header_text?: string | null
          header_type?: string | null
          header_variable_count?: number
          id?: string
          is_library_seed?: boolean
          is_org_default?: boolean
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
          approved_at?: string | null
          approved_by?: string | null
          body_text?: string
          body_variable_count?: number
          buttons?: Json | null
          category?: string | null
          category_key?: string | null
          components?: Json | null
          created_at?: string | null
          description?: string | null
          footer_text?: string | null
          header_format?: string | null
          header_text?: string | null
          header_type?: string | null
          header_variable_count?: number
          id?: string
          is_library_seed?: boolean
          is_org_default?: boolean
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
      white_label_settings: {
        Row: {
          accent_color: string | null
          brand_name: string | null
          created_at: string
          custom_domain: string | null
          email_from_name: string | null
          favicon_url: string | null
          logo_url: string | null
          organization_id: string
          primary_color: string | null
          support_email: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_domain?: string | null
          email_from_name?: string | null
          favicon_url?: string | null
          logo_url?: string | null
          organization_id: string
          primary_color?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_domain?: string | null
          email_from_name?: string | null
          favicon_url?: string | null
          logo_url?: string | null
          organization_id?: string
          primary_color?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "white_label_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          aggregate_type: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
        }
        Insert: {
          aggregate_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
        }
        Update: {
          aggregate_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      workflow_rule_runs: {
        Row: {
          duration_ms: number | null
          error: string | null
          event_id: string | null
          id: string
          organization_id: string | null
          ran_at: string
          rule_id: string
          status: string
        }
        Insert: {
          duration_ms?: number | null
          error?: string | null
          event_id?: string | null
          id?: string
          organization_id?: string | null
          ran_at?: string
          rule_id: string
          status: string
        }
        Update: {
          duration_ms?: number | null
          error?: string | null
          event_id?: string | null
          id?: string
          organization_id?: string | null
          ran_at?: string
          rule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rule_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "domain_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_rule_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          action: Json
          condition: Json
          created_at: string
          description: string | null
          event_type: string
          failure_count: number
          id: string
          is_active: boolean
          last_duration_ms: number | null
          last_run_at: string | null
          name: string
          organization_id: string | null
          priority: number
          success_count: number
          updated_at: string
        }
        Insert: {
          action?: Json
          condition?: Json
          created_at?: string
          description?: string | null
          event_type: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_duration_ms?: number | null
          last_run_at?: string | null
          name: string
          organization_id?: string | null
          priority?: number
          success_count?: number
          updated_at?: string
        }
        Update: {
          action?: Json
          condition?: Json
          created_at?: string
          description?: string | null
          event_type?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_duration_ms?: number | null
          last_run_at?: string | null
          name?: string
          organization_id?: string | null
          priority?: number
          success_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          category: string | null
          definition_id: string
          id: string
          key: string
          label: string
          order_index: number
          required_fields: Json
        }
        Insert: {
          category?: string | null
          definition_id: string
          id?: string
          key: string
          label: string
          order_index: number
          required_fields?: Json
        }
        Update: {
          category?: string | null
          definition_id?: string
          id?: string
          key?: string
          label?: string
          order_index?: number
          required_fields?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
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
      _can_manage_refunds: { Args: { _org_id: string }; Returns: boolean }
      _can_read_org_finance: { Args: { _org_id: string }; Returns: boolean }
      _module_pulse_window: {
        Args: { p_from: string; p_org: string; p_to: string }
        Returns: Json
      }
      _next_entry_number: { Args: { _org: string }; Returns: string }
      _recovery_can_manage: { Args: { _org: string }; Returns: boolean }
      _render_template: {
        Args: { _text: string; _vars: Json }
        Returns: string
      }
      _resolve_account: {
        Args: { _code: string; _org: string }
        Returns: string
      }
      _workflow_check_condition: {
        Args: { cond: Json; ctx: Json }
        Returns: boolean
      }
      _workflow_get: { Args: { path: string; payload: Json }; Returns: Json }
      _workflow_run_step: {
        Args: {
          p_event: Database["public"]["Tables"]["domain_events"]["Row"]
          p_rule_id: string
          step: Json
        }
        Returns: undefined
      }
      accept_invitation: { Args: { _token: string }; Returns: Json }
      activate_subscription_from_paymob: {
        Args: { _paymob_transaction_id: string }
        Returns: boolean
      }
      advance_workflow: {
        Args: { p_booking_id: string; p_reason?: string; p_to_stage: string }
        Returns: Json
      }
      approve_refund_request: {
        Args: { _approve?: boolean; _reason?: string; _refund_id: string }
        Returns: undefined
      }
      approve_supplier_payment_order: {
        Args: { _approve?: boolean; _po_id: string; _reason?: string }
        Returns: undefined
      }
      audit_historical_gaps: {
        Args: { _from?: string; _org: string; _to?: string }
        Returns: {
          booking_id: string
          booking_number: string
          cost_price: number
          created_on: string
          currency: string
          customer_id: string
          gap_count: number
          missing_automation_run: boolean
          missing_events: boolean
          missing_gl: boolean
          missing_invoice: boolean
          missing_snapshot: boolean
          missing_supplier_po: boolean
          missing_timeline: boolean
          missing_voucher: boolean
          missing_workflow_history: boolean
          negative_margin: boolean
          no_customer: boolean
          no_supplier: boolean
          selling_price: number
          supplier_id: string
          workflow_stage: string
          zero_price: boolean
        }[]
      }
      audit_historical_summary: {
        Args: { _from?: string; _log?: boolean; _org: string; _to?: string }
        Returns: Json
      }
      backfill_historical_bookings: {
        Args: {
          _dry_run?: boolean
          _from?: string
          _limit?: number
          _org: string
          _to?: string
        }
        Returns: Json
      }
      backfill_journals: {
        Args: { _org_id: string }
        Returns: {
          bookings_posted: number
          customer_payments_posted: number
          expenses_posted: number
          invoices_posted: number
          supplier_payments_posted: number
        }[]
      }
      booking_make_journal: {
        Args: { b: Database["public"]["Tables"]["bookings"]["Row"] }
        Returns: undefined
      }
      calculate_employee_bookings_profit:
        | {
            Args: {
              p_employee_id: string
              p_period_end: string
              p_period_start: string
            }
            Returns: {
              booking_amount: number
              booking_date: string
              booking_id: string
              booking_type: string
              profit: number
              supplier_cost: number
            }[]
          }
        | {
            Args: {
              p_currency?: string
              p_employee_id: string
              p_period_end: string
              p_period_start: string
            }
            Returns: {
              booking_amount: number
              booking_date: string
              booking_id: string
              booking_type: string
              currency: string
              profit: number
              supplier_cost: number
            }[]
          }
      calculate_employee_commission: {
        Args: {
          p_booking_amount: number
          p_commission_rate?: number
          p_employee_id: string
        }
        Returns: number
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
      cancel_commission: {
        Args: { p_commission_id: string; p_reason?: string }
        Returns: boolean
      }
      cancel_organization_invitation: {
        Args: { _invitation_id: string }
        Returns: Json
      }
      check_customer_duplicate_contact: {
        Args: {
          _email?: string
          _exclude_id?: string
          _org_id: string
          _phone: string
        }
        Returns: Json
      }
      check_employee_deletion: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      check_subscription_active: { Args: { _org_id: string }; Returns: boolean }
      check_subscription_limits: { Args: { _org_id: string }; Returns: Json }
      claim_due_whatsapp_followups: {
        Args: { _limit?: number }
        Returns: {
          assigned_to: string | null
          attempt_count: number
          completed_at: string | null
          completed_by: string | null
          conversation_id: string
          created_at: string
          created_by: string
          id: string
          last_error: string | null
          locked_at: string | null
          message_body: string | null
          mode: string
          note: string | null
          organization_id: string
          remind_at: string
          sent_at: string | null
          sent_message_id: string | null
          status: string
          template_id: string | null
          template_variables: Json
          updated_at: string
          whatsapp_settings_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "whatsapp_followups"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      close_accounting_period: { Args: { _period_id: string }; Returns: Json }
      close_fiscal_year: {
        Args: { _confirmation: string; _org: string; _year: number }
        Returns: Json
      }
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
      create_booking_commission: {
        Args: {
          p_booking_id: string
          p_commission_rate?: number
          p_employee_id: string
        }
        Returns: string
      }
      create_manual_journal_entry: {
        Args: {
          _description: string
          _entry_date: string
          _lines: Json
          _org_id: string
        }
        Returns: string
      }
      create_organization_invitation: {
        Args: {
          _email: string
          _organization_id: string
          _role?: Database["public"]["Enums"]["org_role"]
        }
        Returns: Json
      }
      create_organization_onboarding: {
        Args: {
          _address?: string
          _email?: string
          _name: string
          _phone?: string
          _slug?: string
        }
        Returns: string
      }
      create_refund_request: {
        Args: {
          _amount: number
          _booking_id: string
          _currency?: string
          _exchange_rate?: number
          _reason?: string
          _source_payment_id?: string
        }
        Returns: string
      }
      crm_customer_booking_metrics: {
        Args: { _org_id: string }
        Returns: {
          booking_count_by_currency: Json
          customer_id: string
          last_booking_date: string
          spend_by_currency: Json
          total_bookings: number
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      emit_event: {
        Args: {
          p_aggregate_id: string
          p_aggregate_type: string
          p_idempotency_key: string
          p_organization_id: string
          p_payload: Json
          p_type: string
        }
        Returns: string
      }
      employee_org_match: { Args: { _employee_id: string }; Returns: boolean }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enrich_event_payload: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: Json
      }
      enroll_in_journey: {
        Args: { p_context?: Json; p_customer_id: string; p_journey_id: string }
        Returns: string
      }
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
      fiscal_year_reconciliation: {
        Args: { _org: string; _year: number }
        Returns: Json
      }
      generate_booking_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_journal_entry_number: {
        Args: { _org_id: string }
        Returns: string
      }
      generate_period_commission: {
        Args: {
          p_currency?: string
          p_employee_id: string
          p_notes?: string
          p_period_end: string
          p_period_start: string
        }
        Returns: Json
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
      get_active_impersonation: {
        Args: never
        Returns: {
          reason: string
          session_id: string
          started_at: string
          target_org_id: string
          target_user_id: string
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
      get_business_health_kpis: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_cash_flow:
        | {
            Args: { _from?: string; _org: string; _to?: string }
            Returns: {
              day: string
              incoming: number
              net: number
              outgoing: number
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
      get_customer_aging_by_currency: {
        Args: { _as_of_date?: string; _currency?: string; _org_id: string }
        Returns: {
          currency: string
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
      get_customer_ledger: {
        Args: { _customer_id: string; _from?: string; _to?: string }
        Returns: {
          balance: number
          booking_id: string
          credit: number
          currency: string
          debit: number
          entry_date: string
          entry_type: string
          reference: string
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
      get_finance_executive: {
        Args: { _from?: string; _org: string; _to?: string }
        Returns: Json
      }
      get_financial_launch_health: { Args: { _org_id: string }; Returns: Json }
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
      get_general_ledger_summary_v2: {
        Args: {
          _account_id: string
          _cost_center_id?: string
          _currency?: string
          _end_date?: string
          _org_id: string
          _start_date?: string
        }
        Returns: {
          closing_balance: number
          net_movement: number
          opening_balance: number
          total_credit: number
          total_debit: number
          transaction_count: number
        }[]
      }
      get_general_ledger_v2: {
        Args: {
          _account_id: string
          _cost_center_id?: string
          _currency?: string
          _end_date?: string
          _org_id: string
          _start_date?: string
        }
        Returns: {
          booking_id: string
          cost_center_code: string
          cost_center_id: string
          cost_center_name: string
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
          movement: number
          opening_balance: number
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
      get_module_pulse: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_ops_command_center: { Args: { p_date?: string }; Returns: Json }
      get_org_plan_limits: {
        Args: { _org_id: string }
        Returns: {
          max_bookings_per_month: number
          max_storage_mb: number
          max_users: number
        }[]
      }
      get_supplier_ledger: {
        Args: { _from?: string; _supplier_id: string; _to?: string }
        Returns: {
          balance: number
          booking_id: string
          credit: number
          currency: string
          debit: number
          entry_date: string
          entry_type: string
          reference: string
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
      get_trial_balance_v2: {
        Args: {
          _as_of_date?: string
          _cost_center_id?: string
          _currency?: string
          _org_id: string
        }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          account_name_ar: string
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          credit_balance: number
          currency: string
          debit_balance: number
          total_credit: number
          total_debit: number
        }[]
      }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      get_workflow_progress: {
        Args: { p_aggregate_id: string; p_aggregate_type: string }
        Returns: Json
      }
      handler_ai_summary_refresh: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      handler_audit_write: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      handler_enqueue_email: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      handler_enqueue_whatsapp_suggestion: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      handler_finance_post: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      handler_notification_dispatch: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      handler_notify_in_app: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      handler_run_booking_automation: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      handler_timeline_append: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      handler_workflow_rules: {
        Args: { p_event: Database["public"]["Tables"]["domain_events"]["Row"] }
        Returns: undefined
      }
      has_org_permission: {
        Args: { _org_id: string; _permission: string }
        Returns: boolean
      }
      has_platform_role: {
        Args: {
          _role: Database["public"]["Enums"]["platform_role"]
          _user_id: string
        }
        Returns: boolean
      }
      html_escape: { Args: { _value: string }; Returns: string }
      is_org_expired: { Args: { _org_id: string }; Returns: boolean }
      is_org_in_grace_period: { Args: { _org_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_platform_admin_v2: { Args: { _user_id: string }; Returns: boolean }
      link_user_to_employee: {
        Args: { p_employee_id: string; p_user_id: string }
        Returns: Json
      }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_description?: string
          p_new_values?: Json
          p_old_values?: Json
          p_target_id?: string
          p_target_table?: string
        }
        Returns: undefined
      }
      manage_organization_member: {
        Args: {
          _is_active?: boolean
          _membership_id: string
          _new_role?: Database["public"]["Enums"]["org_role"]
          _note?: string
          _termination_date?: string
        }
        Returns: Json
      }
      manage_sop_department_member: {
        Args: {
          _assign?: boolean
          _department: Database["public"]["Enums"]["sop_department"]
          _is_available?: boolean
          _organization_id: string
          _user_id: string
        }
        Returns: Json
      }
      merge_customers: {
        Args: { _keep_id: string; _merge_ids: string[]; _org_id: string }
        Returns: Json
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_email_address: { Args: { _email: string }; Returns: string }
      normalize_phone_digits: { Args: { _phone: string }; Returns: string }
      org_has_active_subscription: {
        Args: { _org_id: string }
        Returns: boolean
      }
      pay_refund_request: {
        Args: {
          _reference?: string
          _refund_id: string
          _treasury_account_id: string
        }
        Returns: undefined
      }
      post_booking_cost: { Args: { _booking_id: string }; Returns: string }
      post_commission_period_accrual: {
        Args: { _period_id: string }
        Returns: string
      }
      post_commission_period_payment: {
        Args: { _period_id: string }
        Returns: string
      }
      post_customer_payment: { Args: { _payment_id: string }; Returns: string }
      post_customer_refund: { Args: { _refund_id: string }; Returns: string }
      post_expense_transaction: {
        Args: { _expense_id: string }
        Returns: string
      }
      post_invoice: { Args: { _invoice_id: string }; Returns: string }
      post_invoice_legacy_receipt: {
        Args: { _invoice_id: string }
        Returns: string
      }
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
      post_supplier_invoice: {
        Args: { _supplier_invoice_id: string }
        Returns: string
      }
      post_supplier_payment: { Args: { _payment_id: string }; Returns: string }
      prepare_subscription_checkout: {
        Args: {
          _billing_cycle: string
          _organization_id: string
          _plan_id: string
        }
        Returns: Json
      }
      process_event_deliveries: { Args: { p_limit?: number }; Returns: number }
      process_journey_enrollments: {
        Args: { p_limit?: number }
        Returns: number
      }
      queue_organization_invitation_email: {
        Args: { _invitation_id: string }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_broadcast_counters: {
        Args: { _broadcast_id: string }
        Returns: undefined
      }
      reconcile_bookings_for_org: { Args: { _org_id: string }; Returns: Json }
      record_customer_payment: {
        Args: {
          _amount: number
          _booking_id?: string
          _client_ref?: string
          _currency?: string
          _customer_id?: string
          _exchange_rate?: number
          _invoice_id: string
          _method?: string
          _notes?: string
          _payment_date?: string
          _reference?: string
          _treasury_account_id?: string
        }
        Returns: string
      }
      record_supplier_payment: {
        Args: {
          _amount: number
          _currency?: string
          _exchange_rate?: number
          _method?: string
          _notes?: string
          _payment_date?: string
          _po_id: string
          _reference?: string
          _treasury_account_id?: string
        }
        Returns: string
      }
      redeem_loyalty_reward: {
        Args: { _customer_id: string; _reward_id: string }
        Returns: Json
      }
      refresh_customer_booking_summary: {
        Args: { _customer_id: string; _org_id: string }
        Returns: undefined
      }
      reopen_accounting_period: { Args: { _period_id: string }; Returns: Json }
      reopen_fiscal_year: {
        Args: { _org: string; _reason: string; _year: number }
        Returns: Json
      }
      replay_event: { Args: { p_event_id: string }; Returns: number }
      replay_gl_postings: {
        Args: { _dry_run?: boolean; _from?: string; _org: string; _to?: string }
        Returns: Json
      }
      resend_organization_invitation: {
        Args: { _invitation_id: string }
        Returns: Json
      }
      reset_demo_data: { Args: { _org_id: string }; Returns: Json }
      retry_booking_automation_step: {
        Args: { p_step_id: string }
        Returns: string
      }
      retry_event_delivery: {
        Args: { p_delivery_id: string }
        Returns: undefined
      }
      retry_workflow_rule_run: {
        Args: { p_event_id: string; p_rule_id: string }
        Returns: undefined
      }
      run_booking_automation: {
        Args: { p_booking_id: string }
        Returns: string
      }
      safe_delete_employee: {
        Args: {
          p_employee_id: string
          p_force_delete?: boolean
          p_reason?: string
        }
        Returns: Json
      }
      seed_default_chart_of_accounts: {
        Args: { _org_id: string }
        Returns: undefined
      }
      set_customer_archived: {
        Args: { _archived: boolean; _customer_id: string; _org_id: string }
        Returns: Json
      }
      set_org_pin: {
        Args: { _org_id: string; _pin: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sop_acknowledge_assignment: { Args: { _lead: string }; Returns: Json }
      sop_acknowledge_assignment_unsafe_impl: {
        Args: { _lead: string }
        Returns: Json
      }
      sop_actor_name: { Args: { _user: string }; Returns: string }
      sop_add_lead_activity: {
        Args: {
          _activity_type: string
          _assigned_to?: string
          _completed?: boolean
          _due_at?: string
          _lead: string
          _notes?: string
          _outcome?: string
        }
        Returns: Json
      }
      sop_advance_lead: {
        Args: {
          _lead: string
          _reason?: string
          _to: Database["public"]["Enums"]["sop_lead_stage"]
        }
        Returns: Json
      }
      sop_advance_lead_unsafe_impl: {
        Args: {
          _lead: string
          _reason?: string
          _to: Database["public"]["Enums"]["sop_lead_stage"]
        }
        Returns: Json
      }
      sop_allowed_next: {
        Args: { _s: Database["public"]["Enums"]["sop_lead_stage"] }
        Returns: Database["public"]["Enums"]["sop_lead_stage"][]
      }
      sop_assign_lead: {
        Args: { _assignee?: string; _exception_reason?: string; _lead: string }
        Returns: Json
      }
      sop_assign_lead_unsafe_impl: {
        Args: { _assignee?: string; _exception_reason?: string; _lead: string }
        Returns: Json
      }
      sop_auto_assign: { Args: { _lead: string }; Returns: string }
      sop_backfill_stage_history: { Args: { p_org?: string }; Returns: Json }
      sop_brief_missing: {
        Args: { l: Database["public"]["Tables"]["sop_leads"]["Row"] }
        Returns: string[]
      }
      sop_can_manage_pricing: {
        Args: { _org: string; _user: string }
        Returns: boolean
      }
      sop_cancel_lead_activity: {
        Args: { _activity: string; _reason?: string }
        Returns: Json
      }
      sop_claim_lead: { Args: { _lead: string }; Returns: Json }
      sop_claim_lead_unsafe_impl: { Args: { _lead: string }; Returns: Json }
      sop_claim_pricing_request: { Args: { _request: string }; Returns: Json }
      sop_collection_status: { Args: { _lead: string }; Returns: Json }
      sop_complete_handover: {
        Args: {
          _checklist: Json
          _lead: string
          _notes?: string
          _to_user?: string
          _type: Database["public"]["Enums"]["sop_handover_type"]
        }
        Returns: Json
      }
      sop_complete_lead_activity: {
        Args: { _activity: string; _notes?: string; _outcome?: string }
        Returns: Json
      }
      sop_complete_recheck: {
        Args: { _changed: boolean; _notes?: string; _request: string }
        Returns: Json
      }
      sop_complete_recheck_unsafe_impl: {
        Args: { _changed: boolean; _notes?: string; _request: string }
        Returns: Json
      }
      sop_compliance_report: { Args: { p_org: string }; Returns: Json }
      sop_convert_lead_to_customer: { Args: { _lead: string }; Returns: Json }
      sop_create_pricing_request: {
        Args: { _lead: string; _notes?: string }
        Returns: Json
      }
      sop_create_pricing_request_unsafe_impl: {
        Args: { _lead: string; _notes?: string }
        Returns: Json
      }
      sop_decide_approval: {
        Args: { _approval: string; _approve: boolean; _note?: string }
        Returns: Json
      }
      sop_department_kpis: {
        Args: { p_from?: string; p_org: string; p_to?: string }
        Returns: Json
      }
      sop_disqualify: {
        Args: { _lead: string; _note?: string; _reason: string }
        Returns: Json
      }
      sop_disqualify_unsafe_impl: {
        Args: { _lead: string; _note?: string; _reason: string }
        Returns: Json
      }
      sop_handover_checklist_keys: {
        Args: { _t: Database["public"]["Enums"]["sop_handover_type"] }
        Returns: string[]
      }
      sop_handover_status: {
        Args: {
          _lead: string
          _t: Database["public"]["Enums"]["sop_handover_type"]
        }
        Returns: Json
      }
      sop_has_department: {
        Args: {
          _dept: Database["public"]["Enums"]["sop_department"]
          _org: string
          _user: string
        }
        Returns: boolean
      }
      sop_history_write: {
        Args: {
          _action: string
          _actor: string
          _at: string
          _booking: string
          _from: Database["public"]["Enums"]["sop_lead_stage"]
          _key: string
          _lead: string
          _meta: Json
          _org: string
          _pricing: string
          _quote: string
          _reason: string
          _reconstructed: boolean
          _source: string
          _to: Database["public"]["Enums"]["sop_lead_stage"]
        }
        Returns: undefined
      }
      sop_intake_missing: {
        Args: { l: Database["public"]["Tables"]["sop_leads"]["Row"] }
        Returns: string[]
      }
      sop_is_manager: {
        Args: { _org: string; _user: string }
        Returns: boolean
      }
      sop_lead_cycle_report: {
        Args: {
          p_department?: Database["public"]["Enums"]["sop_department"]
          p_employee?: string
          p_from?: string
          p_include_legacy?: boolean
          p_org: string
          p_outcome?: string
          p_source?: string
          p_stage?: Database["public"]["Enums"]["sop_lead_stage"]
          p_to?: string
        }
        Returns: Json
      }
      sop_lead_timeline: { Args: { _lead: string }; Returns: Json }
      sop_move_back: {
        Args: {
          _lead: string
          _reason: string
          _to: Database["public"]["Enums"]["sop_lead_stage"]
        }
        Returns: Json
      }
      sop_move_back_unsafe_impl: {
        Args: {
          _lead: string
          _reason: string
          _to: Database["public"]["Enums"]["sop_lead_stage"]
        }
        Returns: Json
      }
      sop_my_departments: { Args: { _org: string }; Returns: Json }
      sop_on_booking_confirmed: { Args: { _lead: string }; Returns: Json }
      sop_publish_pricing: {
        Args: {
          _recommendation?: string
          _request: string
          _valid_until?: string
        }
        Returns: Json
      }
      sop_reassign_lead: {
        Args: { _assignee: string; _lead: string; _reason: string }
        Returns: Json
      }
      sop_reassign_lead_unsafe_impl: {
        Args: { _assignee: string; _lead: string; _reason: string }
        Returns: Json
      }
      sop_reopen_lead: { Args: { _lead: string }; Returns: Json }
      sop_reopen_lead_unsafe_impl: { Args: { _lead: string }; Returns: Json }
      sop_request_approval: {
        Args: {
          _amount?: number
          _booking?: string
          _lead?: string
          _reason?: string
          _supplier_payment_order?: string
          _type: Database["public"]["Enums"]["sop_approval_type"]
        }
        Returns: Json
      }
      sop_request_recheck: {
        Args: { _lead: string; _notes?: string }
        Returns: Json
      }
      sop_request_recheck_unsafe_impl: {
        Args: { _lead: string; _notes?: string }
        Returns: Json
      }
      sop_return_to_sales: { Args: { _request: string }; Returns: Json }
      sop_return_to_sales_unsafe_impl: {
        Args: { _request: string }
        Returns: Json
      }
      sop_save_lead: {
        Args: { _lead?: string; _org: string; _payload?: Json }
        Returns: Json
      }
      sop_search_leads: {
        Args: {
          _follow_up?: string
          _include_legacy?: boolean
          _limit?: number
          _org: string
          _owner?: string
          _search?: string
          _sort?: string
          _source?: string
          _stages?: Database["public"]["Enums"]["sop_lead_stage"][]
        }
        Returns: {
          adults: number | null
          approx_dates: string | null
          arrived_at: string
          booking_id: string | null
          budget_amount: number | null
          budget_currency: string | null
          budget_level: string | null
          campaign: string | null
          check_in: string | null
          check_out: string | null
          children_ages: Json
          children_count: number
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          converted_at: string | null
          converted_by: string | null
          created_at: string
          created_by: string | null
          current_owner_id: string | null
          customer_id: string | null
          deposit_percent: number | null
          destination: string | null
          first_response_at: string | null
          id: string
          intake_completed_at: string | null
          is_legacy: boolean
          last_contact_at: string | null
          lead_number: string | null
          lead_source: string | null
          lost_reason: string | null
          market: string | null
          migration_source: string | null
          nationality: string | null
          next_follow_up_at: string | null
          occupancy: string | null
          organization_id: string
          owner_department: Database["public"]["Enums"]["sop_department"]
          payment_policy: string
          priorities: string | null
          quote_id: string | null
          reference_hotel: string | null
          reference_screenshot_url: string | null
          requote_required: boolean
          rooms: number | null
          service_type: string | null
          special_requests: string | null
          stage: Database["public"]["Enums"]["sop_lead_stage"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sop_leads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      sop_set_availability: {
        Args: { _is_available: boolean; _reason?: string; _user_id: string }
        Returns: Json
      }
      sop_set_department: {
        Args: {
          _department?: Database["public"]["Enums"]["sop_department"]
          _is_available?: boolean
          _reason?: string
          _user_id: string
        }
        Returns: Json
      }
      sop_set_my_availability: {
        Args: {
          _available: boolean
          _department: Database["public"]["Enums"]["sop_department"]
          _org: string
        }
        Returns: Json
      }
      sop_stage_to_booking_stage: {
        Args: { _s: Database["public"]["Enums"]["sop_lead_stage"] }
        Returns: string
      }
      sop_validate_transition: {
        Args: {
          _lead: string
          _to: Database["public"]["Enums"]["sop_lead_stage"]
        }
        Returns: Json
      }
      sop_validate_transition_unsafe_impl: {
        Args: {
          _lead: string
          _to: Database["public"]["Enums"]["sop_lead_stage"]
        }
        Returns: Json
      }
      start_impersonation: {
        Args: {
          _mfa_verified: boolean
          _org_pin: string
          _reason: string
          _target_org_id: string
          _target_user_id: string
        }
        Returns: string
      }
      stop_impersonation: { Args: never; Returns: undefined }
      supplier_org_match: { Args: { _supplier_id: string }; Returns: boolean }
      toggle_employee_status: {
        Args: { p_employee_id: string; p_is_active: boolean; p_reason?: string }
        Returns: Json
      }
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
      update_period_commission_status: {
        Args: {
          p_bank_account_id?: string
          p_commission_period_id: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method?: string
          p_status: string
        }
        Returns: Json
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
      validate_employee_commissions: {
        Args: { p_employee_id: string }
        Returns: {
          actual_amount: number
          commission_id: string
          expected_amount: number
          issue: string
        }[]
      }
      wa_count_placeholders: { Args: { _text: string }; Returns: number }
      whatsapp_window_open: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
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
      document_category:
        | "passport"
        | "visa"
        | "voucher"
        | "invoice"
        | "purchase_order"
        | "ticket"
        | "insurance"
        | "contract"
        | "other"
      org_role: "owner" | "admin" | "manager" | "agent" | "viewer"
      platform_role: "platform_admin" | "platform_owner"
      sop_approval_status: "pending" | "approved" | "rejected"
      sop_approval_type:
        | "discount"
        | "free_service"
        | "booking_confirmation"
        | "supplier_payment"
        | "refund_compensation"
      sop_deadline_type:
        | "payment"
        | "cancellation"
        | "release"
        | "pre_arrival"
        | "reconfirmation"
      sop_department:
        | "customer_service"
        | "sales"
        | "reservations"
        | "operations"
        | "management"
        | "marketing"
        | "finance"
      sop_handover_type:
        | "cs_to_sales"
        | "sales_to_reservations"
        | "reservations_to_sales"
        | "reservations_to_cs"
      sop_lead_stage:
        | "new"
        | "qualified"
        | "assigned"
        | "pricing_requested"
        | "quoted"
        | "follow_up"
        | "accepted_pending_recheck"
        | "rechecked"
        | "payment_pending"
        | "won"
        | "lost"
        | "cancelled"
      sop_pricing_status:
        | "requested"
        | "in_progress"
        | "quoted"
        | "requoted"
        | "recheck"
        | "closed"
        | "cancelled"
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
      document_category: [
        "passport",
        "visa",
        "voucher",
        "invoice",
        "purchase_order",
        "ticket",
        "insurance",
        "contract",
        "other",
      ],
      org_role: ["owner", "admin", "manager", "agent", "viewer"],
      platform_role: ["platform_admin", "platform_owner"],
      sop_approval_status: ["pending", "approved", "rejected"],
      sop_approval_type: [
        "discount",
        "free_service",
        "booking_confirmation",
        "supplier_payment",
        "refund_compensation",
      ],
      sop_deadline_type: [
        "payment",
        "cancellation",
        "release",
        "pre_arrival",
        "reconfirmation",
      ],
      sop_department: [
        "customer_service",
        "sales",
        "reservations",
        "operations",
        "management",
        "marketing",
        "finance",
      ],
      sop_handover_type: [
        "cs_to_sales",
        "sales_to_reservations",
        "reservations_to_sales",
        "reservations_to_cs",
      ],
      sop_lead_stage: [
        "new",
        "qualified",
        "assigned",
        "pricing_requested",
        "quoted",
        "follow_up",
        "accepted_pending_recheck",
        "rechecked",
        "payment_pending",
        "won",
        "lost",
        "cancelled",
      ],
      sop_pricing_status: [
        "requested",
        "in_progress",
        "quoted",
        "requoted",
        "recheck",
        "closed",
        "cancelled",
      ],
    },
  },
} as const
