# Changelog

All notable changes to this project will be documented in this file.

---

Version 2 - 2026-07-15
Overview
Improved the Percentages learning and quiz experience with a clearer step-by-step explanation flow and a refreshed kid-friendly adventure theme.

1. Explanation Flow Improvements

- Updated the concept theory section to reveal one idea at a time with progress indicators.
- Updated the worked example to reveal one step at a time, including a separate final answer card.
- Added Previous and Next navigation within the theory and worked-example sections.
- Increased step-card spacing and text size for improved readability.
- Simplified the section progress label to show the current section number.

2. Percentages Quiz UI Redesign

- Replaced the previous percentages color palette with a polished dark/light adventure theme.
- Added centralized theme variables for backgrounds, text, borders, accents, status colors, and shadows.
- Refreshed the quiz shell, progress area, buttons, mute control, animations, stars, and card styling.
- Improved responsive layout behavior and fixed the quiz header mute-button overlap.

Status

Implemented for the Percentages explanation and quiz flows.

Version 1 — 2026-07-08
Overview
This release delivers a complete learning loop for Percentages — Level 1: Find a Percentage: a 5-part explanation screen (interactive visual → click-through theory → worked example → AI study assistant prompt → understanding check) feeding into a brand-new, kid-friendly graded quiz, tied together by an escalation system that sends struggling students back to the exact part of the explanation they need.

1. Levels Selection Screen

Entry point for the Percentages module (LevelsSelectView), listing all four levels:

Level 1: Find a Percentage (active)
Level 2: Increase / Decrease (locked, coming soon)
Level 3: Reverse Percentage (locked, coming soon)
Level 4: Compound Percentage (locked, coming soon)


No direct shortcut into the graded quiz from this screen — students must go through the explanation first.

2. Explanation Screen — 5-Part Design
Level1ExplanationView was built as five sequential parts:

Interactive Visual — drag-to-fill percent bar.
A slider the student drags fills a live percentage bar in real time, alongside a 100-square grid that fills square-by-square so "percent = out of 100" is physically visible rather than just stated. The calculation below updates live as the student drags: Find {percent}% of {whole} = {result}, so the student sees the answer change before any theory text appears.

Design rule: every sub-method is classified before building as either spatial/object visual (bar fills, dot slides, grid lights up — used here, since percentages have no literal physical object like a fraction does, but the bar-fill metaphor works the same way) or no visual (pure symbolic methods fall straight to worked examples instead, per the "don't force a visual where it teaches a wrong mental picture" rule). This classification is decided per sub-method, not per topic — within Percentages, Find and Increase are candidates for a spatial visual; Reverse and Compound were left undecided rather than forced.
Component is reusable (grid, pie/bar, slider) but currently implemented specifically for Percentages → Find; not yet abstracted into a fully reusable cross-topic component.


Click-through theory — one concept revealed per click, not a wall of text.
Worked example — step-by-step reveal, following the same click-through pattern as the theory section.
AI Study Assistant Prompt — a copyable, generic prompt (no numbers baked in) matching the original "prompt handoff" design exactly. Zero cost to Tenali since it hands off to the student's own AI chat tool rather than an in-app LLM tutor.
Understanding Check — an ungraded comprehension gate before unlocking the graded quiz. This evolved beyond the original single-question spec:

Original spec: one ungraded question, same difficulty as the worked example, with different numbers — but a single fixed question can be beaten by memorizing the answer on retry without real understanding.
What shipped instead:

20 real-life scenario templates (discount, exam marks, sports stats, restaurant tip, etc.) instead of one fixed question.
Randomized numbers every attempt, using step = 100 / gcd(percent, 100) to guarantee a clean, whole-number answer without brute-forcing valid combinations.
No-repeat rule — the template just used is excluded from the next pick, so consecutive questions are never the same scenario.
4 questions per round, need 3 correct to pass. A failed round starts a fresh round with new questions — no retry cap, same "repeat until passed" philosophy as the original stuck-loop rule, just applied at the round level instead of a single question.
Distractors built from real mistakes (percent-of-itself, leftover-instead-of-part, 10%-benchmark slip errors), with a collision check to stop a distractor from accidentally matching the correct answer.


This keeps the original spirit (ungraded, confirms understanding, not scored) while closing the memorization gap a single fixed question would have had.



3. Escape Hatches (matches original design)

AI prompt handoff — built exactly as specified: generic, no numbers, student copies it to any AI chat tool.
After 2 failed rounds (8 questions) — a visible nudge points back to the AI prompt box, giving it a genuine trigger condition tied to real struggle rather than being a default first option.
Video link — not yet added to this level; deferred, not built.

