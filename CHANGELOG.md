# Changelog — Bar Chart with Variation %

All notable changes to this visual are documented here.

---

## [1.10.0.0] — 2026-09-22

### Added
- **Three reference measures: Previous Year, Plan / Budget and Forecast.** Until now the variation was always against the previous category on the axis, which answers "is this month better than the last one" but not "are we on plan". Bind one of the three, pick it under Format → Comparison → Compare to, and every bar gets a **horizontal marker at the reference level**: the bar is the actual figure and the marker says where it should be. It is the IBCS reading, and it is what the four competitors in this niche have and this visual did not. The reference is included in the Y domain, so a plan above actual still fits in the panel instead of being drawn outside it. **Pro.**
- **Bar border colour and width.** The border is drawn *inside* the bar: a plain SVG stroke straddles the outline, so the bar would grow by half the width on each side and a zero value would stop sitting on the baseline — the chart would misreport through a drawing artefact. Width is capped at half the bar so the border cannot eat the bar. Free, and off by default.

### Changed (layout)
- **The layout now depends on the size of the visual.** Every margin was a constant — left 48, top 8, bottom 20, cell padding 10, panel title 22, variation row 30 — whatever the visual measured. On a 200×140 tile, which is what a small visual occupies on a dashboard, the Y axis took 24% of the width and the labels 43% of the height: the chart itself was left with about 124×10 pixels, and at 1000×120 it had none at all. Two changes, which is what the native visuals do: the left margin is now **measured** from the longest axis label and capped at 25% of the width, and below certain sizes elements are **removed rather than shrunk** — an illegible element takes up as much room as a legible one and tells you nothing.
- **The plot area is reserved first.** The ornaments get what is left over, in order of value: the legend goes first because it repeats what the bar colour already says, then the Y axis, then the panel title, then the X labels. The variation labels are last, because they are the product — a bar chart without the percentage is the native visual. The panel title only earns its place when there is more than one panel to tell apart, so with a single panel it yields before the X axis. Measured: +724% of drawing area at 200×140, +271% on a six-panel grid at 800×300, and +5% at the sizes where the chart was already comfortable.

### Added (small multiples)
- **Column count.** The grid was always automatic — `ceil(sqrt(n))` — which is a sensible guess and the wrong one often enough: two panels always came out side by side, five came out three and two. `Panel layout → Columns` takes the number; 0 keeps the automatic behaviour. It is capped at the number of panels, because asking for six columns with two panels leaves four empty cells and shrinks the two that matter. Free.
- **Filled header for the panel title.** The title could only be separated by a thin line. `Panel title → Style → Filled header` draws a band instead, with its own fill colour. Because both the title colour and the band colour are the user's to choose, they can collide: the title falls back to black or white whenever the WCAG contrast against the band drops below 3:1, which is the minimum for large bold text. Free.

### Accessibility and localization
- **Real high contrast support.** What existed was a switch in the format pane that the user had to find and turn on, which draws a diagonal pattern on negative bars. That is a colour-blindness aid, not high contrast: the visual never asked Power BI whether the Windows high contrast theme was active. It now reads `colorPalette.isHighContrast` and paints from the four guaranteed colours — bars filled with `background` and outlined in `foreground`, text and axes in `foreground`, the reference marker and analytical lines in `foregroundSelected`. Per-series and conditional colours stand down while the theme is on, because a colour chosen from a swatch has no contrast guarantee against it. The user's own colours are untouched and come back the moment the theme is turned off: the override is applied *after* the copy the format pane reads.
- **The format pane was not localized at all.** `capabilities.json` had **zero** `displayNameKey`, so the two `stringResources` folders were dead files that nothing ever read, and the pane showed the same English text whatever the report language. Worse, fifteen labels were raw identifiers — users were reading `DefaultBarColor`, `BarSettings`, `ShowArrows`. There are now 89 keys, complete in `en-US` and `es-ES`, and the runtime strings go through a `LocalizationManager`.
- **Three labels named the wrong thing.** `valueLabels.color` was labelled *AxisTextColor*, `variationLabels.negativeColor` *NegativeBarColor* and `colorSelector.fill` *DefaultBarColor* — each one the name of a different setting, so the pane was describing a property the user was not editing.
- **`host.allowInteractions` was ignored.** When a report author turns interactions off for the visual, Power BI sets that flag; the visual went on selecting anyway, so a click still cross-filtered the page. Clicks, context menu and selection now stand down, and the cursor stops offering something that will not happen.

### Fixed
- **The bar colour could not be set to the default blue.** The code used the default value itself as the signal for "the user has not chosen anything", so picking `#378ADD` — the very colour the pane offers — was discarded and the report theme colour was used instead. With a red theme every bar came out red while the pane showed blue. Whether a property is set is now read from `metadata.objects`, not guessed from its value. A legitimate value can never be a sentinel.
- **An unset bar colour painted the report theme colour while the pane showed blue.** Respecting the theme is reasonable, but not at the cost of the swatch lying about what is on the canvas. An unset colour now paints the declared default, and the per-series swatches under Series Colors show the same colour the bars use.
- **`LinesColor` did nothing.** It was read and exposed in the format pane but never used anywhere in the render — the Y axis is drawn with `tickSize(0)`, so there are no grid lines to colour. The setting is removed rather than given an invented meaning.
- **The watermark was barely visible.** Grey at 22% opacity disappeared on a light panel and on saturated bars alike. It now matches the rest of the portfolio: white outlined in dark — SVG has no `text-shadow`, so it is done with `stroke` and `paint-order` — and it names the feature that turned it on.

