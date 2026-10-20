# -*- coding: utf-8 -*-
"""Páginas publicadas (docs/) de Bar Chart with Variation %.

Estilo, cabecera y buscador: los de Word Cloud (certificado), como Box & Whisker y el radar. El contenido describe lo
que hace el código; si cambia una función, cambiarla aquí y regenerar:   python tools/gen_docs.py
Para OKviz: "conditional formatting (fx)" y "dynamic format strings" van escritos tal cual.
GitHub Pages sirve main/docs: lo que se regenere aquí se publica al hacer push a main.
"""
import io, json, os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WC = r"C:\tcviz\dev\WordCloud\docs"
NAME = "Bar Chart with Variation %"
BASE = "https://tinocallarisa-web.github.io/bar-chart-variation/"
REPO = "https://github.com/tinocallarisa-web/bar-chart-variation"
# La versión de las páginas: la que se va a enviar (pbiviz.json se sube en la etapa de versión del pipeline).
VERSION = "1.11.0.0"
FECHA = "21 October 2026"
VIDEO = "https://www.youtube.com/watch?v=vIszaUlC6G0"
SAMPLE = REPO + "/raw/main/SampleData_BarChartVariation.xlsx"

plantilla = io.open(os.path.join(WC, "privacy.html"), encoding="utf-8").read()
HEAD = plantilla[:plantilla.index("<body>")]
HEADER = plantilla[plantilla.index("<header>"):plantilla.index("</header>") + len("</header>")]
sup = io.open(os.path.join(WC, "support.html"), encoding="utf-8").read()
SCRIPT = sup[sup.rindex("<script"):sup.rindex("</script>") + len("</script>")]


def page(title, sub, body, nav="", search=False):
    head = HEAD.replace("Privacy Policy – Word Cloud by TCViz", f"{title} – {NAME}")
    hdr = HEADER.replace("Word Cloud by TCViz", NAME).replace(">Privacy Policy<", f">{html.escape(sub)}<")
    sb = ""
    if search:
        sb = '''<div class="searchbar">
  <div class="searchbox">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input id="docsearch" type="search" placeholder="Search the documentation — try &quot;plan&quot;, &quot;sort&quot;, &quot;band&quot;…"
           autocomplete="off" aria-label="Search the documentation">
    <button id="searchclear" type="button" aria-label="Clear search" hidden>&times;</button>
  </div>
  <div id="searchstatus" class="search-status" role="status" aria-live="polite"></div>
</div>
'''
    foot = f'''<footer>
  <div style="margin-bottom:10px;">
    <a href="{BASE}support.html">Documentation</a>
    <a href="{BASE}privacy.html">Privacy Policy</a>
    <a href="{BASE}terms.html">Terms of Use</a>
    <a href="{BASE}changelog.html">Changelog</a>
    <a href="{REPO}/discussions" target="_blank">Discussions</a>
    <a href="{REPO}" target="_blank">GitHub</a>
    <a href="https://tcviz.com" target="_blank">tcviz.com</a>
  </div>
  <p>© 2026 TCViz · {NAME} · <a href="mailto:support@tcviz.com">support@tcviz.com</a></p>
</footer>
'''
    return (head + "<body>\n" + hdr + "\n" + nav + sb + body + foot + (SCRIPT if search else "") + "\n</body>\n</html>\n")


# ── Datos comunes ────────────────────────────────────────────────────────────

FIELDS = [
    ("Axis", "Grouping", "Yes", "Months, quarters, products — one bar per value. A date hierarchy gives drilldown; with several levels expanded each bar shows all of them (“Q1 · Jan”). Up to 1,000 categories."),
    ("Values", "Measure", "Yes", "The figure on each bar: sales, cost, units. The variation % is calculated from it — no DAX needed."),
    ("Small Multiple", "Grouping", "No", "One panel per value — region, product, team — all on the same scale so the panels can be compared. Free draws 3 panels and says “Showing 3 of N panels”; Pro draws up to 100."),
    ("Previous Year", "Measure", "No — Pro", "Last year’s figure for each category. Choose it under Comparison → Compare to: each bar gets a marker at last year’s level and the variation against it."),
    ("Plan / Budget", "Measure", "No — Pro", "The plan or budget for each category: a marker where the bar should have been, and the variance against plan on every bar."),
    ("Forecast", "Measure", "No — Pro", "The forecast for each category, read the same way as Plan / Budget."),
    ("Tooltips", "Measure", "No", "Extra measures shown in the tooltip, with their own format."),
]

