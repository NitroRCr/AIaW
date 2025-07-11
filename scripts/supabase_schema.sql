

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."assistant_sharing_type" AS ENUM (
    'global',
    'workspace'
);


ALTER TYPE "public"."assistant_sharing_type" OWNER TO "postgres";


CREATE TYPE "public"."chat_type" AS ENUM (
    'workspace',
    'private'
);


ALTER TYPE "public"."chat_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_workspace_owner_as_member"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_workspace_owner_as_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_assistant"("assistant_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
  workspace_id_var uuid;
  is_shared_var "public"."assistant_sharing_type";
BEGIN
  -- Get the workspace_id and is_shared for this assistant
  SELECT workspace_id, is_shared INTO workspace_id_var, is_shared_var
  FROM public.user_assistants
  WHERE id = assistant_id_param;
  
  -- If user is the owner, they can manage
  IF EXISTS (
    SELECT 1 FROM public.user_assistants
    WHERE id = assistant_id_param AND user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- If assistant is workspace shared and user is admin of that workspace
  IF is_shared_var = 'workspace' AND workspace_id_var IS NOT NULL THEN
    RETURN get_workspace_role(workspace_id_var, auth.uid()) = 'admin';
  END IF;
  
  -- Otherwise, user cannot manage
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."can_manage_assistant"("assistant_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_chat"("chat_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
  workspace_id_var uuid;
BEGIN
  -- Get the workspace_id for this chat
  SELECT workspace_id INTO workspace_id_var
  FROM public.chats
  WHERE id = chat_id_param;
  
  -- If no workspace (private chat), only owner can manage
  IF workspace_id_var IS NULL THEN
    RETURN is_chat_owner(chat_id_param);
  END IF;
  
  -- If workspace chat, either chat owner or workspace admin can manage
  RETURN (
    is_chat_owner(chat_id_param) OR
    get_workspace_role(workspace_id_var, auth.uid()) = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."can_manage_chat"("chat_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_or_link_privy_user"("p_privy_user_id" "text", "p_wallet_address" "text" DEFAULT NULL::"text", "p_email" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_supabase_uid uuid;
  v_profile_name text;
BEGIN
  -- Get current authenticated user ID
  v_supabase_uid := auth.uid();

  IF v_supabase_uid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Determine profile name (email username or wallet address)
  IF p_email IS NOT NULL THEN
    v_profile_name := split_part(p_email, '@', 1);
  ELSIF p_wallet_address IS NOT NULL THEN
    v_profile_name := substring(p_wallet_address from 1 for 8) || '...';
  ELSE
    v_profile_name := 'User';
  END IF;

  -- Create or update profile
  INSERT INTO public.profiles (id, name)
  VALUES (v_supabase_uid, v_profile_name)
  ON CONFLICT (id)
  DO UPDATE SET
    name = EXCLUDED.name,
    created_at = COALESCE(profiles.created_at, now());

  -- Create or update Privy mapping
  INSERT INTO public.privy_users (supabase_uid, privy_user_id, wallet_address, email)
  VALUES (v_supabase_uid, p_privy_user_id, p_wallet_address, p_email)
  ON CONFLICT (privy_user_id)
  DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    email = EXCLUDED.email,
    updated_at = now();

  RETURN v_supabase_uid;
END;
$$;


ALTER FUNCTION "public"."create_or_link_privy_user"("p_privy_user_id" "text", "p_wallet_address" "text", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;


ALTER FUNCTION "public"."create_profile_on_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_workspaces"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id FROM public.workspaces LOOP
        RAISE NOTICE 'Workspace ID: %', rec.id;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."debug_workspaces"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_chats_with_unread_count"() RETURNS TABLE("id" "text", "name" "text", "owner_id" "text", "type" "text", "workspace_id" "text", "created_at" timestamp with time zone, "avatar" "jsonb", "description" "text", "unread_count" integer)
    LANGUAGE "sql"
    AS $$SELECT
    c.id,
    c.name,
    c.owner_id,
    c.type,
    c.workspace_id,
    c.created_at,
    c.avatar,
    c.description,
    (
        SELECT count(*)
        FROM messages m
        WHERE m.chat_id = c.id
          AND NOT EXISTS (
              SELECT 1
              FROM message_read mr
              WHERE mr.id = m.id AND mr.user_id = auth.uid()
          )
    ) AS unread_count
FROM chats c
ORDER BY c.created_at ASC;$$;


ALTER FUNCTION "public"."get_chats_with_unread_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workspace_role"("workspace_id" "uuid", "user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
     BEGIN
       RETURN (
         SELECT role
         FROM public.workspace_members
         WHERE workspace_members.workspace_id = get_workspace_role.workspace_id
           AND workspace_members.user_id = get_workspace_role.user_id
       );
     END;
     $$;


ALTER FUNCTION "public"."get_workspace_role"("workspace_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_chat_member"("chat_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = chat_id_param AND cm.user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_chat_member"("chat_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_chat_owner"("chat_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id_param AND c.owner_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_chat_owner"("chat_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_admin_or_owner"("workspace_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN (
    -- Check if user is admin
    get_workspace_role(workspace_id_param, auth.uid()) = 'admin' OR
    -- Check if user is owner
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id_param AND w.owner_id = auth.uid()
    )
  );
END;
$$;


ALTER FUNCTION "public"."is_workspace_admin_or_owner"("workspace_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_member"("workspace_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_id_param AND wm.user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_workspace_member"("workspace_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_owner"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE owner_id = user_id
  );
END;
$$;


ALTER FUNCTION "public"."is_workspace_owner"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_chat_as_read"("p_chat_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    AS $$
INSERT INTO message_read (id, user_id)
SELECT m.id, auth.uid()
FROM messages m
LEFT JOIN message_read mr ON mr.id = m.id AND mr.user_id = auth.uid()
WHERE m.chat_id = p_chat_id
  AND mr.id IS NULL;
$$;


ALTER FUNCTION "public"."mark_chat_as_read"("p_chat_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_message_as_read_by_sender"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO message_read (id, user_id)
  VALUES (NEW.id, NEW.sender_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_message_as_read_by_sender"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_private_chat_with"("target_user_id" "uuid", "current_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  existing_chat_id uuid;
  new_chat_id uuid;
BEGIN
  IF target_user_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot create private chat with yourself';
  END IF;

  -- Check if such a private chat already exists
  SELECT c.id INTO existing_chat_id
  FROM public.chats c
  JOIN public.chat_members m1 ON c.id = m1.chat_id
  JOIN public.chat_members m2 ON c.id = m2.chat_id
  WHERE c.type = 'private'
    AND m1.user_id = current_user_id
    AND m2.user_id = target_user_id
  LIMIT 1;

  IF existing_chat_id IS NOT NULL THEN
    RETURN existing_chat_id;
  END IF;

  -- Insert new private chat
  INSERT INTO public.chats (type, owner_id)
  VALUES ('private', current_user_id)
  RETURNING id INTO new_chat_id;

  -- Add both users as members
  INSERT INTO public.chat_members (chat_id, user_id)
  VALUES 
    (new_chat_id, current_user_id),
    (new_chat_id, target_user_id)
  ON CONFLICT DO NOTHING;

  RETURN new_chat_id;
END;
$$;


ALTER FUNCTION "public"."start_private_chat_with"("target_user_id" "uuid", "current_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_workspaces"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
    -- On INSERT to workspace_members, add corresponding record to user_workspaces
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.user_workspaces (user_id, workspace_id)
        VALUES (NEW.user_id, NEW.workspace_id)
        ON CONFLICT (user_id, workspace_id) DO NOTHING;
        RETURN NEW;
    -- On DELETE from workspace_members, remove corresponding record from user_workspaces
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.user_workspaces
        WHERE user_id = OLD.user_id AND workspace_id = OLD.workspace_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_user_workspaces"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_settings_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."artifacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "versions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "curr_index" integer DEFAULT 0 NOT NULL,
    "readable" boolean DEFAULT true NOT NULL,
    "writable" boolean DEFAULT true NOT NULL,
    "language" "text",
    "tmp" "text",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."artifacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_members" (
    "chat_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workspace_id" "uuid",
    "type" "public"."chat_type" DEFAULT 'private'::"public"."chat_type" NOT NULL,
    "description" "text",
    "avatar" "jsonb"
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "avatar" "jsonb",
    "fallback_provider" "jsonb",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);


ALTER TABLE "public"."custom_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dialog_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "dialog_id" "uuid" NOT NULL,
    "assistant_id" "uuid",
    "workspace_id" "uuid",
    "generating_session" "text",
    "error" "text",
    "warnings" "jsonb",
    "usage" "jsonb",
    "model_name" "text",
    "parent_id" "uuid",
    "is_active" boolean DEFAULT false,
    CONSTRAINT "dialog_messages_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'streaming'::"text", 'failed'::"text", 'default'::"text", 'inputing'::"text", 'processed'::"text"]))),
    CONSTRAINT "dialog_messages_type_check" CHECK (("type" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."dialog_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dialogs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "assistant_id" "uuid",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "input_vars" "jsonb" NOT NULL,
    "model_override" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dialogs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_contents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "text" "text",
    "reasoning" "text",
    "plugin_id" "text",
    "name" "text",
    "args" "jsonb",
    "result" "jsonb",
    "status" "text",
    "error" "text",
    CONSTRAINT "message_contents_status_check" CHECK (("status" = ANY (ARRAY['calling'::"text", 'failed'::"text", 'completed'::"text"]))),
    CONSTRAINT "message_contents_type_check" CHECK (("type" = ANY (ARRAY['user-message'::"text", 'assistant-message'::"text", 'assistant-tool'::"text"])))
);


ALTER TABLE "public"."message_contents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_read" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL
);


ALTER TABLE "public"."message_read" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_id" "uuid",
    "sender_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."privy_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supabase_uid" "uuid" NOT NULL,
    "privy_user_id" "text" NOT NULL,
    "wallet_address" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."privy_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."privy_users" IS 'Mapping table between Privy users and Supabase auth users';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar" "jsonb",
    "privy_user_id" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stored_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_content_id" "uuid",
    "type" "text" NOT NULL,
    "content_text" "text",
    "name" "text",
    "mime_type" "text",
    "file_url" "text",
    "message_id" "uuid",
    "workspace_id" "uuid",
    CONSTRAINT "stored_items_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'file'::"text", 'quote'::"text", 'image'::"text"])))
);


ALTER TABLE "public"."stored_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subproviders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "jsonb",
    "model_map" "jsonb" NOT NULL,
    "custom_provider_id" "uuid" NOT NULL
);


ALTER TABLE "public"."subproviders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_assistants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "prompt" "text",
    "prompt_vars" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "prompt_template" "text",
    "provider" "jsonb",
    "model" "jsonb",
    "model_settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "plugins" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "prompt_role" "text",
    "stream" boolean DEFAULT false NOT NULL,
    "description" "text",
    "author" "text",
    "homepage" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar" "jsonb",
    "context_num" bigint DEFAULT '0'::bigint NOT NULL,
    "parent_id" "uuid",
    "is_shared" "public"."assistant_sharing_type",
    CONSTRAINT "user_assistants_prompt_role_check" CHECK (("prompt_role" = ANY (ARRAY['system'::"text", 'user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."user_assistants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_data" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_plugins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "key" "text" NOT NULL,
    "type" "text",
    "available" boolean DEFAULT true NOT NULL,
    "manifest" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_plugins_type_check" CHECK (("type" = ANY (ARRAY['gradio'::"text", 'lobechat'::"text", 'mcp'::"text"])))
);


ALTER TABLE "public"."user_plugins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "schema_definition" "jsonb",
    "reference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_workspaces" (
    "user_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_workspaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workspace_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text", 'guest'::"text"])))
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "parent_id" "uuid",
    "is_public" boolean DEFAULT false,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar" "jsonb",
    "vars" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "index_content" "text",
    CONSTRAINT "workspace_parent_not_self" CHECK ((("parent_id" IS NULL) OR ("parent_id" <> "id"))),
    CONSTRAINT "workspaces_type_check" CHECK (("type" = ANY (ARRAY['folder'::"text", 'workspace'::"text"])))
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."artifacts"
    ADD CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_members"
    ADD CONSTRAINT "chat_members_pkey" PRIMARY KEY ("chat_id", "user_id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_providers"
    ADD CONSTRAINT "custom_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_contents"
    ADD CONSTRAINT "dialog_message_contents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dialog_messages"
    ADD CONSTRAINT "dialog_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dialogs"
    ADD CONSTRAINT "dialogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_read"
    ADD CONSTRAINT "message_read_pkey" PRIMARY KEY ("id", "user_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privy_users"
    ADD CONSTRAINT "privy_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privy_users"
    ADD CONSTRAINT "privy_users_privy_user_id_key" UNIQUE ("privy_user_id");



ALTER TABLE ONLY "public"."privy_users"
    ADD CONSTRAINT "privy_users_supabase_uid_key" UNIQUE ("supabase_uid");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_privy_user_id_key" UNIQUE ("privy_user_id");



ALTER TABLE ONLY "public"."stored_items"
    ADD CONSTRAINT "stored_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_data"
    ADD CONSTRAINT "stored_reactives_user_id_key_key" UNIQUE ("user_id", "key");



ALTER TABLE ONLY "public"."subproviders"
    ADD CONSTRAINT "subproviders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_assistants"
    ADD CONSTRAINT "user_assistants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_data"
    ADD CONSTRAINT "user_data_pkey" PRIMARY KEY ("key", "user_id");



ALTER TABLE ONLY "public"."user_plugins"
    ADD CONSTRAINT "user_plugins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key_unique" UNIQUE ("user_id", "key");



ALTER TABLE ONLY "public"."user_workspaces"
    ADD CONSTRAINT "user_workspaces_pkey" PRIMARY KEY ("user_id", "workspace_id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_user_assistants_is_shared" ON "public"."user_assistants" USING "btree" ("is_shared");



CREATE INDEX "idx_user_assistants_parent_id" ON "public"."user_assistants" USING "btree" ("parent_id");



CREATE INDEX "idx_user_settings_key" ON "public"."user_settings" USING "btree" ("key");



CREATE INDEX "idx_user_settings_tags" ON "public"."user_settings" USING "gin" ("tags");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "add_workspace_owner_as_member_trigger" AFTER INSERT ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."add_workspace_owner_as_member"();



CREATE OR REPLACE TRIGGER "set_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_settings_updated_at"();



CREATE OR REPLACE TRIGGER "sync_user_workspaces_delete_trigger" AFTER DELETE ON "public"."workspace_members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_workspaces"();



CREATE OR REPLACE TRIGGER "sync_user_workspaces_insert_trigger" AFTER INSERT ON "public"."workspace_members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_workspaces"();



ALTER TABLE ONLY "public"."artifacts"
    ADD CONSTRAINT "artifacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artifacts"
    ADD CONSTRAINT "artifacts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_members"
    ADD CONSTRAINT "chat_members_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_members"
    ADD CONSTRAINT "chat_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_providers"
    ADD CONSTRAINT "custom_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dialog_messages"
    ADD CONSTRAINT "dialog_messages_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "public"."user_assistants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dialog_messages"
    ADD CONSTRAINT "dialog_messages_dialog_id_fkey" FOREIGN KEY ("dialog_id") REFERENCES "public"."dialogs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dialog_messages"
    ADD CONSTRAINT "dialog_messages_parent_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."dialog_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dialog_messages"
    ADD CONSTRAINT "dialog_messages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dialogs"
    ADD CONSTRAINT "dialogs_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "public"."user_assistants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dialogs"
    ADD CONSTRAINT "dialogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dialogs"
    ADD CONSTRAINT "dialogs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_contents"
    ADD CONSTRAINT "message_contents_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."dialog_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read"
    ADD CONSTRAINT "message_read_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read"
    ADD CONSTRAINT "message_read_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."privy_users"
    ADD CONSTRAINT "privy_users_supabase_uid_fkey" FOREIGN KEY ("supabase_uid") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stored_items"
    ADD CONSTRAINT "stored_items_message_content_id_fkey" FOREIGN KEY ("message_content_id") REFERENCES "public"."message_contents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stored_items"
    ADD CONSTRAINT "stored_items_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stored_items"
    ADD CONSTRAINT "stored_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_data"
    ADD CONSTRAINT "stored_reactives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subproviders"
    ADD CONSTRAINT "subproviders_custom_provider_id_fkey" FOREIGN KEY ("custom_provider_id") REFERENCES "public"."custom_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_assistants"
    ADD CONSTRAINT "user_assistants_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."user_assistants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_assistants"
    ADD CONSTRAINT "user_assistants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_assistants"
    ADD CONSTRAINT "user_assistants_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_plugins"
    ADD CONSTRAINT "user_plugins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "public"."user_settings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_workspaces"
    ADD CONSTRAINT "user_workspaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_workspaces"
    ADD CONSTRAINT "user_workspaces_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can CRUD any workspace chat" ON "public"."chats" USING ((("workspace_id" IS NOT NULL) AND ("type" = 'workspace'::"public"."chat_type") AND ("public"."get_workspace_role"("workspace_id", "auth"."uid"()) = 'admin'::"text")));



CREATE POLICY "Admin can CRUD any workspace message" ON "public"."messages" USING ((EXISTS ( SELECT 1
   FROM "public"."chats" "c"
  WHERE (("c"."id" = "messages"."chat_id") AND ("c"."type" = 'workspace'::"public"."chat_type") AND ("c"."workspace_id" IS NOT NULL) AND ("public"."get_workspace_role"("c"."workspace_id", "auth"."uid"()) = 'admin'::"text")))));



CREATE POLICY "Admin or owner can update workspace" ON "public"."workspaces" FOR UPDATE USING ("public"."is_workspace_admin_or_owner"("id"));



CREATE POLICY "Any user can create a workspace" ON "public"."workspaces" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Anyone can create private chats" ON "public"."chats" FOR INSERT WITH CHECK ((("type" = 'private'::"public"."chat_type") AND ("workspace_id" IS NULL)));



CREATE POLICY "Anyone can join public chats" ON "public"."chat_members" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."chats" "c"
     JOIN "public"."workspaces" "w" ON (("c"."workspace_id" = "w"."id")))
  WHERE (("c"."id" = "chat_members"."chat_id") AND ("c"."type" = 'workspace'::"public"."chat_type") AND ("c"."workspace_id" IS NOT NULL) AND ("w"."is_public" = true))))));



CREATE POLICY "Anyone can read profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Anyone can read public workspace chats" ON "public"."chats" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND ("type" = 'workspace'::"public"."chat_type") AND (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "chats"."workspace_id") AND ("w"."is_public" = true))))));



CREATE POLICY "Can read stored_items via direct workspace_id" ON "public"."stored_items" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Can read stored_items via message workspace" ON "public"."stored_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."chats" "c" ON (("m"."chat_id" = "c"."id")))
  WHERE (("m"."id" = "stored_items"."message_id") AND "public"."is_workspace_member"("c"."workspace_id")))));



CREATE POLICY "Chat member can delete private chats" ON "public"."chats" FOR DELETE USING ((("type" = 'private'::"public"."chat_type") AND ("workspace_id" IS NULL) AND "public"."is_chat_member"("id")));



CREATE POLICY "Chat members can create messages" ON "public"."messages" FOR INSERT WITH CHECK (("public"."is_chat_member"("chat_id") OR (EXISTS ( SELECT 1
   FROM ("public"."chats" "c"
     JOIN "public"."workspace_members" "wm" ON (("c"."workspace_id" = "wm"."workspace_id")))
  WHERE (("c"."id" = "messages"."chat_id") AND ("c"."type" = 'workspace'::"public"."chat_type") AND ("wm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Chat members can read all members of their chats" ON "public"."chat_members" FOR SELECT USING ("public"."is_chat_member"("chat_id"));



CREATE POLICY "Chat members can read private chats" ON "public"."chats" FOR SELECT USING ((("type" = 'private'::"public"."chat_type") AND ("workspace_id" IS NULL) AND "public"."is_chat_member"("id")));



CREATE POLICY "Chat members can update private chats" ON "public"."chats" FOR UPDATE USING ((("type" = 'private'::"public"."chat_type") AND ("workspace_id" IS NULL) AND "public"."is_chat_member"("id")));



CREATE POLICY "Chat owner can manage members" ON "public"."chat_members" USING ("public"."can_manage_chat"("chat_id")) WITH CHECK ("public"."can_manage_chat"("chat_id"));



CREATE POLICY "Chat owner or workspace admin can delete chat" ON "public"."chats" FOR DELETE USING ("public"."can_manage_chat"("id"));



CREATE POLICY "Members can read private workspace chats" ON "public"."chats" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND ("type" = 'workspace'::"public"."chat_type") AND (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "chats"."workspace_id") AND ("w"."is_public" = false)))) AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "chats"."workspace_id") AND ("wm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Message sender can update own messages" ON "public"."messages" FOR UPDATE USING (("sender_id" = "auth"."uid"()));



CREATE POLICY "Message sender or chat manager can delete messages" ON "public"."messages" FOR DELETE USING ((("sender_id" = "auth"."uid"()) OR "public"."can_manage_chat"("chat_id")));



CREATE POLICY "Messages inherit chat permissions" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chats" "c"
  WHERE (("c"."id" = "messages"."chat_id") AND ((("c"."type" = 'workspace'::"public"."chat_type") AND ("c"."workspace_id" IS NOT NULL) AND ((EXISTS ( SELECT 1
           FROM "public"."workspaces" "w"
          WHERE (("w"."id" = "c"."workspace_id") AND ("w"."is_public" = true)))) OR ((EXISTS ( SELECT 1
           FROM "public"."workspaces" "w"
          WHERE (("w"."id" = "c"."workspace_id") AND ("w"."is_public" = false)))) AND (EXISTS ( SELECT 1
           FROM "public"."workspace_members" "wm"
          WHERE (("wm"."workspace_id" = "c"."workspace_id") AND ("wm"."user_id" = "auth"."uid"()))))))) OR (("c"."type" = 'private'::"public"."chat_type") AND ("c"."workspace_id" IS NULL) AND "public"."is_chat_member"("c"."id")))))));



CREATE POLICY "Owner can delete dialog messages" ON "public"."dialog_messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."dialogs" "d"
  WHERE (("d"."id" = "dialog_messages"."dialog_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can delete message contents" ON "public"."message_contents" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."dialog_messages" "dm"
     JOIN "public"."dialogs" "d" ON (("dm"."dialog_id" = "d"."id")))
  WHERE (("dm"."id" = "message_contents"."message_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can delete workspace" ON "public"."workspaces" FOR DELETE USING (("public"."is_workspace_owner"("auth"."uid"()) AND ("owner_id" = "auth"."uid"())));



CREATE POLICY "Owner can insert dialog messages" ON "public"."dialog_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."dialogs" "d"
  WHERE (("d"."id" = "dialog_messages"."dialog_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can insert message contents" ON "public"."message_contents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."dialog_messages" "dm"
     JOIN "public"."dialogs" "d" ON (("dm"."dialog_id" = "d"."id")))
  WHERE (("dm"."id" = "message_contents"."message_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can read dialog messages" ON "public"."dialog_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."dialogs" "d"
  WHERE (("d"."id" = "dialog_messages"."dialog_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can read message contents" ON "public"."message_contents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."dialog_messages" "dm"
     JOIN "public"."dialogs" "d" ON (("dm"."dialog_id" = "d"."id")))
  WHERE (("dm"."id" = "message_contents"."message_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can update dialog messages" ON "public"."dialog_messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."dialogs" "d"
  WHERE (("d"."id" = "dialog_messages"."dialog_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can update message contents" ON "public"."message_contents" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."dialog_messages" "dm"
     JOIN "public"."dialogs" "d" ON (("dm"."dialog_id" = "d"."id")))
  WHERE (("dm"."id" = "message_contents"."message_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Private workspace can only be read by members" ON "public"."workspaces" FOR SELECT USING ((("is_public" = false) AND "public"."is_workspace_member"("id")));



CREATE POLICY "Public workspace can be read by anyone" ON "public"."workspaces" FOR SELECT USING (("is_public" = true));



CREATE POLICY "User can delete own artifact" ON "public"."artifacts" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "User can delete own stored reactives" ON "public"."user_data" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "User can insert own artifact" ON "public"."artifacts" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "User can insert own stored reactives" ON "public"."user_data" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can read own stored reactives" ON "public"."user_data" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "User can update own artifact" ON "public"."artifacts" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "User can update own stored reactives" ON "public"."user_data" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can CRUD their own settings" ON "public"."user_settings" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can CRUD their own user_workspaces" ON "public"."user_workspaces" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their assistants" ON "public"."user_assistants" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their custom providers" ON "public"."custom_providers" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own dialogs" ON "public"."dialogs" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their plugins" ON "public"."user_plugins" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their subproviders" ON "public"."subproviders" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."custom_providers" "cp"
  WHERE (("cp"."id" = "subproviders"."custom_provider_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own read markers" ON "public"."message_read" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert subproviders under their custom providers" ON "public"."subproviders" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."custom_providers" "cp"
  WHERE (("cp"."id" = "subproviders"."custom_provider_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their assistants" ON "public"."user_assistants" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their custom providers" ON "public"."custom_providers" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own Privy mapping" ON "public"."privy_users" FOR INSERT WITH CHECK (("supabase_uid" = "auth"."uid"()));



CREATE POLICY "Users can insert their own dialogs" ON "public"."dialogs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their plugins" ON "public"."user_plugins" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their plugins" ON "public"."user_plugins" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can select their read markers" ON "public"."message_read" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their assistants" ON "public"."user_assistants" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their custom providers" ON "public"."custom_providers" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own Privy mapping" ON "public"."privy_users" FOR UPDATE USING (("supabase_uid" = "auth"."uid"()));



CREATE POLICY "Users can update their own dialogs" ON "public"."dialogs" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their plugins" ON "public"."user_plugins" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their subproviders" ON "public"."subproviders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."custom_providers" "cp"
  WHERE (("cp"."id" = "subproviders"."custom_provider_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view global shared assistants" ON "public"."user_assistants" FOR SELECT USING (("is_shared" = 'global'::"public"."assistant_sharing_type"));



CREATE POLICY "Users can view their custom providers" ON "public"."custom_providers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their dialogs" ON "public"."dialogs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own Privy mapping" ON "public"."privy_users" FOR SELECT USING (("supabase_uid" = "auth"."uid"()));



CREATE POLICY "Users can view their own assistants" ON "public"."user_assistants" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their subproviders" ON "public"."subproviders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."custom_providers" "cp"
  WHERE (("cp"."id" = "subproviders"."custom_provider_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Workspace admins can manage workspace shared assistants" ON "public"."user_assistants" USING ((("is_shared" = 'workspace'::"public"."assistant_sharing_type") AND ("workspace_id" IS NOT NULL) AND ("public"."get_workspace_role"("workspace_id", "auth"."uid"()) = 'admin'::"text")));



CREATE POLICY "Workspace members can create workspace chats" ON "public"."chats" FOR INSERT WITH CHECK ((("workspace_id" IS NOT NULL) AND ("type" = 'workspace'::"public"."chat_type") AND ("public"."get_workspace_role"("workspace_id", "auth"."uid"()) = ANY (ARRAY['admin'::"text", 'member'::"text"]))));



CREATE POLICY "Workspace members can view workspace shared assistants" ON "public"."user_assistants" FOR SELECT USING ((("is_shared" = 'workspace'::"public"."assistant_sharing_type") AND ("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));



CREATE POLICY "access messages via dialog" ON "public"."dialog_messages" USING ((EXISTS ( SELECT 1
   FROM "public"."dialogs" "d"
  WHERE (("d"."id" = "dialog_messages"."dialog_id") AND ("d"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."chat_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dialog_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dialogs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_contents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_read" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privy_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subproviders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_assistants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_plugins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_workspaces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_members_delete" ON "public"."workspace_members" FOR DELETE USING (("public"."is_workspace_admin_or_owner"("workspace_id") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "workspace_members_insert" ON "public"."workspace_members" FOR INSERT WITH CHECK (("public"."is_workspace_admin_or_owner"("workspace_id") OR (("user_id" = "auth"."uid"()) AND ("role" = 'member'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_members"."workspace_id") AND ("w"."is_public" = true)))))));



CREATE POLICY "workspace_members_select" ON "public"."workspace_members" FOR SELECT USING (("public"."is_workspace_admin_or_owner"("workspace_id") OR "public"."is_workspace_member"("workspace_id") OR (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_members"."workspace_id") AND ("w"."is_public" = true))))));



CREATE POLICY "workspace_members_update" ON "public"."workspace_members" FOR UPDATE USING ("public"."is_workspace_admin_or_owner"("workspace_id"));



ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chats";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_assistants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."workspace_members";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."workspaces";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."add_workspace_owner_as_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_workspace_owner_as_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_workspace_owner_as_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_assistant"("assistant_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_assistant"("assistant_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_assistant"("assistant_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_chat"("chat_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_chat"("chat_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_chat"("chat_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_or_link_privy_user"("p_privy_user_id" "text", "p_wallet_address" "text", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_or_link_privy_user"("p_privy_user_id" "text", "p_wallet_address" "text", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_or_link_privy_user"("p_privy_user_id" "text", "p_wallet_address" "text", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_workspaces"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_workspaces"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_workspaces"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_chats_with_unread_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_chats_with_unread_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_chats_with_unread_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workspace_role"("workspace_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workspace_role"("workspace_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workspace_role"("workspace_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_chat_member"("chat_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_chat_member"("chat_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_chat_member"("chat_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_chat_owner"("chat_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_chat_owner"("chat_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_chat_owner"("chat_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_admin_or_owner"("workspace_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_admin_or_owner"("workspace_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_admin_or_owner"("workspace_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_member"("workspace_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("workspace_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("workspace_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_owner"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_owner"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_owner"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_chat_as_read"("p_chat_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_chat_as_read"("p_chat_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_chat_as_read"("p_chat_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_message_as_read_by_sender"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_message_as_read_by_sender"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_message_as_read_by_sender"() TO "service_role";



GRANT ALL ON FUNCTION "public"."start_private_chat_with"("target_user_id" "uuid", "current_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."start_private_chat_with"("target_user_id" "uuid", "current_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_private_chat_with"("target_user_id" "uuid", "current_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_workspaces"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_workspaces"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_workspaces"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."artifacts" TO "anon";
GRANT ALL ON TABLE "public"."artifacts" TO "authenticated";
GRANT ALL ON TABLE "public"."artifacts" TO "service_role";



GRANT ALL ON TABLE "public"."chat_members" TO "anon";
GRANT ALL ON TABLE "public"."chat_members" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_members" TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."custom_providers" TO "anon";
GRANT ALL ON TABLE "public"."custom_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_providers" TO "service_role";



GRANT ALL ON TABLE "public"."dialog_messages" TO "anon";
GRANT ALL ON TABLE "public"."dialog_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."dialog_messages" TO "service_role";



GRANT ALL ON TABLE "public"."dialogs" TO "anon";
GRANT ALL ON TABLE "public"."dialogs" TO "authenticated";
GRANT ALL ON TABLE "public"."dialogs" TO "service_role";



GRANT ALL ON TABLE "public"."message_contents" TO "anon";
GRANT ALL ON TABLE "public"."message_contents" TO "authenticated";
GRANT ALL ON TABLE "public"."message_contents" TO "service_role";



GRANT ALL ON TABLE "public"."message_read" TO "anon";
GRANT ALL ON TABLE "public"."message_read" TO "authenticated";
GRANT ALL ON TABLE "public"."message_read" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."privy_users" TO "anon";
GRANT ALL ON TABLE "public"."privy_users" TO "authenticated";
GRANT ALL ON TABLE "public"."privy_users" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."stored_items" TO "anon";
GRANT ALL ON TABLE "public"."stored_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stored_items" TO "service_role";



GRANT ALL ON TABLE "public"."subproviders" TO "anon";
GRANT ALL ON TABLE "public"."subproviders" TO "authenticated";
GRANT ALL ON TABLE "public"."subproviders" TO "service_role";



GRANT ALL ON TABLE "public"."user_assistants" TO "anon";
GRANT ALL ON TABLE "public"."user_assistants" TO "authenticated";
GRANT ALL ON TABLE "public"."user_assistants" TO "service_role";



GRANT ALL ON TABLE "public"."user_data" TO "anon";
GRANT ALL ON TABLE "public"."user_data" TO "authenticated";
GRANT ALL ON TABLE "public"."user_data" TO "service_role";



GRANT ALL ON TABLE "public"."user_plugins" TO "anon";
GRANT ALL ON TABLE "public"."user_plugins" TO "authenticated";
GRANT ALL ON TABLE "public"."user_plugins" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_workspaces" TO "anon";
GRANT ALL ON TABLE "public"."user_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."user_workspaces" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
