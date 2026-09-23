# Certification Notes — Bar Chart with Variation % v1.10.0.0

The short version to paste into Partner Center is
[`CERTIFICATION-NOTES-SHORT.txt`](./CERTIFICATION-NOTES-SHORT.txt). That field truncates at 2,500
characters without warning.

## Visual Information

| Field | Value |
|---|---|
| Display Name | Bar Chart with Variation % |
| GUID | barChartVariation98877665544332211 |
| Version | 1.10.0.0 |
| Author | TCViz |
| Support URL | https://tinocallarisa-web.github.io/bar-chart-variation/support.html |
| Privacy URL | https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html |

## Links

- **Certification branch:** https://github.com/tinocallarisa-web/bar-chart-variation/tree/certification
- **Support page:** https://tinocallarisa-web.github.io/bar-chart-variation/support.html
- **Privacy policy:** https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html
- **Terms of service:** https://tinocallarisa-web.github.io/bar-chart-variation/terms.html
- **Demo video:** https://www.youtube.com/watch?v=vIszaUlC6G0

---

## What changed in 1.10.0.0

### Three reference measures (Pro)

`Previous Year`, `Plan / Budget` and `Forecast`. Until now the variation was always against the
previous category on the axis, which answers "is this month better than the last one" but not "are
we on plan". Bind one of the three, pick it under **Format → Comparison → Compare to**, and every
bar gets a horizontal marker at the reference level: the bar is the actual figure and the marker
says where it should be. The reference is included in the Y domain, so a plan above actual still
fits inside the panel instead of being drawn outside it.

The three wells are Pro. The free tier does not lose its comparison: it keeps comparing against the
previous category, which is an equally correct result rather than a cut-down one.

### Accessibility, localization and interactions — three claims made good

These three were previously **claimed and not implemented**, one of them in this very document.
They are listed in full because the earlier version of these notes was wrong about them.

- **High contrast.** What existed was a manual switch in the format pane that draws a diagonal
  pattern on negative bars — a colour-blindness aid, not high contrast. The visual never asked
  Power BI whether the Windows high contrast theme was active. It now reads
  `colorPalette.isHighContrast` and paints from the four guaranteed colours: bars filled with
  `background` and outlined in `foreground`, text and axes in `foreground`, reference marker and
  analytical lines in `foregroundSelected`. Per-series and conditional colours stand down while the
  theme is active, because a colour picked from a swatch has no contrast guarantee against it. The
  override is applied *after* the copy the format pane reads, so the user's own colours are
  untouched and return the moment the theme is turned off.
- **Localization.** `capabilities.json` contained **zero** `displayNameKey`, so the two
  `stringResources` folders were dead files and the pane showed the same English text whatever the
  report language. Fifteen labels were raw identifiers — users were reading `DefaultBarColor`,
  `BarSettings`, `ShowArrows` — and three named a different setting from the one being edited.
  There are now 95 keys, complete in `en-US` and `es-ES`, plus a `LocalizationManager` for the
  strings the code draws.
- **`host.allowInteractions`.** When a report author turns interactions off for the visual, Power BI
  sets that flag; the visual went on selecting anyway, so a click still cross-filtered the page.
  Clicks, context menu and selection now stand down.

### Layout that depends on the size of the visual

Every margin was a constant regardless of the viewport, so on a 200×140 tile the Y axis took 24% of
the width and the labels 43% of the height, leaving the chart about 124×10 pixels; at 1000×120 it
had none. The left margin is now measured from the longest axis label and capped at 25% of the
width, and below certain sizes elements are removed rather than shrunk. The plot area is reserved
first and the ornaments take what is left, in order of value: legend, Y axis, panel title, X labels,
and the variation labels last, because they are what the visual is for. The user's settings are not
modified — what they enabled is the maximum, and the format pane still shows their choice.

### Smaller additions

- **Small multiples column count** (`Panel layout → Columns`, 0 = automatic), capped at the number
  of panels. Free.
- **Filled header for the panel title** as an alternative to the separator line, with its own fill
  colour. Both the title colour and the band colour are the user's to choose, so the title falls
  back to black or white whenever the WCAG contrast against the band drops below 3:1. Free.
- **Bar border colour and width**, drawn *inside* the bar: a plain SVG stroke straddles the outline,
  so the bar would grow by half the width on each side and a zero value would stop sitting on the
  baseline. Free, off by default.