FREE_PRO = [
    ("Bars with the variation % between consecutive categories, calculated for you", "✓", "✓"),
    ("Vertical or horizontal orientation", "✓", "✓"),
    ("Small multiples: up to 3 panels on a shared scale, columns automatic or chosen, minimum panel size with scroll", "✓", "✓"),
    ("Arrows and connectors on the variation labels, which never overlap: they shrink or alternate heights on narrow bars", "✓", "✓"),
    ("Sort: Auto (chronological on date and number axes), ascending, descending; hide empty categories", "✓", "✓"),
    ("Colours from the report theme, or your own: bar, negative, positive, series colours, borders, corner radius, opacity", "✓", "✓"),
    ("6 style templates, including IBCS style; setup guide", "✓", "✓"),
    ("Axis titles; label size, colour, bold, italic and angle; panel titles with a line or a filled header", "✓", "✓"),
    ("Cross-filtering, highlight, bookmarks, drilldown, context menu, report tooltips, keyboard, high contrast", "✓", "✓"),
    ("Number format of the measure, dynamic format strings included; format on the canvas; 12 languages", "✓", "✓"),
    ("Previous Year, Plan / Budget and Forecast as references, with a marker on every bar", "—", "✓"),
    ("Variance as an absolute difference, or difference and %", "—", "✓"),
    ("4 to 100 small multiple panels", "—", "✓"),
    ("Analytical lines: average, maximum, minimum, median, a reference value and a trend line", "—", "✓"),
    ("Reference band: the typical range of the data, or the limits you type", "—", "✓"),
    ("Value labels on the bars", "—", "✓"),
    ("Per-bar colours, and bar colour with conditional formatting (fx) rules", "—", "✓"),
]

FORMAT = [
    ("Style template", "Clean, Classic, Minimal, Contrast, Compact, IBCS style. A template only fills what you have not set yourself; Clean is the default look. Setup guide: turn it back on to see the guide again."),
    ("Bar settings", "Default bar colour, with conditional formatting (fx) rules (Pro); negative bar colour (a bar below its comparison); opacity; axis text colour; bar border colour and width (drawn inside the bar, so a zero stays on the baseline); connector colour."),
    ("Comparison", "Compare to: Previous bar, Previous Year, Plan / Budget or Forecast (the last three Pro, with their field bound); Variance format (Pro): Relative (%), Absolute or Both; reference marker and its colour."),
    ("Variation labels", "Show; font size; positive and negative colour; decimal places; arrows; connectors (a bracket between consecutive bars, or a line from the label to its bar through the reference marker)."),
    ("Data labels (Pro)", "Show the value on each bar; colour; font size; display units; decimal places."),
    ("Series colors", "One colour per Small Multiple panel."),
    ("Bar colors (Pro)", "One colour per category."),
    ("Panel title", "Show; top or bottom; font size; separator line or filled header with its fill; series colour or your own colour. With a filled header the text switches to black or white when the contrast is too low."),
    ("Axis", "Sort order; hide empty categories; X labels: show, angle (auto, horizontal, 45°, 90°), size, colour, bold, italic; X axis title and its text; Y labels: show, size, colour, bold, italic; Y axis title and its text. An empty title text uses the field name."),
    ("Panel background", "Show; colour; opacity."),
    ("Panel layout", "Orientation: vertical (columns) or horizontal (bars); columns (0 = automatic); minimum panel width and height; scroll; bar corner radius."),
    ("Analytical lines (Pro)", "Average, maximum, minimum, median; trend line and its colour; reference value and line; line colour and style; labels and their size; band: show, minimum and maximum (both 0 = the typical range, 25th to 75th percentile), colour, opacity."),
    ("Legend", "Show the positive and negative colours; top or bottom; text colour."),
    ("Accessibility", "Diagonal pattern on negative bars, for readers who cannot tell the colours apart."),
]

