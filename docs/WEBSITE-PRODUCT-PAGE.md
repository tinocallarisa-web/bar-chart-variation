# Bar Chart with Variation % — Product Page Content

---

## TAB 1: OVERVIEW

### Headline
**Better than last month is not the same as on plan.**

### Subheadline
Bar Chart with Variation % writes the percentage change between bars by itself, and draws a marker where the figure should have been — your plan, your budget, your forecast or last year.

### The Problem It Solves
Every analyst has written the same DAX measure: `DIVIDE([Current] - [Previous], [Previous])`. Then formatted it. Then styled the positive and negative colours. Then added arrows. Then repeated it for every metric in every report.

Bar Chart with Variation % removes that work. But comparing each bar with the one before it only answers half the question. A month can be better than the last one and still be well short of plan, and that is the number the meeting is about.

Bind your plan, your budget, your forecast or last year, and every bar gets a horizontal marker at that level. The bar is the actual figure; the marker says where it should be. It takes no measure of your own beyond the one you already have: no `DATEADD`, no date table, no variance column.

### How It Works
1. Drag a date or category field to **Axis**
2. Drag a numeric measure to **Values**
3. Done — variation % labels appear automatically between bars

### Who It's For
- Business analysts building period-over-period comparison reports
- Finance teams tracking budget vs actual across categories
- Operations dashboards comparing performance across regions or products
- Any Power BI user who needs clean, annotated bar charts without DAX complexity

### What Makes It Different
- **The reference marker** — plan, budget, forecast or last year, drawn on the bar and included in the Y scale, so a plan above actual still fits in the panel
- **No DAX required** — the variation is computed inside the visual, and the reference is the measure you already have
- **Small Multiples with shared Y scale** — all panels use the same axis for honest comparison, with a column count you choose
- **It reads well small** — the layout follows the size of the visual: in a tile the legend and the axis step aside so the bars stay legible, and come back as you enlarge it
- **Analytical lines** — average, min, max, median and reference lines across all panels at once
- **Per-bar colours** — one colour picker per category in Format pane → Bar Colors (Pro)
- **Accessible** — the Windows high contrast theme is followed with nothing to turn on, and the format pane is available in Spanish

### At a Glance
| | |
|---|---|
| Version | 1.10.0.0 |
| Availability | Microsoft AppSource |
| License | Free / Pro |
| API | Power BI Visuals API 5.11 |
| Support | support@tcviz.com |

---

## TAB 2: FEATURES

### Core (Free)

**Automatic Variation %**
Calculates `(current − previous) / |previous| × 100` for every consecutive bar pair. Configurable decimal places, arrow direction indicators, and dashed connector lines.

**Bar Chart**
Standard vertical bar chart with configurable colours for positive and negative values, opacity, corner radius and axis label styling. Bar borders with their own colour and width, drawn inside the bar so a zero value still sits on the baseline.

**Small Multiples**
Split any measure into multiple panels by dragging a category field to the Small Multiple bucket. All panels share the same Y scale for honest visual comparison. Set the number of columns or leave it automatic. Free tier: up to 3 panels.

**Tooltips**
Hover any bar to see: value, previous value, absolute change, and variation %. Drag extra fields into the Tooltips bucket to show additional context (budget, units, region, etc.).

**Interactivity**
Cross-filter other visuals by clicking bars. Multi-select with Ctrl+Click. Right-click for the Power BI context menu. Drill-down when the Axis field has a hierarchy.

**Axis & Labels**
Show/hide X and Y axis labels independently. Configure font size for each. Panel title with position (top/bottom), color, and font size.

**Panel Layout**
Set the column count, and a minimum panel width and height in pixels — the visual scrolls when panels don't fit. Configurable bar corner radius.

**Panel Titles**
Position top or bottom, with a separator line or a filled header in a colour of your choosing. If the title colour would not read against the header, it falls back to black or white automatically.

**A Layout That Follows The Size**
Margins are measured, not fixed, and below certain sizes elements are removed rather than shrunk — the legend first, then the Y axis, the panel title and the X labels, in that order. The variation labels are last, because they are the point of the visual. Your settings are never modified: what you turn on is the maximum, and everything returns as you enlarge the visual.

**Panel Background**
Optional background color per panel with configurable opacity. Useful for visually separating panels in dense dashboards.

**Legend**
Show/hide legend with position (top or bottom). Color swatches match series colors.

**Accessibility and languages**
The Windows high contrast theme is followed with nothing to turn on: the visual takes the theme's own colours and gives yours back untouched when you turn it off. Separately, a high contrast switch renders negative bars with a diagonal stripe pattern, readable without colour distinction for colour-blind users or print. The format pane is available in English and Spanish, and the visual honours interactions being turned off for it.

---

### Pro Features