### Changed
- **The three reference wells are Pro.** They were free in 1.9.3.0, on the argument that comparing against a reference is the correct result rather than a cut-down one. That is still true, and the free tier does not lose its comparison: it compares against the previous category, which is equally correct. What is bought is the controlling reading — actual against plan, budget or last year.

## [1.9.3.0] — 2026-09-18

### Fixed
- **Only one purchase notice was reaching the user.** `notifyFeatureBlocked` and
  `notifyLicenseRequired` were called back to back, and Power BI shows a single notification at a
  time, so the second replaced the first: the banner naming the actual Pro feature was never seen.
  The previous notice is now cleared first, the banner names only the newly activated features, and
  the persistent Upgrade bar follows once the banner ends (~10.5 s). Pattern verified in Risk Matrix
  Pro in the Power BI service.
- Turning a Pro feature off no longer re-triggers a banner; only newly used features notify.

---

## [1.9.2.0] — 2026-09-15

1.9.1.0 was never submitted; 1.9.2.0 includes it.

### Added
- **Pro preview while editing.** Without a licence, in edit mode, Pro settings render working under a
  "Pro preview" watermark, as Microsoft's publishing guidelines allow for paid features. In reading
  view, before the licence resolves, or where Power BI cannot check licences (Publish to Web, embedding, export), the free result is shown with no
  watermark.
- **Landing page** with the data roles and the Pro plan features (`supportsLandingPage` was declared
  but not implemented).
- Persistent edit-mode licence icon (`notifyLicenseRequired`), alongside the feature banner.

### Changed
- **Sort order is free**, as it was in 1.9.0.0. Microsoft's guidelines require keeping the free
  functionality a visual already had.
- Licence notification text localized (English / Spanish).

### Certification
- `npm audit`: 0 vulnerabilities (`overrides` for `qs` and `uuid` in the build toolchain).
- `eslint` script added to `package.json`; ESLint returns no errors.

---

## [1.9.1.0] — 2026-09-15

### Fixed
- **A paying customer could stay on Free.** `spIdentifier` was compared with strict equality, while
  the Licensing API returns the full Service ID (`publisher.offer.plan`). It now accepts the Service
  ID or the Plan ID `bar-chart-variation-pro-tcviz`, and the Warning (payment grace period) state.
- **No purchase path.** Pro settings switched off silently and Power BI's licence notifications were
  never called. `notifyFeatureBlocked` now names what the user tried to use, only once the licence
  has resolved and never where licences cannot be checked (Publish to Web, exports).
- **Licensing UI of our own removed.** The pink "Pro: +N more panels" text is now a neutral note,
  "Showing 3 of N panels".
- **Sort order worked on Free.** It was applied before the Pro gate.
- **Pro toggles snapped back off in the Format pane.** The pane read the gated values; it now reads
  the user's own settings.
- **Licence off the render path.** `update()` no longer awaits the licence on every update.

### Added
- Legend → Text Color.
- Vertical scroll: Panel Layout → Min Panel Height (px). Previously only horizontal scroll existed and
  panels were squashed when there were many rows.

### Changed
- "(Pro)" on Data Labels, Analytical Lines, Sort Order and Bar Colors.
- Unused "Upgrade to Pro" string resource removed.

### Documentation
- Bar Colors is a colour picker per category, not conditional formatting through the fx button.
- Pro shows up to 100 panels, not unlimited.
- Drill-down is no longer claimed: `capabilities.json` declares no `drilldown` object.

---

## [1.9.0.0] — 2026-08-07

### Added
- **Tooltips bucket** — drag any measure or dimension field to add custom rows to the tooltip
- **Conditional formatting per bar** — native Power BI fx button in Format pane → Bar Colors (Pro)
- **Panel title show/hide** — toggle the panel title on or off
- **Panel title position** — choose Top or Bottom placement
- **Axis sort order** — Ascending and Descending options in addition to Auto (Pro)
- **Value labels (data labels)** — display numeric value on each bar with configurable color, font size, display units, and decimal places (Pro)
- **Panel background color** — configurable fill color and opacity per panel
- **X axis label control** — show/hide X labels, configurable font size
- **Y axis label control** — show/hide Y labels, configurable font size
- **High contrast accessibility mode** — negative bars rendered with diagonal stripe pattern
- **Horizontal scroll** — with configurable minimum panel width
- **Bar corner radius** — configurable in Panel Layout

### Changed
- Panel title now falls back to measure display name when no Small Multiple field is assigned (previously showed "Series")
- Freemium gates expanded: analytical lines, conditional formatting, value labels, and sort order (Asc/Desc) are now Pro-only features
- Tooltip implementation migrated from direct `ITooltipService` calls to official `TooltipServiceWrapper` for full Power BI Desktop compatibility
- Removed tcviz.com watermark from visual canvas

### Fixed
- Sort order was reordering labels only — data values now follow the sort correctly
- `build-test.js` restore logic made more robust against sandbox timeouts

---

## [1.8.0.0] and earlier

Initial releases covering:
- Core bar chart with automatic variation %
- Small Multiples with shared Y scale
- Variation labels (arrows, connectors, colors, decimal places)
- Analytical lines: Average, Max, Min, Median, Reference (Pro)
- Reference band with color and opacity (Pro)
- Drilldown support
- Legend (show/hide, position)
- Cross-filtering and multi-select
- Context menu (right-click)
- Power BI rendering events and highlight support
