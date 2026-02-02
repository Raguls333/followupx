/**
 * Services Index
 * Export all API services
 */

export { default as api, setAuthToken, getAuthToken, clearAuthToken, ApiError } from './api';
export { default as authService } from './authService';
export { default as leadService } from './leadService';
export { default as taskService } from './taskService';
export { default as activityService } from './activityService';
export { default as whatsappService } from './whatsappService';
export { default as analyticsService } from './analyticsService';
export { default as notificationService } from './notificationService';
export { default as teamService } from './teamService';
export { default as uploadService } from './uploadService';
export { default as scheduledMessagesService } from './scheduledMessagesService';
export { default as templateService } from './templateService';

// Re-export types
export type { User, LoginResponse, RegisterPayload, LoginPayload } from './authService';
export type { Lead, LeadAssignee, LeadFilters, LeadsResponse, CreateLeadPayload, ImportResult, AIRecoveryLead, AIRecoveryResponse } from './leadService';
export type { Task, TaskFilters, TasksResponse, TodaysDashboard, CreateTaskPayload, CompleteTaskPayload } from './taskService';
export type { Activity, ActivityFilters, ActivitiesResponse, CreateActivityPayload } from './activityService';
export type { Template, WhatsAppLinkResponse, TemplatesResponse, CreateTemplatePayload, TemplateCategory } from './whatsappService';
export type { OverviewData, FunnelData, ActivityAnalytics, RevenueData, DashboardData } from './analyticsService';
export type { Notification, NotificationsResponse, UnreadResponse } from './notificationService';
export type { TeamMember, TeamMembersResponse, TeamStatsResponse, TeamActivityResponse } from './teamService';
export type { UploadedImage } from './uploadService';
