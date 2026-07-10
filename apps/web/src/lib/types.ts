export type AuthProviderStatus = {
  id: "google" | "github" | "microsoft";
  label: string;
  enabled: boolean;
};

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type CurrentUser = {
  id: number;
  username: string;
  email: string | null;
  primary_provider: string;
  role: string;
  is_superuser: boolean;
};

export type NotificationSeverity = "info" | "success" | "warning" | "critical";
export type NotificationAudience = "admin" | "client";

export interface NotificationItem {
  id: string;
  user_id: number;
  audience: NotificationAudience;
  severity: NotificationSeverity;
  title: string;
  body: string;
  context: string;
  href: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationReadResponse {
  notification: NotificationItem | null;
  unread_count: number;
}

export type IntegrityAlertType = "look_away" | "neighboring_desk" | "unauthorized_device";
export type IntegrityAlertStatus = "detected" | "visible" | "confirmed" | "dismissed" | "follow_up" | "closed";
export type IntegrityAlertDecision = "confirmed" | "dismissed" | "follow_up";

export interface IntegrityAlertEvidenceAsset {
  id: number;
  kind: string;
  uri: string;
  capturedAt: string;
  qualityNote: string;
}

export interface IntegrityAlertReviewAction {
  id: number;
  reviewer: string;
  decision: IntegrityAlertDecision;
  note: string;
  createdAt: string;
}

export interface IntegrityAlertWindow {
  startedAt: string;
  endedAt: string;
}

export interface IntegrityAlertCamera {
  id: number;
  name: string;
  status: string;
}

export interface IntegrityAlertSeat {
  id: number;
  label: string;
}

export interface IntegrityAlertExamSession {
  id: number;
  course: string;
  courseTitle: string;
  hall: string;
  status: string;
}

export interface IntegrityAlertExamVideo {
  id: number;
  originalFilename: string;
  status: string;
}

export interface IntegrityAlertSummary {
  id: number;
  alertType: IntegrityAlertType;
  alertTypeLabel: string;
  status: IntegrityAlertStatus;
  summary: string;
  occurredAt: string;
  window: IntegrityAlertWindow;
  confidenceScore: number;
  visibilityQuality: string;
  metadata: Record<string, JsonValue>;
  examSession: IntegrityAlertExamSession;
  examVideo: IntegrityAlertExamVideo | null;
  camera: IntegrityAlertCamera;
  seat: IntegrityAlertSeat | null;
}

export interface IntegrityAlertDetail extends IntegrityAlertSummary {
  evidenceAssets: IntegrityAlertEvidenceAsset[];
  reviewActions: IntegrityAlertReviewAction[];
}

export interface IntegrityAlertsResponse {
  alerts: IntegrityAlertSummary[];
}

export interface IntegrityAlertResponse {
  alert: IntegrityAlertDetail;
}

export interface IntegrityAlertReviewPayload {
  decision: IntegrityAlertDecision;
  reviewerUsername?: string;
  note?: string;
}

export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  is_active: boolean;
  rate_limit_per_minute: number;
  daily_limit: number;
  permissions: string[];
  created_by?: number;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  raw_key: string;
}

export interface ProxyEndpoint {
  id: number;
  provider: string;
  endpoint: string;
  country: string;
  health: string;
  cool_until: string | null;
  metadata: JsonValue;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: JsonValue;
  created_at: string;
  updated_at: string;
}

export interface UserSetting {
  id: number;
  user_id: number | null;
  key: string;
  value: JsonValue;
  created_at: string;
  updated_at: string;
}

export interface ApiLogEntry {
  id: number;
  user_id: number | null;
  category: string;
  action: string;
  status: string;
  message: string;
  metadata: JsonValue;
  created_at: string;
}

export interface SearchJobStatus {
  job_id: string;
  state: string;
  attempts: number;
  requested_provider: string | null;
  created_at: string | null;
  completed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  response_payload: Record<string, JsonValue>;
}

