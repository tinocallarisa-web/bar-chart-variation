# Bar Chart with Variation % — Tips & Hints

## What's new in 1.12

- **Plan as a bar (Pro):** Comparison → Show reference as → Bar beside the actual. The reference bar sits next to each actual bar, with the variation label above the pair.
- **Collection styles (Pro):** Boardroom, Ledger, Editorial, Signal, Aurora and Terrace, the same as the rest of the TCViz visuals.
- **Text scales with the visual:** in a small tile every text shrinks together, never under 8 px.
- **Accessibility card:** high contrast Automatic or On, focus colour and width, minimum text size.
- **Small multiples card:** space between panels, bold title, title alignment and panel border.

---

## Getting started

**Minimum setup:** drag a date or category field to **Axis** and a measure to **Values**. The variation % between consecutive bars appears by itself — no DAX required.

**Setup guide:** while you edit, a small panel in the corner lists the optional fields and then the style templates. Close it and it stays closed; turn it back on under **Style template → Setup guide**.

---

## Plan vs actual (Pro)

- Drag your plan to **Plan / Budget** (or last year to **Previous Year**, or a **Forecast**) and set **Comparison → Compare to**.
- Each bar is the actual figure; a marker shows the reference; the label is the variance against it.
- A bar below its reference takes the **negative colour**, even if it grew against the month before.
- **Variance format**: Relative (%), Absolute (in the units of your measure) or Both.
- **Show connectors** joins each label to its bar, through the marker.
- **Show reference as → Bar beside the actual** draws the plan as a bar next to the actual one; set its colour under **Reference bar color**.

---

## Variation against the previous bar

- The % is `(current − previous) / |previous| × 100`, between each bar and the one to its left.
- The first bar has no label: there is nothing before it.
- Sorting by value changes the neighbours, so the variation follows the new order.
- **Decimal places**, **arrows** and **connectors** are under Variation labels.

---

## Order and empty months

- **Axis → Sort order → Auto** puts date and number axes in time order. For month names, use *Sort by column* (month number) in the model.
- Future months with no data show as −100%: turn on **Axis → Hide empty categories**.

---

## Small multiples

- Drag a field to **Small Multiple**: one panel per value, all on the same scale.
- **Small multiples → Columns**: 0 is automatic. **Min panel width / height** with **Enable scroll** keep panels readable when there are many.
- **Space between panels** separates them; **Panel border** turns the frame and the separators on or off.
- **Title**: top or bottom, a line or a filled header, bold or not, left or centred.
- Free draws 3 panels; Pro up to 100.

---

## Look

- Colours come from the report theme until you choose your own.
- **Style template**: Report theme (default), Classic, IBCS style, and the collection styles Boardroom, Ledger, Editorial, Signal, Aurora and Terrace (Pro). Choosing one replaces the colours and styles it defines; your other settings stay.
- A collection style without a licence is drawn while you edit, under the Pro preview watermark; reading view shows Report theme.
- **Bar settings → Orientation → Horizontal** for long category names.
- In a small tile the text shrinks with the visual (never under 8 px). **Accessibility → Minimum text size** keeps it larger.
- On narrow bars the variation labels drop the arrows, shrink a little and alternate heights rather than overlap.
- **Format on the canvas**: in format mode, click a bar, a label or an axis.

---

## Analytical lines (Pro)

- Average, maximum, minimum, median and a reference value, as solid, dashed or dotted lines with labels.
- **Trend line**: a least-squares line per panel. Use it on a time axis.
- **Band**: with min and max at 0 it marks the typical range (25th to 75th percentile); type limits for your own range.

---

## Colours with rules

- **Bar settings → Default bar color → fx**: colour each bar by a rule, a field or a gradient (Pro).
- Power BI applies rules per bar only without a Small Multiple field, as with native charts that have a Legend, so with Small Multiple the fx button is not offered. Colour each panel under **Series colors** instead.
- **Reset to default** on a card clears its settings, including an old rule.

---

## Interaction

- Click a bar to filter the page; click it again or the background to clear. Ctrl/Cmd + click adds.
- Bookmarks keep the selection. Right-click opens the context menu. A date hierarchy drills from the visual header.
- Keyboard: Tab between bars, Enter or Space selects, Esc clears. The focus outline colour and width are under **Accessibility**.
- **Accessibility → High contrast → On** gives the contrast rendering without changing the Windows theme.

---

## Pro preview

Without a licence, a Pro setting you turn on while editing is drawn working under a watermark that names it. Reading view shows the free result. Buy Pro on the visual's AppSource page with **Buy now**.
