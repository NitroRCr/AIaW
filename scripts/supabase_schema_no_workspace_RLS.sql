

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






CREATE TYPE "public"."chat_type" AS ENUM (
    'workspace',
    'group',
    'private'
);


ALTER TYPE "public"."chat_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_chat_owner_as_member"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.chat_members (chat_id, user_id)
  values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."add_chat_owner_as_member"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."can_delete_workspace_items"("p_workspace_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
  user_role text;
  item_owner_id uuid;
BEGIN
  -- Get current user's role
  user_role := "public"."get_workspace_user_role"(p_workspace_id);
  
  -- Admin/owner can delete anything
  IF user_role IN ('owner', 'admin') THEN
    RETURN true;
  END IF;
  
  -- Member can delete own items
  IF user_role = 'member' AND p_user_id = auth.uid() THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."can_delete_workspace_items"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_delete_workspace_items"("p_workspace_id" "uuid", "p_user_id" "uuid") IS 'Permission function: Checks if current user can delete workspace items, considering item ownership';



CREATE OR REPLACE FUNCTION "public"."can_insert_stored_item"("p_message_content_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.message_contents mc
    JOIN public.dialog_messages dm ON mc.message_id = dm.id
    JOIN public.dialogs d ON dm.dialog_id = d.id
    JOIN public.workspaces w ON d.workspace_id = w.id
    WHERE
      mc.id = p_message_content_id AND (
        w.is_public = true OR
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid()
        )
      )
  );
END;
$$;