### Fixed

- **The bar colour could not be set to the default blue.** The code used the default value itself as
  the signal for "the user has not chosen anything", so picking `#378ADD` — the very colour the pane
  offers — was discarded and the report theme colour used instead. Read from `metadata.objects` now.
- **`LinesColor` did nothing.** Exposed in the pane, never used in the render. Removed rather than
  given an invented meaning.
- **The watermark was barely visible.** Grey at 22% opacity. Now white outlined in dark, and it
  names the feature that turned it on.

---

## What changed in 1.9.2.0

1.9.1.0 was never submitted. 1.9.2.0 contains everything below, plus:

- **Pro preview with watermark.** Following the publishing guidelines ("use watermarks only for paid
  features used without a valid licence"), a free user editing a report, whose licence has resolved,
  in an environment that supports licensing, sees Pro settings working under a "Pro preview"
  watermark. In reading view (`viewMode` 0), before the licence resolves, or where it cannot be read
  (Publish to Web, embedding, export), the free result
  renders with no watermark, so a paying customer never sees it on a published report. Free
  features never carry a watermark.
- **Sort order is free again.** It worked without a licence in the published 1.9.0.0, and the
  guidelines require keeping the same level of free functionality.
- **Landing page implemented.** `supportsLandingPage` was declared without one. It explains the
  data roles and lists the Pro plan features; SVG text only, no `innerHTML`.
- **Notifications localized** (en / es, under 500 characters), and `notifyLicenseRequired(General)`
  added for the persistent edit-mode icon.
- **Certification commands:** `npm audit` returns 0 vulnerabilities (`overrides` for `qs` and `uuid`
  in the dev toolchain); `npm run eslint` returns no errors; `package.json` has the required
  `eslint` script.

## Findings fixed since 1.9.0.0

1.9.0.0 is published. An internal audit found that its licensing gave a paying customer no way in
and a free user no way to buy.

| Problem in 1.9.0.0 | Fix in 1.9.1.0 |
|---|---|
| `spIdentifier` compared with strict equality; the Licensing API returns the full Service ID (`publisher.offer.plan`) | `matchesPlan()` accepts the full Service ID or the Plan ID `bar-chart-variation-pro-tcviz` on its own |
| Only `Active` accepted | `Warning` (payment grace period) accepted too |
| `isLicenseUnsupportedEnv` / `isLicenseInfoAvailable` ignored | Honoured: no purchase prompt where a Pro customer cannot be recognised |
| Licence awaited inside `update()` on every update, between `renderingStarted` and drawing | `update()` is synchronous; the licence is requested once, deferred, and repaints only from Free to Pro |
| Pro settings switched off silently; no `notifyFeatureBlocked` / `notifyLicenseRequired` call | `notifyFeatureBlocked` names what the user tried to use; cleared when it is turned off |
| The chart drew its own "Pro: +N more panels" text | Replaced by a neutral note, "Showing 3 of N panels" |
| Format pane read the gated values, so a Pro toggle snapped back off | The pane reads the user's own values |
| Pro settings unlabelled | "(Pro)" on Data Labels, Analytical Lines and Bar Colors |

Also new: legend text colour, and vertical scroll with a minimum panel height (horizontal scroll
already existed). The unused "Upgrade to Pro" string resource was removed.

Documentation corrections: earlier documents described Bar Colors as conditional formatting through
the fx button. It is a colour picker per category, with no `rule` in `capabilities.json`. "Unlimited
panels" is corrected to up to 100 (the `dataReductionAlgorithm` for series). Drill-down is no longer
claimed: `capabilities.json` declares no `drilldown` object.

---

## License Validation

Official `IVisualLicenseManager` only: `getAvailableServicePlans()`, matched to the Pro plan with
`matchesPlan(spIdentifier, "bar-chart-variation-pro-tcviz")`, states Active (1) and Warning (2).

- No external server calls for license validation
- Requested once, deferred with `setTimeout`, never inside the render path
- If validation fails or is unavailable, the visual stays on the Free tier and no purchase prompt is shown
- The purchase path is Power BI's own `notifyFeatureBlocked`, only after the licence has resolved

---

## Free vs Pro Features

### Free tier (no license required)
- Bar chart with automatic variation % between consecutive bars
- Up to 3 Small Multiple panels, with a neutral note when more exist
- Variation labels with arrows and connectors
- Default, negative and series colours
- Axis labels, panel titles, panel backgrounds, legend (with text colour)
- Horizontal and vertical scroll
- Sort order: Ascending and Descending
- Tooltips (value, change, variation %, extra tooltip fields)
- Cross-filtering, context menu, highlighting (honouring `host.allowInteractions`)
- Bar border colour and width
- Small multiples column count, and the filled header for panel titles
- Windows high contrast theme, and the format pane in Spanish

### Pro tier (requires AppSource license)
- Up to 100 Small Multiple panels
- Analytical lines: Average, Max, Min, Median, Reference line
- Reference band (min/max corridor)
- Value labels on bars
- Per-bar colours (Bar Colors, one picker per category)
- The three reference measures: Previous Year, Plan / Budget and Forecast
- Absolute variance (the relative percentage stays free)
- Without a licence these render as a "Pro preview" with a watermark (see above)

---

## Privacy & Network Access

This visual makes **no external network requests** of any kind. `privileges` is `[]`.

- No telemetry, no analytics calls, no CDN or font loading at runtime
- No data leaves the Power BI environment
- All computation is local and in-memory

Data processed: category labels, numeric measure values, and optional tooltip field values — all
sourced exclusively from the Power BI dataView passed to `update()`.

---

## Capabilities Compliance

All five required flags are present in `capabilities.json`: `supportsHighlight`,
`supportsSynchronizingFilterState`, `supportsLandingPage`, `supportsKeyboardFocus`,
`supportsMultiVisualSelection`.

Rendering events are emitted on every path of `update()`, including the early return with no data.
The licence request and notification run after the try/catch, so they can never turn a correct render
into `renderingFailed`.

Filter-in (highlight) is supported: non-highlighted bars are rendered at 30% opacity.

---

## Testing Instructions

### Free tier test (submitted package, no active plan)
1. Add the visual with no fields — the landing page explains the data roles
2. Assign a date or category field to **Axis** and a numeric measure to **Values** — variation % appears automatically between bars
3. In edit mode, add a field with more than 3 values to **Small Multiple** — all panels render under a "Pro preview" watermark, and Power BI raises its licence banner and edit-mode icon. Switch to reading view — 3 panels and a neutral note, no watermark
4. Turn on **Analytical Lines (Pro) → Show Average** or **Data Labels (Pro) → Show** — the feature renders with the watermark and the banner names it
5. Turn those settings off and use 3 panels or fewer — the watermark and the notification clear
6. Set **Sort Order → Ascending** — bars reorder, no watermark (free feature)
7. Click a bar — other visuals cross-filter. Turn interactions off for the visual from the report — the click stops filtering
8. Bind a measure to **Plan / Budget** and set **Comparison → Compare to → Plan** — the marker renders on every bar under the watermark. Switch to reading view — the comparison returns to the previous category and the marker disappears
9. Turn the Windows high contrast theme on — bars take the theme colours and negatives keep their pattern; turn it off and the user's colours return unchanged
10. Set the report language to Spanish — the format pane is in Spanish
11. Shrink the visual to roughly 200×140 — the legend, the panel title and the X labels drop out and the bars stay legible; enlarge it and they come back
12. Publish to Web or export (unsupported licensing environment) — 3 panels and a neutral note, no watermark, no purchase prompt

### Pro tier test (same package, active "bar-chart-variation-pro-tcviz" plan)
1. More than 3 Small Multiple values — all panels render, no note
2. Analytical Lines → Average — the line renders in every panel
3. Data Labels → Show — values appear on bars
4. Sort Order → Ascending / Descending — bars reorder with their values
5. Bar Colors → pick a colour for one category — that bar changes
6. Panel Layout → raise Min Panel Height with many panels — a vertical scroll bar appears
7. Panel Layout → Columns = 2 with six panels — two columns and three rows
8. Comparison → Compare to → Previous Year / Plan / Forecast — the marker follows the chosen measure

---

## Known Warnings (non-blocking)

- `Format Pane`: the classic `enumerateObjectInstances` API is used; migration to
  `getFormattingModel` is not yet required. It is the only feature warning the build still
  reports — `High Contrast`, `Localizations`, `Color Palette` and `Allow Interactions` were all
  resolved in this version.
