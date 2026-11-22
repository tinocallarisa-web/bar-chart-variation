# -*- coding: utf-8 -*-
"""Simulador Playwright de Bar Chart with Variation % (1.12).

Carga el bundle de .tmp/drop (lo deja `node build-test.js --free`, con la licencia REAL) en un host simulado; la
licencia se simula en el host (Pro o sin licencia), así una sola build cubre los dos caminos.

    node build-test.js --free
    python tools/simulador/harness.py            # comprobaciones + capturas en tools/simulador/capturas/
"""
import asyncio, io, json, os, sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "capturas")
DROP = os.path.join(ROOT, ".tmp", "drop")
PLAN = "bar-chart-variation-pro"
FALLOS = []

MESES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
PLAN_V = [820, 780, 900, 940, 1010, 1120, 1180, 1090, 980, 1000, 1060, 1240]
F_ACT = [1.03, 0.96, 1.05, 0.92, 1.08, 1.02, 0.97, 1.06, 1.04, 0.95, 1.01, 1.07]
F_PY = [0.95, 0.97, 0.93, 0.99, 0.94, 0.96, 1.01, 0.95, 0.97, 1.02, 0.96, 0.94]
CANALES = {"Horeca": 0.46, "Retail": 0.34, "Online": 0.20}
F_CANAL = {"Horeca": [1.0] * 12, "Retail": [0.98, 1.04, 0.97, 1.05, 0.96, 1.02, 1.03, 0.97, 1.01, 1.04, 0.99, 0.98],
           "Online": [1.06, 0.95, 1.08, 0.96, 1.07, 0.97, 0.99, 1.05, 0.98, 1.06, 1.02, 1.04]}


def dataview(objects=None, roles=("measure", "plan"), canales=False, fmt="€#,0"):
    act = [round(p * f * 1000) for p, f in zip(PLAN_V, F_ACT)]
    cols = {"measure": ("Sales", act), "plan": ("Plan", [p * 1000 for p in PLAN_V]),
            "previousYear": ("Sales PY", [round(a * f) for a, f in zip(act, F_PY)])}
    grupos = []
    for c, peso in (CANALES.items() if canales else [(None, 1.0)]):
        vals = []
        for r in roles:
            nombre, v = cols[r]
            fc = F_CANAL[c] if (c and r == "measure") else [1.0] * 12
            vals.append({"source": {"displayName": nombre, "queryName": "m." + r, "roles": {r: True}, "format": fmt, "type": {"numeric": True}},
                         "values": [round(x * peso * f) for x, f in zip(v, fc)]})
        grupos.append({"name": c, "values": vals})
    return {"metadata": {"objects": objects or {}, "columns": []},
            "categorical": {"categories": [{"source": {"displayName": "Month", "queryName": "d.Month", "roles": {"category": True}, "type": {"text": True}},
                                            "values": MESES, "identity": [{"k": i} for i in range(12)]}], "__grupos": grupos}}


STUB = r"""
window.__ev = []; window.__persist = []; window.__notif = [];
window.powerbi = { visuals: { plugins: {} }, extensibility: {} };
(function(){
 window.__host = {
  eventService: { renderingStarted(){ __ev.push('S'); }, renderingFinished(){ __ev.push('F'); }, renderingFailed(o,m){ __ev.push('X'); console.error('FAILED', m); } },
  createSelectionManager(){ return { select(){ return Promise.resolve([]); }, clear(){ return Promise.resolve(); }, getSelectionIds(){ return []; },
     hasSelection(){ return false; }, registerOnSelectCallback(){}, showContextMenu(){ return Promise.resolve(); } }; },
  createSelectionIdBuilder(){ const k=[]; const b = { withCategory(c,i){ k.push('c'+i); return b; }, withSeries(v,g){ k.push('s'+(g&&g.name)); return b; },
     withMeasure(){ return b; }, createSelectionId(){ const key=k.join('|'); return { key, getKey(){return key;}, equals(o){return o&&o.key===key;}, includes(){return false;} }; } }; return b; },
  createLocalizationManager(){ return { getDisplayName(k){ return k; } }; },
  tooltipService: { enabled(){ return true; }, show(){}, move(){}, hide(){} },
  subSelectionService: { subSelect(){}, updateRegionOutlines(){} },
  hostCapabilities: { allowInteractions: true }, locale: 'en-US',
  colorPalette: { isHighContrast: !!window.__hc, foreground:{value: window.__hc ? '#FFFF00' : '#252423'}, background:{value: window.__hc ? '#000000' : '#FFFFFF'},
    foregroundSelected:{value:'#1AEBFF'}, positive:{value:'#3E9C5B'}, negative:{value:'#D64545'}, getColor(k){ return {value:'#2B6CB0'}; } },
  licenseManager: { getAvailableServicePlans(){ return Promise.resolve({ plans: window.__pro ? [{ spIdentifier: 'PLAN', state: 1 }] : [], isLicenseUnsupportedEnv: false, isLicenseInfoAvailable: true }); },
     notifyFeatureBlocked(m){ __notif.push(m); return Promise.resolve(true); }, notifyLicenseRequired(){ return Promise.resolve(true); }, clearLicenseNotification(){ return Promise.resolve(true); } },
  persistProperties(p){ __persist.push(p); }, launchUrl(){}, applyJsonFilter(){}, displayWarningIcon(){}, refreshHostData(){},
 };
})();
"""


