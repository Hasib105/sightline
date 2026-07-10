import { apiFetchClient } from "@/lib/api-client";
import { apiBaseUrl } from "@/lib/api-base-url";
import type {
  AdminAnalytics,
  AdminOverview,
  AdminProviderHealth,
  AdminStaffRole,
  AdminUserCreatePayload,
  AdminUserPasswordResetResponse,
  AdminUserSummary,
  AdminModelInfo,
  AdminModelRecordsResponse,
  ApiKey,
  ApiKeyCreated,
  ApiLogEntry,
  BillingCheckoutSession,
  BillingPortalSession,
  BillingSummary,
  ContentAsset,
  ContentPost,
  ContentPostListResponse,
  ContentPostPayload,
  AtRiskRunPayload,
  AtRiskRunResponse,
  AcademicRecordImport,
  AcademicImportPreview,
  ScheduleGenerateResponse,
  ScheduleSuggestion,
  CourseCreatePayload,
  CourseEnrollment,
  CourseChatThread,
  CourseMaterial,
  CourseSummary,
  CourseUnit,
  CreditLedgerEntry,
  CurrentUser,
  ExamCreatePayload,
  ExamAttemptSummary,
  ExamSessionSummary,
  ExamVideoSummary,
  FeatureFlag,
  IntegrityAlertDetail,
  IntegrityAlertResponse,
  IntegrityAlertReviewPayload,
  IntegrityAlertsResponse,
  IntegrityAlertSummary,
  JsonValue,
  McpConfig,
  NotificationItem,
  NotificationReadResponse,
  PlaygroundApiKey,
  ProviderRoutingSettings,
  ProxyEndpoint,
  RuntimeProviderCredential,
  RuntimeProxy,
  RuntimeSession,
  SearchJobAccepted,
  SearchIntelligenceResponse,
  SearchResponse,
  StudentRiskScore,
  RiskHeatmapRow,
  FeatureImportanceResponse,
  RiskTrendPoint,
  FacultyActionLogItem,
  StudentRiskDetail,
  ScheduleConflict,
  ScheduledSession,
  ScheduledSessionPayload,
  StudentScheduleResponse,
  HallOption,
  InvigilatorOption,
  SystemSetting,
  UserSetting,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { detail?: string | string[] | Record<string, unknown>; message?: string }
    | null;
  if (!response.ok) {
    const rawDetail = (payload as { detail?: string | string[] | Record<string, unknown>; message?: string } | null)?.detail;
    const messageField = (payload as { message?: string } | null)?.message;
    let errorMessage = messageField;
    if (!errorMessage && typeof rawDetail === "string") {
      errorMessage = rawDetail;
    } else if (!errorMessage && Array.isArray(rawDetail)) {
      errorMessage = rawDetail.join(", ");
    } else if (!errorMessage && rawDetail && typeof rawDetail === "object") {
      errorMessage = Object.entries(rawDetail)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
        .join(" · ");
    }
    throw new ApiError(errorMessage ?? `Request failed with status ${response.status}`, response.status);
  }
  return payload as T;
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const response = await apiFetchClient("/api/v1/api-keys");
  return parseResponse<ApiKey[]>(response);
}

export async function getCurrentUserClient(): Promise<CurrentUser> {
  const response = await apiFetchClient("/api/v1/me");
  return parseResponse<CurrentUser>(response);
}

export async function listNotifications(): Promise<NotificationItem[]> {
  const response = await apiFetchClient("/api/v1/notifications");
  return parseResponse<NotificationItem[]>(response);
}

export async function markNotificationRead(notificationId: string): Promise<NotificationReadResponse> {
  const response = await apiFetchClient(`/api/v1/notifications/${notificationId}/read`, {
    method: "POST",
  });
  return parseResponse<NotificationReadResponse>(response);
}

export async function markAllNotificationsRead(): Promise<NotificationReadResponse> {
  const response = await apiFetchClient("/api/v1/notifications/read-all", {
    method: "POST",
  });
  return parseResponse<NotificationReadResponse>(response);
}

