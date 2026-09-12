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
      personalization_simulations: {
        Row: {
          id: string
          seller_id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          product_unit_price: number
          simulation_data: Json
          notes: string | null
          created_at: string
          updated_at: string
          client_id: string | null
        }
        Insert: {
          id?: string
          seller_id: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          product_unit_price: number
          simulation_data: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
          client_id?: string | null
        }
        Update: {
          id?: string
          seller_id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          product_unit_price?: number
          simulation_data?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
          client_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personalization_simulations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "bitrix_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          current_conversions: number | null
          current_quotes: number | null
          current_value: number
          end_date: string
          goal_type: string
          id: string
          is_achieved: boolean | null
          start_date: string
          target_conversions: number | null
          target_quotes: number | null
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          current_conversions?: number | null
          current_quotes?: number | null
          current_value?: number
          end_date: string
          goal_type?: string
          id?: string
          is_achieved?: boolean | null
          start_date: string
          target_conversions?: number | null
          target_quotes?: number | null
          target_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          current_conversions?: number | null
          current_quotes?: number | null
          current_value?: number
          end_date?: string
          goal_type?: string
          id?: string
          is_achieved?: boolean | null
          start_date?: string
          target_conversions?: number | null
          target_quotes?: number | null
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      access_blocked_log: {
        Row: {
          block_reason: string
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: string
          state: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          block_reason: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address: string
          state?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          block_reason?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string
          state?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      access_security_settings: {
        Row: {
          block_unknown_locations: boolean
          city_whitelist_enabled: boolean
          id: string
          ip_whitelist_enabled: boolean
          lockout_duration_minutes: number
          max_failed_attempts: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_unknown_locations?: boolean
          city_whitelist_enabled?: boolean
          id?: string
          ip_whitelist_enabled?: boolean
          lockout_duration_minutes?: number
          max_failed_attempts?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_unknown_locations?: boolean
          city_whitelist_enabled?: boolean
          id?: string
          ip_whitelist_enabled?: boolean
          lockout_duration_minutes?: number
          max_failed_attempts?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_archive: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_default: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_old: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_y2024: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_y2025: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_y2026_m01: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_y2026_m02: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_y2026_m03: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_y2026_m04: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_y2026_m05: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log_y2026_m06: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          details: Json | null
          duration_ms: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          payload_summary: Json | null
          previous_hash: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          source: string | null
          started_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          details?: Json | null
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          payload_summary?: Json | null
          previous_hash?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          source?: string | null
          started_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_config_audit: {
        Row: {
          action_type: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          table_name: string
        }
        Insert: {
          action_type: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          table_name: string
        }
        Update: {
          action_type?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          table_name?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      ai_insights_cache: {
        Row: {
          cache_key: string
          created_at: string
          duration_ms: number | null
          expires_at: string
          function_name: string
          id: string
          model: string | null
          payload: Json
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          duration_ms?: number | null
          expires_at?: string
          function_name: string
          id?: string
          model?: string | null
          payload: Json
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          duration_ms?: number | null
          expires_at?: string
          function_name?: string
          id?: string
          model?: string | null
          payload?: Json
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          created_at: string
          event_type: string
          function_name: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          function_name: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          function_name?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number | null
          function_name: string
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string | null
          output_tokens: number | null
          status: string
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          function_name: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          status?: string
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          function_name?: string
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          status?: string
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_quotas: {
        Row: {
          created_at: string
          id: string
          is_unlimited: boolean
          monthly_limit: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_unlimited?: boolean
          monthly_limit?: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_unlimited?: boolean
          monthly_limit?: number
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      art_file_attachments: {
        Row: {
          created_at: string
          file_extension: string | null
          file_path: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          mockup_id: string | null
          notes: string | null
          original_name: string
          quote_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_extension?: string | null
          file_path: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          mockup_id?: string | null
          notes?: string | null
          original_name: string
          quote_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_extension?: string | null
          file_path?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          mockup_id?: string | null
          notes?: string | null
          original_name?: string
          quote_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_detection_log: {
        Row: {
          blocked: boolean
          created_at: string
          detection_reason: string
          endpoint: string
          id: string
          ip_address: string
          metadata: Json | null
          request_count: number | null
          user_agent: string | null
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          detection_reason: string
          endpoint: string
          id?: string
          ip_address: string
          metadata?: Json | null
          request_count?: number | null
          user_agent?: string | null
        }
        Update: {
          blocked?: boolean
          created_at?: string
          detection_reason?: string
          endpoint?: string
          id?: string
          ip_address?: string
          metadata?: Json | null
          request_count?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          budget: number | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          metadata: Json | null
          product_id: string
          product_image_url: string | null
          product_name: string
          product_price: number
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id: string
          product_image_url?: string | null
          product_name: string
          product_price: number
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id?: string
          product_image_url?: string | null
          product_name?: string
          product_price?: number
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      category_icons: {
        Row: {
          category_name: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category_name: string
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category_name?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      city_whitelist: {
        Row: {
          city_name: string
          country_code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          state: string | null
          updated_at: string
        }
        Insert: {
          city_name: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          state?: string | null
          updated_at?: string
        }
        Update: {
          city_name?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_banners: {
        Row: {
          created_at: string | null
          end_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          position: string | null
          sort_order: number | null
          start_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          position?: string | null
          sort_order?: number | null
          start_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          position?: string | null
          sort_order?: number | null
          start_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cms_config: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      cms_sections: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      collection_item_reactions: {
        Row: {
          anon_id: string
          collection_id: string
          created_at: string
          emoji: string
          id: string
          ip_hash: string | null
          item_id: string
          user_agent: string | null
        }
        Insert: {
          anon_id: string
          collection_id: string
          created_at?: string
          emoji: string
          id?: string
          ip_hash?: string | null
          item_id: string
          user_agent?: string | null
        }
        Update: {
          anon_id?: string
          collection_id?: string
          created_at?: string
          emoji?: string
          id?: string
          ip_hash?: string | null
          item_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          collection_id: string
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          notes: string | null
          price_at_save: number | null
          product_id: string
          sort_order: number | null
          thumbnail_url: string | null
        }
        Insert: {
          collection_id: string
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price_at_save?: number | null
          product_id: string
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          collection_id?: string
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price_at_save?: number | null
          product_id?: string
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items_trash: {
        Row: {
          collection_id: string
          color_hex: string | null
          color_name: string | null
          deleted_at: string
          expires_at: string
          id: string
          notes: string | null
          original_id: string
          price_at_save: number | null
          product_id: string
          sort_order: number | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          collection_id: string
          color_hex?: string | null
          color_name?: string | null
          deleted_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          original_id: string
          price_at_save?: number | null
          product_id: string
          sort_order?: number | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          collection_id?: string
          color_hex?: string | null
          color_name?: string | null
          deleted_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          original_id?: string
          price_at_save?: number | null
          product_id?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          description: string | null
          icon: string | null
          icon_color: string | null
          id: string
          is_featured: boolean
          is_public: boolean
          name: string
          share_expires_at: string | null
          share_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          name: string
          share_expires_at?: string | null
          share_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          name?: string
          share_expires_at?: string | null
          share_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comparison_reactions: {
        Row: {
          anon_id: string
          comparison_id: string
          created_at: string
          emoji: string
          id: string
          ip_hash: string | null
          item_index: number
          user_agent: string | null
        }
        Insert: {
          anon_id: string
          comparison_id: string
          created_at?: string
          emoji: string
          id?: string
          ip_hash?: string | null
          item_index?: number
          user_agent?: string | null
        }
        Update: {
          anon_id?: string
          comparison_id?: string
          created_at?: string
          emoji?: string
          id?: string
          ip_hash?: string | null
          item_index?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comparison_reactions_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "user_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      component_media: {
        Row: {
          component_id: string
          created_at: string
          id: string
          is_cover: boolean | null
          media_type: string
          product_id: string
          sort_order: number | null
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          is_cover?: boolean | null
          media_type?: string
          product_id: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          is_cover?: boolean | null
          media_type?: string
          product_id?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      connection_test_history: {
        Row: {
          attempts: number
          connection_id: string
          created_at: string
          dns_ms: number | null
          download_ms: number | null
          error_kind: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          request_method: string | null
          request_url: string | null
          response_body: string | null
          response_headers: Json | null
          status_code: number | null
          success: boolean
          tcp_ms: number | null
          tested_at: string
          tls_ms: number | null
          triggered_by: string
          triggered_by_user_id: string | null
          ttfb_ms: number | null
        }
        Insert: {
          attempts?: number
          connection_id: string
          created_at?: string
          dns_ms?: number | null
          download_ms?: number | null
          error_kind?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          request_method?: string | null
          request_url?: string | null
          response_body?: string | null
          response_headers?: Json | null
          status_code?: number | null
          success?: boolean
          tcp_ms?: number | null
          tested_at?: string
          tls_ms?: number | null
          triggered_by?: string
          triggered_by_user_id?: string | null
          ttfb_ms?: number | null
        }
        Update: {
          attempts?: number
          connection_id?: string
          created_at?: string
          dns_ms?: number | null
          download_ms?: number | null
          error_kind?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          request_method?: string | null
          request_url?: string | null
          response_body?: string | null
          response_headers?: Json | null
          status_code?: number | null
          success?: boolean
          tcp_ms?: number | null
          tested_at?: string
          tls_ms?: number | null
          triggered_by?: string
          triggered_by_user_id?: string | null
          ttfb_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_test_history_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "external_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperativa_budgets: {
        Row: {
          ano: number
          cooperativa_id: string
          created_at: string
          id: string
          limite_alcada: number | null
          mes: number
          observacoes: string | null
          updated_at: string
          verba_total: number
        }
        Insert: {
          ano: number
          cooperativa_id: string
          created_at?: string
          id?: string
          limite_alcada?: number | null
          mes: number
          observacoes?: string | null
          updated_at?: string
          verba_total?: number
        }
        Update: {
          ano?: number
          cooperativa_id?: string
          created_at?: string
          id?: string
          limite_alcada?: number | null
          mes?: number
          observacoes?: string | null
          updated_at?: string
          verba_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cooperativa_budgets_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooperativa_budgets_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["singular_id"]
          },
        ]
      }
      cooperativas: {
        Row: {
          address: string | null
          alcada_superior_threshold: number | null
          central_id: string | null
          cidade: string | null
          cnpj: string | null
          codigo: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          nome: string
          phone: string | null
          sicoob_tema_id: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          alcada_superior_threshold?: number | null
          central_id?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          nome: string
          phone?: string | null
          sicoob_tema_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          alcada_superior_threshold?: number | null
          central_id?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          nome?: string
          phone?: string | null
          sicoob_tema_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperativas_central_id_fkey"
            columns: ["central_id"]
            isOneToOne: false
            referencedRelation: "sicoob_centrais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooperativas_central_id_fkey"
            columns: ["central_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["central_id"]
          },
          {
            foreignKeyName: "cooperativas_sicoob_tema_id_fkey"
            columns: ["sicoob_tema_id"]
            isOneToOne: false
            referencedRelation: "sicoob_temas"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperativas_parceiras: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          registration_number: string | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          registration_number?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          registration_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_purchase_amount: number | null
          starts_at: string | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_purchase_amount?: number | null
          starts_at?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_purchase_amount?: number | null
          starts_at?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      custom_kits: {
        Row: {
          box_data: Json | null
          box_price: number
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_favorite: boolean
          is_pinned: boolean
          items_data: Json
          items_price: number
          kit_quantity: number
          kit_type: string
          last_used_at: string | null
          name: string
          personalization_data: Json
          personalization_price: number
          status: string
          tag: string | null
          total_price: number
          updated_at: string
          user_id: string
          volume_usage_percent: number
        }
        Insert: {
          box_data?: Json | null
          box_price?: number
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          items_data?: Json
          items_price?: number
          kit_quantity?: number
          kit_type?: string
          last_used_at?: string | null
          name?: string
          personalization_data?: Json
          personalization_price?: number
          status?: string
          tag?: string | null
          total_price?: number
          updated_at?: string
          user_id: string
          volume_usage_percent?: number
        }
        Update: {
          box_data?: Json | null
          box_price?: number
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          items_data?: Json
          items_price?: number
          kit_quantity?: number
          kit_type?: string
          last_used_at?: string | null
          name?: string
          personalization_data?: Json
          personalization_price?: number
          status?: string
          tag?: string | null
          total_price?: number
          updated_at?: string
          user_id?: string
          volume_usage_percent?: number
        }
        Relationships: []
      }
      device_login_notifications: {
        Row: {
          created_at: string
          device_id: string | null
          email_sent: boolean | null
          id: string
          ip_address: string
          location: string | null
          notification_sent_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          email_sent?: boolean | null
          id?: string
          ip_address: string
          location?: string | null
          notification_sent_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          email_sent?: boolean | null
          id?: string
          ip_address?: string
          location?: string | null
          notification_sent_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_login_notifications_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_known_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_approval_requests: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          created_at: string
          id: string
          max_allowed_percent: number
          quote_id: string
          requested_discount_percent: number
          responded_at: string | null
          seller_id: string
          seller_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          created_at?: string
          id?: string
          max_allowed_percent: number
          quote_id: string
          requested_discount_percent: number
          responded_at?: string | null
          seller_id: string
          seller_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          created_at?: string
          id?: string
          max_allowed_percent?: number
          quote_id?: string
          requested_discount_percent?: number
          responded_at?: string | null
          seller_id?: string
          seller_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_approval_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      e2e_cleanup_audit: {
        Row: {
          created_at: string
          deleted_by_table: Json
          dry_run: boolean
          duration_ms: number
          email: string
          errors: Json
          id: string
          ip: string | null
          name_filter_prefix: string | null
          reason: string | null
          seller_id: string | null
          seller_scope: string | null
          status: string
          total_deleted: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_by_table?: Json
          dry_run?: boolean
          duration_ms?: number
          email: string
          errors?: Json
          id?: string
          ip?: string | null
          name_filter_prefix?: string | null
          reason?: string | null
          seller_id?: string | null
          seller_scope?: string | null
          status: string
          total_deleted?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_by_table?: Json
          dry_run?: boolean
          duration_ms?: number
          email?: string
          errors?: Json
          id?: string
          ip?: string | null
          name_filter_prefix?: string | null
          reason?: string | null
          seller_id?: string | null
          seller_scope?: string | null
          status?: string
          total_deleted?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      e2e_cleanup_rate_limit: {
        Row: {
          count: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      expert_conversations: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          seller_id: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          seller_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          seller_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      expert_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "expert_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      export_audit_log: {
        Row: {
          created_at: string | null
          export_type: string | null
          file_url: string | null
          filters: Json | null
          id: string
          job_id: string | null
          record_count: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          export_type?: string | null
          file_url?: string | null
          filters?: Json | null
          id?: string
          job_id?: string | null
          record_count?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          export_type?: string | null
          file_url?: string | null
          filters?: Json | null
          id?: string
          job_id?: string | null
          record_count?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_audit_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "export_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          attempts: number | null
          created_at: string | null
          entity_type: string
          error_message: string | null
          export_type: string
          file_url: string | null
          filters: Json | null
          id: string
          max_attempts: number | null
          status: string
          total_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          entity_type: string
          error_message?: string | null
          export_type: string
          file_url?: string | null
          filters?: Json | null
          id?: string
          max_attempts?: number | null
          status?: string
          total_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          entity_type?: string
          error_message?: string | null
          export_type?: string
          file_url?: string | null
          filters?: Json | null
          id?: string
          max_attempts?: number | null
          status?: string
          total_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      external_connections: {
        Row: {
          auto_test_enabled: boolean
          config: Json
          created_at: string
          created_by: string
          env_key: string | null
          id: string
          last_latency_ms: number | null
          last_test_at: string | null
          last_test_message: string | null
          last_test_ok: boolean | null
          name: string
          secret_refs: string[]
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          auto_test_enabled?: boolean
          config?: Json
          created_at?: string
          created_by: string
          env_key?: string | null
          id?: string
          last_latency_ms?: number | null
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_ok?: boolean | null
          name: string
          secret_refs?: string[]
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          auto_test_enabled?: boolean
          config?: Json
          created_at?: string
          created_by?: string
          env_key?: string | null
          id?: string
          last_latency_ms?: number | null
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_ok?: boolean | null
          name?: string
          secret_refs?: string[]
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      external_connections_sync_log: {
        Row: {
          created_at: string
          created_count: number
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          processed: number
          ran_at: string
          status: string
          trigger_op: string | null
          triggered_by_secret_name: string | null
          triggered_by_user_id: string | null
          updated_count: number
        }
        Insert: {
          created_at?: string
          created_count?: number
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          processed?: number
          ran_at?: string
          status?: string
          trigger_op?: string | null
          triggered_by_secret_name?: string | null
          triggered_by_user_id?: string | null
          updated_count?: number
        }
        Update: {
          created_at?: string
          created_count?: number
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          processed?: number
          ran_at?: string
          status?: string
          trigger_op?: string | null
          triggered_by_secret_name?: string | null
          triggered_by_user_id?: string | null
          updated_count?: number
        }
        Relationships: []
      }
      favorite_item_reactions: {
        Row: {
          anon_id: string
          created_at: string
          emoji: string
          id: string
          ip_hash: string | null
          item_id: string
          list_id: string
          user_agent: string | null
        }
        Insert: {
          anon_id: string
          created_at?: string
          emoji: string
          id?: string
          ip_hash?: string | null
          item_id: string
          list_id: string
          user_agent?: string | null
        }
        Update: {
          anon_id?: string
          created_at?: string
          emoji?: string
          id?: string
          ip_hash?: string | null
          item_id?: string
          list_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorite_item_reactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "favorite_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_item_reactions_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "favorite_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_items: {
        Row: {
          added_at: string
          id: string
          list_id: string
          note: string | null
          position: number
          price_at_save: number | null
          product_id: string
          updated_at: string
          user_id: string
          variant_id: string | null
          variant_info: Json | null
        }
        Insert: {
          added_at?: string
          id?: string
          list_id: string
          note?: string | null
          position?: number
          price_at_save?: number | null
          product_id: string
          updated_at?: string
          user_id: string
          variant_id?: string | null
          variant_info?: Json | null
        }
        Update: {
          added_at?: string
          id?: string
          list_id?: string
          note?: string | null
          position?: number
          price_at_save?: number | null
          product_id?: string
          updated_at?: string
          user_id?: string
          variant_id?: string | null
          variant_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "favorite_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "favorite_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_items_trash: {
        Row: {
          deleted_at: string
          expires_at: string
          id: string
          list_id: string
          note: string | null
          original_id: string
          price_at_save: number | null
          product_id: string
          user_id: string
          variant_id: string | null
          variant_info: Json | null
        }
        Insert: {
          deleted_at?: string
          expires_at?: string
          id?: string
          list_id: string
          note?: string | null
          original_id: string
          price_at_save?: number | null
          product_id: string
          user_id: string
          variant_id?: string | null
          variant_info?: Json | null
        }
        Update: {
          deleted_at?: string
          expires_at?: string
          id?: string
          list_id?: string
          note?: string | null
          original_id?: string
          price_at_save?: number | null
          product_id?: string
          user_id?: string
          variant_id?: string | null
          variant_info?: Json | null
        }
        Relationships: []
      }
      favorite_lists: {
        Row: {
          client_id: string | null
          client_name: string | null
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_archived: boolean
          is_default: boolean
          name: string
          position: number
          shared_expires_at: string | null
          shared_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          position?: number
          shared_expires_at?: string | null
          shared_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          position?: number
          shared_expires_at?: string | null
          shared_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      file_scan_logs: {
        Row: {
          bucket: string
          created_at: string | null
          hash: string
          id: string
          path: string
          scan_result: Json
          status_code: number
          user_id: string | null
        }
        Insert: {
          bucket: string
          created_at?: string | null
          hash: string
          id?: string
          path: string
          scan_result?: Json
          status_code: number
          user_id?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string | null
          hash?: string
          id?: string
          path?: string
          scan_result?: Json
          status_code?: number
          user_id?: string | null
        }
        Relationships: []
      }
      follow_up_reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          is_sent: boolean
          notes: string | null
          quote_id: string
          reminder_type: string
          scheduled_for: string
          seller_id: string
          sent_at: string | null
          title: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          is_sent?: boolean
          notes?: string | null
          quote_id: string
          reminder_type?: string
          scheduled_for: string
          seller_id: string
          sent_at?: string | null
          title?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          is_sent?: boolean
          notes?: string | null
          quote_id?: string
          reminder_type?: string
          scheduled_for?: string
          seller_id?: string
          sent_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      generated_mockups: {
        Row: {
          annotations: Json | null
          client_id: string | null
          client_name: string | null
          colors_count: number | null
          created_at: string
          id: string
          layout_url: string | null
          location_name: string | null
          logo_height_cm: number | null
          logo_url: string | null
          logo_width_cm: number | null
          mockup_url: string | null
          position_x: number | null
          position_y: number | null
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          seller_id: string
          technique_id: string | null
          technique_name: string | null
        }
        Insert: {
          annotations?: Json | null
          client_id?: string | null
          client_name?: string | null
          colors_count?: number | null
          created_at?: string
          id?: string
          layout_url?: string | null
          location_name?: string | null
          logo_height_cm?: number | null
          logo_url?: string | null
          logo_width_cm?: number | null
          mockup_url?: string | null
          position_x?: number | null
          position_y?: number | null
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          seller_id: string
          technique_id?: string | null
          technique_name?: string | null
        }
        Update: {
          annotations?: Json | null
          client_id?: string | null
          client_name?: string | null
          colors_count?: number | null
          created_at?: string
          id?: string
          layout_url?: string | null
          location_name?: string | null
          logo_height_cm?: number | null
          logo_url?: string | null
          logo_width_cm?: number | null
          mockup_url?: string | null
          position_x?: number | null
          position_y?: number | null
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          seller_id?: string
          technique_id?: string | null
          technique_name?: string | null
        }
        Relationships: []
      }
      hardening_health_snapshots: {
        Row: {
          created_at: string
          details: Json
          failures: string[]
          id: string
          max_score: number
          score: number
          snapshot_at: string
        }
        Insert: {
          created_at?: string
          details?: Json
          failures?: string[]
          id?: string
          max_score?: number
          score: number
          snapshot_at?: string
        }
        Update: {
          created_at?: string
          details?: Json
          failures?: string[]
          id?: string
          max_score?: number
          score?: number
          snapshot_at?: string
        }
        Relationships: []
      }
      inbound_webhook_endpoints: {
        Row: {
          active: boolean
          allowed_events: string[]
          created_at: string
          created_by: string
          description: string | null
          hmac_secret_ref: string
          id: string
          last_received_at: string | null
          name: string
          slug: string
          source_system: string
          total_invalid: number
          total_received: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_events?: string[]
          created_at?: string
          created_by: string
          description?: string | null
          hmac_secret_ref: string
          id?: string
          last_received_at?: string | null
          name: string
          slug: string
          source_system: string
          total_invalid?: number
          total_received?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_events?: string[]
          created_at?: string
          created_by?: string
          description?: string | null
          hmac_secret_ref?: string
          id?: string
          last_received_at?: string | null
          name?: string
          slug?: string
          source_system?: string
          total_invalid?: number
          total_received?: number
          updated_at?: string
        }
        Relationships: []
      }
      inbound_webhook_events: {
        Row: {
          endpoint_id: string
          error: string | null
          event_type: string | null
          id: string
          payload: Json | null
          processed: boolean
          received_at: string
          signature_valid: boolean
          source_ip: string | null
        }
        Insert: {
          endpoint_id: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean
          received_at?: string
          signature_valid?: boolean
          source_ip?: string | null
        }
        Update: {
          endpoint_id?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean
          received_at?: string
          signature_valid?: boolean
          source_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_webhook_events_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "inbound_webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          created_at: string
          id: string
          length: number | null
          masked_suffix: string | null
          notes: string | null
          secret_name: string
          secret_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          length?: number | null
          masked_suffix?: string | null
          notes?: string | null
          secret_name: string
          secret_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          length?: number | null
          masked_suffix?: string | null
          notes?: string | null
          secret_name?: string
          secret_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ip_access_control: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          ip_address: string
          list_type: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          ip_address: string
          list_type: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          list_type?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ip_address: string
          is_active: boolean
          label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kit_collaborators: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          invited_email: string | null
          kit_id: string
          permission: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          kit_id: string
          permission?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          kit_id?: string
          permission?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_collaborators_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "custom_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          item_anchor: string | null
          kit_id: string
          parent_id: string | null
          resolved: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          item_anchor?: string | null
          kit_id: string
          parent_id?: string | null
          resolved?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          item_anchor?: string | null
          kit_id?: string
          parent_id?: string | null
          resolved?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_comments_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "custom_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "kit_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_share_tokens: {
        Row: {
          client_email: string | null
          client_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          kit_id: string
          seller_id: string
          status: string
          token: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kit_id: string
          seller_id: string
          status?: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kit_id?: string
          seller_id?: string
          status?: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_share_tokens_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "custom_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_templates: {
        Row: {
          box_data: Json | null
          category: string
          color: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean
          items_data: Json
          name: string
          personalization_data: Json
          tag: string | null
          total_price: number
          updated_at: string
          usage_count: number
          volume_usage_percent: number
        }
        Insert: {
          box_data?: Json | null
          category?: string
          color?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          items_data?: Json
          name: string
          personalization_data?: Json
          tag?: string | null
          total_price?: number
          updated_at?: string
          usage_count?: number
          volume_usage_percent?: number
        }
        Update: {
          box_data?: Json | null
          category?: string
          color?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          items_data?: Json
          name?: string
          personalization_data?: Json
          tag?: string | null
          total_price?: number
          updated_at?: string
          usage_count?: number
          volume_usage_percent?: number
        }
        Relationships: []
      }
      kit_variants: {
        Row: {
          box_data: Json | null
          created_at: string
          id: string
          items_data: Json
          kit_master_id: string
          kit_quantity: number
          label: string
          personalization_data: Json
          sort_order: number
          total_price: number
          updated_at: string
        }
        Insert: {
          box_data?: Json | null
          created_at?: string
          id?: string
          items_data?: Json
          kit_master_id: string
          kit_quantity?: number
          label: string
          personalization_data?: Json
          sort_order?: number
          total_price?: number
          updated_at?: string
        }
        Update: {
          box_data?: Json | null
          created_at?: string
          id?: string
          items_data?: Json
          kit_master_id?: string
          kit_quantity?: number
          label?: string
          personalization_data?: Json
          sort_order?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_variants_kit_master_id_fkey"
            columns: ["kit_master_id"]
            isOneToOne: false
            referencedRelation: "custom_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      limit_increase_requests: {
        Row: {
          approved_by: string | null
          created_at: string | null
          current_limit: number | null
          id: string
          pa_id: string | null
          reason: string | null
          rejection_reason: string | null
          requested_by: string | null
          requested_limit: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          current_limit?: number | null
          id?: string
          pa_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          requested_limit?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          current_limit?: number | null
          id?: string
          pa_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          requested_limit?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "limit_increase_requests_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "postos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "limit_increase_requests_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["pa_id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      magic_up_brand_kits: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          forbidden_words: string[]
          id: string
          logo_urls: Json
          metadata: Json
          notes: string | null
          primary_color: string | null
          required_words: string[]
          secondary_color: string | null
          tone_of_voice: string | null
          updated_at: string
          user_id: string
          visual_style: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          forbidden_words?: string[]
          id?: string
          logo_urls?: Json
          metadata?: Json
          notes?: string | null
          primary_color?: string | null
          required_words?: string[]
          secondary_color?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          user_id: string
          visual_style?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          forbidden_words?: string[]
          id?: string
          logo_urls?: Json
          metadata?: Json
          notes?: string | null
          primary_color?: string | null
          required_words?: string[]
          secondary_color?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          user_id?: string
          visual_style?: string | null
        }
        Relationships: []
      }
      magic_up_campaigns: {
        Row: {
          audience: string | null
          channel: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          cta: string | null
          id: string
          metadata: Json
          objective: string | null
          occasion: string | null
          status: string
          title: string
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string | null
          channel?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          cta?: string | null
          id?: string
          metadata?: Json
          objective?: string | null
          occasion?: string | null
          status?: string
          title?: string
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string | null
          channel?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          cta?: string | null
          id?: string
          metadata?: Json
          objective?: string | null
          occasion?: string | null
          status?: string
          title?: string
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      magic_up_comments: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          generation_id: string
          id: string
          is_public: boolean
          user_id: string
        }
        Insert: {
          author_name?: string
          comment: string
          created_at?: string
          generation_id: string
          id?: string
          is_public?: boolean
          user_id: string
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          generation_id?: string
          id?: string
          is_public?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "magic_up_comments_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "magic_up_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_up_generations: {
        Row: {
          aspect_ratio: string | null
          campaign_id: string | null
          channel: string | null
          client_name: string | null
          copy_pack: Json
          created_at: string
          export_presets: Json
          generated_image_url: string | null
          id: string
          is_favorite: boolean | null
          metadata: Json
          model: string | null
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          prompt_text: string | null
          quality_score: number | null
          scene_category: string | null
          scene_title: string | null
          status: string
          tags: string[]
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          campaign_id?: string | null
          channel?: string | null
          client_name?: string | null
          copy_pack?: Json
          created_at?: string
          export_presets?: Json
          generated_image_url?: string | null
          id?: string
          is_favorite?: boolean | null
          metadata?: Json
          model?: string | null
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          prompt_text?: string | null
          quality_score?: number | null
          scene_category?: string | null
          scene_title?: string | null
          status?: string
          tags?: string[]
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          campaign_id?: string | null
          channel?: string | null
          client_name?: string | null
          copy_pack?: Json
          created_at?: string
          export_presets?: Json
          generated_image_url?: string | null
          id?: string
          is_favorite?: boolean | null
          metadata?: Json
          model?: string | null
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          prompt_text?: string | null
          quality_score?: number | null
          scene_category?: string | null
          scene_title?: string | null
          status?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "magic_up_generations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "magic_up_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_up_public_shares: {
        Row: {
          allow_comments: boolean
          allow_download: boolean
          campaign_id: string | null
          created_at: string
          expires_at: string | null
          generation_id: string | null
          id: string
          metadata: Json
          share_token: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_comments?: boolean
          allow_download?: boolean
          campaign_id?: string | null
          created_at?: string
          expires_at?: string | null
          generation_id?: string | null
          id?: string
          metadata?: Json
          share_token?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_comments?: boolean
          allow_download?: boolean
          campaign_id?: string | null
          created_at?: string
          expires_at?: string | null
          generation_id?: string | null
          id?: string
          metadata?: Json
          share_token?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "magic_up_public_shares_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "magic_up_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_up_public_shares_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "magic_up_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_up_reactions: {
        Row: {
          created_at: string
          generation_id: string
          id: string
          ip_hash: string | null
          reaction_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          generation_id: string
          id?: string
          ip_hash?: string | null
          reaction_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          generation_id?: string
          id?: string
          ip_hash?: string | null
          reaction_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "magic_up_reactions_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "magic_up_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_notification_config: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          slack_enabled: boolean | null
          slack_webhook_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          slack_enabled?: boolean | null
          slack_webhook_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          slack_enabled?: boolean | null
          slack_webhook_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mcp_access_violations: {
        Row: {
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          operation: string | null
          reason: string
          request_id: string | null
          source: string
          target_key_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          operation?: string | null
          reason: string
          request_id?: string | null
          source: string
          target_key_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          operation?: string | null
          reason?: string
          request_id?: string | null
          source?: string
          target_key_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mcp_api_keys: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          rotated_from: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          rotated_from?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          rotated_from?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_api_keys_rotated_from_fkey"
            columns: ["rotated_from"]
            isOneToOne: false
            referencedRelation: "mcp_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_full_grantors: {
        Row: {
          granted_at: string
          granted_by: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mcp_key_auto_revocations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          key_id: string
          reason: string
          revoked_at: string
          source: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          key_id: string
          reason?: string
          revoked_at?: string
          source: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          key_id?: string
          reason?: string
          revoked_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_key_auto_revocations_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "mcp_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      mockup_drafts: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          draft_key: string
          id: string
          logo_data: string | null
          personalization_areas: Json | null
          product_id: string | null
          product_name: string | null
          technique_id: string | null
          technique_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          draft_key?: string
          id?: string
          logo_data?: string | null
          personalization_areas?: Json | null
          product_id?: string | null
          product_name?: string | null
          technique_id?: string | null
          technique_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          draft_key?: string
          id?: string
          logo_data?: string | null
          personalization_areas?: Json | null
          product_id?: string | null
          product_name?: string | null
          technique_id?: string | null
          technique_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mockup_prompt_configs: {
        Row: {
          ai_model: string
          config_key: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          prompt_text: string
          technique_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          ai_model?: string
          config_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          prompt_text: string
          technique_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          ai_model?: string
          config_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          prompt_text?: string
          technique_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      mockup_prompt_history: {
        Row: {
          ai_model: string
          change_notes: string | null
          changed_at: string
          changed_by: string | null
          config_id: string
          config_key: string
          id: string
          new_prompt: string
          old_prompt: string | null
          version: number
        }
        Insert: {
          ai_model: string
          change_notes?: string | null
          changed_at?: string
          changed_by?: string | null
          config_id: string
          config_key: string
          id?: string
          new_prompt: string
          old_prompt?: string | null
          version: number
        }
        Update: {
          ai_model?: string
          change_notes?: string | null
          changed_at?: string
          changed_by?: string | null
          config_id?: string
          config_key?: string
          id?: string
          new_prompt?: string
          old_prompt?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mockup_prompt_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "mockup_prompt_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      mockup_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean
          name: string
          personalization_areas: Json
          product_id: string | null
          product_name: string | null
          technique_id: string | null
          technique_name: string | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          personalization_areas?: Json
          product_id?: string | null
          product_name?: string | null
          technique_id?: string | null
          technique_name?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          personalization_areas?: Json
          product_id?: string | null
          product_name?: string | null
          technique_id?: string | null
          technique_name?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_channels: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          provider_name: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          provider_name: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider_name?: string
        }
        Relationships: []
      }
      notification_digests: {
        Row: {
          content_data: Json
          created_at: string | null
          error_log: string | null
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          content_data: Json
          created_at?: string | null
          error_log?: string | null
          id?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          content_data?: Json
          created_at?: string | null
          error_log?: string | null
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string | null
          error_code: string | null
          execution_time_ms: number | null
          id: string
          provider_response: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_code?: string | null
          execution_time_ms?: number | null
          id?: string
          provider_response?: Json | null
          status: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_code?: string | null
          execution_time_ms?: number | null
          id?: string
          provider_response?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel_priorities: Json | null
          digest_enabled: boolean | null
          digest_frequency: string | null
          dnd_enabled: boolean | null
          dnd_end: string | null
          dnd_start: string | null
          email_enabled: boolean | null
          events_config: Json | null
          push_enabled: boolean | null
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          channel_priorities?: Json | null
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          dnd_enabled?: boolean | null
          dnd_end?: string | null
          dnd_start?: string | null
          email_enabled?: boolean | null
          events_config?: Json | null
          push_enabled?: boolean | null
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          channel_priorities?: Json | null
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          dnd_enabled?: boolean | null
          dnd_end?: string | null
          dnd_start?: string | null
          email_enabled?: boolean | null
          events_config?: Json | null
          push_enabled?: boolean | null
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_data: Json | null
          action_label: string | null
          action_url: string | null
          category: string | null
          channels: string[] | null
          created_at: string | null
          delivered_at: string | null
          delivery_status: Json | null
          expires_at: string | null
          group_count: number | null
          group_key: string | null
          id: string
          is_grouped: boolean | null
          is_read: boolean | null
          message: string
          priority: number | null
          read_at: string | null
          scheduled_for: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          source_system: string
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action_data?: Json | null
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          channels?: string[] | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: Json | null
          expires_at?: string | null
          group_count?: number | null
          group_key?: string | null
          id?: string
          is_grouped?: boolean | null
          is_read?: boolean | null
          message: string
          priority?: number | null
          read_at?: string | null
          scheduled_for?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_system: string
          title: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_data?: Json | null
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          channels?: string[] | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: Json | null
          expires_at?: string | null
          group_count?: number | null
          group_key?: string | null
          id?: string
          is_grouped?: boolean | null
          is_read?: boolean | null
          message?: string
          priority?: number | null
          read_at?: string | null
          scheduled_for?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_system?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      optimization_queue: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          error: string | null
          finished_at: string | null
          guardrail_status: string | null
          id: string
          priority: number
          result: Json | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          error?: string | null
          finished_at?: string | null
          guardrail_status?: string | null
          id?: string
          priority?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          error?: string | null
          finished_at?: string | null
          guardrail_status?: string | null
          id?: string
          priority?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      optimization_queue_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          executed_by: string | null
          guardrail_status: string | null
          id: string
          notes: string | null
          queue_id: string
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          executed_by?: string | null
          guardrail_status?: string | null
          id?: string
          notes?: string | null
          queue_id: string
          status: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          executed_by?: string | null
          guardrail_status?: string | null
          id?: string
          notes?: string | null
          queue_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimization_queue_runs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "optimization_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      order_approval_history: {
        Row: {
          approver_id: string | null
          created_at: string | null
          decision: string
          id: string
          order_id: string | null
          reason: string | null
          subtotal_at_time: number | null
          threshold_at_time: number | null
        }
        Insert: {
          approver_id?: string | null
          created_at?: string | null
          decision: string
          id?: string
          order_id?: string | null
          reason?: string | null
          subtotal_at_time?: number | null
          threshold_at_time?: number | null
        }
        Update: {
          approver_id?: string | null
          created_at?: string | null
          decision?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          subtotal_at_time?: number | null
          threshold_at_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_approval_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_audit_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          category: string | null
          created_by_name: string | null
          description: string
          event_category: string
          event_type: string
          id: string
          metadata: Json | null
          observations: string | null
          occurred_at: string
          order_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          category?: string | null
          created_by_name?: string | null
          description: string
          event_category: string
          event_type: string
          id?: string
          metadata?: Json | null
          observations?: string | null
          occurred_at?: string
          order_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          category?: string | null
          created_by_name?: string | null
          description?: string
          event_category?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          observations?: string | null
          occurred_at?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_audit_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_comments: {
        Row: {
          attachments: Json | null
          author_id: string
          author_role: string | null
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_internal: boolean
          order_id: string
          parent_id: string | null
          read_by: Json | null
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          author_role?: string | null
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_internal?: boolean
          order_id: string
          parent_id?: string | null
          read_by?: Json | null
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          author_role?: string | null
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_internal?: boolean
          order_id?: string
          parent_id?: string | null
          read_by?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_comments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "order_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_invoices: {
        Row: {
          access_key: string | null
          amount: number
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string | null
          notes: string | null
          order_id: string
          pdf_url: string | null
          serie: string | null
          status: string
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          access_key?: string | null
          amount: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string | null
          notes?: string | null
          order_id: string
          pdf_url?: string | null
          serie?: string | null
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          access_key?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          notes?: string | null
          order_id?: string
          pdf_url?: string | null
          serie?: string | null
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_consolidations: {
        Row: {
          consolidated_by: string | null
          created_at: string | null
          id: string
          idempotency_key: string | null
          order_count: number
          received_at: string | null
          singular_id: string
          status: string
          total_value: number
          updated_at: string | null
          vendedor_id: string
        }
        Insert: {
          consolidated_by?: string | null
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          order_count?: number
          received_at?: string | null
          singular_id: string
          status?: string
          total_value?: number
          updated_at?: string | null
          vendedor_id: string
        }
        Update: {
          consolidated_by?: string | null
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          order_count?: number
          received_at?: string | null
          singular_id?: string
          status?: string
          total_value?: number
          updated_at?: string | null
          vendedor_id?: string
        }
        Relationships: []
      }
      order_consolidation_orders: {
        Row: {
          consolidation_id: string
          created_at: string
          order_id: string
          order_total_snapshot: number
        }
        Insert: {
          consolidation_id: string
          created_at?: string
          order_id: string
          order_total_snapshot: number
        }
        Update: {
          consolidation_id?: string
          created_at?: string
          order_id?: string
          order_total_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_consolidation_orders_consolidation_id_fkey"
            columns: ["consolidation_id"]
            isOneToOne: false
            referencedRelation: "order_consolidations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_consolidation_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "sicoob_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          organization_id: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          product_sku: string | null
          quantity: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          organization_id?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string | null
          product_sku?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          organization_id?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string | null
          product_sku?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_logistics: {
        Row: {
          actual_delivery: string | null
          carrier_name: string | null
          created_at: string | null
          delivery_photo_url: string | null
          delivery_status: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          order_id: string
          tracking_code: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery?: string | null
          carrier_name?: string | null
          created_at?: string | null
          delivery_photo_url?: string | null
          delivery_status?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_id: string
          tracking_code?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery?: string | null
          carrier_name?: string | null
          created_at?: string | null
          delivery_photo_url?: string | null
          delivery_status?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          tracking_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_logistics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_logistics_tracking: {
        Row: {
          actual_delivery_at: string | null
          carrier: string | null
          carrier_url: string | null
          created_at: string
          created_by: string | null
          delivery_photo_url: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          order_id: string
          recipient_name: string | null
          tracking_code: string | null
          updated_at: string
          volumes: number | null
          weight_kg: number | null
        }
        Insert: {
          actual_delivery_at?: string | null
          carrier?: string | null
          carrier_url?: string | null
          created_at?: string
          created_by?: string | null
          delivery_photo_url?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_id: string
          recipient_name?: string | null
          tracking_code?: string | null
          updated_at?: string
          volumes?: number | null
          weight_kg?: number | null
        }
        Update: {
          actual_delivery_at?: string | null
          carrier?: string | null
          carrier_url?: string | null
          created_at?: string
          created_by?: string | null
          delivery_photo_url?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          recipient_name?: string | null
          tracking_code?: string | null
          updated_at?: string
          volumes?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_logistics_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          order_id: string
          payment_date: string
          payment_method: string
          receipt_url: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id: string
          payment_date: string
          payment_method: string
          receipt_url?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id?: string
          payment_date?: string
          payment_method?: string
          receipt_url?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "order_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_pilot_approvals: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mockup_thumbnail_url: string | null
          mockup_url: string
          order_id: string
          order_item_id: string | null
          parent_approval_id: string | null
          reviewed_at: string | null
          reviewer_name: string | null
          reviewer_notes: string | null
          revision_round: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mockup_thumbnail_url?: string | null
          mockup_url: string
          order_id: string
          order_item_id?: string | null
          parent_approval_id?: string | null
          reviewed_at?: string | null
          reviewer_name?: string | null
          reviewer_notes?: string | null
          revision_round?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mockup_thumbnail_url?: string | null
          mockup_url?: string
          order_id?: string
          order_item_id?: string | null
          parent_approval_id?: string | null
          reviewed_at?: string | null
          reviewer_name?: string | null
          reviewer_notes?: string | null
          revision_round?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_pilot_approvals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pilot_approvals_parent_approval_id_fkey"
            columns: ["parent_approval_id"]
            isOneToOne: false
            referencedRelation: "order_pilot_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      order_template_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          position: number
          product_id: string
          product_name: string | null
          quantity: number
          template_id: string
          unit_price: number | null
          variant_sku: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          product_id: string
          product_name?: string | null
          quantity: number
          template_id: string
          unit_price?: number | null
          variant_sku?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          product_id?: string
          product_name?: string | null
          quantity?: number
          template_id?: string
          unit_price?: number | null
          variant_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "order_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      order_templates: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean
          last_used_at: string | null
          name: string
          source_order_id: string | null
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          name: string
          source_order_id?: string | null
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          name?: string
          source_order_id?: string | null
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_templates_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_company: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          delivery_photo_url: string | null
          delivery_time: string | null
          discount_amount: number | null
          fulfillment_status: string
          id: string
          internal_notes: string | null
          notes: string | null
          order_number: string
          organization_id: string | null
          payment_terms: string | null
          quote_id: string | null
          seller_id: string
          shipping_carrier: string | null
          shipping_cost: number | null
          shipping_delivery_forecast: string | null
          shipping_type: string | null
          status: string
          subtotal: number | null
          total: number | null
          tracking_number: string | null
          updated_at: string
          version: number
        }
        Insert: {
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_photo_url?: string | null
          delivery_time?: string | null
          discount_amount?: number | null
          fulfillment_status?: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          organization_id?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          seller_id: string
          shipping_carrier?: string | null
          shipping_cost?: number | null
          shipping_delivery_forecast?: string | null
          shipping_type?: string | null
          status?: string
          subtotal?: number | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_photo_url?: string | null
          delivery_time?: string | null
          discount_amount?: number | null
          fulfillment_status?: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          organization_id?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          seller_id?: string
          shipping_carrier?: string | null
          shipping_cost?: number | null
          shipping_delivery_forecast?: string | null
          shipping_type?: string | null
          status?: string
          subtotal?: number | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
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
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      outbound_webhooks: {
        Row: {
          active: boolean
          auto_disabled_at: string | null
          auto_disabled_reason: string | null
          consecutive_failures: number
          created_at: string
          created_by: string
          description: string | null
          events: string[]
          id: string
          last_triggered_at: string | null
          name: string
          retry_policy: Json
          secret_ref: string | null
          total_failure: number
          total_success: number
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          auto_disabled_at?: string | null
          auto_disabled_reason?: string | null
          consecutive_failures?: number
          created_at?: string
          created_by: string
          description?: string | null
          events?: string[]
          id?: string
          last_triggered_at?: string | null
          name: string
          retry_policy?: Json
          secret_ref?: string | null
          total_failure?: number
          total_success?: number
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          auto_disabled_at?: string | null
          auto_disabled_reason?: string | null
          consecutive_failures?: number
          created_at?: string
          created_by?: string
          description?: string | null
          events?: string[]
          id?: string
          last_triggered_at?: string | null
          name?: string
          retry_policy?: Json
          secret_ref?: string | null
          total_failure?: number
          total_success?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      ownership_audit_reports: {
        Row: {
          details: Json
          duration_ms: number | null
          generated_at: string
          id: string
          missing_user_count: number
          null_owner_count: number
          rls_coverage: Json
          rls_gaps_count: number
          total_issues_found: number
          total_tables_scanned: number
          triggered_by: string
        }
        Insert: {
          details?: Json
          duration_ms?: number | null
          generated_at?: string
          id?: string
          missing_user_count?: number
          null_owner_count?: number
          rls_coverage?: Json
          rls_gaps_count?: number
          total_issues_found?: number
          total_tables_scanned?: number
          triggered_by?: string
        }
        Update: {
          details?: Json
          duration_ms?: number | null
          generated_at?: string
          id?: string
          missing_user_count?: number
          null_owner_count?: number
          rls_coverage?: Json
          rls_gaps_count?: number
          total_issues_found?: number
          total_tables_scanned?: number
          triggered_by?: string
        }
        Relationships: []
      }
      ownership_repair_logs: {
        Row: {
          action: string
          created_at: string
          dry_run: boolean
          error_message: string | null
          id: string
          issue_type: string
          notes: string | null
          owner_column: string
          report_id: string | null
          rows_affected: number
          table_name: string
          triggered_by: string | null
          triggered_by_label: string | null
        }
        Insert: {
          action: string
          created_at?: string
          dry_run?: boolean
          error_message?: string | null
          id?: string
          issue_type: string
          notes?: string | null
          owner_column: string
          report_id?: string | null
          rows_affected?: number
          table_name: string
          triggered_by?: string | null
          triggered_by_label?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          dry_run?: boolean
          error_message?: string | null
          id?: string
          issue_type?: string
          notes?: string | null
          owner_column?: string
          report_id?: string | null
          rows_affected?: number
          table_name?: string
          triggered_by?: string | null
          triggered_by_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_repair_logs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "ownership_audit_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pa_budgets: {
        Row: {
          ano: number
          created_at: string
          id: string
          limite_alcada: number | null
          mes: number
          observacoes: string | null
          pa_id: string
          updated_at: string
          verba_consumida: number
          verba_total: number
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          limite_alcada?: number | null
          mes: number
          observacoes?: string | null
          pa_id: string
          updated_at?: string
          verba_consumida?: number
          verba_total?: number
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          limite_alcada?: number | null
          mes?: number
          observacoes?: string | null
          pa_id?: string
          updated_at?: string
          verba_consumida?: number
          verba_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pa_budgets_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "postos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pa_budgets_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["pa_id"]
          },
        ]
      }
      pa_category_thresholds: {
        Row: {
          category_id: number | null
          created_at: string | null
          id: string
          limite_alcada: number
          pa_id: string | null
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          id?: string
          limite_alcada: number
          pa_id?: string | null
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          id?: string
          limite_alcada?: number
          pa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pa_category_thresholds_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "postos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pa_category_thresholds_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["pa_id"]
          },
        ]
      }
      pa_notification_settings: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          is_active: boolean | null
          pa_id: string
          recipient_email: string | null
          webhook_url: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pa_id: string
          recipient_email?: string | null
          webhook_url?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pa_id?: string
          recipient_email?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pa_notification_settings_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "postos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pa_notification_settings_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["pa_id"]
          },
        ]
      }
      pa_singularidades: {
        Row: {
          central_id: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          central_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          central_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pa_singularidades_central_id_fkey"
            columns: ["central_id"]
            isOneToOne: false
            referencedRelation: "sicoob_centrais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pa_singularidades_central_id_fkey"
            columns: ["central_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["central_id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pontos_atendimento: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          singular_id: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          singular_id?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          singular_id?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pontos_atendimento_singular_id_fkey"
            columns: ["singular_id"]
            isOneToOne: false
            referencedRelation: "pa_singularidades"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          category: string | null
          client_name: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      postos_atendimento: {
        Row: {
          cidade: string | null
          codigo: string
          cooperativa_id: string
          created_at: string
          endereco: string | null
          id: string
          is_active: boolean
          nome: string
          responsavel_user_id: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          codigo: string
          cooperativa_id: string
          created_at?: string
          endereco?: string | null
          id?: string
          is_active?: boolean
          nome: string
          responsavel_user_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          codigo?: string
          cooperativa_id?: string
          created_at?: string
          endereco?: string | null
          id?: string
          is_active?: boolean
          nome?: string
          responsavel_user_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "postos_atendimento_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postos_atendimento_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["singular_id"]
          },
        ]
      }
      price_history: {
        Row: {
          id: string
          price: number
          product_id: string
          recorded_at: string
          variant_id: string | null
        }
        Insert: {
          id?: string
          price: number
          product_id: string
          recorded_at?: string
          variant_id?: string | null
        }
        Update: {
          id?: string
          price?: number
          product_id?: string
          recorded_at?: string
          variant_id?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_component_locations: {
        Row: {
          component_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          location_code: string
          location_name: string
          max_height_cm: number | null
          max_width_cm: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          component_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          location_code: string
          location_name: string
          max_height_cm?: number | null
          max_width_cm?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          component_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          location_code?: string
          location_name?: string
          max_height_cm?: number | null
          max_width_cm?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_component_locations_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "product_components"
            referencedColumns: ["id"]
          },
        ]
      }
      product_components: {
        Row: {
          component_code: string
          component_name: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_personalizable: boolean
          product_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          component_code: string
          component_name: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_personalizable?: boolean
          product_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          component_code?: string
          component_name?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_personalizable?: boolean
          product_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_group_members: {
        Row: {
          created_at: string
          id: string
          product_group_id: string
          product_id: string
          updated_at: string
          use_group_rules: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          product_group_id: string
          product_id: string
          updated_at?: string
          use_group_rules?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          product_group_id?: string
          product_id?: string
          updated_at?: string
          use_group_rules?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_group_members_product_group_id_fkey"
            columns: ["product_group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          group_code: string
          group_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          group_code: string
          group_name: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          group_code?: string
          group_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      product_price_freshness_overrides: {
        Row: {
          created_at: string
          id: string
          product_id: string
          threshold_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          threshold_days: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          threshold_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      product_sync_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          payload: Json | null
          records_failed: number
          records_inserted: number
          records_processed: number
          records_updated: number
          source: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          records_failed?: number
          records_inserted?: number
          records_processed?: number
          records_updated?: number
          source: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          records_failed?: number
          records_inserted?: number
          records_processed?: number
          records_updated?: number
          source?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          seller_id: string | null
          view_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          seller_id?: string | null
          view_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          seller_id?: string | null
          view_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_threshold: number | null
          avatar_url: string | null
          cooperativa_id: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          pa_id: string | null
          phone: string | null
          preferences: Json | null
          quote_preferences: Json | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_threshold?: number | null
          avatar_url?: string | null
          cooperativa_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          pa_id?: string | null
          phone?: string | null
          preferences?: Json | null
          quote_preferences?: Json | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_threshold?: number | null
          avatar_url?: string | null
          cooperativa_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          pa_id?: string | null
          phone?: string | null
          preferences?: Json | null
          quote_preferences?: Json | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["singular_id"]
          },
          {
            foreignKeyName: "profiles_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "postos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["pa_id"]
          },
        ]
      }
      public_token_failures: {
        Row: {
          attempted_token: string | null
          created_at: string
          id: string
          ip_address: string | null
          reason: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          attempted_token?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          attempted_token?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      qa_release_evidences: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          release_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          release_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          release_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_release_evidences_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "qa_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_releases: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          updated_at: string | null
          version_tag: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          version_tag: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          version_tag?: string
        }
        Relationships: []
      }
      qa_rls_audits: {
        Row: {
          audited_at: string | null
          id: string
          metadata: Json | null
          score: number
          tables_missing_rls: string[] | null
          tables_permissive_rls: string[] | null
          tables_total: number
          tables_with_rls: number
        }
        Insert: {
          audited_at?: string | null
          id?: string
          metadata?: Json | null
          score: number
          tables_missing_rls?: string[] | null
          tables_permissive_rls?: string[] | null
          tables_total: number
          tables_with_rls: number
        }
        Update: {
          audited_at?: string | null
          id?: string
          metadata?: Json | null
          score?: number
          tables_missing_rls?: string[] | null
          tables_permissive_rls?: string[] | null
          tables_total?: number
          tables_with_rls?: number
        }
        Relationships: []
      }
      qa_run_steps: {
        Row: {
          created_at: string | null
          id: string
          observations: string | null
          run_id: string | null
          status: string
          step_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          observations?: string | null
          run_id?: string | null
          status: string
          step_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          observations?: string | null
          run_id?: string | null
          status?: string
          step_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "qa_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_runs: {
        Row: {
          error: string | null
          executed_by: string | null
          finished_at: string | null
          id: string
          persona: string | null
          report: Json | null
          scenario: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          error?: string | null
          executed_by?: string | null
          finished_at?: string | null
          id?: string
          persona?: string | null
          report?: Json | null
          scenario?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          error?: string | null
          executed_by?: string | null
          finished_at?: string | null
          id?: string
          persona?: string | null
          report?: Json | null
          scenario?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      query_telemetry: {
        Row: {
          cache_hit: boolean
          count_mode: string | null
          created_at: string
          duration_ms: number
          error_code: string | null
          error_kind: string | null
          error_message: string | null
          id: string
          is_503: boolean
          is_cold_start: boolean
          is_rls_violation: boolean | null
          operation: string
          query_limit: number | null
          query_offset: number | null
          record_count: number | null
          request_id: string | null
          retry_count: number
          rls_blocked_count: number | null
          rpc_name: string | null
          severity: string
          table_name: string | null
          trace_id: string | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean
          count_mode?: string | null
          created_at?: string
          duration_ms: number
          error_code?: string | null
          error_kind?: string | null
          error_message?: string | null
          id?: string
          is_503?: boolean
          is_cold_start?: boolean
          is_rls_violation?: boolean | null
          operation: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          request_id?: string | null
          retry_count?: number
          rls_blocked_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_code?: string | null
          error_kind?: string | null
          error_message?: string | null
          id?: string
          is_503?: boolean
          is_cold_start?: boolean
          is_rls_violation?: boolean | null
          operation?: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          request_id?: string | null
          retry_count?: number
          rls_blocked_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quote_approval_tokens: {
        Row: {
          client_email: string | null
          client_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          quote_id: string
          responded_at: string | null
          response: string | null
          response_notes: string | null
          seller_id: string
          signature_hash: string | null
          signed_at: string | null
          signer_document: string | null
          signer_ip: string | null
          signer_name: string | null
          signer_user_agent: string | null
          status: string
          token: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          quote_id: string
          responded_at?: string | null
          response?: string | null
          response_notes?: string | null
          seller_id: string
          signature_hash?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_user_agent?: string | null
          status?: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          quote_id?: string
          responded_at?: string | null
          response?: string | null
          response_notes?: string | null
          seller_id?: string
          signature_hash?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_user_agent?: string | null
          status?: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      quote_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          quote_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          quote_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          quote_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_audit_logs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_edited: boolean
          parent_id: string | null
          quote_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          quote_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          quote_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "quote_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_consolidations: {
        Row: {
          consolidated_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          singular_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          consolidated_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          singular_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          consolidated_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          singular_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_consolidations_singular_id_fkey"
            columns: ["singular_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_consolidations_singular_id_fkey"
            columns: ["singular_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["singular_id"]
          },
        ]
      }
      quote_history: {
        Row: {
          action: string
          created_at: string
          description: string | null
          field_changed: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          quote_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          quote_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          quote_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_item_personalizations: {
        Row: {
          area_cm2: number | null
          colors_count: number | null
          created_at: string
          height_cm: number | null
          id: string
          notes: string | null
          personalized_quantity: number | null
          positions_count: number | null
          quote_item_id: string
          setup_cost: number | null
          technique_id: string | null
          technique_name: string | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
          width_cm: number | null
        }
        Insert: {
          area_cm2?: number | null
          colors_count?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          notes?: string | null
          personalized_quantity?: number | null
          positions_count?: number | null
          quote_item_id: string
          setup_cost?: number | null
          technique_id?: string | null
          technique_name?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          width_cm?: number | null
        }
        Update: {
          area_cm2?: number | null
          colors_count?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          notes?: string | null
          personalized_quantity?: number | null
          positions_count?: number | null
          quote_item_id?: string
          setup_cost?: number | null
          technique_id?: string | null
          technique_name?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_item_personalizations_quote_item_id_fkey"
            columns: ["quote_item_id"]
            isOneToOne: false
            referencedRelation: "quote_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          catalog_checked_at: string | null
          color_hex: string | null
          color_name: string | null
          created_at: string
          display_order: number | null
          gender: string | null
          id: string
          kit_group_id: string | null
          kit_name: string | null
          notes: string | null
          price_confirmed_at: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          quote_id: string
          size_code: string | null
          source_variant_id: string | null
          source_variant_sku: string | null
          sort_order: number | null
          subtotal: number | null
          unit_cost: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          catalog_checked_at?: string | null
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          display_order?: number | null
          gender?: string | null
          id?: string
          kit_group_id?: string | null
          kit_name?: string | null
          notes?: string | null
          price_confirmed_at?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          product_sku?: string | null
          quantity?: number
          quote_id: string
          size_code?: string | null
          source_variant_id?: string | null
          source_variant_sku?: string | null
          sort_order?: number | null
          subtotal?: number | null
          unit_cost?: number | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          catalog_checked_at?: string | null
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          display_order?: number | null
          gender?: string | null
          id?: string
          kit_group_id?: string | null
          kit_name?: string | null
          notes?: string | null
          price_confirmed_at?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          quote_id?: string
          size_code?: string | null
          source_variant_id?: string | null
          source_variant_sku?: string | null
          sort_order?: number | null
          subtotal?: number | null
          unit_cost?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          delivery_time: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          internal_notes: string | null
          is_default: boolean | null
          is_public: boolean | null
          items_data: Json | null
          name: string
          notes: string | null
          payment_terms: string | null
          seller_id: string
          template_data: Json | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          delivery_time?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          internal_notes?: string | null
          is_default?: boolean | null
          is_public?: boolean | null
          items_data?: Json | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          seller_id: string
          template_data?: Json | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          delivery_time?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          internal_notes?: string | null
          is_default?: boolean | null
          is_public?: boolean | null
          items_data?: Json | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          seller_id?: string
          template_data?: Json | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_pdf_url: string | null
          bitrix_deal_id: string | null
          bitrix_quote_id: string | null
          client_cnpj: string | null
          client_company: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          client_response: string | null
          client_response_at: string | null
          client_response_notes: string | null
          consolidation_id: string | null
          created_at: string
          deleted_at: string | null
          delivery_time: string | null
          discount_amount: number
          discount_percent: number
          id: string
          internal_notes: string | null
          is_active: boolean | null
          is_latest_version: boolean
          negotiation_markup_percent: number
          notes: string | null
          organization_id: string | null
          pa_id: string | null
          parent_quote_id: string | null
          payment_terms: string | null
          quote_number: string
          real_discount_percent: number | null
          real_subtotal: number | null
          rejection_notes: string | null
          row_version: number
          seller_id: string
          sent_at: string | null
          shipping_cost: number | null
          shipping_type: string | null
          singular_id: string | null
          status: string
          subtotal: number
          suggested_modifications: Json | null
          synced_at: string | null
          synced_to_bitrix: boolean | null
          tags: string[] | null
          total: number
          total_cost: number | null
          updated_at: string
          valid_until: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_pdf_url?: string | null
          bitrix_deal_id?: string | null
          bitrix_quote_id?: string | null
          client_cnpj?: string | null
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_response?: string | null
          client_response_at?: string | null
          client_response_notes?: string | null
          consolidation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_time?: string | null
          discount_amount?: number
          discount_percent?: number
          id?: string
          internal_notes?: string | null
          is_active?: boolean | null
          is_latest_version?: boolean
          negotiation_markup_percent?: number
          notes?: string | null
          organization_id?: string | null
          pa_id?: string | null
          parent_quote_id?: string | null
          payment_terms?: string | null
          quote_number?: string
          real_discount_percent?: number | null
          real_subtotal?: number | null
          rejection_notes?: string | null
          row_version?: number
          seller_id: string
          sent_at?: string | null
          shipping_cost?: number | null
          shipping_type?: string | null
          singular_id?: string | null
          status?: string
          subtotal?: number
          suggested_modifications?: Json | null
          synced_at?: string | null
          synced_to_bitrix?: boolean | null
          tags?: string[] | null
          total?: number
          total_cost?: number | null
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_pdf_url?: string | null
          bitrix_deal_id?: string | null
          bitrix_quote_id?: string | null
          client_cnpj?: string | null
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_response?: string | null
          client_response_at?: string | null
          client_response_notes?: string | null
          consolidation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_time?: string | null
          discount_amount?: number
          discount_percent?: number
          id?: string
          internal_notes?: string | null
          is_active?: boolean | null
          is_latest_version?: boolean
          negotiation_markup_percent?: number
          notes?: string | null
          organization_id?: string | null
          pa_id?: string | null
          parent_quote_id?: string | null
          payment_terms?: string | null
          quote_number?: string
          real_discount_percent?: number | null
          real_subtotal?: number | null
          rejection_notes?: string | null
          row_version?: number
          seller_id?: string
          sent_at?: string | null
          shipping_cost?: number | null
          shipping_type?: string | null
          singular_id?: string | null
          status?: string
          subtotal?: number
          suggested_modifications?: Json | null
          synced_at?: string | null
          synced_to_bitrix?: boolean | null
          tags?: string[] | null
          total?: number
          total_cost?: number | null
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_consolidation_id_fkey"
            columns: ["consolidation_id"]
            isOneToOne: false
            referencedRelation: "quote_consolidations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "postos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["pa_id"]
          },
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_singular_id_fkey"
            columns: ["singular_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_singular_id_fkey"
            columns: ["singular_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["singular_id"]
          },
        ]
      }
      request_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      rls_denial_log: {
        Row: {
          created_at: string
          endpoint: string | null
          error_code: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          operation: string
          policy_hint: string | null
          query_summary: string | null
          table_name: string
          target_id: string | null
          target_seller_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          operation: string
          policy_hint?: string | null
          query_summary?: string | null
          table_name: string
          target_id?: string | null
          target_seller_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          operation?: string
          policy_hint?: string | null
          query_summary?: string | null
          table_name?: string
          target_id?: string | null
          target_seller_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      role_migration_batches: {
        Row: {
          created_at: string
          dry_run: boolean
          duration_ms: number | null
          failed_count: number
          finished_at: string | null
          id: string
          initiated_by: string
          label: string
          reason: string
          skipped_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["role_migration_status"]
          success_count: number
          total_items: number
        }
        Insert: {
          created_at?: string
          dry_run?: boolean
          duration_ms?: number | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          initiated_by: string
          label: string
          reason: string
          skipped_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["role_migration_status"]
          success_count?: number
          total_items?: number
        }
        Update: {
          created_at?: string
          dry_run?: boolean
          duration_ms?: number | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          initiated_by?: string
          label?: string
          reason?: string
          skipped_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["role_migration_status"]
          success_count?: number
          total_items?: number
        }
        Relationships: []
      }
      role_migration_items: {
        Row: {
          batch_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          from_role: Database["public"]["Enums"]["app_role"] | null
          id: string
          operation: string
          processed_at: string | null
          status: Database["public"]["Enums"]["role_migration_item_status"]
          to_role: Database["public"]["Enums"]["app_role"]
          user_email: string | null
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          from_role?: Database["public"]["Enums"]["app_role"] | null
          id?: string
          operation: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["role_migration_item_status"]
          to_role: Database["public"]["Enums"]["app_role"]
          user_email?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          from_role?: Database["public"]["Enums"]["app_role"] | null
          id?: string
          operation?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["role_migration_item_status"]
          to_role?: Database["public"]["Enums"]["app_role"]
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_migration_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "role_migration_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_code?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          color: string | null
          context: string
          created_at: string
          description: string | null
          filters: Json
          icon: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          context?: string
          created_at?: string
          description?: string | null
          filters?: Json
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          context?: string
          created_at?: string
          description?: string | null
          filters?: Json
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_trends_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_exports: {
        Row: {
          created_at: string | null
          entity_type: string
          export_type: string
          filters: Json | null
          frequency: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          export_type: string
          filters?: Json | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          export_type?: string
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          last_attempt: string | null
          payload: Json
          retry_count: number | null
          scheduled_for: string
          status: string | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt?: string | null
          payload: Json
          retry_count?: number | null
          scheduled_for: string
          status?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt?: string | null
          payload?: Json
          retry_count?: number | null
          scheduled_for?: string
          status?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          created_at: string
          email_to: string
          filters: Json | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          next_run_at: string
          report_name: string
          report_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_to: string
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_run_at?: string
          report_name?: string
          report_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_to?: string
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          next_run_at?: string
          report_name?: string
          report_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_analytics: {
        Row: {
          created_at: string
          id: string
          results_count: number
          search_context: string | null
          search_term: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          results_count?: number
          search_context?: string | null
          search_term: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          results_count?: number
          search_context?: string | null
          search_term?: string
          user_id?: string | null
        }
        Relationships: []
      }
      secret_rotation_log: {
        Row: {
          action_type: string
          id: string
          new_suffix: string | null
          notes: string | null
          previous_suffix: string | null
          rotated_at: string
          rotated_by: string
          secret_name: string
        }
        Insert: {
          action_type?: string
          id?: string
          new_suffix?: string | null
          notes?: string | null
          previous_suffix?: string | null
          rotated_at?: string
          rotated_by: string
          secret_name: string
        }
        Update: {
          action_type?: string
          id?: string
          new_suffix?: string | null
          notes?: string | null
          previous_suffix?: string | null
          rotated_at?: string
          rotated_by?: string
          secret_name?: string
        }
        Relationships: []
      }
      seller_cart_items: {
        Row: {
          cart_id: string
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          product_image_url: string | null
          product_name: string
          product_price: number
          product_sku: string | null
          quantity: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          cart_id: string
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          product_image_url?: string | null
          product_name: string
          product_price?: number
          product_sku?: string | null
          quantity?: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          cart_id?: string
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          product_image_url?: string | null
          product_name?: string
          product_price?: number
          product_sku?: string | null
          quantity?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "seller_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_carts: {
        Row: {
          company_id: string
          company_location: string | null
          company_logo_url: string | null
          company_name: string
          created_at: string
          id: string
          notes: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          company_location?: string | null
          company_logo_url?: string | null
          company_name: string
          created_at?: string
          id?: string
          notes?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_location?: string | null
          company_logo_url?: string | null
          company_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_discount_limits: {
        Row: {
          created_at: string
          id: string
          max_discount_percent: number
          notes: string | null
          set_by: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_discount_percent?: number
          notes?: string | null
          set_by: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_discount_percent?: number
          notes?: string | null
          set_by?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sensitive_access_logs: {
        Row: {
          access_time: string | null
          client_ip: string | null
          columns_accessed: string[] | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          access_time?: string | null
          client_ip?: string | null
          columns_accessed?: string[] | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          access_time?: string | null
          client_ip?: string | null
          columns_accessed?: string[] | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sicoob_approval_policies: {
        Row: {
          cooperative_id: string | null
          created_at: string
          effective_from: string
          effective_until: string | null
          forbid_self_approval: boolean
          id: string
          is_active: boolean
          require_active_membership: boolean
          updated_at: string
          version: string
        }
        Insert: {
          cooperative_id?: string | null
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          forbid_self_approval?: boolean
          id?: string
          is_active?: boolean
          require_active_membership?: boolean
          updated_at?: string
          version: string
        }
        Update: {
          cooperative_id?: string | null
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          forbid_self_approval?: boolean
          id?: string
          is_active?: boolean
          require_active_membership?: boolean
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_approval_policies_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_approval_policies_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["singular_id"]
          },
        ]
      }
      sicoob_approval_requests: {
        Row: {
          amount_at_request: number
          approver_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          order_id: string
          rejection_reason: string | null
          request_reason: string | null
          requester_id: string
          status: string
          threshold_at_request: number
          updated_at: string
        }
        Insert: {
          amount_at_request: number
          approver_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id: string
          rejection_reason?: string | null
          request_reason?: string | null
          requester_id: string
          status?: string
          threshold_at_request: number
          updated_at?: string
        }
        Update: {
          amount_at_request?: number
          approver_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          rejection_reason?: string | null
          request_reason?: string | null
          requester_id?: string
          status?: string
          threshold_at_request?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_approval_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sicoob_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sicoob_centrais: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          region: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sicoob_manager_audit: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          manager_id: string
          order_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          manager_id: string
          order_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          manager_id?: string
          order_id?: string
        }
        Relationships: []
      }
      sicoob_order_history: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          new_status: string
          order_id: string | null
          previous_status: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          new_status: string
          order_id?: string | null
          previous_status?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          new_status?: string
          order_id?: string | null
          previous_status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sicoob_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sicoob_order_item_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          item_id: string
          new_data: Json | null
          old_data: Json | null
          order_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          item_id: string
          new_data?: Json | null
          old_data?: Json | null
          order_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          item_id?: string
          new_data?: Json | null
          old_data?: Json | null
          order_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_order_item_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sicoob_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sicoob_delivery_allocations: {
        Row: {
          damaged_quantity: number
          destination_id: string
          id: string
          missing_quantity: number
          order_item_id: string
          quantity: number
          received_quantity: number
          updated_at: string
        }
        Insert: {
          damaged_quantity?: number
          destination_id: string
          id?: string
          missing_quantity?: number
          order_item_id: string
          quantity: number
          received_quantity?: number
          updated_at?: string
        }
        Update: {
          damaged_quantity?: number
          destination_id?: string
          id?: string
          missing_quantity?: number
          order_item_id?: string
          quantity?: number
          received_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_delivery_allocations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "sicoob_delivery_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_delivery_allocations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "sicoob_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sicoob_delivery_destinations: {
        Row: {
          address_snapshot: Json
          consolidation_id: string
          created_at: string
          destination_name: string
          id: string
          pa_id: string
        }
        Insert: {
          address_snapshot: Json
          consolidation_id: string
          created_at?: string
          destination_name: string
          id?: string
          pa_id: string
        }
        Update: {
          address_snapshot?: Json
          consolidation_id?: string
          created_at?: string
          destination_name?: string
          id?: string
          pa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_delivery_destinations_consolidation_id_fkey"
            columns: ["consolidation_id"]
            isOneToOne: false
            referencedRelation: "order_consolidations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_delivery_destinations_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "postos_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      sicoob_delivery_receipt_events: {
        Row: {
          allocation_id: string
          damaged_quantity: number
          id: string
          missing_quantity: number
          notes: string | null
          received_at: string
          received_by: string
          received_quantity: number
        }
        Insert: {
          allocation_id: string
          damaged_quantity?: number
          id?: string
          missing_quantity?: number
          notes?: string | null
          received_at?: string
          received_by: string
          received_quantity?: number
        }
        Update: {
          allocation_id?: string
          damaged_quantity?: number
          id?: string
          missing_quantity?: number
          notes?: string | null
          received_at?: string
          received_by?: string
          received_quantity?: number
        }
        Relationships: [{
          foreignKeyName: "sicoob_delivery_receipt_events_allocation_id_fkey"
          columns: ["allocation_id"]
          isOneToOne: false
          referencedRelation: "sicoob_delivery_allocations"
          referencedColumns: ["id"]
        }]
      }
      sicoob_order_artwork_versions: {
        Row: {
          created_at: string
          created_by: string
          decided_at: string | null
          decided_by: string | null
          feedback: string | null
          file_path: string
          file_sha256: string
          id: string
          identity_snapshot: Json
          is_latest: boolean
          order_id: string
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          decided_at?: string | null
          decided_by?: string | null
          feedback?: string | null
          file_path: string
          file_sha256: string
          id?: string
          identity_snapshot: Json
          is_latest?: boolean
          order_id: string
          status?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          decided_at?: string | null
          decided_by?: string | null
          feedback?: string | null
          file_path?: string
          file_sha256?: string
          id?: string
          identity_snapshot?: Json
          is_latest?: boolean
          order_id?: string
          status?: string
          version?: number
        }
        Relationships: [{
          foreignKeyName: "sicoob_order_artwork_versions_order_id_fkey"
          columns: ["order_id"]
          isOneToOne: false
          referencedRelation: "sicoob_orders"
          referencedColumns: ["id"]
        }]
      }
      sicoob_order_invoices: {
        Row: {
          access_key: string | null
          amount: number | null
          created_at: string
          created_by: string
          file_path: string
          file_type: string
          id: string
          invoice_number: string
          issued_at: string | null
          order_id: string
        }
        Insert: {
          access_key?: string | null
          amount?: number | null
          created_at?: string
          created_by: string
          file_path: string
          file_type: string
          id?: string
          invoice_number: string
          issued_at?: string | null
          order_id: string
        }
        Update: {
          access_key?: string | null
          amount?: number | null
          created_at?: string
          created_by?: string
          file_path?: string
          file_type?: string
          id?: string
          invoice_number?: string
          issued_at?: string | null
          order_id?: string
        }
        Relationships: [{
          foreignKeyName: "sicoob_order_invoices_order_id_fkey"
          columns: ["order_id"]
          isOneToOne: false
          referencedRelation: "sicoob_orders"
          referencedColumns: ["id"]
        }]
      }
      sicoob_order_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          due_date: string
          external_reference: string | null
          id: string
          installment_number: number
          invoice_id: string | null
          order_id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          due_date: string
          external_reference?: string | null
          id?: string
          installment_number?: number
          invoice_id?: string | null
          order_id: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          due_date?: string
          external_reference?: string | null
          id?: string
          installment_number?: number
          invoice_id?: string | null
          order_id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sicoob_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_order_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sicoob_order_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sicoob_order_items: {
        Row: {
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          order_id: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_sku: string | null
          size_code: string | null
          personalization_snapshot: Json | null
        }
        Insert: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          product_sku?: string | null
          quantity?: number
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_sku?: string | null
          size_code?: string | null
          personalization_snapshot?: Json | null
        }
        Update: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_sku?: string | null
          size_code?: string | null
          personalization_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sicoob_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sicoob_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approval_policy_id: string | null
          approval_policy_version: string | null
          approval_policy_snapshot: Json | null
          audit_remaining_budget: number | null
          cooperative_id: string | null
          consolidation_id: string | null
          created_at: string
          created_by: string | null
          delivery_address: string | null
          id: string
          is_pilot_order: boolean | null
          notes: string | null
          pa_id: string | null
          sla_deadline: string | null
          sla_status: string | null
          status: string
          total_amount: number | null
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approval_policy_id?: string | null
          approval_policy_version?: string | null
          approval_policy_snapshot?: Json | null
          audit_remaining_budget?: number | null
          cooperative_id?: string | null
          consolidation_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          id?: string
          is_pilot_order?: boolean | null
          notes?: string | null
          pa_id?: string | null
          sla_deadline?: string | null
          sla_status?: string | null
          status?: string
          total_amount?: number | null
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approval_policy_id?: string | null
          approval_policy_version?: string | null
          approval_policy_snapshot?: Json | null
          audit_remaining_budget?: number | null
          cooperative_id?: string | null
          consolidation_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          id?: string
          is_pilot_order?: boolean | null
          notes?: string | null
          pa_id?: string | null
          sla_deadline?: string | null
          sla_status?: string | null
          status?: string
          total_amount?: number | null
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sicoob_orders_consolidation_id_fkey"
            columns: ["consolidation_id"]
            isOneToOne: false
            referencedRelation: "order_consolidations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_orders_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_orders_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["singular_id"]
          },
          {
            foreignKeyName: "sicoob_orders_approval_policy_id_fkey"
            columns: ["approval_policy_id"]
            isOneToOne: false
            referencedRelation: "sicoob_approval_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_orders_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "postos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sicoob_orders_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["pa_id"]
          },
        ]
      }
      sicoob_performance_reports: {
        Row: {
          buffers_hit: number | null
          buffers_read: number | null
          executed_at: string | null
          execution_plan: Json
          id: string
          role_tested: string
          table_name: string
          total_time_ms: number | null
        }
        Insert: {
          buffers_hit?: number | null
          buffers_read?: number | null
          executed_at?: string | null
          execution_plan: Json
          id?: string
          role_tested: string
          table_name: string
          total_time_ms?: number | null
        }
        Update: {
          buffers_hit?: number | null
          buffers_read?: number | null
          executed_at?: string | null
          execution_plan?: Json
          id?: string
          role_tested?: string
          table_name?: string
          total_time_ms?: number | null
        }
        Relationships: []
      }
      sicoob_rls_audit_logs: {
        Row: {
          executed_at: string | null
          id: string
          issue_details: string | null
          resolved: boolean | null
          status: string
          table_name: string
        }
        Insert: {
          executed_at?: string | null
          id?: string
          issue_details?: string | null
          resolved?: boolean | null
          status: string
          table_name: string
        }
        Update: {
          executed_at?: string | null
          id?: string
          issue_details?: string | null
          resolved?: boolean | null
          status?: string
          table_name?: string
        }
        Relationships: []
      }
      sicoob_temas: {
        Row: {
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      simulator_wizard_drafts: {
        Row: {
          created_at: string
          id: string
          personalizations: Json
          product_data: Json
          quantity: number
          title: string
          updated_at: string
          user_id: string
          wizard_step: string
        }
        Insert: {
          created_at?: string
          id?: string
          personalizations?: Json
          product_data?: Json
          quantity?: number
          title?: string
          updated_at?: string
          user_id: string
          wizard_step?: string
        }
        Update: {
          created_at?: string
          id?: string
          personalizations?: Json
          product_data?: Json
          quantity?: number
          title?: string
          updated_at?: string
          user_id?: string
          wizard_step?: string
        }
        Relationships: []
      }
      singulares: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      step_up_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["step_up_action"] | null
          challenge_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          target_ref: string | null
          token_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: Database["public"]["Enums"]["step_up_action"] | null
          challenge_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_ref?: string | null
          token_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["step_up_action"] | null
          challenge_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_ref?: string | null
          token_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      step_up_challenges: {
        Row: {
          action: Database["public"]["Enums"]["step_up_action"]
          attempts: number
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          max_attempts: number
          otp_hash: string
          otp_verified: boolean
          password_verified: boolean
          target_ref: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["step_up_action"]
          attempts?: number
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          max_attempts?: number
          otp_hash: string
          otp_verified?: boolean
          password_verified?: boolean
          target_ref?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["step_up_action"]
          attempts?: number
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          max_attempts?: number
          otp_hash?: string
          otp_verified?: boolean
          password_verified?: boolean
          target_ref?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      step_up_tokens: {
        Row: {
          action: Database["public"]["Enums"]["step_up_action"]
          challenge_id: string
          consumed: boolean
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          target_ref: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["step_up_action"]
          challenge_id: string
          consumed?: boolean
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          target_ref?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["step_up_action"]
          challenge_id?: string
          consumed?: boolean
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          target_ref?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_up_tokens_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "step_up_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          severity: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          severity?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          severity?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      telemetry_logs: {
        Row: {
          client_info: Json | null
          created_at: string | null
          event_name: string
          id: string
          metadata: Json | null
          page_path: string | null
          user_id: string | null
        }
        Insert: {
          client_info?: Json | null
          created_at?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          user_id?: string | null
        }
        Update: {
          client_info?: Json | null
          created_at?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      test_suites_runs: {
        Row: {
          executed_at: string | null
          id: string
          metadata: Json | null
          results: Json
          test_type: string
        }
        Insert: {
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          results: Json
          test_type: string
        }
        Update: {
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          results?: Json
          test_type?: string
        }
        Relationships: []
      }
      user_comparisons: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          id: string
          is_public: boolean
          items: Json
          name: string | null
          share_expires_at: string | null
          share_token: string | null
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          items?: Json
          name?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          items?: Json
          name?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      user_known_devices: {
        Row: {
          browser_name: string | null
          created_at: string
          device_fingerprint: string
          device_type: string | null
          first_seen_at: string
          id: string
          ip_address: string
          is_trusted: boolean | null
          last_seen_at: string
          location: string | null
          os_name: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser_name?: string | null
          created_at?: string
          device_fingerprint: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_address: string
          is_trusted?: boolean | null
          last_seen_at?: string
          location?: string | null
          os_name?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser_name?: string | null
          created_at?: string
          device_fingerprint?: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: string
          is_trusted?: boolean | null
          last_seen_at?: string
          location?: string | null
          os_name?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          completed_steps: Json | null
          created_at: string
          current_step: number
          has_completed_tour: boolean
          id: string
          started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string
          current_step?: number
          has_completed_tour?: boolean
          id?: string
          started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string
          current_step?: number
          has_completed_tour?: boolean
          id?: string
          started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          comparison_column_order: Json
          comparison_weights: Json
          created_at: string
          filter_states: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comparison_column_order?: Json
          comparison_weights?: Json
          created_at?: string
          filter_states?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comparison_column_order?: Json
          comparison_weights?: Json
          created_at?: string
          filter_states?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_variant_links: {
        Row: {
          created_at: string
          id: string
          product_id: string
          supplier_code: string | null
          variant_color_hex: string | null
          variant_id: string
          variant_name: string | null
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          supplier_code?: string | null
          variant_color_hex?: string | null
          variant_id: string
          variant_name?: string | null
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          supplier_code?: string | null
          variant_color_hex?: string | null
          variant_id?: string
          variant_name?: string | null
          video_id?: string
        }
        Relationships: []
      }
      voice_command_logs: {
        Row: {
          action: string
          created_at: string
          data: Json | null
          duration_ms: number | null
          id: string
          response: string | null
          success: boolean | null
          transcript: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          data?: Json | null
          duration_ms?: number | null
          id?: string
          response?: string | null
          success?: boolean | null
          transcript: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json | null
          duration_ms?: number | null
          id?: string
          response?: string | null
          success?: boolean | null
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          delivered_at: string
          error_message: string | null
          event: string
          id: string
          payload: Json | null
          payload_hash: string | null
          response_body_truncated: string | null
          status_code: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          attempt?: number
          delivered_at?: string
          error_message?: string | null
          event: string
          id?: string
          payload?: Json | null
          payload_hash?: string | null
          response_body_truncated?: string | null
          status_code?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          attempt?: number
          delivered_at?: string
          error_message?: string | null
          event?: string
          id?: string
          payload?: Json | null
          payload_hash?: string | null
          response_body_truncated?: string | null
          status_code?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "outbound_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_delivery_metrics: {
        Row: {
          attempt: number
          direction: string
          duration_ms: number | null
          endpoint: string | null
          error_class: string | null
          error_message: string | null
          event_type: string | null
          http_status: number | null
          id: string
          metadata: Json
          occurred_at: string
          payload_bytes: number | null
          request_id: string
          source: string
          success: boolean
        }
        Insert: {
          attempt?: number
          direction: string
          duration_ms?: number | null
          endpoint?: string | null
          error_class?: string | null
          error_message?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          metadata?: Json
          occurred_at?: string
          payload_bytes?: number | null
          request_id: string
          source: string
          success: boolean
        }
        Update: {
          attempt?: number
          direction?: string
          duration_ms?: number | null
          endpoint?: string | null
          error_class?: string | null
          error_message?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          metadata?: Json
          occurred_at?: string
          payload_bytes?: number | null
          request_id?: string
          source?: string
          success?: boolean
        }
        Relationships: []
      }
      workspace_notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      sicoob_budget_audit: {
        Row: {
          ano: number | null
          discrepancia: number | null
          mes: number | null
          pa_id: string | null
          pa_nome: string | null
          verba_calculada_pedidos: number | null
          verba_registrada: number | null
          verba_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pa_budgets_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "postos_atendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pa_budgets_pa_id_fkey"
            columns: ["pa_id"]
            isOneToOne: false
            referencedRelation: "v_sicoob_hierarchy"
            referencedColumns: ["pa_id"]
          },
        ]
      }
      telemetry_query_performance: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string | null
          operation: string | null
          severity: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string | null
          operation?: string | null
          severity?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string | null
          operation?: string | null
          severity?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_full_scope_grants: {
        Row: {
          audit_id: string | null
          challenge_id: string | null
          extra: Json | null
          granted_at: string | null
          granted_to_email: string | null
          granted_to_name: string | null
          granted_to_user_id: string | null
          ip_address: unknown
          justification: string | null
          key_expires_at: string | null
          key_id: string | null
          key_prefix: string | null
          operation: string | null
          request_id: string | null
          step_up_action: Database["public"]["Enums"]["step_up_action"] | null
          token_id: string | null
          user_agent: string | null
          verifications_applied: Json | null
        }
        Relationships: []
      }
      v_sicoob_hierarchy: {
        Row: {
          central_color: string | null
          central_id: string | null
          central_name: string | null
          pa_code: string | null
          pa_id: string | null
          pa_name: string | null
          singular_code: string | null
          singular_id: string | null
          singular_name: string | null
          tema_id: string | null
          tema_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cooperativas_sicoob_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "sicoob_temas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _can_act_on_behalf_of_others: { Args: never; Returns: boolean }
      acquire_ai_quota: {
        Args: { _function_name: string; _model: string; _user_id: string }
        Returns: Json
      }
      approve_sicoob_order: {
        Args: { p_manager_id: string; p_order_id: string; p_request_id: string }
        Returns: undefined
      }
      add_sicoob_order_invoice: {
        Args: {
          p_access_key?: string | null
          p_amount?: number | null
          p_file_path: string
          p_file_type: string
          p_invoice_number: string
          p_issued_at?: string | null
          p_order_id: string
        }
        Returns: string
      }
      create_sicoob_order_artwork_version: {
        Args: {
          p_file_path: string
          p_file_sha256: string
          p_identity_snapshot: Json
          p_order_id: string
        }
        Returns: string
      }
      decide_sicoob_order_artwork: {
        Args: { p_artwork_id: string; p_feedback?: string | null; p_status: string }
        Returns: undefined
      }
      record_sicoob_order_payment: {
        Args: {
          p_amount: number
          p_due_date: string
          p_expected_updated_at?: string | null
          p_external_reference?: string | null
          p_installment_number: number
          p_invoice_id?: string | null
          p_order_id: string
          p_payment_method?: string | null
          p_status?: string
        }
        Returns: string
      }
      allocate_sicoob_consolidation_by_order_pa: {
        Args: { p_consolidation_id: string }
        Returns: number
      }
      create_sicoob_order_consolidation: {
        Args: { p_idempotency_key: string; p_order_ids: string[]; p_seller_id: string }
        Returns: string
      }
      dispatch_sicoob_order_consolidation: {
        Args: { p_consolidation_id: string }
        Returns: undefined
      }
      get_sicoob_consolidation_sellers: {
        Args: never
        Returns: { id: string; name: string }[]
      }
      record_sicoob_delivery_receipt: {
        Args: {
          p_allocation_id: string
          p_damaged_quantity?: number
          p_missing_quantity?: number
          p_notes?: string | null
          p_received_quantity?: number
        }
        Returns: string
      }
      reorder_sicoob_order_as_quote: {
        Args: {
          p_actor_id: string
          p_idempotency_key: string
          p_items: Json
          p_order_id: string
        }
        Returns: string
      }
      confirm_sicoob_order: {
        Args: { p_expected_status: string; p_order_id: string }
        Returns: undefined
      }
      prepare_sicoob_order_confirmation: {
        Args: {
          p_comment?: string | null
          p_expected_status: string
          p_order_id: string
        }
        Returns: undefined
      }
      archive_old_admin_audit_logs: { Args: never; Returns: number }
      audit_all_rls_compliance: { Args: never; Returns: Json }
      audit_ownership_orphans: {
        Args: { _triggered_by?: string }
        Returns: string
      }
      audit_rls_coverage: { Args: never; Returns: Json }
      audit_rls_matrix: { Args: never; Returns: Json }
      audit_security_definer_acl: {
        Args: never
        Returns: {
          arguments: string
          function_name: string
          granted_to: string
          problem: string
        }[]
      }
      audit_sicoob_rls_policies: { Args: never; Returns: undefined }
      auto_block_extreme_offenders: { Args: never; Returns: Json }
      auto_revoke_orphan_full_keys: {
        Args: { _source?: string }
        Returns: {
          created_by: string
          key_id: string
          revoked_at: string
        }[]
      }
      can_approve_discount: { Args: { _user_id?: string }; Returns: boolean }
      can_grant_mcp_full: { Args: { _user_id: string }; Returns: boolean }
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      can_manage_connections: { Args: { _user_id?: string }; Returns: boolean }
      can_manage_quotes: { Args: { _user_id?: string }; Returns: boolean }
      can_view_all_sales: { Args: { _user_id?: string }; Returns: boolean }
      can_view_audit_logs: { Args: { _user_id?: string }; Returns: boolean }
      can_view_connections: { Args: { _user_id?: string }; Returns: boolean }
      can_view_telemetry: { Args: { _user_id?: string }; Returns: boolean }
      check_ai_quota: { Args: { _user_id: string }; Returns: Json }
      check_budget_availability: {
        Args: { p_amount: number; p_pa_id: string }
        Returns: {
          has_budget: boolean
          limit_alcada: number
          remaining: number
        }[]
      }
      check_hardening_status: { Args: never; Returns: Json }
      check_ip_access: { Args: { _ip: string }; Returns: string }
      check_mcp_abuse_threshold: {
        Args: { _ip: string; _user_id: string }
        Returns: undefined
      }
      check_migration_status: { Args: never; Returns: Json }
      check_rate_limit: {
        Args: {
          _block_duration_seconds?: number
          _endpoint: string
          _identifier: string
          _max_requests?: number
          _window_seconds?: number
        }
        Returns: Json
      }
      check_security_health: { Args: never; Returns: Json }
      check_sicoob_access_matrix: {
        Args: { _test_role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          can_delete: boolean
          can_insert: boolean
          can_select: boolean
          can_update: boolean
          tablename: string
        }[]
      }
      check_tables_rls: {
        Args: never
        Returns: {
          relname: string
          relrowsecurity: boolean
          schemaname: string
        }[]
      }
      check_telemetry_regression: { Args: never; Returns: Json }
      claim_next_optimization: {
        Args: never
        Returns: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          error: string | null
          finished_at: string | null
          guardrail_status: string | null
          id: string
          priority: number
          result: Json | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "optimization_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cleanup_discount_test_data: { Args: never; Returns: Json }
      cleanup_expired_collection_trash: { Args: never; Returns: number }
      cleanup_expired_favorite_trash: { Args: never; Returns: number }
      cleanup_expired_public_comparisons: { Args: never; Returns: number }
      cleanup_expired_step_up: { Args: never; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      cleanup_security_logs: { Args: never; Returns: Json }
      cleanup_test_auth_orphans: {
        Args: { test_ids: string[] }
        Returns: {
          deleted_id: string
          email: string
        }[]
      }
      cleanup_webhook_logs: { Args: never; Returns: Json }
      complete_optimization: {
        Args: {
          _error?: string
          _guardrail_status?: string
          _id: string
          _notes?: string
          _result?: Json
          _status: string
        }
        Returns: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          error: string | null
          finished_at: string | null
          guardrail_status: string | null
          id: string
          priority: number
          result: Json | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "optimization_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_step_up_token: {
        Args: {
          _expected_action: Database["public"]["Enums"]["step_up_action"]
          _expected_target?: string
          _token: string
        }
        Returns: boolean
      }
      create_organization_with_owner: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
      current_user_cooperativa_id: { Args: never; Returns: string }
      current_user_pa_id: { Args: never; Returns: string }
      e2e_cleanup_check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: {
          allowed: boolean
          current_count: number
          reset_in_seconds: number
        }[]
      }
      enqueue_optimization: {
        Args: {
          _category?: string
          _description?: string
          _priority?: number
          _title: string
        }
        Returns: string
      }
      ensure_default_favorite_list: {
        Args: { _user_id: string }
        Returns: string
      }
      execute_role_migration_batch: {
        Args: {
          _dry_run?: boolean
          _items: Json
          _label: string
          _reason: string
        }
        Returns: string
      }
      generate_sicoob_performance_report: {
        Args: { _role_name: string; _table_name: string }
        Returns: string
      }
      get_app_health_summary: { Args: { _minutes?: number }; Returns: Json }
      get_auto_test_job_status: {
        Args: { _limit?: number }
        Returns: {
          avg_latency_ms: number
          duration_ms: number
          fail_count: number
          ok_count: number
          retried_count: number
          run_ended_at: string
          run_started_at: string
          total_tested: number
        }[]
      }
      get_bundle_suggestions: {
        Args: { _product_id: string }
        Returns: {
          cooccurrence_count: number
          frequency_percent: number
          product_id: string
          product_image_url: string
          product_name: string
        }[]
      }
      get_client_seasonality: {
        Args: { _client_id: string; _months?: number }
        Returns: {
          avg_ticket: number
          month: number
          quotes_count: number
          total_revenue: number
          year: number
        }[]
      }
      get_client_top_products: {
        Args: { _client_id: string; _limit?: number }
        Returns: {
          avg_unit_price: number
          last_quoted_at: string
          occurrences: number
          product_id: string
          product_image_url: string
          product_name: string
          total_quantity: number
          total_revenue: number
        }[]
      }
      get_collections_weekly_count: {
        Args: { _weeks?: number }
        Returns: {
          item_count: number
          week_start: string
        }[]
      }
      get_connection_failure_window_minutes: { Args: never; Returns: number }
      get_connections_auto_test_interval: { Args: never; Returns: number }
      get_favorites_weekly_count: {
        Args: { _weeks?: number }
        Returns: {
          item_count: number
          week_start: string
        }[]
      }
      get_industry_benchmark_stats: {
        Args: { _company_ids: string[]; _days?: number }
        Returns: {
          avg_items_per_quote: number
          avg_ltv: number
          avg_quotes_per_client: number
          avg_ticket: number
          top_product_name: string
          total_clients_sampled: number
          total_revenue: number
        }[]
      }
      get_industry_seasonality: {
        Args: { _company_ids: string[]; _months?: number }
        Returns: {
          avg_quotes_per_company: number
          avg_revenue_per_company: number
          companies_active: number
          month: number
          year: number
        }[]
      }
      get_industry_top_products: {
        Args: { _company_ids: string[]; _days?: number; _limit?: number }
        Returns: {
          avg_unit_price: number
          product_id: string
          product_image_url: string
          product_name: string
          total_quantity: number
          total_revenue: number
          unique_clients: number
          unique_sellers: number
        }[]
      }
      get_platform_failure_metrics: {
        Args: { window_minutes?: number }
        Returns: Json
      }
      get_query_telemetry_p95: {
        Args: { window_minutes?: number }
        Returns: {
          avg_ms: number
          count: number
          operation: string
          p95_ms: number
        }[]
      }
      get_quote_token_by_value: {
        Args: { _token: string }
        Returns: {
          client_email: string | null
          client_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          quote_id: string
          responded_at: string | null
          response: string | null
          response_notes: string | null
          seller_id: string
          signature_hash: string | null
          signed_at: string | null
          signer_document: string | null
          signer_ip: string | null
          signer_name: string | null
          signer_user_agent: string | null
          status: string
          token: string
          updated_at: string
          viewed_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "quote_approval_tokens"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_test_auth_integrity: {
        Args: { test_emails: string[] }
        Returns: {
          email: string
          exists_in_users: boolean
          has_identities: boolean
          is_valid: boolean
          user_id: string
        }[]
      }
      get_top_collected_products: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          col_count: number
          product_id: string
        }[]
      }
      get_top_compared_products: {
        Args: { p_limit?: number }
        Returns: {
          comparison_count: number
          product_id: string
        }[]
      }
      get_top_favorited_products: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          fav_count: number
          product_id: string
        }[]
      }
      get_unread_count: { Args: never; Returns: number }
      get_user_cooperative_id: { Args: never; Returns: string }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_pa_id: { Args: never; Returns: string }
      get_user_recent_comparisons: {
        Args: { p_limit?: number }
        Returns: {
          client_name: string
          id: string
          item_count: number
          items: Json
          name: string
          updated_at: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_webhook_delivery_summary: {
        Args: { _minutes?: number }
        Returns: {
          direction: string
          failures: number
          last_failure_at: string
          p95_ms: number
          source: string
          status_class: string
          total: number
        }[]
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
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
      increment_kit_template_usage: {
        Args: { _template_id: string }
        Returns: undefined
      }
      inspect_query_plan: { Args: { p_query: string }; Returns: string }
      is_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_admin_strict: { Args: { _user_id?: string }; Returns: boolean }
      is_dev: { Args: { _user_id?: string }; Returns: boolean }
      is_dnd_active: { Args: never; Returns: boolean }
      is_gerente_pa: { Args: { _user_id?: string }; Returns: boolean }
      is_gestor_compras: { Args: { _user_id?: string }; Returns: boolean }
      is_kit_collaborator: {
        Args: { _kit_id: string; _user_id: string }
        Returns: boolean
      }
      is_kit_owner: {
        Args: { _kit_id: string; _user_id: string }
        Returns: boolean
      }
      is_manager_or_admin: { Args: never; Returns: boolean }
      is_order_owner_or_admin: { Args: { _order_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_seller_only: { Args: { _user_id?: string }; Returns: boolean }
      is_singular_buyer_for_quote: {
        Args: { quote_id: string; user_id: string }
        Returns: boolean
      }
      is_supervisor_or_above: { Args: { _user_id?: string }; Returns: boolean }
      is_vendedor: { Args: { _user_id?: string }; Returns: boolean }
      is_vendedor_role: { Args: { _user_id?: string }; Returns: boolean }
      log_access_denied: {
        Args: {
          _blocked_path: string
          _reason?: string
          _required_role: string
          _user_role?: string
        }
        Returns: undefined
      }
      log_full_scope_grant: {
        Args: {
          _challenge_id?: string
          _confirmation_phrase_ok?: boolean
          _expires_at?: string
          _extra?: Json
          _ip?: unknown
          _justification?: string
          _key_id: string
          _key_prefix: string
          _operation: string
          _request_id?: string
          _token_id?: string
          _user_agent?: string
        }
        Returns: string
      }
      log_order_audit_event: {
        Args: {
          p_category?: string
          p_created_by?: string
          p_created_by_name?: string
          p_description: string
          p_event_type: string
          p_metadata?: Json
          p_observations?: string
          p_order_id: string
        }
        Returns: string
      }
      log_quote_action: {
        Args: { _action: string; _metadata?: Json; _quote_id: string }
        Returns: undefined
      }
      log_rls_denial: {
        Args: {
          p_endpoint?: string
          p_error_code?: string
          p_error_message?: string
          p_operation: string
          p_policy_hint?: string
          p_query_summary?: string
          p_table_name: string
          p_target_id?: string
          p_target_seller_id?: string
          p_user_agent?: string
        }
        Returns: string
      }
      lookup_request_id: { Args: { _request_id: string }; Returns: Json }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      mark_step_up_password_verified: {
        Args: { _challenge_id: string }
        Returns: boolean
      }
      mcp_audit_actor: { Args: { _fallback: string }; Returns: string }
      notify_hardening_regression: { Args: never; Returns: Json }
      process_export_queue_v3: { Args: never; Returns: undefined }
      provision_qa_accounts: { Args: never; Returns: Json }
      qa_preflight_check: { Args: never; Returns: Json }
      record_dev_route_telemetry: {
        Args: {
          _blocked_path: string
          _duration_ms?: number
          _event_type: string
          _user_role?: string
        }
        Returns: undefined
      }
      record_mcp_access_violation: {
        Args: {
          _details?: Json
          _ip?: string
          _operation?: string
          _reason: string
          _request_id?: string
          _source: string
          _target_key_id?: string
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      record_platform_failure: {
        Args: {
          p_duration_ms?: number
          p_error_message?: string
          p_is_503?: boolean
          p_is_cold_start?: boolean
          p_operation: string
          p_retry_count?: number
          p_rpc_name?: string
          p_table?: string
        }
        Returns: string
      }
      record_public_token_failure: {
        Args: {
          _attempted_token: string
          _ip: string
          _reason: string
          _resource_id: string
          _resource_type: string
          _ua: string
        }
        Returns: undefined
      }
      reject_sicoob_order: {
        Args: {
          p_manager_id: string
          p_order_id: string
          p_reason: string
          p_request_id: string
        }
        Returns: undefined
      }
      reject_sicoob_order_without_approval: {
        Args: {
          p_expected_status: string
          p_order_id: string
          p_reason: string
        }
        Returns: undefined
      }
      request_sicoob_order_approval: {
        Args: {
          p_expected_status: string
          p_is_escalated?: boolean
          p_order_id: string
          p_reason: string
          p_threshold: number
        }
        Returns: string
      }
      repair_ownership_orphans: {
        Args: {
          _dry_run?: boolean
          _report_id?: string
          _triggered_by_label?: string
        }
        Returns: Json
      }
      request_step_up_challenge: {
        Args: {
          _action: Database["public"]["Enums"]["step_up_action"]
          _ip?: unknown
          _target_ref?: string
          _user_agent?: string
        }
        Returns: {
          challenge_id: string
          expires_at: string
          otp_plain: string
        }[]
      }
      reset_optimization_queue: {
        Args: { _only_running?: boolean }
        Returns: number
      }
      retry_failed_webhook_deliveries: { Args: never; Returns: Json }
      transition_sicoob_order_status: {
        Args: {
          p_comment?: string | null
          p_expected_status: string
          p_new_status: string
          p_order_id: string
        }
        Returns: undefined
      }
      search_products_semantic: {
        Args: { _limit?: number; _products: Json; _query: string }
        Returns: {
          matched_field: string
          product_id: string
          score: number
        }[]
      }
      search_records_rerank: {
        Args: { _candidates: Json; _query: string }
        Returns: {
          id: string
          matched_field: string
          score: number
        }[]
      }
      seed_discount_test_users: { Args: never; Returns: Json }
      seed_qa_scenario: { Args: { scenario_name: string }; Returns: Json }
      send_notification: {
        Args: {
          p_action_url?: string
          p_category?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      set_connection_failure_window_minutes: {
        Args: { minutes: number }
        Returns: number
      }
      set_connections_auto_test_interval: {
        Args: { minutes: number }
        Returns: number
      }
      snapshot_hardening_status: { Args: never; Returns: Json }
      submit_quote_response: {
        Args: { _response: string; _response_notes?: string; _token: string }
        Returns: boolean
      }
      sync_external_connections_from_credentials:
        | { Args: never; Returns: Json }
        | {
            Args: {
              _trigger_op?: string
              _trigger_secret_name?: string
              _trigger_user_id?: string
            }
            Returns: Json
          }
      validate_mcp_key: {
        Args: { _key_plain: string }
        Returns: {
          block_reason: string
          created_by: string
          key_id: string
          scopes: string[]
        }[]
      }
      verify_step_up_otp: {
        Args: { _challenge_id: string; _otp: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "vendedor"
        | "supervisor"
        | "dev"
        | "gestor_compras"
        | "gerente_pa"
        | "comprador_pac"
        | "comprador_singular"
      order_status:
        | "rascunho"
        | "enviado_gestor"
        | "aprovado_gestor"
        | "enviado_vendedor"
        | "em_producao"
        | "em_separacao"
        | "em_transporte"
        | "entregue"
        | "concluido"
        | "cancelado"
      org_role: "owner" | "admin" | "member"
      role_migration_item_status:
        | "pending"
        | "success"
        | "failed"
        | "skipped"
        | "dry_run"
      role_migration_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "partial"
        | "dry_run"
      step_up_action:
        | "promote_dev"
        | "demote_dev"
        | "mcp_full_issue"
        | "mcp_full_escalate"
        | "secret_rotation"
        | "secret_revoke"
        | "mcp_key_revoke"
        | "mcp_key_rotate"
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
      app_role: [
        "admin",
        "manager",
        "vendedor",
        "supervisor",
        "dev",
        "gestor_compras",
        "gerente_pa",
        "comprador_pac",
        "comprador_singular",
      ],
      order_status: [
        "rascunho",
        "enviado_gestor",
        "aprovado_gestor",
        "enviado_vendedor",
        "em_producao",
        "em_separacao",
        "em_transporte",
        "entregue",
        "concluido",
        "cancelado",
      ],
      org_role: ["owner", "admin", "member"],
      role_migration_item_status: [
        "pending",
        "success",
        "failed",
        "skipped",
        "dry_run",
      ],
      role_migration_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "partial",
        "dry_run",
      ],
      step_up_action: [
        "promote_dev",
        "demote_dev",
        "mcp_full_issue",
        "mcp_full_escalate",
        "secret_rotation",
        "secret_revoke",
        "mcp_key_revoke",
        "mcp_key_rotate",
      ],
    },
  },
} as const
