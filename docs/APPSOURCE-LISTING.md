# AppSource listing copy — Bar Chart with Variation % v1.10.0.0

Copy ready to paste into Partner Center, English only. **The marketplace description is the
documentation most people read** — update it on every release.

Limits measured in Partner Center: *Search results summary* 100 characters, *Description*
5,000 (truncated silently). **Editing this file does not change the offer**: the field
Microsoft reviews lives only in the console.

This file did not exist before 1.10.0.0. The offer has a description in Partner Center, but
it was never kept under version control, so nobody could tell what the live text said
without opening the console. Paste this over it.

---

## Offer name

```
Bar Chart with Variation %
```

---

## Search results summary

```
Bar charts that show the % change and how far you are from plan, budget or last year.
```

---

## Description

```
A bar chart that compares each month against the one before answers "is this month better than the last one". It does not answer the question the meeting is actually about: are we on plan.

Bar Chart with Variation % answers both. It writes the percentage change between bars by itself, and it draws a marker where the figure should have been — your plan, your budget, your forecast or last year. No DATEADD, no date table, no variance column.

THE COMPARISON

• The variation % between consecutive bars, with arrows and connectors, calculated for you
• A reference marker on every bar: bind Plan / Budget, Forecast or Previous Year and pick it under Compare to
• The reference is included in the Y scale, so a plan above actual still fits inside the panel
• Absolute variance as well as the percentage, when the size of the gap matters more than its ratio
• Sort by value, ascending or descending, and the variation follows the new order

SMALL MULTIPLES

• One panel per category, with a shared Y scale so the panels are actually comparable
• Choose the number of columns, or leave it automatic
• Panel titles with a separator line or a filled header
• Minimum panel size with scroll, so a long list of categories does not squeeze the bars flat

READS WELL AT ANY SIZE

The layout follows the size of the visual. In a small tile the legend, the axis and the titles step aside so the bars and their percentages stay legible, and they come back as you enlarge it. Your settings are never changed: what you turn on is the maximum, not an obligation.

INTEGRATED WITH POWER BI

• Click a bar to cross-filter the report, and the visual honours interactions being turned off
• Filters and highlighting from other visuals are reflected in the bars
• Tooltips with the value, the change and its percentage, plus any extra field you drag in
• Drill down and drill up, the context menu, keyboard navigation and screen reader labels
• The Windows high contrast theme, followed with nothing to turn on
• Format pane in English and Spanish

PRO

• The three reference measures: Previous Year, Plan / Budget and Forecast
• Absolute variance
• Up to 100 small multiple panels
• Analytical lines — average, maximum, minimum, median and a reference line — and a reference band
• Value labels on the bars
• Per-bar colours

FREE AND PRO

The free tier draws the whole chart: the bars, the automatic variation %, three panels of small multiples, the colours, the borders, the sorting, the tooltips and the cross-filtering. It compares against the previous category, which is a correct answer and not a cut-down one. What Pro adds is the controlling reading — actual against plan, budget or last year — and the analysis on top of it.

While you edit a report without a licence, a Pro feature you turn on is drawn working, under a "Pro preview" watermark naming it, so you can see exactly what you would be buying. Reading view shows the free result with no watermark, so a published report never uses a feature you have not paid for.

PRIVACY

The visual makes no network requests of any kind: no analytics, no telemetry, no external scripts. Your data never leaves the report.

GETTING STARTED

1. Drag a date or category field into Axis and a measure into Values. The variation % appears.
2. Add a category to Small Multiple for one panel per value.
3. Pro: add your plan or budget measure to Plan / Budget and set Comparison → Compare to → Plan.

Documentation and sample data: https://tinocallarisa-web.github.io/bar-chart-variation/support.html
Support: support@tcviz.com

WHAT'S NEW IN 1.10.0.0

Three reference measures — Previous Year, Plan / Budget and Forecast — each drawn as a marker on the bar. Small multiples with a column count you choose. Panel titles with a filled header. Bar borders. And the layout now follows the size of the visual, so a small tile shows a chart instead of a stack of labels.
```

---

## URLs to keep in sync

| Field | URL |
|---|---|
| Support / documentation | https://tinocallarisa-web.github.io/bar-chart-variation/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html |
| Terms / licence | https://tinocallarisa-web.github.io/bar-chart-variation/terms.html |
| GitHub repo | https://github.com/tinocallarisa-web/bar-chart-variation |
| Video | https://www.youtube.com/watch?v=vIszaUlC6G0 |

Canonical YouTube URL only (policy 100.3.3.3). `youtu.be`, `/shorts/` and `/embed/` are
rejected automatically. The id above is the 1.10.0.0 video, recorded on 2026-09-23. If it is
ever replaced it has to be changed here, in both certification notes, in the infographic, in
`support.html` on both copies **and in Partner Center** — and the console is the only one
Microsoft reviews.

## Search keywords (max 3)

```
plan vs actual
variance
bar chart
```

`plan vs actual` goes first because it is what this version adds and because someone typing
it has a meeting on Thursday, not curiosity. `variance` covers budget, forecast and
period-over-period without spending a slot on each. `bar chart` competes with the native
visual and will not win on its own, but leaving it out would miss the people who do not yet
know that a marker is what they need.

`small multiples` was dropped: it describes a feature, not a problem, and the people
searching for it are already building something and comparing implementations.

## Plan

| Field | Value |
|---|---|
| Plan ID | `bar-chart-variation-pro-tcviz` — matched by `SP_IDENTIFIER` in `src/visual.ts` |
| Plan name | Bar Chart with Variation % Pro |
| Plan description | Unlocks the Previous Year, Plan / Budget and Forecast reference measures, absolute variance, up to 100 small multiple panels, analytical lines and the reference band, value labels and per-bar colours. |

## Images

| Asset | File |
|---|---|
| Offer screenshot | `docs/infographic.html` → *Download PNG*, 1366×768 |
| Offer icon | 300×300, uploaded by hand: it does not travel inside the package |
| Package icon | `assets/icon.png`, embedded as `content.iconBase64` |