def check(name, ok, detail=""):
    print(f"  {'OK   ' if ok else 'FALLO'} {name}{'  — ' + detail if detail else ''}")
    if not ok: FALLOS.append(name)


async def page(b, dv, W=640, H=320, pro=True, edit=True, hc=False, name=None):
    guid = json.load(io.open(os.path.join(DROP, "pbiviz.json"), encoding="utf-8"))["visual"]["guid"]
    pg = await b.new_page(viewport={"width": W, "height": H})
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.set_content(f"<html><body style='margin:0;background:#fff'><div id='host' style='position:relative;width:{W}px;height:{H}px;overflow:hidden'></div></body></html>")
    await pg.add_style_tag(path=os.path.join(DROP, "visual.css"))
    await pg.add_script_tag(content=f"window.__pro = {json.dumps(pro)}; window.__hc = {json.dumps(hc)};")
    await pg.add_script_tag(content=STUB.replace("'PLAN'", repr(PLAN)))
    await pg.add_script_tag(path=os.path.join(DROP, "visual.js"))
    await pg.evaluate("(g) => { window.__v = powerbi.visuals.plugins[g].create({ element: document.getElementById('host'), host: __host }); }", guid)
    pg._errs, pg._dims, pg._vm = errs, (W, H), (1 if edit else 0)
    await upd(pg, dv)
    await pg.wait_for_timeout(120)       # la licencia se resuelve en diferido y repinta
    await upd(pg, dv)
    if name:
        os.makedirs(OUT, exist_ok=True)
        await pg.screenshot(path=os.path.join(OUT, name + ".png"))
    return pg


async def upd(pg, dv):
    W, H = pg._dims
    await pg.evaluate("""([dv, W, H, vm]) => {
        dv = JSON.parse(JSON.stringify(dv));
        const g = dv.categorical.__grupos; delete dv.categorical.__grupos;
        const vals = []; g.forEach(gr => gr.values.forEach(v => { v.source.groupName = gr.name; vals.push(v); }));
        vals.grouped = () => g.map(gr => ({ name: gr.name, values: gr.values, identity: { k: gr.name } }));
        vals.source = g[0].values[0].source;
        dv.categorical.values = vals;
        dv.metadata.columns = [dv.categorical.categories[0].source].concat(g[0].values.map(v => v.source));
        __v.update({ dataViews: [dv], viewport: { width: W, height: H }, type: 2, operationKind: 0, viewMode: vm, editMode: 0, jsonFilters: [] });
    }""", [dv, W, H, pg._vm])
    await pg.wait_for_timeout(80)


async def info(pg):
    return await pg.evaluate("""() => { const h = document.getElementById('host'); const wm = h.querySelector('.tcviz-wm');
        const bar = h.querySelector('.bar-rect');
        return { bg: h.style.background, wm: wm && wm.style.display !== 'none' ? wm.textContent : null,
                 bar: bar ? (bar.getAttribute('fill') || getComputedStyle(bar).fill) : null }; }""")


