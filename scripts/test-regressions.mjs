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
const markdownDocumentRust = readFileSync("src-tauri/src/core/document.rs", "utf8");
const readmeEnglish = readFileSync("README.md", "utf8");
const readmeChinese = readFileSync("README-CN.md", "utf8");
const htmlEditRuntime = readFileSync("dist/assets/html-edit-runtime.js", "utf8");
const htmlEditConverter = readFileSync("dist/assets/html-edit-converter.js", "utf8");
const richTextFixture = readFileSync("src-tauri/tests/fixtures/html-edit/editable-rich-text.html", "utf8");
const htmlRuntimeRust = readFileSync("src-tauri/src/core/html_runtime.rs", "utf8");
const previewCommandsRust = readFileSync("src-tauri/src/commands/preview.rs", "utf8");
const htmlEditCommandsRust = readFileSync("src-tauri/src/commands/html_edit.rs", "utf8");
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
  /__NUTBOOK_REQUEST_HTML_EDIT_APP_EXIT__\s*=[\s\S]*?confirmHtmlEditLeaveIfNeeded\(session\.itemId, \{ source: "app-exit" \}\)[\s\S]*?invoke\("finalize_html_edit_app_exit_command"\)/,
  "the app-close bridge must reuse save/discard/keep and only finalize after it permits leaving"
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
  /const isMarkdownEditorKeyEvent = Boolean\(event\.target\?\.closest\?\.\("\.milkdown-editor-root \.ProseMirror"\)\);[\s\S]*?if \(isMarkdownEditorKeyEvent\) return;/,
  "global keyboard shortcuts must leave ordinary Milkdown typing entirely to the editor"
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
  /\.portable-image-block\.ProseMirror-selectednode\s*\{[\s\S]*?outline:\s*1px solid var\(--line-strong\)/,
  "portable image node selection must use the neutral Nutbook outline instead of ProseMirror blue"
);
assert.match(
  markdownDocumentRust,
  /portable_image_html_candidate[\s\S]*?sanitize_portable_image_html[\s\S]*?markdown_image\(trimmed\)[\s\S]*?image\.alignment/,
  "the host preview must structurally sanitize portable GitHub HTML while preserving the legacy Markdown-title fallback"
);
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
}

console.log("Nutbook regression guards passed.");
