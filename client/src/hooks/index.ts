/**
 * Hooks Index
 * Export all custom hooks for easy importing
 */

// Lead hooks
export { useLeads, default as useLeadsDefault } from './useLeads';

// Task hooks
export { useTasks, useTodaysDashboard, default as useTasksDefault } from './useTasks';

// Notification hooks
export { useNotifications, default as useNotificationsDefault } from './useNotifications';

// Analytics hooks
export {
  useOverview,
  useFunnel,
  useActivityAnalytics,
  useRevenue,
  useDashboard,
  useAnalyticsExport,
} from './useAnalytics';

// Dashboard Analytics hook
export { useDashboardAnalytics } from './useDashboardAnalytics';

// Team hooks
export {
  useTeamMembers,
  useTeamStats,
  useTeamActivity,
  useLeadAssignment,
} from './useTeam';

// WhatsApp hooks
export {
  useTemplates,
  useWhatsAppLink,
  useQuickWhatsApp,
  useTemplatePreview,
} from './useWhatsApp';

// Activity hooks
export {
  useLeadActivities,
  useActivityTimeline,
  useActivityStats,
  useActivityLogger,
} from './useActivities';

// Image upload hook
export { useImageUpload } from './useImageUpload';

// Scheduled messages hook
export { default as useScheduledMessages } from './useScheduledMessages';
