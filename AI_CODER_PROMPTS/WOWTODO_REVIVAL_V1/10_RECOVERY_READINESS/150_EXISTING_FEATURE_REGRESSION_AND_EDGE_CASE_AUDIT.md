# Prompt 150 — Existing Feature Regression and Edge-Case Audit

**Mode:** VERIFY

## Objective
Systematically test what already exists before adding features, producing a repeatable regression baseline and defect list.

## Build the test inventory from Prompt 100
Do not invent screens. Test every verified core flow that is safely accessible.

## Required categories
- first launch/onboarding if present;
- sign-in/sign-out/session restoration if present;
- list/task creation by non-voice path if present;
- voice todo creation happy path;
- edit/complete/reopen/delete/archive as implemented;
- assignment/share/collaboration/realtime if implemented;
- search/filter/sort/grouping if implemented;
- notifications/reminders if implemented;
- settings/profile/account paths;
- lifecycle: background/foreground/relaunch;
- network slow/offline/reconnect where architecture supports it;
- empty states and first-use states;
- authentication/session expiry;
- permission denied/revoked for microphone and other used permissions;
- rapid repeated taps/duplicate submissions;
- malformed/empty backend responses;
- data refresh/race conditions where observable;
- Unicode, Hindi, English and mixed text where relevant;
- long titles/large todo lists/time/date boundaries where relevant.

## Evidence
Use existing automated tests where present. Add **no product fixes**. If there are no automated tests, execute manual verification and propose the smallest future automation layer.

## Defect classification
For every finding record reproduction, expected vs actual, frequency, impact, likely area, evidence and priority P0–P3. Separate defect from enhancement.

## Required outputs
- feature-by-feature test matrix;
- device/API/build profile tested;
- regression checklist suitable for future releases;
- defect register;
- release-blocking findings;
- tests missing but worth adding before voice intelligence changes.
