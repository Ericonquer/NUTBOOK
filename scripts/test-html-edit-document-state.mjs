import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const indexHtml = readFileSync("dist/index.html", "utf8");
const startMarker = "// NUTBOOK_HTML_EDIT_DOCUMENT_STATE_START";
const endMarker = "// NUTBOOK_HTML_EDIT_DOCUMENT_STATE_END";
const start = indexHtml.indexOf(startMarker);
const end = indexHtml.indexOf(endMarker);

assert.ok(start >= 0, "HTML edit document-state helpers must have a start marker");
assert.ok(end > start, "HTML edit document-state helpers must have an end marker");

const context = { JSON, Number, Object, Array };
vm.createContext(context);
vm.runInContext(indexHtml.slice(start + startMarker.length, end), context, { filename: "dist/index.html:html-edit-document-state" });

const {
  htmlEditDocumentStateKey,
  acceptHtmlEditDocumentSnapshot,
  applyHtmlEditDoneSnapshot,
  isHtmlEditCleanRevisionSatisfied,
  htmlEditLeaveRequiresSave,
  canProceedHtmlEditLeaveAfterSnapshotRefresh,
  markHtmlEditPatchOutOfSync,
  mergeHtmlEditPatchChanges
} = context;

assert.equal(typeof htmlEditDocumentStateKey, "function", "document state keys must use the production helper");
assert.equal(typeof acceptHtmlEditDocumentSnapshot, "function", "snapshot acceptance must use the production helper");
assert.equal(typeof applyHtmlEditDoneSnapshot, "function", "Done decisions must use the production helper");
assert.equal(typeof isHtmlEditCleanRevisionSatisfied, "function", "save completion must use the production clean-revision helper");
assert.equal(typeof htmlEditLeaveRequiresSave, "function", "leave checks must use the production persistence-barrier helper");
assert.equal(typeof canProceedHtmlEditLeaveAfterSnapshotRefresh, "function", "Done recovery must use the production non-blocking refresh helper");
assert.equal(typeof markHtmlEditPatchOutOfSync, "function", "save races must use the production persistence-barrier helper");
assert.equal(typeof mergeHtmlEditPatchChanges, "function", "reconciliation must use the production full-patch merge helper");

function snapshot(documentRevision, dirty, changes = {}) {
  return { documentRevision, dirty, changes, selectedDataId: "body", formatState: { editRole: "content" } };
}

function sessionFor(data = snapshot(0, false)) {
  return {
    documentRevision: data.documentRevision,
    documentStateKey: htmlEditDocumentStateKey(data),
    dirty: data.dirty,
    changes: data.changes,
    selectedDataId: data.selectedDataId,
    formatState: data.formatState
  };
}

function serial(value) { return JSON.stringify(value); }

{
  const session = sessionFor();
  assert.equal(acceptHtmlEditDocumentSnapshot(session, snapshot(0, false)), true, "the initial clean revision zero snapshot is accepted idempotently");
  assert.equal(acceptHtmlEditDocumentSnapshot(session, snapshot(0, true, { body: { html: "<p>x</p>" } })), false, "revision zero must never carry a dirty document");
}

{
  const session = sessionFor();
  const before = serial(session);
  assert.equal(acceptHtmlEditDocumentSnapshot(session, { dirty: false, changes: {} }), false, "snapshots missing a revision are rejected");
  assert.equal(acceptHtmlEditDocumentSnapshot(session, { documentRevision: 1, changes: {} }), false, "snapshots missing dirty are rejected");
  assert.equal(acceptHtmlEditDocumentSnapshot(session, { documentRevision: 1, dirty: false }), false, "snapshots missing changes are rejected");
  assert.equal(acceptHtmlEditDocumentSnapshot(session, snapshot(1, false, { body: { html: "forged clean" } })), false, "a clean snapshot cannot carry unsaved changes");
  assert.equal(acceptHtmlEditDocumentSnapshot(session, snapshot(1, true)), false, "a dirty snapshot must carry at least one change");
  assert.equal(serial(session), before, "invalid snapshots cannot mutate the host session");
}

