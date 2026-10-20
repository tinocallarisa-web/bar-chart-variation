# AppSource listing copy — Bar Chart with Variation % v1.11.0.0

Copy ready to paste into Partner Center, English only. **The marketplace description is the
documentation most people read** — update it on every release.

Limits measured in Partner Center: *Search results summary* 100 characters, *Description*
5,000 (truncated silently). **Editing this file does not change the offer**: the field
Microsoft reviews lives only in the console.

1.11.0.0 repositions the offer towards **plan vs actual / variance chart** and moves it to the
low-price series (new plan at 0.99 / 9.99, the 2.99 / 25.99 plan stopped). Both plan IDs grant
Pro in the code (`PLAN_IDS` in `src/visual.ts`), so existing subscribers keep it.

---

## Offer name

```
Bar Chart with Variation %
```

---

## Search results summary

```
Plan vs actual bar chart: variance % between bars and a marker for plan, budget or last year.
```

---

## Description

```
A bar chart that compares each month against the one before answers "is this month better than the last one". It does not answer the question the meeting is actually about: are we on plan.

Bar Chart with Variation % answers both. It writes the variance % between bars by itself, and it draws a marker where each bar should have been — your plan, your budget, your forecast or last year. No DATEADD, no variance column, no helper measures.

PLAN VS ACTUAL

• A reference marker on every bar: bind Plan / Budget, Forecast or Previous Year and pick it under Compare to
• The variance on every bar, as %, as a difference in the units of your measure, or both
• Bars below plan take the negative colour; a connector joins each label to its bar through the marker
• Against the previous bar: the variance % between consecutive bars, with arrows and brackets
• Analytical lines — average, maximum, minimum, median, a reference value and a trend line — and a reference band that marks the typical range of your data

SMALL MULTIPLES

• One panel per region, product or team, on a shared scale so the panels are actually comparable
• Choose the number of columns, or leave it automatic; minimum panel size with scroll
• Vertical columns or horizontal bars

LOOKS RIGHT FROM THE FIRST CLICK

• Colours from your report theme; six style templates, including an IBCS style
• A setup guide in the corner while you edit, listing the optional fields
• Format on the canvas: click a bar, a label or an axis to format it
• Labels that never overlap: on narrow bars they shrink or alternate heights instead of colliding
• Date and number axes in time order, and empty future months hidden on request
• The number format of your measure, dynamic format strings included, in 12 languages

NATIVE INTEGRATION

• Click a bar to cross-filter the report; the other bars dim; bookmarks keep the selection
• Highlighting from other visuals, report tooltips, drilldown and the context menu
• Conditional formatting (fx) on the bar colour
• Keyboard navigation, screen reader labels and the Windows high contrast theme

PRO

• Previous Year, Plan / Budget and Forecast as references
• Absolute variance, or difference and %
• Up to 100 small multiple panels
• Analytical lines, trend line and reference band
• Value labels on the bars
• Per-bar colours and conditional formatting (fx) rules

FREE AND PRO

The free tier draws the whole chart: the bars, the automatic variance %, three panels of small multiples, both orientations, the templates, the colours, the sorting, the tooltips and the cross-filtering. It compares against the previous bar, which is a correct answer and not a cut-down one. What Pro adds is the controlling reading — actual against plan, budget or last year — and the analysis on top of it.

While you edit a report without a licence, a Pro feature you turn on is drawn working, under a "Pro preview" watermark naming it, so you can see exactly what you would be buying with your own data. Reading view shows the free result with no watermark.

PRIVACY

The visual makes no network requests of any kind: no analytics, no telemetry, no external scripts. Your data never leaves the report.

GETTING STARTED

1. Drag a date or category field into Axis and a measure into Values. The variance % appears.
2. Add a field to Small Multiple for one panel per value.
3. Pro: add your plan or budget measure to Plan / Budget and set Comparison → Compare to → Plan / Budget.

Documentation, FAQ and sample data: https://tinocallarisa-web.github.io/bar-chart-variation/support.html
Support: support@tcviz.com

WHAT'S NEW IN 1.11.0.0

Horizontal bars. Six style templates and a setup guide. Format on the canvas. A trend line. Conditional formatting (fx) on the bar colour and dynamic format strings. Axis titles and label styling. 12 languages. Visible selection with bookmarks. Labels that no longer overlap on narrow bars, and a reference band that shows the typical range of your data.
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

Canonical YouTube URL only (policy 100.3.3.3). Shortened links, Shorts and embed URLs are
rejected automatically. The id above is the 1.10.0.0 video. If a 1.11 video replaces it, change
it here, in `CERTIFICATION-NOTES-SHORT.txt`, in `tools/gen_docs.py` (then regenerate), in the
infographic **and in Partner Center** — the console is the only one Microsoft reviews.

## Search keywords (max 3)

```
plan vs actual
variance chart
budget vs actual
```

All three are problem words: someone typing them has a report to build for a review meeting.
`plan vs actual` first because it is what the reference marker answers. `variance chart` is the
name analysts give this kind of chart. `budget vs actual` reaches finance teams, who say budget
rather than plan. `bar chart` (1.10) was dropped: it competes with the native visual and half
the marketplace, and brings curiosity rather than a problem.

## Plan

| Field | Value |
|---|---|
| New plan ID | `bar-chart-variation-pro` — **exactly this**, it is in `PLAN_IDS` in `src/visual.ts` |
| New plan name | Bar Chart with Variation % Pro |
| New plan price | 0.99 / month, 9.99 / year (rounded table: utillaje/redondear_precios.py) |
| Old plan | `bar-chart-variation-pro-tcviz` — stop selling, do not delete; subscribers keep Pro |
| Plan description | Unlocks the Previous Year, Plan / Budget and Forecast reference measures, absolute variance, up to 100 small multiple panels, analytical lines with a trend line and the reference band, value labels, and per-bar colours with conditional formatting (fx) rules. |

## Images

| Asset | File |
|---|---|
| Offer screenshots | PNG in `assets/` (1366×768) — regenerate for 1.11 |
| Offer icon | 300×300, uploaded by hand: it does not travel inside the package |
| Package icon | `assets/icon.png`, embedded as `content.iconBase64` |
