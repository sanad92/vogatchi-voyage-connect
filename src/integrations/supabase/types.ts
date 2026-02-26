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
      admin_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          organization_id: string | null
          target_id: string | null
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          target_id?: string | null
          target_table?: string | null
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
      airlines: {
        Row: {
          created_at: string | null
          iata_code: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          iata_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          iata_code?: string | null
          id?: string
          is_active?: boolean | null
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
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
        }
        Insert: {
          city: string
          country?: string | null
          created_at?: string | null
          iata_code: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
        }
        Update: {
          city?: string
          country?: string | null
          created_at?: string | null
          iata_code?: string
          id?: string
          is_active?: boolean | null
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
            foreignKeyName: "car_rentals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      hotel_bookings: {
        Row: {
          booking_agent_id: string | null
          booking_agent_name: string | null
          booking_date: string | null
          booking_reference_supplier: string | null
          cancellation_policy: string | null
          check_in_date: string
          check_out_date: string
          children_ages: string | null
          cost_per_night: number | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string
          destination_city: string | null
          hotel_name: string | null
          hotel_star_rating: number | null
          id: string
          internal_booking_number: string
          invoice_sent: boolean | null
          invoice_sent_date: string | null
          meal_plan: string | null
          number_of_adults: number | null
          number_of_children: number | null
          number_of_nights: number | null
          organization_id: string | null
          paid_amount: number | null
          payment_due_date: string | null
          payment_method: string | null
          remaining_amount: number | null
          room_type: string | null
          selling_price_per_night: number | null
          status_id: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_payment_sent: boolean | null
          supplier_payment_sent_date: string | null
          total_cost_customer: number | null
          total_profit: number | null
          updated_at: string | null
          voucher_sent: boolean | null
          voucher_sent_date: string | null
        }
        Insert: {
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          booking_date?: string | null
          booking_reference_supplier?: string | null
          cancellation_policy?: string | null
          check_in_date: string
          check_out_date: string
          children_ages?: string | null
          cost_per_night?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name: string
          destination_city?: string | null
          hotel_name?: string | null
          hotel_star_rating?: number | null
          id?: string
          internal_booking_number?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          meal_plan?: string | null
          number_of_adults?: number | null
          number_of_children?: number | null
          number_of_nights?: number | null
          organization_id?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          remaining_amount?: number | null
          room_type?: string | null
          selling_price_per_night?: number | null
          status_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost_customer?: number | null
          total_profit?: number | null
          updated_at?: string | null
          voucher_sent?: boolean | null
          voucher_sent_date?: string | null
        }
        Update: {
          booking_agent_id?: string | null
          booking_agent_name?: string | null
          booking_date?: string | null
          booking_reference_supplier?: string | null
          cancellation_policy?: string | null
          check_in_date?: string
          check_out_date?: string
          children_ages?: string | null
          cost_per_night?: number | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_name?: string
          destination_city?: string | null
          hotel_name?: string | null
          hotel_star_rating?: number | null
          id?: string
          internal_booking_number?: string
          invoice_sent?: boolean | null
          invoice_sent_date?: string | null
          meal_plan?: string | null
          number_of_adults?: number | null
          number_of_children?: number | null
          number_of_nights?: number | null
          organization_id?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          payment_method?: string | null
          remaining_amount?: number | null
          room_type?: string | null
          selling_price_per_night?: number | null
          status_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_payment_sent?: boolean | null
          supplier_payment_sent_date?: string | null
          total_cost_customer?: number | null
          total_profit?: number | null
          updated_at?: string | null
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
            foreignKeyName: "hotel_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          created_at: string | null
          description: string | null
          destination_id: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          organization_id: string | null
          phone: string | null
          star_rating: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          phone?: string | null
          star_rating?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          phone?: string | null
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
          priority?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      organizations: {
        Row: {
          address: string | null
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
          updated_at: string
        }
        Insert: {
          address?: string | null
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
          updated_at?: string
        }
        Update: {
          address?: string | null
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
          updated_at?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      rent_contracts: {
        Row: {
          bank_account_id: string | null
          commission_rate: number | null
          contract_duration_months: number | null
          contract_end_date: string
          contract_notes: string | null
          contract_number: string | null
          contract_start_date: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          landlord_name: string
          landlord_phone: string | null
          monthly_rent: number
          payment_day_of_month: number | null
          payment_method: string | null
          property_address: string | null
          property_name: string
          security_deposit: number | null
          updated_at: string | null
        }
        Insert: {
          bank_account_id?: string | null
          commission_rate?: number | null
          contract_duration_months?: number | null
          contract_end_date: string
          contract_notes?: string | null
          contract_number?: string | null
          contract_start_date: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          landlord_name: string
          landlord_phone?: string | null
          monthly_rent: number
          payment_day_of_month?: number | null
          payment_method?: string | null
          property_address?: string | null
          property_name: string
          security_deposit?: number | null
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string | null
          commission_rate?: number | null
          contract_duration_months?: number | null
          contract_end_date?: string
          contract_notes?: string | null
          contract_number?: string | null
          contract_start_date?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          landlord_name?: string
          landlord_phone?: string | null
          monthly_rent?: number
          payment_day_of_month?: number | null
          payment_method?: string | null
          property_address?: string | null
          property_name?: string
          security_deposit?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_contracts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
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
        ]
      }
      service_requests: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          name: string
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
          id: string
          notes: string | null
          organization_id: string
          payment_method: string | null
          payment_reference: string | null
          plan_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          payment_reference?: string | null
          plan_id: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          payment_reference?: string | null
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
          supplier_id: string | null
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
          supplier_id?: string | null
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
          supplier_id?: string | null
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
            foreignKeyName: "transport_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          conversation_id?: string | null
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
        Update: {
          content?: string | null
          conversation_id?: string | null
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
          business_description: string | null
          business_email: string | null
          business_name: string | null
          business_website: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          phone_number_id: string | null
          rate_limit_per_minute: number | null
          updated_at: string | null
          webhook_url: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          access_token?: string | null
          api_version?: string | null
          auto_assignment_enabled?: boolean | null
          business_description?: string | null
          business_email?: string | null
          business_name?: string | null
          business_website?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number_id?: string | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
          webhook_url?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          access_token?: string | null
          api_version?: string | null
          auto_assignment_enabled?: boolean | null
          business_description?: string | null
          business_email?: string | null
          business_name?: string | null
          business_website?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number_id?: string | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
          webhook_url?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          approval_status: string | null
          body_text: string
          buttons: Json | null
          category: string | null
          created_at: string | null
          footer_text: string | null
          header_text: string | null
          header_type: string | null
          id: string
          language: string | null
          name: string
          rejection_reason: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          approval_status?: string | null
          body_text: string
          buttons?: Json | null
          category?: string | null
          created_at?: string | null
          footer_text?: string | null
          header_text?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          name: string
          rejection_reason?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          approval_status?: string | null
          body_text?: string
          buttons?: Json | null
          category?: string | null
          created_at?: string | null
          footer_text?: string | null
          header_text?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          name?: string
          rejection_reason?: string | null
          status?: string | null
          template_id?: string | null
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
      accept_invitation: { Args: { _token: string }; Returns: Json }
      check_subscription_active: { Args: { _org_id: string }; Returns: boolean }
      check_subscription_limits: { Args: { _org_id: string }; Returns: Json }
      count_org_bookings_this_month: {
        Args: { _org_id: string }
        Returns: number
      }
      count_org_members: { Args: { _org_id: string }; Returns: number }
      extend_trial: {
        Args: { _extra_days?: number; _org_id: string }
        Returns: Json
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_duplicate_customers: {
        Args: never
        Returns: {
          count: number
          customer_ids: string[]
          phone: string
        }[]
      }
      get_org_plan_limits: {
        Args: { _org_id: string }
        Returns: {
          max_bookings_per_month: number
          max_storage_mb: number
          max_users: number
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
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_platform_admin_v2: { Args: { _user_id: string }; Returns: boolean }
      link_user_to_employee: {
        Args: { p_employee_id: string; p_user_id: string }
        Returns: Json
      }
      unlink_user_from_employee: { Args: { p_user_id: string }; Returns: Json }
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
      update_system_setting: {
        Args: { setting_key_param: string; setting_value_param: string }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
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
      org_role: ["owner", "admin", "manager", "agent", "viewer"],
      platform_role: ["platform_admin", "platform_owner"],
    },
  },
} as const
