# Supabase Database Row Level Security (RLS) Documentation

This document provides a comprehensive overview of the Row Level Security (RLS) policies in the AIaW Supabase database. RLS is used to control which records users can access, ensuring proper data isolation and security.

## Table of Contents
- [Entities and Tables](#entities-and-tables)
- [Core Security Functions](#core-security-functions)
- [Permission Model](#permission-model)
- [RLS Policies by Table](#rls-policies-by-table)
- [Data Relationships](#data-relationships)
- [Triggers and Automation](#triggers-and-automation)
- [Security Considerations](#security-considerations)
- [Recent Schema Changes](#recent-schema-changes)

## Entities and Tables

### User-related Tables
- **profiles**: User profiles with basic information
- **user_data**: Key-value storage for user preferences and settings
- **user_plugins**: Plugins installed by users
- **user_assistants**: AI assistants configured by users, with sharing capabilities
- **custom_providers**: Custom LLM providers configured by users
- **subproviders**: Provider configurations for custom providers
- **user_workspaces**: Direct mapping between users and their accessible workspaces

### Content and Message Tables
- **dialogs**: Conversations between users and assistants
- **dialog_messages**: Individual messages in dialogs
- **message_contents**: Content of messages (text/tools)
- **stored_items**: Files, images, and quotes stored from conversations
- **artifacts**: Files and code created or modified during conversations

### Chat-related Tables
- **chats**: Chat channels (workspace, private)
- **chat_members**: Users who are members of chats
- **messages**: Messages sent in chats

### Workspace-related Tables
- **workspaces**: Containers for collaboration
- **workspace_members**: Users who are members of workspaces with roles
- **user_workspaces**: Denormalized table for quick user-to-workspace access lookups

## Core Security Functions

### User Authentication
- `auth.uid()`: Supabase function that returns the ID of the authenticated user

### Workspace Access Control
- `get_workspace_role(workspace_id, user_id)`: Gets the role of a user in a workspace
- `is_workspace_admin_or_owner(workspace_id_param)`: Checks if user is admin or owner of workspace
- `is_workspace_member(workspace_id_param)`: Checks if user is a member of workspace (any role)
- `is_workspace_owner(user_id)`: Checks if user owns any workspaces
- `sync_user_workspaces()`: Trigger function to keep user_workspaces in sync with workspace_members

### Chat Access Control
- `is_chat_member(chat_id_param)`: Checks if user is a member of chat
- `is_chat_owner(chat_id_param)`: Checks if user is the owner of a chat
- `can_manage_chat(chat_id_param)`: Checks if user can manage a chat (owner or workspace admin)
- `start_private_chat_with(target_user_id, current_user_id)`: Creates a private chat between two users

### Assistant Access Control
- `can_manage_assistant(assistant_id_param)`: Checks if user can manage an assistant (owner or workspace admin for shared assistants)

### Other Functions
- `add_workspace_owner_as_member()`: Trigger function to add workspace owner as admin member
- `create_profile_on_signup()`: Trigger function to create profile when user signs up
- `debug_workspaces()`: Utility function to help debug workspaces

## Permission Model

### Workspace Roles
- **owner**: Full control (creator of workspace)
- **admin**: Administrative access
- **member**: Standard access
- **guest**: Read-only access

### Chat Types
- **workspace**: Chats associated with a workspace, accessible to workspace members
- **private**: Direct message chats between users

### Public vs Private Workspaces
- **Public workspaces**: 
  - Visible to anyone
  - Anyone can join as a member
  - Content readable by anyone
- **Private workspaces**: 
  - Only visible to members
  - Must be invited by admin or owner
  - Content only accessible to members

## RLS Policies by Table

### workspaces
- `Any user can create a workspace`: Any authenticated user can create workspaces
- `Public workspace can be read by anyone`: Public workspaces are visible to all
- `Private workspace can only be read by members`: Private workspaces only visible to members
- `Admin or owner can update workspace`: Only admin or owner can update workspace
- `Owner can delete workspace`: Only owner can delete workspace

### workspace_members
- `Admin or owner can CRUD workspace_members`: Only admin or owner can manage members
- `Members can read workspace_members`: All members can see other members
- `Anyone can add themselves to public workspaces`: Users can join public workspaces without invitation

### chats
- `Workspace members can create workspace chats`: Only workspace members (admin/member) can create workspace chats
- `Admin can CRUD any workspace chat`: Workspace admins have full control of workspace chats
- `Chat owner or workspace admin can delete chat`: Owner or admin can delete chats
- `Anyone can read public workspace chats`: Public workspace chats are readable by anyone
- `Members can read private workspace chats`: Private workspace chats only visible to workspace members
- `Anyone can create private chats`: Any user can create private chats
- `Chat members can update private chats`: Only members can update private chats
- `Chat members can read private chats`: Only members can read private chats
- `Chat owner can delete private chats`: Only owner can delete private chats

### chat_members
- `Anyone can join public chats`: Users can join public chats without invitation
- `Chat owner can manage members`: Chat owner or workspace admin can manage chat members

### messages
- `Messages inherit chat permissions`: Message access follows parent chat permissions
- `Admin can CRUD any workspace message`: Admins have full control of messages in workspace chats
- `Chat members can create messages`: Only chat members can create messages
- `Message sender can update own messages`: Users can edit their own messages
- `Message sender or chat manager can delete messages`: Sender, chat owner, or admin can delete messages

### profiles
- `Anyone can read profiles`: Profiles are publicly readable
- `Users can update their own profile`: Users can only update their own profile

### user_data
- `User can read own stored reactives`: Users can read their own data
- `User can insert own stored reactives`: Users can create their own data
- `User can update own stored reactives`: Users can update their own data
- `User can delete own stored reactives`: Users can delete their own data

### dialogs & dialog_messages
- Various owner-based policies for CRUD operations
- Access limited to dialog creator

### artifacts
- `User can insert own artifact`: Users can create artifacts
- `User can update own artifact`: Users can update their artifacts
- `User can delete own artifact`: Users can delete their artifacts

### user_assistants
- `Users can view their own assistants`: Users can view assistants they created
- `Users can view global shared assistants`: Anyone can view globally shared assistants
- `Workspace members can view workspace shared assistants`: Workspace members can view assistants shared to their workspace
- `Workspace admins can manage workspace shared assistants`: Workspace admins can edit assistants shared to their workspace
- `Users can update their assistants`: Users can update their own assistants
- `Users can delete their assistants`: Users can delete their own assistants

### custom_providers, user_plugins
- Standard owner-based policies limiting access to creator

## Data Relationships

### Key Relationships
- Workspaces can have parent-child relationships
- Assistants can have parent-child relationships through parent_id
- Chats can belong to workspaces
- Dialog messages belong to dialogs
- Message contents belong to dialog messages
- Chat members link users to chats
- Workspace members link users to workspaces
- User workspaces provide a denormalized view of user-to-workspace relationships

### Cascade Deletes
The database uses ON DELETE CASCADE extensively to maintain referential integrity:
- When a workspace is deleted, all its chats, members, dialogs, etc. are deleted
- When a chat is deleted, all its messages and members are deleted
- When a dialog is deleted, all its messages and message contents are deleted

## Triggers and Automation

- `add_workspace_owner_as_member_trigger`: Automatically adds workspace owner as admin member
- `sync_user_workspaces_insert_trigger` and `sync_user_workspaces_delete_trigger`: Maintain user_workspaces table
- When a workspace is created, the owner is automatically added as an admin member
- When users are added to workspace_members, a record is automatically added to user_workspaces
- When users are removed from workspace_members, the corresponding record is removed from user_workspaces 
- User profiles are automatically created when users sign up

## Security Considerations

### Security Definer Functions
All permission-checking functions use `SECURITY DEFINER` and execute with row security disabled to prevent RLS from interfering with permission checks.

### Parameter Naming
Functions use clear parameter naming (`workspace_id_param`, `chat_id_param`) to avoid column ambiguity in function bodies.

### Ownership Validation
All content access is validated through chains of ownership:
- User owns dialog → Dialog contains messages → Messages contain content
- User is member of chat → Chat contains messages → User can access messages

## Recent Schema Changes

### Assistant Sharing and User Workspaces (August 2025)
- Added `parent_id` and `is_shared` to user_assistants table for inheritance and sharing
- Created `assistant_sharing_type` ENUM with 'global' and 'workspace' values
- Added `can_manage_assistant` function to handle complex assistant permissions
- Created `user_workspaces` table for fast user-workspace relationship lookups
- Added triggers to maintain user_workspaces data automatically
- Enhanced RLS policies for shared assistants (global and workspace-level)

### Enhanced Access Control (July 2025)
- Added `is_workspace_admin_or_owner` function to centralize permission checks
- Added `is_workspace_member` function for membership verification
- Enhanced chat access control with `can_manage_chat` function
- Implemented clear distinction between workspace and private chats
- Improved parameter naming in functions to avoid ambiguity

### Chat Type Simplification (June 2025)
- Simplified chat types from three values (workspace, group, private) to two (workspace, private)
- Updated chat-related RLS policies to use workspace membership for access control
- Enhanced workspace public/private access model with is_public flag