FAQ = [
    ("How do I compare actual against plan or budget?",
     "<p>Drag your plan measure to <strong>Plan / Budget</strong> and set <strong>Comparison → Compare to → Plan / Budget</strong> (Pro). "
     "Each bar is the actual figure, a marker shows the plan, and the variation label says by how much the bar is above or below it. The same "
     "works with <strong>Previous Year</strong> and <strong>Forecast</strong>.</p>"),
    ("Do I need a date table or DATEADD for the variation?",
     "<p>No. Against the previous bar, the visual calculates the variation from the values on the axis. For last year, plan or forecast you "
     "need those measures in your model, as you would for any report.</p>"),
    ("What does “Compare to: Previous bar” compare?",
     "<p>Each bar with the bar to its left in the current sort order. The label sits between the two bars, joined by a bracket. Sorting by "
     "value changes the neighbours, so the variation follows the new order.</p>"),
    ("Why are my years or months in the wrong order?",
     "<p>Power BI sends categories sorted by the measure, largest first. With <strong>Axis → Sort order → Auto</strong> the visual puts date "
     "and number axes in time order. For month names, use Sort by column on the month field in the model (by month number), or sort from the "
     "visual menu (… → Sort axis).</p>"),
    ("The last months show −100%",
     "<p>Those months have no data yet, so they are 0. Turn on <strong>Axis → Hide empty categories</strong>: categories that are 0 or blank "
     "in every panel are removed from the axis.</p>"),
    ("Why is a bar red when its value went up?",
     "<p>The negative colour marks a bar that is below what it is compared with — the previous bar, or the plan — or below zero. A month can "
     "grow against last year and still miss the plan.</p>"),
    ("Relative, absolute or both?",
     "<p><strong>Comparison → Variance format</strong>: Relative (%) is free; Absolute shows the difference in the units of the measure and "
     "Both shows the two (Pro). It applies against the previous bar and against a reference. The difference uses the format of the measure.</p>"),
    ("The variation labels are small or at two heights",
     "<p>When bars are narrow — many categories, or several panels — the labels drop the arrows, shrink by up to 2 px and then alternate "
     "between two heights, so none is hidden. Widen the visual, use fewer panels per row, or switch to horizontal orientation.</p>"),
    ("Can the bars be horizontal?",
     "<p>Yes: <strong>Panel layout → Orientation → Horizontal (bars)</strong>. Categories go on the left, the variation in a column on the "
     "right, and the value axis at the bottom. Long category names read better this way.</p>"),
    ("How do small multiples work?",
     "<p>Drag a field to <strong>Small Multiple</strong>: one panel per value, all on the same scale, so a taller bar is a larger value in "
     "every panel. Set the number of columns under Panel layout, or leave 0 for automatic. With many panels, set a minimum panel size and "
     "the visual scrolls. Free draws 3 panels; Pro up to 100.</p>"),
    ("What is the reference band?",
     "<p>A shaded range across the panels (Pro). With Band min and Band max at 0 it marks the typical range of your data — the middle half "
     "of the values, from the 25th to the 75th percentile. Type limits to mark your own range, such as a target corridor.</p>"),
    ("What does the trend line show?",
     "<p>A straight least-squares line through the bars of each panel, in the axis order (Pro). Use it on a time axis: on categories sorted "
     "by value it only restates the sort.</p>"),
    ("What is “IBCS style”?",
     "<p>A template with a sober look inspired by IBCS notation: dark grey bars, green and red variances, black reference markers and square "
     "corners. It is a style; the visual does not claim compliance with the IBCS standard.</p>"),
    ("Conditional formatting (fx) does not colour the bars",
     "<p>Power BI evaluates conditional formatting rules per bar only when there is no field in <strong>Small Multiple</strong>, as it does "
     "for native charts with a Legend field. Without Small Multiple, the rule colours each bar by its value.</p>"),
    ("I changed the bar colour and nothing happened",
     "<p>A conditional formatting rule on the bar colour takes precedence over the fixed colour, and the negative colour still marks bars "
     "below their comparison. Use <strong>Reset to default</strong> on the Bar settings card to clear an old rule.</p>"),
    ("Where do the default colours come from?",
     "<p>From the report theme: the first data colour for bars, and the theme’s bad and good colours for negative and positive. Any colour you "
     "choose replaces them.</p>"),
    ("How are numbers formatted?",
     "<p>With the number format of the measure from the model, <strong>dynamic format strings</strong> included, in the report’s language. "
     "Display units and decimals for the value labels are set under Data labels.</p>"),
    ("How many categories and panels can it show?",
     "<p>Up to 1,000 categories and 100 panels, which is what the visual asks Power BI for.</p>"),
    ("Do bookmarks keep my selection?",
     "<p>Bookmarks keep the bars you select and the filters of the page. Like every Power BI visual, they do not keep formatting.</p>"),
    ("Can I format it by clicking on the chart?",
     "<p>Yes. In Power BI Desktop with on-object interaction turned on, choose Format and click the bars, the variation labels, a panel "
     "title, an axis or the legend.</p>"),
    ("What is the \"Pro preview\" watermark?",
     "<p>While you edit a report without a licence, Pro features you turn on are drawn working under a watermark that names them, and Power BI "
     "shows its licence notice. Reading view shows the free result. Where Power BI provides no licence information (for example when you are "
     "not signed in to Power BI Desktop), the free result is shown.</p>"),
    ("How do I get Pro?",
     "<p>On the visual's Microsoft AppSource page, choose <strong>Buy now</strong> (not Install free). Licences are per user and managed by "
     "Microsoft; restart Power BI Desktop after the licence is assigned. See <a href=\"https://tcviz.com/licensing.html\">tcviz.com/licensing</a>.</p>"),
    ("Is my data sent anywhere?",
     "<p>No. The visual makes no network requests and stores nothing outside your report.</p>"),
]