ALTER FUNCTION "public"."can_insert_stored_item"("p_message_content_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_insert_workspace_member"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  -- User can add members if they are owner or admin
  RETURN "public"."is_workspace_admin"(p_workspace_id);
END;
$$;


ALTER FUNCTION "public"."can_insert_workspace_member"("p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_insert_workspace_member"("p_workspace_id" "uuid") IS 'Permission function: Checks if current user can add members to workspace (with row_security OFF)';



CREATE OR REPLACE FUNCTION "public"."can_modify_workspace_items"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
  user_role text;
BEGIN
  user_role := "public"."get_workspace_user_role"(p_workspace_id);
  RETURN user_role IN ('owner', 'admin', 'member');
END;
$$;


ALTER FUNCTION "public"."can_modify_workspace_items"("p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_modify_workspace_items"("p_workspace_id" "uuid") IS 'Permission function: Checks if current user can modify workspace items';



CREATE OR REPLACE FUNCTION "public"."can_read_workspace_items"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN "public"."has_workspace_access"(p_workspace_id);
END;
$$;


ALTER FUNCTION "public"."can_read_workspace_items"("p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_read_workspace_items"("p_workspace_id" "uuid") IS 'Permission function: Checks if current user can read workspace items';



CREATE OR REPLACE FUNCTION "public"."can_user_insert_stored_item"("p_message_content_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.message_contents mc
    JOIN public.dialog_messages dm ON mc.message_id = dm.id
    JOIN public.dialogs d ON dm.dialog_id = d.id
    WHERE mc.id = p_message_content_id AND d.user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."can_user_insert_stored_item"("p_message_content_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."create_profile_on_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_chat_if_authorized"("chat_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  is_owner boolean;
  is_member boolean;
  chat_is_group boolean;
begin
  -- Get chat info
  select c.is_group, 
         c.owner_id = auth.uid(), 
         exists (
           select 1 
           from public.chat_members cm 
           where cm.chat_id = c.id and cm.user_id = auth.uid()
         )
  into chat_is_group, is_owner, is_member
  from public.chats c
  where c.id = chat_id;

  if not found then
    raise exception 'Chat not found';
  end if;

  if chat_is_group and not is_owner then
    raise exception 'Only the group owner can delete this chat';
  end if;

  if not chat_is_group and not is_member then
    raise exception 'Only a chat member can delete this DM chat';
  end if;

  -- Delete the chat (CASCADE will delete related members and messages)
  delete from public.chats where id = chat_id;
end;
$$;


ALTER FUNCTION "public"."delete_chat_if_authorized"("chat_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_child_workspaces"("root_id" "uuid") RETURNS TABLE("child_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE children AS (
    SELECT w.id AS id 
    FROM public.workspaces w 
    WHERE w.parent_id = root_id
    UNION ALL
    SELECT w.id AS id
    FROM public.workspaces w
    INNER JOIN children c ON w.parent_id = c.id
  )
  SELECT children.id FROM children;
END;
$$;


ALTER FUNCTION "public"."get_all_child_workspaces"("root_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workspace_user_role"("p_workspace_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
  user_role text;
BEGIN
  -- Check if workspace owner
  IF EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RETURN 'owner';
  END IF;
  
  -- Get role from workspace_members
  SELECT role INTO user_role
  FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = auth.uid();
  
  -- Return role or 'none' if not found
  RETURN COALESCE(user_role, 'none');
END;
$$;


ALTER FUNCTION "public"."get_workspace_user_role"("p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_workspace_user_role"("p_workspace_id" "uuid") IS 'Role function: Gets current user role in workspace - owner/admin/member/readonly/none (with row_security OFF)';



CREATE OR REPLACE FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN 
    "public"."is_workspace_public"(p_workspace_id) OR
    "public"."is_workspace_member"(p_workspace_id);
END;
$$;


ALTER FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") IS 'Access function: Checks if current user has any access to workspace (public/owner/member)';



CREATE OR REPLACE FUNCTION "public"."inherit_workspace_members_from_parent"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    SELECT NEW.id, user_id, role
    FROM public.workspace_members
    WHERE workspace_id = NEW.parent_id
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."inherit_workspace_members_from_parent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_chat_member"("chat_id" "uuid", "user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $_$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = $1 AND user_id = $2
  );
END;
$_$;


ALTER FUNCTION "public"."is_chat_member"("chat_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_stored_item_owner"("p_message_content_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.message_contents mc
    JOIN public.dialog_messages dm ON mc.message_id = dm.id
    JOIN public.dialogs d ON dm.dialog_id = d.id
    WHERE mc.id = p_message_content_id AND d.user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_stored_item_owner"("p_message_content_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  -- First check if user is owner (optimization)
  IF "public"."is_workspace_owner"(p_workspace_id) THEN
    RETURN true;
  END IF;
  
  -- Then check admin role
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id 
      AND user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid") IS 'Role function: Checks if current user is a workspace admin (with row_security OFF)';



CREATE OR REPLACE FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  -- First check if user is owner (optimization)
  IF "public"."is_workspace_owner"(p_workspace_id) THEN
    RETURN true;
  END IF;
  
  -- Then check membership
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") IS 'Membership function: Checks if current user is a workspace member (with row_security OFF)';



CREATE OR REPLACE FUNCTION "public"."is_workspace_owner"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_workspace_owner"("p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_workspace_owner"("p_workspace_id" "uuid") IS 'Base security function: Checks if current user is the workspace owner (no RLS dependencies)';



CREATE OR REPLACE FUNCTION "public"."is_workspace_public"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id AND is_public = true
  );
END;
$$;


ALTER FUNCTION "public"."is_workspace_public"("p_workspace_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_workspace_public"("p_workspace_id" "uuid") IS 'Base security function: Checks if a workspace is public (no RLS dependencies)';



CREATE OR REPLACE FUNCTION "public"."propagate_member_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
  child_id uuid;
BEGIN
  FOR child_id IN 
    SELECT get_all_child_workspaces.child_id FROM get_all_child_workspaces(OLD.workspace_id)
  LOOP
    DELETE FROM public.workspace_members
    WHERE workspace_id = child_id AND user_id = OLD.user_id;
  END LOOP;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."propagate_member_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."propagate_member_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
  child_id uuid;
BEGIN
  FOR child_id IN 
    SELECT get_all_child_workspaces.child_id FROM get_all_child_workspaces(NEW.workspace_id)
  LOOP
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (child_id, NEW.user_id, NEW.role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."propagate_member_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."propagate_member_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
  child_id uuid;
BEGIN
  FOR child_id IN 
    SELECT get_all_child_workspaces.child_id FROM get_all_child_workspaces(NEW.workspace_id)
  LOOP
    UPDATE public.workspace_members
    SET role = NEW.role
    WHERE workspace_id = child_id AND user_id = NEW.user_id;
  END LOOP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."propagate_member_update"() OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_id" "uuid",
    "sender_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar" "jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stored_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_content_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "content_text" "text",
    "name" "text",
    "mime_type" "text",
    "file_url" "text",
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


CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workspace_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text", 'readonly'::"text"])))
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



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "add_chat_owner_as_member_trigger" AFTER INSERT ON "public"."chats" FOR EACH ROW EXECUTE FUNCTION "public"."add_chat_owner_as_member"();



CREATE OR REPLACE TRIGGER "add_workspace_owner_as_member_trigger" AFTER INSERT ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."add_workspace_owner_as_member"();



CREATE OR REPLACE TRIGGER "inherit_members_from_parent_trigger" AFTER INSERT ON "public"."workspaces" FOR EACH ROW WHEN (("new"."parent_id" IS NOT NULL)) EXECUTE FUNCTION "public"."inherit_workspace_members_from_parent"();



CREATE OR REPLACE TRIGGER "propagate_workspace_member_delete" AFTER DELETE ON "public"."workspace_members" FOR EACH ROW EXECUTE FUNCTION "public"."propagate_member_delete"();



CREATE OR REPLACE TRIGGER "propagate_workspace_member_insert" AFTER INSERT ON "public"."workspace_members" FOR EACH ROW EXECUTE FUNCTION "public"."propagate_member_insert"();



CREATE OR REPLACE TRIGGER "propagate_workspace_member_update" AFTER UPDATE OF "role" ON "public"."workspace_members" FOR EACH ROW EXECUTE FUNCTION "public"."propagate_member_update"();



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



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stored_items"
    ADD CONSTRAINT "stored_items_message_content_id_fkey" FOREIGN KEY ("message_content_id") REFERENCES "public"."message_contents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_data"
    ADD CONSTRAINT "stored_reactives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subproviders"
    ADD CONSTRAINT "subproviders_custom_provider_id_fkey" FOREIGN KEY ("custom_provider_id") REFERENCES "public"."custom_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_assistants"
    ADD CONSTRAINT "user_assistants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_assistants"
    ADD CONSTRAINT "user_assistants_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_plugins"
    ADD CONSTRAINT "user_plugins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can read profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create chats" ON "public"."chats" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Group chat access" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."chats" "c"
     JOIN "public"."chat_members" "cm" ON (("cm"."chat_id" = "c"."id")))
  WHERE (("c"."id" = "messages"."chat_id") AND ("c"."type" = 'group'::"public"."chat_type") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Group chat delete" ON "public"."messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."chats" "c"
     JOIN "public"."chat_members" "cm" ON (("cm"."chat_id" = "c"."id")))
  WHERE (("c"."id" = "messages"."chat_id") AND ("c"."type" = 'group'::"public"."chat_type") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Group chat insert" ON "public"."messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."chats" "c"
     JOIN "public"."chat_members" "cm" ON (("cm"."chat_id" = "c"."id")))
  WHERE (("c"."id" = "messages"."chat_id") AND ("c"."type" = 'group'::"public"."chat_type") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can delete chat" ON "public"."chats" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owner can delete dialog messages" ON "public"."dialog_messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."dialogs" "d"
  WHERE (("d"."id" = "dialog_messages"."dialog_id") AND ("d"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owner can delete message contents" ON "public"."message_contents" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."dialog_messages" "dm"
     JOIN "public"."dialogs" "d" ON (("dm"."dialog_id" = "d"."id")))
  WHERE (("dm"."id" = "message_contents"."message_id") AND ("d"."user_id" = "auth"."uid"())))));



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



CREATE POLICY "Private chat full access" ON "public"."messages" USING ((EXISTS ( SELECT 1
   FROM ("public"."chats" "c"
     JOIN "public"."chat_members" "cm" ON (("cm"."chat_id" = "c"."id")))
  WHERE (("c"."id" = "messages"."chat_id") AND ("c"."type" = 'private'::"public"."chat_type") AND ("cm"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."chats" "c"
     JOIN "public"."chat_members" "cm" ON (("cm"."chat_id" = "c"."id")))
  WHERE (("c"."id" = "messages"."chat_id") AND ("c"."type" = 'private'::"public"."chat_type") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Read chats if owner" ON "public"."chats" FOR SELECT USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Read messages for chat members" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chat_members"
  WHERE (("chat_members"."chat_id" = "messages"."chat_id") AND ("chat_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Send messages if member of chat" ON "public"."messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."chat_members"
  WHERE (("chat_members"."chat_id" = "messages"."chat_id") AND ("chat_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "User can delete own artifact" ON "public"."artifacts" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "User can delete own stored reactives" ON "public"."user_data" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "User can delete own stored_items" ON "public"."stored_items" FOR DELETE USING ("public"."can_user_insert_stored_item"("message_content_id"));



CREATE POLICY "User can insert own artifact" ON "public"."artifacts" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "User can insert own stored reactives" ON "public"."user_data" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can insert own stored_items" ON "public"."stored_items" FOR INSERT WITH CHECK ("public"."can_user_insert_stored_item"("message_content_id"));



CREATE POLICY "User can read own stored reactives" ON "public"."user_data" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "User can read own stored_items" ON "public"."stored_items" FOR SELECT USING ("public"."can_user_insert_stored_item"("message_content_id"));



CREATE POLICY "User can update own artifact" ON "public"."artifacts" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "User can update own stored reactives" ON "public"."user_data" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "User can update own stored_items" ON "public"."stored_items" FOR UPDATE USING ("public"."can_user_insert_stored_item"("message_content_id"));



CREATE POLICY "Users can delete their assistants" ON "public"."user_assistants" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their custom providers" ON "public"."custom_providers" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own dialogs" ON "public"."dialogs" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their plugins" ON "public"."user_plugins" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their subproviders" ON "public"."subproviders" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."custom_providers" "cp"
  WHERE (("cp"."id" = "subproviders"."custom_provider_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert subproviders under their custom providers" ON "public"."subproviders" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."custom_providers" "cp"
  WHERE (("cp"."id" = "subproviders"."custom_provider_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their assistants" ON "public"."user_assistants" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their custom providers" ON "public"."custom_providers" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own dialogs" ON "public"."dialogs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their plugins" ON "public"."user_plugins" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their plugins" ON "public"."user_plugins" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their assistants" ON "public"."user_assistants" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their custom providers" ON "public"."custom_providers" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own dialogs" ON "public"."dialogs" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their plugins" ON "public"."user_plugins" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their subproviders" ON "public"."subproviders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."custom_providers" "cp"
  WHERE (("cp"."id" = "subproviders"."custom_provider_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their assistants" ON "public"."user_assistants" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their custom providers" ON "public"."custom_providers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their dialogs" ON "public"."dialogs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their memberships" ON "public"."chat_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their subproviders" ON "public"."subproviders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."custom_providers" "cp"
  WHERE (("cp"."id" = "subproviders"."custom_provider_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "access messages via dialog" ON "public"."dialog_messages" USING ((EXISTS ( SELECT 1
   FROM "public"."dialogs" "d"
  WHERE (("d"."id" = "dialog_messages"."dialog_id") AND ("d"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."custom_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dialog_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dialogs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_contents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subproviders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_assistants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_plugins" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chats";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."workspace_members";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."workspaces";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."add_chat_owner_as_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_chat_owner_as_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_chat_owner_as_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_workspace_owner_as_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_workspace_owner_as_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_workspace_owner_as_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_delete_workspace_items"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_delete_workspace_items"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_delete_workspace_items"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_insert_stored_item"("p_message_content_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_insert_stored_item"("p_message_content_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_insert_stored_item"("p_message_content_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_insert_workspace_member"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_insert_workspace_member"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_insert_workspace_member"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_modify_workspace_items"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_modify_workspace_items"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_modify_workspace_items"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_read_workspace_items"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_read_workspace_items"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_workspace_items"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_user_insert_stored_item"("p_message_content_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_insert_stored_item"("p_message_content_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_insert_stored_item"("p_message_content_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_on_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_chat_if_authorized"("chat_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_chat_if_authorized"("chat_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_chat_if_authorized"("chat_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_child_workspaces"("root_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_child_workspaces"("root_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_child_workspaces"("root_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workspace_user_role"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workspace_user_role"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workspace_user_role"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."inherit_workspace_members_from_parent"() TO "anon";
GRANT ALL ON FUNCTION "public"."inherit_workspace_members_from_parent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inherit_workspace_members_from_parent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_chat_member"("chat_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_chat_member"("chat_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_chat_member"("chat_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_stored_item_owner"("p_message_content_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_stored_item_owner"("p_message_content_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_stored_item_owner"("p_message_content_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_owner"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_owner"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_owner"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_public"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_public"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_public"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."propagate_member_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."propagate_member_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."propagate_member_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."propagate_member_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."propagate_member_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."propagate_member_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."propagate_member_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."propagate_member_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."propagate_member_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."start_private_chat_with"("target_user_id" "uuid", "current_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."start_private_chat_with"("target_user_id" "uuid", "current_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_private_chat_with"("target_user_id" "uuid", "current_user_id" "uuid") TO "service_role";


















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



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



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
