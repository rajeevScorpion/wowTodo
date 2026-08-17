// Domain types

export type UserProfile = {
    id: string;
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    date_of_birth: string | null;
    profession: string | null;
    city: string | null;
    bio: string | null;
    created_at: string;
    updated_at: string;
};

export type Task = {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    source_text: string | null;
    source_type: 'text' | 'voice';
    group_id: string | null;
    event_time: string | null; // ISO 8601 timestamptz
    parent_todo_id: string | null; // FK to todos.id — set when this task is a branch
    created_at: string;
    updated_at: string;
};

export type TaskGroup = {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
    updated_at: string;
};

export type Todo = {
    id: string;
    task_id: string;
    user_id: string;
    title: string;
    completed: boolean;
    order: number;
    due_date: string | null; // 'YYYY-MM-DD'
    due_time: string | null; // 'HH:MM' or 'HH:MM:SS'
    is_branched: boolean; // true when this todo has a branch task
    created_at: string;
    updated_at: string;
};

export type TaskWithProgress = Task & {
    todos: Todo[];
    total_count: number;
    completed_count: number;
};

// Sharing types

export type ShareStatus = 'pending' | 'accepted' | 'rejected' | 'revoked';

export type Share = {
    id: string;
    task_id: string;
    owner_id: string;
    recipient_id: string;
    status: ShareStatus;
    include_branches: boolean;
    rejection_note: string | null;
    created_at: string;
    updated_at: string;
};

export type InAppNotificationType =
    | 'share_received'
    | 'share_accepted'
    | 'share_rejected';

export type InAppNotification = {
    id: string;
    user_id: string;
    type: InAppNotificationType;
    share_id: string | null;
    task_id: string | null;
    actor_id: string | null;
    body: string;
    read: boolean;
    created_at: string;
};

export type UserSearchResult = {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
};

// Supabase Database type.
//
// Generated from the live schema — do NOT hand-edit. Regenerate after every
// migration with:  npm run gen:types
// A hand-maintained copy used to live here and had already drifted from the
// database (RPC return types were missing entirely, so rpc() returned `{}`).
export type { Database } from './database';

export type ReminderType = 'notification' | 'alarm' | 'both';

export type ReminderSlot = {
    minutes_before: number;
    type: ReminderType;
    enabled: boolean;
};

export type ReminderSettingsRow = {
    id: string;
    user_id: string;
    group_id: string | null;
    slot1_minutes_before: number | null;
    slot1_type: ReminderType | null;
    slot1_enabled: boolean;
    slot2_minutes_before: number | null;
    slot2_type: ReminderType | null;
    slot2_enabled: boolean;
    slot3_minutes_before: number | null;
    slot3_type: ReminderType | null;
    slot3_enabled: boolean;
    created_at: string;
    updated_at: string;
};

export type ReminderSettings = {
    id: string;
    user_id: string;
    group_id: string | null;
    slots: ReminderSlot[];
    created_at: string;
    updated_at: string;
};

export type ScheduledReminder = {
    id: string;
    user_id: string;
    todo_id: string;
    slot_number: number;
    fire_at: string;
    type: ReminderType;
    notification_id: string | null;
    created_at: string;
};

// AI service types

export type AIGeneratedTodo = {
    title: string;
    due_date: string | null; // 'YYYY-MM-DD'
    due_time: string | null; // 'HH:MM'
};

export type AIGroupSuggestions = {
    selected: string;
    existing_ranked: string[];
    new_suggestions: string[];
};

export type AIGeneratedTask = {
    title: string;
    description: string;
    event_time: string | null; // ISO datetime
    todos: AIGeneratedTodo[];
    groups: AIGroupSuggestions;
};

// Branch AI context type
export type BranchContext = {
    motherTask: { title: string; description: string | null };
    motherTodos: { title: string; order: number }[];
    branchedTodo: { title: string; order: number };
    userProfile?: { profession: string | null; city: string | null };
    additionalContext: string;
};

// Helper to convert DB row to domain type
export function rowToReminderSettings(row: ReminderSettingsRow): ReminderSettings {
    const slots: ReminderSlot[] = [
        {
            minutes_before: row.slot1_minutes_before ?? 15,
            type: row.slot1_type ?? 'notification',
            enabled: row.slot1_enabled,
        },
        {
            minutes_before: row.slot2_minutes_before ?? 60,
            type: row.slot2_type ?? 'notification',
            enabled: row.slot2_enabled,
        },
        {
            minutes_before: row.slot3_minutes_before ?? 1440,
            type: row.slot3_type ?? 'notification',
            enabled: row.slot3_enabled,
        },
    ];
    return {
        id: row.id,
        user_id: row.user_id,
        group_id: row.group_id,
        slots,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function reminderSettingsToRow(
    settings: ReminderSettings
): Omit<ReminderSettingsRow, 'id' | 'created_at' | 'updated_at'> {
    const [s1, s2, s3] = settings.slots;
    return {
        user_id: settings.user_id,
        group_id: settings.group_id,
        slot1_minutes_before: s1?.minutes_before ?? 15,
        slot1_type: s1?.type ?? 'notification',
        slot1_enabled: s1?.enabled ?? true,
        slot2_minutes_before: s2?.minutes_before ?? null,
        slot2_type: s2?.type ?? null,
        slot2_enabled: s2?.enabled ?? false,
        slot3_minutes_before: s3?.minutes_before ?? null,
        slot3_type: s3?.type ?? null,
        slot3_enabled: s3?.enabled ?? false,
    };
}

// Normalize AI response todos (handles both string[] and AIGeneratedTodo[])
export function normalizeAITodos(todos: (string | AIGeneratedTodo)[]): AIGeneratedTodo[] {
    return todos.map((t) => {
        if (typeof t === 'string') {
            return { title: t, due_date: null, due_time: null };
        }
        return {
            title: t.title,
            due_date: t.due_date ?? null,
            due_time: t.due_time ?? null,
        };
    });
}

// Voice recording types

export type RecordingState = 'idle' | 'recording' | 'processing';

// Language types

export type AppLanguage = 'en' | 'hi';
