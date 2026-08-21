import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const indexHtml = readFileSync("dist/index.html", "utf8");
const i18n = readFileSync("dist/i18n.js", "utf8");
const htmlEditLeaveConfirm = readFileSync("dist/html-edit-leave-confirm.html", "utf8");
const htmlEditToolbar = readFileSync("dist/html-edit-toolbar.html", "utf8");
const runtimeOverlay = readFileSync("dist/runtime-overlay.html", "utf8");
const markdownEditor = readFileSync("src/markdown-editor.js", "utf8");
const portableMarkdownFixture = readFileSync("src-tauri/tests/fixtures/markdown-portable-images/portable-markdown-images.md", "utf8");
const textAlignmentFixture = readFileSync("src-tauri/tests/fixtures/markdown-text-alignment/portable-text-alignment.md", "utf8");
const markdownDocumentRust = readFileSync("src-tauri/src/core/document.rs", "utf8");
const readmeEnglish = readFileSync("README.md", "utf8");
const readmeChinese = readFileSync("README-CN.md", "utf8");
const htmlEditRuntime = readFileSync("dist/assets/html-edit-runtime.js", "utf8");
const htmlEditConverter = readFileSync("dist/assets/html-edit-converter.js", "utf8");
const richTextFixture = readFileSync("src-tauri/tests/fixtures/html-edit/editable-rich-text.html", "utf8");
const htmlRuntimeRust = readFileSync("src-tauri/src/core/html_runtime.rs", "utf8");
const previewCommandsRust = readFileSync("src-tauri/src/commands/preview.rs", "utf8");
const itemCommandsRust = readFileSync("src-tauri/src/commands/items.rs", "utf8");
const htmlEditCommandsRust = readFileSync("src-tauri/src/commands/html_edit.rs", "utf8");
const srcTauriCargoToml = readFileSync("src-tauri/Cargo.toml", "utf8");
const mainRust = readFileSync("src-tauri/src/main.rs", "utf8");
const skillDiscoveryRust = readFileSync("src-tauri/src/core/skill_discovery.rs", "utf8");
const agentProjectsRust = readFileSync("src-tauri/src/commands/agent_projects.rs", "utf8");
const agentArtifactsDatabaseRust = readFileSync("src-tauri/src/db/agent_artifacts.rs", "utf8");
const workbuddyAdapterRust = readFileSync("src-tauri/src/core/agent_adapters/workbuddy.rs", "utf8");
const agentDiscoveryCacheMigration = readFileSync("src-tauri/migrations/0005_agent_discovery_cache.sql", "utf8");
const nbskillCommandsRust = readFileSync("src-tauri/src/commands/nbskill.rs", "utf8");
const cliCoreRust = readFileSync("src-tauri/src/core/cli.rs", "utf8");
const nbskillDefinition = readFileSync("integrations/nbskill/SKILL.md", "utf8");
const nbskillManifestContract = readFileSync("integrations/nbskill/references/agent-output-manifest-v1.md", "utf8");