def table(headers, rows):
    th = "".join(f"<th>{html.escape(h)}</th>" for h in headers)
    trs = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f"<table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>"


def support():
    nav = '''<nav>
  <a href="#quickstart" class="active">Quick Start</a>
  <a href="#read">How to read it</a>
  <a href="#fields">Field Wells</a>
  <a href="#freepro">Free and Pro</a>
  <a href="#format">Format Pane</a>
  <a href="#interaction">Selection</a>
  <a href="#accessibility">Accessibility</a>
  <a href="#faq">FAQ</a>
  <a href="changelog.html">Changelog</a>
  <a href="#contact">Contact</a>
</nav>
'''
    video = (f'<div class="video-wrap"><iframe src="https://www.youtube.com/embed/{VIDEO.split("v=")[-1]}" title="{NAME} video" '
             f'allowfullscreen></iframe></div>') if VIDEO else ""
    faq = "".join(f'<details><summary>{html.escape(q)}</summary><div class="faq-body">{a}</div></details>' for q, a in FAQ)
    body = f'''<div class="wrap">

<div class="verpill">Visual v{VERSION} &nbsp;·&nbsp; docs updated {FECHA} &nbsp;·&nbsp; <a href="changelog.html">what's new</a></div>

<p class="lead">A plan vs actual bar chart for Power BI. It writes the variation % between bars by itself and, with your plan, budget,
forecast or last year’s figure, draws a marker where each bar should have been. The free version compares against the previous bar, with
small multiples, both orientations and style templates. <strong>Pro</strong> adds the three reference measures, absolute variance, up to
100 panels, analytical lines with a trend line and a reference band, value labels and per-bar colours with conditional formatting (fx).</p>
{video}
<h2 id="quickstart">Quick Start</h2>
<div class="card">
<ol style="padding-left:20px;font-size:14px;color:var(--t2)">
<li>Add <strong>{html.escape(NAME)}</strong> to the page. With no fields it shows a start screen with these steps.</li>
<li>Drag a date or category field to <strong>Axis</strong> and a measure to <strong>Values</strong>. The variation % appears between the bars.</li>
<li>Optional: a field in <strong>Small Multiple</strong> for one panel per region, product or team.</li>
<li>Pro: drag your plan to <strong>Plan / Budget</strong> (or last year to <strong>Previous Year</strong>) and choose it under Comparison → Compare to.</li>
<li>The setup guide in the corner lists the optional fields and the style templates. Sample data: <a href="{SAMPLE}">SampleData_BarChartVariation.xlsx</a>.</li>
</ol>
</div>

<h2 id="read">How to read it</h2>
<div class="card">
<figure style="margin:0 0 14px">
<svg viewBox="0 0 640 240" role="img" aria-label="Annotated bar chart: bars, variation labels with brackets, a plan marker and a bar below plan" style="width:100%;max-width:640px;display:block;margin:0 auto">
  <g font-family="Segoe UI, sans-serif" font-size="12" fill="#535146">
    <line x1="20" y1="200" x2="300" y2="200" stroke="#C8C6C4"/>
    <rect x="35" y="120" width="40" height="80" rx="2" fill="#378ADD"/>
    <rect x="100" y="95" width="40" height="105" rx="2" fill="#378ADD"/>
    <rect x="165" y="110" width="40" height="90" rx="2" fill="#E24B4A"/>
    <rect x="230" y="70" width="40" height="130" rx="2" fill="#378ADD"/>
    <g stroke="#3D3929" stroke-width="2"><line x1="31" y1="112" x2="79" y2="112"/><line x1="96" y1="100" x2="144" y2="100"/><line x1="161" y1="96" x2="209" y2="96"/><line x1="226" y1="80" x2="274" y2="80"/></g>
    <g fill="none" stroke="#666" stroke-dasharray="2 2"><path d="M55 120 V40 H120 V95"/><path d="M120 40 H185 V110"/><path d="M185 40 H250 V70"/></g>
    <text x="88" y="33" text-anchor="middle" font-weight="700" fill="#00A884">▲ +31%</text>
    <text x="153" y="33" text-anchor="middle" font-weight="700" fill="#E24B4A">▼ −14%</text>
    <text x="218" y="33" text-anchor="middle" font-weight="700" fill="#00A884">▲ +44%</text>
    <text x="55" y="218" text-anchor="middle">Jan</text><text x="120" y="218" text-anchor="middle">Feb</text><text x="185" y="218" text-anchor="middle">Mar</text><text x="250" y="218" text-anchor="middle">Apr</text>
    <text x="330" y="40" font-weight="700" fill="#00A884">Variation %</text><text x="330" y="56">between consecutive bars, joined by a bracket</text>
    <text x="330" y="90" font-weight="700" fill="#3D3929">Reference marker (Pro)</text><text x="330" y="106">plan, budget, forecast or last year</text>
    <text x="330" y="140" font-weight="700" fill="#E24B4A">Negative colour</text><text x="330" y="156">below what it is compared with</text>
    <text x="330" y="190" font-weight="700">Bars</text><text x="330" y="206">the actual figure, on a scale from zero</text>
  </g>
</svg>
</figure>
<p>Read each label as “this bar against the one before”, or, with a reference, “this bar against plan”. The marker shows where the bar
should have been; the colour says whether it fell short.</p>
</div>

<h2 id="fields">Field Wells</h2>
{table(["Field", "Kind", "Required", "What it does"], [(f"<strong>{a}</strong>", b, c, d) for a, b, c, d in FIELDS])}

<h2 id="freepro">Free and Pro</h2>
{table(["Capability", "Free", "Pro"], FREE_PRO)}
<p>Turn on a Pro capability without a licence while editing and it is drawn working under a "Pro preview" watermark that names it.
Reading view shows the free result. Pro is sold per user on Microsoft AppSource.</p>

<h2 id="format">Format Pane</h2>
{table(["Card", "Settings"], [(f"<strong>{a}</strong>", b) for a, b in FORMAT])}
<p>Format on the canvas: in format mode, click the bars, the variation labels, a panel title, an axis or the legend to format them where they are.</p>

<h2 id="interaction">Selection and interaction</h2>
<div class="card">
<ul>
<li>Click a bar to filter the rest of the page; the other bars dim. Ctrl/Cmd + click adds; click the only selected bar again, or the background, to clear.</li>
<li>Highlight: when another visual filters this one, the highlighted bars are drawn over faded ones.</li>
<li>Bookmarks restore the selection. Right-click opens the Power BI context menu. A hierarchy in Axis gives drilldown from the visual header.</li>
<li>When the report author turns interactions off, clicks do not filter.</li>
</ul>
</div>

<h2 id="accessibility">Accessibility</h2>
<div class="card">
<ul>
<li>Keyboard: Tab moves between bars, Enter or Space selects, Esc clears. The tooltip opens on the focused bar.</li>
<li>Each bar has a description for screen readers with its panel, category, value and variation.</li>
<li>High contrast: the visual uses the colours of the Windows contrast theme and marks negative bars with a diagonal pattern.</li>
<li>The layout adapts to the size of the visual: the legend, the axis and the titles step aside in small tiles so the bars and their percentages stay legible.</li>
</ul>
</div>

<h2 id="faq">FAQ</h2>
{faq}

<h2 id="contact">Contact</h2>
<div class="contact-box"><div class="icon">✉</div><div>
<h3>Questions, bugs, ideas</h3>
<p>Write to <a href="mailto:support@tcviz.com">support@tcviz.com</a> or open a thread in <a href="{REPO}/discussions" target="_blank">GitHub Discussions</a>.</p>
</div></div>

</div>
'''
    return page("Documentation", "Documentation", body, nav=nav, search=True)


