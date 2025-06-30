export type Json = Record<string, any> | any[]

export type Database = {
  public: {
    Tables: {
      artifacts: {
        Row: {
          created_at: string
          curr_index: number
          id: string
          language: string | null
          name: string
          readable: boolean
          tmp: string | null
          updated_at: string
          user_id: string
          versions: Json
          workspace_id: string
          writable: boolean
        }
        Insert: {
          created_at?: string
          curr_index?: number
          id?: string
          language?: string | null
          name: string
          readable?: boolean
          tmp?: string | null
          updated_at?: string
          user_id?: string
          versions?: Json
          workspace_id: string
          writable?: boolean
        }
        Update: {
          created_at?: string
          curr_index?: number
          id?: string
          language?: string | null
          name?: string
          readable?: boolean
          tmp?: string | null
          updated_at?: string
          user_id?: string
          versions?: Json
          workspace_id?: string
          writable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          chat_id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          avatar: Json | null
          created_at: string
          description: string | null
          id: string
          name: string | null
          owner_id: string
          type: Database["public"]["Enums"]["chat_type"]
          workspace_id: string | null
        }
        Insert: {
          avatar?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          owner_id?: string
          type?: Database["public"]["Enums"]["chat_type"]
          workspace_id?: string | null
        }
        Update: {
          avatar?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          owner_id?: string
          type?: Database["public"]["Enums"]["chat_type"]
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_providers: {
        Row: {
          avatar: Json | null
          fallback_provider: Json | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          avatar?: Json | null
          fallback_provider?: Json | null
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          avatar?: Json | null
          fallback_provider?: Json | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      dialog_messages: {
        Row: {
          assistant_id: string | null
          dialog_id: string
          error: string | null
          generating_session: string | null
          id: string
          is_active: boolean | null
          model_name: string | null
          parent_id: string | null
          status: string
          type: string
          usage: Json | null
          warnings: Json | null
          workspace_id: string | null
        }
        Insert: {
          assistant_id?: string | null
          dialog_id: string
          error?: string | null
          generating_session?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          parent_id?: string | null
          status: string
          type: string
          usage?: Json | null
          warnings?: Json | null
          workspace_id?: string | null
        }
        Update: {
          assistant_id?: string | null
          dialog_id?: string
          error?: string | null
          generating_session?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          parent_id?: string | null
          status?: string
          type?: string
          usage?: Json | null
          warnings?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dialog_messages_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "user_assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialog_messages_dialog_id_fkey"
            columns: ["dialog_id"]
            isOneToOne: false
            referencedRelation: "dialogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialog_messages_parent_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dialog_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialog_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogs: {
        Row: {
          assistant_id: string | null
          created_at: string
          id: string
          input_vars: Json
          model_override: Json | null
          name: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          assistant_id?: string | null
          created_at?: string
          id?: string
          input_vars: Json
          model_override?: Json | null
          name: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          assistant_id?: string | null
          created_at?: string
          id?: string
          input_vars?: Json
          model_override?: Json | null
          name?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialogs_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "user_assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialogs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_contents: {
        Row: {
          args: Json | null
          error: string | null
          id: string
          message_id: string
          name: string | null
          plugin_id: string | null
          reasoning: string | null
          result: Json | null
          status: string | null
          text: string | null
          type: string
        }
        Insert: {
          args?: Json | null
          error?: string | null
          id?: string
          message_id: string
          name?: string | null
          plugin_id?: string | null
          reasoning?: string | null
          result?: Json | null
          status?: string | null
          text?: string | null
          type: string
        }
        Update: {
          args?: Json | null
          error?: string | null
          id?: string
          message_id?: string
          name?: string | null
          plugin_id?: string | null
          reasoning?: string | null
          result?: Json | null
          status?: string | null
          text?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_contents_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "dialog_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string | null
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          chat_id?: string | null
          content: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Update: {
          chat_id?: string | null
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      privy_users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          privy_user_id: string
          supabase_uid: string
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          privy_user_id: string
          supabase_uid: string
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          privy_user_id?: string
          supabase_uid?: string
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: Json | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          privy_user_id: string | null
        }
        Insert: {
          avatar?: Json | null
          created_at?: string | null
          description?: string | null
          id: string
          name: string
          privy_user_id?: string | null
        }
        Update: {
          avatar?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          privy_user_id?: string | null
        }
        Relationships: []
      }
      stored_items: {
        Row: {
          content_text: string | null
          file_url: string | null
          id: string
          message_content_id: string
          mime_type: string | null
          name: string | null
          type: string
        }
        Insert: {
          content_text?: string | null
          file_url?: string | null
          id?: string
          message_content_id: string
          mime_type?: string | null
          name?: string | null
          type: string
        }
        Update: {
          content_text?: string | null
          file_url?: string | null
          id?: string
          message_content_id?: string
          mime_type?: string | null
          name?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stored_items_message_content_id_fkey"
            columns: ["message_content_id"]
            isOneToOne: false
            referencedRelation: "message_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      subproviders: {
        Row: {
          custom_provider_id: string
          id: string
          model_map: Json
          provider: Json | null
        }
        Insert: {
          custom_provider_id: string
          id?: string
          model_map: Json
          provider?: Json | null
        }
        Update: {
          custom_provider_id?: string
          id?: string
          model_map?: Json
          provider?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "subproviders_custom_provider_id_fkey"
            columns: ["custom_provider_id"]
            isOneToOne: false
            referencedRelation: "custom_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assistants: {
        Row: {
          author: string | null
          avatar: Json | null
          context_num: number
          created_at: string
          description: string | null
          homepage: string | null
          id: string
          is_shared:
            | Database["public"]["Enums"]["assistant_sharing_type"]
            | null
          model: Json | null
          model_settings: Json
          name: string
          parent_id: string | null
          plugins: Json
          prompt: string | null
          prompt_role: string | null
          prompt_template: string | null
          prompt_vars: Json
          provider: Json | null
          stream: boolean
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          author?: string | null
          avatar?: Json | null
          context_num?: number
          created_at?: string
          description?: string | null
          homepage?: string | null
          id?: string
          is_shared?:
            | Database["public"]["Enums"]["assistant_sharing_type"]
            | null
          model?: Json | null
          model_settings?: Json
          name: string
          parent_id?: string | null
          plugins?: Json
          prompt?: string | null
          prompt_role?: string | null
          prompt_template?: string | null
          prompt_vars?: Json
          provider?: Json | null
          stream?: boolean
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          author?: string | null
          avatar?: Json | null
          context_num?: number
          created_at?: string
          description?: string | null
          homepage?: string | null
          id?: string
          is_shared?:
            | Database["public"]["Enums"]["assistant_sharing_type"]
            | null
          model?: Json | null
          model_settings?: Json
          name?: string
          parent_id?: string | null
          plugins?: Json
          prompt?: string | null
          prompt_role?: string | null
          prompt_template?: string | null
          prompt_vars?: Json
          provider?: Json | null
          stream?: boolean
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_assistants_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "user_assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_assistants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_data: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      user_plugins: {
        Row: {
          available: boolean
          created_at: string
          id: string
          key: string
          manifest: Json
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          id?: string
          key: string
          manifest: Json
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          id?: string
          key?: string
          manifest?: Json
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          reference_id: string | null
          schema_definition: Json | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          reference_id?: string | null
          schema_definition?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          value?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          reference_id?: string | null
          schema_definition?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "user_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workspaces: {
        Row: {
          user_id: string
          workspace_id: string
        }
        Insert: {
          user_id: string
          workspace_id: string
        }
        Update: {
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          joined_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          joined_at?: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          joined_at?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          avatar: Json | null
          created_at: string
          description: string | null
          id: string
          index_content: string | null
          is_public: boolean | null
          name: string
          owner_id: string
          parent_id: string | null
          type: string
          vars: Json
        }
        Insert: {
          avatar?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          index_content?: string | null
          is_public?: boolean | null
          name: string
          owner_id?: string
          parent_id?: string | null
          type: string
          vars?: Json
        }
        Update: {
          avatar?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          index_content?: string | null
          is_public?: boolean | null
          name?: string
          owner_id?: string
          parent_id?: string | null
          type?: string
          vars?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_assistant: {
        Args: { assistant_id_param: string }
        Returns: boolean
      }
      can_manage_chat: {
        Args: { chat_id_param: string }
        Returns: boolean
      }
      create_or_link_privy_user: {
        Args: {
          p_privy_user_id: string
          p_wallet_address?: string
          p_email?: string
        }
        Returns: string
      }
      debug_workspaces: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_workspace_role: {
        Args: { workspace_id: string; user_id: string }
        Returns: string
      }
      is_chat_member: {
        Args: { chat_id_param: string }
        Returns: boolean
      }
      is_chat_owner: {
        Args: { chat_id_param: string }
        Returns: boolean
      }
      is_workspace_admin_or_owner: {
        Args: { workspace_id_param: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { workspace_id_param: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { user_id: string }
        Returns: boolean
      }
      start_private_chat_with: {
        Args: { target_user_id: string; current_user_id: string }
        Returns: string
      }
    }
    Enums: {
      assistant_sharing_type: "global" | "workspace"
      chat_type: "workspace" | "private"
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
      assistant_sharing_type: ["global", "workspace"],
      chat_type: ["workspace", "private"],
    },
  },
} as const
