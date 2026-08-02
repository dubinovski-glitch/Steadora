// Shared domain types mirroring the API's JSON shapes. Code/Id pairs are common: *Id is the DB
// key, *Code is the stable string enum the UI switches on, *Name is the human label. Date/time
// fields are ISO-8601 strings. Most optional fields are server-computed or workflow-dependent.

// ─────────────────────────────────────────────────────────────────────────────
// Core ITSM records: Incident, Problem, Change (+ reviewer)
// ─────────────────────────────────────────────────────────────────────────────

// A support incident with its full detail: workflow (status/priority), SLA tracking, assignment,
// resolution, and roll-up counts. The queue and detail views render subsets of this.
export interface Incident {
  incidentId: number
  number: string
  title: string
  description?: string
  stepsToReproduce?: string
  priorityId: number
  priorityCode: string
  statusId: number
  statusCode: string
  impactCode?: string
  urgencyCode?: string
  severityCode?: string
  categoryName?: string
  subCategoryCode?: string
  subCategoryName?: string
  serviceName?: string
  ciAssetTag?: string
  reporterName?: string
  reporterDisplay?: string
  callerUserId?: number
  callerName?: string
  contactMethodCode?: string
  location?: string
  assigneeUserId?: number
  assigneeName?: string
  assigneeInitials?: string
  assigneeColor?: string
  groupName?: string
  isMajorIncident: boolean
  reassignCount: number
  resolutionCode?: string
  resolutionCodeName?: string
  resolutionNotes?: string
  slaTargetMinutes?: number
  slaResponseTargetMinutes?: number
  slaStartedAt?: string
  slaPausedSeconds: number
  slaBreachedAt?: string
  slaWarnedAt?: string
  slaPercent?: number
  firstResponseAt?: string
  reopenCount: number
  openedAt: string
  resolvedAt?: string
  closedAt?: string
  parentProblemId?: number
  parentProblemNumber?: string
  relatedChangeId?: number
  csatScore?: number
  isFirstCallResolution?: boolean
  commentCount: number
  linkedCount: number
  updatedAt: string
}

// A problem record (root-cause analysis behind one or more incidents). isKnownError marks it as
// a documented known error with a workaround.
export interface Problem {
  problemId: number
  number: string
  title: string
  rootCause?: string
  workaround?: string
  priorityCode: string
  stateCode: string
  stateName: string
  isKnownError: boolean
  assigneeName?: string
  assigneeInitials?: string
  assigneeColor?: string
  groupName?: string
  openedAt: string
  resolvedAt?: string
  linkedIncidentCount: number
  affectedServiceSlugs: string[]
  updatedAt: string
}

// A change request moving through the CAB workflow (rollout/rollback plans, scheduling, reviewers).
export interface Change {
  changeId: number
  number: string
  title: string
  description?: string
  rolloutPlan?: string
  rollbackPlan?: string
  impactNotes?: string
  changeTypeCode: string
  riskCode: string
  stateCode: string
  stateName: string
  ownerName?: string
  ownerInitials?: string
  ownerColor?: string
  approverName?: string
  groupName?: string
  cabName?: string
  scheduledStart?: string
  scheduledEnd?: string
  downtimeEstimate?: string
  submittedAt?: string
  approvedAt?: string
  completedAt?: string
  reviewers: ChangeReviewer[]
  affectedServiceSlugs: string[]
  updatedAt: string
}