export interface PlaygroundApiKey {
  id: number;
  name: string;
  key_prefix: string;
  rate_limit_per_minute: number;
  daily_limit: number;
  created_at: string;
  is_active: boolean;
}

export interface SearchResponse {
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
    num: number;
    type: string;
    engine: string;
    autocorrect: boolean;
  };
  organic: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  knowledgeGraph: JsonValue | null;
  peopleAlsoAsk: JsonValue[];
  relatedSearches: JsonValue[];
}

export interface FetchedPage {
  url: string;
  final_url: string | null;
  title: string;
  markdown: string;
  text: string;
  metadata: Record<string, JsonValue>;
  token_count: number;
  char_count: number;
  extractor: string;
  rendered: boolean;
  success: boolean;
  error: string | null;
}

export interface SearchEntity {
  name: string;
  type: string;
  mentions: number;
}

export interface SearchFact {
  statement: string;
  citation_ids: string[];
}

export interface SearchEnrichment {
  entities: SearchEntity[];
  facts: SearchFact[];
  publishers: string[];
  dates: string[];
}

export interface SearchSummary {
  text: string;
  citations: string[];
  model: string;
}

export interface SearchCompression {
  mode: string;
  text: string;
  token_count: number;
}

export interface SearchIntelligenceResponse {
  engine: string;
  query: string;
  results: Array<{
    position: number;
    title: string;
    url: string;
    snippet: string;
    provider: string;
  }>;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    snippet: string;
  }>;
  fetched: FetchedPage[];
  enrichment: SearchEnrichment | null;
  summary: SearchSummary | null;
  compression: SearchCompression | null;
  markdown: string;
  usage: Record<string, JsonValue>;
  diagnostics: Record<string, JsonValue>;
}

export interface SearchJobAccepted {
  job_id: string;
  state: string;
}

export interface BillingPlan {
  id: number;
  code: string;
  name: string;
  description: string;
  credits: number;
  unit_amount_cents: number;
  currency: string;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  is_active: boolean;
  metadata: Record<string, JsonValue>;
}

export interface BillingSubscription {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  plan_code: string | null;
  plan_name: string | null;
  stripe_price_id: string | null;
}

export interface CreditBucket {
  type: string;
  balance: number;
  expires_at: string | null;
}

export interface BillingSummary {
  balance: number;
  monthly_free_credits: number;
  current_period_start: string | null;
  current_period_end: string | null;
  search_credit_cost: number;
  credit_value_usd: number;
  custom_engines_enabled: boolean;
  allowed_engines: string[];
  credit_buckets: CreditBucket[];
  credit_policy: Record<string, JsonValue>;
  stripe_configured: boolean;
  portal_available: boolean;
  active_subscription: BillingSubscription | null;
  plans: BillingPlan[];
}

export interface CreditLedgerEntry {
  id: number;
  delta: number;
  balance_after: number;
  reason: string;
  reference: string;
  metadata: Record<string, JsonValue>;
  created_at: string;
}

export interface BillingCheckoutSession {
  session_id: string;
  checkout_url: string | null;
  publishable_key: string;
}

export interface BillingPortalSession {
  url: string;
}

export interface McpConfig {
  endpoint_url: string;
  protocol_version: string;
  server_name: string;
  tools: string[];
  auth: Record<string, JsonValue>;
  sample_config: Record<string, JsonValue>;
}

export interface AdminModelInfo {
  model: string;
  table: string;
  columns: string[];
  create_enabled: boolean;
  update_enabled: boolean;
  delete_enabled: boolean;
}

export interface AdminModelRecordsResponse {
  model: string;
  records: Array<Record<string, JsonValue>>;
}

export interface AdminOverview {
  total_users: number;
  active_users_30d: number;
  search_volume_24h: number;
  success_rate_24h: number;
  degraded_searches_24h: number;
  credits_consumed_30d: number;
  credits_granted_30d: number;
  provider_ready_count: number;
  proxy_ready_count: number;
  healthy_session_count: number;
  recent_incidents: ApiLogEntry[];
}

