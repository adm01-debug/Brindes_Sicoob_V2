# Graph Report - functions  (2026-09-22)

## Corpus Check
- 168 files · ~120,202 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 947 nodes · 1950 edges · 79 communities (59 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Backend: _shared
- Backend: crm-db-bridge
- Backend: sicoob-kit-quote
- Backend: _shared
- Backend: _shared
- Backend: _shared
- Backend: mcp-server
- Backend: _shared
- Backend: _shared
- Backend: crm-db-bridge
- Backend: _shared
- Backend: external-db-bridge
- Backend: expert-chat
- Backend: _shared
- Backend: external-db-bridge
- Backend: manage-users
- Backend: _shared
- Backend: _shared
- Backend: detect-new-device
- Backend: _shared
- Backend: semantic-search
- Backend: e2e-cleanup
- Backend: quote-sync
- Backend: _shared
- Backend: _shared
- Backend: _shared
- Backend: _shared
- Backend: external-db-bridge
- Backend: _shared
- Backend: ai-recommendations
- Backend: _shared
- Backend: market-intelligence-insights
- Backend: mcp-keys-issue
- Backend: secrets-manager
- Backend: voice-agent
- Backend: bi-share-dossier
- Backend: _shared
- Backend: sicoob-artwork-register
- Backend: rls-integration-tests
- Backend: rls-matrix-export
- Backend: _shared
- Backend: step-up-verify
- Backend: connections-hub-audit
- Backend: external-db-bridge
- Backend: _shared
- Backend: process-scheduled-reports
- Backend: sicoob-seed
- Backend: bitrix-sync
- Backend: external-db-bridge
- Backend: external-db-bridge
- Backend: full-op-diagnostics
- Backend: collections-public-react
- Backend: comparison-ai-advisor
- Backend: comparisons-public-react
- Backend: crm-db-bridge
- Backend: e2e-auth-test
- Backend: favorites-public-react
- Backend: mcp-server
- Backend: migration-health-check
- Backend: rate-limit-check
- Backend: send-scheduled-reports
- Backend: sicoob-seed-qa
- Backend: webhook-dispatcher
- Backend: connections-health-check
- Backend: github-credentials-test
- Backend: ownership-repair
- Backend: send-transactional-email
- Backend: _shared
- Backend: webhook-inbound
- Backend: block-ip-temporarily
- Backend: _shared
- Backend: external-db-bridge
- Backend: force-global-logout
- Backend: quote-sync

## God Nodes (most connected - your core abstractions)
1. `getCorsHeaders()` - 77 edges
2. `getOrCreateRequestId()` - 29 edges
3. `handleCorsPreflightIfNeeded()` - 26 edges
4. `runBotProtection()` - 23 edges
5. `createStructuredLogger()` - 20 edges
6. `authorize()` - 19 edges
7. `handleSelect()` - 19 edges
8. `callAiWithTracking()` - 18 edges
9. `resolveCredential()` - 18 edges
10. `handleCrud()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `jsonResponse()` --calls--> `getCorsHeaders()`  [EXTRACTED]
  full-op-diagnostics/index.ts → _shared/cors.ts
- `authenticate()` --calls--> `getOrCreateRequestId()`  [EXTRACTED]
  mcp-server/index.ts → _shared/request-id.ts
- `json()` --calls--> `getCorsHeaders()`  [EXTRACTED]
  sicoob-kit-quote/index.ts → _shared/cors.ts
- `json()` --calls--> `getCorsHeaders()`  [EXTRACTED]
  sicoob-reorder/index.ts → _shared/cors.ts
- `getCrmClient()` --calls--> `resolveCredential()`  [EXTRACTED]
  crm-db-bridge/index.ts → _shared/credentials.ts

## Import Cycles
- None detected.

## Communities (79 total, 20 thin omitted)

### Community 0 - "Backend: _shared"
Cohesion: 0.07
Nodes (35): ColRow, BodySchema, ActiveConnection, assertServiceClient(), connections_auto_test_index_compatiblesupabaseclient, processBatch(), RETRY_BACKOFF_MS, connections_auto_test_index_serviceclient (+27 more)

### Community 1 - "Backend: crm-db-bridge"
Cohesion: 0.09
Nodes (42): ALLOWED_TABLES, applyFilters(), applyOrdering(), authenticateRequest(), AuthResult, BatchQuery, breaker, buildCrmClient() (+34 more)

### Community 2 - "Backend: sicoob-kit-quote"
Cohesion: 0.08
Nodes (31): assertCompleteVariantCatalog(), boolean(), buildVerifiedKitLines(), buildVerifiedPersonalization(), CatalogProduct, CatalogVariant, finiteNumber(), KitLineKind (+23 more)

### Community 3 - "Backend: _shared"
Cohesion: 0.08
Nodes (22): CnpjBodySchema, cnpjLimiter, BodySchema, TtsRequestSchema, VALID_VOICE_IDS, ALLOWED_DOMAINS, ALLOWED_REFERER_HOSTS, BreakerConfig (+14 more)

### Community 4 - "Backend: _shared"
Cohesion: 0.13
Nodes (22): BodySchema, ProductHint, MockupBodySchema, BodySchema, CriterionSchema, DiagnosisSchema, QuotaExceededError, authenticateRequest() (+14 more)

### Community 5 - "Backend: _shared"
Cohesion: 0.09
Nodes (29): breaker, buildCacheKey(), CacheEntry, fnv1aHash(), LIGHTWEIGHT_REASONS, IMPORTANT: do NOT include "statement timeout" here — that path has a dedicated, requestCtx, ResolveProductsSelectInput (+21 more)

### Community 6 - "Backend: mcp-server"
Cohesion: 0.09
Nodes (23): app, audit(), AuthCtx, authenticate(), authorizeTool(), AuthResult, corsHeaders, defineTool() (+15 more)

### Community 7 - "Backend: _shared"
Cohesion: 0.13
Nodes (13): corsHeaders, corsHeaders, corsHeaders, corsHeaders, corsHeaders, corsHeaders, ScanLog, getOrCreateRequestId() (+5 more)

### Community 8 - "Backend: _shared"
Cohesion: 0.09
Nodes (17): CategoriesRequestSchema, BodySchema, ICONS, PALETTE, corsHeaders, KitRequestSchema, corsHeaders, GetQuoteSchema (+9 more)

### Community 9 - "Backend: crm-db-bridge"
Cohesion: 0.09
Nodes (7): corsHeaders, BodySchema, corsHeaders, corsHeaders, ref_https, corsHeaders, CORS_HEADERS

### Community 10 - "Backend: _shared"
Cohesion: 0.12
Nodes (21): ALIASES, BuildCredentialsHealthOptions, CACHE, CacheEntry, CacheMetricsSnapshot, CacheMetricsState, CredentialHealthEntry, CredentialResolution (+13 more)

### Community 11 - "Backend: external-db-bridge"
Cohesion: 0.15
Nodes (20): buildExternalClient(), cachedJsonResponse(), currentRequestId(), fetchProductForVirtualAreas(), getCachedResponse(), getExternalClient(), handleBatchInsert(), handleCrud() (+12 more)

### Community 12 - "Backend: expert-chat"
Cohesion: 0.15
Nodes (15): applyProductFilters(), ClientData, CustomerData, ExpertChatBodySchema, matchesListFilter(), matchesTagFilter(), matchesTextFilter(), Message (+7 more)

### Community 13 - "Backend: _shared"
Cohesion: 0.16
Nodes (13): BodySchema, corsHeaders, RpcEnvelope, BodySchema, corsHeaders, RpcEnvelope, FULL_SCOPE, FULL_SCOPE_MAX_TTL_MS (+5 more)

### Community 14 - "Backend: external-db-bridge"
Cohesion: 0.15
Nodes (16): computeSafeLimit(), handleBatch(), handleSelect(), isBridgeTransient(), isUnpopulatedMaterializedViewError(), logSelectDecision(), safeStringify(), validateFilters() (+8 more)

### Community 15 - "Backend: manage-users"
Cohesion: 0.12
Nodes (16): CreateSchema, DeleteSchema, emailSchema, PayloadSchema, PromoteRoleSchema, promotionRoleSchema, roleSchema, UpdateEmailSchema (+8 more)

### Community 16 - "Backend: _shared"
Cohesion: 0.17
Nodes (9): corsHeaders, evaluateMigrationHealth(), approvalLimiter, corsHeaders, LogLevel, StructuredLogger, StructuredLoggerInit, withStructuredLogging() (+1 more)

### Community 17 - "Backend: _shared"
Cohesion: 0.13
Nodes (9): LOVABLE_API_KEY, RequestBody, RequestBody, corsHeaders, ALLOWED_ORIGIN_PATTERNS, CORS_HEADERS_BASE, EXACT_ALLOWED_ORIGINS, publicCorsHeaders (+1 more)

### Community 18 - "Backend: detect-new-device"
Cohesion: 0.16
Nodes (9): BodySchema, DeviceInfoSchema, getCorsHeaders(), handleCorsPreflightIfNeeded(), isAllowedOrigin(), json(), AccessBodySchema, GeoInfo (+1 more)

### Community 19 - "Backend: _shared"
Cohesion: 0.19
Nodes (10): corsHeaders, BodySchema, supabase, ScenarioResult, AppRole, authorize(), AuthorizeOptions, jsonResponse() (+2 more)

### Community 20 - "Backend: semantic-search"
Cohesion: 0.17
Nodes (8): CacheEntry, EntityType, lastCleanup, RankResult, rerankProducts(), searchCache, SearchIntent, TTLCache

### Community 21 - "Backend: e2e-cleanup"
Cohesion: 0.15
Nodes (10): AuditPayload, corsHeaders, E2ERateLimitRow, maybeApplyNameFilter(), NAMEABLE_COLUMNS, purgeBySellerId(), purgeByUserId(), QUOTE_CHILD_TABLES_BY_QUOTE_ID (+2 more)

### Community 22 - "Backend: quote-sync"
Cohesion: 0.16
Nodes (11): fetchQuoteFromCRM(), getCrmCreds(), n8nWebhookUrl, PersonalizationData, QuoteData, QuoteItemData, RequestSchema, SyncAllPendingSchema (+3 more)

### Community 23 - "Backend: _shared"
Cohesion: 0.21
Nodes (11): enrichCustomizationPrice(), handleRpc(), classifyDuration(), classifyErrorKind(), COLD_START_PATTERNS, detectPlatformFailure(), emitTelemetry(), ErrorKind (+3 more)

### Community 24 - "Backend: _shared"
Cohesion: 0.19
Nodes (10): BodySchema, corsHeaders, RpcEnvelope, AuditEntryInput, extractRequestMeta(), redactPayload(), SENSITIVE_KEYS, SupabaseAdmin (+2 more)

### Community 25 - "Backend: _shared"
Cohesion: 0.18
Nodes (9): BodySchema, corsHeaders, RpcEnvelope, FULL_SCOPE_CONFIRMATION, mapViolationReason(), McpViolationReason, recordMcpViolation(), RecordMcpViolationInput (+1 more)

### Community 26 - "Backend: _shared"
Cohesion: 0.28
Nodes (12): acquireAiQuota(), callAiWithFallback(), callAiWithTracking(), checkAiQuota(), estimateCost(), extractTokensFromResponse(), getServiceClient(), logAiUsage() (+4 more)

### Community 27 - "Backend: external-db-bridge"
Cohesion: 0.23
Nodes (8): callHandleBatchResolver(), callHandleSelectResolver(), QueryCall, callerSelectIsHeavy(), extractBaseColumn(), HEAVY_PRODUCT_COLUMNS, LIGHTWEIGHT_LIMIT_THRESHOLD, resolveProductsSelect()

### Community 28 - "Backend: _shared"
Cohesion: 0.27
Nodes (11): AliasResolution, isCustomizationPriceTablesAlias(), isTechniqueTableAlias(), isTechniqueVarianteAlias(), mapPriceTableFiltersToExternal(), mapPriceTableOrderByToExternal(), mapTechniqueFiltersToExternal(), mapTechniqueOrderByToExternal() (+3 more)

### Community 29 - "Backend: ai-recommendations"
Cohesion: 0.25
Nodes (7): ClientSchema, ProductSchema, RecommendationRequestSchema, applyRateLimit(), RateLimitConfig, rateLimiters, requestCounts

### Community 30 - "Backend: _shared"
Cohesion: 0.24
Nodes (7): ActionSchema, corsHeaders, MaterialsRequestSchema, CATALOG_ORIGIN, createReadOnlyCatalogFetch(), isReadOnlyCatalogRequest(), parseBodyWithSchema()

### Community 31 - "Backend: market-intelligence-insights"
Cohesion: 0.22
Nodes (8): aggregateData(), AggregatedSummary, buildCacheKey(), InsightPayload, log(), pctChange(), RequestBody, sha256()

### Community 32 - "Backend: mcp-keys-issue"
Cohesion: 0.20
Nodes (8): anonClient(), authedClient(), hasAnon, hasJwtCreds, hasService, SERVICE_ROLE_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD

### Community 33 - "Backend: secrets-manager"
Cohesion: 0.18
Nodes (6): ALLOWED_PREFIXES, ALLOWED_SECRETS, BodySchema, getCredentialCacheMetrics(), percentile(), resetCredentialCacheMetrics()

### Community 34 - "Backend: voice-agent"
Cohesion: 0.27
Nodes (8): TranscriptSchema, FALLBACK_RESULT, parseAiResponse(), validateResult(), VoiceCommandResult, SYSTEM_PROMPT, TOOL_CHOICE, VOICE_COMMAND_TOOL

### Community 35 - "Backend: bi-share-dossier"
Cohesion: 0.40
Nodes (9): b64urlDecode(), b64urlEncode(), fromUtf8(), hmac(), Payload, signToken(), toArrayBuffer(), utf8() (+1 more)

### Community 36 - "Backend: _shared"
Cohesion: 0.33
Nodes (8): DEFAULT_TRANSIENT_PATTERNS, isTransientError(), nextDelayMs(), RetryOptions, RetryResult, retrySupabaseCall(), retryWithBackoff(), sleep()

### Community 37 - "Backend: sicoob-artwork-register"
Cohesion: 0.33
Nodes (8): ARTWORK_BUCKET, assertArtworkContentType(), assertArtworkPath(), buildArtworkIdentity(), CONTENT_TYPE_BY_EXTENSION, MAX_ARTWORK_BYTES, sha256Hex(), ArtworkRequest

### Community 38 - "Backend: rls-integration-tests"
Cohesion: 0.25
Nodes (5): CaseResult, classify(), Expect, Op, runCase()

### Community 39 - "Backend: rls-matrix-export"
Cohesion: 0.31
Nodes (7): corsHeaders, csvEscape(), escapeHtml(), MatrixRow, renderCsv(), renderHtml(), sevColor()

### Community 40 - "Backend: _shared"
Cohesion: 0.25
Nodes (4): invalidateCredentialCache(), ALIAS_CONTRACT, clearAll(), clearEnv()

### Community 41 - "Backend: step-up-verify"
Cohesion: 0.22
Nodes (6): Action, corsHeaders, RequestBody, RpcEnvelope, StepUpChallengeRow, StepUpOtpRow

### Community 42 - "Backend: connections-hub-audit"
Cohesion: 0.25
Nodes (7): AuditReport, CheckResult, REQUIRED_CRONS, REQUIRED_FUNCTIONS, REQUIRED_TABLES, TRIGGER_TABLES, REQUEST_ID_HEADER

### Community 43 - "Backend: external-db-bridge"
Cohesion: 0.57
Nodes (7): addTechniqueToAreas(), buildVirtualRecords(), getAreaId(), getAreas(), normalizeArea(), normalizeTechniqueIds(), removeTechniqueFromAreas()

### Community 44 - "Backend: _shared"
Cohesion: 0.33
Nodes (3): LoginAttemptSchema, loginLogLimiter, RateLimiter

### Community 46 - "Backend: sicoob-seed"
Cohesion: 0.29
Nodes (4): corsHeaders, supabase, TEST_PASSWORD, TEST_USERS_CONFIG

### Community 47 - "Backend: bitrix-sync"
Cohesion: 0.40
Nodes (3): BitrixSyncSchema, parseColor(), parseColors()

### Community 48 - "Backend: external-db-bridge"
Cohesion: 0.40
Nodes (3): applyFilters(), InvalidFilterError, sanitizeIlikeValue()

### Community 50 - "Backend: full-op-diagnostics"
Cohesion: 0.33
Nodes (4): BodySchema, CheckResult, CheckStatus, jsonResponse()

### Community 53 - "Backend: comparison-ai-advisor"
Cohesion: 0.40
Nodes (4): BodySchema, corsHeaders, ProductSchema, ToolSchema

### Community 55 - "Backend: crm-db-bridge"
Cohesion: 0.40
Nodes (3): EXPECTED_NAMES, VALID_HEALTHS, VALID_SOURCES

### Community 56 - "Backend: e2e-auth-test"
Cohesion: 0.40
Nodes (4): imports, hono, mcp-lite, @supabase/supabase-js

### Community 58 - "Backend: mcp-server"
Cohesion: 0.40
Nodes (4): imports, hono, mcp-lite, @supabase/supabase-js

### Community 59 - "Backend: migration-health-check"
Cohesion: 0.40
Nodes (4): imports, hono, mcp-lite, @supabase/supabase-js

### Community 60 - "Backend: rate-limit-check"
Cohesion: 0.40
Nodes (3): BodySchema, RATE_LIMITS, requestCounts

### Community 62 - "Backend: sicoob-seed-qa"
Cohesion: 0.40
Nodes (3): corsHeaders, QA_USERS, supabase

### Community 64 - "Backend: connections-health-check"
Cohesion: 0.67
Nodes (3): alreadyNotified(), IncidentKey, notifyAdmins()

### Community 68 - "Backend: _shared"
Cohesion: 0.50
Nodes (3): AuthzCategory, AuthzEntry, EDGE_AUTHZ_MANIFEST

### Community 71 - "Backend: _shared"
Cohesion: 0.67
Nodes (3): buildCredsHealthSnapshot(), buildCredentialsHealth(), summarizeCredential()

## Knowledge Gaps
- **333 isolated node(s):** `MODEL_PRICING`, `QuotaResult`, `LogParams`, `SupabaseAdmin`, `SENSITIVE_KEYS` (+328 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 475 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `MODEL_PRICING`, `QuotaResult`, `LogParams` to the rest of the system?**
  _333 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend: _shared` be split into smaller, more focused modules?**
  _Cohesion score 0.07227891156462585 - nodes in this community are weakly interconnected._
- **Should `Backend: crm-db-bridge` be split into smaller, more focused modules?**
  _Cohesion score 0.08503401360544217 - nodes in this community are weakly interconnected._
- **Should `Backend: sicoob-kit-quote` be split into smaller, more focused modules?**
  _Cohesion score 0.0753045404208195 - nodes in this community are weakly interconnected._
- **Should `Backend: _shared` be split into smaller, more focused modules?**
  _Cohesion score 0.08097165991902834 - nodes in this community are weakly interconnected._
- **Should `Backend: _shared` be split into smaller, more focused modules?**
  _Cohesion score 0.13068181818181818 - nodes in this community are weakly interconnected._
- **Should `Backend: _shared` be split into smaller, more focused modules?**
  _Cohesion score 0.09274193548387097 - nodes in this community are weakly interconnected._