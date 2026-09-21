## 4.6.0 — English and original-language evidence

- Optional per-record language toggle; preserves source titles and labels editorial paraphrases.
- Language fields included in validation, version history, rollback and Excel transfers.
- Six reviewed international project additions published through the audited bulk importer.

## 4.5.0

- Add private Admin analytics with visit/project counts, daily chart, country/device filters, recent anonymous visits and archived reset periods.
- Fit version slider nodes to available width with readable labels and touch-sized targets.
- Exclude signed-in admins, recognised bots and privacy signals; retain recent visit details for 365 days and aggregates across resets.
- Replace external-link arrows with accessible monochrome paperclip icons.

## 4.4.1

- Move project search below geography and limit evidence panels to three rows or 72% of the viewport, whichever is smaller.
- Keep expansion guidance mobile-only and add subtle theme-aware hover/focus outlines.

## 4.4.0

- Add compact expandable phone cards and a state-preserving Map/List switch.
- Add persistent project Save/Cancel controls, draft status and Admin section navigation.
- Remove nested evidence scrolling on phones and use a 0.4-second default page flip while preserving saved preferences.

## 4.3.0

- Add five labelled site colour palettes with local preview, restore-saved control and authenticated persistent configuration.
- Share semantic colour roles across Atlas and Admin; preserve warning/delete and version-diff semantics.

## 4.2.0

- Show evidence lists in scrollable panels sized to three visible projects, with a phone-height cap and keyboard access.
- Alternate subtle blue-grey row backgrounds while retaining selected-project highlights.

## 4.1.0

- Add a Test import action that automatically downloads a diff report without changing projects; block applying test previews on the server.
- Include workbook parsing failures in test reports and retain import confirmation and protected rollback.
- Include related initiatives such as Project 02 in the main numbered evidence list; clearing search restores numeric order.

## 4.0.0

- Add Excel import/export above Admin configuration, with off-thread workbook processing and a reusable template.
- Preview duplicates and changed matches; require explicit update selection and confirm atomic bulk imports.
- Download a review-only bulk import diff workbook with row decisions and yellow-highlighted current/proposed field comparisons.
- Log completed exports, imports and undo actions in global version history; protect later edits when undoing imports.
- Preserve Edit notes, enforce schema validation, and bold the Project name field.

## 3.9.2

- Label each record’s sharing link “Share project link”.
- Always sort Atlas search and location subsets by numeric project number, including selected-location details and tooltip records.
- Highlight the lowest-numbered search match; retain Admin numeric subset ordering.

## 3.9.1

- Apply the configured card-flip transition to the home page Admin link, retaining normal Admin sign-in and modified-click behavior.

## 3.9.0

- Bound version timeline to five nearby nodes (three on mobile), with First/Latest and Previous/Next navigation.
- Search saved versions by number, date or changed field; show one selected summary with bold field names.
- Preserve instant diff previews and separate explicit restoration.
- Verify Edit notes snapshots, version summaries and restore behavior with regression checks; include every changed field in version search.

## 3.8.1

- Reverse the configured card flip on Admin links back to Atlas, with an unsaved-project guard and reduced-motion support.

## 3.8.0

- Add site-wide Admin configuration for enabling the full-screen edit card flip and setting its total duration (0.3–1.6 seconds).
- Store settings behind Admin authentication; preserve reduced-motion preferences.

## 3.7.1

- Turn the full page edge-on and reveal Admin as the reverse face, with matched 360ms half-turns and reduced-motion support.
- Wait for the selected record before revealing the editor; preserve browser Back recovery.

## 3.7.0

- Add a pencil link on each project, password-gated direct editing, and a brief page-flip transition that respects reduced motion.
- Open the chosen project automatically after Admin authentication.

## 3.6.1

- Collapse Canadian review, EHDS review and evidence context by default using accessible, keyboard-friendly disclosure controls.

## 3.6.0
- Added Previous/Next navigation and position counts within matching projects.
- Preserve unsaved drafts during live search and confirm before switching projects.

## 3.5.1
- Version review now displays changed fields only; the full form remains intact.

## 3.5.0
- Added synchronized editable field copies beneath the version slider with saved-value comparisons.
- Kept the full form editable and unchanged while browsing or filtering version history.

## 3.4.1
- Fixed Save and Delete text contrast in active and disabled historical-preview states.

## 3.4.0
- Added map pan buttons, larger marker hit areas, skip navigation, and direct access to filtered results.
- Improved mobile introduction spacing, profile readability, and expandable map context.

## 3.3.0
- Grouped edit fields by task, clarified the save action, and improved responsive spacing and focus visibility.
- Show save feedback near form actions; hide empty groups in changed-fields-only mode.

## 3.2.4
- Moved Version history below the edit form.
- Added optional Edit notes to saved records, version diffs, and change summaries.
- Replaced the visible country checkbox grid with a search picker and compact removable selections.

## 3.2.3
- Version node summaries use exact form labels in bold and explicitly describe changed fields.

