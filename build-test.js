/**
 * build-test.js
 * Genera un .pbiviz con isPro=true y guid_test para pruebas en Power BI Desktop.
 * USO: node build-test.js
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

// 1. Leer originales
const originalTs     = fs.readFileSync(VISUAL_TS,   "utf8");
const originalPbiviz = fs.readFileSync(PBIVIZ_JSON, "utf8");
const pbivizObj      = JSON.parse(originalPbiviz);

console.log("\nBuild TEST — " + pbivizObj.visual.displayName + " v" + pbivizObj.visual.version);
console.log("GUID real:  " + pbivizObj.visual.guid);

// 2. Patch visual.ts — forzar isPro = true
const LICENSE_BLOCK = `            // Production license check via Microsoft AppSource
            try {
                const licenseResult = await this.licenseManager.getAvailableServicePlans();
                this.isPro = licenseResult.plans?.some(
                    plan => plan.spIdentifier === "bar-chart-variation-pro-tcviz" &&
                            plan.state === ServicePlanState.Active
                ) ?? false;
            } catch (_) {
                this.isPro = false;
            }`;

const LICENSE_PATCH = `            // TEST BUILD — isPro forzado a true
            this.isPro = true;`;

if (!originalTs.includes(LICENSE_BLOCK)) {
    console.error("\nERROR: El bloque de licencia no coincide. Actualiza LICENSE_BLOCK en build-test.js.\n");
    process.exit(1);
}

const patchedTs = originalTs.replace(LICENSE_BLOCK, LICENSE_PATCH);

// 3. Patch pbiviz.json — anadir _test al guid
const realGuid    = pbivizObj.visual.guid;
const testGuid    = realGuid + "_test";
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
    const distFiles = require("fs").readdirSync(path.join(ROOT, "dist")).filter(f => f.endsWith(".pbiviz"));
    console.log("\nBuild TEST listo en dist/" + (distFiles[0] || "*.pbiviz"));
    console.log("Importa el .pbiviz en Power BI Desktop y prueba.\n");
} else {
    process.exit(1);
}