export async function listIntegrityAlerts(): Promise<IntegrityAlertSummary[]> {
  const response = await apiFetchClient("/api/integrity/alerts/");
  const payload = await parseResponse<IntegrityAlertsResponse>(response);
  return payload.alerts;
}

export async function getIntegrityAlert(alertId: number): Promise<IntegrityAlertDetail> {
  const response = await apiFetchClient(`/api/integrity/alerts/${alertId}/`);
  const payload = await parseResponse<IntegrityAlertResponse>(response);
  return payload.alert;
}

export async function reviewIntegrityAlert(
  alertId: number,
  payload: IntegrityAlertReviewPayload
): Promise<IntegrityAlertDetail> {
  const response = await apiFetchClient(`/api/integrity/alerts/${alertId}/review/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<IntegrityAlertResponse>(response);
  return data.alert;
}

export async function createApiKey(name: string): Promise<ApiKeyCreated> {
  const response = await apiFetchClient("/api/v1/api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseResponse<ApiKeyCreated>(response);
}

export async function revokeApiKey(id: number): Promise<ApiKey> {
  const response = await apiFetchClient(`/api/v1/api-keys/${id}/revoke`, { method: "POST" });
  return parseResponse<ApiKey>(response);
}

export async function listProxyEndpoints(): Promise<ProxyEndpoint[]> {
  const response = await apiFetchClient("/api/v1/admin/proxy-endpoints");
  return parseResponse<ProxyEndpoint[]>(response);
}

export async function listSystemSettings(): Promise<SystemSetting[]> {
  const response = await apiFetchClient("/api/v1/admin/system-settings");
  return parseResponse<SystemSetting[]>(response);
}

export async function upsertSystemSetting(key: string, value: JsonValue): Promise<SystemSetting> {
  const response = await apiFetchClient(`/api/v1/admin/system-settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  return parseResponse<SystemSetting>(response);
}

export async function listPlaygroundApiKeys(): Promise<PlaygroundApiKey[]> {
  const response = await apiFetchClient("/api/v1/playground/api-keys");
  return parseResponse<PlaygroundApiKey[]>(response);
}

export type PlaygroundSearchPayload = {
  q: string;
  engine?: string;
  format?: string;
  mode?: string;
  provider?: string;
  gl?: string;
  hl?: string;
  num?: number;
  autocorrect?: boolean;
  type?: string;
  fetch?: Record<string, JsonValue>;
  scrape?: Record<string, JsonValue>;
  enrich?: Record<string, JsonValue>;
  summarize?: Record<string, JsonValue>;
  compression?: string | null;
  async?: boolean;
  api_key_id?: number;
};

export type PlaygroundSearchResult = {
  statusCode: number;
  payload: SearchResponse | SearchJobAccepted | SearchIntelligenceResponse;
};

export async function runPlaygroundSearch(
  payload: PlaygroundSearchPayload
): Promise<PlaygroundSearchResult> {
  const response = await apiFetchClient("/api/v1/playground/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await parseResponse<SearchResponse | SearchJobAccepted | SearchIntelligenceResponse>(
    response
  );
  return { statusCode: response.status, payload: body };
}

export async function listLogs(params: {
  category?: string;
  includeAllUsers?: boolean;
  limit?: number;
}): Promise<ApiLogEntry[]> {
  const search = new URLSearchParams();
  if (params.category) {
    search.set("category", params.category);
  }
  if (params.includeAllUsers) {
    search.set("include_all_users", "true");
  }
  search.set("limit", String(params.limit ?? 100));

  const query = search.toString();
  const response = await apiFetchClient(`/api/v1/logs${query ? `?${query}` : ""}`);
  return parseResponse<ApiLogEntry[]>(response);
}

export async function listUserSettings(): Promise<UserSetting[]> {
  const response = await apiFetchClient("/api/v1/user-settings");
  return parseResponse<UserSetting[]>(response);
}

export async function upsertUserSetting(key: string, value: JsonValue): Promise<UserSetting> {
  const response = await apiFetchClient(`/api/v1/user-settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  return parseResponse<UserSetting>(response);
}

export async function getBillingSummary(): Promise<BillingSummary> {
  const response = await apiFetchClient("/api/v1/billing/summary");
  return parseResponse<BillingSummary>(response);
}

export async function listBillingLedger(limit = 100): Promise<CreditLedgerEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiFetchClient(`/api/v1/billing/ledger?${params.toString()}`);
  return parseResponse<CreditLedgerEntry[]>(response);
}

export async function createBillingCheckoutSession(payload: {
  plan_code: string;
  success_url?: string;
  cancel_url?: string;
}): Promise<BillingCheckoutSession> {
  const response = await apiFetchClient("/api/v1/billing/checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<BillingCheckoutSession>(response);
}

export async function createBillingPortalSession(payload: {
  return_url?: string;
} = {}): Promise<BillingPortalSession> {
  const response = await apiFetchClient("/api/v1/billing/portal-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<BillingPortalSession>(response);
}

export async function getMcpConfig(): Promise<McpConfig> {
  const response = await apiFetchClient("/api/v1/mcp/config");
  return parseResponse<McpConfig>(response);
}

export async function listAdminModels(): Promise<AdminModelInfo[]> {
  const response = await apiFetchClient("/api/v1/admin/models");
  return parseResponse<AdminModelInfo[]>(response);
}

export async function listContentPosts(params: {
  type?: string;
  status?: string;
  q?: string;
  limit?: number;
} = {}): Promise<ContentPostListResponse> {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.status) search.set("status_filter", params.status);
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 100));
  const response = await apiFetchClient(`/api/v1/admin/content/posts?${search.toString()}`);
  return parseResponse<ContentPostListResponse>(response);
}

export async function createContentPost(payload: ContentPostPayload): Promise<ContentPost> {
  const response = await apiFetchClient("/api/v1/admin/content/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ContentPost>(response);
}

export async function updateContentPost(
  postId: number,
  payload: ContentPostPayload
): Promise<ContentPost> {
  const response = await apiFetchClient(`/api/v1/admin/content/posts/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ContentPost>(response);
}

export async function deleteContentPost(postId: number): Promise<{ deleted: boolean; record_id: number }> {
  const response = await apiFetchClient(`/api/v1/admin/content/posts/${postId}`, {
    method: "DELETE",
  });
  return parseResponse<{ deleted: boolean; record_id: number }>(response);
}

export async function uploadContentAsset(file: File, alt: string): Promise<ContentAsset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("alt", alt);
  const response = await apiFetchClient("/api/v1/admin/content/assets", {
    method: "POST",
    body: formData,
  });
  return parseResponse<ContentAsset>(response);
}

export async function listAdminModelRecords(
  model: string,
  limit = 200
): Promise<AdminModelRecordsResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await apiFetchClient(`/api/v1/admin/models/${model}?${params.toString()}`);
  return parseResponse<AdminModelRecordsResponse>(response);
}