**Reference Measures** ⭐ Pro
Bind `Previous Year`, `Plan / Budget` or `Forecast` and pick it under Comparison → Compare to. Every bar gets a horizontal marker at that level, and the reference is included in the Y scale so a plan above actual still fits inside the panel. Absolute variance shows the size of the gap instead of its ratio. The free tier keeps comparing against the previous category, which is an equally correct answer.

**Analytical Lines** ⭐ Pro
Draw reference lines across all panels simultaneously:
- Average, Max, Min, Median
- Custom reference value (budget, target, threshold)
- Configurable color, line style (solid/dashed/dotted), and label

**Reference Band** ⭐ Pro
Define a min/max corridor (e.g., acceptable variation range). Bars inside the band are on track. Configurable color and opacity.

**Per-bar Colours** ⭐ Pro
One colour picker per category in Format pane → Bar Colors.

**Value Labels** ⭐ Pro
Display the numeric value on each bar. Configurable color, font size, display units (none, thousands, millions, billions), and decimal places.

**Sort Order** ⭐ Pro
Sort the X axis categories: Auto (Power BI order), Ascending, or Descending. Sorting reorders both the labels and the underlying data values correctly.

**Up to 100 Panels** ⭐ Pro
Remove the 3-panel limit of the Free tier. Display as many Small Multiple panels as your data requires.

---

### Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Variation % (automatic) | ✅ | ✅ |
| Bar chart | ✅ | ✅ |
| Small Multiples | Max 3 panels | Up to 100 |
| Tooltips | ✅ | ✅ |
| Cross-filtering | ✅ | ✅ |
| Drill-down | ✅ | ✅ |
| Axis labels | ✅ | ✅ |
| Panel title, header & background | ✅ | ✅ |
| Panel columns | ✅ | ✅ |
| Bar border colour & width | ✅ | ✅ |
| Sort order (Asc/Desc) | ✅ | ✅ |
| Windows high contrast & Spanish | ✅ | ✅ |
| Reference measures (LY, Plan, Forecast) | ❌ | ✅ |
| Absolute variance | ❌ | ✅ |
| Analytical lines | ❌ | ✅ |
| Reference band | ❌ | ✅ |
| Per-bar colours | ❌ | ✅ |
| Value labels | ❌ | ✅ |

---

## TAB 3: TECHNICAL

### Field Wells

| Bucket | Role | Required | Description |
|---|---|---|---|
| Axis | category | Yes | X axis categories (dates, years, products, etc.) |
| Values | measure | Yes | Numeric measure for bar height and variation % |
| Small Multiple | series | No | Category to split into panels |
| Tooltips | tooltips | No | Additional fields shown in the tooltip |

### Data Limits
- Axis: up to 1,000 categories
- Small Multiple: up to 100 series
- Tooltips: any number of fields

### Power BI Compatibility
- Power BI Desktop
- Power BI Service
- Power BI Embedded
- Power BI Mobile (read-only)

### API & Dependencies
- Power BI Visuals API 5.11.0
- D3.js 7.9.0
- powerbi-visuals-utils-formattingutils 6.1.2
- powerbi-visuals-utils-tooltiputils 3.x

### Privacy
This visual makes no external network requests. No data leaves the Power BI environment. No telemetry, no analytics, no CDN calls at runtime. Full privacy policy: https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html

### License
Licensed via Microsoft AppSource. Validation uses the official `IVisualLicenseManager` API. No external license server. Free tier is always available without any license.

### Support
- Email: support@tcviz.com
- Documentation: https://tinocallarisa-web.github.io/bar-chart-variation/support.html
- GitHub Issues: https://github.com/tinocallarisa-web/bar-chart-variation/issues

---

## TAB 4: CHANGELOG

### v1.9.0.0
**Added**
- Tooltips bucket — drag any field to add custom rows to the tooltip
- Per-bar colours in Bar Colors (earlier documents called this conditional formatting via the fx button; it is a colour picker per category)
- Panel title show/hide and position (top/bottom)
- Axis sort order: Ascending / Descending (Pro)
- Value labels: show/hide, color, font size, display units, decimal places (Pro)
- Panel background color with opacity
- Show/hide X and Y axis labels independently, with configurable font size
- High contrast accessibility mode (diagonal stripe for negative bars)
- Scroll with configurable min panel width
- Bar corner radius

**Changed**
- Panel title now falls back to measure name when no Small Multiple field is assigned
- Freemium limits: analytical lines, conditional formatting, value labels, and sort order are now Pro-only
- Tooltip implementation migrated to official TooltipServiceWrapper

**Fixed**
- Sort order now correctly reorders data values alongside labels (was label-only)
- Panel title showing "Series" when no Small Multiple field assigned

### v1.8.0.0 and earlier
Initial releases with core variation %, small multiples, analytical lines, drilldown, legend, and selection support.
