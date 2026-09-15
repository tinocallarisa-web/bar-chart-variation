# Certification Notes — Bar Chart with Variation % v1.9.0.0

## Visual Information

| Field | Value |
|---|---|
| Display Name | Bar Chart with Variation % |
| GUID | barChartVariation98877665544332211 |
| Version | 1.9.0.0 |
| Author | Tino Callarisa / TCViz |
| Support URL | https://tinocallarisa-web.github.io/bar-chart-variation/support.html |
| Privacy URL | https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html |

## Links

- **Certification branch:** https://github.com/tinocallarisa-web/bar-chart-variation/tree/certification
- **Support page:** https://tinocallarisa-web.github.io/bar-chart-variation/support.html
- **Privacy policy:** https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html
- **Terms of service:** https://tinocallarisa-web.github.io/bar-chart-variation/terms.html
- **Demo video:** https://www.youtube.com/watch?v=hALaKTXPsMA

---

## License Validation

License is resolved via the official Power BI `IVisualLicenseManager` API:

```typescript
const licenseResult = await this.licenseManager.getAvailableServicePlans();
this.isPro = licenseResult.plans?.some(
    plan => plan.spIdentifier === "bar-chart-variation-pro-tcviz" &&
            plan.state === ServicePlanState.Active
) ?? false;
```

- No external server calls for license validation
- Resolution is asynchronous and does not block rendering
- If validation fails or is unavailable, the visual falls back gracefully to the Free tier
- `ServicePlanState.Active` is used as the numeric literal `1` due to `const enum` constraints

---

## Free vs Pro Features

### Free tier (no license required)
- Bar chart with automatic variation % between consecutive bars
- Up to 3 Small Multiple panels
- Variation labels with arrows and connectors (color, decimals, show/hide)
- Bar colors (default, negative)
- Axis labels (X and Y, show/hide, font size)
- Panel title (show/hide, position top/bottom, color)
- Panel background color
- Legend (show/hide, position)
- Tooltips (value, previous, change, variation %, extra tooltip fields)
- Cross-filtering and context menu
- Drill-down support
- High contrast accessibility mode
- Sort order: Auto only

### Pro tier (requires AppSource license)
- Unlimited Small Multiple panels (Free is capped at 3)
- Analytical lines: Average, Max, Min, Median, Reference line
- Reference band (min/max corridor)
- Conditional formatting per bar (fx button in format pane)
- Value labels (data labels on bars)
- Sort order: Ascending and Descending

---

## Privacy & Network Access

This visual makes **no external network requests** of any kind.

- No telemetry
- No analytics calls
- No CDN or font loading at runtime
- No data leaves the Power BI environment
- All computation is local and in-memory

Data processed: category labels, numeric measure values, and optional tooltip field values — all sourced exclusively from the Power BI dataView passed to `update()`.

---

## Capabilities Compliance

All five required flags are present in `capabilities.json`:

```json
"supportsHighlight": true,
"supportsSynchronizingFilterState": true,
"supportsLandingPage": true,
"supportsKeyboardFocus": true,
"supportsMultiVisualSelection": true
```

Rendering events are implemented in all code paths of `update()`:

```typescript
this.events.renderingStarted(options);
try {
    // render logic
    this.events.renderingFinished(options);
} catch (e) {
    this.events.renderingFailed(options, String(e));
}
```

Filter-in (highlight) is supported: non-highlighted bars are rendered at 30% opacity.

---

## Testing Instructions

### Free tier test
1. Import the visual `.pbiviz` file into Power BI Desktop
2. Add the visual to a report page
3. Assign a date/year field to **Axis** and a numeric measure to **Values**
4. Verify: variation % appears automatically between bars
5. Add a category field to **Small Multiple** — verify up to 3 panels render, 4th is blocked with message
6. Open Format pane → verify Analytical Lines toggle has no effect
7. Verify Bar Colors has no fx button active for CF
8. Verify Value Labels toggle has no effect
9. Verify Sort Order only shows "Auto"
10. Click a bar — verify cross-filtering works on other visuals

### Pro tier test
_(Use build with `isPro = true` or assign AppSource license)_
1. Enable Analytical Lines → Average — verify line renders across all panels
2. Enable Conditional Formatting via Format pane → Bar Colors → fx button
3. Enable Value Labels → verify numbers appear on bars
4. Change Sort Order to Ascending/Descending — verify bars reorder with correct values
5. Add more than 3 Small Multiple panels — verify all render
6. Drag a field into Tooltips bucket — verify it appears in tooltip on hover

---

## Known Warnings (non-blocking)

The following warnings appear in the pbiviz build output and are informational only:

- `Format Pane`: references new Format Pane API (getFormattingModel). The classic `enumerateObjectInstances` API is used intentionally for API 5.11 compatibility.
- `High Contrast`, `Localizations`, `Allow Interactions`: recommended features, not required for certification.

These warnings do not affect visual functionality.