export async function createAdminModelRecord(
  model: string,
  data: Record<string, JsonValue>
): Promise<Record<string, JsonValue>> {
  const response = await apiFetchClient(`/api/v1/admin/models/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  return parseResponse<Record<string, JsonValue>>(response);
}

export async function updateAdminModelRecord(
  model: string,
  recordId: number,
  data: Record<string, JsonValue>
): Promise<Record<string, JsonValue>> {
  const response = await apiFetchClient(`/api/v1/admin/models/${model}/${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  return parseResponse<Record<string, JsonValue>>(response);
}

export async function deleteAdminModelRecord(model: string, recordId: number): Promise<{ deleted: boolean; record_id: number }> {
  const response = await apiFetchClient(`/api/v1/admin/models/${model}/${recordId}`, {
    method: "DELETE",
  });
  return parseResponse<{ deleted: boolean; record_id: number }>(response);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const response = await apiFetchClient("/api/v1/admin/overview");
  return parseResponse<AdminOverview>(response);
}

export async function listAdminUsers(): Promise<AdminUserSummary[]> {
  const response = await apiFetchClient("/api/v1/admin/users");
  return parseResponse<AdminUserSummary[]>(response);
}

export async function createAdminUser(
  payload: AdminUserCreatePayload
): Promise<AdminUserSummary> {
  const response = await apiFetchClient("/api/v1/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminUserSummary>(response);
}

export async function updateAdminUser(
  userId: number,
  payload: {
    role?: string;
    staff_role?: AdminStaffRole;
    is_active?: boolean;
    monthly_free_credits?: number;
  }
): Promise<AdminUserSummary> {
  const response = await apiFetchClient(`/api/v1/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminUserSummary>(response);
}

export async function setAdminUserPassword(
  userId: number,
  password: string
): Promise<AdminUserSummary> {
  const response = await apiFetchClient(`/api/v1/admin/users/${userId}/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return parseResponse<AdminUserSummary>(response);
}

export async function resetAdminUserPassword(
  userId: number
): Promise<AdminUserPasswordResetResponse> {
  const response = await apiFetchClient(`/api/v1/admin/users/${userId}/password/reset`, {
    method: "POST",
  });
  return parseResponse<AdminUserPasswordResetResponse>(response);
}

export async function listAdminPlans(): Promise<BillingSummary["plans"]> {
  const response = await apiFetchClient("/api/v1/admin/plans");
  return parseResponse<BillingSummary["plans"]>(response);
}

export async function createAdminPlan(
  payload: Record<string, JsonValue>
): Promise<BillingSummary["plans"][number]> {
  const response = await apiFetchClient("/api/v1/admin/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<BillingSummary["plans"][number]>(response);
}

export async function updateAdminPlan(
  planId: number,
  payload: Record<string, JsonValue>
): Promise<BillingSummary["plans"][number]> {
  const response = await apiFetchClient(`/api/v1/admin/plans/${planId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<BillingSummary["plans"][number]>(response);
}

export async function deleteAdminPlan(planId: number): Promise<{ deleted: boolean; record_id: number }> {
  const response = await apiFetchClient(`/api/v1/admin/plans/${planId}`, { method: "DELETE" });
  return parseResponse<{ deleted: boolean; record_id: number }>(response);
}

export async function adjustAdminCredits(payload: {
  user_id: number;
  delta: number;
  reason: string;
  reference?: string;
  metadata?: Record<string, JsonValue>;
}): Promise<{ entry: CreditLedgerEntry; balance: number }> {
  const response = await apiFetchClient("/api/v1/admin/credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{ entry: CreditLedgerEntry; balance: number }>(response);
}

export async function listAdminProviderHealth(): Promise<AdminProviderHealth[]> {
  const response = await apiFetchClient("/api/v1/admin/providers");
  return parseResponse<AdminProviderHealth[]>(response);
}

export async function listAdminProviderCredentials(): Promise<RuntimeProviderCredential[]> {
  const response = await apiFetchClient("/api/v1/admin/provider-credentials");
  return parseResponse<RuntimeProviderCredential[]>(response);
}

export async function createAdminProviderCredential(payload: {
  provider: string;
  label: string;
  secret: string;
  admin_rank?: number;
  quota_remaining?: number | null;
  cost_weight?: number;
}): Promise<RuntimeProviderCredential> {
  const response = await apiFetchClient("/api/v1/admin/provider-credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<RuntimeProviderCredential>(response);
}

export async function updateAdminProviderCredential(
  credentialId: string,
  payload: Record<string, JsonValue>
): Promise<RuntimeProviderCredential> {
  const response = await apiFetchClient(`/api/v1/admin/provider-credentials/${credentialId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<RuntimeProviderCredential>(response);
}

export async function getAdminProviderRouting(): Promise<ProviderRoutingSettings> {
  const response = await apiFetchClient("/api/v1/admin/provider-routing");
  return parseResponse<ProviderRoutingSettings>(response);
}

export async function updateAdminProviderRouting(
  payload: Partial<ProviderRoutingSettings>
): Promise<ProviderRoutingSettings> {
  const response = await apiFetchClient("/api/v1/admin/provider-routing", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ProviderRoutingSettings>(response);
}

export async function listAdminRuntimeProxies(): Promise<RuntimeProxy[]> {
  const response = await apiFetchClient("/api/v1/admin/proxies");
  return parseResponse<RuntimeProxy[]>(response);
}

export async function updateAdminRuntimeProxy(
  proxyId: string,
  payload: Record<string, JsonValue>
): Promise<RuntimeProxy> {
  const response = await apiFetchClient(`/api/v1/admin/proxies/${proxyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<RuntimeProxy>(response);
}

export async function syncAdminRuntimeProxies(): Promise<RuntimeProxy[]> {
  const response = await apiFetchClient("/api/v1/admin/proxies/sync", { method: "POST" });
  return parseResponse<RuntimeProxy[]>(response);
}

export async function listAdminSessions(): Promise<RuntimeSession[]> {
  const response = await apiFetchClient("/api/v1/admin/sessions");
  return parseResponse<RuntimeSession[]>(response);
}

export async function seedAdminSession(provider: string, proxyId?: string): Promise<RuntimeSession> {
  const params = new URLSearchParams();
  if (proxyId) {
    params.set("proxy_id", proxyId);
  }
  const response = await apiFetchClient(
    `/api/v1/admin/sessions/${provider}${params.toString() ? `?${params.toString()}` : ""}`,
    { method: "POST" }
  );
  return parseResponse<RuntimeSession>(response);
}

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const response = await apiFetchClient("/api/v1/admin/feature-flags");
  return parseResponse<FeatureFlag[]>(response);
}

export async function upsertFeatureFlag(
  key: string,
  payload: { enabled: boolean; description?: string }
): Promise<FeatureFlag> {
  const response = await apiFetchClient(`/api/v1/admin/feature-flags/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<FeatureFlag>(response);
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const response = await apiFetchClient("/api/v1/admin/analytics");
  return parseResponse<AdminAnalytics>(response);
}

export async function listCourses(): Promise<CourseSummary[]> {
  const response = await apiFetchClient("/api/v1/courses");
  return parseResponse<CourseSummary[]>(response);
}

export async function createCourse(payload: CourseCreatePayload): Promise<CourseSummary> {
  const response = await apiFetchClient("/api/v1/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<CourseSummary>(response);
}

export type CourseMaterialPayload = {
  kind: CourseMaterial["kind"];
  unit?: number | null;
  title: string;
  description?: string;
  content_text?: string;
  uri?: string;
  original_filename?: string;
  order?: number;
  file?: File;
};

export async function listCourseMaterials(courseId: number): Promise<CourseMaterial[]> {
  const response = await apiFetchClient(`/api/v1/courses/${courseId}/materials`);
  return parseResponse<CourseMaterial[]>(response);
}

export async function createCourseMaterial(
  courseId: number,
  payload: CourseMaterialPayload
): Promise<CourseMaterial> {
  if (payload.file) {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("kind", payload.kind);
    formData.append("title", payload.title);
    if (payload.unit) formData.append("unit", String(payload.unit));
    if (payload.description) formData.append("description", payload.description);
    if (payload.content_text) formData.append("content_text", payload.content_text);
    if (payload.uri) formData.append("uri", payload.uri);
    if (payload.order) formData.append("order", String(payload.order));
    const response = await apiFetchClient(`/api/v1/courses/${courseId}/materials`, {
      method: "POST",
      body: formData,
    });
    return parseResponse<CourseMaterial>(response);
  }
  const response = await apiFetchClient(`/api/v1/courses/${courseId}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<CourseMaterial>(response);
}

export async function listCourseUnits(courseId: number): Promise<CourseUnit[]> {
  const response = await apiFetchClient(`/api/v1/courses/${courseId}/units`);
  return parseResponse<CourseUnit[]>(response);
}

export async function createCourseUnit(
  courseId: number,
  payload: { title: string; summary?: string; order: number }
): Promise<CourseUnit> {
  const response = await apiFetchClient(`/api/v1/courses/${courseId}/units`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<CourseUnit>(response);
}

export async function deleteCourseUnit(unitId: number): Promise<{ deleted: boolean; record_id: number }> {
  const response = await apiFetchClient(`/api/v1/course-units/${unitId}`, {
    method: "DELETE",
  });
  return parseResponse<{ deleted: boolean; record_id: number }>(response);
}

export async function indexCourseContent(courseId: number): Promise<{ course: number; indexed_chunks: number }> {
  const response = await apiFetchClient(`/api/v1/courses/${courseId}/index`, {
    method: "POST",
  });
  return parseResponse<{ course: number; indexed_chunks: number }>(response);
}

export async function listCourseChatThreads(courseId?: number): Promise<CourseChatThread[]> {
  const query = courseId ? `?course=${courseId}` : "";
  const response = await apiFetchClient(`/api/v1/course-chat-threads${query}`);
  return parseResponse<CourseChatThread[]>(response);
}

export async function createCourseChatThread(payload: {
  course: number;
  unit?: number | null;
  title: string;
}): Promise<CourseChatThread> {
  const response = await apiFetchClient("/api/v1/course-chat-threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<CourseChatThread>(response);
}

export async function sendCourseChatMessage(
  threadId: number,
  message: string
): Promise<CourseChatThread> {
  const response = await apiFetchClient(`/api/v1/course-chat-threads/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return parseResponse<CourseChatThread>(response);
}

type CourseChatStreamEvent = {
  message?: string;
  content?: string;
  detail?: string;
  message_id?: number;
  citations?: Array<Record<string, JsonValue>>;
};

export async function streamCourseChatMessage(
  threadId: number,
  message: string,
  handlers: {
    onStatus?: (message: string) => void;
    onToken?: (content: string) => void;
    onDone?: (event: CourseChatStreamEvent) => void;
  } = {}
): Promise<void> {
  const response = await apiFetchClient(`/api/v1/course-chat-threads/${threadId}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    await parseResponse<never>(response);
  }
  if (!response.body) {
    throw new ApiError("Streaming response is unavailable.", response.status);
  }

  const dispatch = (block: string) => {
    const lines = block.split("\n");
    const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    const payload = (data ? JSON.parse(data) : {}) as CourseChatStreamEvent;

    if (eventName === "status" && payload.message) {
      handlers.onStatus?.(payload.message);
    } else if (eventName === "token" && payload.content) {
      handlers.onToken?.(payload.content);
    } else if (eventName === "done") {
      handlers.onDone?.(payload);
    } else if (eventName === "error") {
      throw new ApiError(payload.detail || "Unable to answer right now.", response.status);
    }
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);
      if (block) {
        dispatch(block);
      }
      boundary = buffer.indexOf("\n\n");
    }
    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    dispatch(buffer.trim());
  }
}

export async function listEnrollments(): Promise<CourseEnrollment[]> {
  const response = await apiFetchClient("/api/v1/enrollments");
  return parseResponse<CourseEnrollment[]>(response);
}

export async function enrollCourse(courseId: number): Promise<CourseEnrollment> {
  const response = await apiFetchClient(`/api/v1/courses/${courseId}/enroll`, {
    method: "POST",
  });
  return parseResponse<CourseEnrollment>(response);
}

export async function listExams(): Promise<ExamSessionSummary[]> {
  const response = await apiFetchClient("/api/v1/exams");
  return parseResponse<ExamSessionSummary[]>(response);
}

export async function createExam(payload: ExamCreatePayload): Promise<ExamSessionSummary> {
  const response = await apiFetchClient("/api/v1/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ExamSessionSummary>(response);
}

export async function listExamAttempts(): Promise<ExamAttemptSummary[]> {
  const response = await apiFetchClient("/api/v1/exam-attempts");
  return parseResponse<ExamAttemptSummary[]>(response);
}

export async function submitExamAttempt(
  examId: number,
  answers: Record<string, JsonValue>
): Promise<ExamAttemptSummary> {
  const response = await apiFetchClient(`/api/v1/exams/${examId}/attempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  return parseResponse<ExamAttemptSummary>(response);
}

export async function listExamVideos(): Promise<ExamVideoSummary[]> {
  const response = await apiFetchClient("/api/v1/exam-videos");
  return parseResponse<ExamVideoSummary[]>(response);
}

export async function uploadExamVideo(
  payload: {
    file: File;
    notes?: string;
  },
  options?: {
    onProgress?: (percent: number) => void;
  }
): Promise<ExamVideoSummary> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("original_filename", payload.file.name);
  if (payload.notes) {
    formData.append("notes", payload.notes);
  }

  const baseUrl = apiBaseUrl();
  const url = `${baseUrl}/api/v1/exam-videos`;

  const response = await new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.responseType = "text";
    xhr.upload.onprogress = (event) => {
      if (!options?.onProgress || !event.lengthComputable) {
        return;
      }
      options.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: { "Content-Type": xhr.getResponseHeader("Content-Type") ?? "application/json" },
        })
      );
    };
    xhr.onerror = () => reject(new Error("Video upload failed due to a network error."));
    xhr.onabort = () => reject(new Error("Video upload was cancelled."));
    xhr.send(formData);
  });

  return parseResponse<ExamVideoSummary>(response);
}

export async function startExamVideoAnalysis(videoId: number): Promise<ExamVideoSummary> {
  const response = await apiFetchClient(`/api/v1/exam-videos/${videoId}/analyze`, {
    method: "POST",
  });
  return parseResponse<ExamVideoSummary>(response);
}

export async function deleteExamVideo(videoId: number): Promise<{ deleted: boolean; record_id: number }> {
  const response = await apiFetchClient(`/api/v1/exam-videos/${videoId}`, {
    method: "DELETE",
  });
  return parseResponse<{ deleted: boolean; record_id: number }>(response);
}

export async function listAtRiskScores(course?: number): Promise<StudentRiskScore[]> {
  const suffix = course ? `?course=${course}` : "";
  const response = await apiFetchClient(`/api/v1/at-risk${suffix}`);
  return parseResponse<StudentRiskScore[]>(response);
}

export async function runAtRiskAnalysis(
  payload: AtRiskRunPayload
): Promise<AtRiskRunResponse> {
  const response = await apiFetchClient("/api/v1/at-risk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<AtRiskRunResponse>(response);
}

export async function resetRiskAnalysis(course: number): Promise<{
  course: number;
  course_code: string;
  deleted_scores: number;
  message: string;
}> {
  const response = await apiFetchClient("/api/v1/at-risk/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course }),
  });
  return parseResponse<{
    course: number;
    course_code: string;
    deleted_scores: number;
    message: string;
  }>(response);
}

export async function listAcademicImports(course?: number): Promise<AcademicRecordImport[]> {
  const suffix = course ? `?course=${course}` : "";
  const response = await apiFetchClient(`/api/v1/academic-imports${suffix}`);
  return parseResponse<AcademicRecordImport[]>(response);
}

export async function getAcademicImportPreview(importId: number, course?: number): Promise<AcademicImportPreview> {
  const suffix = course ? `?course=${course}` : "";
  const response = await apiFetchClient(`/api/v1/academic-imports/${importId}${suffix}`);
  return parseResponse<AcademicImportPreview>(response);
}

// --- Student analytics (ML failure prediction) ---

export async function getRiskHeatmap(): Promise<{ departments: RiskHeatmapRow[] }> {
  const response = await apiFetchClient("/api/v1/analytics/risk/heatmap");
  return parseResponse<{ departments: RiskHeatmapRow[] }>(response);
}

export async function getRiskRanking(params: {
  level?: string;
  department?: string;
  course?: number;
} = {}): Promise<StudentRiskScore[]> {
  const query = new URLSearchParams();
  if (params.level) query.set("level", params.level);
  if (params.department) query.set("department", params.department);
  if (params.course) query.set("course", String(params.course));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetchClient(`/api/v1/analytics/risk/ranking${suffix}`);
  return parseResponse<StudentRiskScore[]>(response);
}

export async function getFeatureImportance(course?: number): Promise<FeatureImportanceResponse> {
  const suffix = course ? `?course=${course}` : "";
  const response = await apiFetchClient(`/api/v1/analytics/risk/feature-importance${suffix}`);
  return parseResponse<FeatureImportanceResponse>(response);
}

export async function getRiskTrends(params: { student?: number; course?: number } = {}): Promise<{ points: RiskTrendPoint[] }> {
  const query = new URLSearchParams();
  if (params.student) query.set("student", String(params.student));
  if (params.course) query.set("course", String(params.course));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetchClient(`/api/v1/analytics/risk/trends${suffix}`);
  return parseResponse<{ points: RiskTrendPoint[] }>(response);
}

export async function getStudentRiskDetail(studentId: number): Promise<StudentRiskDetail> {
  const response = await apiFetchClient(`/api/v1/students/${studentId}/risk`);
  return parseResponse<StudentRiskDetail>(response);
}

export async function listFacultyActions(studentId?: number): Promise<FacultyActionLogItem[]> {
  const suffix = studentId ? `?student=${studentId}` : "";
  const response = await apiFetchClient(`/api/v1/faculty-actions${suffix}`);
  return parseResponse<FacultyActionLogItem[]>(response);
}

export async function createFacultyAction(payload: {
  student: number;
  course?: number | null;
  action: string;
  note?: string;
}): Promise<FacultyActionLogItem> {
  const response = await apiFetchClient("/api/v1/faculty-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<FacultyActionLogItem>(response);
}

// --- Smart scheduling ---

export async function listSchedules(params: { kind?: string; course?: number } = {}): Promise<ScheduledSession[]> {
  const query = new URLSearchParams();
  if (params.kind) query.set("kind", params.kind);
  if (params.course) query.set("course", String(params.course));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetchClient(`/api/v1/schedules${suffix}`);
  return parseResponse<ScheduledSession[]>(response);
}

export async function createSchedule(payload: ScheduledSessionPayload): Promise<ScheduledSession> {
  const response = await apiFetchClient("/api/v1/schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ScheduledSession>(response);
}

export async function updateSchedule(id: number, payload: Partial<ScheduledSessionPayload>): Promise<ScheduledSession> {
  const response = await apiFetchClient(`/api/v1/schedules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ScheduledSession>(response);
}

export async function deleteSchedule(id: number): Promise<{ deleted: boolean; record_id: number }> {
  const response = await apiFetchClient(`/api/v1/schedules/${id}`, { method: "DELETE" });
  return parseResponse<{ deleted: boolean; record_id: number }>(response);
}

export async function clearAllSchedules(courseIds?: number[]): Promise<{ deleted: number; message: string }> {
  const response = await apiFetchClient("/api/v1/schedules/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(courseIds?.length ? { courses: courseIds } : {}),
  });
  return parseResponse<{ deleted: number; message: string }>(response);
}

export async function checkScheduleConflicts(payload: {
  hall: number;
  starts_at: string;
  ends_at: string;
  course?: number | null;
  invigilator?: number | null;
  id?: number;
}): Promise<{ conflicts: ScheduleConflict[] }> {
  const response = await apiFetchClient("/api/v1/schedules/conflicts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<{ conflicts: ScheduleConflict[] }>(response);
}

export async function getMySchedule(): Promise<StudentScheduleResponse> {
  const response = await apiFetchClient("/api/v1/schedules/my");
  return parseResponse<StudentScheduleResponse>(response);
}

export async function generateSchedulePlan(payload: {
  courses: number[];
  week_start?: string;
  kind: "class" | "exam";
  term_start?: string;
  term_end?: string;
  teaching_weekdays?: number[];
  weekend_days?: number[];
  day_start_hour?: number;
  day_end_hour?: number;
  class_duration_minutes?: number;
  classes_per_week?: number;
  optimize_conflicts?: boolean;
  max_conflict_ratio?: number;
  shuffle_seed?: number;
}): Promise<ScheduleGenerateResponse> {
  const response = await apiFetchClient("/api/v1/schedules/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<ScheduleGenerateResponse>(response);
}

export async function bulkCreateSchedules(sessions: ScheduleSuggestion[]): Promise<ScheduledSession[]> {
  const payload = sessions.map((session) => ({
    kind: session.kind,
    course: session.course,
    hall: session.hall,
    invigilator: session.invigilator ?? null,
    title: session.title,
    starts_at: session.starts_at,
    ends_at: session.ends_at,
  }));
  const response = await apiFetchClient("/api/v1/schedules/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessions: payload }),
  });
  return parseResponse<ScheduledSession[]>(response);
}

export async function listHalls(): Promise<HallOption[]> {
  const response = await apiFetchClient("/api/v1/halls");
  return parseResponse<HallOption[]>(response);
}

export async function listInvigilators(): Promise<InvigilatorOption[]> {
  const response = await apiFetchClient("/api/v1/invigilators");
  return parseResponse<InvigilatorOption[]>(response);
}
