# -*- coding: utf-8 -*-
"""src/formatSpec.ts a partir de capabilities.json: el panel de formato (getFormattingModel) se monta desde aquí.

Así el panel nuevo conserva exactamente los objetos, propiedades, claves de traducción y opciones que ya usan los
informes publicados. dataColors y colorSelector (un color por barra / por serie) se montan aparte en visual.ts.
Ejecutar desde la raíz:  python tools/gen_format_spec.py
"""
import io, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POR_INSTANCIA = {"dataColors", "colorSelector"}


def kind(t):
    if "bool" in t: return "bool"
    if "numeric" in t or "integer" in t: return "num"
    if "fill" in t: return "color"
    if "formatting" in t and "fontSize" in t["formatting"]: return "fontSize"
    if "text" in t: return "text"
    if "enumeration" in t: return "enum"
    raise SystemExit("tipo no soportado: " + json.dumps(t))


def main():
    caps = json.load(io.open(os.path.join(ROOT, "capabilities.json"), encoding="utf-8"))
    cards = []
    for obj, o in caps["objects"].items():
        if obj in POR_INSTANCIA:
            continue
        props = []
        for name, p in o["properties"].items():
            k = kind(p["type"])
            item = {"name": name, "key": p.get("displayNameKey", ""), "label": p.get("displayName", name), "kind": k}
            if k == "enum":
                item["items"] = [{"value": e["value"], "key": e.get("displayNameKey", ""), "label": e["displayName"]}
                                 for e in p["type"]["enumeration"]]
            props.append(item)
        cards.append({"obj": obj, "key": o.get("displayNameKey", ""), "label": o.get("displayName", obj), "props": props})
    ts = ["/**",
          " * Tarjetas del panel de formato, generadas desde capabilities.json por tools/gen_format_spec.py.",
          " * No editar a mano: cambiar capabilities.json y regenerar.",
          " */",
          "export interface SpecItem { value: string; key: string; label: string; }",
          "export interface SpecProp { name: string; key: string; label: string; kind: \"bool\" | \"num\" | \"color\" | \"fontSize\" | \"text\" | \"enum\"; items?: SpecItem[]; }",
          "export interface SpecCard { obj: string; key: string; label: string; props: SpecProp[]; }",
          "export const FORMAT_SPEC: SpecCard[] = " + json.dumps(cards, ensure_ascii=False, indent=4) + ";", ""]
    io.open(os.path.join(ROOT, "src", "formatSpec.ts"), "w", encoding="utf-8", newline="\n").write("\n".join(ts))
    print("formatSpec.ts:", len(cards), "tarjetas,", sum(len(c["props"]) for c in cards), "propiedades")


if __name__ == "__main__":
    main()