// One CAB member's vote on a change (voteCode = approve/reject/abstain etc.).
export interface ChangeReviewer {
  userId: number
  userName: string
  userInitials?: string
  userColor?: string
  voteCode: string
  comment?: string
  votedAt?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard / SLA reporting aggregates (read-only, returned by dashboardApi)
// ─────────────────────────────────────────────────────────────────────────────

// Headline KPI tiles for the dashboard.
export interface SlaStats {
  openIncidents: number
  slaAtRisk: number
  changesThisWeek: number
  avgResolutionMinutes?: number
  slaMetPercent: number
  slaBreachCount: number
  totalResolved: number
}

export interface SlaByPriority {
  priority: string
  targetMinutes: number
  totalIncidents: number
  metCount: number
  breachedCount: number
  pctMet: number
}

export interface TeamLoad {
  teamName: string
  openIncidents: number
  metSla: number
  breaches: number
  pctMet: number
}

export interface DailyVolume {
  bucketDate: string
  openedCount: number
  sameDayResolved: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin configuration entities (managed under the Admin view via adminApi)
// ─────────────────────────────────────────────────────────────────────────────

// Full user record as seen in admin (vs. the slimmer CurrentUser for the signed-in session).
export interface User {
  userId: number
  externalId: string
  email: string
  username: string
  displayName: string
  title?: string
  avatarInitials?: string
  avatarColor?: string
  roleId: number
  roleCode: string
  groupNames?: string
  isActive: boolean
}

export interface Group {
  groupId: number
  slug: string
  name: string
  description?: string
  isActive: boolean
  memberCount: number
}

export interface AdminSubCategory {
  subCategoryId: number
  categoryId: number
  code: string
  displayName: string
}

export interface AdminCategory {
  categoryId: number
  serviceId?: number
  serviceName?: string
  code: string
  displayName: string
  ticketCount: number
  subCategories: AdminSubCategory[]
}

export interface Role {
  roleId: number
  code: string
  displayName: string
  description?: string
  userCount: number
}

export interface Service {
  serviceId: number
  slug: string
  name: string
  healthCode: string
  openIncidentCount: number
}

export interface AdminService {
  serviceId: number
  slug: string
  name: string
  owningGroupId?: number
  owningGroupName?: string
  healthCode: string
  openIncidentCount: number
  slaTierId?: number
  slaTierName?: string
  isActive: boolean
}

// Per-priority response/resolution targets (minutes) within an SLA tier.
export interface SlaTierTarget {
  targetId: number
  slaTierId: number
  priorityId: number
  priorityCode: string
  priorityDisplayName: string
  responseMinutes: number
  resolutionMinutes: number
}

// An SLA policy tier; calculate247 = clock runs 24/7 vs. business hours, autoEscalate = on breach.
export interface SlaTier {
  slaTierId: number
  name: string
  description?: string
  isActive: boolean
  calculate247: boolean
  autoEscalate: boolean
  sortOrder: number
  targets: SlaTierTarget[]
}

// Working hours for one weekday in a calendar (dayOfWeek 0=Sun..6=Sat; times null = closed).
export interface BusinessDay {
  dayId: number
  calendarId: number
  dayOfWeek: number
  startTime?: string
  endTime?: string
}

export interface BusinessHoliday {
  holidayId: number
  calendarId: number
  holidayDate: string
  name: string
}

export interface BusinessCalendar {
  calendarId: number
  name: string
  timezone: string
  isDefault: boolean
  days: BusinessDay[]
  holidays: BusinessHoliday[]
}

// A when/then automation rule; runCount30d is a rolling 30-day execution counter.
export interface Automation {
  automationId: number
  name: string
  whenDescription: string
  thenDescription: string
  isEnabled: boolean
  runCount30d: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-records: comments and activity/audit events on records
// ─────────────────────────────────────────────────────────────────────────────

// A comment on a record; internal=true means staff-only (not shown to the requester).
export interface Comment {
  commentId: number
  authorName?: string
  authorInitials?: string
  authorColor?: string
  authorDisplay?: string
  body: string
  internal: boolean
  createdAt: string
  editedAt?: string
}

// A single timeline/audit entry; for field-change events kind names the change and old/newValue
// capture the transition.
export interface ActivityEvent {
  activityId: number
  actorName?: string
  actorInitials?: string
  actorColor?: string
  kind: string
  field?: string
  oldValue?: string
  newValue?: string
  occurredAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-tenancy: workspaces and their per-field visibility/requirement config
// ─────────────────────────────────────────────────────────────────────────────

// A tenant. fields drive form field visibility/requirement; userIds is its membership.
export interface Workspace {
  workspaceId: number
  name: string
  slug: string
  description?: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  fields: WorkspaceField[]
  userIds: number[]
}

// One field override for a workspace: (entityType, fieldKey) -> visible/mandatory. Read by useWorkspaceFields.
export interface WorkspaceField {
  workspaceFieldId: number
  workspaceId: number
  entityType: string
  fieldKey: string
  isVisible: boolean
  isMandatory: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// UI navigation enums and the Task model
// ─────────────────────────────────────────────────────────────────────────────

// Top-level screens, used as appStore.view (App's pseudo-router key).
export type View = 'dashboard' | 'incidents' | 'problems' | 'changes' | 'sla' | 'admin' | 'tasks'

export type TaskType = 'incident' | 'problem' | 'change' | 'general'
export type TaskScope = 'mine' | 'mygroup'
// Tasks view sub-mode: list mine, list my group's, or show the new-task form.
export type TaskMode = 'mine' | 'mygroup' | 'new'

// A unit of work, optionally linked to a parent record via referenceNumber. Comment fields note
// the encoded number format, status codes, and that subtype is a per-type sub-category.
export interface Task {
  taskId: number
  number: string            // e.g. INCTASK-00000013
  taskType: TaskType
  title: string
  referenceNumber: string | null
  priorityId: number
  priorityCode: string
  statusCode: string        // open | progress | onhold | done
  onHoldReason?: string | null
  dueDate: string | null
  subtype?: string | null   // per-type category
  plannedStart?: string | null
  plannedEnd?: string | null
  assigneeUserId?: number
  assigneeName?: string
  assigneeInitials?: string
  assigneeColor?: string
  groupId?: number
  groupName?: string
  description?: string
  createdAt: string
  updatedAt: string
}
// Sections within the Admin view (appStore.adminSection).
export type AdminSection = 'users' | 'teams' | 'categories' | 'roles' | 'services' | 'sla-policies' | 'business-hours' | 'workflow' | 'automations' | 'workspaces'

// ─────────────────────────────────────────────────────────────────────────────
// Lookup / reference types (loaded via lookupsApi to populate form dropdowns).
// All follow the same id/code/displayName/sortOrder shape.
// ─────────────────────────────────────────────────────────────────────────────

// isTerminal = a closed/done status; pausesSla = SLA clock stops while in this status.
export interface IncidentStatus {
  statusId: number
  code: string
  displayName: string
  isTerminal: boolean
  pausesSla: boolean
  sortOrder: number
}

export interface Priority {
  priorityId: number
  code: string
  displayName: string
  sortOrder: number
  defaultResponseMin: number
  defaultResolutionMin: number
}

export interface ContactMethod {
  contactMethodId: number
  code: string
  displayName: string
  sortOrder: number
}

export interface Severity {
  severityId: number
  code: string
  displayName: string
  sortOrder: number
}

export interface ResolutionCode {
  resolutionCodeId: number
  code: string
  displayName: string
  sortOrder: number
}

export interface Impact {
  impactId: number
  code: string
  displayName: string
  sortOrder: number
}

export interface Urgency {
  urgencyId: number
  code: string
  displayName: string
  sortOrder: number
}

export interface SubCategoryLookup {
  subCategoryId: number
  categoryId: number
  code: string
  displayName: string
  sortOrder: number
}

export interface CategoryLookup {
  categoryId: number
  serviceId?: number
  code: string
  displayName: string
  sortOrder: number
}

// The signed-in user's session profile (stored in authStore). serviceIds scope their visible data.
export interface CurrentUser {
  userId: number
  externalId: string
  username: string
  email: string
  displayName: string
  avatarInitials?: string
  avatarColor?: string
  roleCode: string
  roleDisplayName: string
  serviceIds: number[]
}

export interface ChangeType {
  changeTypeId: number
  code: string
  displayName: string
  sortOrder: number
}

export interface Risk {
  riskId: number
  code: string
  displayName: string
  sortOrder: number
}

export interface ChangeState {
  stateId: number
  code: string
  displayName: string
  isTerminal: boolean
  sortOrder: number
}

// Stable string enums for incident priority and status (the *Code values switched on in the UI).
export type PriorityCode = 'critical' | 'high' | 'medium' | 'low'
export type StatusCode = 'new' | 'progress' | 'pending' | 'resolved' | 'closed'
