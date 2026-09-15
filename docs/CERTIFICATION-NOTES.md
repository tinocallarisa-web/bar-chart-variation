# Certification Notes — Bar Chart with Variation % v1.9.1.0

The short version to paste into Partner Center is
[`CERTIFICATION-NOTES-SHORT.txt`](./CERTIFICATION-NOTES-SHORT.txt). That field truncates at 2,500
characters without warning.

## Visual Information

| Field | Value |
|---|---|
| Display Name | Bar Chart with Variation % |
| GUID | barChartVariation98877665544332211 |
| Version | 1.9.1.0 |
| Author | TCViz |
| Support URL | https://tinocallarisa-web.github.io/bar-chart-variation/support.html |
| Privacy URL | https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html |

## Links

- **Certification branch:** https://github.com/tinocallarisa-web/bar-chart-variation/tree/certification
- **Support page:** https://tinocallarisa-web.github.io/bar-chart-variation/support.html
- **Privacy policy:** https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html
- **Terms of service:** https://tinocallarisa-web.github.io/bar-chart-variation/terms.html
- **Demo video:** https://www.youtube.com/watch?v=hALaKTXPsMA

---

## What changed in 1.9.1.0

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
| Sort order worked on Free (applied before the gate) | Gated where it is applied |
| Format pane read the gated values, so a Pro toggle snapped back off | The pane reads the user's own values |
| Pro settings unlabelled | "(Pro)" on Data Labels, Analytical Lines, Sort Order and Bar Colors |

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
- Tooltips (value, change, variation %, extra tooltip fields)
- Cross-filtering, context menu, highlighting
- High contrast pattern for negative bars

### Pro tier (requires AppSource license)
- Up to 100 Small Multiple panels
- Analytical lines: Average, Max, Min, Median, Reference line
- Reference band (min/max corridor)
- Value labels on bars
- Sort order: Ascending and Descending
- Per-bar colours (Bar Colors, one picker per category)

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
1. Assign a date or category field to **Axis** and a numeric measure to **Values**
2. Verify: variation % appears automatically between bars
3. Add a field with more than 3 values to **Small Multiple** — 3 panels render, a grey note reads "Showing 3 of N panels", and Power BI raises its licence notification
4. Turn on **Analytical Lines (Pro) → Show Average**, **Data Labels (Pro) → Show**, or set **Sort Order (Pro)** — the setting stays on in the pane, the chart keeps the free result, and Power BI raises its notification
5. Turn those settings off and use 3 panels or fewer — the notification clears
6. Click a bar — other visuals cross-filter

### Pro tier test (same package, active "bar-chart-variation-pro-tcviz" plan)
1. More than 3 Small Multiple values — all panels render, no note
2. Analytical Lines → Average — the line renders in every panel
3. Data Labels → Show — values appear on bars
4. Sort Order → Ascending / Descending — bars reorder with their values
5. Bar Colors → pick a colour for one category — that bar changes
6. Panel Layout → raise Min Panel Height with many panels — a vertical scroll bar appears

---

## Known Warnings (non-blocking)

- `Format Pane`: the classic `enumerateObjectInstances` API is used; migration to
  `getFormattingModel` is not yet required.
