# -*- coding: utf-8 -*-
"""
Imágenes de la oferta (1366×768) con el visual REAL (.tmp/drop de `node build-test.js --free`; la licencia Pro se
simula en el host), datos ficticios de Begudes Nord y la plantilla TCViz de la cartera (fondo #FAF9F5, tarjetas blancas,
Poppins). Misma receta que Chip Slicer Hierarchy 1.4 y Tile Grid Map Pro 1.3.

Escribe en assets/: Screenshot_1.png (real y plan lado a lado), Screenshot_2.png (small multiples por canal, Boardroom)
y Screenshot_3.png (Report theme, IBCS style y dos estilos de la colección). Las cifras laterales salen de los datos.

    node build-test.js --free && python tools/simulador/imagenes.py
"""
import asyncio, base64, io, json, os, sys
from playwright.async_api import async_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import harness as H

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
POPPINS = r"C:\tcviz\datos\demo_rtm\tema\Poppins"
LOGO = r"C:\tcviz\web\logos\tcviz-logo-light.svg"
ASSETS = os.path.join(ROOT, "assets")


def uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def plantilla(pregunta, subtitulo, cuerpo, lateral):
    fuentes = "".join(f"@font-face{{font-family:'Poppins';font-weight:{w};src:url('{uri(os.path.join(POPPINS, f), 'font/ttf')}')}}"
                      for w, f in ((400, "Poppins-Regular.ttf"), (500, "Poppins-Medium.ttf"), (600, "Poppins-SemiBold.ttf")))
    lat = f'<div class="lat">{lateral}</div>' if lateral else ""
    return f"""<html><head><style>{fuentes}
body{{margin:0;background:#FAF9F5;font-family:'Segoe UI',sans-serif;color:#3D3929}}
#lienzo{{width:1366px;height:768px;box-sizing:border-box;padding:22px 30px;display:flex;flex-direction:column;gap:16px}}
.cab{{display:flex;align-items:center;gap:20px}} .cab img{{height:40px}} .sep{{width:1px;height:40px;background:#DAD9D4}}
.cab h1{{font-family:Poppins;font-weight:600;font-size:25px;margin:0;line-height:1.15}}
.cab p{{margin:2px 0 0;font-size:13px;color:#6B6A63}}
.fila{{display:flex;gap:16px;flex:1;min-height:0}}
.tarjeta{{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(61,57,41,.10);padding:12px;box-sizing:border-box}}
.lat{{width:290px;display:flex;flex-direction:column;gap:14px}}
.lat h3{{font-family:Poppins;font-weight:600;font-size:14px;margin:0 0 6px;color:#2B6CB0}}
.lat p{{margin:0;font-size:13.5px;line-height:1.5;color:#535146}} .lat b{{color:#3D3929}}
.kpi .n{{font-family:Poppins;font-weight:600;font-size:30px;line-height:1.1}} .kpi .t{{font-size:12.5px;color:#6B6A63}}
.titulo{{font-family:Poppins;font-weight:600;font-size:14px;margin:0 0 6px}}
.rej{{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1}}
.host{{position:relative;overflow:hidden}}
</style></head><body><div id="lienzo">
<div class="cab"><img src="{uri(LOGO, 'image/svg+xml')}"><div class="sep"></div><div><h1>{pregunta}</h1><p>{subtitulo}</p></div></div>
<div class="fila">{cuerpo}{lat}</div></div></body></html>"""


async def montar(b, html, hosts):
    """hosts: [(id, dataview, w, h)] → un visual en cada uno, en lectura y con licencia Pro."""
    guid = json.load(io.open(os.path.join(H.DROP, "pbiviz.json"), encoding="utf-8"))["visual"]["guid"]
    pg = await b.new_page(viewport={"width": 1366, "height": 768}, device_scale_factor=1)
    await pg.set_content(html)
    await pg.add_style_tag(path=os.path.join(H.DROP, "visual.css"))
    await pg.add_script_tag(content="window.__pro = true; window.__hc = false;")
    await pg.add_script_tag(content=H.STUB.replace("'PLAN'", repr(H.PLAN)).replace("getColor(k){ return {value:'#2B6CB0'}; }", "getColor(k){ return {value:'#2B6CB0'}; }"))
    await pg.add_script_tag(path=os.path.join(H.DROP, "visual.js"))
    for hid, dv, w, h in hosts:
        js = """([g, id, dv, w, h]) => {
            dv = JSON.parse(JSON.stringify(dv));
            const gr = dv.categorical.__grupos; delete dv.categorical.__grupos;
            const vals = []; gr.forEach(x => x.values.forEach(v => { v.source.groupName = x.name; vals.push(v); }));
            vals.grouped = () => gr.map(x => ({ name: x.name, values: x.values, identity: { k: x.name } }));
            vals.source = gr[0].values[0].source; dv.categorical.values = vals;
            dv.metadata.columns = [dv.categorical.categories[0].source].concat(gr[0].values.map(v => v.source));
            const v = powerbi.visuals.plugins[g].create({ element: document.getElementById(id), host: __host });
            window['v_' + id] = v; window['dv_' + id] = dv;
            v.update({ dataViews: [dv], viewport: {width: w, height: h}, type: 2, operationKind: 0, viewMode: 0, jsonFilters: [] }); }"""
        await pg.evaluate(js, [guid, hid, dv, w, h])
    await pg.wait_for_timeout(300)
    for hid, dv, w, h in hosts:      # segunda pasada: la licencia ya resuelta
        await pg.evaluate("([id, w, h]) => window['v_' + id].update({ dataViews: [window['dv_' + id]], viewport: {width: w, height: h}, type: 2, operationKind: 0, viewMode: 0, jsonFilters: [] })", [hid, w, h])
    await pg.wait_for_timeout(400)
    return pg