async def eventos(pg, label):
    ev = await pg.evaluate("() => __ev.join('')")
    check(f"{label}: sin errores y eventos 1:1", not pg._errs and ev.count("S") == ev.count("F") and "X" not in ev, f"{ev} {pg._errs[:2]}")


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        base = {"comparison": {"compareTo": "plan", "showMarker": True}, "style": {"guide": False}}

        print("Estilos de la colección")
        for est in ("clean", "classic", "ibcs", "boardroom", "ledger", "editorial", "signal", "aurora", "terrace"):
            o = json.loads(json.dumps(base)); o["style"]["template"] = est
            pg = await page(b, dataview(o), name=f"estilo_{est}")
            i = await info(pg)
            if est in ("boardroom", "aurora"):
                check(f"{est} (Pro): fondo del estilo", bool(i["bg"]), i["bg"])
            check(f"{est}: sin marca de agua con licencia", i["wm"] is None, str(i["wm"]))
            await eventos(pg, est)
            await pg.close()

        print("Estilo Pro sin licencia")
        o = json.loads(json.dumps(base)); o["style"]["template"] = "aurora"
        pg = await page(b, dataview(o), pro=False, edit=True, name="aurora_free_edicion")
        i = await info(pg)
        check("editando: vista previa con fondo y marca que nombra el estilo", bool(i["bg"]) and i["wm"] and "Aurora" in i["wm"], f"{i}")
        await pg.close()
        pg = await page(b, dataview(o, roles=("measure",)), pro=False, edit=False, name="aurora_free_lectura")
        i = await info(pg)
        check("lectura: Report theme, sin fondo ni marca", not i["bg"] and i["wm"] is None, f"{i}")
        await pg.close()

        print("Alto contraste gana al estilo")
        pg = await page(b, dataview(o), hc=True, name="aurora_hc")
        i = await info(pg)
        check("alto contraste: sin fondo del estilo", not i["bg"], f"{i}")
        await pg.close()

        print("Plantilla retirada sigue funcionando")
        o = json.loads(json.dumps(base)); o["style"]["template"] = "minimal"
        pg = await page(b, dataview(o), name="minimal_guardada")
        await eventos(pg, "minimal")
        await pg.close()

        print("Texto que encoge con el visual")
        o = json.loads(json.dumps(base)); o["legend"] = {"show": True}
        medir = """() => { const h = document.getElementById('host');
            const fs = sel => Array.from(h.querySelectorAll(sel)).map(e => parseFloat(e.style.fontSize || getComputedStyle(e).fontSize));
            const t = Array.from(h.querySelectorAll('svg text')).filter(e => e.textContent.trim() && e.getBBox().width > 0);
            return { n: t.length, fs: t.map(e => parseFloat(e.style.fontSize || getComputedStyle(e).fontSize)) }; }"""
        grande = await page(b, dataview(o), W=760, H=420, name="tamano_760x420")
        g = await grande.evaluate(medir)
        await grande.close()
        peq = await page(b, dataview(o), W=456, H=252, name="tamano_456x252")
        q = await peq.evaluate(medir)
        await eventos(peq, "pequeño")
        await peq.close()
        check("al 60 %: el mayor texto encoge", max(q["fs"]) < max(g["fs"]), f"{max(g['fs'])} -> {max(q['fs'])}")
        check("al 60 %: nada por debajo de 8 px", min(q["fs"]) >= 8, str(min(q["fs"])))
        check("al 60 %: no se quita ningún texto", q["n"] >= g["n"], f"{g['n']} -> {q['n']}")
        mini = await page(b, dataview(o), W=300, H=170, name="tamano_300x170")
        m = await mini.evaluate(medir)
        await eventos(mini, "mosaico 300x170")
        await mini.close()
        check("mosaico 300x170: suelo de 8 px", min(m["fs"]) >= 8, str(min(m["fs"])))

        print("Accesibilidad")
        o = json.loads(json.dumps(base)); o["accessibility"] = {"highContrast": "on"}; o["style"]["template"] = "aurora"
        pg = await page(b, dataview(o), name="hc_forzado")
        i = await info(pg)
        check("alto contraste On: barras con el fondo del tema y sin estilo", i["bar"] in ("#FFFFFF", "#ffffff") and not i["bg"], f"{i}")
        await eventos(pg, "hc on")
        await pg.close()
        o = json.loads(json.dumps(base)); o["accessibility"] = {"focusColor": {"solid": {"color": "#FF00AA"}}, "focusWidth": 4}
        pg = await page(b, dataview(o))
        f = await pg.evaluate("() => { const h = document.getElementById('host'); return [h.style.getPropertyValue('--bcv-focus'), h.style.getPropertyValue('--bcv-focus-w')]; }")
        check("foco: color y grosor de la tarjeta", f == ["#FF00AA", "4px"], str(f))
        await pg.close()
        o = json.loads(json.dumps(base)); o["accessibility"] = {"minTextSize": 12}
        pg = await page(b, dataview(o), W=456, H=252, name="min_texto_12")
        q = await pg.evaluate(medir)
        check("tamaño mínimo 12: ningún texto por debajo", min(q["fs"]) >= 12, str(min(q["fs"])))
        await eventos(pg, "min texto")
        await pg.close()

        await b.close()
    print()
    print("TODO OK" if not FALLOS else f"{len(FALLOS)} FALLO(S): " + "; ".join(FALLOS))


if __name__ == "__main__":
    asyncio.run(main())
