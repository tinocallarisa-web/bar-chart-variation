# Bar Chart with Variation % — Tips & Hints

## Getting Started

**Minimum setup:** drag one field to **Axis** and one measure to **Values**. The variation % between consecutive bars appears automatically — no DAX required.

**Add Small Multiples:** drag a category field to the **Small Multiple** bucket to split the chart into one panel per category, all sharing the same Y scale for easy comparison.

---

## Variation %

- The % is calculated as `(current − previous) / |previous| × 100`.
- The first bar never shows a variation arrow (no previous value to compare).
- Use **Variation Labels → Decimal Places** to control precision (0 = whole numbers, 2 = two decimals).
- Toggle arrows on/off with **Show Arrows**; toggle the dashed connector lines with **Show Connectors**.

---

## Small Multiples

- **Sort Order**: sort the axis categories ascending or descending by label — useful when your axis is a text category like product names.
- **Min Panel Width**: set a minimum width in pixels. If panels don't fit, the visual scrolls horizontally automatically.
- **Panel Title → Position**: move the title to the bottom to save vertical space when panels are narrow.
- **Panel Background**: add a subtle background color to each panel to visually separate them in dense dashboards.

---

## Analytical Lines (Pro)

- **Average line** is the most useful starting point — it immediately shows which bars are above or below the mean.
- **Reference line**: enter any fixed value (e.g. a budget target or KPI threshold) to compare bars against a goal.
- **Band**: define a min/max range (e.g. acceptable variation corridor) — bars inside the band are on track.
- Lines and bands are drawn across all panels simultaneously, keeping the shared scale meaningful.

---

## Per-bar colours (Pro)

- Go to **Format pane → Bar Colors (Pro)** — each category has its own colour picker.
- Per-bar colours override the default bar color but respect the negative color logic.

---

## Tooltips

- The tooltip always shows: value, previous value, absolute change, and variation %.
- **Drag extra fields** into the **Tooltips** bucket to add custom rows (e.g. units sold, region, budget).
- Tooltip fields use the format defined in the measure — no extra configuration needed.

---

## Interactivity

- **Click** a bar to cross-filter other visuals on the page.
- **Ctrl+click** (Cmd on Mac) to multi-select bars across panels.
- **Right-click** a bar to access the Power BI context menu (drill, keep/exclude, etc.).
- **Drill down** is supported when the Axis field has a hierarchy — use the drill buttons that appear in the top-left of the first panel.

---

## Performance Tips

- Keep **Axis** values under 50 per panel for best readability.
- Use the **Data reduction** built into the visual (top 1000 categories, top 100 series) — if you need more, aggregate upstream in your data model.
- For large reports with many visuals, enable **Synchronize slicers** in Power BI to keep the visual responsive.

---

## Accessibility

- Enable **High Contrast Mode** in **Format pane → Accessibility** to render negative bars with a diagonal stripe pattern instead of color alone — useful for color-blind users or printed reports.

---

## Common Questions

**Why is the first bar missing a variation arrow?**
There is no previous value to compare against. This is by design.

**Can I show variation against a fixed base (not the previous bar)?**
Not directly — use a Reference Line set to your base value instead.

**The panels look too small. What can I do?**
Increase **Min Panel Width** in Panel Layout, or reduce the number of Small Multiple categories. The visual will scroll horizontally if needed.

**Why are my per-bar colours not showing?**
Per-bar colours are part of the Pro plan. Without a licence the setting is kept and Power BI shows how to get one.