export interface AdminUserSummary {
  id: number;
  username: string;
  email: string | null;
  primary_provider: string;
  role: string;
  is_superuser: boolean;
  is_active: boolean;
  account_type: "client" | "staff" | "hybrid";
  staff_role: "support" | "operator" | "admin" | null;
  staff_permissions: string[];
  can_manage_staff: boolean;
  api_key_count: number;
  active_api_key_count: number;
  balance: number;
  monthly_free_credits: number;
  subscription_status: string | null;
  total_search_events: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AdminStaffRole = "support" | "operator" | "admin";

export interface AdminUserCreatePayload {
  username: string;
  email: string;
  password: string;
  is_active?: boolean;
  role?: string;
  staff_role?: AdminStaffRole | null;
  monthly_free_credits?: number;
  initial_balance?: number;
}

export interface AdminUserPasswordResetResponse {
  user: AdminUserSummary;
  temporary_password: string;
}

export interface AdminProviderHealth {
  provider: string;
  tier: string;
  enabled: boolean;
  order: number;
  credential_count: number;
  healthy_credentials: number;
  session_count: number;
  healthy_sessions: number;
  proxy_count: number;
  healthy_proxies: number;
  blocked_proxies: number;
  readiness: string;
}

export interface RuntimeProviderCredential {
  id: string;
  provider: string;
  label: string;
  masked_secret: string;
  admin_rank: number;
  enabled: boolean;
  status: string;
  quota_remaining: number | null;
  cost_weight: number;
  requests_in_window: number;
  successes: number;
  failures: number;
  average_latency_ms: number;
  cooldown_until: string | null;
  updated_at: string;
}

export interface RuntimeProxy {
  id: string;
  label: string;
  endpoint: string;
  country: string;
  source: string;
  enabled: boolean;
  status: string;
  assigned_session_id: string | null;
  weight: number;
  successes: number;
  failures: number;
  block_count: number;
  captcha_count: number;
  parse_failures: number;
  session_seed_failures: number;
  session_successes: number;
  last_failure_reason: string | null;
  metadata: Record<string, JsonValue>;
  cooldown_until: string | null;
  updated_at: string;
}

export interface RuntimeSession {
  id: string;
  provider: string;
  proxy_id: string | null;
  state_blob: string;
  user_agent: string;
  seeded_at: string;
  expires_at: string | null;
  quality_score: number;
  captcha_hits: number;
  request_count: number;
  success_count: number;
  parse_failures: number;
  last_failure_reason: string | null;
  last_block_reason: string | null;
  seeded_via: string;
  trusted_source: boolean;
  last_validated_at: string | null;
  status: string;
}

export interface ProviderRoutingSettings {
  inhouse_order: string[];
  external_order: string[];
  enabled_providers: Record<string, boolean>;
  proxy_cooldown_seconds: number;
  proxy_block_cooldown_seconds: number;
  max_inhouse_proxies_per_request: number;
  local_diagnostic_enabled: boolean;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  scope: string;
  updated_at: string;
}

export interface ContentAssetVariant {
  format: "avif" | "webp" | "original";
  width: number;
  height: number;
  path: string;
  url: string;
  size_bytes: number;
}

export interface ContentAsset {
  id: number;
  original_filename: string;
  content_type: string;
  width: number;
  height: number;
  size_bytes: number;
  alt: string;
  placeholder: string;
  variants: ContentAssetVariant[];
  created_at: string;
  updated_at: string;
}

export interface ContentPost {
  id: number;
  slug: string;
  type: "blog" | "news" | "page_copy";
  status: "draft" | "published";
  title: string;
  excerpt: string;
  body_markdown: string;
  tags: string[];
  author: string;
  cover_asset_id: number | null;
  cover_asset: ContentAsset | null;
  seo_title: string;
  seo_description: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ContentPostPayload = Omit<ContentPost, "id" | "cover_asset" | "created_at" | "updated_at">;

export interface ContentPostListResponse {
  posts: ContentPost[];
}

export interface CourseSummary {
  id: number;
  code: string;
  title: string;
  teacher: number | null;
  teacher_username: string | null;
  department: number;
  department_code: string;
  semester: number;
  semester_name: string;
  created_at: string;
  updated_at: string;
}

export interface CourseCreatePayload {
  code: string;
  title: string;
}

export interface CourseMaterial {
  id: number;
  course: number;
  course_code: string;
  course_title: string;
  unit: number | null;
  unit_title: string | null;
  unit_order: number | null;
  uploaded_by: number | null;
  uploaded_by_username: string | null;
  kind: "text" | "video" | "slide" | "pdf" | "doc" | "embed" | "url";
  title: string;
  description: string;
  content_text: string;
  uri: string;
  original_filename: string;
  order: number;
  indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseUnit {
  id: number;
  course: number;
  course_code: string;
  title: string;
  summary: string;
  order: number;
  material_count: number;
  created_at: string;
  updated_at: string;
}

export interface CourseChatMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Array<Record<string, JsonValue>>;
  created_at: string;
}

export interface CourseChatThread {
  id: number;
  course: number;
  course_code: string;
  unit: number | null;
  unit_title: string | null;
  title: string;
  messages: CourseChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: number;
  course: number;
  course_code: string;
  course_title: string;
  student: number;
  student_number: string;
  student_name: string;
  status: "active" | "dropped" | "completed";
  created_at: string;
  updated_at: string;
}

export interface ExamSessionSummary {
  id: number;
  course: number;
  course_code: string;
  course_title: string;
  hall: number;
  hall_name: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "prepared" | "live" | "completed" | "cancelled";
  quiz_title: string;
  quiz_instructions: string;
  quiz_questions: JsonValue[];
  created_at: string;
  updated_at: string;
}

export interface ExamCreatePayload {
  course: number;
  starts_at: string;
  ends_at: string;
  status?: ExamSessionSummary["status"];
  quiz_title?: string;
  quiz_instructions?: string;
  quiz_questions?: JsonValue[];
}

export interface ExamAttemptSummary {
  id: number;
  exam_session: number;
  course_code: string;
  student: number;
  student_number: string;
  status: "started" | "submitted" | "reviewed";
  answers: Record<string, JsonValue>;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamVideoAnalysisResult {
  id: number;
  model_name: string;
  report_uri: string;
  session_uri: string;
  annotated_video_uri: string;
  latest_preview_uri: string;
  frames_analyzed: number;
  current_frame: number;
  total_frames: number;
  progress_percent: number;
  duration_seconds: string;
  total_alerts: number;
  alert_counts: Record<string, JsonValue>;
  latest_status: string;
  created_at: string;
  updated_at: string;
}

export interface ExamVideoSummary {
  id: number;
  exam_session: number;
  exam_course: string;
  uploaded_by: number | null;
  uploaded_by_username: string | null;
  original_filename: string;
  file_uri: string;
  file_url: string;
  status: "uploaded" | "analyzing" | "completed" | "failed";
  notes: string;
  analysis_started_at: string | null;
  analysis_completed_at: string | null;
  frames_analyzed: number;
  duration_seconds: string;
  error_message: string;
  analysis_report: Record<string, JsonValue>;
  result: ExamVideoAnalysisResult | null;
  alert_count: number;
  created_at: string;
  updated_at: string;
}

export interface StudentRiskScore {
  id: number;
  student: number;
  student_number: string;
  student_name: string;
  course: number;
  course_code: string;
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  contributing_factors: JsonValue[];
  features?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface RiskHeatmapRow {
  department: string;
  high: number;
  medium: number;
  low: number;
  count: number;
  avgRisk: number;
}

export interface FeatureImportance {
  key: string;
  label: string;
  weight: number;
}

export interface FeatureImportanceResponse {
  model: string;
  generatedAt: string | null;
  features: FeatureImportance[];
}

export interface RiskTrendPoint {
  generatedAt: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  student: string;
  course: string;
}

export interface FacultyActionLogItem {
  id: number;
  faculty: number | null;
  faculty_username?: string;
  student: number;
  student_name?: string;
  student_number?: string;
  course: number | null;
  course_code?: string;
  risk_score: number | null;
  action: "auto_email" | "email" | "meeting" | "call" | "note";
  note: string;
  created_at: string;
}

export interface StudentRiskDetail {
  student: {
    id: number;
    name: string;
    studentNumber: string;
    cohort: string;
    department: string | null;
    previousGpa: number;
  };
  latest: StudentRiskScore[];
  featureLabels: Record<string, string>;
  history: Array<{ generatedAt: string; course: string; riskScore: number; riskLevel: string }>;
  actions: FacultyActionLogItem[];
}

export interface ScheduleConflict {
  type: "room" | "invigilator" | "student";
  message: string;
  session_id: number;
}

export interface ScheduledSession {
  id: number;
  kind: "class" | "exam";
  course: number;
  course_code?: string;
  course_title?: string;
  hall: number;
  hall_name?: string;
  invigilator: number | null;
  invigilator_username?: string;
  title: string;
  starts_at: string;
  ends_at: string;
  conflicts?: ScheduleConflict[];
  created_at: string;
  updated_at: string;
}

export interface ScheduledSessionPayload {
  kind: "class" | "exam";
  course: number;
  hall: number;
  invigilator?: number | null;
  title?: string;
  starts_at: string;
  ends_at: string;
}

export interface StudentScheduleResponse {
  student: { name: string; studentNumber: string } | null;
  sessions: ScheduledSession[];
}

export interface HallOption {
  id: number;
  name: string;
  building: string;
  capacity: number;
}

export interface InvigilatorOption {
  id: number;
  username: string;
  email: string;
}

export interface AtRiskInputRow {
  student_number: string;
  attended: number;
  total: number;
  score: number;
  max_score: number;
  label?: string;
}

export interface AtRiskRunPayload {
  course: number;
  source_name?: string;
  rows?: AtRiskInputRow[];
  import_id?: number;
}

export interface AtRiskRunResponse {
  run_id: number;
  course?: number;
  course_code?: string;
  scores: StudentRiskScore[];
}

export interface AcademicRecordImport {
  id: number;
  source_name: string;
  status: string;
  issue_summary: string;
  imported_rows: number;
  uploaded_by_username: string | null;
  created_at: string;
}

export interface AcademicImportPreview {
  import: AcademicRecordImport;
  rows: Array<{
    student_number: string;
    student_name: string;
    attended: number;
    total: number;
    course_code: string;
  }>;
}

export interface ScheduleSuggestion {
  kind: "class" | "exam";
  course: number;
  course_code: string;
  course_title: string;
  hall: number;
  hall_name: string;
  invigilator: number | null;
  title: string;
  starts_at: string;
  ends_at: string;
  conflicts: ScheduleConflict[];
}

export interface ScheduleGenerateResponse {
  suggestions: ScheduleSuggestion[];
  count: number;
  rules?: {
    hours: string;
    class_duration_minutes?: number;
    classes_per_week?: number;
    teaching_weekdays?: number[];
    weekend_days?: number[];
    room_count?: number;
    weeks_planned?: number;
    schedule_mode?: "week" | "semester";
    kind?: "class" | "exam";
    term_start?: string | null;
    term_end?: string | null;
    holidays: string[];
    optimization?: {
      enabled?: boolean;
      max_conflict_ratio?: number;
      total?: number;
      conflict_free?: number;
      with_conflicts?: number;
      skipped?: number;
      clean_ratio?: number;
      conflict_budget?: number;
    };
  };
}

export interface AdminAnalyticsCard {
  key: string;
  label: string;
  value: number;
  unit: string;
}

export interface AdminAnalyticsBreakdown {
  label: string;
  value: number;
  metadata: Record<string, JsonValue>;
}

export interface AdminAnalytics {
  cards: AdminAnalyticsCard[];
  plan_distribution: AdminAnalyticsBreakdown[];
  provider_breakdown: AdminAnalyticsBreakdown[];
  top_failures: AdminAnalyticsBreakdown[];
  recent_activity: ApiLogEntry[];
}

