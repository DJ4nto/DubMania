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
      lobbies: {
        Row: {
          code: string
          created_at: string
          current_round_id: string | null
          expires_at: string
          host_player_id: string | null
          id: string
          selected_video: Json | null
          state: Database["public"]["Enums"]["lobby_state"]
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          current_round_id?: string | null
          expires_at?: string
          host_player_id?: string | null
          id?: string
          selected_video?: Json | null
          state?: Database["public"]["Enums"]["lobby_state"]
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          current_round_id?: string | null
          expires_at?: string
          host_player_id?: string | null
          id?: string
          selected_video?: Json | null
          state?: Database["public"]["Enums"]["lobby_state"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lobbies_current_round_fk"
            columns: ["current_round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobbies_host_player_fk"
            columns: ["host_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      played_videos: {
        Row: {
          catalog_video_id: string
          lobby_id: string
          played_at: string
        }
        Insert: {
          catalog_video_id: string
          lobby_id: string
          played_at?: string
        }
        Update: {
          catalog_video_id?: string
          lobby_id?: string
          played_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "played_videos_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          connected: boolean
          id: string
          joined_at: string
          last_seen_at: string
          left_at: string | null
          lobby_id: string
          microphone_state: Database["public"]["Enums"]["microphone_state"]
          nickname: string
          round_status: Database["public"]["Enums"]["player_round_status"]
          slot: number
          user_id: string
        }
        Insert: {
          connected?: boolean
          id?: string
          joined_at?: string
          last_seen_at?: string
          left_at?: string | null
          lobby_id: string
          microphone_state?: Database["public"]["Enums"]["microphone_state"]
          nickname: string
          round_status?: Database["public"]["Enums"]["player_round_status"]
          slot: number
          user_id: string
        }
        Update: {
          connected?: boolean
          id?: string
          joined_at?: string
          last_seen_at?: string
          left_at?: string | null
          lobby_id?: string
          microphone_state?: Database["public"]["Enums"]["microphone_state"]
          nickname?: string
          round_status?: Database["public"]["Enums"]["player_round_status"]
          slot?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          attempt: number
          created_at: string
          duration_ms: number
          end_offset_ms: number | null
          id: string
          mime_type: string
          player_id: string
          round_id: string
          size_bytes: number
          start_offset_ms: number
          status: Database["public"]["Enums"]["recording_status"]
          storage_path: string
          validated_at: string | null
        }
        Insert: {
          attempt: number
          created_at?: string
          duration_ms?: number
          end_offset_ms?: number | null
          id?: string
          mime_type: string
          player_id: string
          round_id: string
          size_bytes?: number
          start_offset_ms?: number
          status?: Database["public"]["Enums"]["recording_status"]
          storage_path: string
          validated_at?: string | null
        }
        Update: {
          attempt?: number
          created_at?: string
          duration_ms?: number
          end_offset_ms?: number | null
          id?: string
          mime_type?: string
          player_id?: string
          round_id?: string
          size_bytes?: number
          start_offset_ms?: number
          status?: Database["public"]["Enums"]["recording_status"]
          storage_path?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string
          final_playback_at: string | null
          finished_at: string | null
          id: string
          lobby_id: string
          recording_deadline_at: string | null
          review_deadline_at: string | null
          scheduled_start_at: string | null
          sequence_number: number
          state: Database["public"]["Enums"]["lobby_state"]
          video: Json
        }
        Insert: {
          created_at?: string
          final_playback_at?: string | null
          finished_at?: string | null
          id?: string
          lobby_id: string
          recording_deadline_at?: string | null
          review_deadline_at?: string | null
          scheduled_start_at?: string | null
          sequence_number: number
          state: Database["public"]["Enums"]["lobby_state"]
          video: Json
        }
        Update: {
          created_at?: string
          final_playback_at?: string | null
          finished_at?: string | null
          id?: string
          lobby_id?: string
          recording_deadline_at?: string | null
          review_deadline_at?: string | null
          scheduled_start_at?: string | null
          sequence_number?: number
          state?: Database["public"]["Enums"]["lobby_state"]
          video?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rounds_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_round_to_final_if_ready: {
        Args: { p_round_id: string }
        Returns: undefined
      }
      advance_round_to_review_if_ready: {
        Args: { p_round_id: string }
        Returns: undefined
      }
      build_lobby_snapshot: {
        Args: { target_lobby_id: string; target_user_id: string }
        Returns: Json
      }
      cancel_round_preparation: { Args: { p_lobby_id: string }; Returns: Json }
      clear_lobby_video: { Args: { p_lobby_id: string }; Returns: Json }
      confirm_round_started: {
        Args: { p_lobby_id: string; p_round_id: string }
        Returns: Json
      }
      create_lobby: { Args: { p_nickname: string }; Returns: Json }
      generate_lobby_code: { Args: never; Returns: string }
      get_lobby_snapshot: { Args: { p_code: string }; Returns: Json }
      get_server_time: { Args: never; Returns: Json }
      heartbeat_player: { Args: { p_player_id: string }; Returns: Json }
      is_lobby_host: { Args: { target_lobby_id: string }; Returns: boolean }
      is_lobby_member: { Args: { target_lobby_id: string }; Returns: boolean }
      join_lobby: {
        Args: { p_code: string; p_nickname: string }
        Returns: Json
      }
      leave_lobby: { Args: { p_player_id: string }; Returns: Json }
      mark_stale_players: { Args: never; Returns: number }
      normalize_lobby_code: { Args: { raw_code: string }; Returns: string }
      normalize_nickname: { Args: { raw_nickname: string }; Returns: string }
      prepare_round: { Args: { p_lobby_id: string }; Returns: Json }
      register_recording: {
        Args: {
          p_attempt: number
          p_duration_ms: number
          p_end_offset_ms: number
          p_mime_type: string
          p_player_id: string
          p_round_id: string
          p_size_bytes: number
          p_start_offset_ms: number
          p_storage_path: string
        }
        Returns: Json
      }
      request_recording_retry: {
        Args: { p_player_id: string; p_round_id: string }
        Returns: Json
      }
      return_to_video_selection: { Args: { p_lobby_id: string }; Returns: Json }
      schedule_final_playback: { Args: { p_lobby_id: string }; Returns: Json }
      schedule_round_start: { Args: { p_lobby_id: string }; Returns: Json }
      select_lobby_video: {
        Args: { p_lobby_id: string; p_video: Json }
        Returns: Json
      }
      set_player_round_ready: {
        Args: { p_player_id: string; p_round_id: string }
        Returns: Json
      }
      skip_player_recording: {
        Args: { p_player_id: string; p_round_id: string }
        Returns: Json
      }
      transfer_lobby_host: {
        Args: { target_lobby_id: string }
        Returns: string
      }
      update_microphone_state: {
        Args: {
          p_microphone_state: Database["public"]["Enums"]["microphone_state"]
          p_player_id: string
        }
        Returns: Json
      }
      validate_recording: { Args: { p_recording_id: string }; Returns: Json }
    }
    Enums: {
      lobby_state:
        | "VIDEO_SELECTION"
        | "PREPARING"
        | "COUNTDOWN"
        | "RECORDING"
        | "REVIEW"
        | "FINAL_READY"
        | "FINAL_PLAYBACK"
      microphone_state: "UNKNOWN" | "AVAILABLE" | "DENIED" | "UNAVAILABLE"
      player_round_status:
        | "IDLE"
        | "PREPARING"
        | "READY"
        | "RECORDING"
        | "UPLOADING"
        | "REVIEWING"
        | "VALIDATED"
        | "NO_MIC"
        | "ABANDONED"
        | "DISCONNECTED"
        | "FAILED"
      recording_status:
        | "UPLOADING"
        | "READY"
        | "VALIDATED"
        | "REPLACED"
        | "FAILED"
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
      lobby_state: [
        "VIDEO_SELECTION",
        "PREPARING",
        "COUNTDOWN",
        "RECORDING",
        "REVIEW",
        "FINAL_READY",
        "FINAL_PLAYBACK",
      ],
      microphone_state: ["UNKNOWN", "AVAILABLE", "DENIED", "UNAVAILABLE"],
      player_round_status: [
        "IDLE",
        "PREPARING",
        "READY",
        "RECORDING",
        "UPLOADING",
        "REVIEWING",
        "VALIDATED",
        "NO_MIC",
        "ABANDONED",
        "DISCONNECTED",
        "FAILED",
      ],
      recording_status: [
        "UPLOADING",
        "READY",
        "VALIDATED",
        "REPLACED",
        "FAILED",
      ],
    },
  },
} as const