## 3.2.2
- Attached short change summaries exclusively to their version labels on the timeline; retained selected-version metadata above it.
- Consolidated review actions and tightened form spacing without changing field heights.

## 3.2.1
- Added concise saved-change summaries generated from recorded version snapshots, including existing history.
- Combined the read-only project and version reference.
- Enabled changed-fields-only review across the timeline with an explicit result count.

## 3.2.0
- Added previous/next, a version dropdown, current/preview context, and return-to-current controls.
- Added changed-fields-only filtering and responsive current/preview comparisons.
- Restore confirmation lists affected fields and preserves history as a new version.

## 3.1.2
- Put version nodes directly on the slider track and added captured pointer dragging for continuous immediate previews.

## 3.1.1
- Marker selection preserves the map position; docked previews no longer auto-scroll the page.
- Added clickable version nodes and immediate form previews while scrubbing the history slider.
- Kept all version labels accessible on narrow screens with a horizontally scrollable timeline.

# 3.1.0 — 2026-09-20

- Preview historical values in the form, mark changed fields and exact changed text in yellow, and preserve unsaved drafts when returning to the current version.
- Replace the separate log page with a per-record version slider and field differences inside Admin.
- Restore reviewed versions as new audited revisions, retaining stale-version and authentication checks.
- Redirect old log links to Admin; no versions before v1 are offered.

# 3.0.1 — 2026-09-20

- Display current record version read-only in Admin.
- Disable rollback before v1 and enforce the same restriction on the server. Restoring v1 itself remains available.

# 3.0.0 — 2026-09-20

- Move project editing to /admin and audit/rollback history to /log.
- Reuse the Atlas header, favicon, stylesheet and footer; add navigation across pages.
- Preserve server-enforced authentication and share existing sessions across management pages.

# 2.7.8 — 2026-09-19

- Automatically populate the edit form with the first numbered search match, preserving search focus and avoiding reload of the same record.

# 2.7.7 — 2026-09-19

- Populate the Admin project menu with the live search subset, ordered by project number.
- Clearing search restores all menu entries; no-match searches retain the current edit form.

# 2.7.6 — 2026-09-19

- Sort Admin project-search matches by numeric Atlas project number ascending.

# 2.7.5 — 2026-09-19

- Collapse the dynamic Sources reviewed directory by default behind a native accessible disclosure.

# 2.7.4 — 2026-09-19

- Remove Boolean search operators and their instructions; return to literal text terms.
- Retain exact country-marker filtering using selected project IDs with comma-separated country names.

# 2.7.3 — 2026-09-19

- Match Admin dropdown and single-line input heights at 46px, preserving expanding textareas.

# 2.7.2 — 2026-09-19

- Keep unmatched markers visible at reduced opacity, in their original positions, and available for selection.

# 2.7.1 — 2026-09-19

- Show the current Atlas project number as a read-only field inside the edit form; new entries show Assigned after saving.

# 2.7.0 — 2026-09-19

- Add live full-text project lookup beside the Admin number/Open project row, with numbered clickable results and mobile stacking.

# 2.6.1 — 2026-09-19

- Cap the country hover/selection pulse at 110 percent of its original size.

# 2.6.0 — 2026-09-19

- Expand the Reported outcomes editor to show its full contents on load and while typing.
- Show compact geography totals when no search is active.
- Populate search with marker countries, joined by OR for shared locations.
- Support case-insensitive AND/OR, implicit AND and quoted phrases; omit operators from match highlights.

# 2.5.0 — 2026-09-19

- Add authenticated Admin lookup by the project number displayed in the Atlas, including Enter-key submission and missing-number feedback.
- Show project numbers in the dropdown and confirm the loaded project name before editing.

# 2.4.1 — 2026-09-19

- Show native country-name tooltips on represented country shapes without changing selection.

# 2.4.0 — 2026-09-19

- Replace the header asterisk and add an SVG favicon using a simplified Aprukuma symbol in atlas teal.
- Symbol reference: https://www.nyamedua.org/2023/07/21/aprukuma/ (medicinal seed / health).

# 2.3.3 — 2026-09-19

- Explicitly identify NIH/NLM PubMed and PMC citations with live counts and database explanations.
- Recognize NIH ClinicalTrials.gov, RePORTER, NCI and legacy NCBI URLs when cited in project records.

# 2.3.2 — 2026-09-19

- Use a coordinated soft blue for selected profiles, country highlights, marker glows and connector halos.

# 2.3.1 — 2026-09-19

- Use Project 01, Project 02, etc. as the profile numbering labels.

# 2.3.0 — 2026-09-19

- Generate Sources reviewed from live record evidence links, grouped by provider with deduplicated references, project names and dates.
- Preserve dated Canadian and EHDS review notes separately from the dynamic citation inventory.

# 2.2.0 — 2026-09-19

- Keep country and marker yellow highlighting visible throughout hover or keyboard focus.
- Place markers and their halos in nearby open water using the actual country shapes, with spacing between markers.
- Apply the same deterministic placement to newly added countries and responsive map sizes.

