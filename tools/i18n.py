# -*- coding: utf-8 -*-
"""stringResources (12 idiomas), la lista de pbiviz.json y src/strings.ts.

Fuente del inglés: stringResources/en-US (claves de capabilities) + los tr("Clave", "inglés") de src/visual.ts.
El español de las claves que ya existían se conserva del es-ES publicado; lo demás sale de las tablas por TEXTO inglés
(i18n_common.py + i18n_bcv.py). Ejecutar desde la raíz:  python tools/i18n.py
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from i18n_common import C
from i18n_bcv import B

L = ["es-ES", "pt-BR", "fr-FR", "de-DE", "it-IT", "nl-NL", "pl-PL", "ja-JP", "zh-CN", "ko-KR"]
T = {**C, **B}


def leer(lang):
    p = os.path.join(ROOT, "stringResources", lang, "resources.resjson")
    return json.load(io.open(p, encoding="utf-8")) if os.path.exists(p) else {}


def main():
    caps_en = leer("en-US")
    caps_en = {k: v for k, v in caps_en.items() if not k.startswith("UI_")}    # regenerable: solo las claves de capabilities
    es_publicado = leer("es-ES")
    src = io.open(os.path.join(ROOT, "src", "visual.ts"), encoding="utf-8").read()
    ui = {}
    for m in re.finditer(r'this\.tr\(\s*"([A-Za-z0-9_]+)"\s*,\s*"([^"]*)"', src):
        if m.group(1) not in caps_en:
            ui.setdefault(m.group(1), m.group(2))
    en = {**caps_en, **ui}
    falta = sorted({v for v in en.values() if v not in T})
    if falta:
        raise SystemExit("Sin traducción: " + " | ".join(falta))
    out = {"en-US": en}
    for i, lang in enumerate(L):
        d = {}
        for k, v in en.items():
            if lang == "es-ES" and k in caps_en and es_publicado.get(k):
                d[k] = es_publicado[k]          # el español ya publicado no cambia
            else:
                d[k] = T[v][i]
        out[lang] = d
    out["pt-PT"] = dict(out["pt-BR"])
    for lang, d in out.items():
        p = os.path.join(ROOT, "stringResources", lang)
        os.makedirs(p, exist_ok=True)
        io.open(os.path.join(p, "resources.resjson"), "w", encoding="utf-8", newline="\n").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    # pbiviz.json: los 12 idiomas declarados
    pv = json.load(io.open(os.path.join(ROOT, "pbiviz.json"), encoding="utf-8"))
    pv["stringResources"] = [f"stringResources/{l}/resources.resjson" for l in ["en-US"] + L + ["pt-PT"]]
    io.open(os.path.join(ROOT, "pbiviz.json"), "w", encoding="utf-8", newline="\n").write(json.dumps(pv, indent=2, ensure_ascii=False) + "\n")
    # Bundle: los textos que no son de capabilities (Desktop no los traduce con getDisplayName).
    tabla = {lang: {k: d[k] for k in ui if d[k] != en[k]} for lang, d in out.items() if lang != "en-US"}
    ts = ["/**",
          " * Traducciones de los textos que escribe el propio visual (avisos, tooltips, leyenda, pantalla de inicio).",
          " * Power BI Desktop solo resuelve con getDisplayName las claves declaradas en capabilities.json, así que",
          " * estas viajan en el bundle. Generado por tools/i18n.py: no editar a mano.",
          " */",
          "export const STRINGS: Record<string, Record<string, string>> = " + json.dumps(tabla, ensure_ascii=False, indent=4) + ";", ""]
    io.open(os.path.join(ROOT, "src", "strings.ts"), "w", encoding="utf-8", newline="\n").write("\n".join(ts))
    print(len(en), "claves ·", len(out), "idiomas ·", len(ui), "en el bundle")


if __name__ == "__main__":
    main()
