---
sub_spec_id: SS-10
phase: run
depends_on: ['SS-04']
dispatch: factory
title: "Note Service, Templates, Bases-Compatible Frontmatter"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 5
---

# SS-10 — Note Service, Templates, Bases Frontmatter

## Summary

`NoteService` writes intentional notes via `app.vault.create` only. Frontmatter is fixed-shape (8 keys, all keys always present). Routing prefers category → feed → mediaType → inbox. Filename sanitization is a single utility.

## Implementation Steps (TDD)

1. **Write failing test:** `frontmatter.build({type: 'article', ...})` returns YAML string with exactly the 8 required keys and stable ordering.
2. **Implement `frontmatter.ts`** as a pure function. Use `dayjs` for `published` and `saved_at` ISO formatting. Empty string for missing strings, `[]` for missing tags.
3. **Run frontmatter test — passes.**
4. **Write failing test:** `routing.choose(item, feed)` returns category folder when `feed.category` is set.
5. **Implement `routing.ts`** with the documented preference chain (category → feed.displayName → mediaType folder → `Inbox/`).
6. **Run routing tests — passes.**
7. **Write failing test:** `sanitizeFilename('hello: world?.md')` → `'hello- world-.md'`; `sanitizeFilename('....')` → `'{itemId}.md'` fallback.
8. **Implement `sanitizeFilename.ts`** with regex replace + truncation at 120 chars.
9. **Write failing test:** `NoteService.save(item, html)` calls `app.vault.create` with rendered template + frontmatter.
10. **Implement `renderTemplate.ts`** as Mustache-style placeholder substitution (no executable code).
11. **Implement templates** `templates/article.md`, `templates/youtube.md`, `templates/bookmark.md`.
12. **Implement `NoteService.save`** wiring routing + sanitize + template + vault create.
13. **Write failing test:** path collision → suffix `-2`, `-3`. Never overwrites.
14. **Implement collision handling** with `app.vault.getAbstractFileByPath` checks.
15. **Write failing test:** vault failure → typed `NoteSaveError`; item NOT marked saved.
16. **Implement error path** + ensure store action only flips `savedIds` after successful create.
17. **[INTEGRATION] verify** by hand: save an article note in a real vault, open Bases on that vault, confirm columns populate.
18. **Commit.** Suggested: `feat(ss-10): NoteService with templates + Bases frontmatter`.

## Interface Contracts

**Provides:**
- `NoteService.save(item, html?) → Promise<{path}>` (Owner: SS-10). Consumer: SS-14 (Save button), SS-15 (`s` keyboard shortcut).
- `NoteSaveError` (Owner: SS-10). Consumer: SS-14 (toast surfacing).
- Frontmatter shape (Owner: SS-10). Consumer: Bases (external).

**Requires:** SS-04 (`markSaved` action after successful save), SS-02 (`FeedItem`, `FeedSource`), `app.vault.create`.

## Verification Commands

```bash
npm test -- NoteService frontmatter routing sanitizeFilename
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| NoteService exists | [STRUCTURAL] | `test -f src/services/NoteService.ts \|\| (echo "FAIL: NoteService missing" && exit 1)` |
| Templates exist | [STRUCTURAL] | `for t in article youtube bookmark; do test -f "templates/$t.md" \|\| (echo "FAIL: template $t missing" && exit 1); done` |
| Frontmatter has all 8 required keys | [STRUCTURAL] | `for k in type status source url category tags published saved_at; do grep -q "$k" src/services/notes/frontmatter.ts \|\| (echo "FAIL: frontmatter key $k missing" && exit 1); done` |
| Uses vault.create not adapter.write | [STRUCTURAL] | `! grep -q "vault.adapter.write" src/services/NoteService.ts && grep -q "vault.create" src/services/NoteService.ts \|\| (echo "FAIL: must use vault.create" && exit 1)` |
| NoteService tests pass | [MECHANICAL] | `npm test -- NoteService \|\| (echo "FAIL: tests" && exit 1)` |
| Frontmatter tests pass | [MECHANICAL] | `npm test -- frontmatter \|\| (echo "FAIL: frontmatter tests" && exit 1)` |
| Routing tests pass | [MECHANICAL] | `npm test -- routing \|\| (echo "FAIL: routing tests" && exit 1)` |
