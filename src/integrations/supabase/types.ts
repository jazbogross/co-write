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
      profiles: {
        Row: {
          email: string | null
          github_access_token: string | null
          github_main_repo: string | null
          github_username: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          email?: string | null
          github_access_token?: string | null
          github_main_repo?: string | null
          github_username?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          email?: string | null
          github_access_token?: string | null
          github_main_repo?: string | null
          github_username?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      repository_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_type: string | null
          repository_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_type?: string | null
          repository_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_type?: string | null
          repository_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repository_permissions_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_content: {
        Row: {
          content_delta: Json
          script_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          content_delta?: Json
          script_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          content_delta?: Json
          script_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_content_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: true
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_drafts: {
        Row: {
          draft_content: Json
          id: string
          script_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          draft_content: Json
          id?: string
          script_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          draft_content?: Json
          id?: string
          script_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_drafts_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_suggestions: {
        Row: {
          created_at: string | null
          delta_diff: Json
          id: string
          rejection_reason: string | null
          script_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delta_diff: Json
          id?: string
          rejection_reason?: string | null
          script_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delta_diff?: Json
          id?: string
          rejection_reason?: string | null
          script_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_suggestions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_versions: {
        Row: {
          content_delta: Json
          created_at: string | null
          created_by: string | null
          github_path: string | null
          id: string
          script_id: string | null
          version_name: string | null
          version_number: number
        }
        Insert: {
          content_delta: Json
          created_at?: string | null
          created_by?: string | null
          github_path?: string | null
          id?: string
          script_id?: string | null
          version_name?: string | null
          version_number: number
        }
        Update: {
          content_delta?: Json
          created_at?: string | null
          created_by?: string | null
          github_path?: string | null
          id?: string
          script_id?: string | null
          version_name?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          admin_id: string
          content: Json | null
          created_at: string | null
          folder_name: string | null
          github_owner: string | null
          github_repo: string | null
          id: string
          is_private: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          content?: Json | null
          created_at?: string | null
          folder_name?: string | null
          github_owner?: string | null
          github_repo?: string | null
          id?: string
          is_private?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          content?: Json | null
          created_at?: string | null
          folder_name?: string | null
          github_owner?: string | null
          github_repo?: string | null
          id?: string
          is_private?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
