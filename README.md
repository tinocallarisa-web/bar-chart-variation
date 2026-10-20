# Bar Chart with Variation %

A Power BI custom visual for **plan vs actual**: bars with the variance % written between them, and — with a
Plan / Budget, Forecast or Previous Year measure — a marker where each bar should have been. Small multiples on a
shared scale, vertical or horizontal.

Documentation, FAQ and sample data: <https://tinocallarisa-web.github.io/bar-chart-variation/support.html>

## Features
- Variance % between consecutive bars, with arrows and brackets, calculated by the visual
- Reference marker and variance against Plan / Budget, Forecast or Previous Year (Pro)
- Variance as %, as a difference in the measure's units, or both (difference: Pro)
- Small multiples on a shared scale: 3 panels free, up to 100 with Pro
- Vertical or horizontal orientation; six style templates including an IBCS style; setup guide
- Analytical lines, trend line and reference band (Pro); value labels (Pro); per-bar colours and fx rules (Pro)
- Format pane on the modern formatting model, on-object formatting, 12 languages
- Cross-filtering, highlight, bookmarks, drilldown, context menu, keyboard, high contrast
- No network access (`"privileges": []`)

## Data roles
| Field | Kind | Required |
|---|---|---|
| Axis | Grouping — one bar per value; hierarchies drill | Yes |
| Values | Measure | Yes |
| Small Multiple | Grouping — one panel per value | No |
| Previous Year / Plan / Budget / Forecast | Measure — reference (Pro) | No |
| Tooltips | Measure | No |

## Development
`npm install`, then `node build-test.js` (Pro forced, GUID + `_test`) or `node build-test.js --free`.
Format pane spec: `python tools/gen_format_spec.py`. Languages: `python tools/i18n.py`. Pages in `docs/`:
`python tools/gen_docs.py`.

## License
© 2026 TCViz (Tino Callarisa) — [Terms](https://tinocallarisa-web.github.io/bar-chart-variation/terms.html)