def eur(x):
    return f"€{x / 1e6:.1f}M" if x >= 1e6 else f"€{x / 1e3:.0f}K"


async def main():
    if not os.path.exists(os.path.join(H.DROP, "visual.js")):
        print("Falta .tmp/drop: node build-test.js --free"); sys.exit(2)
    os.makedirs(ASSETS, exist_ok=True)
    sub = "Bar Chart with Variation % · Begudes Nord · fictitious company · 2025"
    act = [round(p * f * 1000) for p, f in zip(H.PLAN_V, H.F_ACT)]
    plan = [p * 1000 for p in H.PLAN_V]
    bajo = [H.MESES[i] for i in range(12) if act[i] < plan[i]]
    base = {"style": {"guide": False}}

    async with async_playwright() as p:
        b = await p.chromium.launch()

        # 1 · Real y plan lado a lado.
        o = json.loads(json.dumps(base)); o["comparison"] = {"compareTo": "plan", "referenceAs": "bar"}
        W, Hh = 1000, 640
        cuerpo = f'<div class="tarjeta" style="flex:1"><div class="titulo">Net sales vs plan, by month</div><div class="host" id="s1" style="width:{W - 24}px;height:{Hh - 64}px"></div></div>'
        lat = (f'<div class="tarjeta kpi"><div class="n">{eur(sum(act))}</div><div class="t">actual · plan {eur(sum(plan))} '
               f'({(sum(act) / sum(plan) - 1) * 100:+.1f}%)</div></div>'
               f'<div class="tarjeta kpi"><div class="n">{len(bajo)} of 12</div><div class="t">months below plan: {", ".join(bajo)}</div></div>'
               '<div class="tarjeta"><h3>New in 1.12 · Pro</h3><p>Show the plan as a <b>bar beside the actual</b>, or as a marker. '
               'The variance against plan sits above every pair, and bars below plan take the negative colour.</p></div>'
               '<div class="tarjeta"><h3>No DAX</h3><p>Bring the actual and the plan measures: the variance % is calculated by the visual.</p></div>')
        pg = await montar(b, plantilla("Are we on plan this year?", sub, cuerpo, lat), [("s1", H.dataview(o), W - 24, Hh - 64)])
        await pg.screenshot(path=os.path.join(ASSETS, "Screenshot_1.png"))
        await pg.close()

        # 2 · Small multiples por canal en Boardroom.
        o = json.loads(json.dumps(base)); o["style"]["template"] = "boardroom"; o["comparison"] = {"compareTo": "plan", "showMarker": True}
        o["panelLayout"] = {"columns": 3, "gap": 12}; o["panelTitle"] = {"titleAlign": "left"}
        cuerpo = f'<div class="tarjeta" style="flex:none;align-self:flex-start;padding:0;overflow:hidden;width:{W}px;height:{Hh}px"><div class="host" id="s2" style="width:{W}px;height:{Hh}px"></div></div>'
        lat = ('<div class="tarjeta"><h3>One panel per channel</h3><p>Horeca, Retail and Online on a <b>shared scale</b>, so a taller bar is a '
               'larger value in every panel. Free draws 3 panels; Pro up to 100.</p></div>'
               '<div class="tarjeta"><h3>Boardroom style · Pro</h3><p>One of the six styles shared by the TCViz collection: a page of our '
               'visuals reads as one report.</p></div>'
               '<div class="tarjeta"><h3>Small multiples card</h3><p>Columns, space between panels, title alignment and border, as in every '
               'TCViz visual.</p></div>')
        pg = await montar(b, plantilla("Which channel is missing its plan?", sub, cuerpo, lat), [("s2", H.dataview(o, canales=True), W, Hh)])
        await pg.screenshot(path=os.path.join(ASSETS, "Screenshot_2.png"))
        await pg.close()

        # 3 · Cuatro looks del mismo gráfico.
        celdas, hosts = [], []
        for k, (t, nombre) in enumerate((("clean", "Report theme · free"), ("ibcs", "IBCS style · free"), ("ledger", "Ledger · Pro"), ("aurora", "Aurora · Pro"))):
            o = json.loads(json.dumps(base)); o["style"]["template"] = t; o["comparison"] = {"compareTo": "plan", "showMarker": True}
            celdas.append(f'<div class="tarjeta" style="padding:10px"><div class="titulo">{nombre}</div><div class="host" id="c{k}" style="width:636px;height:282px"></div></div>')
            hosts.append((f"c{k}", H.dataview(o), 636, 282))
        cuerpo = f'<div class="rej">{"".join(celdas)}</div>'
        pg = await montar(b, plantilla("One chart, nine styles", "Report theme, Classic and IBCS style free · Boardroom, Ledger, Editorial, Signal, Aurora and Terrace in Pro", cuerpo, ""), hosts)
        await pg.screenshot(path=os.path.join(ASSETS, "Screenshot_3.png"))
        await pg.close()
        await b.close()
    print("assets/Screenshot_1-3.png")


if __name__ == "__main__":
    asyncio.run(main())