4. ⚠️ OPEN ITEM — "Skip to Quiz" vs. no-direct-jump requirement
Design notes state the graded quiz was "kept fully reachable throughout — via 'Skip to Quiz' for confident students and 'Continue to Practice' after passing the check." This conflicts with an explicit later requirement that the All Levels / explanation flow should not allow directly jumping to the graded quiz, bypassing the Understanding Check. This needs to be resolved before final sign-off — either the "Skip to Quiz" escape hatch should be removed, or it was already removed and this design note is stale and should be corrected. Confirm current behavior in the live build before closing out this release.
5. NEW — Graded Quiz: Step-Wise Diagnostic Solving
Rebuilt the graded PercentApp component from the ground up:

Removed the old difficulty-tier setup screen — the quiz now starts directly on Level 1 questions.
Added a frontend question generator (generateFindQuestion) producing randomized, clean percentage-of-a-whole problems (e.g. "What is 60% of 800?").
Implemented a 3-mode state machine:

Normal Mode — single-input question. A correct first-try answer counts toward the 3-star completion goal for the level and reveals an optional "Show full solution" accordion (doesn't affect scoring). A wrong answer transitions into Step-Wise Diagnostic Mode.
Step-Wise Diagnostic Mode — breaks the question into two guided steps:

Convert the percentage to a decimal/fraction
Multiply that value by the whole
Each step is checked independently; a correct step auto-advances, a wrong step reveals the correct method inline and waits for the student to continue. After both steps are resolved, a full solution recap is shown before moving to the next question.


Check Question Mode — shown only after a student returns from an escalation redirect (see below). A single verification question confirms the concept has landed; a correct answer returns them to Normal Mode, a wrong answer sends them back to the explanation again.



6. NEW — Escalation & Revert-to-Explanation Flow
To support students who repeatedly struggle with a specific step inside the graded quiz:

Each step type (conversion vs. multiplication) has its own persistent failure flag (failedStep1, failedStep2).
First failure on a step: the student sees the correct method inline and continues within the same quiz session — no redirect yet.
Second failure on the same step type (even on a later, different question): triggers an escalation —

A friendly mascot message pauses the quiz ("Let's pause and look at this idea together again to make it super clear! 🦉").
The student is redirected back into the Explanation Screen, deep-linked and auto-scrolled to the specific card relevant to the step they struggled with (the theory card for conversion, the worked example card for multiplication), with a brief highlight flash to draw attention to it.
After reviewing, the student clicks "Continue to Practice Quiz" again, which now lands them in Check Question Mode rather than straight back into Normal Mode — a single question confirming they've got it before resuming normal play.
If the check question is answered incorrectly, they're sent back to the explanation again; if correct, they return to Normal Mode.


This escalation flag persists for the rest of the session — it is intentionally not reset after a single successful check answer, so a further failure on that same step type will immediately re-trigger escalation rather than requiring two fresh failures again.
Note: this graded-quiz "Check Question Mode" is a separate mechanism from the explanation screen's "Understanding Check" (Section 2, part 5) — the former is a single-question gate re-entering the quiz after an escalation; the latter is the 4-question/3-to-pass round gating first entry into the quiz.

7. NEW — Kid-Friendly UI/UX Redesign (ages 7–10)

Bright, warm color palette (yellow-to-green gradient) scoped only to the Percentages quiz via a .percentages-app-theme wrapper — no impact on any other quiz module sharing App.css.
Percent Island themed layout: level badge, XP/Gems/Combo counters, and five collectible "Mystery" badges that unlock as the student progresses.
Friendly owl mascot with contextual speech-bubble messages for correct answers, incorrect answers, step-wise guidance, and escalation moments.
Star progress row (3 stars) tracking correct-on-first-try answers needed to complete the level, with a pop/spin animation as each star fills in.
Celebration feedback: confetti burst and star-pop animation on correct answers ("Super Solver!"); soft, non-punishing shake animation on incorrect answers.
Sound: Web Audio–based correct/wrong sound cues with a mute/unmute toggle.
Simplified language throughout the step-by-step breakdown (e.g. "40% means 40 out of 100. So 40% = 0.4 🙂" instead of formal textbook phrasing), with larger font sizes for readability.
Chunky, rounded, "3D pressable" buttons throughout, replacing plain text buttons.
Softened stark white card backgrounds (main question box, solution recap) to a warm cream tone for visual consistency with the rest of the theme.
Level completion screen ("Level 1 Complete! 🏆") on reaching 3 correct answers, with options to play again or return to the levels list.

Fixed

Mute button no longer overlaps the "Level 1" badge in the quiz header.

Status

Built and tested for Percentages → Find a Percentage only.
Not yet built: Levels 2–4 (Increase, Reverse, Compound), and the video-link escape hatch.
Interactive visual component (drag-to-fill bar/grid) is functional but not yet abstracted into a reusable cross-topic component — currently specific to Percentages → Find.

Notes

PercentExplanationApp.jsx / PercentExplanationApp.css (the theory/explanation screen) were kept unmodified in this release, aside from the minimal redirect-hook addition (initialStep / clearInitialStep props, and a view state transition to a QUIZ view rendering the new PercentApp) needed to support the escalation deep-link/scroll feature.
All new gamification and visual styling is scoped exclusively to the Percentages quiz and does not affect any of the other quiz modules in the shared App.jsx / App.css files.


Version 2 — 2026-07-09
Overview
Refactoring pass across the Percentages feature addressing two issues raised after a Proof of Concept review: excessive cognitive load from stacked, scrollable content, and a browser-limit bug in sound playback caused by repeatedly creating new AudioContext instances. This release intentionally touches both App.jsx (graded quiz) and PercentExplanationApp.jsx / .css (explanation screen) — the prior restriction against modifying the explanation screen was deliberately lifted for this task.
Changed — One-Card-at-a-Time View

Graded Quiz — Step-Wise Diagnostic Mode (App.jsx):

Previously, all step cards (Step 1, Step 2, full solution recap) were stacked and simultaneously visible.
Now, exactly one card is rendered at a time — either the current step (stepwiseState.currentStepIndex) or the recap card (stepwiseState.showRecap === true).
A key prop on the card wrapper forces React to unmount/remount on each transition, triggering a @keyframes percentages-card-fade-in animation on every card swap.
A persistent step progress badge (e.g. "Step 1 of 2") is shown in the header.


Explanation Screen — Level 1 View (PercentExplanationApp.jsx):

Previously, all 5 sections (Interactive Visual, Theory, Worked Example, AI Prompt, Quick Check Quiz) were stacked and simultaneously visible on one long scrollable page.
Now, an activeSection state (1–5) controls which single section is rendered.
Added a horizontal timeline progress indicator at the top showing steps 1–5, with filled green circles for completed steps, an orange-highlighted active step, grey pending steps, a filled tracking line, and click-back navigation to any previously visited section.
Added Previous/Next navigation buttons at the bottom of each card for sequential progression.
A key-based wrapper triggers a matching @keyframes explanation-card-fade-in animation on every section change.
The Quick Check Quiz (step 5) in the timeline remains disabled until isExplanationFinished is true (all 4 prior sections completed) — preserving the existing no-shortcut gating.



Changed — Audio Context Singleton

New module — client/src/audioContext.js:

Exports getAudioContext() — lazily creates a single shared AudioContext singleton and resumes it if suspended, instead of creating a new instance per sound.
Exports playSound(type, enabled) — builds fresh oscillator/gain nodes per sound event (unchanged behavior) against the shared singleton context, playing either a "correct" chime or "wrong" buzzer.
getAudioContext() is only ever called from inside playSound(), which itself is only ever called from user-gesture event handlers (button clicks) — never on component mount, satisfying the browser's audio-gesture activation requirement.


Graded Quiz (App.jsx): removed the duplicated local playSound function; now imports the shared playSound from ./audioContext. All existing call sites in the quiz submit handler continue to work unchanged.
Explanation Screen (PercentExplanationApp.jsx): imports playSound from ./audioContext; MicroQuiz.handleSelect calls playSound(isCorrect ? 'correct' : 'wrong', true) inside the option-selection handler (a user-gesture callstack), adding audio cues to Quick Check Quiz answers for the first time.
Mute toggle: playSound accepts an enabled boolean parameter — passing false skips audio without touching or closing the singleton context (no .close() call), so the shared AudioContext persists across mute/unmute rather than being destroyed and needing re-creation.

Verification

npm run build succeeded (20 modules transformed, no errors).
14/14 automated static checks passed, including: getAudioContext not called at module top-level; getAudioContext only called inside playSound; both apps correctly import the shared playSound; quiz step timeline disabled until isExplanationFinished; Quick Check Quiz gated by isExplanationFinished; escalation redirect correctly calls setActiveSection; stepwise card and recap card both correctly keyed for transition animation.
Preserved invariants confirmed unchanged: scoring/correctness-checking logic; state machine transitions and escalation logic (handleQuizSubmit, stepwiseState reducer, failedRounds); Quick Check Quiz randomization/no-repeat deduplication (generateQuestion()); no-direct-quiz-shortcut gating (onContinueToQuiz disabled gate, isExplanationFinished logic).
Manual browser verification still required (not yet performed as of this entry) — dev server running locally for: timeline/one-card view check, MicroQuiz gating check, sound playback on quiz answers, step-wise transition/fade-in check, escalation redirect check (fail same step twice), and mute toggle check.

Files Changed
FileChangeaudioContext.jsNEW — Singleton AudioContext + playSound utilityApp.jsxRemoved duplicate playSound, imported shared one; rewrote stepwise rendering to one-card-at-a-timeApp.cssAdded .percentages-card-transition-wrapper + @keyframes percentages-card-fade-inPercentExplanationApp.jsxImported playSound; added activeSection state, timeline indicator, nav buttons, transition wrapper; fixed a missing closing </div>PercentExplanationApp.cssAdded .explanation-card-transition-wrapper + @keyframes explanation-card-fade-in + timeline hover styles

Version 3 — 2026-07-15
Overview
This release removes the AI Study Assistant Prompt step from the explanation flow, replaces the old drag-and-drop Story section with a new guided, mascot-led mini-lesson, and significantly simplifies the rest of the explanation screen for younger readers. It also fixes a recurring background color mismatch so every screen in the module — Home, Explanation, Story, and the graded quiz — now looks visually consistent in both light and dark mode.
1. REMOVED — AI Study Assistant Prompt Section

The "AI Study Assistant Prompt" step (previously Section 4 of the explanation flow, shipped in Version 1) has been removed from the explanation screen entirely.
The explanation flow is now 5 sections: Interactive Visual → Concept Theory → Worked Example → Percent Story → Quick Check Quiz — with Percent Story taking the position the AI prompt step previously held, and Quick Check Quiz remaining the final gate before the graded quiz.
The "after 2 failed rounds, nudge back to the AI prompt" escape hatch (Version 1) no longer applies, since there is no AI prompt step to return to.

2. NEW — Percent Story Section (replaces "Percent Pop")

Removed the old drag-and-drop matching game that had been occupying Section 4. Testing showed it didn't reinforce the concept well and left students under-prepared for the quiz that follows.
Replaced it with a guided comic-style mini-lesson: a friendly mascot character walks the student through a short story that builds up the idea of "part out of whole = percent" step by step.
Each time a student reaches this section, one of five different real-world scenarios is chosen at random — a candy jar, a pizza, a classroom of students, a piggy bank, or a football match — so repeat visits don't feel identical, without showing multiple scenarios at once and overwhelming the student.
The story unfolds across five short panels: introducing the whole amount, showing the part being taken away, asking the student to guess the percentage, revealing the answer and formula, and a quick recap before moving on.
Replaced an earlier interaction that asked students to tap 25 individual items one by one (tedious and not meaningful practice) with a simple animated reveal — items fade away on their own while a counter updates, and the student taps once to continue.
Added a "make your best guess" moment before the answer is revealed, so students engage with the problem instead of just watching.

3. NEW — Mascot Character

Introduced a simple, friendly illustrated mascot with three clear expressions (explaining, excited, and thinking) that appear at different points in the story to match what's being said — designed to feel warm and approachable for ages 7–9.

4. Simplified — Explanation Screen Readability Pass

Removed extra instructional subtext that appeared on every section; replaced it with a small info icon next to the section header that shows a short description only when hovered or tapped, keeping the main screen clean.
Shortened the "Concept Theory" section's four explanation points down to one short, simple sentence each, and gave each point its own clearly separated card — matching the layout already used in the worked example section.
Enlarged the main formula and result displays (e.g. "Find 25% of 200 = 50") so they're the most visually prominent thing on the screen, with supporting math shown smaller underneath.
Enlarged the step text in the worked example section and gave each step, plus the final answer, its own clearly separated card so nothing runs together.
Verified the updated layout doesn't overlap or overflow on small mobile screens.

5. Fixed — Background Color Consistency

Fixed a recurring bug where card backgrounds on the explanation screen didn't match the rest of the app due to leftover local color settings — all cards now consistently use the same background as the Home page, in both light and dark mode.
Applied the same fix to the graded practice screen ("Percent Island"), which had previously been using its own unrelated color scheme — it now visually matches the rest of the app.

Verification

npm run build succeeded with no errors.
Manual walkthrough confirmed: all five Story scenarios play correctly with no repeats in a single session; the reveal animation and guess step work as intended; the info popup opens/closes correctly on both hover (desktop) and tap (mobile); no layout overlap at mobile widths; and light/dark mode render consistently across the Home page, explanation screen, Story section, and graded quiz.
Confirmed no unrelated changes were introduced to background styling anywhere in the app during this pass.

Files Changed
FileChangePercentExplanationApp.jsxRemoved AI Study Assistant Prompt section; replaced old drag-game Story section with new data-driven, scenario-based Story component and mascot; added info popup; simplified/restructured Theory and Worked Example sectionsPercentExplanationApp.cssRemoved AI prompt and old drag-game styles; added new Story, mascot, and info popup styles; fixed background token usage across cards; added responsive/typography adjustmentsPercent Island stylesheetFixed background token usage to match the rest of the app
