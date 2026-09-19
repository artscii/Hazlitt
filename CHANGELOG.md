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
