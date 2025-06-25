# User Participant Management Implementation

## Summary

This implementation creates a comprehensive user management system for both workspace members and chat participants, following the core functionality requirements. Additionally, it includes a real-time user presence tracking system.

## Components Created

### 1. UserProfileBlock.vue (`src/shared/components/user/UserProfileBlock.vue`)
- **Purpose**: Displays user information with avatar, name, status, and subtitle
- **Features**:
  - Built on Quasar `q-item` component for better integration
  - Avatar display with configurable sizes (sm, md, lg)
  - User status indicator (online, away, busy, offline)
  - Horizontal/vertical layout options with responsive design
  - Clickable support with Quasar ripple effects
  - Ellipsis text overflow handling
  - No custom SCSS - fully uses Quasar classes

### 2. UserProfileStatus.vue (`src/shared/components/user/UserProfileStatus.vue`)
- **Purpose**: Status indicator component with text and dot modes
- **Features**:
  - Color-coded status indicators (green=online, yellow=away, red=busy, gray=offline)
  - Dark/light theme support
  - Configurable sizes and text display
  - Quasar-integrated styling

### 3. ParticipantManager.vue (`src/shared/components/user/ParticipantManager.vue`)
- **Purpose**: Main component for managing workspace members and chat participants
- **Features**:
  - Enhanced header with participant count and group icon
  - Inline add participant button
  - Real-time participant list with search functionality
  - Role management (admin, member, guest) with proper permissions
  - Add/remove participants with confirmation dialogs
  - Empty state with meaningful messaging
  - Visual separators between participants
  - Loading states and error handling
  - **Real-time user presence status display**
  - Super admin controls for workspace owners
  - No custom SCSS - pure Quasar implementation

### 4. UserStatusSelector.vue (`src/shared/components/user/UserStatusSelector.vue`)
- **Purpose**: Dropdown component for users to manually set their presence status
- **Features**:
  - Online, Away, Busy, Offline status options
  - Color-coded icons and labels
  - Optional text label display
  - Real-time status updates

## Real-time Presence System

### Core Files
- **`usePresenceStore`** (`src/features/profile/store/presence.ts`) - Global presence state management
- **`useGlobalPresence`** (`src/features/profile/composables/useGlobalPresence.ts`) - App-level initialization
- **`useUserPresence`** (`src/features/profile/composables/useUserPresence.ts`) - Room-specific presence tracking

### Features
- **Real-time WebSocket connections** using Supabase Presence API
- **Auto-away detection** after 5 minutes of inactivity
- **Tab visibility tracking** (away when tab hidden)
- **Activity monitoring** (mouse, keyboard, scroll events)
- **Cross-user status updates** visible in real-time
- **Manual status setting** via UserStatusSelector component
- **Online user counting** and presence data management

### Integration
- **App.vue**: Global presence initialization on app startup
- **ParticipantManager**: Real-time status display for all participants
- **UserProfileBlock**: Shows live user presence status
- **i18n**: English translations for all presence states

## Implementation Details

### Permission System
- **Workspace Owner**: Cannot be removed, has super admin privileges
- **Admin Users**: Can manage member/guest roles but not other admins or owner
- **Members/Guests**: Read-only access to participant list

### Super Admin Features
- **Owner Badge**: Special purple badge with admin panel icon
- **Immutable Role**: Owner role cannot be changed by anyone
- **Full Control**: Can edit any user's role including other admins
- **Cannot be Removed**: Remove button hidden for workspace owner

### Real-time Updates
- **Automatic UI refresh** when participants are added/removed
- **Live role changes** without page refresh
- **Real-time presence status** updates
- **WebSocket-based** using Supabase real-time subscriptions

### Technology Stack
- **Frontend**: Vue 3 + Quasar Framework
- **State Management**: Pinia stores
- **Real-time**: Supabase WebSocket connections
- **Styling**: Pure Quasar classes (no custom SCSS)
- **Internationalization**: Vue I18n with English translations

## Database Integration

### Tables Used
- **`workspace_members`**: Workspace membership and roles
- **`profiles`**: User profile information and avatars
- **`workspaces`**: Workspace metadata including owner_id

### Real-time Subscriptions
- **Workspace member changes**: Live updates when users join/leave
- **User presence tracking**: WebSocket-based status monitoring
- **Profile updates**: Avatar and name changes reflected immediately

## Usage Examples

### Adding Presence to Any Component
```typescript
import { usePresenceStore } from '@/features/profile/store/presence'

const presenceStore = usePresenceStore()
const userStatus = presenceStore.getUserStatus(userId) // 'online' | 'away' | 'busy' | 'offline'
```

### Manual Status Setting
```vue
<template>
  <user-status-selector show-label />
</template>
```

### Participant Management
```vue
<template>
  <participant-manager
    type="workspace"
    :id="workspaceId"
    :is-admin="isAdmin"
    :workspace-owner-id="workspace.ownerId"
  />
</template>
```

This implementation provides a complete, production-ready user management and presence system with real-time capabilities, proper permissions, and modern UI patterns.