{
  const revisionTwo = snapshot(2, true, { body: { type: "rich_text", html: "<h2>two</h2>" } });
  const session = sessionFor(snapshot(1, true, { body: { type: "rich_text", html: "<p>one</p>" } }));
  assert.equal(acceptHtmlEditDocumentSnapshot(session, revisionTwo), true, "a newer complete snapshot advances the session");
  assert.equal(session.documentRevision, 2);
  const before = serial(session);
  assert.equal(acceptHtmlEditDocumentSnapshot(session, snapshot(1, false)), false, "a stale snapshot is rejected");
  assert.equal(serial(session), before, "a stale snapshot cannot overwrite dirty state");
  assert.equal(acceptHtmlEditDocumentSnapshot(session, snapshot(2, true, { body: { html: "different" } })), false, "same-revision conflicting document state is rejected");
  assert.equal(serial(session), before, "same-revision conflict cannot overwrite dirty state");
  assert.equal(acceptHtmlEditDocumentSnapshot(session, revisionTwo), true, "same-revision canonical state is idempotent");
}

{
  const current = snapshot(2, true, { body: { html: "<h2>latest</h2>" } });
  const session = sessionFor(current);
  const before = serial(session);
  assert.equal(applyHtmlEditDoneSnapshot(session, snapshot(1, false)).action, "use-current", "stale Done keeps the host document state");
  assert.equal(serial(session), before, "stale Done cannot overwrite the host state");
  const incompleteAhead = applyHtmlEditDoneSnapshot(session, { documentRevision: 3 });
  assert.equal(incompleteAhead.action, "refresh", "incomplete ahead Done requests a snapshot refresh");
  assert.equal(incompleteAhead.minimumRevision, 3, "ahead Done refresh targets its revision");
  assert.equal(applyHtmlEditDoneSnapshot(session, snapshot(3, false)).action, "accepted", "complete ahead Done is accepted");
  assert.equal(session.documentRevision, 3);
  assert.equal(session.dirty, false);
}

{
  const dirtySession = sessionFor(snapshot(2, true, { body: { html: "<strong>formatted</strong>" } }));
  assert.equal(
    canProceedHtmlEditLeaveAfterSnapshotRefresh(dirtySession, false),
    true,
    "a failed optional refresh must not suppress leave confirmation when the host already holds a dirty canonical snapshot"
  );
  const cleanSession = sessionFor(snapshot(2, false));
  assert.equal(
    canProceedHtmlEditLeaveAfterSnapshotRefresh(cleanSession, false),
    false,
    "a failed refresh cannot authorize leaving when the host has no dirty canonical state"
  );
}

{
  const clean = sessionFor(snapshot(4, false));
  assert.equal(isHtmlEditCleanRevisionSatisfied(clean, 4), true, "a clean snapshot at the required revision completes save");
  assert.equal(isHtmlEditCleanRevisionSatisfied(clean, 5), false, "a clean snapshot below the required revision cannot complete save");
  const laterDirty = sessionFor(snapshot(5, true, { body: { html: "<p>changed again</p>" } }));
  assert.equal(isHtmlEditCleanRevisionSatisfied(laterDirty, 4), false, "a later dirty revision cannot complete save");
}

{
  const persisted = { retained: { html: "<p>previously saved field</p>" } };
  const saved = snapshot(1, true, { added: { html: "<p>saved format</p>" } });
  const session = sessionFor(saved);
  session.persistedChanges = persisted;
  const savedChangesJson = JSON.stringify(saved.changes);
  assert.equal(acceptHtmlEditDocumentSnapshot(session, snapshot(2, false)), true, "the user can revert while the old save is in flight");
  assert.equal(markHtmlEditPatchOutOfSync(session, savedChangesJson), true, "the host records that the backend wrote an older patch");
  assert.equal(session.requiresPatchReconciliation, true);
  assert.equal(htmlEditLeaveRequiresSave(session), true, "a clean DOM cannot leave while an older patch was persisted during a save race");
  assert.equal(
    JSON.stringify(mergeHtmlEditPatchChanges(session.persistedChanges, session.changes)),
    JSON.stringify(persisted),
    "the follow-up replacement preserves unrelated persisted fields while removing the reverted in-flight delta"
  );
}

console.log("HTML edit document-state guards passed.");
