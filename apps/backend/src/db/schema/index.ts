// Auth tables
export {
    roleEnum,
    user,
    session,
    account,
    verification,
    userRelations,
    sessionRelations,
    accountRelations,
} from "./auth.js";
export type { User } from "./auth.js";

// Conversation tables
export {
    conversationStatusEnum,
    messageRoleEnum,
    conversation,
    message,
    conversationRelations,
    messageRelations,
} from "./conversation.js";
export type {
    CollectedInfo,
    Conversation,
    NewConversation,
    Message,
    NewMessage,
} from "./conversation.js";