def privacy():
    body = f'''<div class="wrap prose">
<h1>Privacy Policy</h1>
<p><strong>Last updated:</strong> {FECHA} (version {VERSION})</p>
<h2>1. Overview</h2>
<p>{NAME} is a Power BI custom visual developed by TCViz (Tino Callarisa). This policy describes how data is handled when you use it.</p>
<h2>2. Data collection</h2>
<p>The visual <strong>does not collect, transmit or store any data</strong>. Every calculation — variations, references, analytical lines —
happens inside Power BI, on the data of your report.</p>
<h2>3. No network access</h2>
<p>The visual declares <strong>no network privileges</strong> (<code>"privileges": []</code>), so Power BI does not let it make any web request.</p>
<h2>4. Cookies and storage</h2>
<p>No cookies and no browser storage. Formatting settings are saved in your report by Power BI, like those of any visual.</p>
<h2>5. Licensing</h2>
<p>To know whether you have a Pro licence, the visual asks Microsoft's licensing API in Power BI (<code>IVisualLicenseManager</code>). TCViz receives
no data from this check. See the <a href="https://privacy.microsoft.com/privacystatement">Microsoft Privacy Statement</a>.</p>
<h2>6. Third parties</h2>
<p>No analytics, tracking or advertising.</p>
<h2>7. Contact</h2>
<p><a href="mailto:support@tcviz.com">support@tcviz.com</a></p>
</div>
'''
    return page("Privacy Policy", "Privacy Policy", body)


