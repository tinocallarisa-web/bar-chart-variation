/**
 * build-test.js
 * Genera un .pbiviz de prueba para Power BI Desktop.
 * USO: node build-test.js [--free]
 *   (sin flag) isPro forzado a true, guid + "_test"
 *   --free     isPro sin forzar (tier gratuito real), guid + "_testfree"
 *
 * Reglas del skill pbiviz-appsource:
 * - Parchea -> empaqueta -> RESTAURA. El fuente siempre queda en estado produccion.
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT        = __dirname;
const VISUAL_TS   = path.join(ROOT, "src", "visual.ts");
const PBIVIZ_JSON = path.join(ROOT, "pbiviz.json");
const forceFree   = process.argv.includes("--free");

// 1. Leer originales
const originalTs     = fs.readFileSync(VISUAL_TS,   "utf8");
const originalPbiviz = fs.readFileSync(PBIVIZ_JSON, "utf8");
const pbivizObj      = JSON.parse(originalPbiviz);

console.log("\nBuild TEST — " + pbivizObj.visual.displayName + " v" + pbivizObj.visual.version);
console.log("GUID real:  " + pbivizObj.visual.guid);
console.log("Tier:       " + (forceFree ? "Free (licencia real)" : "Pro (forzado)"));

// 2. Patch visual.ts — forzar isPro = true
//
// En 1.9.1.0 la licencia salio de update() a requestLicenseDeferred(). Se parchea el
// inicializador del campo: es estable, y requestLicenseDeferred() retorna de inmediato
// si isPro ya es true.
const LICENSE_BLOCK = `    private isPro: boolean = false;`;
const LICENSE_PATCH = `    private isPro: boolean = true; // TEST BUILD — isPro forzado`;

let patchedTs = originalTs;
if (!forceFree) {
    if (!originalTs.includes(LICENSE_BLOCK)) {
        console.error("\nERROR: El bloque de licencia no coincide. Actualiza LICENSE_BLOCK en build-test.js.\n");
        process.exit(1);
    }
    patchedTs = originalTs.replace(LICENSE_BLOCK, LICENSE_PATCH);
}

// --debug: rotulo rojo con lo que manda Power BI en cada update. Solo en la build de test;
// el fuente no lleva instrumentacion.
if (process.argv.includes("--debug")) {
    const DEBUG_ANCHOR = "this.renderWatermark(svgWidth, svgHeight, preview && this.attemptedPro.length > 0);";
    if (!patchedTs.includes(DEBUG_ANCHOR)) {
        console.error("\nERROR: No se encuentra el ancla de --debug. Actualiza DEBUG_ANCHOR en build-test.js.\n");
        process.exit(1);
    }
    const DEBUG_CODE = DEBUG_ANCHOR + `
        { const o: any = options; this.messageGroup.selectAll(".dbg").remove();
          this.messageGroup.append("text").classed("dbg", true).attr("x", 4).attr("y", 12)
            .style("font-size", "10px").style("fill", "#C00000")
            .text("DBG viewMode=" + o.viewMode + " editMode=" + o.editMode + " formatMode=" + o.formatMode +
                  " isInFocus=" + o.isInFocus + " type=" + o.type + " lic=" + this.licenseResolved +
                  " unsup=" + this.licenseEnvUnsupported + " pro=" + this.isPro + " preview=" + preview); }`;
    patchedTs = patchedTs.replace(DEBUG_ANCHOR, DEBUG_CODE);
    console.log("Debug:      rotulo DBG activado");
}

// 3. Patch pbiviz.json — sufijo propio por modo, para que convivan en Desktop
const realGuid      = pbivizObj.visual.guid;
const testGuid      = realGuid + (forceFree ? "_testfree" : "_test");
const patchedPbiviz = originalPbiviz.replace('"' + realGuid + '"', '"' + testGuid + '"');

console.log("GUID test:  " + testGuid);

// 4. Escribir parcheados
fs.writeFileSync(VISUAL_TS,   patchedTs,     "utf8");
fs.writeFileSync(PBIVIZ_JSON, patchedPbiviz, "utf8");

// 5. Empaquetar
let buildOk = false;
try {
    console.log("\nEjecutando npx pbiviz package ...\n");
    execSync("npx pbiviz package", { cwd: ROOT, stdio: "inherit" });
    buildOk = true;
} catch (e) {
    console.error("\nEl build fallo. Revisa los errores arriba.");
} finally {
    // 6. RESTAURAR SIEMPRE
    fs.writeFileSync(VISUAL_TS,   originalTs,     "utf8");
    fs.writeFileSync(PBIVIZ_JSON, originalPbiviz, "utf8");
    console.log("\nFicheros restaurados a estado produccion.");
}

if (buildOk) {
    const name = testGuid + "." + pbivizObj.visual.version + ".pbiviz";
    console.log("\nBuild TEST listo en dist/" + name);
    console.log("Importa el .pbiviz en Power BI Desktop y prueba.\n");
} else {
    process.exit(1);
}