# 2.1.2 — 2026-09-19

- Rename profile numbering labels to Project #.

# 2.1.1 — 2026-09-19

- Populate search with the shared project name while retaining exact-record filtering.
- Add subtle record numbers to all project profiles, consistent across search, selection and sharing views.

# 2.1.0 — 2026-09-19

- Explain obligatory asterisk-marked fields in the editor, including country selection.
- Make Delete red and require an explicit named-project confirmation.
- Add copyable project share links using stable record IDs.
- Shared URLs subset profiles, map markers and location details after catalog loading and focus the project.
- Add Show all projects, search reset, browser-history handling and unavailable-record feedback.

## 2.0.0
- Shared, password-protected project editor and country-based markers.
- Duplicate checks and optimistic edit conflict protection.
- Private timestamp/IP audit history with per-record version rollback.
- Rollback creates a new version; deleted records can be restored.
- Country hover animation; persistent Docker database.

# Release history

## 1.3.11

- Cap selected-country expansion at 125%, preserving timing and fill.

## 1.3.10

- Fill the animated country shape pale yellow during expansion and retraction, restoring the usual fill afterwards.

## 1.3.9

- Set country growth to 0.25 seconds and return to 0.25 seconds (0.5 seconds total).

## 1.3.8

- Replace the double flash with a country selection animation from 100% to 150% and back to 100%.

## 1.3.7

- Pulse selected countries twice on marker click or tap, with a steady highlight for reduced-motion preferences.

## 1.3.6

- Slowly animate dotted country connectors, respecting reduced-motion preferences.

## 1.3.5

- Add a soft pale-yellow halo to dotted country connectors.

## 1.3.4

- Draw subtle dotted country-center connectors on marker hover and keyboard focus without moving markers. Shared Kenya/Tanzania marker points to both countries.

## 1.3.3

- Give markers stable offshore display positions, remove callout lines, and keep selection halos.

## 1.3.2

- Place selected marker callouts clear of other markers and callouts, recomputing on selection and resize.
- Add a pale-yellow halo matching selected result rows.

## 1.3.1

- Offset selected markers with fine leader lines and geographic anchor dots so country outlines remain visible.

## 1.3.0

- Display every location tooltip in the consistent strip below the map.
- Outline selected countries, promote and highlight all selected matches, and number rows within the selected set.

## 1.2.4

- Pin clicked or tapped location previews while scrolling to profiles and back. Another location replaces the pinned preview; Escape or a changed search dismisses it.

## 1.2.3

- Soften row hover outlines to a faint single-pixel edge and remove the outer glow.

## 1.2.2

- Synchronize the Selected Locations panel with every matching project as search changes; clearing search restores all projects in the panel.

## 1.2.1

- Add subtle blue hover and keyboard-focus outlines to each project profile row, preserving selected backgrounds.

## 1.2.0

- Filter map markers and tooltip records to matching projects; highlight the first visible result and its locations in the geography panel.
- Clear search to restore all map locations; show an explicit empty map state when no projects match.

## 1.1.7

- Add a subtle blue outline around Project Geography on hover or keyboard focus within.

## 1.1.6

- Add a soft blue search-field hover and focus halo while retaining keyboard focus visibility.

## 1.1.5

- Start normal openings at the top of the page while preserving explicit project anchor links.

## 1.1.4

- Move search between the introduction and Project Geography.

## 1.1.3

- Inset all result columns from the selection boundary, with balanced padding on desktop and phones.

## 1.1.2

- Highlight matching words in visible project profiles with a light blue background; clear highlights when search is empty.

## 1.1.1

- Explicitly restore all projects for empty or whitespace searches, native search clearing and browser page restoration.

## 1.1.0

- Add live, case- and accent-insensitive project search with result counts and clear action.
- Hide unmatched profiles and empty groups; profile links reveal their destination.

## 1.0.4

- Add phone page gutters and consistent inset padding across all project profile text.
- Preserve desktop spacing and prevent long profile text from overflowing.

## 1.0.3

- Open with Bombo selected in the sidebar and highlighted first in the profiles.
- Center the initial mobile map view on its shared coastal marker.

## 1.0.2

- Added subtle alternating backgrounds and spacing to multi-project location sidebar entries; single-project views retain their existing appearance.

## 1.0.1

- Choosing a tooltip profile link shows only that project in the selected-location sidebar, retaining the location heading.
- Choosing or highlighting a map point again restores all projects for that location.

## 1.0.0

First publicly numbered release, building on the existing atlas.

- Added a visible footer version and matching source comments.
- Tooltip profile links move only the chosen project to the highlighted top section.
- Map-point selection continues to group every associated project at the top.

## Versioning convention

Use major.minor.patch: major for breaking changes, minor for features, patch for fixes or small presentation changes. Update the footer and version comments in dist/index.html, dist/app.js and dist/style.css together; add a concise entry here for each published release. Earlier publications predate this versioning scheme.
