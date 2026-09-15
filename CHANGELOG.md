# Changelog — Bar Chart with Variation %

All notable changes to this visual are documented here.

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
