# Certification Notes — Bar Chart with Variation % v1.12.0.0

The text to paste into Partner Center is [`CERTIFICATION-NOTES-SHORT.txt`](./CERTIFICATION-NOTES-SHORT.txt)
(2,313 characters counting CRLF; the field truncates at 2,500 without warning and is emptied on every resubmission).
It is reproduced below. The full list of changes is in [`CHANGELOG.md`](../CHANGELOG.md).

## Visual information

| Field | Value |
|---|---|
| Display name | Bar Chart with Variation % |
| GUID | barChartVariation98877665544332211 |
| Version | 1.12.0.0 |
| Author | TCViz |
| Support URL | https://tinocallarisa-web.github.io/bar-chart-variation/support.html |
| Privacy URL | https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html |
| Certification branch | https://github.com/tinocallarisa-web/bar-chart-variation/tree/certification |
| Video | https://www.youtube.com/watch?v=RljhNfnuMuM |

## Notes as submitted

```
Bar Chart with Variation % 1.12.0.0 - GUID barChartVariation98877665544332211

SOURCE CODE
github.com/tinocallarisa-web/bar-chart-variation, branch "certification".
PUBLIC: no credentials needed, none included here.

TESTING THE PREMIUM FEATURES - NO KEY NEEDED
Pro is granted by the AppSource plan through IVisualLicenseManager; no activation key
exists. Import this .pbiviz and open a report in EDIT mode without a licence: turn on
any Pro setting and it is drawn WORKING under a "Pro preview" watermark naming it -
same code, nothing stubbed. Reading view, and anywhere the licence cannot be read,
shows the free result with no watermark.

WHAT CHANGED IN 1.12.0.0
Reference as a bar beside the actual (Pro). Six collection styles (Pro), Report
theme by default (formerly Clean, same look). Text scales with the visual (min 8 px).
Accessibility card: high contrast Auto/On, focus colour/width, minimum text size.
Dynamic format strings declared (general.formatString). Format pane in the order of
our other visuals; one Small multiples card (spacing, border, title). Common
watermark. All saved settings kept. See CHANGELOG.md.

PRIVACY: no network calls, no telemetry, no storage. Only the dataView. privileges [].

FREE VS PRO
Free: bars, variation %, both orientations, 3 panels, Report theme/Classic/IBCS,
colours, sort, tooltips, cross-filtering, bookmarks, drilldown, high contrast,
12 languages.
Pro: Previous Year / Plan / Forecast references (marker or bar), collection styles,
absolute variance, 100 panels, analytical lines, value labels, fx rules.

WHAT TO CHECK
No fields: landing page. Axis + Values: variation % appears; setup guide while
editing. Bind Plan / Budget, Compare to = Plan: a marker on every bar; Show reference
as = Bar beside the actual: two bars per category. Style template = Aurora without a
licence: drawn with watermark; reading view shows Report theme. Click a bar: others
dim, page filters; again: clears. Resize to a small tile: text shrinks. Accessibility
> High contrast = On: contrast rendering. With a licence: no watermark, no notice.

Rendering events on every update() path. allowInteractions from hostCapabilities.
Video https://www.youtube.com/watch?v=RljhNfnuMuM
Support: tinocallarisa-web.github.io/bar-chart-variation/
```
