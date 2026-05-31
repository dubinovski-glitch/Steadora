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
  relatedKbArticleId?: number  // BIGINT — safe as JS number up to 2^53
  csatScore?: number
  isFirstCallResolution?: boolean
  isKbArticleCreated: boolean
  commentCount: number
  linkedCount: number
  updatedAt: string
}

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

export interface ChangeReviewer {
  userId: number
  userName: string
  userInitials?: string
  userColor?: string
  voteCode: string
  comment?: string
  votedAt?: string
}

export interface KbArticle {
  articleId: number
  number: string
  title: string
  snippet?: string
  body?: string
  kbCategorySlug: string
  kbCategoryName: string
  authorName?: string
  authorInitials?: string
  authorColor?: string
  status: string
  pinned: boolean
  views: number
  helpfulCount: number
  notHelpfulCount: number
  helpfulPercent: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface KbCategory {
  kbCategoryId: number
  slug: string
  displayName: string
  icon?: string
  sortOrder: number
  articleCount: number
}

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

export interface SlaTierTarget {
  targetId: number
  slaTierId: number
  priorityId: number
  priorityCode: string
  priorityDisplayName: string
  responseMinutes: number
  resolutionMinutes: number
}

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

export interface Automation {
  automationId: number
  name: string
  whenDescription: string
  thenDescription: string
  isEnabled: boolean
  runCount30d: number
}

export interface PriorityMatrixRow {
  impactId: number
  urgencyId: number
  priorityId: number
}

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

export interface WorkspaceField {
  workspaceFieldId: number
  workspaceId: number
  entityType: string
  fieldKey: string
  isVisible: boolean
  isMandatory: boolean
}

export type View = 'dashboard' | 'incidents' | 'problems' | 'changes' | 'knowledge' | 'sla' | 'admin'
export type AdminSection = 'users' | 'teams' | 'categories' | 'roles' | 'services' | 'priority-matrix' | 'sla-policies' | 'business-hours' | 'workflow' | 'automations' | 'workspaces'

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

export type PriorityCode = 'critical' | 'high' | 'medium' | 'low'
export type StatusCode = 'new' | 'progress' | 'pending' | 'resolved' | 'closed'
