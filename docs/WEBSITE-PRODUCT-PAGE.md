# Bar Chart with Variation % — Product Page Content

---

## TAB 1: OVERVIEW

### Headline
**Stop writing DAX for % change. This visual does it for you.**

### Subheadline
Bar Chart with Variation % automatically calculates and displays the percentage change between consecutive bars — in any Power BI report, with zero formulas.

### The Problem It Solves
Every analyst has written the same DAX measure: `DIVIDE([Current] - [Previous], [Previous])`. Then formatted it. Then styled the positive/negative colors. Then added arrows. Then repeated it for every metric in every report.

Bar Chart with Variation % eliminates that work entirely. Drop your measure in, and the variation % appears automatically — between every bar, for every panel, across every Small Multiple.

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
- **No DAX required** — variation is computed inside the visual
- **Small Multiples with shared Y scale** — all panels use the same axis for honest comparison
- **Analytical lines** — average, min, max, median, and reference lines across all panels simultaneously
- **Per-bar colours** — one colour picker per category in Format pane → Bar Colors (Pro)
- **Custom tooltips** — drag any field into the Tooltips bucket

### At a Glance
| | |
|---|---|
| Version | 1.9.1.0 |
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
Standard vertical bar chart with configurable colors for positive and negative values, opacity, border radius, and axis label styling.

**Small Multiples**
Split any measure into multiple panels by dragging a category field to the Small Multiple bucket. All panels share the same Y scale for honest visual comparison. Free tier: up to 3 panels.

**Tooltips**
Hover any bar to see: value, previous value, absolute change, and variation %. Drag extra fields into the Tooltips bucket to show additional context (budget, units, region, etc.).

**Interactivity**
Cross-filter other visuals by clicking bars. Multi-select with Ctrl+Click. Right-click for the Power BI context menu. Drill-down when the Axis field has a hierarchy.

**Axis & Labels**
Show/hide X and Y axis labels independently. Configure font size for each. Panel title with position (top/bottom), color, and font size.

**Panel Layout**
Set minimum panel width in pixels — the visual scrolls horizontally when panels don't fit. Configurable bar corner radius.

**Panel Background**
Optional background color per panel with configurable opacity. Useful for visually separating panels in dense dashboards.

**Legend**
Show/hide legend with position (top or bottom). Color swatches match series colors.

**Accessibility**
High contrast mode renders negative bars with a diagonal stripe pattern — readable without color distinction for color-blind users or print.

---

### Pro Features

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
| Panel title & background | ✅ | ✅ |
| High contrast mode | ✅ | ✅ |
| Analytical lines | ❌ | ✅ |
| Reference band | ❌ | ✅ |
| Per-bar colours | ❌ | ✅ |
| Value labels | ❌ | ✅ |
| Sort order (Asc/Desc) | ❌ | ✅ |

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
