# Certification Notes — Bar Chart with Variation % v1.11.0.0

The text to paste into Partner Center is [`CERTIFICATION-NOTES-SHORT.txt`](./CERTIFICATION-NOTES-SHORT.txt)
(2,370 characters counting CRLF; the field truncates at 2,500 without warning and is emptied on every resubmission).
It is reproduced below. The full list of changes is in [`CHANGELOG.md`](../CHANGELOG.md).

## Visual information

| Field | Value |
|---|---|
| Display name | Bar Chart with Variation % |
| GUID | barChartVariation98877665544332211 |
| Version | 1.11.0.0 |
| Author | TCViz |
| Support URL | https://tinocallarisa-web.github.io/bar-chart-variation/support.html |
| Privacy URL | https://tinocallarisa-web.github.io/bar-chart-variation/privacy.html |
| Certification branch | https://github.com/tinocallarisa-web/bar-chart-variation/tree/certification |
| Video | https://www.youtube.com/watch?v=RljhNfnuMuM |

## Notes as submitted

```
Bar Chart with Variation % 1.11.0.0 - GUID barChartVariation98877665544332211

SOURCE CODE
github.com/tinocallarisa-web/bar-chart-variation, branch "certification".
PUBLIC: no credentials needed, none included here.

TESTING THE PREMIUM FEATURES - NO KEY NEEDED
Pro is granted by the AppSource plan through IVisualLicenseManager; no activation key
exists. Import this .pbiviz and open a report in EDIT mode without a licence: turn on
any Pro setting and it is drawn WORKING under a "Pro preview" watermark naming it -
same code, nothing stubbed. Reading view, and anywhere the licence cannot be read,
shows the free result with no watermark.

WHAT CHANGED IN 1.11.0.0
Modern format pane (getFormattingModel), every saved setting kept. On-object
formatting. Horizontal orientation. Style templates and a setup guide (edit mode
only). Trend line (Pro). Conditional formatting (fx) on the bar colour. Dynamic
format strings. 12 languages. Visible selection, second click clears, bookmarks via
registerOnSelectCallback, keyboard (Enter/Space/Esc). Drilldown declared. Axis
titles, label styling, hide empty categories. Fixes: overlapping labels, connectors,
reference band, bottom panel title. See CHANGELOG.md.

PRIVACY: no network calls, no telemetry, no storage. Only the dataView. privileges [].

FREE VS PRO
Free: bars, variation %, both orientations, 3 panels, templates, colours, sort,
tooltips, cross-filtering, bookmarks, drilldown, high contrast, 12 languages.
Pro: Previous Year / Plan / Forecast references, absolute variance, 100 panels,
analytical lines, trend line and band, value labels, per-bar colours and fx rules.

WHAT TO CHECK
No fields: landing page. Axis + Values: variation % appears; setup guide in the
corner while editing. Small Multiple with 4+ values while editing: watermark; reading
view shows 3. Bind Plan / Budget, Compare to = Plan: a marker on every bar. Click a
bar: others dim, page filters; click again: clears. Format mode: click a bar or an
axis to format it. Panel layout > Orientation > Horizontal. Windows high contrast:
theme colours, negatives patterned. With a licence: no watermark, no notice.

Rendering events on every update() path. allowInteractions from hostCapabilities.
Video https://www.youtube.com/watch?v=RljhNfnuMuM
Support: tinocallarisa-web.github.io/bar-chart-variation/
```
