# Source layout

Admin is organized into focused source fragments: projects, history, settings, navigation, workspace composition and transitions. The build joins them in an explicit order inside one private closure; this preserves the existing shared draft state without introducing a framework or multiple runtime requests. Edit these sources, not generated `dist/admin.js`.

`project-schema.json` is the canonical editor, workbook-column and public-search field definition. `search.js` and `spreadsheet-format.js` are compiled with that schema into their browser/worker assets. Server validation reads the same embedded schema. QMD uses the public-search allowlist.

Styles live in `styles/site.css` and `styles/admin.css`, assembled in cascade order. Only proven identical overridden blocks were removed; remaining responsive overrides are intentional until browser coverage demonstrates otherwise. Do not reorder the cascade casually.

Run `npm run format`, then `npm test`. Run `npm run test:browser` after installing Playwright Chromium. Browser tests create their own database and random password. They do not read the saved Admin password or touch the live database.

Some application files remain directly in `dist` (notably app.js and the small standalone browser modules). This is an incremental refactor, not a framework migration. Build-generated files are marked or described here.