function indexFunctionSection(name, nextName) {
  const start = indexHtml.indexOf(`function ${name}`);
  const end = indexHtml.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} must be followed by ${nextName}`);
  return indexHtml.slice(start, end);
}

const connectAgentScopes = indexFunctionSection("connectAgentScopesInSettings", "toggleAgentScopeDetails");
const restoreCachedAgentProjects = indexFunctionSection("restoreCachedAgentProjectsInSettings", "loadAgentProjectsInSettings");
const openSettingsPanelFromOverlay = indexFunctionSection("openSettingsPanelFromOverlay", "renderSortMenu");
const thumbnailSettingsControls = indexFunctionSection("syncThumbnailSettingsControls", "runThumbnailSettingsOperation");
const thumbnailSettingsDetection = indexFunctionSection("refreshThumbnailBackendStatusFromSettings", "enableSystemChromeThumbnails");
const thumbnailSettingsRebuild = indexFunctionSection("rebuildThumbnailsForItems", "rebuildVisibleHtmlThumbnails");

assert.match(indexHtml, /id="settingsThumbnailFeedback"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*hidden/, "thumbnail Settings actions must expose one persistent inline live region instead of relying on the document-only footer status");
assert.match(thumbnailSettingsControls, /settingsRefreshThumbnailStatusButton[\s\S]*?settingsRebuildVisibleThumbsButton[\s\S]*?settingsRebuildLibraryThumbsButton[\s\S]*?button\.disabled = Boolean\(operation\)[\s\S]*?aria-busy/, "thumbnail detection and both rebuild actions must share one mutually exclusive busy state");
assert.match(thumbnailSettingsDetection, /thumbnailDetecting[\s\S]*?loadThumbnailBackendStatus\(\{ throwOnError: true \}\)[\s\S]*?thumbnailDetectCompletePrefix[\s\S]*?thumbnailEngineDisplayName\(\)[\s\S]*?thumbnailDetectFailedPrefix/, "thumbnail engine detection must report the detected engine or an actionable failure inside Settings");
assert.match(thumbnailSettingsRebuild, /let failed = 0[\s\S]*?catch \(error\)[\s\S]*?failed \+= 1[\s\S]*?onProgress\?\./, "thumbnail rebuild must count and surface per-item failures instead of silently swallowing them");

assert.match(indexHtml, /data-settings-tab="skills">产物接入<[\s\S]*?id="settingsSkillsSection"[\s\S]*?>项目产物接入<[\s\S]*?>skill 产物接入</, "settings must expose one Artifact Access section containing project and skill artifact access");
assert.match(indexHtml, /id="settingsSkillsSection"[\s\S]*?id="settingsAgentProjectList"[\s\S]*?id="settingsDiscoverAgentsButton"/, "project discovery must live inside Artifact Access");
assert.doesNotMatch(indexHtml, /id="settingsLibrariesSection"[\s\S]{0,1200}id="settingsDiscoverAgentsButton"/, "File Management must not rediscover Agent projects");
assert.match(indexHtml, /projectLibraries = filteredLibraries\.filter\(\(library\) => library\.sourceKind === "agent_project"\)[\s\S]*?title: t\("settings\.sourceProjects"\)/, "File Management must manage connected project sources in their own localized group");
assert.match(indexHtml, /data-settings-library-section="projects" data-i18n-key="settings\.sourceProjects"[\s\S]*?t\("actions\.viewArtifactAccess"\)[\s\S]*?t\("settings\.sourceProjectsDescription"\)/, "Project Sources labels, description and action must come from the language dictionary");
assert.match(indexHtml, /data-settings-open-artifact-access="projects"[\s\S]*?settingsArtifactSection = node\.dataset\.settingsOpenArtifactAccess/, "Project source management must link back to Artifact Access instead of rescanning from File Management");
assert.match(indexHtml, /title: t\("settings\.sourceProjects"\)[\s\S]*?data-settings-open-artifact-access="projects">\$\{t\("actions\.addProject"\)\}/, "Project Sources must offer an Add Project action that routes to Project Artifact Access");
assert.match(indexHtml, /data-settings-artifact-section="projects"[\s\S]*?data-settings-artifact-section="skills"[\s\S]*?data-settings-library-section="projects"/, "Artifact Access and File Management must use compact top-level source switches");
assert.match(indexHtml, /role="tablist"[\s\S]*?role="tab"[\s\S]*?aria-selected="true"[\s\S]*?settingsKeyboardTablist[\s\S]*?ArrowLeft[\s\S]*?ArrowRight[\s\S]*?Home[\s\S]*?End/, "settings switches must expose tab semantics and keyboard navigation backed by explicit tablist state");
assert.match(indexHtml, /const artifactButton = event\.target\.closest\("\[data-settings-artifact-section\]"\)[\s\S]*?renderSettingsPanel\(\);[\s\S]*?artifactButton\.focus\(\)[\s\S]*?const libraryButton[\s\S]*?renderSettingsPanel\(\);[\s\S]*?libraryButton\.focus\(\)/, "mouse activation of settings subtabs must preserve focus so arrow-key navigation still works");
assert.match(indexHtml, /document\.querySelectorAll\("\[data-settings-tab\]"\)[\s\S]*?node\.addEventListener\("click"[\s\S]*?settingsKeyboardTablist = "settings"[\s\S]*?renderSettingsPanel\(\)/, "mouse activation of top-level settings tabs must preserve explicit keyboard navigation state even when macOS does not move DOM focus");
assert.match(indexHtml, /settingsScrim\.addEventListener\("focusin"[\s\S]*?settingsKeyboardTablist = "artifact"[\s\S]*?settingsKeyboardTablist = "library"[\s\S]*?settingsKeyboardTablist = "settings"[\s\S]*?settingsKeyboardTablist = ""/, "settings must clear remembered tab keyboard routing when the user enters another interactive control");
assert.match(indexHtml, /settingsReturnFocus[\s\S]*?document\.activeElement[\s\S]*?returnFocus\?\.focus[\s\S]*?event\.key !== "Tab"[\s\S]*?focusable/, "the settings dialog must establish focus, trap Tab, and return focus when it closes");
assert.match(indexHtml, /function bindSettingsSectionSwitchesOnce\(\)[\s\S]*?settingsSectionSwitchesBound[\s\S]*?settingsScrim\.addEventListener\("click"/, "settings source switches must use one delegated listener instead of accumulating handlers after rerenders");
assert.match(indexHtml, /\.settings-section\[hidden\],[\s\S]*?\.settings-subsection\[hidden\][\s\S]*?display:\s*none\s*!important/, "settings source switches must make inactive sections actually hidden even when section layout sets display grid");
assert.match(indexHtml, /\.settings-section-switch button[\s\S]*?transition:[\s\S]*?background-color 160ms ease[\s\S]*?@media \(prefers-reduced-motion: reduce\)/, "settings source switches must animate gently while respecting reduced-motion preferences");
assert.match(indexHtml, /function syncAgentScopeSummariesFromPreview[\s\S]*?summary\.pendingCount = Number\(preview\.pendingCount/, "expanded project details must expose one local summary synchronization path");
assert.match(indexHtml, /agentArtifactPreviewByScope\.set\(scopeKey, appState\.agentArtifactPreview\);[\s\S]*?syncAgentScopeSummariesFromPreview\(scopeIndexes, appState\.agentArtifactPreview\)/, "expanded project details must synchronize current candidate counts back into the project row without another discovery scan");
assert.match(indexHtml, /\.settings-agent-scope-row > \.button-row > \.settings-agent-scope-action\.button[\s\S]*?min-height:\s*28px !important[\s\S]*?padding:\s*0 10px !important[\s\S]*?font-size:\s*11px[\s\S]*?data-settings-agent-connect-suggested/, "project row actions must form a readable middle tier beneath the top-level Discover Projects action");
assert.match(indexHtml, /\.settings-modal \.settings-skill-summary > \.button-row > \.button[\s\S]*?min-height:\s*30px[\s\S]*?\.settings-modal \.settings-skill-row > \.button-row > \.settings-skill-action\.button[\s\S]*?min-height:\s*28px[\s\S]*?settings-skill-action[\s\S]*?data-settings-attach-skill-output/, "Skill Artifact Access must reuse the Project Artifact Access top-level and row-action size hierarchy with enough specificity to beat generic modal buttons");
assert.match(indexHtml, /#settingsLibrariesSection \.settings-subsection-card \+ \.settings-subsection-card[\s\S]*?padding-top:\s*14px/, "the Removed Files card must retain the same safe top inset as other File Management cards");
assert.match(indexHtml, /\.agent-inline-actions \.settings-inline-link[\s\S]*?min-height:\s*24px[\s\S]*?padding:\s*0 6px[\s\S]*?\.agent-inline-actions \.settings-inline-link:hover[\s\S]*?background:\s*rgba\(20, 20, 20, 0\.07\)/, "per-file Agent decisions must retain compact hit targets and show a gray hover state");
assert.match(indexHtml, /function decideSingleArtifactInSettings[\s\S]*?await loadLibraries\(\);[\s\S]*?await loadItems\(\);[\s\S]*?agentDiscoveryPayload = await invoke\("discover_agent_projects"\)/, "individual project artifact decisions must refresh project sources, items, and project summaries together");
assert.match(indexHtml, /function removeItemFromNutbook[\s\S]*?await loadLibraries\(\);[\s\S]*?await loadItems\(\);[\s\S]*?await loadAgentProjectsInSettings\(\)/, "removing an artifact must refresh project source visibility and any loaded discovery summary");
assert.match(indexHtml, /function restoreIgnoredItem[\s\S]*?await loadLibraries\(\);[\s\S]*?await loadIgnoredItems\(\);[\s\S]*?await loadAgentProjectsInSettings\(\)/, "restoring an artifact must refresh project source visibility and any loaded discovery summary");
assert.doesNotMatch(indexHtml, /发现并接入由本机 Agent 生成的项目产物，确认前不会导入任何文件/, "Artifact Access must not repeat explanatory copy beneath its page title");
assert.match(indexHtml, /function loadAgentProjectsInSettings\(\)[\s\S]*?invoke\("discover_agent_projects"\)[\s\S]*?renderSettingsPanel\(\)/, "Artifact Access must render read-only Agent scopes inline without opening a secondary modal");
assert.match(agentDiscoveryCacheMigration, /CREATE TABLE IF NOT EXISTS agent_discovery_cache[\s\S]*?payload_json TEXT NOT NULL/, "the last completed Agent discovery snapshot must survive settings and app restarts");
assert.match(agentArtifactsDatabaseRust, /save_agent_discovery_cache[\s\S]*?ON CONFLICT\(id\) DO UPDATE[\s\S]*?load_agent_discovery_cache/, "Agent discovery persistence must atomically replace and reload one last-known snapshot");
assert.match(agentProjectsRust, /discover_agent_projects[\s\S]*?save_agent_discovery_cache[\s\S]*?get_cached_agent_projects/, "explicit discovery must persist its result and expose a read-only cached-result command");
assert.match(mainRust, /commands::agent_projects::get_cached_agent_projects[\s\S]*?commands::agent_projects::discover_agent_projects/, "both cached restore and explicit refresh commands must be registered with Tauri");
assert.match(restoreCachedAgentProjects, /invoke\("get_cached_agent_projects"\)[\s\S]*?agentDiscoveryPayload = cachedPayload[\s\S]*?agentDiscoveryStep = "results"/, "opening Project Artifact Access must restore the last scan without starting a new scan");
assert.doesNotMatch(openSettingsPanelFromOverlay, /loadAgentProjectsInSettings|invoke\("discover_agent_projects"\)/, "opening settings must not silently rescan Agent projects");
assert.match(indexHtml, /\.nbskill-enhancement-hint\[data-help-mode="intro"\]:not\(\[hidden\]\)[\s\S]*?animation:\s*nbskill-enhancement-pulse[\s\S]*?@keyframes nbskill-enhancement-pulse[\s\S]*?@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.nbskill-enhancement-hint\[data-help-mode="intro"\]:not\(\[hidden\]\)[\s\S]*?animation:\s*none/, "only the no-healthy-integration warning may pulse, and it must respect reduced-motion preferences");
assert.match(htmlEditRuntime, /ALLOWED_RICH_TAGS = new Set\(\[[^\]]*"CODE"[\s\S]*?ALLOWED_SHORT_RICH_TAGS = new Set\(\[[^\]]*"CODE"/, "managed rich text must preserve attribute-free inline code in both content and short fields");
assert.match(richTextFixture, /<code>\.agent-outputs<\/code>/, "the real rich-text acceptance artifact must exercise legacy-compatible inline code");
assert.doesNotMatch(workbuddyAdapterRust, /VERIFIED_APP_VERSIONS|is_supported_app_version/, "WorkBuddy discovery must not use application versions as a compatibility gate");
assert.match(workbuddyAdapterRust, /let version = read_bundle_version\(&self\.app_path\);[\s\S]*?fs::canonicalize\(&self\.task_root\)[\s\S]*?file_type\.is_symlink\(\)/, "WorkBuddy version is metadata while real path and symlink checks enforce the discovery contract");
assert.match(indexHtml, /id="emptyStateOpenArtifactAccessButton"[\s\S]*?openSettingsTab\("skills"\)/, "the All Files empty state must open Artifact Access directly");
assert.doesNotMatch(indexHtml, /emptyState(?:DiscoverAgents|OpenSkills)Button/, "the empty state must not retain separate Agent-discovery or Skill-scan entries");
assert.match(mainRust, /commands::agent_projects::discover_agent_projects/, "the read-only Agent discovery command must be registered with Tauri");
assert.match(indexHtml, /agentDiscoveryPayload\?\.scopes[\s\S]*?agentDiscoveryPayload\?\.installations/, "Agent discovery must consume the unified installations and project\/task scopes payload");
assert.match(indexHtml, /scope\.scopeKind === "task"[\s\S]*?`task:\$\{scope\.adapterId\}:\$\{scope\.externalScopeId\}`/, "WorkBuddy tasks must remain distinct dated task scopes while projects aggregate by root");
assert.doesNotMatch(indexHtml, /agentDiscoveryPayload\?\.(?:installation(?!s)|projects)/, "the retired single-installation and projects-only discovery DTO must not return");
assert.match(indexHtml, /groupedAgentScopesForSettings[\s\S]*?scope\.scopeKind === "task"[\s\S]*?groups\.set\(key,[\s\S]*?scopes:\s*\[scope\]/, "Artifact Access must aggregate projects by root while preserving distinct WorkBuddy task scopes without repeating provider badges in the project row");
assert.match(indexHtml, /return \[\.\.\.groups\.values\(\)\]\.filter\(\(group\) =>[\s\S]*?group\.scanPartial[\s\S]*?group\.suggestedCount > 0[\s\S]*?group\.pendingCount > 0[\s\S]*?group\.alreadyIndexedPaths\.length > 0/, "Artifact Access must hide empty scopes while preserving partial scans and scopes with reviewable or connected artifacts");
assert.match(workbuddyAdapterRust, /if task_name\.starts_with\('\.'\)[\s\S]*?continue/, "WorkBuddy discovery must ignore internal hidden directories instead of exposing .agent-outputs as task scopes");
assert.match(workbuddyAdapterRust, /has_local_manifest_marker\(&canonical_date_directory\)[\s\S]*?workbuddy:manifest-task:[\s\S]*?root_path: canonical_date_directory[\s\S]*?continue/, "a WorkBuddy dated workspace with a local nbskill manifest must become one task scope instead of losing root artifacts or duplicating child folders");
assert.match(workbuddyAdapterRust, /symlink_metadata\(&metadata_directory\)[\s\S]*?file_type\(\)\.is_symlink\(\)[\s\S]*?symlink_metadata\(metadata_directory\.join\("manifest\.json"\)\)/, "the WorkBuddy manifest marker must be a real local directory and file rather than a symlink escape");
assert.match(nbskillDefinition, /whenever an Agent creates, updates, or supersedes[\s\S]*?even when the user does not mention Nutbook[\s\S]*?register every primary `\.md`[\s\S]*?`\.html` file/, "nbskill must trigger automatically for every user-facing Markdown and HTML deliverable");
assert.match(nbskillDefinition, /actual content-producing or transformation Skill[\s\S]*?humanizer-zh[\s\S]*?nbskill is the registration[\s\S]*?transport/, "nbskill must attribute the artifact to the real producing Skill rather than itself");
assert.match(nbskillManifestContract, /Skill that produced or transformed the[\s\S]*?nbskill registrar is transport/, "the manifest contract must preserve real Skill provenance");
assert.match(indexHtml, /providerIssues[\s\S]*?installation\.status !== "ready"[\s\S]*?issueMarkup/, "a provider-specific discovery failure must remain visible inline instead of silently dropping its scopes");
assert.match(indexHtml, /suggestedCount[\s\S]*?pendingCount[\s\S]*?excludedCount/, "the Agent scan summary must distinguish recommended, pending, and excluded files");
assert.match(indexHtml, /ignoredCount[\s\S]*?isExcludedAgentProject[\s\S]*?projectExcluded[\s\S]*?data-settings-restore-project/, "user-excluded projects must leave the review list, appear in a separate bottom group, and remain restorable");
assert.match(indexHtml, /exclude_agent_project_candidates[\s\S]*?discover_agent_projects/, "bulk project exclusion must persist the whole project decision before refreshing discovery state");
assert.match(agentProjectsRust, /ignored_artifact_paths_for_root[\s\S]*?ignored_count/, "project discovery summaries must read persisted user exclusions instead of dropping them from the UI");
assert.match(indexHtml, /restore_excluded_agent_project_candidates[\s\S]*?discover_agent_projects/, "restoring an excluded project must refresh discovery state immediately");
assert.match(indexHtml, /async function restoreExcludedAgentProject[\s\S]*?previewAgentGroupForBatch\(group\)[\s\S]*?restore_excluded_agent_project_candidates/, "excluded projects must be restorable even when an older cached library list has not loaded their source record yet");
assert.match(indexHtml, /reviewCandidates[\s\S]*?agentArtifactSkillName\(candidate\)/, "expanded Agent scope must keep every reviewable file while limiting visible provenance to a real producing Skill");
assert.match(indexHtml, /function agentArtifactSkillName[\s\S]*?nbskill_registered[\s\S]*?skillDisplayName[\s\S]*?const reasonLabel = agentArtifactSkillName\(candidate\) \|\| agentArtifactBadge\(candidate, content\)[\s\S]*?agent-reason-badge[\s\S]*?escapeHtml\(reasonLabel\)/, "artifact rows must prefer the real producing Skill and otherwise retain the strongest recommendation reason");
assert.match(indexHtml, /filter\(\(group\) => group\.status === "suggested"\)[\s\S]*?accept_agent_artifact_groups/, "the primary Agent action must batch only suggested groups");
assert.match(indexHtml, /agent-detail-list[\s\S]*?data-settings-agent-decision="accept"[\s\S]*?data-settings-agent-decision="ignore"/, "expanded artifacts must expose one compact list of per-file decisions");
assert.match(mainRust, /commands::agent_projects::refresh_agent_project/, "hybrid projects must retain the established explicit refresh command");
assert.match(agentProjectsRust, /has_manifest && project\.auto_import_mode == "explicit"[\s\S]*?candidate_ids_for_manifest_registration[\s\S]*?accept_agent_artifact_candidates/, "active manifest entries must follow the explicit auto-import path while unregistered adapter candidates remain reviewable");
assert.match(agentProjectsRust, /!known_paths\.contains\(&candidate\.primary_path\)[\s\S]*?DiscoveryReasonKind::NbskillRegistered/, "manifest entries must attach provenance to already indexed files instead of being discarded as ordinary duplicates");
assert.match(indexHtml, /artifact-access-switchbar[\s\S]*?data-settings-artifact-section="projects"[\s\S]*?data-settings-artifact-section="skills"[\s\S]*?id="settingsNbskillAgentStrip"[\s\S]*?id="settingsRefreshNbskillStatusButton"[\s\S]*?id="settingsCopyNbskillPromptButton"/, "the shared nbskill enhancement must sit beside both Artifact Access subsections with compact detection and copy actions");
assert.doesNotMatch(indexHtml, /id="settingsProjectArtifactsSubsection"[\s\S]{0,1800}id="settingsNbskillAgentStrip"/, "nbskill infrastructure must not be nested inside Project Artifact Access");
assert.match(indexHtml, /id="settingsRefreshNbskillStatusButton"[\s\S]*?<svg[\s\S]*?id="settingsCopyNbskillPromptButton"[\s\S]*?<svg/, "nbskill refresh and copy actions must use local SVG icons rather than oversized text buttons");
assert.match(indexHtml, /\.nbskill-icon-button--repair svg[\s\S]*?width:\s*16px[\s\S]*?height:\s*16px[\s\S]*?fill:\s*none[\s\S]*?stroke-width:\s*1\.7[\s\S]*?id="settingsRefreshNbskillStatusButton"[\s\S]*?nbskill-icon-button--primary[\s\S]*?circle cx="10"[\s\S]*?id="settingsCopyNbskillPromptButton"[\s\S]*?nbskill-icon-button--repair[\s\S]*?viewBox="0 0 24 24"[\s\S]*?M14\.6 4\.4/, "Agent integration actions must use equally weighted, dedicated line SVGs rather than retired refresh/copy or filled icons");
assert.match(indexHtml, /data-i18n-key="settings\.nbskillEnhancement"[\s\S]*?NBSKILL_AGENT_ICONS[\s\S]*?agent-icons\/openclaw\.png[\s\S]*?agent-icons\/hermes\.png[\s\S]*?agent-icons\/claude-code\.png[\s\S]*?agent-icons\/codex\.png[\s\S]*?agent-icons\/workbuddy\.png/, "the shared nbskill selector must localize its label and use the five user-supplied packaged PNG icons");
assert.match(indexHtml, /\.nbskill-agent-button\[data-nbskill-agent-id="codex"\] img[\s\S]*?transform:\s*scale\(1\.35\)/, "the Codex source icon must compensate for its larger transparent margin without changing every Agent icon size");
assert.doesNotMatch(indexHtml, /\.nbskill-agent-button\.runtime-verified::after/, "verified nbskill status must not add an unexplained dot beneath the Agent icon");
assert.match(indexHtml, /#settingsDiscoverAgentsButton[\s\S]*?white-space:\s*nowrap/, "the localized Discover Projects action must remain on one line");
assert.match(indexHtml, /id="settingsProjectSearchInput"[\s\S]*?id="settingsProjectSortButton"[\s\S]*?id="settingsProjectSortMenu"[\s\S]*?id="settingsSkillSearchInput"[\s\S]*?id="settingsSkillSortButton"[\s\S]*?id="settingsSkillSortMenu"/, "Project and Skill Artifact Access must both expose search and project-native popover sorting controls");
assert.match(indexHtml, /\.settings-search-field[\s\S]*?width:\s*28px[\s\S]*?\.settings-search-field\.is-expanded,[\s\S]*?width:\s*176px[\s\S]*?\.settings-modal \.settings-search-field \.input[\s\S]*?height:\s*26px[\s\S]*?min-height:\s*26px/, "settings search must default to a compact icon and keep its input below the pill height despite the later generic modal input rule");
assert.match(indexHtml, /\.settings-search-field[\s\S]*?grid-template-columns:\s*28px minmax\(0, 1fr\)[\s\S]*?border-radius:\s*999px[\s\S]*?transition:\s*width 160ms cubic-bezier\(0\.22, 1, 0\.36, 1\)[\s\S]*?\.settings-search-field \.settings-search-icon[\s\S]*?grid-column:\s*1[\s\S]*?height:\s*28px[\s\S]*?transform:\s*translateY\(1px\)[\s\S]*?\.settings-modal \.settings-search-field \.input[\s\S]*?grid-column:\s*2[\s\S]*?padding:\s*0 10px 0 2px[\s\S]*?line-height:\s*26px/, "settings search must be pill-shaped, animate smoothly, and optically center its icon and text in separate grid columns");
assert.match(indexHtml, /function scheduleSettingsSearchCollapse[\s\S]*?input\?\.value[\s\S]*?field\.matches\(":hover"\)[\s\S]*?1200[\s\S]*?bindSettingsSearchFieldsOnce[\s\S]*?pointerenter[\s\S]*?pointerleave/, "empty settings searches must expand on hover and collapse only after a guarded delay");
assert.match(indexHtml, /data-has-value", appState\.settingsSourceSearch \? "true" : "false"[\s\S]*?data-has-value", appState\.settingsProjectSearch \? "true" : "false"[\s\S]*?data-has-value", appState\.settingsSkillSearch \? "true" : "false"/, "an active settings search must remain visibly expanded");
assert.match(indexHtml, /\.settings-artifact-sort \.icon-button[\s\S]*?width:\s*28px[\s\S]*?height:\s*28px[\s\S]*?border:\s*0[\s\S]*?background:\s*transparent[\s\S]*?\.settings-tools \.icon-button[\s\S]*?width:\s*28px[\s\S]*?height:\s*28px/, "Artifact Access and File Management sorting controls must share the compact borderless icon treatment");
assert.match(indexHtml, /\.settings-artifact-sort \.material-symbols-outlined,[\s\S]*?#settingsSourceSortButton \.material-symbols-outlined[\s\S]*?width:\s*17px[\s\S]*?height:\s*17px[\s\S]*?font-size:\s*17px[\s\S]*?transform:\s*translateY\(2px\)/, "settings sort glyphs must use the same optical center line and visual weight as the search glyph");
assert.match(indexHtml, /settingsSourceSearch[\s\S]*?settingsProjectSearch[\s\S]*?settingsSkillSearch[\s\S]*?const sourceKeyword = appState\.settingsSourceSearch[\s\S]*?const skillKeyword = appState\.settingsSkillSearch/, "File, project, and Skill search state must remain independent");
assert.match(indexHtml, /projectScanSummaryText\(discoveredProjectCount\(\), connectedProjectCount\(\), excludedTotal\)[\s\S]*?data-settings-connect-selected-projects[\s\S]*?data-settings-exclude-selected-projects/, "Project Artifact Access must show scan, connection, and exclusion totals plus batch connect and exclude actions");
assert.match(indexHtml, /const excludedSkillCount = appState\.discoveredArtifactSkills\.filter\(\(skill\) => skill\.status === "excluded"\)\.length[\s\S]*?skillScanSummaryText\([\s\S]*?excludedSkillCount[\s\S]*?count: countText\(excludedSkillCount\)/, "Skill Artifact Access summary and Excluded group must share the same current-state count");
assert.match(indexHtml, /function excludedProjectCount\(\)[\s\S]*?groupedAgentScopesForSettings\(\)[\s\S]*?filter\(isExcludedAgentProject\)[\s\S]*?count: countText\(excludedTotal\)/, "the persistent excluded summary and Excluded group must share the same current-state count");
assert.match(indexHtml, /renderCandidateGroup\("suggested", content\.suggested\)[\s\S]*?renderCandidateGroup\("pending", content\.pending\)/, "expanded files must keep Recommended separate from Needs Review");
assert.match(indexHtml, /suggestedFiles\.replace\("\{count\}", group\.suggestedCount\)[\s\S]*?pendingFiles\.replace\("\{count\}", group\.pendingCount\)/, "project rows must show Recommended and Needs Review as separate counts");
assert.match(indexHtml, /data-settings-agent-detail-target="suggested"[\s\S]*?data-settings-agent-detail-target="pending"[\s\S]*?revealAgentDetailGroup\(indexes, target\)/, "project summary counts must be text entries that reveal and locate their matching detail group");
assert.match(indexHtml, /settingsArtifactCandidateSelection: new Set\(\)[\s\S]*?data-settings-agent-candidate-select[\s\S]*?data-settings-agent-candidate-group[\s\S]*?attachSelectedFiles/, "expanded project files must support individual and group selection through the shared batch action");
assert.match(indexHtml, /async function acceptSelectedArtifactCandidates[\s\S]*?invoke\("accept_agent_artifacts"[\s\S]*?candidateIds[\s\S]*?await loadLibraries\(\)[\s\S]*?await loadItems\(\)[\s\S]*?discover_agent_projects/, "selected files must be accepted by one backend batch command and refresh all project state sources");
assert.match(indexHtml, /async function excludeSelectedArtifactCandidates[\s\S]*?excludeFilesMessage[\s\S]*?invoke\("ignore_agent_artifacts"[\s\S]*?candidateIds[\s\S]*?artifactFilesBulkExcluded/, "selected project files must share one confirmed batch exclusion command");
assert.match(i18n, /attachSelectedFiles:\s*"批量接入（\{count\}）"[\s\S]*?excludeSelectedFiles:\s*"批量排除（\{count\}）"/, "selected-file batch actions must keep the established short labels and append the count");
assert.match(indexHtml, /ignoreFile:\s*"排除"[\s\S]*?ignoreFile:\s*"Exclude"/, "per-file decisions must use the same Exclude terminology as batch actions");
assert.match(connectAgentScopes, /preview_agent_project_artifacts_by_root[\s\S]*?if \(!preview\)[\s\S]*?connect_agent_project/, "opening an already connected project must load its cached preview before falling back to first-time connection and scanning");
assert.match(indexHtml, /detailLoadFailed[\s\S]*?data-settings-agent-detail-retry/, "a project-detail read failure must remain local and offer a retry instead of replacing the whole settings result");
assert.match(indexHtml, /function toggleSettingsGroup[\s\S]*?body\.hidden = collapsed[\s\S]*?aria-expanded[\s\S]*?icon\.textContent[\s\S]*?function sourceSortComparator/, "settings groups must toggle their own DOM without rebuilding and resetting the scroll viewport");
assert.doesNotMatch(indexHtml, /function toggleSettingsGroup[\s\S]{0,180}?renderSettingsPanel\(\);/, "settings group toggles must not redraw the whole panel on the normal path");
assert.match(indexHtml, /settingsProjectScrollTop:\s*0[\s\S]*?previousProjectViewport[\s\S]*?settingsProjectScrollTop = previousProjectViewport\.scrollTop[\s\S]*?nextProjectViewport\.scrollTop = appState\.settingsProjectScrollTop/, "project-list scroll position must survive incidental settings rerenders during asynchronous refreshes");
assert.match(indexHtml, /function agentArtifactBadge[\s\S]*?reason === "supported_extension_only"\) return ""[\s\S]*?reasonLabel \? `<span class="agent-reason-badge"/, "file badges must explain real provenance and suppress the generic Optional fallback");
assert.match(indexHtml, /#settingsSkillsSection,[\s\S]*?#settingsLibrariesSection[\s\S]*?overflow:\s*hidden[\s\S]*?\.settings-list-viewport[\s\S]*?overflow-y:\s*auto[\s\S]*?overscroll-behavior:\s*contain/, "Artifact Access and File Management must keep their tool regions fixed while only list viewports scroll");
assert.match(indexHtml, /data-settings-attach-selected-skills[\s\S]*?attachDiscoveredSkillSource[\s\S]*?connectedCount \+= 1/, "Skill Artifact Access must batch only successfully connected automatic output folders");
assert.match(indexHtml, /\.settings-artifact-summary,[\s\S]*?\.settings-skill-summary[\s\S]*?padding:\s*2px 0 4px[\s\S]*?#settingsSkillList\.settings-list\.scrollable[\s\S]*?padding-top:\s*0/, "Project and Skill Artifact Access headers and summary controls must share the same vertical geometry");
assert.match(indexHtml, /#settingsProjectArtifactsSubsection,[\s\S]*?#settingsSkillArtifactsSubsection\s*\{[\s\S]*?padding:\s*14px/, "Project and Skill Artifact Access cards must keep identical inner padding even when one is the second subsection in the DOM");
assert.match(indexHtml, /\.settings-modal \.button-row \.button::before[\s\S]*?inset:\s*-3px 0[\s\S]*?\.settings-modal \.button:hover[\s\S]*?transform:\s*translateY\(-1px\)[\s\S]*?\.settings-modal \.button:active,[\s\S]*?transform:\s*none/, "settings buttons must retain individual motion hover with enough hit-area slack to prevent pointer-edge jitter");
assert.match(indexHtml, /\.settings-modal \.settings-artifact-summary > \.button-row > \.button,[\s\S]*?\.settings-modal \.settings-skill-summary > \.button-row > \.button[\s\S]*?height:\s*30px/, "Project and Skill Artifact Access summary actions must use the same explicit height");
assert.match(indexHtml, /settingsSkillScrollTop:\s*0[\s\S]*?previousSkillViewport[\s\S]*?settingsSkillScrollTop = previousSkillViewport\.scrollTop[\s\S]*?nextSkillViewport\.scrollTop = appState\.settingsSkillScrollTop/, "skill-list scroll position must survive settings rerenders while excluded skills are expanded");
assert.match(indexHtml, /function syncExcludedAgentProjectGroup[\s\S]*?summary\.suggestedCount = 0[\s\S]*?summary\.pendingCount = 0[\s\S]*?renderSettingsPanelPreservingProjectScroll\(\)[\s\S]*?await loadLibraries\(\)[\s\S]*?discover_agent_projects/, "project batch exclusion must move confirmed projects immediately before the slower discovery refresh");
assert.match(indexHtml, /\.settings-modal \.settings-header > \.button-row > \.settings-library-primary-action\.button[\s\S]*?height:\s*30px[\s\S]*?data-settings-add-folder[\s\S]*?data-settings-add-file[\s\S]*?data-settings-open-artifact-access="projects"[\s\S]*?data-settings-restore-selected/, "the four File Management primary actions must match Artifact Access action height");
assert.match(indexHtml, /#settingsLibrariesSection \.settings-row > \.button-row > \.button[\s\S]*?height:\s*28px/, "File Management row actions must use the lower-density list action height");
assert.doesNotMatch(indexHtml, /管理资料库、标签、偏好和缩略图引擎|data-i18n-key="settings\.(?:projectArtifactsDescription|skillDescription)"/, "redundant Settings and Artifact Access explanations must stay removed");
assert.match(indexHtml, /id="settingsLibrarySectionTitle"[\s\S]*?const libraryGroups = \{[\s\S]*?folders:\s*\{[\s\S]*?title:\s*t\("settings\.sourceFolders"\)[\s\S]*?files:\s*\{[\s\S]*?title:\s*t\("settings\.sourceFiles"\)[\s\S]*?projects:\s*\{[\s\S]*?title:\s*t\("settings\.sourceProjects"\)[\s\S]*?settingsLibrarySectionTitle\.textContent = activeLibraryGroup\.title/, "File Management must use the active tab theme as its page title");
assert.doesNotMatch(indexHtml, /folders:\s*renderSettingsGroup|files:\s*renderSettingsGroup|projects:\s*renderSettingsGroup|settingsIgnoredList\.innerHTML = renderSettingsGroup/, "File Management tabs must not repeat their title in a nested collapsible group");
assert.match(indexHtml, /id="settingsDiscoverAgentsButton" class="button button-primary[\s\S]*?class="button button-secondary[^"]*"[^>]*data-settings-connect-selected-projects[\s\S]*?class="button button-primary[^"]*"[^>]*data-settings-refresh-skills[\s\S]*?class="button button-secondary[^"]*"[^>]*data-settings-attach-selected-skills/, "Discover Projects and Scan Skills must be the black primary actions while batch actions stay secondary");
assert.match(indexHtml, /t\("settings\.projectDiscoveryHint"\)/, "the initial project discovery hint must come from the language dictionary");
assert.match(indexHtml, /function nbskillStatusDetail[\s\S]*?compatibleVerified[\s\S]*?compatibleUnverified[\s\S]*?outdated[\s\S]*?packageStatus/, "one status DTO must drive compatible, runtime-unverified, outdated, missing and failure explanations");
assert.match(indexHtml, /role="radio"[\s\S]*?aria-checked=[\s\S]*?aria-label=[\s\S]*?data-tooltip=/, "each Agent mark must be keyboard-focusable and expose the same precise status to accessibility and custom hover users");
assert.doesNotMatch(indexHtml, /class="nbskill-agent-button[\s\S]{0,900}?\s+title=/, "Agent icons must not combine native title popovers with the custom status tooltip");
assert.match(indexHtml, /\.nbskill-agent-button::after[\s\S]*?content:\s*attr\(data-tooltip\)[\s\S]*?data-tooltip="\$\{escapeAttribute\(detail\)\}"/, "all five Agent icons must expose their name and installation status through a visible hover tooltip");
assert.match(indexHtml, /id="settingsNbskillEnhancementHint"[\s\S]*?const hasHealthyIntegration = statuses\.some\(isNbskillHealthy\)[\s\S]*?textContent = hasHealthyIntegration \? "\?" : "!"[\s\S]*?dataset\.helpMode = hasHealthyIntegration \? "guide" : "intro"/, "Agent integration help must remain a circular state-aware entry: introduction when none are healthy and usage examples when at least one is healthy");
assert.match(indexHtml, /\.nbskill-enhancement-hint\[data-help-mode="guide"\][\s\S]*?background:\s*#d9d9de[\s\S]*?animation:\s*none[\s\S]*?showAgentIntegrationHelp[\s\S]*?agentIntegrationEditableTitle[\s\S]*?agentIntegrationClearTitle[\s\S]*?agentIntegrationEasyTitle/, "the healthy integration question-mark entry must stay visually quiet and open the agreed three-point explanation path");
assert.match(indexHtml, /\.nbskill-icon-button:disabled[\s\S]*?cursor:\s*not-allowed[\s\S]*?opacity:\s*0\.5[\s\S]*?hasRepairable[\s\S]*?当前接入正常[\s\S]*?disabled = appState\.nbskillStatusLoading \|\| !hasRepairable/, "repair must be visibly disabled with a precise healthy-state tooltip when there is nothing to repair");
assert.match(indexHtml, /AGENT_INTEGRATION_GUIDE_STORAGE_KEY[\s\S]*?operation === "enable"[\s\S]*?scope\.includes\(status\.agentId\)[\s\S]*?isNbskillHealthy\(status\)[\s\S]*?!healthyBefore\.has\(status\.agentId\)[\s\S]*?showAgentIntegrationHelp\("guide", \{ firstSuccess: true \}\)/, "the usage guide must auto-open once only after a newly enabled scoped Agent verifies healthy");
assert.match(indexHtml, /nbskillInitialHealthObserved[\s\S]*?if \(!appState\.nbskillInitialHealthObserved\)[\s\S]*?some\(isNbskillHealthy\)[\s\S]*?rememberAgentIntegrationGuideShown/, "an existing healthy integration must consume first-success onboarding eligibility so enabling another Agent later does not interrupt returning users");
assert.match(indexHtml, /data-agent-integration-copy="generate"[\s\S]*?data-agent-integration-copy="connect"/, "the replayable usage guide must render separate copy actions for both agreed examples");
assert.match(i18n, /agentIntegrationGenerateExample:\s*"[^"]*HTML 产品分析[^"]*"[\s\S]*?agentIntegrationConnectExample:\s*"[^"]*Markdown 文档[^"]*"/, "the Chinese usage guide must provide the agreed HTML generation and Markdown connection prompts");
assert.match(indexHtml, /function fetchNbskillAgentStatuses[\s\S]*?get_nbskill_agent_status[\s\S]*?length !== 5[\s\S]*?function loadNbskillAgentStatuses[\s\S]*?loadFailed/, "nbskill detection must reject incomplete status responses while retaining last-known state");
assert.match(indexHtml, /function fetchNbskillAgentStatuses[\s\S]*?get_nbskill_agent_status[\s\S]*?function loadNbskillAgentStatuses[\s\S]*?await fetchNbskillAgentStatuses\(\)[\s\S]*?function runAgentIntegrationAction[\s\S]*?await fetchNbskillAgentStatuses\(\)/, "integration actions must force-refresh their status without being short-circuited by the loading guard");
assert.doesNotMatch(indexHtml, /const failed = results\.filter/, "integration actions must not retain unused failed-result state");
assert.match(indexHtml, /newer_unverified: "检测到较新版本；Nutbook 不会降级，集成未验证"[\s\S]*?newer_unverified: "A newer version is installed; Nutbook will not downgrade it and the integration is unverified"/, "a newer owned nbskill must be explicitly unverified rather than described as corrupt");
assert.match(indexHtml, /function appConfirmSelection[\s\S]*?data-confirm-selection[\s\S]*?confirmText.*\(\$\{count\}\)|confirmText.*（\$\{count\}）/, "Agent integration confirmations must offer visible, selectable target checkboxes and show the selected count");
assert.match(indexHtml, /confirm-selection-option--secondary:not\(:has\(input:checked\)\)[\s\S]*?color:\s*#73737a[\s\S]*?function nbskillSelectionOptions\(operation, statuses, selectedAgentId\)[\s\S]*?checked: selectable && status\.agentId === selectedAgentId[\s\S]*?secondary: selectable && status\.agentId !== selectedAgentId/, "only the focused Agent must be preselected while other selectable Agent targets remain visibly secondary");
assert.match(indexHtml, /const selectedHasIntegration = Boolean\(selected && selected\.packageStatus !== "missing"\)[\s\S]*?const primaryMode = selectedHasIntegration \? "manage" : "enable"[\s\S]*?function runAgentIntegrationAction[\s\S]*?selected\?\.packageStatus !== "missing" \? "manage" : "enable"[\s\S]*?appConfirmSelection/, "the focused Agent must choose enable versus management, while management opens a selectable dialog instead of directly removing it");
assert.match(indexHtml, /operation === "repair"[\s\S]*?Choose Agent integrations to repair[\s\S]*?修复已选[\s\S]*?repair_nbskill_agents/, "repair must let users select the unhealthy Agent scope before invoking repair");
assert.match(indexHtml, /function isNbskillEnableCandidate[\s\S]*?packageStatus === "missing"[\s\S]*?function isNbskillRepairable[\s\S]*?packageStatus !== "missing"[\s\S]*?operation === "enable" \? isNbskillEnableCandidate\(status\) : isNbskillRepairable\(status\)/, "Enable must only install missing integrations while Repair handles old, corrupt, or unverified installed packages");
assert.match(indexHtml, /function nbskillSelectionOptions[\s\S]*?operation === "manage" \? status\.packageStatus !== "missing" : status\.agentDetected[\s\S]*?function runAgentIntegrationAction[\s\S]*?"manage"[\s\S]*?remove_nbskill_agents/, "management must offer a confirmed removal choice for old, corrupt, or residual integrations even when the Agent is no longer detected");
assert.match(indexHtml, /cliNewerUnverified: "检测到较新 CLI；Nutbook 不会降级，集成未验证"[\s\S]*?const healthReason = status\.agentDetected[\s\S]*?Agent 运行环境未完全验证[\s\S]*?status\.cliStatus === "newer_unverified"[\s\S]*?content\.cliNewerUnverified[\s\S]*?Nutbook CLI 不可用、过旧或无效[\s\S]*?未可靠检测到 Agent/, "Chinese Agent hover details must distinguish a newer shared CLI without falling back to hard-coded English health reasons");
assert.match(indexHtml, /let cliSyncUnlisten = null[\s\S]*?async function boot\(\)[\s\S]*?if \(!cliSyncUnlisten\)[\s\S]*?listenRaw\?\.\("nutbook-cli-sync"/, "CLI synchronization must be registered once during boot");
assert.doesNotMatch(indexFunctionSection("addFolderFromMenu", "deriveRootPathFromFiles"), /nutbook-cli-sync|listenRaw/, "adding a folder must never register another CLI synchronization listener");
assert.match(mainRust, /take\(MAX_CLI_IPC_REQUEST_BYTES \+ 1\)[\s\S]*?read_line\(&mut line\)[\s\S]*?!line\.ends_with\('\\n'\)/, "the CLI IPC server must read one bounded newline-delimited request without waiting for the client to close the socket");
assert.doesNotMatch(mainRust, /take\(MAX_CLI_IPC_REQUEST_BYTES \+ 1\)[\s\S]{0,240}?read_to_string/, "the CLI IPC server must not deadlock by reading to EOF while the client waits for a response");
assert.match(indexHtml, /class="nbskill-agent-button[\s\S]*?nbskillStatusesStale \? "stale"[\s\S]*?nbskillStatusesStale = appState\.nbskillAgentStatuses\.length > 0/, "failed re-detection must retain and visibly mark last-known Agent status as stale");
assert.match(indexHtml, /role="radio"[\s\S]*?tabindex=[\s\S]*?ArrowLeft[\s\S]*?ArrowRight[\s\S]*?\.focus\(\)/, "the five-Agent radio group must support a roving keyboard selection path");
assert.doesNotMatch(indexHtml + mainRust + nbskillCommandsRust, /prepare_nbskill_install_prompt|copySelectedNbskillInstallPrompt/, "Agent integration must not retain the obsolete copy-install-prompt path");
assert.match(indexHtml, /window\.addEventListener\("focus"[\s\S]*?settingsTab === "skills"[\s\S]*?loadNbskillAgentStatuses/, "nbskill status must refresh when the settings window regains focus");
assert.match(mainRust, /commands::nbskill::get_nbskill_agent_status[\s\S]*?commands::nbskill::install_nbskill_agents[\s\S]*?commands::nbskill::remove_nbskill_agents[\s\S]*?commands::nbskill::repair_nbskill_agents/, "status, enable, remove, and repair commands must be registered with Tauri");
assert.match(nbskillCommandsRust, /install_nbskill_agents[\s\S]*?deploy_bundled_cli\(&app_data, resource_dir\.as_deref\(\)\)[\s\S]*?shared Nutbook CLI repair failed[\s\S]*?stage_verified_package/, "enable and repair must verify or redeploy the shared CLI before changing Agent nbskill packages");
assert.match(cliCoreRust, /if old_version > bundled_version[\s\S]*?return Ok\(destination\)/, "CLI deployment must preserve a newer verified Nutbook CLI");
assert.match(cliCoreRust, /let handle = OpenProcess\([\s\S]*?if handle\.is_null\(\)/, "Windows CLI process checks must test the raw HANDLE as a pointer instead of comparing it with an integer zero");
assert.doesNotMatch(cliCoreRust, /if handle == 0/, "Windows raw HANDLE checks must not use an integer null comparison that fails to compile");
assert.match(indexHtml, /status\.cliStatus !== "compatible" && status\.cliStatus !== "newer_unverified"/, "repair must not offer to downgrade an otherwise newer shared CLI");
assert.match(indexHtml, /function requestHtmlEdit[\s\S]*?get_html_edit_patch[\s\S]*?managedSourceAllowed[\s\S]*?document\.querySelector\('\[data-editable\]'\)/, "manifest edit authorization and the real child-document protocol probe must both gate managed-source editing");
assert.match(indexHtml, /data\.hasProtocol && data\.managedSourceAllowed !== false[\s\S]*?showHtmlEditCreateCopyConfirmOverlay/, "protocol HTML without current manifest authorization must fall back to a persistent editable copy");
assert.match(htmlEditCommandsRust, /manifest_managed_source_allowed[\s\S]*?manifest_html_edit_declarations_for_item[\s\S]*?read_agent_output_manifest[\s\S]*?entry\.state == "active"[\s\S]*?managed-source/, "managed-source authorization must re-read the current active manifest declaration instead of trusting cached provenance alone");
assert.match(htmlEditCommandsRust, /pub fn commit_html_edit[\s\S]*?manifest_managed_source_allowed[\s\S]*?commit_html_edit_for_file/, "the host must re-authorize the current manifest immediately before an atomic managed-source commit");
assert.match(indexHtml, /data-settings-agent-details[\s\S]*?toggleAgentScopeDetails/, "details must expand inline from a text action on the project row");
assert.match(indexHtml, /agentArtifactPreviewByScope\.get\(scopeKey\)[\s\S]*?cachedPreview[\s\S]*?renderSettingsPanel/, "expanded project details must be cached for the current session");
assert.doesNotMatch(indexHtml, /agent-artifact-summary-grid|agent-artifact-summary-count|agent-artifact-group|为什么这样判断/, "the retired detail page, large summary cards, and verbose reason copy must be deleted");
assert.doesNotMatch(indexHtml, /agentDiscoveryScrim|agentDiscoveryPanel|agent-discovery-modal/, "the retired secondary Agent discovery modal must be deleted");
assert.match(indexHtml, /data-settings-agent-details[\s\S]*?renderAgentScopeInlineDetail/, "project and task inspection must stay inside the project row");
assert.doesNotMatch(indexHtml, /agent-detail-tabs|data-agent-detail-tab|agent-scan-facts/, "expanded project details must not add a second navigation layer or permanent scan-information panel");
assert.match(indexHtml, /function agentArtifactFileName[\s\S]*?const parentPath[\s\S]*?agent-inline-file-name[\s\S]*?escapeHtml\(fileName\)[\s\S]*?parentPath && parentPath !== group\.rootPath[\s\S]*?escapeHtml\(parentPath\)/, "project detail rows must show the file name once and only add a distinct parent path when it carries information");
assert.match(indexHtml, /const scanWarning = scanIncomplete[\s\S]*?scanWarning \? `<div class="agent-inline-more" role="status"/, "scan diagnostics must appear only when the scan is incomplete");
assert.doesNotMatch(indexHtml, /<button[^>]*data-settings-agent-connect-suggested[^>]*disabled/, "projects without recommendations must show status text rather than a disabled no-suggestions action");
assert.match(indexHtml, /artifactSummaries[\s\S]*?suggestedCount[\s\S]*?pendingCount/, "the first read-only project scan must return candidate counts on the project list");
assert.match(indexHtml, /alreadyIndexedPaths[\s\S]*?content\.connectedFiles\.replace\("\{count\}", group\.alreadyIndexedPaths\.length\)/, "project rows must disclose the connected-file count without duplicating those files as candidates");
assert.match(indexHtml, /data-settings-agent-connect-suggested[\s\S]*?connectAgentScopesInSettings\(indexes, true\)/, "the project row must offer one-click default connection without requiring details");
assert.match(connectAgentScopes, /acceptSuggestedImmediately[\s\S]*?accept_agent_artifact_groups[\s\S]*?discover_agent_projects/, "the default project action must connect, accept suggested groups, and refresh the row in one user decision");
assert.match(connectAgentScopes, /if \(acceptSuggestedImmediately && batchKeys\.length\)[\s\S]*?if \(!loadedFromExistingSource \|\| acceptSuggestedImmediately\)[\s\S]*?await loadLibraries\(\);[\s\S]*?await loadItems\(\);[\s\S]*?agentDiscoveryPayload = await invoke\("discover_agent_projects"\)/, "first-time connection and explicit suggested-file connection must refresh indexed paths while ordinary detail expansion stays read-only");
assert.match(indexHtml, /acceptSuggestedShort: "接入建议（\{count\}）"[\s\S]*?noSuggestionsShort: "无建议"/, "project rows must use concise primary-action labels");
assert.match(indexHtml, /lastScanStatus === "partial"[\s\S]*?content\.scanIncomplete/, "partial scans must be explained without treating unvisited files as missing");
assert.doesNotMatch(indexHtml, /artifact-access-open/, "Artifact Access must use the same settings panel size as every other tab");
assert.match(connectAgentScopes, /invoke\("connect_agent_project", \{[\s\S]*?adapterId: scope\.adapterId/, "Agent project connection must pass the command fields at the invoke boundary");
assert.doesNotMatch(connectAgentScopes, /invoke\("connect_agent_project", \{\s*payload:/, "Agent project connection must not double-wrap the Tauri payload");
assert.match(indexHtml, /command === "select_library"[\s\S]*?command === "connect_agent_project"[\s\S]*?return \[\{ payload: args \}\]/, "the shared invoke adapter must be the only layer wrapping Agent command payloads");
assert.match(indexHtml, /data-settings-refresh-skills="true">\$\{t\("actions\.scanSkillOutputs"\)\}/, "Skill Artifact Access must present refresh as an explicit local skill scan");
assert.match(skillDiscoveryRust, /parse_artifact_output_dir[\s\S]*?frontmatter_value\(content, "artifact_output_dir"\)/, "Skill Artifacts must preserve explicit artifact_output_dir discovery");
assert.match(skillDiscoveryRust, /discover_artifact_skills_uses_whitelisted_fallback_directories/, "Skill Artifacts must preserve the standard-output allowlist fallback");
assert.match(skillDiscoveryRust, /normaliz[\s\S]*?duplicate_count/i, "Skill Artifacts must preserve logical Skill deduplication");
assert.match(indexHtml, /data-settings-exclude-selected-skills[\s\S]*?exclude_skill_from_nutbook[\s\S]*?data-settings-restore-skill[\s\S]*?restore_excluded_skill/, "Skill Artifacts must preserve exclusion and restoration");
assert.match(indexHtml, /function attachDiscoveredSkillSource[\s\S]*?addLibrary\("folder"\)[\s\S]*?bindLibraryToSkill/, "Skill Artifacts must still connect an output directory as a folder source and persist its binding");
assert.match(indexHtml, /async function deleteLibrary[\s\S]*?appConfirm\([\s\S]*?removeSourceMessage[\s\S]*?if \(!confirmed\) return[\s\S]*?invoke\("delete_library"/, "removing a source must require the risk-explaining confirmation before the delete command can run");
assert.match(i18n, /removeSourceMessage:\s*"移除后将不再显示“\{name\}”中的文件。原文件不会删除，可重新接入。"[\s\S]*?removeSourceMessage:\s*"Files from “\{name\}” will no longer appear\. Originals stay on your computer and can be reconnected\."/, "the source-removal confirmation must use short plain-language copy in both languages");
assert.match(indexHtml, /function appConfirm\(\{[\s\S]*?detail = ""[\s\S]*?class="confirm-detail"[\s\S]*?settings\.originalFilePath[\s\S]*?async function deleteLibrary[\s\S]*?detail:\s*library\.rootPath/, "source removal must label the source path and place it in a separate subdued detail block");
for (const command of [
  "connect_agent_project",
  "preview_agent_project_artifacts",
  "preview_agent_project_artifacts_by_root",
  "accept_agent_artifact_groups",
  "accept_agent_artifact",
  "accept_agent_artifacts",
  "ignore_agent_artifact",
  "ignore_agent_artifacts",
  "set_agent_project_discovery_rule",
  "refresh_agent_project",
  "merge_agent_task_scope"
]) {
  assert.match(mainRust, new RegExp(`commands::agent_projects::${command}`), `${command} must be registered with Tauri`);
}

assert.match(indexHtml, /attach_html_presentation_preview_command[\s\S]*?runtimeSessionId[\s\S]*?activePageId/, "presentation editing must attach a dedicated read-only preview child with the current session lease and page");
assert.match(indexHtml, /html_edit_presentation_preview_clicked[\s\S]*?selectHtmlEditPresentationPage/, "preview-card clicks must navigate through the established editor coordinator");
assert.match(indexHtml, /set_html_presentation_preview_visibility_command[\s\S]*?visible: false/, "leaving or hiding a runtime must hide the presentation preview child");
assert.match(indexHtml, /previewBoundsKey === key[\s\S]*?set_html_presentation_preview_visibility_command[\s\S]*?visible: true/, "restoring unchanged runtime bounds must re-show a suspended presentation preview child");
assert.match(indexHtml, /suspendRuntimeSurfaces[\s\S]*?preservePresentationPreview: true/, "minimising must preserve the read-only presentation preview child instead of hiding it");
assert.match(indexHtml, /resumeRuntimeSurfaces[\s\S]*?delete editSession\.presentation\.previewBoundsKey/, "restoring must force a preview child bounds update and ready handshake");
assert.match(indexHtml, /toggleActiveHtmlRuntimePresentationMode[\s\S]*?编辑模式下不可进入演示全屏/, "presentation fullscreen must be blocked while an HTML edit session is active");
assert.match(indexHtml, /html_edit_presentation_page_changed[\s\S]*?pendingPageId[\s\S]*?data\.pageId !== pendingPageId/, "late presentation page events must not overwrite a newer navigation intent");
assert.match(indexHtml, /html_edit_presentation_preview_ready[\s\S]*?follow: false, focus: true/, "entering or restoring an edit session must focus the ready presentation rail without forcing it to scroll");
assert.match(indexHtml, /action === "edit"[\s\S]*?confirmHtmlEditLeaveIfNeeded/, "the runtime overlay edit action must become a safe exit path while editing");
assert.match(htmlRuntimeRust, /html-presentation-preview-\{item_id\}/, "presentation previews must use a stable child-WebView label");
assert.match(htmlRuntimeRust, /isEditing: \{\}/, "runtime control overlay state must carry the HTML edit-mode guard");
assert.match(i18n, /htmlEdit:[\s\S]*?exit: "退出编辑"/, "HTML editing must expose a localized explicit exit action");
assert.match(htmlRuntimeRust, /nb-preview-canvas[\s\S]*?cloneNode\(true\)[\s\S]*?scale/, "presentation previews must render a scaled DOM clone rather than wait for a screenshot");
assert.match(htmlRuntimeRust, /\.nb-preview-stage\{[^}]*display:block[^}]*height:104px!important/, "preview stages must use an explicit height so host-WebView button layout cannot collapse the scaled canvas");
assert.match(htmlRuntimeRust, /nb-preview-meta[\s\S]*?pageMeta\.title/, "visual preview cards must retain page number, title, and kind metadata");
assert.match(htmlRuntimeRust, /nb-preview-canvas\.deck[\s\S]*?data-nutbook-page-id/, "preview clones must restore deck positioning without overriding source slide alignment");
assert.match(htmlRuntimeRust, /\.nb-preview-card\{[^}]*text-align:initial/, "preview-card button defaults must not center inherited deck text");
assert.match(htmlRuntimeRust, /padding:58px 76px 62px!important/, "a narrow preview child must restore desktop slide padding");
assert.match(htmlRuntimeRust, /keepCardVisible[\s\S]*?root\.scrollTop/, "a preview child must keep keyboard-navigated cards visible without browser focus scrolling");
assert.match(htmlRuntimeRust, /manualScrollUntil[\s\S]*?wheel/, "manual rail scrolling must temporarily suppress automatic active-card following");
assert.match(htmlRuntimeRust, /select = \(id, follow = false\)[\s\S]*?if \(follow\) keepCardVisible/, "only an explicit navigation intent may auto-follow the active preview card");
assert.match(htmlRuntimeRust, /Array\.from\(document\.body\.children\)[\s\S]*?display", "none"/, "preview boot must isolate exported deck controls outside the deck shell");
assert.match(htmlRuntimeRust, /document\.addEventListener\("keydown"[\s\S]*?ArrowDown[\s\S]*?html_edit_presentation_preview_navigate/, "a focused preview rail must relay vertical navigation without taking over presentation shortcuts");
assert.match(htmlEditConverter, /function detectVerticalStructure[\s\S]*?data-nutbook-structure-profile[\s\S]*?vertical-sections-v1/, "ordinary vertical HTML conversion must write inert structure metadata into its detached clone");
assert.doesNotMatch(htmlEditConverter, /__NUTBOOK_PRESENTATION__\s*=/, "the converter must never inject or simulate a full presentation bridge");
assert.match(htmlEditRuntime, /function activateSectionNavigationAdapter[\s\S]*?STATE\.presentation[\s\S]*?data-nutbook-structure-profile/, "section navigation must remain an adapter distinct from presentation control");
assert.match(htmlEditRuntime, /function sectionScrollRoot[\s\S]*?overflowY[\s\S]*?scrollHeight[\s\S]*?document\.scrollingElement/, "section navigation must validate one explicit document or element scroll root");
assert.match(htmlEditRuntime, /function goToSection[\s\S]*?itemId[\s\S]*?runtimeSessionId[\s\S]*?generation[\s\S]*?requestId/, "section navigation commands must carry full session and request identity");
assert.doesNotMatch(htmlEditRuntime, /background:#(?:f8f8f9|f3f3f5)(?:!important)?/, "edit focus affordance must not force a light background over source text");
assert.match(htmlEditRuntime, /function onCompositionStart\(\) \{ STATE\.composing = true; \}/, "plain and rich text must both suspend mutation bookkeeping during IME composition");
assert.doesNotMatch(runtimeSection("onKeyDownCapture", "isEditableEventTarget"), /const blocked = \[/, "ordinary and section HTML editing must not globally swallow source navigation keys");
assert.match(indexHtml, /function renderHtmlEditSectionNavigationRail[\s\S]*?sectionNavigationRail/, "converted section navigation must use its own host rail renderer and DOM boundary");
assert.match(indexHtml, /isStrictRuntimeMessage[\s\S]*?Number\(data\.itemId\) !== session\.itemId[\s\S]*?Number\(data\.generation\) !== session\.generation/, "section and ready messages must be rejected before handling when their item or generation is stale");
assert.match(indexHtml, /function refreshHtmlEditSectionNavigation[\s\S]*?sectionNavigationEpoch[\s\S]*?refreshSectionNavigation/, "restoring or resizing must refresh section geometry under a monotonic epoch");
assert.match(i18n, /sectionNavigationTitle: "页面导航"[\s\S]*?sectionNavigationFailed:/, "section navigation host UI must use a user-facing navigation label");

function runtimeSection(name, nextName) {
  const start = htmlEditRuntime.indexOf(`  function ${name}`);
  const end = htmlEditRuntime.indexOf(`  function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} must be followed by ${nextName}`);
  return htmlEditRuntime.slice(start, end);
}

for (const marker of [
  "editableImageElements", "editableBackgroundImageElements", "pictureSources", "originalSrcsetHash",
  "applyPictureSources", "html_edit_asset_replace_requested", "html_edit_patch_field_result",
  "applyImportedAsset", "runtimeAssetUrls", "data-nutbook-asset-relative-path", "originalSrcHash", "sha256HexUtf8"
]) {
  assert.match(htmlEditRuntime, new RegExp(marker), `HTML image runtime must include ${marker}`);
}
const imageRequest = runtimeSection("requestImageReplacement", "imageActionIcon");
assert.match(imageRequest, /targetState/, "image replace requests must report target state");
assert.doesNotMatch(imageRequest, /currentSrc|FileReader/, "image replace requests must not leak URLs or read files");
const importedAsset = runtimeSection("applyImportedAsset", "canApplyPictureSources");
assert.doesNotMatch(importedAsset, /FileReader|clientX|clientY/, "imported assets must not use FileReader or free-coordinate insertion");
const runtimeSha256 = htmlEditRuntime.match(/async function sha256HexUtf8\(value\) \{([^\n]+)\}/);
assert.ok(runtimeSha256, "runtime must define a Web Crypto SHA-256 function");
const sha256HexUtf8 = new Function("crypto", "TextEncoder", `return async function sha256HexUtf8(value) {${runtimeSha256[1]}};`)(webcrypto, TextEncoder);
assert.equal(await sha256HexUtf8(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
assert.equal(await sha256HexUtf8("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
assert.match(htmlEditRuntime, /source\.getAttribute\("srcset"\)[\s\S]*?originalSrcsetHash: await sha256HexUtf8\(srcset\)/, "picture source hashes must use the raw HTML attribute, not a browser-resolved runtime URL");
assert.doesNotMatch(htmlEditRuntime, /originalSrcsetHash: await sha256HexUtf8\(source\.srcset\)/, "picture source hashes must survive a changed local-server origin");
assert.match(
  htmlEditRuntime,
  /function constrainImportedImageLayout\(element\) \{[\s\S]*?max-width[\s\S]*?object-fit/,
  "imported images must receive a runtime layout guard before their source is replaced"
);
assert.match(
  htmlEditRuntime,
  /function imageSlotHeight\(element\) \{[\s\S]*?Math\.min\(320, Math\.max\(120,/,
  "an empty image slot must retain a bounded display height rather than grow to the image's natural size"
);
assert.match(
  htmlEditRuntime,
  /function restoreImageBaseline\(element, baseline\) \{[\s\S]*?if \(baseline\.currentSrc\) element\.setAttribute\("src", baseline\.currentSrc\); else element\.removeAttribute\("src"\)/,
  "discarding an imported empty slot must restore its original missing src attribute"
);
assert.match(
  htmlEditRuntime,
  /function onImageEditClick\(event\) \{[\s\S]*?event\.target !== event\.currentTarget[\s\S]*?return/,
  "clicking or focusing a text field inside an editable background image must not reopen the image picker"
);
assert.match(
  htmlEditRuntime,
  /const pictureSources = baseline\.pictureSources\.map\([\s\S]*?if \(sourceChanged && pictureSources\.length\) change\.pictureSources = pictureSources;/,
  "ordinary images must omit pictureSources instead of persisting an invalid empty responsive-source set"
);
assert.match(
  htmlEditRuntime,
  /data-nutbook-plain-text-hint[\s\S]*?纯文本：不支持格式[\s\S]*?\[data-nutbook-editing="text"\]:focus::after/,
  "focusing a pure-text field must show an object-bound formatting limitation label instead of widening the toolbar"
);
assert.match(indexHtml, /assetRequestId[\s\S]*?assetRequestEpoch[\s\S]*?activeAssetRequestId/, "asset imports must retain request identity and epoch");
assert.match(indexHtml, /session\.assetRequestEpoch \+= 1[\s\S]*?invalidate_html_edit_session_lease/, "leaving a tab must invalidate pending image results before the lease");
assert.match(indexHtml, /open_html_edit_image_file_dialog[\s\S]*?import_html_edit_asset[\s\S]*?applyImportedAsset/, "host must pick, import, then apply an asset through the runtime");
for (const code of ["ASSET_INVALID_TYPE", "ASSET_TOO_LARGE", "INVALID_SESSION"]) {
  assert.match(indexHtml, new RegExp(code), `host must map ${code} to a recoverable image-import message`);
}
assert.match(indexHtml, /html_edit_patch_field_result[\s\S]*?picture_source_mismatch/, "host must surface a field-level picture source mismatch");
assert.match(indexHtml, /function htmlEditReadonlyPatchScript\(patch, runtimeAssetUrls, surfaceToken\)[\s\S]*?change\.type === 'image'[\s\S]*?runtimeAssetUrls\[change\.src\]/, "readonly replay must use only runtime URL mappings for image patches");
for (const marker of ["beginInsertedImageDraft", "commitInsertedImageDraft", "cancelInsertedImageDraft", "requestInsertedImageReplacement", "deleteInsertedImage", "deletedInsertedImageIds", "clampFrameToCanvas", "serializeFramePermille", "applyInsertedImageAsset", "insertedImageBaseline"]) {
  assert.match(htmlEditRuntime, new RegExp(marker), `Phase 1D runtime must include ${marker}`);
}
assert.match(htmlEditRuntime, /data-intent="insert-image-frame"/, "HTML toolbar must expose an insert-frame action in the runtime WebView");
assert.match(htmlEditRuntime, /document\.documentElement\.append\(host\)[\s\S]*?attachShadow\(\{ mode: "closed" \}\)/, "inserted frames must use a root-level closed shadow host");
assert.match(htmlEditRuntime, /html_edit_inserted_image_confirmed/, "picker must start only after explicit frame confirmation");
assert.match(htmlEditRuntime, /html_edit_inserted_image_replace_requested/, "inserted images must use a separate replace intent");
assert.match(htmlEditRuntime, /const materialized = current\.leftPermille != null \? \{ \.\.\.current, \.\.\.insertedFrameFromPermille\(current\) \} : current;[\s\S]*?serializeFramePermille\(materialized\)/, "replacing a reopened inserted image must retain its permille geometry");
assert.match(htmlEditRuntime, /STATE\.insertedImages\.size === 1\) selectInsertedImage\(STATE\.insertedImages\.keys\(\)\.next\(\)\.value\)/, "a single reopened inserted image must be selected for immediate handle access");
assert.match(indexHtml, /html_edit_inserted_image_confirmed[\s\S]*?open_html_edit_image_file_dialog[\s\S]*?applyInsertedImageAsset/, "host must pick, import, and apply confirmed frames");
assert.match(indexHtml, /html_edit_inserted_image_replace_requested/, "host must handle inserted-image replacement");
assert.match(indexHtml, /change\?\.type === "inserted-image" && change\.deleted === true[\s\S]*?delete merged\[fieldId\]/, "saving a deleted inserted image must remove it from the sidecar patch");
assert.match(indexHtml, /function layoutInsertedImages\(holder\)[\s\S]*?scroll\.scrollTop \|\| window\.scrollY[\s\S]*?document\.addEventListener\('scroll', holder\.layout, true\)/, "readonly inserted images must relayout from the actual scroll root after every document scroll");
assert.match(indexHtml, /holder\.scheduleLayout = function \(\) \{[\s\S]*?setTimeout\(holder\.layout, 260\)[\s\S]*?new ResizeObserver\(holder\.scheduleLayout\)[\s\S]*?image\.onload = holder\.scheduleLayout/, "readonly inserted images must settle after late page and image layout without requiring a scroll");
assert.match(htmlEditRuntime, /window\.__NUTBOOK_INSERTED_IMAGE_READONLY__\?\.dispose\?\.\(\)/, "entering edit mode must dispose the readonly inserted-image layer");
assert.match(indexHtml, /holder\.dispose = function \(\) \{[\s\S]*?document\.removeEventListener\('scroll', holder\.layout, true\)[\s\S]*?delete window\.__NUTBOOK_INSERTED_IMAGE_READONLY__/, "readonly inserted-image disposal must remove its scroll listener and layer");
assert.match(htmlEditRuntime, /document\.addEventListener\("scroll", STATE\.insertedImageScrollHandler, true\)/, "editing inserted images must relayout for document-level scrolling");
assert.match(htmlEditRuntime, /zIndex: "2147483645"[\s\S]*?\.bar\{position:fixed;z-index:2147483647/, "the editing toolbar must remain above the inserted-image canvas while scrolling");

assert.match(
  htmlEditRuntime,
  /function mountInlineToolbar\(/,
  "rich-text formatting must mount inside the runtime document"
);
assert.match(
  htmlEditRuntime,
  /attachShadow\(\{ mode: "closed" \}\)/,
  "the runtime toolbar must isolate its UI from the artifact page"
);
assert.match(
  htmlEditRuntime,
  /function toggleInlineMark\(field, range, tagName\)/,
  "bold and italic must use deterministic inline marks instead of browser editing commands"
);
assert.match(
  htmlEditRuntime,
  /function rangeExactlySelectsMark\(range, mark\)/,
  "repeating an inline format command must be able to recognize its exact mark selection"
);
assert.match(
  htmlEditRuntime,
  /function rangeSelectsEntireMarkText\(range, mark\)/,
  "repeating an inline format command must also recognize a text-node range covering a mark"
);
assert.match(
  htmlEditRuntime,
  /function unwrapInlineMark\(mark\)/,
  "repeating an inline format command must remove the existing mark instead of nesting it"
);
assert.match(
  htmlEditRuntime,
  /function replaceSelectedBlocks\(field, range, tagName\)/,
  "content formatting must replace only selected top-level text blocks"
);
assert.match(
  htmlEditRuntime,
  /function toggleList\(field, range, tagName\)/,
  "content formatting must transform only supported paragraph runs into lists"
);
const inlineFormat = htmlEditRuntime.match(/function applyInlineFormat\(command\) \{([\s\S]*?)\n  \}/);
assert.ok(inlineFormat, "the inline toolbar must own its format command path");
assert.doesNotMatch(
  inlineFormat[1],
  /document\.execCommand/,
  "the inline toolbar command path must not use browser editing commands"
);
assert.match(
  htmlEditRuntime,
  /function buildInlineToolbar\(\)/,
  "the inline toolbar must build a persistent command surface"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /function onSelectionChange\(\) \{[^}]*renderInlineToolbar\(\)/,
  "selection changes must not recreate the toolbar and invalidate its command target"
);
assert.match(
  htmlEditRuntime,
  /function syncInlineToolbar\(\)[\s\S]*?button\.hidden = false; button\.disabled = !commands\.has\(button\.dataset\.command\) \|\| !canFormat/,
  "selection changes must update existing command availability without recreating the toolbar"
);
assert.match(
  htmlEditRuntime,
  /if \(directLists\.length === 1 && selected\.length === 1\) \{[\s\S]*?list\.tagName === tagName\.toUpperCase\(\)[\s\S]*?document\.createElement\(tagName\)/,
  "a selected list must toggle off when unchanged and switch directly when another list type is requested"
);
assert.match(
  htmlEditRuntime,
  /function inlineCommandsForRole\(role\)/,
  "short and content fields must have explicit, distinct command sets"
);
assert.match(
  htmlEditRuntime,
  /button\.hidden = false; button\.disabled = !commands\.has\(button\.dataset\.command\) \|\| !canFormat;/,
  "the HTML toolbar must retain every format command and disable only commands unsupported by the current object"
);
assert.match(
  htmlEditRuntime,
  /\.bar button\[disabled\] \.tooltip\{display:none\}/,
  "disabled format commands must retain the existing no-tooltip behavior"
);
assert.match(
  htmlEditRuntime,
  /function inlineToolbarText\(key\)/,
  "the inline toolbar must localize its own labels inside the runtime document"
);
assert.match(
  htmlEditRuntime,
  /function inlineToolbarIcon\(command\)/,
  "the inline toolbar must use the established SVG command icon set"
);
assert.match(
  htmlEditRuntime,
  /M6 4h4\.3c2 0 3\.2 1 3\.2 2\.6/,
  "the inline bold icon must match the Markdown floating toolbar"
);
assert.match(
  htmlEditRuntime,
  /M4 4\.5h12M4 8h8\.5M4 11\.5h12M4 15h8\.5/,
  "the inline alignment icons must match the Markdown editor icon family"
);
assert.match(
  htmlEditRuntime,
  /paragraph: '<svg[^>]*><path d="M5 15V5h5\.2a3\.1 3\.1 0 0 1 0 6H5"/,
  "the paragraph icon must use the same compact stroke language as heading icons"
);
assert.match(
  htmlEditRuntime,
  /class="tooltip"/,
  "each HTML edit toolbar command must expose a visible hover and keyboard-focus tooltip"
);
assert.match(
  htmlEditRuntime,
  /transition:background .16s ease,transform .16s ease/,
  "HTML edit toolbar buttons must have the same responsive hover treatment as editor controls"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /\.commands\{[^}]*overflow-x:auto/,
  "the command group must not scroll and clip the tooltip layer"
);
assert.match(
  htmlEditRuntime,
  /\.commands\{[^}]*flex-wrap:wrap[^}]*overflow:visible/,
  "the command group must wrap on narrow screens while allowing tooltips to escape"
);
assert.match(
  htmlEditRuntime,
  /width:max-content/,
  "the inline toolbar must shrink to its visible command set"
);
assert.match(
  indexHtml,
  /function usesInlineHtmlEditToolbarForSession\(/,
  "inline sessions must bypass the legacy child-webview toolbar"
);
assert.match(
  indexHtml,
  /inlineToolbar: Boolean\(appState\.htmlEditSession\?\.runtimeSessionId === runtimeSessionId[\s\S]*?locale: appState\.language/,
  "the host must pass its current locale into the runtime toolbar"
);
assert.match(
  indexHtml,
  /function htmlEditLeaveConfirmBounds\(\) \{[\s\S]*?x: 0,[\s\S]*?y: 0,[\s\S]*?width: window\.innerWidth,[\s\S]*?height: window\.innerHeight/,
  "the leave-confirm child webview must cover the full runtime so its backdrop cannot form a small rectangular substrate"
);
assert.match(
  htmlEditRuntime,
  /function reportState\(options = \{\}\)[\s\S]*html_edit_state_snapshot/,
  "the runtime must be able to report a fresh state snapshot before a leave decision"
);
assert.match(
  indexHtml,
  /async function refreshHtmlEditRuntimeState\(session, minimumRevision = session\?\.documentRevision \?\? 0\)/,
  "the host must ask the runtime state source to refresh before treating a clean session as safe to leave"
);
assert.match(
  htmlEditLeaveConfirm,
  /backdrop-filter: blur\(10px\)/,
  "the native leave-confirm overlay must own its full-screen backdrop treatment"
);
assert.match(
  htmlEditLeaveConfirm,
  /__NUTBOOK_HTML_EDIT_LEAVE_READY__:/,
  "the leave-confirm child webview must report that its visible document is ready"
);
assert.match(
  runtimeOverlay,
  /els\.editButton\.addEventListener\("pointerdown", activateEditMode\);/,
  "HTML runtime edit must emit on pointerdown before an overlay bounds sync can swallow click"
);
assert.match(
  htmlEditRuntime,
  /button\.addEventListener\("pointerdown", \(event\) => \{ event\.preventDefault\(\); \}\);[\s\S]*?button\.addEventListener\("click", \(event\) => \{ event\.preventDefault\(\); (?:const applied = )?applyInlineFormat\(button\.dataset\.command\);/,
  "format commands must execute on click while pointerdown only preserves the runtime selection"
);
assert.match(
  htmlEditRuntime,
  /function buildInlineToolbar\(\)[\s\S]*?function syncInlineToolbar\(\)/,
  "the inline toolbar must be mounted once and updated in place instead of being rebuilt during selection changes"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /function applyFormat\(payload\)[\s\S]*?document\.execCommand/,
  "all inline formatting must use the one runtime-owned mutation path rather than a second execCommand implementation"
);
const updateChange = runtimeSection("updateChange(element)", "recomputeChanges()");
assert.doesNotMatch(
  updateChange,
  /normalizeRichTextField|richHtmlOf/,
  "reading document changes must not normalize or otherwise mutate the rich-text DOM"
);
const recomputeChanges = runtimeSection("recomputeChanges()", "collectChanges()");
assert.doesNotMatch(
  recomputeChanges,
  /normalizeRichTextField|richHtmlOf/,
  "recomputing changes must be a pure read"
);
assert.match(
  htmlEditRuntime,
  /function readRichValue\(element\) \{\s*return \{\s*html: element\.innerHTML,\s*textAlign: effectiveTextAlign\(element\)\s*\};\s*\}/,
  "rich-text reads must use a DOM-pure value helper"
);
assert.match(
  htmlEditRuntime,
  /function commitDocumentMutation\(field, mutate = null\) \{[\s\S]*?captureFieldSelectionBookmark\(field\)[\s\S]*?normalizeRichTextField\(field\)[\s\S]*?restoreFieldSelectionBookmark\(field, selectionBookmark\)[\s\S]*?recomputeChanges\(\)[\s\S]*?STATE\.documentRevision \+= 1;[\s\S]*?type: "html_edit_document_changed"/,
  "one document mutation must normalize once, restore its selection, and publish a revisioned snapshot"
);
assert.match(
  htmlEditRuntime,
  /function withRichFieldMutation\(field, mutate\) \{[\s\S]*?commitDocumentMutation\(field, mutate\)/,
  "format-only mutations must use the single document transaction"
);
for (const [handlerName, nextName] of [["onFocus(event)", "onBlur()"], ["onBlur()", "onSelectionChange()"], ["onSelectionChange()", "mountInlineToolbar()"]]) {
  const handler = runtimeSection(handlerName, nextName);
  assert.doesNotMatch(handler, /reportState|recomputeChanges|commitDocumentMutation|normalizeRichTextField/, `${handlerName} must only update runtime-local selection or toolbar state`);
}
for (const [handlerName, nextName] of [["onInput(event)", "updateChange(element)"], ["onCompositionEnd(event)", "onInput(event)"], ["onBeforeInput(event)", "restoreSavedSelection()"]]) {
  const handler = runtimeSection(handlerName, nextName);
  assert.match(handler, /commitDocumentMutation/, `${handlerName} must commit document changes through the single transaction`);
}
assert.match(
  htmlEditRuntime,
  /function stateSnapshot\(\) \{[\s\S]*?documentRevision: STATE\.documentRevision/,
  "every document snapshot must carry its revision"
);
assert.match(
  htmlEditRuntime,
  /function selectedDirectBlocks\(field, range\)[\s\S]*?Array\.from\(field\.children\)/,
  "block commands must resolve an explicit contiguous direct-child block set instead of expanding arbitrary descendants"
);
assert.match(
  htmlRuntimeRust,
  /runtime_type\s*\.map\(\|value\| value\.starts_with\("html_edit_"\)\)[\s\S]*?"runtime-title"[\s\S]*?"runtime-forward"/,
  "the host boundary must log every HTML edit runtime message, including done and snapshot requests"
);
assert.match(
  htmlEditRuntime,
  /function emitHostMessage\(payload\) \{[\s\S]*?itemId: STATE\.itemId[\s\S]*?runtimeSessionId: STATE\.sessionId[\s\S]*?generation: STATE\.generation[\s\S]*?invoke\("html_edit_runtime_message_command", \{ payload: message \}\)/,
  "runtime messages must use Tauri IPC with immutable item/session/generation identity so formatted HTML is never encoded in document.title"
);
assert.match(
  htmlEditRuntime,
  /function stableChangesJson\(value\)/,
  "the runtime must define a canonical rich-text change serializer"
);
assert.match(
  htmlEditRuntime,
  /saveOptions\.expectedDocumentRevision !== null && STATE\.documentRevision !== saveOptions\.expectedDocumentRevision/,
  "markSaved must reject a stale save acknowledgement after the runtime document advances"
);
assert.match(
  previewCommandsRust,
  /pub fn html_edit_runtime_message_command\([\s\S]*?window\.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__/,
  "the runtime IPC command must forward the full payload to the main WebView"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /messageQueue|messageInFlight|ackHostMessage/,
  "the runtime must not depend on an ACK queue after a title-change callback"
);
assert.doesNotMatch(
  htmlRuntimeRust,
  /ackHostMessage|runtime-ack/,
  "the host must forward title messages without evaluating an ACK back into the same callback"
);
assert.match(
  previewCommandsRust,
  /payload\.script\.contains\("\.reportState\("\)[\s\S]*?"state-refresh"[\s\S]*?payload\.script\.contains\("\.__NUTBOOK_HTML_EDIT__\.exit\("\)[\s\S]*?"leave"/,
  "runtime eval diagnostics must distinguish leave-state refreshes from actual editor exit requests"
);
assert.match(
  htmlEditRuntime,
  /(?:\[data-intent="done"\]\'\)|doneButton)\.addEventListener\("click", \(event\) => \{ event\.preventDefault\(\); emitHostMessage\(\{ type: "html_edit_done_requested_from_runtime", \.\.\.stateSnapshot\(\) \}\); \}\);/,
  "Done must report the already committed snapshot without recomputing or mutating the document"
);
assert.match(
  indexHtml,
  /function htmlEditRuntimeSnapshotScript\(runtimeSessionId, requestId\)[\s\S]*?window\.setTimeout\(function \(\) \{[\s\S]*?\.reportState\(\{ requestId:/,
  "leave-state refresh must run from the runtime event loop rather than re-entrantly inside native eval"
);
assert.match(
  indexHtml,
  /htmlEditRuntimeSnapshotScript[\s\S]*?runtimeSnapshotMissing:[\s\S]*?if \(data\.runtimeSnapshotMissing\) \{[\s\S]*?resolveStateRefresh\(false, -1\);/,
  "a missing runtime object must be reported explicitly so leave diagnostics do not confuse it with a clean snapshot"
);
assert.match(
  previewCommandsRust,
  /payload\.script\.contains\("\.reportState\("\)[\s\S]*?"state-refresh"/,
  "runtime eval diagnostics must identify queued snapshot requests"
);
assert.match(
  indexHtml,
  /async function confirmHtmlEditLeaveIfNeeded\(tabId = appState\.activeTabId, options = \{\}\) \{[\s\S]*?if \(!htmlEditLeaveRequiresSave\(session\)\)/,
  "leave must decide from the latest accepted transaction snapshot rather than blocking on an unreliable child-webview pull refresh"
);
assert.doesNotMatch(
  indexHtml.match(/async function confirmHtmlEditLeaveIfNeeded\([\s\S]*?\n      \}/)?.[0] || "",
  /refreshHtmlEditRuntimeState/,
  "close-tab and Done leave paths must not be locked by an extra runtime refresh"
);
assert.match(
  mainRust,
  /RunEvent::WindowEvent\s*\{[\s\S]*?WindowEvent::CloseRequested\s*\{\s*api,[\s\S]*?api\.prevent_close\(\)/,
  "native main-window close must wait for the HTML edit leave decision"
);
assert.match(
  mainRust,
  /RunEvent::ExitRequested\s*\{\s*api,[\s\S]*?api\.prevent_exit\(\)/,
  "native application quit must wait for the HTML edit leave decision"
);
assert.match(
  indexHtml,
  /async function confirmAppExitIfNeeded\(\)[\s\S]*?confirmHtmlEditLeaveIfNeeded\(session\.itemId, \{ source: "app-exit" \}\)[\s\S]*?confirmMarkdownAppExitIfNeeded\(\)[\s\S]*?__NUTBOOK_REQUEST_APP_EXIT__[\s\S]*?invoke\("finalize_html_edit_app_exit_command"\)/,
  "the app-close bridge must resolve HTML and Markdown leave state before it finalizes native exit"
);
assert.match(
  indexHtml,
  /async function confirmMarkdownAppExitIfNeeded\(\)[\s\S]*?captureActiveMarkdownDraft\(\)[\s\S]*?orderedDirtyTabs[\s\S]*?for \(const tab of orderedDirtyTabs\)[\s\S]*?confirmMarkdownUnsavedClose\(fileName\)[\s\S]*?if \(choice === "continue"\) return false[\s\S]*?saveMarkdownTab\(tab, \{ renderAfter: false \}\)/,
  "application exit must serially protect every dirty Markdown tab and stop on cancel or save failure"
);
assert.match(
  indexHtml.match(/async function saveActiveHtmlEditPatch\(\) \{[\s\S]*?\n      \}/)?.[0] || "",
  /await refreshHtmlEditRuntimeState\(session, session\.documentRevision\)/,
  "save must refresh the child runtime before it decides a newly imported image is clean"
);
assert.match(
  indexHtml,
  /function htmlEditLeaveRequiresSave\(session\) \{\s*return Boolean\(session\?\.dirty \|\| session\?\.requiresPatchReconciliation\);/,
  "a clean DOM with an older persisted patch must still follow the save-or-discard leave path"
);
assert.match(
  indexHtml,
  /const candidatePersistedChanges = mergeHtmlEditPatchChanges\(session\.persistedChanges, session\.changes\);[\s\S]*?const changesForSave = candidatePersistedChanges;[\s\S]*?commit_html_edit[\s\S]*?changes: changesForSave/,
  "every source commit must send the full canonical snapshot rather than erase untouched persisted fields"
);

assert.doesNotMatch(
  indexHtml,
  /html_edit_format_applied/,
  "format diagnostics must never be able to overwrite the canonical document state"
);
assert.match(
  htmlEditToolbar,
  /selectedDataId[\s\S]*?formatState/,
  "temporary toolbar diagnostics must carry the selected field and format role in its title payload"
);

const filesystemSync = indexHtml.match(/async function maybeSyncFilesystemState\(force = false\) \{([\s\S]*?)\n      \}/);
assert.ok(filesystemSync, "filesystem sync function should exist");
assert.doesNotMatch(
  filesystemSync[1],
  /await loadLibraries\(\)/,
  "filesystem sync must not await loadLibraries and recursively await itself"
);
assert.match(
  indexHtml,
  /if \(appState\.activeLibraryId && !isLibraryPathMissing\(appState\.activeLibraryId\)\) \{\n          await scanLibrary\(\{ silent: true \}\);/,
  "boot should not scan an invalid library path after filesystem sync"
);
assert.match(
  indexHtml,
  /-webkit-line-clamp:\s*2;/,
  "file-card names should be clamped to two lines"
);
const gridItemMainRule = indexHtml.match(/\.main-shell\.home-mode \.item-main \{([^}]+)\}/);
assert.ok(gridItemMainRule, "grid file-card body rule should exist");
const gridItemMainMinHeight = gridItemMainRule[1].match(/min-height:\s*(\d+)px;/);
assert.ok(gridItemMainMinHeight, "grid file-card body should have an explicit min-height");
assert.ok(
  Number(gridItemMainMinHeight[1]) >= 44,
  "grid file-card body must have min-height 44px"
);
const gridItemMainPadding = gridItemMainRule[1].match(/padding:\s*8px\s+12px;/);
assert.ok(gridItemMainPadding, "grid file-card body should have padding 8px 12px");
assert.match(
  indexHtml,
  /\.main-shell\.home-mode \.item-card-title \{[^}]*font-size:\s*12px;[^}]*line-height:\s*1\.4;/,
  "file-card title should have font-size 12px line-height 1.4"
);
assert.match(
  indexHtml,
  /\.main-shell\.home-mode \.item-card \{[^}]*min-height:\s*188px;/,
  "grid file-card should have min-height 188px to prevent descender clipping"
);
for (const updater of [
  "updateInsertMenu",
  "updateFormatToolbar",
  "updateTableToolbar",
  "updateCodeLanguageControls"
]) {
  assert.match(
    markdownEditor,
    new RegExp(`function ${updater}\\(\\) \\{[\\s\\S]*?if \\([^\\n]*isEditorComposing\\(\\)\\) return;`),
    `${updater} must not mutate editor-adjacent DOM while IME composition is active`
  );
}
assert.match(
  indexHtml,
  /window\.addEventListener\("keydown", \(event\) => \{\n        if \(event\.isComposing \|\| event\.key === "Process"\) return;/,
  "global keyboard shortcuts must ignore IME composition"
);
assert.match(
  indexHtml,
  /const isMarkdownEditorKeyEvent = Boolean\(event\.target\?\.closest\?\.\("\.milkdown-editor-root \.ProseMirror"\)\);[\s\S]*?if \(isMarkdownEditorKeyEvent\) return;[\s\S]*?const altKeyChanged = appState\.altKeyPressed !== event\.altKey;[\s\S]*?appState\.altKeyPressed = event\.altKey;[\s\S]*?viewerToolbarState\(\);[\s\S]*?if \(altKeyChanged && appState\.homeTabOpen && !getActiveTab\(\)\) \{[\s\S]*?renderItems\(\);/,
  "global keyboard shortcuts must only re-render the item list when the Alt state actually changes, never on every keystroke"
);
assert.match(
  markdownEditor,
  /function splitSkillFrontmatterForEditor\(markdown = ""\)/,
  "Milkdown editor should split leading SKILL frontmatter before parsing"
);
assert.match(
  markdownEditor,
  /ctx\.set\(defaultValueCtx, editorMarkdown\);/,
  "Milkdown default value should receive markdown body without frontmatter"
);
assert.match(
  markdownEditor,
  /data-frontmatter-field="description"/,
  "SKILL frontmatter panel should expose editable description field"
);
assert.match(
  markdownEditor,
  /serializeSkillFrontmatterForEditor\(skillFrontmatter\)/,
  "Milkdown serialization should use the editable SKILL frontmatter state"
);
assert.match(
  markdownEditor,
  /function extractSkillTriggersFromDescription\(description = ""\)/,
  "SKILL editor should recognize legacy Triggers text inside description"
);
assert.match(
  markdownEditor,
  /function cleanSkillDescription\(description = ""\)/,
  "SKILL editor should not duplicate Triggers text inside description"
);

const htmlEditLeaveOverlay = indexHtml.match(/async function showHtmlEditLeaveConfirmOverlay\(session\) \{([\s\S]*?)\n      \}/);
assert.ok(htmlEditLeaveOverlay, "HTML edit leave overlay flow should exist");
assert.match(
  htmlEditLeaveOverlay[1],
  /await invoke\("attach_html_edit_leave_confirm_overlay_command"/,
  "HTML edit leave flow must use the established child-overlay attachment path"
);
assert.match(
  htmlEditLeaveOverlay[1],
  /payload:\s*\{\s*itemId:\s*session\.itemId,/,
  "HTML edit leave flow must pass the named Rust payload argument"
);
assert.match(
  htmlEditLeaveOverlay[1],
  /throw error;/,
  "HTML edit leave flow must leave editing active and report a child-overlay attachment failure"
);
assert.match(
  indexHtml,
  /document\.addEventListener\("visibilitychange", \(\) => \{\n          if \(appState\.htmlEditLeavePromptOpen\) return;/,
  "focus changes while the independent leave overlay is open must not suspend the runtime beneath it"
);
assert.match(
  indexHtml,
  /window\.addEventListener\("focus", \(\) => \{[\s\S]*?if \(!document\.hidden\) \{[\s\S]*?scheduleRuntimeHostSync\(\);[\s\S]*?refreshHtmlEditSectionNavigation\(\);/,
  "restoring a macOS window must re-sync the child runtime and section geometry after the host regains focus"
);
assert.match(
  indexHtml,
  /window\.addEventListener\("resize", \(\) => \{[\s\S]*?if \(!document\.hidden\) \{[\s\S]*?scheduleRuntimeHostSync\(\);[\s\S]*?refreshHtmlEditSectionNavigation\(\);/,
  "a restored host layout must re-sync child runtime bounds and section geometry after resize"
);

const runtimeHostSync = indexHtml.match(/async function syncActiveRuntimeHost\(runId = null\) \{([\s\S]*?)\n      \}/);
assert.ok(runtimeHostSync, "runtime host synchronization should exist");
assert.doesNotMatch(
  runtimeHostSync[1],
  /attach_html_edit_leave_confirm_overlay_command/,
  "only the leave-intent coordinator may attach the HTML edit confirmation overlay"
);

const runtimeSuspend = indexHtml.match(/async function suspendRuntimeSurfaces\(\) \{([\s\S]*?)\n      \}/);
assert.ok(runtimeSuspend, "runtime surface suspension should exist");
assert.match(
  runtimeSuspend[1],
  /appState\.activeRuntimeHostId = null;\n        appState\.runtimeHostLastBoundsKey = null;/,
  "suspending runtime surfaces must invalidate the hidden host cache"
);
const runtimeResume = indexHtml.match(/async function resumeRuntimeSurfaces\(\) \{([\s\S]*?)\n      \}/);
assert.ok(runtimeResume, "runtime surface resume should be asynchronous");
assert.match(
  runtimeResume[1],
  /const suspendPromise = appState\.runtimeSurfaceSuspendPromise;[\s\S]*await suspendPromise;/,
  "runtime resume must wait for the previous hide IPC before reattaching the active host"
);
assert.match(
  indexHtml,
  /async function hideStaleRuntimeHostSync\(runId, itemId\) \{[\s\S]*await hideRuntimeSessionSurfaces\(itemId, \{ force: true, token \}\);/,
  "a stale host attach must be explicitly hidden after its IPC completes"
);
assert.match(
  runtimeHostSync[1],
  /await invoke\("attach_html_runtime_host_command", \{[\s\S]*?\n          if \(await hideStaleRuntimeHostSync\(runId, tab\.id\)\) return;/,
  "host attach must clean up if the active runtime changed while IPC was in flight"
);
const htmlEditExit = indexHtml.match(/async function exitHtmlEditMode\(itemOrOptions = \{\}\) \{([\s\S]*?)\n      \}/);
assert.ok(htmlEditExit, "HTML edit exit flow should exist");
assert.match(
  htmlEditExit[1],
  /appState\.htmlEditToolbarVisible = false;[\s\S]*runtimePatchAppliedKeys\.delete\(itemId\);[\s\S]*await applyHtmlEditPatchToRuntime\(itemId\)[\s\S]*refocusActiveRuntimeHost\(itemId\);/,
  "leaving HTML edit mode must recreate the removed readonly image layer before returning focus"
);

assert.match(i18n, /leavePrompt: "有未保存的修改"/, "Chinese leave-confirm title must be translated");
assert.match(i18n, /leavePrompt: "Unsaved changes"/, "English leave-confirm title must be translated");
assert.match(i18n, /discardAndExit: "不保存退出"/, "Chinese leave-confirm discard action must be translated");
assert.match(i18n, /discardAndExit: "Discard and Exit"/, "English leave-confirm discard action must be translated");
assert.match(htmlEditLeaveConfirm, /width: min\(424px, calc\(100vw - 16px\)\);/, "leave-confirm card must use the wider host bounds");
assert.match(htmlEditLeaveConfirm, /\.actions \{[\s\S]*flex-wrap: wrap;/, "leave-confirm actions must wrap instead of overflowing on narrow windows");

assert.match(
  htmlEditRuntime,
  /function editableRichTextElements\(\)[\s\S]*?isRichEditRole\(editRoleOf\(element\)\)/,
  "HTML edit runtime must identify rich fields from their role rather than a second conflicting attribute"
);
assert.match(
  htmlEditRuntime,
  /function editRoleOf\(element\)[\s\S]*?getAttribute\("data-edit-role"\)/,
  "HTML edit runtime must read each field's explicit edit role"
);
assert.match(
  htmlEditRuntime,
  /SHORT_FORMAT_COMMANDS[\s\S]*?"bold"[\s\S]*?"italic"[\s\S]*?"align-left"[\s\S]*?"align-center"[\s\S]*?"align-right"/,
  "short fields must expose only emphasis and alignment commands"
);
assert.match(
  htmlEditRuntime,
  /function applyInlineFormat\(command\)[\s\S]*?role === "short" \? SHORT_FORMAT_COMMANDS : VALID_FORMAT_COMMANDS\)\.has\(command\)\) return false/,
  "short fields must reject block and list commands before mutation"
);
assert.match(
  htmlEditRuntime,
  /function normalizeShortRichTextField\(field\)[\s\S]*?ALLOWED_SHORT_RICH_TAGS/,
  "short fields must normalize away block and list structure"
);
assert.match(
  htmlEditRuntime,
  /data-nutbook-edit-role-label[\s\S]*?data-nutbook-editing="rich-text"[\s\S]*?outline:/,
  "editing fields must expose a visible nontechnical role label and shared edit affordance"
);
assert.match(
  htmlEditRuntime,
  /editRole: role/,
  "HTML edit patches must retain the field role for role-aware persistence"
);
assert.match(
  htmlEditRuntime,
  /const patchRole = change\.editRole \|\| "content"[\s\S]*?patchRole === role/,
  "legacy role-less rich patches must remain content-only while new patches are role-bound"
);
assert.match(richTextFixture, /data-id="article-title"[^>]*data-edit-role="short"|data-edit-role="short"[^>]*data-id="article-title"/, "acceptance fixture must expose a short rich title");
assert.match(richTextFixture, /data-id="article-body"[^>]*data-edit-role="content"|data-edit-role="content"[^>]*data-id="article-body"/, "acceptance fixture must expose a content rich body");
assert.match(richTextFixture, /<button[^>]*data-edit-role="short"[^>]*data-id="article-action"/, "acceptance fixture must expose a short rich button");
assert.match(
  htmlEditRuntime,
  /element\.setAttribute\("contenteditable", type === "rich-text" \? "true" : "plaintext-only"\);/,
  "plaintext and rich-text fields must use distinct contenteditable modes"
);
assert.match(
  htmlEditRuntime,
  /STATE\.savedSelection[\s\S]*?cloneRange\(\)[\s\S]*?sameRichTextField/,
  "only a cloned selection within one rich-text field may be retained for formatting"
);
assert.match(
  htmlEditRuntime,
  /function onBlur\(\) \{ syncInlineToolbar\(\); \}/,
  "blur should update only the runtime toolbar without publishing document state"
);
assert.match(
  htmlEditRuntime,
  /function applyFormat\(payload\)[\s\S]*?runtimeSessionId !== STATE\.sessionId[\s\S]*?VALID_FORMAT_COMMANDS[\s\S]*?applyInlineFormat/,
  "format commands must be session-scoped, restore runtime-owned selection, and be allowlisted"
);
assert.match(
  htmlEditRuntime,
  /function withRichFieldMutation\(field, mutate\) \{ return commitDocumentMutation\(field, mutate\); \}/,
  "semantic bold and block formatting must use the canonical runtime-owned mutation transaction"
);
assert.match(
  htmlEditRuntime,
  /function selectedDirectBlocks\(field, range\)[\s\S]*?function setInlineBlockAlignment\(field, range, align\)[\s\S]*?block\.setAttribute\("style", `text-align:\$\{align\}`\)[\s\S]*?setInlineBlockAlignment\(field, range, command\.slice\(6\)\)/,
  "content alignment must apply to the selected block range instead of the entire rich-text field"
);
assert.match(
  htmlEditRuntime,
  /function isAllowedRichAlignmentAttribute\(node, role\)[\s\S]*?\["text-align:left", "text-align:center", "text-align:right"\][\s\S]*?node\.setAttribute\("style", `text-align:\$\{alignment\}`\)/,
  "runtime rich-text normalization must preserve only canonical block alignment styles"
);
assert.match(
  htmlEditRuntime,
  /function computeFormatState\(field, range\)[\s\S]*?editRole:\s*editRoleOf\(field\)/,
  "runtime format state must report the selected field role to the host"
);
assert.match(
  htmlEditRuntime,
  /function computeFormatState\(field, range\)[\s\S]*?canFormat:\s*isRichEditRole\(editRoleOf\(field\)\)[\s\S]*?editRole:\s*editRoleOf\(field\)/,
  "placing a caret in rich text must enable the commands that work without a text range"
);
assert.match(
  htmlEditRuntime,
  /function updateSavedSelection\(\)[\s\S]*?STATE\.formatState = computeFormatState\(field, range\);/,
  "a restored rich-text selection must publish its field role and formatting state to the toolbar"
);
assert.match(
  htmlEditRuntime,
  /function updateSavedSelection\(\)[\s\S]*?if \(!field\) return;/,
  "switching to the child toolbar must retain the runtime-owned selection until formatting restores it"
);
assert.match(
  htmlEditRuntime,
  /outline:2px dashed #c5bbbb;outline-offset:3px;border-radius:8px;cursor:text;position:relative.*outline-color:#a99f9f.*outline-color:currentColor;box-shadow:0 4px 12px/,
  "editing affordances must preserve source colors while using a monochrome dashed outline and inherited focus color"
);
assert.match(
  indexHtml,
  /function waitForHtmlRuntimeOverlayPriority[\s\S]*?runtimeHostSyncInFlight[\s\S]*?runtimeHostSyncFrame[\s\S]*?runtimeHostSyncPending[\s\S]*?function showHtmlEditCreateCopyConfirmOverlay[\s\S]*?waitForHtmlRuntimeOverlayPriority[\s\S]*?attach_html_edit_leave_confirm_overlay_command/,
  "create-copy confirmation must wait for child WebView synchronization before attaching the full-window host overlay"
);
const overlayPrioritySection = indexHtml.match(
  /async function waitForHtmlRuntimeOverlayPriority\(itemId\) \{([\s\S]*?)\n      \}/
);
assert.ok(overlayPrioritySection, "runtime overlay priority coordinator must exist");
assert.doesNotMatch(
  overlayPrioritySection[1],
  /hideRuntimeSessionSurfaces|setRuntimeHostVisibility/,
  "blocking overlays must preserve the visible HTML page behind the confirmation scrim"
);
assert.match(
  indexHtml,
  /function waitForHtmlEditableRuntimeDocument\(itemId, runtimeSessionId, generation, isCurrent\)[\s\S]*?document\.readyState !== "complete"[\s\S]*?\[data-editable\]\[data-id\][\s\S]*?html_edit_runtime_document_ready[\s\S]*?runtimeSessionId[\s\S]*?generation/,
  "fresh editable copies must complete a real document and protocol readiness handshake before runtime injection"
);
assert.match(
  indexHtml,
  /create-copy-choice[\s\S]*?htmlEditCreateCopyPromptItemId !== itemId[\s\S]*?getActiveTab\(\)\?\.id !== itemId[\s\S]*?await closeHtmlEditLeaveConfirmOverlay\(itemId\)[\s\S]*?getActiveTab\(\)\?\.id !== itemId[\s\S]*?createEditableCopyForActiveHtml\(itemId\)/,
  "late create-copy overlay actions must be rejected before and after closing the prompt"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /\[data-nutbook-editing\]::after|#2d76ff|rgba\(45,118,255/,
  "editing affordances must not inject blue styling or a pseudo-element role label"
);
assert.match(
  indexHtml,
  /function acceptHtmlEditDocumentSnapshot\(session, data\)[\s\S]*?data\.formatState && typeof data\.formatState === "object"\) session\.formatState = data\.formatState[\s\S]*?function defaultHtmlEditToolbarFormatState\(\)[\s\S]*?editRole:\s*"plain"/,
  "host HTML edit sessions must preserve the runtime field role through canonical snapshots"
);
assert.match(
  htmlEditToolbar,
  /const SHORT_FORMAT_COMMANDS = new Set\(\["bold", "italic", "align-left", "align-center", "align-right"\]\);[\s\S]*?function activeEditRole\(\)[\s\S]*?editRole === "short"/,
  "toolbar must select the short-text command allowlist from format state"
);
assert.match(
  htmlEditToolbar,
  /\.format-commands button\[hidden\], \.format-divider\[hidden\] \{ display: none; \}/,
  "hidden short-text commands must be visually removed even though toolbar buttons use inline-flex"
);
assert.match(
  htmlEditToolbar,
  /:root\[data-edit-role="short"\] \.toolbar \{ width: min\(352px,[\s\S]*?document\.documentElement\.dataset\.editRole = editRole;/,
  "toolbar island width must visibly contract for short-text editing without relying on delayed child-webview resizing"
);
assert.match(
  htmlEditToolbar,
  /formatCommands\.hidden = !isRichTextRole;[\s\S]*?textEditingState\.hidden = isRichTextRole/,
  "plain-text editing must replace formatting commands with an editing-state label"
);
assert.match(i18n, /textEditing: "文本编辑"/, "Chinese plain-text toolbar state must be translated");
assert.match(i18n, /textEditing: "Text editing"/, "English plain-text toolbar state must be translated");
assert.match(htmlEditToolbar, /\.\/i18n\.js\?v=20260715-html-edit-roles/, "toolbar must reload its i18n bundle when role state copy changes");
assert.match(
  htmlEditRuntime,
  /document\.addEventListener\("selectionchange", onSelectionChange, true\);[\s\S]*?document\.addEventListener\("beforeinput", onBeforeInput, true\);/,
  "rich editing must track selection and intercept paste before DOM insertion"
);
assert.match(
  htmlEditRuntime,
  /function onBeforeInput\(event\)[\s\S]*?event\.inputType !== "insertFromPaste" && event\.inputType !== "insertFromDrop"[\s\S]*?event\.inputType === "insertFromDrop"[\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.inputType !== "insertFromPaste"/,
  "drops must always be blocked while paste is allowed only through the rich-text plaintext path"
);
assert.match(
  htmlEditRuntime,
  /range\.insertNode\(textNode\)[\s\S]*?caret\.setStartAfter\(textNode\)[\s\S]*?caret\.collapse\(true\)[\s\S]*?selection\.addRange\(caret\)/,
  "rich plaintext paste must leave the caret after the inserted text"
);
assert.match(
  htmlEditRuntime,
  /const selection = window\.getSelection\(\);[\s\S]*?const range = selection\?\.rangeCount \? selection\.getRangeAt\(0\) : null;/,
  "rich paste must use one declared selection instance for both range replacement and caret restoration"
);
assert.match(
  htmlEditRuntime,
  /function onCompositionStart\(\) \{ STATE\.composing = true; \}[\s\S]*?function onCompositionEnd\(event\) \{ STATE\.composing = false; commitDocumentMutation\(event\.currentTarget\); \}[\s\S]*?function onInput\(event\) \{[\s\S]*?if \(STATE\.composing\) return;/,
  "plain and rich IME composition must defer their one document transaction until composition ends"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /skipNextRichInput/,
  "IME completion must not leave a flag that can swallow the next ordinary input event"
);
assert.match(
  htmlEditRuntime,
  /function richBaselineOf\(element\) \{ return readRichValue\(element\); \}/,
  "rich baselines must include canonical HTML and effective alignment"
);
assert.match(
  htmlEditRuntime,
  /change\.textAlign \? normalizeTextAlign\(change\.textAlign\) : baseline\.textAlign/,
  "replaying a rich patch without alignment must reset to the saved rich baseline instead of leaving stale inline alignment"
);
assert.match(
  htmlEditRuntime,
  /selection\.addRange\(saved\.range\.cloneRange\(\)\)[\s\S]*?sameRichTextField\(selection\.getRangeAt\(0\)\)/,
  "saved range must be cloned, attached, and then revalidated before formatting"
);
assert.match(
  htmlEditRuntime,
  /getComputedStyle\(blockElement \|\| field\)\.textAlign/,
  "format state must report the selected block's effective text alignment instead of the entire rich-text field"
);
assert.match(
  htmlEditRuntime,
  /block: blockTag === "p" \? "paragraph" : `heading-\$\{blockTag\.slice\(1\)\}`[\s\S]*?list: listTag === "ul" \? "unordered-list" : listTag === "ol" \? "ordered-list" : null/,
  "format state must use the same heading and list command values accepted by the formatter"
);
assert.match(
  htmlEditRuntime,
  /type: "rich_text"[\s\S]*?innerHTML[\s\S]*?normalizeRichTextField/,
  "rich-text patches must preserve validated canonical HTML"
);
assert.match(
  indexHtml,
  /function htmlEditReadonlyPatchScript\(patch, runtimeAssetUrls, surfaceToken\) \{[\s\S]*?change\.type === 'text'[\s\S]*?element\.textContent[\s\S]*?change\.type === 'rich_text'[\s\S]*?element\.innerHTML/,
  "readonly runtime patching must keep text and validated rich-text fields separate"
);
assert.match(
  indexHtml,
  /runtimePatchSurfaceLanes\.get\(itemId\)[\s\S]*?runtimePatchAppliedKeys\.get\(itemId\)[\s\S]*?patchRevision/,
  "readonly patches must serialize each item's revisions so an old response cannot overwrite a newer patch"
);
assert.match(
  indexHtml,
  /function isRuntimePatchSurfaceCurrent\(itemId, generation, surfaceToken\)[\s\S]*?htmlEditSessionGeneration/,
  "readonly patch replay must guard against an edit-session generation becoming active mid-flight"
);
assert.match(
  indexHtml,
  /const surfaceToken = currentRuntimeSurfaceToken\(itemId\);[\s\S]*?isRuntimePatchSurfaceCurrent\(itemId, generation, surfaceToken\)[\s\S]*?await invoke\("get_html_edit_patch"[\s\S]*?isRuntimePatchSurfaceCurrent\(itemId, generation, surfaceToken\)[\s\S]*?await invoke\("eval_html_runtime_script_command"[\s\S]*?isRuntimePatchSurfaceCurrent\(itemId, generation, surfaceToken\)/,
  "readonly replay must reject stale same-item work when its runtime surface token changes during fetch or eval"
);
const closeHtmlRuntime = indexHtml.match(/async function closeOpenTab\(tabId\) \{([\s\S]*?)\n      \}/);
assert.ok(closeHtmlRuntime, "HTML runtime close flow should exist");
assert.doesNotMatch(
  closeHtmlRuntime[1],
  /runtimeSurfaceTokens\.delete\(tabId\)/,
  "closing an HTML runtime must not reset its per-item surface token"
);
const markdownCloseConfirmation = indexFunctionSection("confirmMarkdownUnsavedClose", "closeSettingsPanel");
const closeOpenTab = indexFunctionSection("closeOpenTab", "setSidebarCollapsed");
for (const key of ["markdown.saveAndClose", "markdown.discardAndClose", "markdown.continueEditing"]) {
  assert.match(markdownCloseConfirmation, new RegExp(key.replaceAll(".", "\\.")), `unsaved Markdown close confirmation must expose ${key}`);
}
assert.match(
  markdownCloseConfirmation,
  /event\.key === "Escape"[\s\S]*?close\("continue"\)/,
  "Escape from the unsaved Markdown confirmation must preserve the editor"
);
assert.match(
  closeOpenTab,
  /confirmMarkdownUnsavedClose[\s\S]*?closeChoice === "continue"\) return false[\s\S]*?closeChoice === "save"[\s\S]*?saveMarkdownTab\(tab[\s\S]*?return true/,
  "closing a dirty Markdown tab must keep the tab open, discard it, or save it according to the explicit three-way decision"
);
assert.match(
  indexHtml,
  /const closed = await closeOpenTab\(tabId\);[\s\S]*?if \(!closed\) return;[\s\S]*?renderTabs\(\);[\s\S]*?const tabsToClose = getOpenTabs\(\);[\s\S]*?if \(!closed\) break;/,
  "callers must not rerender a continued-editing tab or keep bulk-closing after the user cancels"
);
assert.match(
  indexHtml,
  /function captureActiveMarkdownDraft\(\)[\s\S]*?tab\.draft = currentMarkdownContent\(tab\)[\s\S]*?const baseline = tab\.markdownBaseline \?\? tab\.preview\.raw \?\? "";[\s\S]*?tab\.isDirty = tab\.draft !== baseline/,
  "the close path must compare the normalized live editor value with its baseline so undo-to-baseline does not trigger a false warning"
);
assert.match(
  itemCommandsRust,
  /fn get_item_detail_impl[\s\S]*?file_type != "markdown"[\s\S]*?fs::read_to_string\(path\)[\s\S]*?content_hash\(&raw\)[\s\S]*?update_markdown_item_content[\s\S]*?state\.get_item_detail\(item_id\)/,
  "opening one Markdown item must refresh its disk content and hash before the editor establishes a save baseline"
);
assert.match(
  indexHtml,
  /function markdownSaveConflict[\s\S]*?EDIT_CONFLICT[\s\S]*?function markdownSaveErrorStatus[\s\S]*?markdown\.saveConflict[\s\S]*?showToast\(conflict \? t\("markdown\.saveConflictToast"\) : t\("markdown\.saveFailed"\)\)/,
  "a true Markdown edit conflict must preserve the draft and explain the recovery instead of reporting only a generic save failure"
);
assert.match(
  indexHtml,
  /function nextRuntimeSurfaceToken\(itemId\) \{[\s\S]*?runtimeSurfaceTokens\.get\(itemId\) \|\| 0\) \+ 1/,
  "reopened runtime surfaces must receive a monotonic per-item token"
);
assert.match(
  indexHtml,
  /data-nutbook-original-text-align[\s\S]*?change\.textAlign \|\| baselineTextAlign/,
  "readonly replay must retain an original alignment baseline when a newer patch clears alignment"
);
assert.match(
  indexHtml,
  /function htmlEditReadonlyPatchScript\(patch, runtimeAssetUrls, surfaceToken\)[\s\S]*?__NUTBOOK_HTML_PATCH_SURFACE_TOKEN__[\s\S]*?function isCurrentSurface\(\)[\s\S]*?isCurrentSurface\(\)[\s\S]*?setTimeout/,
  "readonly injected retries must recheck their surface token before every deferred mutation"
);
assert.match(
  indexHtml,
  /function syncHtmlEditReadonlyPatchSurfaceToken\(itemId, surfaceToken\)[\s\S]*?writeHtmlEditReadonlyPatchSurfaceToken/,
  "surface-token invalidation must be visible inside the child runtime"
);
assert.match(
  indexHtml,
  /runtimePatchSurfaceLanes: new Map\(\)/,
  "surface-token IPC writes must be serialized per runtime item"
);
assert.match(
  indexHtml,
  /function enqueueHtmlEditReadonlyPatchSurfaceLane\(itemId, work\)[\s\S]*?runtimePatchSurfaceLanes\.get\(itemId\)[\s\S]*?previous\.catch\(\(\) => \{\}\)\.then\(work\)[\s\S]*?runtimePatchSurfaceLanes\.set\(itemId, lane\)/,
  "surface-token IPC writes must run in per-item order"
);
assert.match(
  indexHtml,
  /existingSurfaceToken[\s\S]*?nextSurfaceToken >= existingSurfaceToken[\s\S]*?__NUTBOOK_HTML_PATCH_SURFACE_TOKEN__ = nextSurfaceToken/,
  "child runtime must refuse an out-of-order older surface token"
);
assert.match(
  indexHtml,
  /async function markRuntimeSurfaceActive\(itemId\)[\s\S]*?await syncHtmlEditReadonlyPatchSurfaceToken[\s\S]*?await markRuntimeSurfaceActive\(tab\.id\)/,
  "active surface transitions must await runtime-visible token invalidation"
);
for (const transition of ["hideStaleRuntimeHostSync", "suspendRuntimeSurfaces", "scheduleRuntimeSurfaceHide", "hideInactiveRuntimeHosts"]) {
  const transitionBody = indexHtml.match(new RegExp(`(?:async )?function ${transition}\\([^)]*\\) \\{([\\s\\S]*?)\\n      \\}`));
  assert.ok(transitionBody, `${transition} should exist`);
  assert.match(
    transitionBody[1],
    /await syncHtmlEditReadonlyPatchSurfaceToken/,
    `${transition} must await runtime-visible token invalidation before hiding a surface`
  );
}
assert.match(
  indexHtml,
  /function htmlEditReadonlyPatchScript\(patch, runtimeAssetUrls, surfaceToken\)[\s\S]*?existingSurfaceToken[\s\S]*?incomingSurfaceToken[\s\S]*?incomingSurfaceToken >= existingSurfaceToken[\s\S]*?__NUTBOOK_HTML_PATCH_SURFACE_TOKEN__ = incomingSurfaceToken/,
  "readonly patch injection must never downgrade an already newer runtime-visible token"
);
assert.match(
  indexHtml,
  /runtimePatchSurfaceLanes: new Map\(\)[\s\S]*?runtimePatchSurfaceLanes\.get\(itemId\)[\s\S]*?runtimePatchSurfaceLanes\.set\(itemId, lane\)/,
  "patch eval and token invalidation must share one per-item serialized lane"
);
assert.match(
  indexHtml,
  /const surfaceToken = currentRuntimeSurfaceToken\(itemId\);[\s\S]*?await writeHtmlEditReadonlyPatchSurfaceToken\(itemId, surfaceToken\);[\s\S]*?runtimePatchAppliedKeys\.get\(itemId\)/,
  "runtime-visible token synchronization must happen before same-revision replay early returns"
);
assert.match(
  indexHtml,
  /function acceptHtmlEditDocumentSnapshot\(session, data\)[\s\S]*?session\.selectedDataId = data\.selectedDataId \|\| null;[\s\S]*?session\.formatState = data\.formatState;/,
  "host state must retain runtime-selected field and computed formatting state only through canonical snapshots"
);
assert.match(
  indexHtml,
  /window\.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__[\s\S]*?session\.runtimeSessionId !== data\.runtimeSessionId[\s\S]*?!isCurrentHtmlEditSession\(session\)/,
  "runtime state must bind its session id to the active host item and generation"
);
assert.match(
  indexHtml,
  /window\.__NUTBOOK_HANDLE_HTML_EDIT_TOOLBAR_ACTION__[\s\S]*?data\?\.runtimeSessionId !== session\.runtimeSessionId[\s\S]*?Number\(data\?\.generation\) !== session\.generation/,
  "legacy toolbar actions must still validate runtime session identity before save or Done"
);
assert.doesNotMatch(
  indexHtml,
  /window\.__NUTBOOK_HANDLE_HTML_EDIT_TOOLBAR_ACTION__[\s\S]*?data\?\.action === "format"/,
  "format actions must remain inside the runtime WebView rather than crossing the host toolbar boundary"
);
assert.match(
  indexHtml,
  /attach_html_edit_toolbar_overlay_command[\s\S]*?runtimeSessionId: session\.runtimeSessionId,[\s\S]*?generation: session\.generation,[\s\S]*?formatState: session\.formatState \|\| defaultHtmlEditToolbarFormatState\(\)/,
  "toolbar sync must forward the current session identity and formatting state"
);
assert.match(
  htmlEditToolbar,
  /runtimeSessionId: null,[\s\S]*?generation: null,[\s\S]*?state\.runtimeSessionId = next\.runtimeSessionId;[\s\S]*?state\.generation = next\.generation;[\s\S]*?payload\.runtimeSessionId = state\.runtimeSessionId;[\s\S]*?payload\.generation = state\.generation;/,
  "toolbar actions must retain and emit their runtime session identity"
);
assert.match(
  htmlEditToolbar,
  /function emitFormatFromPointerDown\(event\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?emit\("format", \{ command \}\);[\s\S]*?button\.addEventListener\("pointerdown", emitFormatFromPointerDown\);/,
  "format intent must be sent on pointerdown before cross-webview focus loss can hide the toolbar button"
);
assert.match(
  htmlEditToolbar,
  /const FORMAT_COMMANDS = \[[\s\S]*?command: "bold", key: "htmlEdit\.format\.bold"[\s\S]*?command: "italic", key: "htmlEdit\.format\.italic"[\s\S]*?command: "paragraph", key: "htmlEdit\.format\.paragraph"[\s\S]*?command: "heading-1", key: "htmlEdit\.format\.heading1"[\s\S]*?command: "heading-4", key: "htmlEdit\.format\.heading4"[\s\S]*?command: "align-left", key: "htmlEdit\.format\.alignLeft"[\s\S]*?command: "align-right", key: "htmlEdit\.format\.alignRight"[\s\S]*?command: "unordered-list", key: "htmlEdit\.format\.bulletList"[\s\S]*?command: "ordered-list", key: "htmlEdit\.format\.orderedList"/,
  "toolbar format commands must use an explicit command-to-i18n mapping"
);
assert.match(
  htmlEditToolbar,
  /<button[^>]*data-format-command="bold"[^>]*type="button"[^>]*aria-label=""[^>]*title=""[^>]*>[\s\S]*?<svg[\s\S]*?<button[^>]*data-format-command="ordered-list"[^>]*type="button"[^>]*aria-label=""[^>]*title=""[^>]*>[\s\S]*?<svg/,
  "toolbar must provide inline-SVG, accessible buttons from bold through ordered list"
);
assert.match(
  htmlEditToolbar,
  /state\.formatState = next\.formatState \|\| defaultFormatState\(\);[\s\S]*?button\.disabled = !canFormat;[\s\S]*?button\.setAttribute\("aria-pressed", String\(isActive\)\);[\s\S]*?emit\("format", \{ command \}\);/,
  "format controls must follow runtime availability and active state, then emit a format action"
);
assert.match(
  htmlEditToolbar,
  /\.format-commands \{[\s\S]*?overflow-x: auto;[\s\S]*?\.actions \{[\s\S]*?flex: 0 0 auto;/,
  "narrow toolbar format commands must scroll while save and done remain visible"
);
assert.match(
  htmlEditToolbar,
  /htmlEdit\.format\.formatUnavailable/,
  "disabled format controls must expose the unavailable-format explanation"
);
for (const key of [
  "bold", "italic", "paragraph", "heading1", "heading2", "heading3", "heading4",
  "alignLeft", "alignCenter", "alignRight", "bulletList", "orderedList", "formatUnavailable"
]) {
  assert.match(i18n, new RegExp(`htmlEdit: \\{[\\s\\S]*?format: \\{[\\s\\S]*?${key}:`), `Chinese HTML edit format key ${key} should exist`);
  const englishHtmlEdit = i18n.slice(i18n.indexOf('toolbar: "HTML Edit Toolbar"'));
  assert.match(englishHtmlEdit, new RegExp(`format: \\{[\\s\\S]*?${key}:`), `English HTML edit format key ${key} should exist`);
}
assert.match(
  indexHtml,
  /function htmlEditToolbarBounds\(formatState\) \{[\s\S]*?formatState\?\.editRole === "content" \? 640 : formatState\?\.editRole === "short" \? 360 : 260;[\s\S]*?Math\.min\(preferredWidth, window\.innerWidth - 16\)[\s\S]*?const height = 56;/,
  "HTML edit toolbar bounds must adapt to the selected field's command set while remaining a compact island"
);
assert.match(
  htmlEditToolbar,
  /\.toolbar \{[\s\S]*?width: min\(632px, calc\(100vw - 8px\)\);[\s\S]*?\.format-commands \{[\s\S]*?overflow-x: auto;[\s\S]*?\.actions \{[\s\S]*?flex: 0 0 auto;/,
  "wide toolbars must show the full command set, while narrow toolbars preserve visible save and done actions"
);
assert.doesNotMatch(
  indexHtml,
  /<iframe[^>]+html-edit-toolbar/i,
  "HTML edit toolbar must remain a child-overlay boundary, never an iframe fallback"
);

assert.match(
  portableMarkdownFixture,
  /!\[Standard landscape\]\(\.\/assets\/landscape-large\.png\)[\s\S]*?nutbook-align=center nutbook-size=small[\s\S]*?<p align="center">[\s\S]*?<img src="\.\/assets\/icon-112\.png"[^>]*width="112">[\s\S]*?<a href="https:\/\/github\.com\/Ericonquer\/NUTBOOK"/,
  "the real portable-image acceptance artifact must cover standard Markdown, legacy tokens, centered GitHub HTML, and linked GitHub HTML"
);
assert.match(
  markdownEditor,
  /parsePortableImageHtml[\s\S]*?DOMParser[\s\S]*?portableImageRemark[\s\S]*?\$nodeSchema\(PORTABLE_IMAGE_NODE_NAME[\s\S]*?serializePortableImageHtml/,
  "strict GitHub image HTML must enter the editor through a structural AST node with a dedicated serializer"
);
assert.match(
  markdownEditor,
  /naturalWidth[\s\S]*?Math\.min\(limit, naturalWidth\)[\s\S]*?replaceImageTargetWithPortable/,
  "image presets must cap against natural width before migrating a standalone Markdown image to portable GitHub HTML"
);
assert.match(
  indexHtml,
  /hasPortableWidth[\s\S]*?maxWidth = `min\(\$\{explicitWidth\}px, 100%\)`/,
  "reading preview must honor portable width as a responsive maximum instead of overriding it with the legacy large preset"
);
assert.match(
  indexHtml,
  /\.portable-image-block\.ProseMirror-selectednode\s*\{[\s\S]*?outline:\s*none/,
  "portable image node selection must not show a persistent outline"
);
assert.match(
  markdownDocumentRust,
  /portable_image_html_candidate[\s\S]*?sanitize_portable_image_html[\s\S]*?markdown_image\(trimmed\)[\s\S]*?image\.alignment/,
  "the host preview must structurally sanitize portable GitHub HTML while preserving the legacy Markdown-title fallback"
);
assert.match(
  textAlignmentFixture,
  /<div align="center">\n\n# NUTBOOK Brand\n\n<\/div>[\s\S]*?<div align="right">[\s\S]*?\*\*bold\*\*[\s\S]*?Inline image paragraph must be rejected:[\s\S]*?!\[/,
  "the real text-alignment acceptance artifact must cover an aligned body brand heading, inline marks, and an image-bearing rejection case"
);
assert.match(
  markdownEditor,
  /convertAlignedTextBlocks[\s\S]*?\$remark\("alignedTextRemark"[\s\S]*?\$nodeSchema\(ALIGNED_TEXT_NODE_NAME[\s\S]*?sourceSyntax/,
  "portable text alignment must parse into a dedicated structural node and serialize through its canonical source syntax"
);
assert.match(
  markdownEditor,
  /function alignedTextSelectionState[\s\S]*?selection\.empty[\s\S]*?nodeContentStart = pos \+ \(node\.type === alignedType \? 2 : 1\)[\s\S]*?selection\.to <= nodeContentStart[\s\S]*?proseNodeContainsImage\(node\)/,
  "alignment eligibility must require a non-empty half-open selection and reject any top-level target containing an image"
);
assert.match(
  markdownEditor,
  /function runTextAlignmentCommand[\s\S]*?mapSelectionThroughReplacement[\s\S]*?\[\.\.\.targetState\.targets\]\.reverse\(\)[\s\S]*?transaction\.replaceWith[\s\S]*?transaction\.setNodeMarkup[\s\S]*?transaction\.setSelection\(TextSelection\.between[\s\S]*?closeHistory\(transaction\)[\s\S]*?view\.dispatch\(transaction\.scrollIntoView\(\)\)/,
  "one alignment transaction must update every target, restore the selection, and stay as one explicit history step"
);
assert.match(
  markdownDocumentRust,
  /aligned_text_html_candidate[\s\S]*?parse_aligned_text_html[\s\S]*?render_aligned_text_html[\s\S]*?escape_html\(line\.trim\(\)\)[\s\S]*?join\("<br>"\)/,
  "the host preview must structurally accept the safe alignment subset and escape the whole candidate when validation fails"
);
assert.match(
  indexHtml,
  /heading\.closest\('\[data-type="aligned-text-block"\]'\)[\s\S]*?markdown-document-title-source/,
  "an aligned body H1 must remain visible while the host document title continues to use its separate title source"
);
for (const key of ["markdown.saveAndClose", "markdown.discardAndClose", "markdown.continueEditing", "markdown.textAlignBlockOnly", "markdown.saveConflict", "markdown.saveConflictToast"]) {
  assert.match(i18n, new RegExp(key.split(".").pop()), `${key} must exist in both localization dictionaries`);
}
for (const [label, readme] of [["English", readmeEnglish], ["Chinese", readmeChinese]]) {
  assert.match(
    readme,
    /^<p align="center">\n  <a href="\.\/assets\/app-icon\.png">\n    <img src="\.\/assets\/app-icon-readme\.png" alt="NUTBOOK App Icon" width="112">\n  <\/a>\n<\/p>/,
    `${label} README must use the portable GitHub image contract for the linked app icon`
  );
  assert.doesNotMatch(
    readme,
    /app-icon-readme\.png[^\n]*nutbook-align=/,
    `${label} README must not rely on Nutbook-only image title tokens`
  );
  assert.match(
    readme,
    /<\/p>\n\n<div align="center">\n\n# NUTBOOK\n\n<\/div>/,
    `${label} README must align the body NUTBOOK heading below the icon without treating the host title as editable content`
  );
}

// Search (Task A0.1): live debounced search, IME, recordHistory contract, failure rollback, empty states.
const searchFunctions = indexFunctionSection("getSearchKeyword", "searchPlaceholderValues");
assert.match(searchFunctions, /return appState\.appliedSearch/, "the applied query must come from explicit state");
assert.doesNotMatch(searchFunctions, /els\.(?:searchInput|homeSearchInput)\?\.value/, "the applied query must not be reconstructed from the live input DOM");
assert.match(
  searchFunctions,
  /async function applySearch\(query\)[\s\S]*?const keyword = normalizeSearchKeyword\(query\)[\s\S]*?const previousApplied = appState\.appliedSearch[\s\S]*?appState\.appliedSearch = keyword[\s\S]*?loadItems\(\{ skipFilesystemSync: true \}\)[\s\S]*?if \(ok === false && appState\.appliedSearch === keyword\)[\s\S]*?appState\.appliedSearch = previousApplied/,
  "a genuinely failed query (empty or non-empty) must roll the applied search back; a stale request must never roll back and search must never await the filesystem sync"
);
assert.match(
  indexHtml,
  /async function loadItems\(options = \{\}\)[\s\S]*?const \{ skipFilesystemSync = false \} = options[\s\S]*?!skipFilesystemSync[\s\S]*?await maybeSyncFilesystemState\(\)[\s\S]*?if \(searchEpoch !== appState\.searchEpoch\) return "stale"[\s\S]*?return true[\s\S]*?catch \(error\)[\s\S]*?if \(searchEpoch !== appState\.searchEpoch\) return "stale"/,
  "loadItems must distinguish a stale (superseded) request from a real failure"
);
assert.match(
  searchFunctions,
  /function executeSearch\(query, \{ recordHistory \} = \{\}\)[\s\S]*?applySearch\(query\)/,
  "search must route through a single executeSearch(query, { recordHistory }) entry point"
);
assert.doesNotMatch(
  searchFunctions,
  /scheduleSearch\([\s\S]*?applySearch\(|handleSearchInput\([\s\S]*?applySearch\(/,
  "live search and clearing must route through executeSearch, never call applySearch directly, keeping a single record point for A2"
);
assert.match(
  searchFunctions,
  /function scheduleSearch\(input\)[\s\S]*?const query = input\.value[\s\S]*?clearTimeout\(searchDebounceTimer\)[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?executeSearch\(query, \{ recordHistory: false \}\)[\s\S]*?\}, 200\)/,
  "live search must debounce input by 200ms, capture the query snapshot, and route through executeSearch with recordHistory=false"
);
assert.match(
  searchFunctions,
  /function handleSearchInput\(input\)[\s\S]*?const rawValue = input\.value[\s\S]*?appState\.searchDraft = rawValue[\s\S]*?syncSearchInputs\(rawValue\)[\s\S]*?!rawValue\.trim\(\)[\s\S]*?clearTimeout\(searchDebounceTimer\)[\s\S]*?if \(appState\.appliedSearch\)[\s\S]*?executeSearch\("", \{ recordHistory: false \}\)[\s\S]*?scheduleSearch\(input\)/,
  "clearing must unconditionally cancel any pending debounce, run an immediate empty query only when a search is applied, and otherwise keep the current full list"
);
assert.match(
  indexHtml,
  /searchDraft: ""[\s\S]*?appliedSearch: ""[\s\S]*?searchEpoch: 0/,
  "search must maintain explicit draft, applied, and epoch state"
);
assert.match(
  indexHtml,
  /addEventListener\("compositionstart"[\s\S]*?isComposingSearch = true[\s\S]*?addEventListener\("compositionend"[\s\S]*?isComposingSearch = false[\s\S]*?handleSearchInput\(input\)/,
  "IME composition must suppress live search until compositionend"
);
assert.match(
  indexHtml,
  /addEventListener\("input"[\s\S]*?if \(isComposingSearch\) return[\s\S]*?handleSearchInput\(input\)/,
  "input must be ignored during IME composition"
);
assert.match(
  indexHtml,
  /addEventListener\("keydown"[\s\S]*?if \(event\.isComposing \|\| isComposingSearch \|\| event\.key === "Process" \|\| event\.keyCode === 229\) return[\s\S]*?if \(event\.key !== "Enter"\) return[\s\S]*?executeSearch\(input\.value, \{ recordHistory: true \}\)/,
  "Enter must execute immediately with recordHistory, skipping the IME-confirming Enter and Process/229 keys"
);
assert.match(
  indexHtml,
  /async function loadItems\(options = \{\}\)[\s\S]*?const \{ skipFilesystemSync = false \} = options[\s\S]*?const searchEpoch = \+\+appState\.searchEpoch[\s\S]*?if \(searchEpoch !== appState\.searchEpoch\) return "stale"[\s\S]*?appState\.items = sortItemsInPlace[\s\S]*?return true[\s\S]*?catch \(error\)[\s\S]*?if \(searchEpoch !== appState\.searchEpoch\) return "stale"/,
  "only the latest search request may update items and report success"
);
assert.match(
  indexHtml,
  /const hasActiveSearch = Boolean\(appState\.appliedSearch\)[\s\S]*?t\("home\.noSearchResults"\)[\s\S]*?t\("home\.noSearchResultsHint"\)[\s\S]*?const showAddButton =[\s\S]*?!hasActiveSearch/,
  "search zero-results and an empty library must use distinct empty states and actions"
);
assert.match(
  i18n,
  /noSearchResults: "没有匹配的文件"[\s\S]*?noSearchResultsHint: "换个关键词试试。"[\s\S]*?noSearchResults: "No matching files"[\s\S]*?noSearchResultsHint: "Try a different search term\."/,
  "search empty-state copy must exist in both localization dictionaries"
);

// Typing a single character and clearing it within the 200ms debounce window
// must cancel the pending timer instead of firing a stale one-character search.
assert.match(
  searchFunctions,
  /function handleSearchInput\(input\)[\s\S]*?!rawValue\.trim\(\)[\s\S]*?clearTimeout\(searchDebounceTimer\)[\s\S]*?if \(appState\.appliedSearch\)[\s\S]*?executeSearch\("", \{ recordHistory: false \}\)[\s\S]*?return[\s\S]*?scheduleSearch\(input\)/,
  "typing a character then clearing inside the 200ms window must cancel the pending debounce and keep the current full list"
);

// Search diagnostics must not leak into the shipped frontend.
assert.doesNotMatch(
  indexHtml,
  /logSearchDebug|append_search_debug_log|nutbook-search-debug\.log/,
  "search diagnostics must be fully removed from the frontend before shipping"
);

// Multi-library watching: the single-active-library watcher guard must be gone,
// and the frontend must reconcile watchers for every valid folder/file source
// via the backend sync command (which also schedules a background catch-up scan).
assert.doesNotMatch(
  indexHtml,
  /watcherStartedForLibraryId/,
  "the single-active-library watcher guard must not exist; all valid folder/file sources are watched together"
);
assert.match(
  indexHtml,
  /async function ensureWatcher\(\)[\s\S]*?invoke\("sync_library_watchers"\)/,
  "the frontend must reconcile watchers through sync_library_watchers, never watch a single active library"
);
assert.doesNotMatch(
  indexHtml,
  /invoke\("watch_library"[\s\S]*?appState\.activeLibraryId/,
  "the frontend must not start a watcher for only the active library"
);

// ---- A1.1 来源徽标（source badges）----

// 1. normalizeItemSummary 归一化 sourceBadges / source_badges。
assert.match(
  indexHtml,
  /function normalizeItemSummary\(item\)[\s\S]*?sourceBadges: Array\.isArray\(item\.sourceBadges \?\? item\.source_badges\)[\s\S]*?map\(normalizeSourceBadge\)\.filter\(Boolean\)[\s\S]*?: \[\]/,
  "normalizeItemSummary must normalize sourceBadges/source_badges into sourceBadges"
);
assert.match(
  indexHtml,
  /function normalizeSourceBadge\(badge\)[\s\S]*?kind: badge\.kind[\s\S]*?sourceId: badge\.sourceId \?\? badge\.source_id[\s\S]*?isOwner: Boolean\(badge\.isOwner \?\? badge\.is_owner\)[\s\S]*?available: badge\.available !== false/,
  "normalizeSourceBadge must handle camelCase and snake_case inputs"
);

// 2. 网格 DOM 顺序：自定义 primary → 自定义 +N → Project 主徽标 → Project +N → Skill 主徽标 → Skill +N
// → 类型（类型用缩写 "MD"/"HTML"，全部徽标压在缩略图底部 thumb-chip-row；
// 卡片标题下方不再单独显示）。自定义标签压缩成 primary +N，不逐条渲染全部标签。
assert.match(
  indexHtml,
  /function thumbnailNode\(item\)[\s\S]*?const chips = \[customPrimary, customMore, projectPrimary, projectMore, skillPrimary, skillMore\][\s\S]*?\.filter\(Boolean\)[\s\S]*?\.join\(""\)/,
  "grid badge order must be custom primary → custom +N → Project → Skill (in thumb-chip-row); type uses thumb-badge-type"
);
assert.match(
  indexHtml,
  /const customMore = customTags\.length > 1[\s\S]*?tag-chip-more[\s\S]*?\$\{customTags\.length - 1\}/,
  "custom tags must collapse extras into a +N chip (primary +N budget)"
);
// available=false：中性失效视觉 + aria 说明。
assert.match(
  indexHtml,
  /source-badge--unavailable[\s\S]*?aria-label="\$\{escapeAttribute\(badge\.label \+ \(unavailable \? "（来源不可用）" : ""\)\)\}/,
  "unavailable source badge must carry neutral unavailable styling + aria label"
);
assert.match(
  indexHtml,
  /\.thumb-chip-row \.source-badge--unavailable \{[\s\S]*?border-style: dashed;[\s\S]*?opacity: 0\.85;/,
  "unavailable badge must use dashed border + desaturated style (neutral, not pretending available)"
);
// A1.1 GUI 反馈：徽标不再使用浏览器原生 title 系统提示，改用 Nutbook 自定义 chip-tooltip 子元素。
assert.doesNotMatch(
  indexHtml,
  /source-badge[^>]*title="/,
  "source badges must not use native title tooltip (OS system prompt)"
);
assert.match(
  indexHtml,
  /const badgeClass = \(badge, kindClass\) => \{[\s\S]*?source-badge \$\{kindClass\}\$\{unavailable \? " source-badge--unavailable" : ""\}/,
  "project badge must embed a Nutbook chip-tooltip carrying all full project names (via badgeClass helper)"
);
assert.match(
  indexHtml,
  /\.chip-tooltip \{[\s\S]*?position: absolute;[\s\S]*?background: rgba\(24, 24, 28, 0\.94\);[\s\S]*?color: #fff;[\s\S]*?opacity: 0;[\s\S]*?transition: opacity 120ms ease;/,
  "chip-tooltip must use Nutbook tooltip widget styling (dark pill, fade-in)"
);
// 新结构：单个全局 .chip-tooltip--floating 由 JS 控制位置 + 显隐，CSS 用 opacity:0 默认
assert.match(
  indexHtml,
  /\.chip-tooltip\.chip-tooltip--floating \{[\s\S]*?position: fixed;[\s\S]*?width: max-content;[\s\S]*?opacity: 0;[\s\S]*?pointer-events: none;[\s\S]*?z-index: 380;/,
  "single global floating chip-tooltip widget must use Nutbook tooltip styling"
);
assert.match(
  indexHtml,
  /\.thumb-chip-row\.thumb-chip-row--type-only \{[\s\S]*?justify-content: flex-end;/,
  "row with only type badge must justify flex-end (single MD/HTML not stuck at left)"
);
assert.match(
  indexHtml,
  /thumb-badge-type">\$\{escapeHtml\(item\.fileType === "html" \? "HTML" : "MD"\)\}/,
  "type chip must use the abbreviation MD / HTML"
);

// 3. ellipsis 移入内层 label（display:block + overflow hidden + nowrap + text-align:left），
// 外层 pill 只负责布局；+N（source-badge-more / tag-chip-more）不可压缩（flex: 0 0 auto）。
assert.match(
  indexHtml,
  /\.thumb-chip-row \.tag-chip-label,\s*\.thumb-chip-row \.source-badge-label \{[\s\S]*?display: block;[\s\S]*?overflow: hidden;[\s\S]*?text-overflow: ellipsis;[\s\S]*?white-space: nowrap;[\s\S]*?text-align: left;/,
  "inner label must own the ellipsis with left alignment"
);
assert.match(
  indexHtml,
  /\.thumb-chip-row \.source-badge-more,\s*\.thumb-chip-row \.tag-chip-more \{[\s\S]*?flex: 0 0 auto;/,
  "+N badge must never shrink"
);
// 外层 pill 不再直接承载 ellipsis（禁 inline-flex + justify-content:center 上做 text-overflow）。
assert.doesNotMatch(
  indexHtml,
  /\.thumb-chip-row \.tag-chip,[\s\S]*?\.source-badge \{[\s\S]*?justify-content: center;[\s\S]{0,120}?text-overflow: ellipsis;/,
  "ellipsis must live on the inner label, not the centered flex pill"
);
// 常态浅色：近白近乎不透明背景 + 深灰文字 + 细灰边框（不再是深黑底白字）。
assert.match(
  indexHtml,
  /\.thumb-chip-row \.tag-chip,[\s\S]*?\.source-badge \{[\s\S]*?background: rgba\(255, 255, 255, 0\.94\);[\s\S]*?border: 1px solid rgba\(31, 35, 40, 0\.14\);[\s\S]*?color: #3a3d44;[\s\S]*?cursor: default;/,
  "badges must default to light pill (near-opaque white bg, gray text, thin border, default cursor)"
);
// 标签行从左侧排布，不再 flex-end。
assert.match(
  indexHtml,
  /\.thumb-chip-row \{[\s\S]*?justify-content: flex-start;/,
  "thumb-chip-row must flow from the left by default"
);
assert.match(
  indexHtml,
  /\.thumb-chip-row\.chip-row--align-end \{[\s\S]*?justify-content: flex-end;/,
  "thumb-chip-row must align source badges to the right when there are no custom tags"
);
// 新结构：thumbnailNode 根据是否有自定义/来源徽标选 row class（align-end 或 type-only）
assert.match(
  indexHtml,
  /hasSources[\s\S]{0,80}?rowClass = "thumb-chip-row thumb-chip-row--type-only"[\s\S]{0,200}?customTags\.length === 0[\s\S]{0,80}?rowClass = "thumb-chip-row chip-row--align-end"/,
  "thumbnailNode must switch row class based on custom tags / source chips presence"
);
// hover / 卡片 focus-visible 只加深一档。
assert.match(
  indexHtml,
  /\.item-card:hover \.thumb-chip-row \.tag-chip,[\s\S]*?\.item-card:focus-visible \.thumb-chip-row \.tag-chip,[\s\S]*?\.item-card:focus-visible \.thumb-badge \{[\s\S]*?background: rgba\(232, 235, 240, 0\.98\);[\s\S]*?border-color: rgba\(31, 35, 40, 0\.28\);[\s\S]*?color: #1f2329;/,
  "hover and card focus-visible must deepen the badges by exactly one notch"
);

// 4. tooltip（title）与 aria 包含全部完整来源名，且区分项目来源与 Skill 来源。
assert.match(
  indexHtml,
  /function itemSourceBadgesAria\(item\)[\s\S]*?自定义标签：\$\{customTags\.join\("、"\)\}/,
  "aria must list all custom tag names"
);
assert.match(
  indexHtml,
  /function itemSourceBadgesAria\(item\)[\s\S]*?项目来源：\$\{projects\.map\(\(badge\) => badge\.label\)\.join\("、"\)\}/,
  "aria must distinguish 项目来源 (project sources)"
);
assert.match(
  indexHtml,
  /function itemSourceBadgesAria\(item\)[\s\S]*?Skill 来源：\$\{skills\.map\(\(badge\) => badge\.label\)\.join\("、"\)\}/,
  "aria must distinguish Skill 来源 (skill sources)"
);
assert.match(
  indexHtml,
  /aria-label="\$\{escapeAttribute\(ariaLabel\)\}"[\s\S]*?thumbnailNode\(item\)/,
  "grid card must use the extended aria-label and embed source badges in thumb-chip-row"
);

// 5. 非交互徽标：不伪装成按钮。
assert.doesNotMatch(
  indexHtml,
  /<button[^>]*class="[^"]*source-badge/,
  "source badges must not be rendered as buttons"
);

// 6. 项目名与 Skill 名使用安全文本（escapeHtml/escapeAttribute）且不进入 i18n 字典。
assert.match(
  indexHtml,
  /function thumbnailNode\(item\)[\s\S]*?escapeHtml\(projects\[0\]\.label\)[\s\S]*?escapeHtml\(skills\[0\]\.label\)/,
  "project and skill names must be rendered through escapeHtml"
);
assert.doesNotMatch(
  i18n,
  /用于验证Nutbook项目来源标签超长省略显示行为的中文验收项目|Extraordinarily Long English Skill Name for Nutbook Source Badge Ellipsis Acceptance|项目来源验收/,
  "user project and skill names must be marked i18n skip and never enter the translation dictionary"
);

// 7. 网格只有一份标签体系：缩略图底部 thumb-chip-row；卡片标题下方不显示任何 chip。
assert.doesNotMatch(
  indexHtml,
  /itemSourceBadgesHtml\(item/,
  "card title row must not call itemSourceBadgesHtml (single badge row in thumb-chip-row only)"
);

// ---- A1.1-PERF 合同（静态守卫）----
// 8. renderItems 指纹覆盖全部影响 DOM/顺序/aria 的字段（含 sourceBadges 全字段）
assert.match(
  indexHtml,
  /function itemsFingerprint\(items\)[\s\S]*?badge\.kind[\s\S]*?badge\.sourceId[\s\S]*?badge\.label[\s\S]*?badge\.isOwner[\s\S]*?badge\.available/,
  "itemsFingerprint must cover sourceBadges kind/sourceId/label/isOwner/available"
);
assert.match(
  indexHtml,
  /function itemsFingerprint\(items\)[\s\S]*?item\.fileName[\s\S]*?item\.title[\s\S]*?item\.pathState[\s\S]*?item\.isFavorite[\s\S]*?item\.thumbnail[\s\S]*?item\.tags/,
  "itemsFingerprint must cover fileName/title/pathState/favorite/thumbnail/tags"
);

// 9. 缩略图单卡更新用 template 解析成 Element（不允许字符串 replaceWith）
assert.match(
  indexHtml,
  /function htmlStringToElement\(html\)[\s\S]*?template\.innerHTML[\s\S]*?firstElementChild/,
  "updateCardThumbnail must parse thumbnailNode HTML via template into a real Element"
);
assert.match(
  indexHtml,
  /function updateCardThumbnail\(item\)[\s\S]*?hasThumb[\s\S]*?hasType[\s\S]*?wrap\.replaceWith\(freshEl\)/,
  "updateCardThumbnail must validate thumb/type structure before replaceWith(freshEl)"
);

// 10b. B1 调度正确性（阻塞 3）：只有 discarded 响应不修改 item.thumbnail；
//     generateThumbnailOnce 必须真正收敛到最新 generation——不设固定次数上限，
//     连续 discarded 用 80–300ms 退避，退避前后检查 runId。
//     这里用**可执行行为测试**（抽取函数源码 + stub invoke 实际运行），
//     不允许仅靠 assert.match 检查源码包含 for/while/retryKey。
function extractFunctionSource(source, startMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start !== -1, `function source not found: ${startMarker}`);
  const brace = source.indexOf("{", start);
  assert.ok(brace !== -1, `function body brace not found: ${startMarker}`);
  let depth = 0;
  let i = brace;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  assert.ok(depth === 0 && i < source.length, `balanced function body for ${startMarker}`);
  return source.slice(start, i + 1);
}

function buildThumbnailConvergenceHarness(stubResponses, cancelOnInvoke) {
  const normalizeSrc = extractFunctionSource(indexHtml, "function normalizeThumbnailInfo(thumbnail) {");
  const applySrc = extractFunctionSource(indexHtml, "function applyGenerateThumbnailResult(item, result) {");
  const onceSrc = extractFunctionSource(indexHtml, "async function generateThumbnailOnce(item, runId) {");
  const harness = `
    const toLocalServerUrl = (p) => p;
    const cancelOnInvoke = ${JSON.stringify(cancelOnInvoke ?? null)};
    ${normalizeSrc}
    ${applySrc}
    ${onceSrc}
    const log = [];
    const appState = { thumbnailQueueRunId: 100 };
    const responses = ${JSON.stringify(stubResponses)};
    let calls = 0;
    const thumbnailAssignments = [];
    const item = { id: 1 };
    Object.defineProperty(item, "thumbnail", {
      get() { return item._thumb; },
      set(value) { thumbnailAssignments.push(value ? value.path : null); item._thumb = value; },
      configurable: true,
    });
    item._thumb = { path: "old.png", status: "ready" };
    async function invoke(name, args) {
      calls += 1;
      log.push("invoke:" + calls);
      if (cancelOnInvoke && calls === cancelOnInvoke) appState.thumbnailQueueRunId += 1;
      return responses.shift();
    }
    const delay = async (ms) => { log.push("delay:" + ms); };
    return generateThumbnailOnce(item, 100).then((outcome) => ({
      outcome,
      calls,
      finalPath: item._thumb ? item._thumb.path : null,
      thumbnailAssignments,
      log: log.join(","),
    }));
  `;
  return new Function(harness)();
}

// 场景 A：连续 5 个 discarded（expectedKey/generation 每次变化），第 6 次 ready。
// 断言：最终应用第 6 次结果；旧结果从未写入 item.thumbnail；invoke 次数正确（6）。
{
  const responses = [
    { itemId: 1, discarded: true, expectedKey: "k2", generation: 2, thumbnail: { status: "pending" } },
    { itemId: 1, discarded: true, expectedKey: "k3", generation: 3, thumbnail: { status: "pending" } },
    { itemId: 1, discarded: true, expectedKey: "k4", generation: 4, thumbnail: { status: "pending" } },
    { itemId: 1, discarded: true, expectedKey: "k5", generation: 5, thumbnail: { status: "pending" } },
    { itemId: 1, discarded: true, expectedKey: "k6", generation: 6, thumbnail: { status: "pending" } },
    { itemId: 1, discarded: false, status: "ready", path: "new6.png", generation: 6, desiredKey: "k6", renderKind: "html-screenshot" },
  ];
  const run = await buildThumbnailConvergenceHarness(responses, null);
  assert.equal(run.outcome.ok, true, "must converge after 5 discarded + 1 ready");
  assert.equal(run.outcome.reason, "applied");
  assert.equal(run.calls, 6, "invoke must be called exactly once per discarded generation plus the final ready");
  assert.equal(run.finalPath, "new6.png", "the final ready result must be applied");
  assert.deepEqual(
    run.thumbnailAssignments,
    ["new6.png"],
    "old discarded results must never be written into item.thumbnail"
  );
  assert.deepEqual(
    (run.log.match(/delay:(\d+)/g) || []).map((part) => part.slice(6)),
    ["80", "160", "300", "300", "300"],
    "backoff must ramp 80→160→300 and cap at 300"
  );
}

// 场景 B：runId 取消后停止继续调用（不允许静默继续 converge / hot loop）。
{
  const responses = [
    { itemId: 1, discarded: true, expectedKey: "k2", generation: 2, thumbnail: { status: "pending" } },
    { itemId: 1, discarded: false, status: "ready", path: "should-not-run.png", generation: 2 },
  ];
  const run = await buildThumbnailConvergenceHarness(responses, 1);
  assert.equal(run.outcome.ok, false, "canceled convergence must not report ok");
  assert.equal(run.outcome.reason, "canceled");
  assert.equal(run.calls, 1, "no further invoke after the queue runId was canceled");
  assert.equal(run.finalPath, "old.png", "canceled convergence must not touch item.thumbnail");
  assert.deepEqual(run.thumbnailAssignments, [], "canceled convergence must write nothing");
}

// 场景 C（阻塞 B）：后端返回 status=failed placeholder（截图引擎失败）不是成功——
// 不得计入 completed，也不得写入 item.thumbnail，且不进入 discarded 补跑循环。
{
  const responses = [
    { itemId: 1, discarded: false, status: "failed", renderKind: "placeholder", errorMessage: "engine down", desiredKey: "k1", generation: 1 },
  ];
  const run = await buildThumbnailConvergenceHarness(responses, null);
  assert.equal(run.outcome.ok, false, "a failed placeholder response must not report success");
  assert.equal(run.outcome.reason, "failed");
  assert.equal(run.calls, 1, "terminal failure must not spin a retry loop");
  assert.equal(run.finalPath, "old.png", "failed response must not overwrite item.thumbnail");
  assert.deepEqual(
    run.thumbnailAssignments,
    [],
    "a failed placeholder must never be applied as a ready image"
  );
}

// 场景 D（阻塞 B）：status=ready 但 renderKind=placeholder 的响应同样不是成功成图。
{
  const responses = [
    { itemId: 1, discarded: false, status: "ready", renderKind: "placeholder", path: "fake.svg", generation: 1 },
  ];
  const run = await buildThumbnailConvergenceHarness(responses, null);
  assert.equal(run.outcome.ok, false, "a ready-status placeholder must not be accepted");
  assert.equal(run.outcome.reason, "placeholder");
  assert.deepEqual(run.thumbnailAssignments, [], "placeholder render kind must never be applied");
}

// 结构断言保留：applyGenerateThumbnailResult / normalizeThumbnailInfo 契约。
assert.match(
  indexHtml,
  /function applyGenerateThumbnailResult\(item, result\)[\s\S]*?result\.discarded === true[\s\S]*?status !== "ready"[\s\S]*?reason: status === "failed" \? "failed" : "not-ready"/,
  "applyGenerateThumbnailResult must reject discarded AND treat status=failed/placeholder as failure, not success"
);
assert.match(
  indexHtml,
  /function normalizeThumbnailInfo\(thumbnail\)[\s\S]*?desiredKey[\s\S]*?generation[\s\S]*?renderKind/,
  "normalizeThumbnailInfo must carry desiredKey/generation/renderKind through item.thumbnail"
);

// 10d. B1 阻塞 C：手动重建必须独占固定 runId、使用 pendingThumbnailIds，
//      队列被接管（runId 改变）时必须取消停止，不得继续处理并以绿色"成功 N/M"收尾。
assert.match(
  indexHtml,
  /async function rebuildThumbnailsForItems\(items, \{ onProgress \} = \{\}\)[\s\S]*?const runId = \+\+appState\.thumbnailQueueRunId[\s\S]*?waitForThumbnailSlot\(item\.id, runId\)[\s\S]*?pendingThumbnailIds\.add\(item\.id\)[\s\S]*?generateThumbnailOnce\(item, runId\)[\s\S]*?outcome\.reason === "canceled"[\s\S]*?canceled \+= 1; break/,
  "rebuild must own an exclusive runId, wait for the previous slot owner, and stop counting on canceled"
);
assert.match(
  indexHtml,
  /function showThumbnailRebuildResult\(result, successMessage\)[\s\S]*?result\.reason === "canceled"[\s\S]*?setThumbnailSettingsFeedback\(message, "warn"\)/,
  "a canceled rebuild must not show a green success summary"
);

// 手动重建接管自动队列时必须等待旧 owner 释放 pending slot，不能静默跳过。
{
  const waitSrc = extractFunctionSource(indexHtml, "async function waitForThumbnailSlot(itemId, runId) {");
  const run = await new Function(`
    ${waitSrc}
    const appState = { thumbnailQueueRunId: 9, pendingThumbnailIds: new Set([7]) };
    const waits = [];
    async function delay(ms) {
      waits.push(ms);
      appState.pendingThumbnailIds.delete(7);
    }
    return waitForThumbnailSlot(7, 9).then((acquired) => ({ acquired, waits }));
  `)();
  assert.equal(run.acquired, true, "manual rebuild must acquire the slot after the old run releases it");
  assert.deepEqual(run.waits, [40], "slot takeover must wait with bounded backoff instead of spinning");
}

// 任意 completed < total 的结果都不能落入绿色成功分支，即使 failed/canceled
// 因未来调用方 bug 没有正确计数。
{
  const showSrc = extractFunctionSource(indexHtml, "function showThumbnailRebuildResult(result, successMessage) {");
  const run = new Function(`
    ${showSrc}
    const feedback = [];
    const t = (key) => key;
    const setThumbnailSettingsFeedback = (message, tone) => feedback.push({ message, tone });
    const normalizeError = (error) => String(error);
    const outcome = showThumbnailRebuildResult(
      { total: 3, completed: 2, failed: 0, canceled: 0, reason: null, lastError: null },
      "done"
    );
    return { outcome, feedback };
  `)();
  assert.equal(run.outcome.tone, "warn", "incomplete rebuild must not report a green success tone");
  assert.equal(run.feedback.at(-1)?.tone, "warn", "incomplete rebuild feedback must stay visible as a warning");
}

// 10c. B1 阻塞 6：HTML durable-save 热路径不得递归扫描，也不得伪造零纳秒 mtime。
{
  const commitStart = htmlEditCommandsRust.indexOf("pub fn commit_html_edit");
  assert.ok(commitStart !== -1, "commit_html_edit must exist in html_edit.rs");
  const commitEnd = htmlEditCommandsRust.indexOf("\n}\n", commitStart);
  assert.ok(commitEnd !== -1, "commit_html_edit body must be extractable");
  const commitBody = htmlEditCommandsRust.slice(commitStart, commitEnd + 3);
  assert.doesNotMatch(
    commitBody,
    /scan_library_once\s*\(/,
    "commit_html_edit must not trigger a recursive library scan on the durable-save hot path"
  );
  assert.doesNotMatch(
    commitBody,
    /\.000000000/,
    "commit_html_edit must not synthesize a fake <seconds>.000000000 mtime"
  );
}
assert.doesNotMatch(
  htmlEditCommandsRust,
  /\.000000000/,
  "no fake zero-nanosecond mtime anywhere in html_edit.rs"
);

// 10. 自动刷新 single-flight：in-flight guard + setTimeout 一轮一轮调度（禁止裸 setInterval 无保护）
assert.match(
  indexHtml,
  /function startAutoRefresh\(\)[\s\S]*?refreshInFlight[\s\S]*?refreshPending[\s\S]*?scheduleAutoRefreshTick/,
  "auto refresh must use in-flight guard + pending merge + setTimeout scheduling"
);
assert.doesNotMatch(
  indexHtml,
  /setInterval\(async \(\) => \{[\s\S]*?await loadItems\(\)[\s\S]*?\}, 2500\)/,
  "auto refresh must not use unguarded setInterval with concurrent loadItems"
);

// ---- A1.2 Markdown 文档工具栏来源徽标 ----
// 1. renderDocumentTagChips 只用 item.sourceBadges 投影来源，禁止从 skillBinding / library fallback 补来源。
const renderDocumentTagChipsSrc = indexHtml.match(/function renderDocumentTagChips\(item, typeLabel\) \{[\s\S]*?\n      \}/);
assert.ok(renderDocumentTagChipsSrc, "renderDocumentTagChips must exist");
const docTagChips = renderDocumentTagChipsSrc[0];
assert.doesNotMatch(
  docTagChips,
  /item\.skillBinding|resolveItemSkillBinding|library\.skillBinding|library\?\.skillBinding/,
  "Markdown toolbar must NOT render sources from item.skillBinding / resolveItemSkillBinding / library.skillBinding"
);
// 必须从 item.sourceBadges 投影 Project / Skill（同一 sourceBadges 语义）。
assert.match(
  docTagChips,
  /item\.sourceBadges \|\| \[\][\s\S]*?\.filter\(\(badge\) => badge\.kind === "project"\)/,
  "Markdown toolbar must project Project badges from item.sourceBadges"
);
assert.match(
  docTagChips,
  /item\.sourceBadges \|\| \[\][\s\S]*?\.filter\(\(badge\) => badge\.kind === "skill"\)/,
  "Markdown toolbar must project Skill badges from item.sourceBadges"
);
// 顺序固定：自定义 → Project → Skill → 类型。
assert.match(
  docTagChips,
  /return `[\s\S]*?\$\{customTrigger\}[\s\S]*?\$\{customMore\}[\s\S]*?\$\{projectPrimary\}[\s\S]*?\$\{projectMore\}[\s\S]*?\$\{skillPrimary\}[\s\S]*?\$\{skillMore\}[\s\S]*?\$\{typeTag\}/,
  "Markdown toolbar badge order must be custom → Project → Skill → type"
);
// 主名称经 escapeHtml；可用 source-badge-label 承载 ellipsis。
assert.match(
  docTagChips,
  /source-badge-label">\$\{escapeHtml\(projects\[0\]\.label\)\}/,
  "project primary badge must render its label through escapeHtml"
);
assert.match(
  docTagChips,
  /source-badge-label">\$\{escapeHtml\(skills\[0\]\.label\)\}/,
  "skill primary badge must render its label through escapeHtml"
);
// available=false：中性失效视觉 + aria（与卡片同 badgeClass 语义）。
assert.match(
  docTagChips,
  /source-badge--unavailable[\s\S]*?aria-label="\$\{escapeAttribute\(badge\.label \+ \(unavailable \? "（来源不可用）" : ""\)\)\}/,
  "unavailable source badge in toolbar must carry neutral unavailable styling + aria label"
);
// 自定义标签交互按钮保留（data-document-tag-trigger / data-document-tag-remove），不改成普通 span。
assert.match(
  docTagChips,
  /<button class="breadcrumb-tag-trigger"[^>]*data-document-tag-trigger="current"[\s\S]*?data-document-tag-remove="true"/,
  "custom tag must stay an interactive trigger button with remove affordance"
);

// 2. CSS：文档工具栏来源徽标常态浅底深字、cursor default、+N/类型不可压缩、最大宽度约束。
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.source-badge,\s*\.breadcrumb-tags \.tag-chip,\s*\.breadcrumb-tags \.meta-chip \{[\s\S]*?background: rgba\(255, 255, 255, 0\.9\);[\s\S]*?color: var\(--ink-soft\);[\s\S]*?cursor: default;/,
  "document toolbar badges must default to light pill with the toolbar secondary text color (var(--ink-soft), not darker) and default cursor"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.source-badge:hover,[\s\S]*?\.breadcrumb-tags \.meta-chip:hover \{[\s\S]*?color: #1f2329;/,
  "document toolbar source/type badges must darken text only on hover"
);
// A1.3 返工用户反馈（路径空间足够却省略）：路径区必须 flex:1 1 auto 吃满剩余
// 空间显示完整路径；不能有 margin-right:auto（会把留白推给标签组、路径永远省略）；
// 空间不足时 #breadcrumbItem 自身 ellipsis 收缩，绝不越出边界覆盖标签。
assert.match(
  indexHtml,
  /\.breadcrumb \{[^{}]*flex: 1 1 auto;[^{}]*overflow: hidden;/,
  "path area must be flex 1 1 auto (fills remaining space so a fully-qualified path is shown when room allows) and clip at its own boundary"
);
assert.doesNotMatch(
  indexHtml,
  /\.breadcrumb \{[^{}]*margin-right: auto;/,
  "path area must NOT carry margin-right:auto (would push whitespace to the tag group and ellipsize the path even when space is available)"
);
assert.match(
  indexHtml,
  /\.breadcrumb \{[^{}]*flex: 1 1 auto;[^{}]*margin-right: 12px;/,
  "path area must keep a fixed 12px margin from the tag group (visual gap preserved while path fills available space)"
);
// 标签/来源组不贪婪扩张；chip max-width 收窄（96px）优先保证路径完整显示。
assert.match(
  indexHtml,
  /\.breadcrumb-tags \{[^{}]*flex: 0 1 auto;[^{}]*max-width: min\(46%, 470px\);/,
  "tag/source group must NOT use flex 1 1 auto greedy expansion; must carry relative+absolute caps"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.source-badge-project \{ max-width: 120px; min-width: 40px; \}/,
  "toolbar project badge must cap at 120px (one full word) and keep 40px min"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.source-badge-skill \{ max-width: 120px; min-width: 40px; \}/,
  "toolbar skill badge must cap at 120px (one full word) and keep 40px min"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.tag-chip:not\(\.tag-chip-more\) \{ max-width: 176px; min-width: 56px; \}/,
  "toolbar custom tag must prioritize full display (176px) with a 56px floor (>= 2 CJK chars, never just an ellipsis)"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tag-trigger \{[^{}]*min-width: 56px;/,
  "custom-tag trigger button must share the chip 56px floor so flex squeeze cannot crush the button and let the chip overflow onto sibling badges (overlap fix)"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags\.host-overlay-mode \{[^{}]*max-width: none;/,
  "HTML-mode spacer must not inherit the 46%/470px cap, or the overlay slides left and covers the path tail (path must not touch the tags)"
);
assert.doesNotMatch(
  indexHtml,
  /\.breadcrumb-tags \{[^{}]*flex: 1 1 auto;/,
  "breadcrumb-tags must not greedily expand to fill remaining toolbar space"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.source-badge-more,\s*\.breadcrumb-tags \.tag-chip-more \{[\s\S]*?flex: 0 0 auto;/,
  "document toolbar +N chips must never shrink"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.tag-chip:not\(\.tag-chip-more\) \{[\s\S]*?min-width: 28px;/,
  "document toolbar custom tag entry chip must keep a minimum width at min window"
);
assert.match(
  indexHtml,
  /\.breadcrumb > span:not\(#breadcrumbItem\) \{[\s\S]*?white-space: nowrap;[\s\S]*?flex: 0 0 auto;/,
  "breadcrumb fixed label/separator (文件/›) must stay single-line and non-shrinkable, but must NOT hit #breadcrumbItem"
);
assert.match(
  indexHtml,
  /#breadcrumbItem \{[\s\S]*?flex: 0 1 auto;[\s\S]*?min-width: 0;[\s\S]*?overflow: hidden;[\s\S]*?text-overflow: ellipsis;/,
  "breadcrumbItem must be shrinkable and ellipsize inside its own bounds so a long path never covers the source tags"
);
assert.match(
  indexHtml,
  /\.breadcrumb \{[\s\S]*?overflow: hidden;/,
  "breadcrumb must clip overflow so path text never draws into the tag area"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.meta-chip \{[\s\S]*?flex: 0 0 auto;/,
  "document toolbar type chip must never shrink"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.source-badge-label,\s*\.breadcrumb-tags \.tag-chip-label \{[\s\S]*?overflow: hidden;[\s\S]*?text-overflow: ellipsis;[\s\S]*?text-align: left;/,
  "document toolbar inner label must own ellipsis with left alignment"
);

// 3. tooltip 复用同一 coordinator（全局单个 floating tip），并覆盖文档工具栏。
assert.match(
  indexHtml,
  /attachChipTooltipRoot\(els\.breadcrumbTags, \{ requireRow: false, preferBelow: true \}\)/,
  "document toolbar must reuse the same chip-tooltip coordinator (not a behavior-different copy) and force preferBelow to avoid being covered by the path bar"
);
// A1.3 用户反馈修复：role=button 卡片 click 后会 focus，禁止 focus 触发卡片级
// tooltip（之前会把所有 source 名拼接显示在卡片上方遮挡）。
assert.doesNotMatch(
  indexHtml,
  /options\.cardMode/,
  "chip tooltip root must not carry a cardMode option (would surface a joined card-level tooltip on focus)"
);
assert.doesNotMatch(
  indexHtml,
  /sourceNamesForCard\s*=\s*\([\s\S]*?\.querySelectorAll\("\.source-badge"\)/,
  "chip tooltip coordinator must not define a sourceNamesForCard helper that joins card sources"
);
// A1.3 用户反馈（hover tooltip 闪烁 + 右边切割）：
// (a) tooltip <span> 默认 display:inline，width/max-width/white-space 不生效，
//     必须显式 display:block + white-space:normal + word-break:break-word 限制内容宽度
//     0 并在 viewport 内 clamp。
// (b) transition: opacity + cancelAnimationFrame 反复触发造成 opacity 闪烁，禁止回归。
assert.match(
  indexHtml,
  /\.chip-tooltip\.chip-tooltip--floating \{[^{}]*?display: block;[^{}]*?max-width: min\(360px, calc\(100vw - 16px\)\);[^{}]*?word-break: break-word;[^{}]*?transition: none;/,
  "floating tooltip must be display:block with max-width/word-break/transition:none so it clamps inside the viewport without flicker"
);
assert.doesNotMatch(
  indexHtml,
  /\.chip-tooltip\.chip-tooltip--floating \{[^{}]*?transition: opacity/,
  "floating tooltip must not carry an opacity transition (causes flicker with cancelAnimationFrame)"
);
assert.match(
  indexHtml,
  /anchorObserver\.observe\(els\.breadcrumbTags, \{ childList: true, subtree: true \}\)/,
  "tooltip coordinator must observe breadcrumbTags so rebuilds hide stale tooltips"
);
assert.match(
  indexHtml,
  /window\.__nutbookChipTipController\?\.hide\(\);\s*\n\s*els\.breadcrumbTags\.innerHTML = renderDocumentTagChips/,
  "toolbar redraw must hide any stale tooltip before re-rendering chips"
);
assert.match(
  indexHtml,
  /\.breadcrumb-tags \.source-badge \.chip-tooltip,[\s\S]*?\.breadcrumb-tags \.tag-chip \.chip-tooltip,[\s\S]*?\.breadcrumb-tags \.meta-chip \.chip-tooltip \{[\s\S]*?display: none;/,
  "toolbar per-badge chip-tooltip must be a text source only (display:none) so +N/type scrollWidth stays clean"
);

// ---- A1.2 返工守卫：卡片自定义主标签不被压成纯省略号 ----
assert.match(
  indexHtml,
  /\.thumb-chip-row \.tag-chip:not\(\.tag-chip-more\) \{[^{}]*min-width: 52px;/,
  "card custom primary tag min-width must fit two CJK chars + the ellipsis glyph (e.g. 测试…) with real margin"
);
assert.doesNotMatch(
  indexHtml,
  /\.thumb-chip-row \.tag-chip \{[^{}]*min-width: 28px;/,
  "card custom tag must not return to a 28px min-width that collapses to a bare ellipsis"
);
assert.doesNotMatch(
  indexHtml,
  /\.thumb-chip-row \.tag-chip:not\(\.tag-chip-more\) \{[^{}]*min-width: 46px;/,
  "card custom tag must not regress to a 46px min-width that only shows one char + ellipsis (测…)"
);
assert.match(
  indexHtml,
  /\.thumb-chip-row \.source-badge-more,\s*\.thumb-chip-row \.tag-chip-more \{[^{}]*flex: 0 0 auto;[^{}]*min-width: 0;/,
  "card +N chips must stay non-shrinkable with min-width 0 so the worst layout fits one row"
);

// ---- A1.2 返工守卫：文档路径语义 ----
assert.doesNotMatch(
  indexHtml,
  /id="breadcrumbLibrary"|els\.breadcrumbLibrary|breadcrumbLibrary\.textContent/,
  "document toolbar must not render a library crumb (no breadcrumbLibrary element or state writes)"
);
assert.match(
  indexHtml,
  /const documentPath = tab\.item\?\.filePath \|\| tab\.item\?\.fileName \|\| tab\.preview\?\.title \|\| "";[\s\S]*?els\.breadcrumbItem\.title = documentPath;[\s\S]*?els\.breadcrumbItem\.setAttribute\("aria-label", documentPath\);/,
  "path must come from the current item filePath and keep the full path in title/aria-label"
);
assert.match(
  indexHtml,
  /<div class="breadcrumb">[\s\S]*?data-i18n-key="document\.file"[\s\S]*?<span>›<\/span>[\s\S]*?id="breadcrumbItem"/,
  "breadcrumb must be exactly 文件 › /abs/path (no library crumb between)"
);

// ---- A1.3 回滚守卫：保住 HTML controls overlay 已验证的按钮 tooltip 路径 ----
assert.match(
  runtimeOverlay,
  /\.action \.tip \{[\s\S]*?top: calc\(100% \+ 8px\);[\s\S]*?pointer-events: none;/,
  "HTML action tooltips must remain inside the existing controls overlay"
);
assert.match(
  runtimeOverlay,
  /\.action:hover \.tip \{ opacity: 1; \}/,
  "HTML action tooltips must remain visible on hover"
);
assert.match(
  runtimeOverlay,
  /querySelector\("\.row"\)\.addEventListener\("mouseenter"[\s\S]*?controlsHover = true;[\s\S]*?emitLayout\(\);[\s\S]*?querySelector\("\.row"\)\.addEventListener\("mouseleave"[\s\S]*?controlsHover = false;/,
  "HTML controls row hover must keep driving the stable overlay expansion path"
);
assert.match(
  indexHtml,
  /if \(appState\.runtimeControlsOverlayMode === "hover"\) return 68;/,
  "HTML controls hover height must remain 68px so the original button tooltips are not clipped"
);
assert.doesNotMatch(
  indexHtml + runtimeOverlay + htmlRuntimeRust,
  /runtimeControlsOverlayTooltipIntent|overlay-tooltip-open|overlay-tooltip-close|__NUTBOOK_TOOLTIP_BOUNDS_READY__|tooltip_token/,
  "the rejected A1.3 tooltip intent/ack state machine must stay removed"
);

// ---- A1.3 重新修复守卫：overlay 来源徽标 + 实测 viewport 门控 tooltip ----
assert.match(
  runtimeOverlay,
  /id="sourceBadgeChips"[\s\S]*?sourceBadges: \[\]/,
  "overlay must carry a source badge chip container backed by sourceBadges state"
);
assert.match(
  runtimeOverlay,
  /const BADGE_TIP_MIN_HEIGHT = 100;[\s\S]*?viewportSupportsBadgeTip\(\) \{[\s\S]*?window\.innerHeight[\s\S]*?>= BADGE_TIP_MIN_HEIGHT/,
  "badge tooltip must gate on the overlay's measured viewport height, never assume synchronous set_bounds"
);
assert.match(
  runtimeOverlay,
  /if \(pendingTip\) return "badge-tip";/,
  "a pending badge tooltip must drive the badge-tip expanded layout mode"
);
assert.match(
  runtimeOverlay,
  /\.source-badge \{[^{}]*max-width: 120px;[^{}]*min-width: 40px;/,
  "overlay source badges must cap at 120px (one full word) and keep a 40px readable min-width"
);
assert.match(
  runtimeOverlay,
  /\.source-badge-more \{[^{}]*flex: 0 0 auto;/,
  "overlay +N chips must stay non-shrinkable"
);
assert.match(
  indexHtml,
  /\["hover", "more", "tags", "badge-tip"\]/,
  "overlay-layout whitelist must accept badge-tip mode"
);
assert.match(
  indexHtml,
  /if \(appState\.runtimeControlsOverlayMode === "badge-tip"\) return 100;/,
  "host must expand the controls overlay to 100px for badge tooltips"
);
assert.match(
  indexHtml,
  /sourceBadges: Array\.isArray\(tab\.item\?\.sourceBadges\) \? tab\.item\.sourceBadges : \[\]/,
  "host must pass item.sourceBadges into the controls overlay attach payload"
);
assert.match(
  htmlRuntimeRust,
  /source_badges: Vec<ItemSourceBadge>/,
  "Rust controls overlay attach must accept structured source_badges"
);
assert.match(
  htmlRuntimeRust,
  /sourceBadges: \{source_badges_json\}/,
  "Rust overlay init/update scripts must inject sourceBadges into overlay state"
);

// ---- A1.3 第二轮守卫：HTML overlay 与 MD 工具栏视觉/压缩统一 + 自定义标签 tooltip ----
assert.match(
  runtimeOverlay,
  /\.source-badge \{[^{}]*background: rgba\(255, 255, 255, 0\.9\);[^{}]*border: 1px solid rgba\(31, 35, 40, 0\.16\);/,
  "overlay source badges must use the same light near-opaque style as the Markdown toolbar"
);
assert.match(
  runtimeOverlay,
  /id="customTagBtn"[\s\S]*?class="badge-tip" role="tooltip"[\s\S]*?id="customTagMore" class="tag-chip tag-chip-more"/,
  "custom tag chip must carry a badge-tip tooltip and a +N chip for multiple tags"
);
assert.match(
  runtimeOverlay,
  /TAG_ROW_TIP_SELECTOR = "\.source-badge, \.tag-chip\.custom-btn, \.tag-chip-more"/,
  "badge-tip wiring must cover source badges AND the custom tag chip / +N"
);
assert.match(
  indexHtml,
  /responsiveBudget = Math\.max\(240, Math\.round\(toolbarWidth \* 0\.46\) \+ actionWidth\)/,
  "overlay width must be responsive to the toolbar (46% budget) so tags compress with the window"
);
assert.match(
  indexHtml,
  /els\.breadcrumbTags\.style\.width = reserved > 0 \?/,
  "main toolbar must reserve the overlay width so the path compresses instead of being covered"
);
assert.match(
  indexHtml,
  /customTags: Array\.isArray\(tab\.item\?\.tags\) \? tab\.item\.tags : \[\]/,
  "host must pass all assigned custom tags into the controls overlay"
);
assert.match(
  runtimeOverlay,
  /\.tag-chip\.custom-btn \{[^{}]*min-width: 56px;[^{}]*max-width: min\(176px, 30vw\);/,
  "custom tag chip must prioritize full display (176px) with a 56px floor (>= 2 CJK chars, never just an ellipsis)"
);
assert.match(
  indexHtml,
  /customPrimaryWidth = customTags\.length[\s\S]*?Math\.min\(176, Math\.max\(56, String\(customTags\[0\]\.name[\s\S]*?\* 12 \+ 24\)\)/,
  "host width budget must use a realistic 12px/char estimate and the 176px custom cap with a 56px floor"
);
assert.match(
  indexHtml,
  /badgePrimaryWidth = \(badges\) => badges\.length[\s\S]*?Math\.min\(120, Math\.max\(40,[\s\S]*?\* 12 \+ 24\)\)/,
  "host width budget for source badges must use the 120px one-word cap"
);
assert.match(
  htmlRuntimeRust,
  /custom_tags: Vec<Tag>/,
  "Rust controls overlay attach must accept all assigned custom tags"
);

// ===== A2 最近搜索静态守卫 =====
assert.match(
  indexHtml,
  /const RECENT_SEARCHES_KEY = "nutbook\.recentSearches\.v1"[\s\S]*?const RECENT_SEARCHES_MAX = 3/,
  "recent search history must live under nutbook.recentSearches.v1 with a 3-item cap"
);
assert.match(
  indexHtml,
  /function readRecentSearches\(\)[\s\S]*?JSON\.parse\(raw\)[\s\S]*?Array\.isArray\(parsed\)[\s\S]*?catch \(_\)[\s\S]*?return \[\];/,
  "recent search reads must defensively tolerate corrupted localStorage and fall back to an empty array"
);
assert.match(
  indexHtml,
  /function writeRecentSearches\(items\)[\s\S]*?storage\.removeItem\(RECENT_SEARCHES_KEY\)[\s\S]*?catch \(_\)/,
  "recent search writes must be defensive and remove the key when the history empties"
);
assert.match(
  indexHtml,
  /function recordRecentSearch\(query\)[\s\S]*?toLowerCase\(\) !== keyword\.toLowerCase\(\)[\s\S]*?deduped\.unshift\(keyword\)/,
  "recording a search must dedupe case-insensitively and keep the newest display text at the front"
);
assert.match(
  indexHtml,
  /async function executeSearch\(query, \{ recordHistory \} = \{\}\)[\s\S]*?if \(recordHistory && ok !== false\) \{\s*recordRecentSearch\(query\);/,
  "executeSearch must record history only after a real successful search (zero-result counts, backend failure does not)"
);
assert.match(
  indexHtml,
  /role="combobox" aria-expanded="false" aria-controls="recentSearchPopup" aria-autocomplete="list"/,
  "both search inputs must expose combobox semantics pointing at the shared history popup"
);
assert.match(
  indexHtml,
  /<div id="recentSearchPopup" class="recent-search-popup" role="listbox" aria-label="" data-i18n-skip><\/div>/,
  "the shared history popup must be a single i18n-skipped listbox element"
);
assert.match(
  indexHtml,
  /function openRecentSearchPopup\(anchor\)[\s\S]*?els\.mainShell\.classList\.contains\("home-mode"\)[\s\S]*?document\.activeElement !== anchor[\s\S]*?String\(anchor\.value \|\| ""\)\.trim\(\)/,
  "the history popup may only open in home-mode when the anchor is focused and its input is empty"
);
assert.match(
  indexHtml,
  /function closeRecentSearchPopup\(options = \{\}\)[\s\S]*?popup\.classList\.remove\("open"\)[\s\S]*?removeAttribute\("aria-activedescendant"\)/,
  "closing the popup must reset expanded and activedescendant state on both inputs"
);
assert.match(
  indexHtml,
  /event\.isComposing \|\| isComposingSearch \|\| event\.key === "Process" \|\| event\.keyCode === 229/,
  "search key handling must ignore IME composition, the Process key and keyCode 229"
);
assert.match(
  indexHtml,
  /if \(event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"\)[\s\S]*?moveRecentSearchActive\(event\.key === "ArrowDown" \? 1 : -1\)/,
  "ArrowUp/ArrowDown must drive listbox navigation inside the history popup"
);
assert.match(
  indexHtml,
  /if \(event\.key === "Escape"\)[\s\S]*?closeRecentSearchPopup\(\{ refocus: true \}\)/,
  "Escape must close the history popup and restore focus to the search input"
);
assert.match(
  indexHtml,
  /if \(event\.key === "Tab"\)[\s\S]*?if \(isRecentSearchPopupOpen\(\)\) closeRecentSearchPopup\(\);[\s\S]*?return;/,
  "Tab must close the popup and let focus move on naturally"
);
assert.match(
  indexHtml,
  /querySelectorAll\("\.recent-search-remove"\)[\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.stopPropagation\(\)[\s\S]*?removeRecentSearchItem/,
  "the per-item delete button must prevent pointerdown blur and stop click propagation without searching"
);
assert.match(
  indexHtml,
  /function applyRecentSearchItem\(index\)[\s\S]*?syncSearchInputs\(item\)[\s\S]*?executeSearch\(item, \{ recordHistory: false \}\)/,
  "clicking a history item must sync both search inputs and search without reordering history"
);
assert.match(
  indexHtml,
  /function removeRecentSearchItem\(index\)[\s\S]*?writeRecentSearches\(items\)[\s\S]*?renderRecentSearchPopup\(\)[\s\S]*?positionRecentSearchPopup\(recentSearchAnchor\)/,
  "deleting one history item must keep the popup open and re-render in place"
);
assert.match(
  indexHtml,
  /function handleRecentSearchOutsidePointerDown\(event\)[\s\S]*?recentSearchAnchor && target === recentSearchAnchor[\s\S]*?closeRecentSearchPopup\(\)/,
  "outside pointerdown must close the popup without closing it when the anchor itself is pressed"
);
assert.match(
  indexHtml,
  /if \(!homeMode\) closeRecentSearchPopup\(\);/,
  "switching to document mode must close the history popup so no plain DOM popup can cover the HTML runtime"
);
assert.match(
  indexHtml,
  /if \(!rawValue\.trim\(\)\)[\s\S]*?openRecentSearchPopup\(input\)[\s\S]*?closeRecentSearchPopup\(\);[\s\S]*?scheduleSearch\(input\)/,
  "typing must close the popup and clearing the input while focused must reopen it"
);

// ---- B2：HTML 保存后异步刷新（部分成功合同 + stale preview → ready/placeholder）----

// 1. saveActiveHtmlEditPatch 必须区分"保存成功但索引待同步"与保存失败，且只在
//    索引同步后排队；排队是 fire-and-forget（保存流程不等待 Chromium）。
assert.match(
  indexHtml,
  /async function saveActiveHtmlEditPatch\(\)[\s\S]*?const indexSyncPending = result\?\.indexSynchronized === false;[\s\S]*?setStatus\(t\("htmlEdit\.savedIndexPending"\), "warn"\)[\s\S]*?queueThumbnailRefreshAfterHtmlSave\(session\.itemId, result\)/,
  "save must keep the index-pending warning and queue the thumbnail refresh only after index sync"
);
assert.match(
  indexHtml,
  /if \(indexSyncPending\) \{\s*setStatus\(t\("htmlEdit\.savedIndexPending"\), "warn"\);\s*\} else \{\s*setStatus\(t\("htmlEdit\.saved"\), "ok"\);\s*\}/,
  "the terminal save status must keep the index-pending warning instead of overwriting it with a plain saved"
);
assert.doesNotMatch(
  indexHtml,
  /await queueThumbnailRefreshAfterHtmlSave\(/,
  "the save path must never await the thumbnail queue (no capture on the durable-save critical path)"
);
assert.match(
  indexHtml,
  /queueThumbnailRefreshAfterHtmlSave\(itemId, commitResult\)[\s\S]*?ensureDocumentThumbnails\(\[item\], \{ quiet: true \}\)/,
  "the save-triggered queue must target only the current item and stay quiet so it cannot overwrite the save ack"
);

// 2. stale preview 是会话内非持久视觉 preview，且渲染是纯函数（绝不写回 item.thumbnail）。
{
  const thumbNodeSrc = extractFunctionSource(indexHtml, "function thumbnailNode(item) {");
  assert.match(
    thumbNodeSrc,
    /const stalePreview = appState\.stalePreviewThumbnails\.get\(item\.id\);[\s\S]*?stalePreview\.state === "preview"[\s\S]*?canGenerateDocumentThumbnails\(\)/,
    "stale preview must be a session-only preview gated on engine availability"
  );
  assert.match(
    thumbNodeSrc,
    /aria-busy="true"[\s\S]*?thumb-refresh-mask[\s\S]*?t\("status\.thumbnailUpdating"\)/,
    "stale preview must carry aria-busy, a mask and the localized updating label"
  );
  assert.doesNotMatch(thumbNodeSrc, /item\.thumbnail = /, "thumbnailNode must be pure and never write item.thumbnail");
}

// 3. i18n：新文案必须中英双语，不能硬编码用户可见字符串。
assert.match(i18n, /savedIndexPending: "内容已保存，缩略图索引待同步"/, "zh htmlEdit.savedIndexPending");
assert.match(i18n, /savedIndexPending: "Saved\. Thumbnail index pending sync\."/, "en htmlEdit.savedIndexPending");
assert.match(i18n, /thumbnailUpdating: "正在更新缩略图"/, "zh status.thumbnailUpdating");
assert.match(i18n, /thumbnailUpdating: "Updating thumbnail…"/, "en status.thumbnailUpdating");
assert.match(i18n, /thumbnailRefreshFailedShort: "缩略图更新失败，可稍后重试"/, "zh status.thumbnailRefreshFailedShort");
assert.match(i18n, /thumbnailRefreshFailedShort: "Thumbnail update failed\. Try again later\."/, "en status.thumbnailRefreshFailedShort");

// 4. 可执行：queueThumbnailRefreshAfterHtmlSave 记录旧图为 stale preview、置空
//    item.thumbnail、只为目标 item 排队（quiet）。
{
  const queueSrc = extractFunctionSource(indexHtml, "function queueThumbnailRefreshAfterHtmlSave(itemId, commitResult) {");
  const run = new Function(`
    ${queueSrc}
    const queueCalls = [];
    const updatedCards = [];
    const appState = {
      items: [{ id: 1, fileType: "html", pathState: "valid", thumbnail: { path: "old.png", status: "ready" } }],
      stalePreviewThumbnails: new Map()
    };
    const updateCardThumbnail = (item) => updatedCards.push(item.id);
    const ensureDocumentThumbnails = async (items, options) => {
      queueCalls.push({ items: items.map((i) => i.id), options });
    };
    queueThumbnailRefreshAfterHtmlSave(1, { desiredKey: "k2", generation: 2 });
    return {
      staleEntry: appState.stalePreviewThumbnails.get(1),
      itemThumbnail: appState.items[0].thumbnail,
      itemRefreshing: appState.items[0]._thumbRefreshing,
      itemFailed: appState.items[0]._thumbFailed,
      desiredKey: appState.items[0]._thumbDesiredKey,
      generation: appState.items[0]._thumbGeneration,
      updatedCards,
      queueCalls
    };
  `)();
  assert.equal(run.staleEntry?.state, "preview", "old image must be kept as a session preview");
  assert.equal(run.staleEntry?.thumbnail?.path, "old.png", "stale preview keeps the old ready path");
  assert.equal(run.itemThumbnail, null, "item.thumbnail must be nulled so the queue picks it up");
  assert.equal(run.itemRefreshing, true, "item must be flagged refreshing");
  assert.equal(run.itemFailed, false);
  assert.equal(run.desiredKey, "k2", "commit desired key must be projected onto the in-memory item");
  assert.equal(run.generation, 2, "commit generation must be projected onto the in-memory item");
  assert.deepEqual(run.updatedCards, [1], "the stale preview must enter the real card DOM before capture starts");
  assert.equal(run.queueCalls.length, 1, "exactly one queue entry per save");
  assert.deepEqual(run.queueCalls[0].items, [1], "only the current item is queued");
  assert.equal(run.queueCalls[0].options.quiet, true, "save-triggered queue must be quiet");
}

// 5. 可执行：thumbnailNode 的 stale preview → placeholder 语义。
{
  const thumbNodeSrc = extractFunctionSource(indexHtml, "function thumbnailNode(item) {");
  const run = new Function(`
    ${thumbNodeSrc}
    const t = (key) => key;
    const escapeHtml = (value) => String(value ?? "");
    const escapeAttribute = (value) => String(value ?? "").replace(/"/g, "&quot;");
    const isItemPathMissing = (item) => (item?.pathState || "valid") === "missing";
    let engineAvailable = true;
    const canGenerateDocumentThumbnails = () => engineAvailable;
    const stalePreviewThumbnails = new Map();
    const appState = { stalePreviewThumbnails };
    function render(item) {
      try {
        return thumbnailNode(item);
      } catch (error) {
        return "THREW:" + error.message;
      }
    }
    const readyItem = { id: 1, fileType: "html", pathState: "valid", tags: [], sourceBadges: [], thumbnail: { path: "http://x/new.png", status: "ready" } };
    const staleItem = { id: 2, fileType: "html", pathState: "valid", tags: [], sourceBadges: [], thumbnail: null, _thumbRefreshing: true };
    const failedItem = { id: 3, fileType: "html", pathState: "valid", tags: [], sourceBadges: [], thumbnail: null, _thumbFailed: true };
    stalePreviewThumbnails.set(2, { thumbnail: { path: "http://x/old.png" }, state: "preview" });
    stalePreviewThumbnails.set(3, { thumbnail: { path: "http://x/old3.png" }, state: "failed" });
    const readyHtml = render(readyItem);
    const staleHtml = render(staleItem);
    const failedHtml = render(failedItem);
    engineAvailable = false;
    const staleHtmlEngineDown = render(staleItem);
    return { readyHtml, staleHtml, failedHtml, staleHtmlEngineDown };
  `)();
  assert.doesNotMatch(run.readyHtml, /thumb-refresh-mask/, "ready must not show the refresh mask");
  assert.doesNotMatch(run.readyHtml, /aria-busy/, "ready must not be busy");
  assert.match(run.readyHtml, /new\.png/, "ready image must be shown directly");
  assert.match(run.staleHtml, /thumb-refreshing/, "stale preview must mark the container");
  assert.match(run.staleHtml, /aria-busy="true"/, "stale preview must set aria-busy on the thumbnail container");
  assert.match(run.staleHtml, /thumb-refresh-mask/, "stale preview must have a mask");
  assert.match(run.staleHtml, /status\.thumbnailUpdating/, "stale preview must use the localized updating label");
  assert.match(run.staleHtml, /old\.png/, "stale preview may briefly show the old image");
  assert.doesNotMatch(run.failedHtml, /thumb-refresh-mask/, "a failed entry must not keep impersonating an updating preview");
  assert.doesNotMatch(run.failedHtml, /old3\.png/, "a failed entry must not show the old image as a product");
  assert.match(run.failedHtml, /html-thumb-card/, "a failed entry must fall back to the explicit placeholder");
  assert.doesNotMatch(run.staleHtmlEngineDown, /old\.png/, "engine unavailable must not keep showing the old image");
  assert.doesNotMatch(run.staleHtmlEngineDown, /aria-busy/, "engine unavailable must not claim it is updating");
  assert.match(run.staleHtmlEngineDown, /html-thumb-card/, "engine unavailable must show the retryable placeholder");
}

// 6. 可执行：ensureDocumentThumbnails 的 quiet 语义——成功不清除"已保存"状态、
//    单卡替换、stale preview 清空；失败切换 placeholder、用缩略图专用文案（不覆盖保存状态）。
{
  const ensureSrc = extractFunctionSource(indexHtml, "async function ensureDocumentThumbnails(items, options) {");
  async function runEnsure(mode) {
    return new Function(`
      ${ensureSrc}
      const t = (key) => key;
      const statuses = [];
      const setStatus = (message, tone) => statuses.push({ message, tone });
      const canGenerateDocumentThumbnails = () => true;
      const thumbnailEngineNeedsAttention = () => false;
      const thumbnailProgressMessage = () => "progress";
      const supportsGeneratedThumbnail = (item) => item.fileType === "html" || item.fileType === "markdown";
      const isItemPathMissing = (item) => (item?.pathState || "valid") === "missing";
      const waitForThumbnailSlot = async () => true;
      const delay = async () => {};
      const appState = {
        items: [],
        pendingThumbnailIds: new Set(),
        thumbnailQueueRunId: 0,
        thumbnailQueueActive: false,
        stalePreviewThumbnails: new Map()
      };
      const updatedCards = [];
      const updateCardThumbnail = (item) => updatedCards.push(item.id);
      const mode = ${JSON.stringify(mode)};
      appState.items.push({ id: 7, fileType: "html", pathState: "valid", thumbnail: null, _thumbRefreshing: true, _thumbFailed: false });
      appState.stalePreviewThumbnails.set(7, { thumbnail: { path: "old.png" }, state: "preview" });
      const generateThumbnailOnce = async (item, runId) => {
        if (mode === "fail") return { ok: false, reason: "failed" };
        item.thumbnail = { path: "new.png", status: "ready" };
        return { ok: true, reason: "applied" };
      };
      return ensureDocumentThumbnails([appState.items[0]], { quiet: true }).then(() => ({
        statuses,
        staleEntry: appState.stalePreviewThumbnails.get(7),
        itemThumbnail: appState.items[0].thumbnail ? appState.items[0].thumbnail.path : null,
        itemRefreshing: appState.items[0]._thumbRefreshing,
        itemFailed: appState.items[0]._thumbFailed,
        updatedCards
      }));
    `)();
  }
  const ok = await runEnsure("ok");
  assert.deepEqual(ok.statuses, [], "quiet success must not overwrite the save ack status");
  assert.equal(ok.staleEntry, undefined, "ready must clear the stale preview entry");
  assert.equal(ok.itemThumbnail, "new.png", "ready result must be applied to the item");
  assert.equal(ok.itemRefreshing, false, "refreshing flag must clear on ready");
  assert.equal(ok.itemFailed, false);
  assert.deepEqual(ok.updatedCards, [7], "ready must replace exactly the single card (keyed update)");

  const fail = await runEnsure("fail");
  assert.equal(fail.statuses.length, 1, "quiet failure must emit exactly one status");
  assert.equal(fail.statuses[0].message, "status.thumbnailRefreshFailedShort", "thumbnail failure must use its own copy, never a save-failure string");
  assert.equal(fail.statuses[0].tone, "warn", "failure must never be a green success");
  assert.equal(fail.staleEntry?.state, "failed", "failure must stop stale preview impersonating ready");
  assert.equal(fail.itemThumbnail, null, "failed item must not get a ready path");
  assert.equal(fail.itemRefreshing, false, "refreshing flag must clear on failure");
  assert.equal(fail.itemFailed, true, "failed item must be flagged for placeholder rendering");
  assert.deepEqual(fail.updatedCards, [7], "failure must replace the single card with the placeholder");
}

// 7. 可执行：loadItems / 新 save 取消旧 run 时，新队列即使撞到旧 pending slot
//    也必须等待 owner 释放后接管，不能把最新 generation 静默漏掉。
{
  const waitSrc = extractFunctionSource(indexHtml, "async function waitForThumbnailSlot(itemId, runId) {");
  const ensureSrc = extractFunctionSource(indexHtml, "async function ensureDocumentThumbnails(items, options) {");
  const result = await new Function(`
    ${waitSrc}
    ${ensureSrc}
    const t = (key) => key;
    const statuses = [];
    const setStatus = (message, tone) => statuses.push({ message, tone });
    const canGenerateDocumentThumbnails = () => true;
    const thumbnailEngineNeedsAttention = () => false;
    const thumbnailProgressMessage = () => "progress";
    const supportsGeneratedThumbnail = (item) => item.fileType === "html";
    const isItemPathMissing = () => false;
    const item = { id: 7, fileType: "html", pathState: "valid", thumbnail: null };
    const appState = {
      items: [item],
      pendingThumbnailIds: new Set([7]),
      thumbnailQueueRunId: 10,
      thumbnailQueueActive: true,
      stalePreviewThumbnails: new Map([[7, { thumbnail: { path: "old.png" }, state: "preview" }]])
    };
    let delayCalls = 0;
    const delay = async () => {
      delayCalls += 1;
      if (delayCalls === 1) appState.pendingThumbnailIds.delete(7);
    };
    let generateCalls = 0;
    const generateThumbnailOnce = async (current, runId) => {
      generateCalls += 1;
      current.thumbnail = { path: "latest.png", status: "ready" };
      return { ok: true, reason: "applied", runId };
    };
    const updatedCards = [];
    const updateCardThumbnail = (current) => updatedCards.push(current.id);
    return (async () => {
      await ensureDocumentThumbnails([item], { quiet: true });
      return {
        generateCalls,
        delayCalls,
        updatedCards,
        pending: appState.pendingThumbnailIds.has(7),
        staleEntry: appState.stalePreviewThumbnails.get(7),
        thumbnail: item.thumbnail
      };
    })();
  `)();
  assert.equal(result.generateCalls, 1, "the replacement run must generate after the old slot is released");
  assert.ok(result.delayCalls >= 2, "the replacement run must wait for the old slot and then yield before capture");
  assert.deepEqual(result.updatedCards, [7], "the handed-off run must settle the current card exactly once");
  assert.equal(result.pending, false, "the handed-off owner must release the slot");
  assert.equal(result.staleEntry, undefined, "latest ready must clear the stale preview after handoff");
  assert.equal(result.thumbnail?.path, "latest.png");
}

// PR B / Task B3: unified Markdown document title source of truth.
const documentTitleAsset = readFileSync("dist/assets/markdown-document-title.js", "utf8");
const documentTitleSource = readFileSync("src/markdown-document-title.js", "utf8");
const titleCommitSection = indexFunctionSection("commitMarkdownDocumentTitle", "syncMarkdownTitleInputFromDocument");
assert.match(documentTitleAsset, /NutbookDocumentTitle/, "the document title asset must expose the shared parser");
assert.match(documentTitleSource, /export function parseDocumentTitle/, "the source module must export the authoritative parser");
assert.match(documentTitleSource, /export function setDocumentTitleInSource/, "the source module must export the fallback transform");
assert.match(documentTitleSource, /export function headingDisplayText/, "the source module must export the AST display-text extractor");
assert.match(documentTitleSource, /mdast-util-from-markdown/, "the source module must use a real Markdown AST (micromark mdast)");
assert.doesNotMatch(documentTitleSource, /function inlinePlainText/, "the handwritten inline tokenizer must be removed");
assert.doesNotMatch(documentTitleSource, /function parseLinkOrImage/, "the recursive link/image tokenizer must be removed");
assert.match(documentTitleSource, /case "linkReference":/, "reference links must be resolved from the AST label");
assert.match(markdownEditor, /setDocumentTitle\(nextTitle\)/, "the editor API must expose setDocumentTitle");
assert.match(markdownEditor, /getDocumentTitle\(\)/, "the editor API must expose getDocumentTitle");
assert.match(markdownEditor, /findFirstEffectiveHeading/, "the editor must resolve the first effective heading");
assert.match(markdownEditor, /closeHistory\(tr\)/, "each title edit must close the open history event and stay one step");
assert.match(markdownEditor, /window\.NutbookMarkdownEditor = \{[\s\S]*?parseDocumentTitle/, "the bundle must expose the shared parser statically");
assert.doesNotMatch(indexHtml, /function findMarkdownDocumentTitleLine/, "the old line-scan title parser must be removed from the host");
assert.doesNotMatch(indexHtml, /function cleanMarkdownHeadingText/, "the old regex title cleaner must be removed from the host");
assert.doesNotMatch(titleCommitSection, /cleanupMarkdownEditor\(\)/, "the title commit path must not destroy the editor");
assert.doesNotMatch(titleCommitSection, /renderViewer\(\)/, "the title commit path must not remount the viewer");
assert.match(titleCommitSection, /setDocumentTitle\(nextTitle\)/, "the Milkdown path must call the editor title transaction");
assert.match(titleCommitSection, /setMarkdownDocumentTitle\(current, nextTitle\)/, "the source fallback must use the shared transform");
assert.match(indexHtml, /assets\/markdown-document-title\.js/, "the host must load the shared document title asset");
assert.match(indexHtml, /syncMarkdownTitleInputFromDocument/, "undo/redo and edits must resync the title input");
assert.match(
  markdownDocumentRust,
  /DocumentTitle::parse[\s\S]*?\.display_text/,
  "the Rust preview title must come from the authoritative DocumentTitle parser"
);
assert.match(
  previewCommandsRust,
  /DocumentTitle::parse\(&content, &item\.summary\.file_name\)\.display_text/,
  "the markdown export default file name must use the authoritative parser result"
);

// B3 复审 P1：标题输入框与 ProseMirror 的 undo 路由重新划分。
// - 焦点在标题输入框且未提交 → 自维护的按 input 事件粒度的文本 history
//   （WKWebView 原生 undo 会把整个输入会话合并成一个单元——输入 abc 后
//   ⌘Z 一次删光三个字母；自维护快照栈保证逐字符回退），不触碰 ProseMirror。
// - 焦点在 ProseMirror → 只用 PM history，栈空绝不 fallback 到
//   document.execCommand（WKWebView contenteditable 原生栈污染 PM state）。
// - PM undo/redo 成功后强制同步标题输入框；无 H1 时显示文件名 fallback。
const nativeEditHistory = indexFunctionSection("handleNativeEditHistory", "handleNativeMenuAction");
assert.match(
  nativeEditHistory,
  /if \(active === titleInput\)[\s\S]*?(undoMarkdownTitleInput|redoMarkdownTitleInput)/,
  "焦点在标题输入框（未提交）时 undo/redo 必须走标题输入框自维护文本 history，不触碰 ProseMirror"
);
assert.match(
  nativeEditHistory,
  /closest\?\.\(\s*"\.milkdown-editor-root"\s*\)[\s\S]*?return false[\s\S]*?if \(isFormField\)/,
  "PM undo/redo 落空时必须直接返回，不得进入 execCommand fallback"
);
assert.match(
  nativeEditHistory,
  /const display = currentTitle \|\| tab\.item\?\.fileName/,
  "PM undo/redo 成功后必须把标题输入框同步到新文档标题（无 H1 显示文件名）"
);
assert.match(
  nativeEditHistory,
  /if \(isFormField\)[\s\S]*?document\.execCommand/,
  "普通 input/textarea（非标题输入框）保持原生表单 undo"
);

// B3 复审修复：标题输入框自维护逐字符 undo/redo（WKWebView 原生 undo 会话
// 合并）。每次用户 input 事件产生一个快照步骤；程序化设值走 setTitleInputValue
// 清空编辑栈，保证栈与真实值对齐。
const titleCommitSetupSection = indexFunctionSection("autosizeMarkdownTitleInput", "updateMarkdownStatusHint");
assert.match(
  titleCommitSetupSection,
  /const titleInputEditSessions = new WeakMap\(\)/,
  "标题输入框必须维护独立编辑会话（WeakMap）"
);
assert.match(
  titleCommitSetupSection,
  /function setTitleInputValue[\s\S]*?undoStack\.length = 0/,
  "程序化设值必须清空标题输入框编辑栈（对齐真实值）"
);
assert.match(
  titleCommitSetupSection,
  /addEventListener\("input", \(\) => \{[\s\S]*?undoStack\.push\(session\.lastValue\)/,
  "每次用户 input 事件必须产生一个撤销步骤（逐字符粒度）"
);
assert.match(
  titleCommitSetupSection,
  /function undoMarkdownTitleInput[\s\S]*?undoStack\.pop\(\)/,
  "标题输入框 undo 必须恢复最近一次输入前快照"
);

// B3 GUI 验收修复（保存瞬间回旧标题）+ P0 统一收敛：⌘S 保存前必须把标题
// 输入框未提交的值 commit 进文档，否则用户输入新标题后直接 ⌘S（未 Enter/blur）
// 会保存旧标题。收敛逻辑统一收敛到 convergePendingMarkdownTitle（⌘S / 关闭
// 单个标签 / 关闭全部标签 / 应用退出共用）；composition 中返回 false 不强制提交。
const saveActiveSection = indexFunctionSection("saveActiveMarkdown", "exportActiveMarkdown");
assert.match(
  saveActiveSection,
  /convergePendingMarkdownTitle\(tab\)/,
  "⌘S 保存前必须先收敛标题输入框的未提交值（统一收敛函数）"
);
assert.match(
  saveActiveSection,
  /输入法组合中[\s\S]*?请先确认输入再保存/,
  "composition 中 ⌘S 必须阻止保存并给出可理解状态"
);
const convergeSection = indexFunctionSection("convergePendingMarkdownTitle", "syncMarkdownTitleInputFromDocument");
assert.match(
  convergeSection,
  /function convergePendingMarkdownTitle[\s\S]*?commitMarkdownDocumentTitle\(tab, input\)/,
  "统一收敛函数必须在标题值不同且非 composition 时通过一次 PM transaction 提交"
);
assert.match(
  convergeSection,
  /if \(appState\.markdownTitleInputComposing\) return false/,
  "composition 尚未结束时收敛函数必须返回 false（不得强制提交）"
);

// B3 GUI 验收修复（保存后无法撤销）：saveMarkdownTab 保存成功后不得调用
// renderViewer() 重建整个 viewer——重建会销毁 milkdownEditorRoot，导致
// PM history 全部丢失，用户保存后无法 ⌘Z/⇧⌘Z 撤销保存前的修改。必须改为
// 局部刷新（preview HTML + input + meta），保留编辑器实例与 history。
const saveMarkdownTabSection = indexFunctionSection("saveMarkdownTab", "saveActiveMarkdown");
const saveMarkdownTabRenderBranch = saveMarkdownTabSection.match(/if \(renderAfter\) \{[\s\S]*?\n          \}/);
assert.ok(saveMarkdownTabRenderBranch, "saveMarkdownTab must have a renderAfter branch");
assert.doesNotMatch(
  saveMarkdownTabRenderBranch[0],
  /\brenderViewer\s*\(\s*\)/,
  "saveMarkdownTab 的 renderAfter 分支不得调用 renderViewer()，否则会重建编辑器与丢失 PM history"
);
assert.match(
  saveMarkdownTabRenderBranch[0],
  /previewEl.*innerHTML|querySelector\(\s*"\.markdown-preview"\s*\)/,
  "renderAfter 分支必须刷新 preview HTML 元素"
);
assert.match(
  saveMarkdownTabRenderBranch[0],
  /setTitleInputValue\(\s*titleInput\s*,[\s\S]*?markdownDocumentTitle/,
  "renderAfter 分支必须刷新标题输入框 value（经 setTitleInputValue 对齐编辑栈）"
);

// B3 P0（标题输入框聚焦未 blur 时应用退出/关闭丢失标题）：退出确认与关闭
// 标签都必须先收敛标题输入框未提交的值；composition 中阻止退出/关闭。
const confirmExitSection = indexFunctionSection("confirmMarkdownAppExitIfNeeded", "confirmAppExitIfNeeded");
assert.match(
  confirmExitSection,
  /convergePendingMarkdownTitle\(activeTab\)[\s\S]*?return false/,
  "应用退出前必须收敛标题输入框未提交的值；composition 中阻止退出"
);
assert.match(
  confirmExitSection,
  /captureActiveMarkdownDraft\(\)/,
  "收敛后仍需 capture ProseMirror draft 计算 dirty"
);
const closeOpenTabSection = indexFunctionSection("closeOpenTab", "setSidebarCollapsed");
assert.match(
  closeOpenTabSection,
  /convergePendingMarkdownTitle\(tab\)/,
  "关闭标签前必须收敛标题输入框未提交的值"
);

// B3 P1（IME 标题撤销栈）：compositionstart 保存组合前值；composition 中间
// input 不入栈；compositionend 把整个组合结果记为一个 undo 单元。
assert.match(
  titleCommitSetupSection,
  /compositionstart[\s\S]*?composingStartValue = input\.value/,
  "compositionstart 必须保存本次组合前的 value"
);
assert.match(
  titleCommitSetupSection,
  /compositionend[\s\S]*?undoStack\.push\(session\.composingStartValue\)/,
  "compositionend 必须把整个组合结果记为一个 undo 单元"
);
assert.match(
  titleCommitSetupSection,
  /if \(!appState\.markdownTitleInputComposing && input\.value !== session\.lastValue\)/,
  "composition 中间 input 不得入栈"
);
assert.match(
  titleCommitSetupSection,
  /composingStartValue = null/,
  "compositionend 后必须清除组合前值标记"
);

// B3 P1（renderAfter=false 持久状态收敛）：durable save 后无论 renderAfter
// true/false 都 loadItems 一次收敛首页持久 item 状态；loadItems 最多一次。
const saveMarkdownTabPreRender = saveMarkdownTabSection.slice(0, saveMarkdownTabSection.indexOf("if (renderAfter)"));
assert.match(
  saveMarkdownTabPreRender,
  /await loadItems\(\)/,
  "loadItems 必须位于 renderAfter 分支之前（renderAfter=false 也要收敛持久 item 状态）"
);
assert.equal(
  (saveMarkdownTabSection.match(/await loadItems\(\)/g) || []).length,
  1,
  "saveMarkdownTab 中 loadItems 只能调用一次（B3 复审 P2）"
);

// B3 复审 P2：durable save 后首页 item 只刷新一次（renderAfter 分支外的重复
// loadItems 已删除），且 renderAfter=false 退出路径不刷新首页。
assert.equal(
  (saveMarkdownTabSection.match(/await loadItems\(\)/g) || []).length,
  1,
  "saveMarkdownTab 中 loadItems() 只能出现一次（删除重复刷新）"
);

// B3 复审 P1：无 H1 文档 undo 后 fallback 恢复文件名。
// tab.preview 是最近一次 durable preview，未保存标题事务不得改写它。
const commitSection = indexFunctionSection("commitMarkdownDocumentTitle", "syncMarkdownTitleInputFromDocument");
assert.doesNotMatch(
  commitSection,
  /preview\.title\s*=\s*nextTitle/,
  "未保存的标题事务不得改写 tab.preview.title（durable preview 仅在保存成功后替换）"
);
assert.match(
  indexHtml,
  /function currentMarkdownDisplayTitle[\s\S]*?tab\.item\?\.fileName \|\| "Markdown"/,
  "当前标题必须从 editor/draft 派生，无 H1 fallback 固定使用真实文件名"
);
assert.match(
  indexHtml,
  /function syncMarkdownTitleInputFromDocument[\s\S]*?tab\.item\?\.fileName \|\| "Markdown"/,
  "onChange 同步的无 H1 fallback 必须使用真实文件名，不得读 tab.preview.title"
);

// B3 复审 P2：顶部标题输入框为自动增高 textarea（超长标题换行）。
assert.match(
  indexHtml,
  /<textarea id="markdownTitleInput"/,
  "标题输入框必须改为 textarea（B3 复审 P2 超长标题自动换行）"
);
assert.match(
  indexHtml,
  /function autosizeMarkdownTitleInput[\s\S]*?scrollHeight/,
  "必须提供基于 scrollHeight 的自动增高函数"
);
assert.match(
  indexHtml,
  /\.markdown-title-input \{[\s\S]*?resize: none[\s\S]*?overflow-wrap: anywhere/,
  "标题输入框 CSS 必须 resize:none + overflow-wrap:anywhere（长 Latin 不撑出横向滚动）"
);

// B3 复审 P0：Rust 端使用 pulldown-cmark AST，不再手写行扫描状态机。
const documentTitleRust = readFileSync("src-tauri/src/core/document_title.rs", "utf8");
assert.match(
  documentTitleRust,
  /pulldown_cmark::\{Event, HeadingLevel, Options, Parser/,
  "Rust DocumentTitle 必须使用 pulldown-cmark AST parser"
);
assert.match(
  documentTitleRust,
  /into_offset_iter\(\)/,
  "Rust parser 必须使用 source offset 迭代器构建 locator"
);
assert.doesNotMatch(
  documentTitleRust,
  /fn inline_plain_text|fn parse_link_or_image/,
  "手写 inline tokenizer 与递归链接解析必须从 Rust 移除"
);
assert.match(
  srcTauriCargoToml,
  /pulldown-cmark = /,
  "Cargo.toml 必须声明 pulldown-cmark 直接依赖"
);

console.log("Nutbook regression guards passed.");
