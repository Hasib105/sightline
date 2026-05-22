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