def terms():
    free = "; ".join(r[0][0].lower() + r[0][1:] for r in FREE_PRO if r[1] == "✓")
    pro = "; ".join(r[0][0].lower() + r[0][1:] for r in FREE_PRO if r[1] == "—")
    body = f'''<div class="wrap prose">
<h1>Terms of Use</h1>
<p><strong>Effective date:</strong> {FECHA} &nbsp;·&nbsp; applies to version {VERSION} and later</p>
<h2>1. Acceptance</h2>
<p>By installing or using {NAME} ("the Visual"), you agree to these Terms of Use. If you do not agree, do not install or use the Visual.</p>
<h2>2. License grant</h2>
<p>TCViz grants you a non-exclusive, non-transferable, revocable license to use the Visual within Microsoft Power BI, subject to these Terms
and any applicable Microsoft AppSource subscription terms.</p>
<p><strong>Free tier:</strong> available to all users at no cost. Includes: {html.escape(free)}.</p>
<p><strong>Pro tier:</strong> available through a Microsoft AppSource subscription, licensed per user. Adds: {html.escape(pro)}.
Without an active licence, Pro features are shown in edit mode only, as a preview marked with a watermark; reading view shows the free result.</p>
<h2>3. Restrictions</h2>
<ul>
<li>Do not reverse-engineer, decompile or disassemble the Visual, except where applicable law permits it.</li>
<li>Do not redistribute, resell, sublicense or transfer the Visual.</li>
<li>Do not remove or alter proprietary notices, branding or watermarks.</li>
<li>Do not use the Visual in breach of applicable laws.</li>
</ul>
<h2>4. Intellectual property</h2>
<p>The Visual, including its source code, design and documentation, is the intellectual property of TCViz. The source code is published on
GitHub for transparency and review; publication does not grant a licence to copy it or to build competing products.</p>
<h2>5. Disclaimer of warranties</h2>
<p>The Visual is provided "as is", without warranty of any kind, express or implied, including merchantability, fitness for a particular
purpose and non-infringement. TCViz does not warrant that the Visual will be error-free or uninterrupted.</p>
<h2>6. Limitation of liability</h2>
<p>To the maximum extent permitted by law, TCViz shall not be liable for any indirect, incidental, special, consequential or punitive damages
arising from the use of, or inability to use, the Visual.</p>
<h2>7. Updates</h2>
<p>TCViz may update the Visual and these Terms. Updated Terms are posted at this address with a new date; continued use means acceptance.</p>
<h2>8. Governing law</h2>
<p>These Terms are governed by the laws of Spain. Any dispute shall be resolved in the courts of Barcelona, Spain.</p>
<h2>9. Contact</h2>
<p><a href="mailto:support@tcviz.com">support@tcviz.com</a></p>
</div>
'''
    return page("Terms of Use", "Terms of Use", body)


def md_inline(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", t)
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", t)


def changelog():
    md = io.open(os.path.join(ROOT, "CHANGELOG.md"), encoding="utf-8").read()
    bloques = []
    for p in re.split(r"^## ", md, flags=re.M)[1:]:
        cab, _, cuerpo = p.partition("\n")
        out, items, cur = [], [], None

        def cierra():
            nonlocal cur, items
            if cur is not None:
                items.append(cur)
                cur = None
            if items:
                out.append("<ul>" + "".join(f"<li>{md_inline(i)}</li>" for i in items) + "</ul>")
                items = []
        for l in cuerpo.splitlines():
            if l.startswith("### "):
                cierra()
                out.append(f"<h4>{html.escape(l[4:].strip())}</h4>")
            elif l.startswith("- "):
                if cur is not None:
                    items.append(cur)
                cur = l[2:].strip()
            elif l.startswith("  ") and cur is not None:
                cur += " " + l.strip()
            elif l.strip() and not l.startswith("---"):
                cierra()
                out.append(f"<p>{md_inline(l.strip())}</p>")
        cierra()
        bloques.append(f'<div class="card"><h3>{html.escape(cab.strip())}</h3>{"".join(out)}</div>')
    body = f'<div class="wrap prose"><h1>Changelog</h1><p>{NAME} · current version {VERSION}</p>{"".join(bloques)}</div>\n'
    return page("Changelog", "Changelog", body)


def main():
    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
    for nombre, f in (("support.html", support), ("privacy.html", privacy), ("terms.html", terms), ("changelog.html", changelog)):
        io.open(os.path.join(ROOT, "docs", nombre), "w", encoding="utf-8", newline="\n").write(f())
    io.open(os.path.join(ROOT, "docs", "index.html"), "w", encoding="utf-8", newline="\n").write(
        f'<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=support.html"><title>{NAME}</title><a href="support.html">Documentation</a>\n')
    print("docs:", sorted(os.listdir(os.path.join(ROOT, "docs"))))


if __name__ == "__main__":
    main()
