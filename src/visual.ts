"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import * as d3 from "d3";

import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import IValueFormatter = valueFormatter.IValueFormatter;

import IVisualLicenseManager = powerbi.extensibility.IVisualLicenseManager;
import ServicePlanState = powerbi.ServicePlanState;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
// DrillType is a const enum — use numeric values: Up=1, Down=2, MoveToNextlevel=3

import { createTooltipServiceWrapper, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import { FORMAT_SPEC } from "./formatSpec";
import {
    HtmlSubSelectableClass, HtmlSubSelectionHelper, SubSelectableDisplayNameAttribute,
    SubSelectableObjectNameAttribute, SubSelectableTypeAttribute,
} from "powerbi-visuals-utils-onobjectutils";
import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";
import { STRINGS } from "./strings";

type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

interface BarDatum {
    selectionId: powerbi.visuals.ISelectionId;
    tooltipInfo: VisualTooltipDataItem[];
}

interface VisualSettings {
    barSettings: {
        barColor: string;
        negativeColor: string;
        barOpacity: number;
        axisTextColor: string;
        borderColor: string;
        borderWidth: number;
        connectorColor: string;
    };
    comparison: {
        compareTo: string;      // previous | previousYear | plan | forecast
        varianceMode: string;   // relative | absolute | both   (absolute/both = Pro)
        showMarker: boolean;
        markerColor: string;
    };
    variationLabels: {
        show: boolean;
        fontSize: number;
        positiveColor: string;
        negativeColor: string;
        decimalPlaces: number;
        showArrows: boolean;
        showConnectors: boolean;
    };
    valueLabels: {
        show: boolean;
        color: string;
        fontSize: number;
        displayUnits: number;
        valueDecimalPlaces: number;
    };
    panelTitle: {
        show: boolean;
        position: string;
        fontSize: number;
        titleStyle: string;     // line | background
        backgroundColor: string;
        useSeriesColor: boolean;
        customColor: string;
    };
    axisSettings: {
        sortOrder: string;
        showXLabels: boolean;
        xLabelAngle: string;    // auto | 0 | -45 | -90
        showYLabels: boolean;
        xFontSize: number;
        yFontSize: number;
        xColor: string;
        xBold: boolean;
        xItalic: boolean;
        yColor: string;
        yBold: boolean;
        yItalic: boolean;
        hideEmpty: boolean;
        showXTitle: boolean;
        xTitle: string;
        showYTitle: boolean;
        yTitle: string;
    };
    panelStyle: {
        showBackground: boolean;
        bgColor: string;
        bgOpacity: number;
    };
    panelLayout: {
        orientation: string;    // vertical | horizontal
        columns: number;        // 0 = automatico
        minPanelWidth: number;
        minPanelHeight: number;
        enableScroll: boolean;
        barBorderRadius: number;
    };
    analyticalLines: {
        showAverage: boolean;
        showMax: boolean;
        showMin: boolean;
        showMedian: boolean;
        showTrend: boolean;
        trendColor: string;
        showRef: boolean;
        refValue: number;
        lineColor: string;
        lineStyle: string;
        showLabel: boolean;
        labelSize: number;
        showBand: boolean;
        bandMin: number;
        bandMax: number;
        bandColor: string;
        bandOpacity: number;
    };
    legend: {
        show: boolean;
        position: string;
        textColor: string;
    };
    accessibility: {
        highContrastMode: boolean;
    };
    style: {
        template: string;
        guide: boolean;
    };
}

interface TooltipField {
    name: string;
    values: (number | null)[];
    format: string;
}

interface SeriesData {
    name: string;
    values: number[];
    highlights: (number | null)[];
    color: string;
    cfColors: (string | null)[];   // per-bar conditional formatting colors
    /** Valores de las medidas de referencia, por nombre de rol (previousYear | plan | forecast) */
    refValues: { [role: string]: (number | null)[] };
    selectionId: powerbi.visuals.ISelectionId;
    barSelectionIds: powerbi.visuals.ISelectionId[];
    tooltipFields: TooltipField[];
}

// Plan ID tal como aparece en Partner Center (verificado 2026-09-15).
/** Roles de medida que actuan como referencia de comparacion. */
const REF_ROLES = ["previousYear", "plan", "forecast"];
/** Etiqueta visible de cada referencia, para tooltips, aria y leyenda. */
/** Luminancia relativa segun WCAG. Acepta #rgb y #rrggbb. */
function luminancia(hex: string): number {
    const h = String(hex || "").replace("#", "");
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    if (full.length !== 6) { return 1; }
    const canal = (i: number) => {
        const v = parseInt(full.substr(i * 2, 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

/** Razon de contraste WCAG entre dos colores. 1 = identicos, 21 = negro sobre blanco. */
function contraste(a: string, b: string): number {
    const la = luminancia(a), lb = luminancia(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Devuelve el color pedido si se lee sobre el fondo, y si no el blanco o el negro que
 * mas contraste dan. 3:1 es el minimo de WCAG para texto grande y en negrita.
 */
function legible(color: string, fondo: string): string {
    if (contraste(color, fondo) >= 3) { return color; }
    return luminancia(fondo) > 0.4 ? "#1A1A1A" : "#FFFFFF";
}

/** Alto reservado a la cabecera del panel, a la fila de variacion y a la leyenda. */
const TITLE_H = 22;
const VAR_H = 30;
const LEGEND_H = 24;

const REF_LABELS: Record<string, string> = {
    previous: "Previous",
    previousYear: "Previous Year",
    plan: "Plan / Budget",
    forecast: "Forecast"
};
// Planes que dan Pro. El de 2,99 (…-pro-tcviz) se detiene en 1.11 pero sus suscriptores siguen activos hasta que
// cancelen; el nuevo, a 0,99, tiene que crearse en Partner Center con este Plan ID exacto.
const PLAN_IDS = ["bar-chart-variation-pro-tcviz", "bar-chart-variation-pro"];

/**
 * Plantillas de estilo: un punto de partida. Solo rellenan lo que el usuario no ha tocado (un ajuste escrito en
 * metadata.objects gana siempre). "clean" no cambia nada: es el aspecto de siempre, así ningún informe cambia.
 */
const TEMPLATES: Record<string, Record<string, Record<string, any>>> = {
    clean: {},
    classic: { panelTitle: { titleStyle: "line", useSeriesColor: false, customColor: "#333333" }, panelLayout: { barBorderRadius: 0 },
        variationLabels: { showArrows: false } },
    minimal: { variationLabels: { showConnectors: false, showArrows: false }, panelTitle: { titleStyle: "line" },
        panelLayout: { barBorderRadius: 0 }, axisSettings: { showYLabels: false } },
    contrast: { barSettings: { borderWidth: 1, borderColor: "#FFFFFF" }, variationLabels: { fontSize: 12 },
        panelTitle: { titleStyle: "background", useSeriesColor: false, backgroundColor: "#252423", customColor: "#FFFFFF" } },
    compact: { variationLabels: { fontSize: 9, showArrows: false }, axisSettings: { xFontSize: 8, yFontSize: 8 },
        panelTitle: { fontSize: 9 }, panelLayout: { barBorderRadius: 1 } },
    // Estética de IBCS (sobria, grises, variaciones en verde y rojo). Es un estilo: no afirma cumplimiento del estándar.
    ibcs: { barSettings: { barColor: "#404040", negativeColor: "#404040", axisTextColor: "#262626", connectorColor: "#262626" },
        variationLabels: { positiveColor: "#4F8A10", negativeColor: "#C00000", showArrows: false },
        comparison: { markerColor: "#000000" }, panelLayout: { barBorderRadius: 0 },
        panelTitle: { titleStyle: "line", useSeriesColor: false, customColor: "#262626" }, legend: { textColor: "#262626" } },
};

// ServicePlanState es un const enum: en runtime hacen falta los numeros.
const STATE_ACTIVE = 1;
/** Diagnóstico de colores: build-test.js --fxdiag lo pone a true. En producción, siempre false. */
const DEBUG_FX = false;
const STATE_WARNING = 2;

// spIdentifier = Service ID completo (editor.oferta.plan); se acepta también el Plan ID solo
function matchesPlan(spIdentifier: unknown, planId: string): boolean {
    const sp = String(spIdentifier ?? "");
    return sp === planId || sp.endsWith("." + planId);
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    private svg: Selection<SVGElement>;
    private chartGroup: Selection<SVGGElement>;
    private legendGroup: Selection<SVGGElement>;
    private watermarkGroup: Selection<SVGGElement>;
    private messageGroup: Selection<SVGGElement>;
    private licenseManager: IVisualLicenseManager;
    private colorPalette: powerbi.extensibility.IColorPalette;
    private localization: powerbi.extensibility.ILocalizationManager;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    /** El usuario ha elegido color de barra, aunque coincida con el valor por defecto. */
    private barColorSetByUser = false;
    private isPro: boolean = false;
    private licenseRequested = false;
    private licenseResolved = false;
    private licenseEnvUnsupported = false;
    private noticeShown = false;
    /** Funciones Pro de las que ya se ha avisado en esta sesión de edición */
    private notifiedPro: string[] = [];
    /** Temporizador que deja la barra de Upgrade cuando termina el banner */
    private licenseIconTimer: number | null = null;
    private attemptedPro: string[] = [];
    /** Formato desde el lienzo (on-object). */
    public visualOnObjectFormatting: powerbi.extensibility.visual.VisualOnObjectFormatting;
    private subSelectionHelper: HtmlSubSelectionHelper;
    private formatMode = false;
    /** Plantilla de estilo vigente y asistente de configuración. */
    private template = "clean";
    private guideOn = true;
    private guideStep = 2;
    private guideEl: HTMLDivElement | null = null;
    /** Identidades que Power BI pasa al restaurar un marcador; getSelectionIds() puede no tenerlas todavía. */
    private restoredIds: powerbi.visuals.ISelectionId[] = [];
    private lastOptions: VisualUpdateOptions;
    private rawSettings: VisualSettings;
    private dataView: DataView;

    private settings: VisualSettings = {
        barSettings: {
            barColor: "#378ADD",
            negativeColor: "#E24B4A",
            barOpacity: 100,
            axisTextColor: "#666666",
            borderColor: "#FFFFFF",
            borderWidth: 0,
            connectorColor: "#333333"
        },
        comparison: {
            compareTo: "previous",
            varianceMode: "relative",
            showMarker: true,
            markerColor: "#333333"
        },
        variationLabels: {
            show: true,
            fontSize: 11,
            positiveColor: "#00BFA5",
            negativeColor: "#FF4081",
            decimalPlaces: 1,
            showArrows: true,
            showConnectors: true
        },
        valueLabels: {
            show: false,
            color: "#333333",
            fontSize: 10,
            displayUnits: 0,
            valueDecimalPlaces: 1
        },
        panelTitle: {
            show: true,
            position: "top",
            fontSize: 11,
            titleStyle: "line",
            backgroundColor: "#F2F4F7",
            useSeriesColor: true,
            customColor: "#333333"
        },
        axisSettings: {
            sortOrder:   "auto",
            showXLabels: true,
            xLabelAngle: "auto",
            showYLabels: true,
            xFontSize:   9,
            yFontSize:   9,
            xColor:      "#666666",
            xBold:       false,
            xItalic:     false,
            yColor:      "#666666",
            yBold:       false,
            yItalic:     false,
            hideEmpty:   false,
            showXTitle:  false,
            xTitle:      "",
            showYTitle:  false,
            yTitle:      ""
        },
        panelStyle: {
            showBackground: false,
            bgColor:        "#F8F8F8",
            bgOpacity:      30
        },
        panelLayout: {
            orientation: "vertical",
            columns: 0,
            minPanelWidth: 120,
            minPanelHeight: 120,
            enableScroll:  true,
            barBorderRadius: 2
        },
        analyticalLines: {
            showAverage: false,
            showMax:     false,
            showMin:     false,
            showMedian:  false,
            showTrend:   false,
            trendColor:  "#605E5C",
            showRef:     false,
            refValue:    0,
            lineColor:   "#C96442",
            lineStyle:   "dashed",
            showLabel:   true,
            labelSize:   9,
            showBand:    false,
            bandMin:     0,
            bandMax:     0,
            bandColor:   "#C96442",
            bandOpacity: 15
        },
        legend: {
            show: false,
            position: "bottom",
            textColor: "#444444"
        },
        accessibility: {
            highContrastMode: false
        },
        style: {
            template: "clean",
            guide: true
        }
    };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
        this.licenseManager = options.host.licenseManager;
        this.colorPalette = options.host.colorPalette;
        this.localization = options.host.createLocalizationManager();
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipServiceWrapper = createTooltipServiceWrapper(options.host.tooltipService, options.element);

        this.svg = d3.select(this.target)
            .append("svg")
            .classed("bar-variation-chart", true)
            .style("overflow", "visible");

        this.legendGroup  = this.svg.append("g").classed("legend-group",   true);
        this.chartGroup   = this.svg.append("g").classed("chart-group",    true);
        this.watermarkGroup= this.svg.append("g").classed("watermark-group",true);
        this.messageGroup = this.svg.append("g").classed("message-group",  true);

        this.subSelectionHelper = HtmlSubSelectionHelper.createHtmlSubselectionHelper({
            hostElement: options.element,
            subSelectionService: options.host.subSelectionService,
            selectionIdCallback: () => undefined,
        });
        this.visualOnObjectFormatting = {
            getSubSelectionStyles: (subs) => this.getSubSelectionStyles(subs),
            getSubSelectionShortcuts: (subs) => this.getSubSelectionShortcuts(subs),
            getSubSelectables: (filter) => this.subSelectionHelper.getAllSubSelectables(filter),
        };

        // Context menu + background click — registered ONCE on SVG root.
        const selMgr = this.selectionManager;
        this.svg.on("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if (!this.interactive()) { return; }
            const target = event.target as SVGElement;
            const datum  = d3.select(target).datum() as BarDatum;
            const sid    = datum && datum.selectionId ? datum.selectionId : null;
            selMgr.showContextMenu(sid, { x: event.clientX, y: event.clientY });
        });
        // Click on background clears selection
        this.svg.on("click", () => {
            if (!this.interactive()) { return; }
            this.restoredIds = [];
            selMgr.clear().then(() => this.paintSelection());
        });
        // Marcadores y selección hecha desde fuera: solo repintar. Nunca persistProperties aquí.
        selMgr.registerOnSelectCallback((ids: powerbi.visuals.ISelectionId[]) => {
            this.restoredIds = ids || [];
            this.paintSelection();
        });
    }

    /**
     * update() es sincrona. Antes hacia await de getAvailableServicePlans() en cada
     * update, entre renderingStarted y el dibujado: la licencia estaba en el camino
     * critico del render. Ahora se pide una vez, en diferido, y repinta solo si pasa
     * de Free a Pro.
     */
    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);
        this.lastOptions = options;
        this.formatMode = !!(options as any).formatMode;
        this.subSelectionHelper.setFormatMode(this.formatMode);
        try {
            this.dataView = options.dataViews[0];
            if (!this.dataView || !this.dataView.categorical ||
                !this.dataView.categorical.categories ||
                !this.dataView.categorical.values) {
                this.clear();
                this.renderLanding(options.viewport.width, options.viewport.height);
                this.events.renderingFinished(options);
                return;
            }
            this.updateSettings(this.dataView);
            this.render(options);
            this.paintSelection();
            this.markSubSelectables();
            if (this.formatMode) {
                this.subSelectionHelper.updateOutlinesFromSubSelections((options as any).subSelections ?? [], true);
            }
            this.events.renderingFinished(options);
        } catch (e) {
            this.events.renderingFailed(options, String(e));
            console.error(e);
        }
        // Fuera del try: un fallo de licencia nunca convierte un render correcto en renderingFailed.
        this.requestLicenseDeferred();
        this.syncLicenseNotification();
    }

    /** Pide la licencia una vez, fuera del camino critico. Si no resuelve, se queda en Free. */
    private requestLicenseDeferred(): void {
        if (this.licenseRequested || this.isPro) return;
        this.licenseRequested = true;
        setTimeout(() => {
            try {
                const lm = this.licenseManager as any;
                if (!lm) { this.licenseEnvUnsupported = true; this.licenseResolved = true; return; }
                // getAvailableServicePlans devuelve IPromise2: se consume con then(ok, err).
                lm.getAvailableServicePlans().then(
                    (result: any) => {
                        // Publish to Web, embedding, exportacion: un cliente Pro se lee como
                        // Free, asi que ahi no se le pide comprar lo que puede tener ya.
                        if (result?.isLicenseUnsupportedEnv === true || result?.isLicenseInfoAvailable === false) {
                            this.licenseEnvUnsupported = true;
                        }
                        this.licenseResolved = true;
                        const plans: any[] = result?.plans ?? [];
                        // Warning es periodo de gracia por un problema de pago: sigue siendo usable.
                        this.applyLicense(plans.some(p =>
                            PLAN_IDS.some(id => matchesPlan(p.spIdentifier, id)) &&
                            (p.state === STATE_ACTIVE || p.state === STATE_WARNING)));
                        // Free confirmado: repinta para pasar a la vista previa Pro si toca.
                        if (!this.isPro) this.repaint();
                        this.syncLicenseNotification();
                    },
                    () => { this.licenseEnvUnsupported = true; this.licenseResolved = true; });
            } catch (_) {
                this.licenseEnvUnsupported = true;
                this.licenseResolved = true;
            }
        }, 0);
    }

    /** Solo actua de Free a Pro: repinta con las ultimas options. */
    private applyLicense(isPro: boolean): void {
        if (!isPro || this.isPro) return;
        this.isPro = true;
        this.repaint();
    }

    /** Repinta con las ultimas options fuera de update(): no emite rendering events. */
    private repaint(): void {
        const o = this.lastOptions;
        const dv = this.dataView;
        if (!o || !dv?.categorical?.categories || !dv.categorical.values) return;
        try {
            this.updateSettings(dv);
            this.render(o);
            this.paintSelection();
        } catch (_) { /* lo ya pintado se queda */ }
    }

    /**
     * La ruta de compra la pone Power BI, nunca el visual. Antes el grafico escribia
     * "Pro: +N more panels" y los ajustes Pro se apagaban en silencio: no habia
     * ningun sitio donde comprar.
     */
    private cancelLicenseIcon(): void {
        if (this.licenseIconTimer !== null) {
            window.clearTimeout(this.licenseIconTimer);
            this.licenseIconTimer = null;
        }
    }

    private syncLicenseNotification(): void {
        const lm = this.licenseManager as any;
        if (!lm) return;
        try {
            if (this.isPro || this.attemptedPro.length === 0) {
                this.cancelLicenseIcon();
                if (this.noticeShown) {
                    this.noticeShown = false;
                    this.notifiedPro = [];
                    lm.clearLicenseNotification?.();
                }
                return;
            }
            // Hasta que la licencia responde no se sabe si el usuario paga.
            if (!this.licenseResolved || this.licenseEnvUnsupported) return;
            // Solo las funciones recién activadas merecen un banner; quitar una no vuelve a avisar.
            const added = this.attemptedPro.filter(a => this.notifiedPro.indexOf(a) === -1);
            this.notifiedPro = this.attemptedPro.slice();
            if (added.length === 0) return;
            this.noticeShown = true;
            const msg = this.tr("UI_NoticePreview", "Bar Chart with Variation %: {0} — part of the Pro plan, shown as a watermarked preview.")
                .replace("{0}", added.join(", "));
            // Power BI muestra una notificación a la vez: se retira la anterior, se lanza el banner
            // con la función concreta (unos 10 s) y, al terminar, la barra de Upgrade persistente.
            const show = () => {
                try {
                    lm.notifyFeatureBlocked?.(msg.slice(0, 500));
                    this.cancelLicenseIcon();
                    this.licenseIconTimer = window.setTimeout(() => {
                        this.licenseIconTimer = null;
                        if (this.isPro || this.attemptedPro.length === 0) return;
                        try { lm.notifyLicenseRequired?.(0 /* LicenseNotificationType.General */); } catch (_) { /* nunca rompe */ }
                    }, 10500);
                } catch (_) { /* nunca rompe el render */ }
            };
            const cleared = lm.clearLicenseNotification?.();
            if (cleared && typeof cleared.then === "function") {
                cleared.then(show, show);
            } else {
                show();
            }
        } catch (_) { /* la notificacion nunca rompe el render */ }
    }

    private updateSettings(dataView: DataView) {
        const objects = dataView.metadata.objects;
        const tplName = String((objects as any)?.style?.template || "clean");
        const tpl = TEMPLATES[tplName] || {};
        this.template = tplName;
        this.guideOn = (objects as any)?.style?.guide !== false;
        const nombreDe = new Map<any, string>();
        const getValue = <T>(obj: any, prop: string, def: T): T => {
            if (obj && obj[prop] !== undefined) {
                const val = obj[prop];
                if (typeof val === "object" && val.solid) return val.solid.color;
                return val;
            }
            const t = tpl[nombreDe.get(obj) || ""]?.[prop];
            return (t !== undefined ? t : def) as T;
        };
        const bS = (objects?.barSettings ?? {}) as any;
        nombreDe.set(bS, "barSettings");
        // Si el usuario ha puesto un color, sea cual sea, MANDA.
        //
        // Antes se comparaba el valor con el azul por defecto para decidir si estaba
        // configurado, asi que elegir ese azul exacto —que es justo el que el panel
        // ofrece— se descartaba y se usaba el color del tema del informe. Con un tema
        // rojo, todas las barras salian rojas y parecia que el ajuste no funcionaba.
        // Un valor legitimo nunca puede servir de centinela: lo que hay que mirar es si
        // la propiedad EXISTE en metadata.objects.
        this.barColorSetByUser = (bS as any)?.barColor !== undefined;
        // Sin color elegido, los del tema del informe (como los nativos): el primer color de datos para la barra y los
        // colores "malo"/"bueno" del tema si los define. El panel enseña estos mismos, así que no dice una cosa y pinta otra.
        const pal: any = this.colorPalette;
        const tema = (f: () => string | undefined, def: string) => { try { return f() || def; } catch (_) { return def; } };
        const temaBarra = tema(() => pal?.getColor?.("tcviz-bar")?.value, "#378ADD");
        const temaMalo  = tema(() => pal?.negative?.value, "#E24B4A");
        const temaBueno = tema(() => pal?.positive?.value, "#00BFA5");
        this.settings.barSettings.barColor       = getValue(bS, "barColor",       temaBarra);
        this.settings.barSettings.negativeColor  = getValue(bS, "negativeColor",  temaMalo);
        this.settings.barSettings.barOpacity     = getValue(bS, "barOpacity",     100);
        this.settings.barSettings.axisTextColor  = getValue(bS, "axisTextColor",  "#666666");
        this.settings.barSettings.borderColor    = getValue(bS, "borderColor",    "#FFFFFF");
        this.settings.barSettings.borderWidth    = getValue(bS, "borderWidth",    0);
        this.settings.barSettings.connectorColor = getValue(bS, "connectorColor", "#333333");

        const cmp = (objects?.comparison ?? {}) as any;

        nombreDe.set(cmp, "comparison");
        this.settings.comparison.compareTo    = getValue(cmp, "compareTo",    "previous");
        this.settings.comparison.varianceMode = getValue(cmp, "varianceMode", "relative");
        this.settings.comparison.showMarker   = getValue(cmp, "showMarker",   true);
        this.settings.comparison.markerColor  = getValue(cmp, "markerColor",  "#333333");

        const vL = (objects?.variationLabels ?? {}) as any;

        nombreDe.set(vL, "variationLabels");
        this.settings.variationLabels.show           = getValue(vL, "show",           true);
        this.settings.variationLabels.fontSize        = getValue(vL, "fontSize",        11);
        this.settings.variationLabels.positiveColor   = getValue(vL, "positiveColor",   temaBueno);
        this.settings.variationLabels.negativeColor   = getValue(vL, "negativeColor",   temaMalo);
        this.settings.variationLabels.decimalPlaces   = getValue(vL, "decimalPlaces",   1);
        this.settings.variationLabels.showArrows      = getValue(vL, "showArrows",      true);
        this.settings.variationLabels.showConnectors  = getValue(vL, "showConnectors",  true);

        const vLbl = (objects?.valueLabels ?? {}) as any;

        nombreDe.set(vLbl, "valueLabels");
        this.settings.valueLabels.show               = getValue(vLbl, "show",               false);
        this.settings.valueLabels.color              = getValue(vLbl, "color",              "#333333");
        this.settings.valueLabels.fontSize           = getValue(vLbl, "fontSize",           10);
        this.settings.valueLabels.displayUnits       = getValue(vLbl, "displayUnits",       0);
        this.settings.valueLabels.valueDecimalPlaces = getValue(vLbl, "valueDecimalPlaces", 1);

        const pT = (objects?.panelTitle ?? {}) as any;

        nombreDe.set(pT, "panelTitle");
        this.settings.panelTitle.show           = getValue(pT, "show",           true);
        this.settings.panelTitle.position       = getValue(pT, "position",       "top");
        this.settings.panelTitle.fontSize       = getValue(pT, "fontSize",       11);
        this.settings.panelTitle.titleStyle      = getValue(pT, "titleStyle",      "line");
        this.settings.panelTitle.backgroundColor = getValue(pT, "backgroundColor", "#F2F4F7");
        this.settings.panelTitle.useSeriesColor = getValue(pT, "useSeriesColor", true);
        this.settings.panelTitle.customColor    = getValue(pT, "customColor",    "#333333");

        const ax = (objects?.axisSettings ?? {}) as any;

        nombreDe.set(ax, "axisSettings");
        this.settings.axisSettings.sortOrder   = getValue(ax, "sortOrder",   "auto");
        this.settings.axisSettings.showXLabels = getValue(ax, "showXLabels", true);
        this.settings.axisSettings.xLabelAngle = getValue(ax, "xLabelAngle", "auto");
        this.settings.axisSettings.showYLabels = getValue(ax, "showYLabels", true);
        this.settings.axisSettings.xFontSize   = getValue(ax, "xFontSize",   9);
        this.settings.axisSettings.yFontSize   = getValue(ax, "yFontSize",   9);
        // Sin color propio, cada eje sigue el "Color del texto de los ejes" de siempre: los informes no cambian.
        this.settings.axisSettings.xColor      = getValue(ax, "xColor",      this.settings.barSettings.axisTextColor);
        this.settings.axisSettings.yColor      = getValue(ax, "yColor",      this.settings.barSettings.axisTextColor);
        this.settings.axisSettings.xBold       = getValue(ax, "xBold",       false);
        this.settings.axisSettings.yBold       = getValue(ax, "yBold",       false);
        this.settings.axisSettings.xItalic     = getValue(ax, "xItalic",     false);
        this.settings.axisSettings.yItalic     = getValue(ax, "yItalic",     false);
        this.settings.axisSettings.hideEmpty   = getValue(ax, "hideEmpty",   false);
        this.settings.axisSettings.showXTitle  = getValue(ax, "showXTitle",  false);
        this.settings.axisSettings.xTitle      = getValue(ax, "xTitle",      "");
        this.settings.axisSettings.showYTitle  = getValue(ax, "showYTitle",  false);
        this.settings.axisSettings.yTitle      = getValue(ax, "yTitle",      "");

        const ps = (objects?.panelStyle ?? {}) as any;

        nombreDe.set(ps, "panelStyle");
        this.settings.panelStyle.showBackground = getValue(ps, "showBackground", false);
        this.settings.panelStyle.bgColor        = getValue(ps, "bgColor",        "#F8F8F8");
        this.settings.panelStyle.bgOpacity      = getValue(ps, "bgOpacity",      30);

        const pl = (objects?.panelLayout ?? {}) as any;

        nombreDe.set(pl, "panelLayout");
        this.settings.panelLayout.orientation    = getValue(pl, "orientation",    "vertical");
        this.settings.panelLayout.columns        = getValue(pl, "columns",        0);
        this.settings.panelLayout.minPanelWidth  = getValue(pl, "minPanelWidth",  120);
        this.settings.panelLayout.enableScroll   = getValue(pl, "enableScroll",   true);
        this.settings.panelLayout.minPanelHeight = getValue(pl, "minPanelHeight", 120);
        this.settings.panelLayout.barBorderRadius = getValue(pl, "barBorderRadius", 2);

        const al = (objects?.analyticalLines ?? {}) as any;

        nombreDe.set(al, "analyticalLines");
        this.settings.analyticalLines.showAverage = getValue(al, "showAverage", false);
        this.settings.analyticalLines.showMax     = getValue(al, "showMax",     false);
        this.settings.analyticalLines.showMin     = getValue(al, "showMin",     false);
        this.settings.analyticalLines.showMedian  = getValue(al, "showMedian",  false);
        this.settings.analyticalLines.showTrend   = getValue(al, "showTrend",   false);
        this.settings.analyticalLines.trendColor  = getValue(al, "trendColor",  "#605E5C");
        this.settings.analyticalLines.showRef     = getValue(al, "showRef",     false);
        this.settings.analyticalLines.refValue    = getValue(al, "refValue",    0);
        this.settings.analyticalLines.lineColor   = getValue(al, "lineColor",   "#C96442");
        this.settings.analyticalLines.lineStyle   = getValue(al, "lineStyle",   "dashed");
        this.settings.analyticalLines.showLabel   = getValue(al, "showLabel",   true);
        this.settings.analyticalLines.labelSize   = getValue(al, "labelSize",   9);
        this.settings.analyticalLines.showBand    = getValue(al, "showBand",    false);
        this.settings.analyticalLines.bandMin     = getValue(al, "bandMin",     0);
        this.settings.analyticalLines.bandMax     = getValue(al, "bandMax",     0);
        this.settings.analyticalLines.bandColor   = getValue(al, "bandColor",   "#C96442");
        this.settings.analyticalLines.bandOpacity = getValue(al, "bandOpacity", 15);

        const leg = (objects?.legend ?? {}) as any;

        nombreDe.set(leg, "legend");
        this.settings.legend.show     = getValue(leg, "show",     false);
        this.settings.legend.position = getValue(leg, "position", "bottom");
        this.settings.legend.textColor = getValue(leg, "textColor", "#444444");

        const acc = (objects?.accessibility ?? {}) as any;

        nombreDe.set(acc, "accessibility");
        this.settings.accessibility.highContrastMode = getValue(acc, "highContrastMode", false);
        this.settings.style = { template: tplName, guide: this.guideOn };

        // Copia de lo que eligio el usuario, antes del gating del tier gratuito: es lo
        // que ve el panel de formato.
        this.rawSettings = JSON.parse(JSON.stringify(this.settings));

        this.applyHighContrast();
    }

    /**
     * Texto localizado. Si la clave no esta en el resjson del idioma, Power BI devuelve
     * el propio nombre de la clave, asi que se compara y se cae al ingles.
     */
    private tr(key: string, fallback: string): string {
        // Primero la tabla del bundle (src/strings.ts): Power BI Desktop solo traduce con getDisplayName las claves
        // declaradas en capabilities.json, y los textos propios del visual no lo están.
        const own = this.stringsFor()?.[key];
        if (own) { return own; }
        try {
            const s = this.localization?.getDisplayName(key);
            return s && s !== key ? s : fallback;
        } catch (_) {
            return fallback;
        }
    }

    private stringsFor(): Record<string, string> | undefined {
        const loc = String(this.host?.locale || "");
        if (!loc || /^en/i.test(loc)) { return undefined; }
        if (STRINGS[loc]) { return STRINGS[loc]; }
        const lang = loc.split("-")[0].toLowerCase();
        const k = Object.keys(STRINGS).sort().find(x => x.toLowerCase().startsWith(lang + "-"));
        return k ? STRINGS[k] : undefined;
    }

    /** Nombre visible de una medida de referencia, en el idioma del informe. */
    private refLabel(role: string): string {
        const en = REF_LABELS[role];
        if (!en) { return this.tr("Visual_Reference", "Reference"); }
        const keys: Record<string, string> = {
            previous:     "Visual_Enum_PreviousBar",
            previousYear: "Visual_Enum_PreviousYear",
            plan:         "Visual_Enum_Plan",
            forecast:     "Visual_Enum_Forecast"
        };
        return this.tr(keys[role], en);
    }

    /**
     * Power BI pone allowInteractions a false cuando el autor apaga las interacciones del
     * visual. Indefinido significa permitido: solo false bloquea.
     */
    private interactive(): boolean {
        if (this.formatMode) { return false; }
        // hostCapabilities es donde la API 5.x lo pone; host.allowInteractions solo existía en versiones antiguas.
        const h: any = this.host;
        return (h?.hostCapabilities?.allowInteractions ?? h?.allowInteractions) !== false;
    }

    /**
     * Margenes y elementos que dependen solo del tamano del lienzo. El reparto vertical
     * (titulo, etiquetas de variacion, etiquetas del eje X) se hace mas abajo, cuando se
     * conoce el alto real que piden las etiquetas rotadas.
     *
     * Lo que el usuario ha activado es el MAXIMO, no una obligacion: si no cabe, se quita.
     * Sus ajustes no se tocan, solo el render de esta pasada; el panel de formato lee
     * rawSettings y sigue mostrando lo que eligio.
     */
    private layoutFor(
        width: number, height: number, ncols: number, nrows: number,
        anchoEtiquetaY: number,
        quiere: { yLabels: boolean; legend: boolean; legendPos: string; xTitleH?: number; yTitleW?: number }
    ) {
        // La leyenda es lo primero que sobra: repite lo que ya dice el color de la barra.
        // 24 px sobre un visual de 150 es el 16% del alto para dos palabras.
        const legend = quiere.legend && LEGEND_H <= height * 0.15;
        const legendH = legend ? LEGEND_H : 0;

        const oMT = 8 + (legend && quiere.legendPos === "top"    ? legendH : 0);
        // Títulos de eje: solo si queda sitio para el gráfico (por debajo de ~150 px se quitan, no se encogen).
        const xTitleH = quiere.xTitleH && height >= 150 ? quiere.xTitleH : 0;
        const yTitleW = quiere.yTitleW && width >= 200 ? quiere.yTitleW : 0;
        const oMB = 8 + (legend && quiere.legendPos === "bottom" ? legendH : 0) + xTitleH;
        const oMR = 8;

        // El eje Y se MIDE. 48 px fijos esta bien a 600 de ancho y es absurdo a 200,
        // donde se comia una cuarta parte del grafico.
        const pedido = Math.ceil(anchoEtiquetaY + 10);
        const anchoUtil = width - 8 - oMR - yTitleW;
        const yLabels = quiere.yLabels && anchoUtil / ncols >= 90 && pedido <= width * 0.25;
        const oML = (yLabels ? Math.min(pedido, Math.floor(width * 0.25)) : 8) + yTitleW;

        const cellW = Math.max((width - oML - oMR) / ncols, 1);
        const cellH = Math.max((height - oMT - oMB) / nrows, 1);
        const cellPad = (cellW < 120 || cellH < 100) ? 4 : 10;

        return { legend, legendH, yLabels, oML, oMT, oMR, oMB, cellPad, xTitleH, yTitleW };
    }

    /** Alto contraste real: el que activa Windows, no el interruptor del panel. */
    private hcActive(): boolean {
        return !!(this.colorPalette as any)?.isHighContrast;
    }

    /**
     * Con el tema de alto contraste, Power BI solo garantiza cuatro colores y exige
     * usarlos: cualquier otro puede quedar invisible. Se sobreescriben los ajustes DESPUES
     * de copiar rawSettings, asi que el panel sigue mostrando lo que eligio el usuario y
     * sus colores vuelven intactos en cuanto se desactiva el tema.
     */
    private applyHighContrast(): void {
        if (!this.hcActive()) { return; }
        const pal: any = this.colorPalette;
        const fg  = pal.foreground?.value         || "#000000";
        const bg  = pal.background?.value         || "#FFFFFF";
        const sel = pal.foregroundSelected?.value || fg;

        const b = this.settings.barSettings;
        // Relleno del fondo y contorno del primer plano: es la receta de Microsoft para
        // formas solidas, y es la unica que sobrevive a los dos temas (claro y oscuro).
        b.barColor      = bg;
        b.negativeColor = bg;
        b.borderColor   = fg;
        b.borderWidth   = Math.max(b.borderWidth, 2);
        b.barOpacity    = 100;
        b.axisTextColor = fg;
        this.settings.axisSettings.xColor = fg;
        this.settings.axisSettings.yColor = fg;

        // La trama diagonal es lo unico que distingue negativo de positivo cuando ambos
        // comparten relleno y contorno.
        this.settings.accessibility.highContrastMode = true;

        this.settings.variationLabels.positiveColor = fg;
        this.settings.variationLabels.negativeColor = fg;
        this.settings.valueLabels.color             = fg;
        this.settings.panelTitle.customColor        = fg;
        this.settings.panelTitle.backgroundColor    = bg;
        this.settings.panelTitle.useSeriesColor     = false;
        this.settings.legend.textColor              = fg;
        this.settings.panelStyle.bgColor            = bg;
        this.settings.analyticalLines.lineColor     = sel;
        this.settings.analyticalLines.bandColor     = fg;
        this.settings.comparison.markerColor        = sel;
    }

    /** Medidas de referencia (previousYear | plan | forecast) alineadas al orden de categorias. */
    private readRefValues(cols: any[], sortIndexMap: number[]): { [role: string]: (number | null)[] } {
        const out: { [role: string]: (number | null)[] } = {};
        for (const role of REF_ROLES) {
            const col = cols.filter((c: any) => c?.source?.roles?.[role])[0];
            if (!col) { continue; }
            out[role] = sortIndexMap.map((oi: number) => col.values[oi] != null ? Number(col.values[oi]) : null);
        }
        return out;
    }

    private render(options: VisualUpdateOptions) {
        this.clear();
        const categorical = this.dataView.categorical;
        // Con una jerarquía expandida ("Expandir todo") llega una columna por nivel: la barra es la combinación.
        const catCols     = categorical.categories.filter((c: any) => c?.source?.roles?.category);
        const categories  = catCols.length ? catCols[catCols.length - 1] : categorical.categories[0];
        const idOfRow = (b: powerbi.visuals.ISelectionIdBuilder, i: number) => {
            for (const c of (catCols.length ? catCols : [categories])) { b = b.withCategory(c, i); }
            return b;
        };
        const values      = categorical.values;
        const host        = this.host;
        const width       = options.viewport.width;
        const height      = options.viewport.height;

        this.svg
            .attr("width", width)
            .attr("height", height)
            .attr("role", "img")
            .attr("aria-label", this.tr("UI_AriaChart", "Bar Chart with Variation %") + " — " + (categories?.source?.displayName || ""));

        const hasHighlights     = values[0]?.highlights != null;
        // Las categorias se formatean con el format string de su propia columna. Sin esto,
        // una columna de fecha llega como objeto Date y toString() devuelve la cadena
        // completa de JavaScript ("Mon Jan 01 2026 00:00:00 GMT+0100 (...)"): 40 caracteres
        // por etiqueta que se pisan entre si y hacen ilegible el eje.
        const catFormatter: IValueFormatter = valueFormatter.create({
            format: categories.source.format,
            cultureSelector: host.locale
        });
        const fmtCat = (col: any, v: any) => {
            if (v === null || v === undefined) { return ""; }
            if (!(v instanceof Date || col.source.format)) { return v.toString(); }
            return valueFormatter.create({ format: col.source.format, cultureSelector: host.locale }).format(v);
        };
        let catValues           = categories.values.map((v, i) => catCols.length > 1
            ? catCols.map((c: any) => fmtCat(c, c.values[i])).join(" · ")
            : (v === null || v === undefined ? "" : (v instanceof Date || categories.source.format ? catFormatter.format(v) : v.toString())));

        // ── Sort order ─────────────────────────────────────────────────────
        // El orden es gratuito: ya funcionaba sin licencia en la 1.9.0.0 publicada, y
        // las directrices de Microsoft no permiten recortar funcionalidad gratuita.
        const sortOrder = this.settings.axisSettings.sortOrder;
        // sortIndexMap[newIndex] = originalIndex — keeps data aligned with labels
        let sortIndexMap: number[] = catValues.map((_, i) => i);
        // Un eje de fechas o números (años, meses, fechas) es una serie temporal: la variación se lee de izquierda
        // a derecha, así que en "Auto" va en orden cronológico. Sin esto, Power BI lo manda ordenado por la medida
        // de mayor a menor y las variaciones salían al revés (2024, 2023, 2022...). Un eje de texto conserva el
        // orden de Power BI (el del menú "Ordenar eje" del visual).
        const rawCat: any[] = categories.values as any[];
        const tipo: any = (categories.source as any)?.type || {};
        const temporal = !!(tipo.dateTime || tipo.numeric || tipo.integer) || rawCat.every(v => v == null || v instanceof Date || typeof v === "number");
        const valorDe = (i: number): number => { const v = rawCat[i]; return v instanceof Date ? v.getTime() : Number(v); };
        const porValor = (a: number, b: number) => temporal
            ? (valorDe(a) - valorDe(b)) || 0
            : catValues[a].localeCompare(catValues[b], undefined, { numeric: true });
        const ordenEje = sortOrder === "auto" ? (temporal ? "asc" : "auto") : sortOrder;
        if (ordenEje !== "auto") {
            sortIndexMap.sort(porValor);
            if (ordenEje === "desc") sortIndexMap.reverse();
            catValues = sortIndexMap.map(i => catValues[i]);
        }
        const seriesList: SeriesData[] = [];
        const grouped           = values.grouped ? values.grouped() : null;
        const barColorSetting   = this.settings.barSettings.barColor;
        const negColor          = this.settings.barSettings.negativeColor;
        const barOpacity        = this.settings.barSettings.barOpacity / 100;

        // ── Accessibility: SVG defs for stripe pattern on negative bars ─────
        const patternId = "tcviz-neg-stripe";
        const defs = this.svg.selectAll<SVGDefsElement, unknown>("defs").data([null]).join("defs");
        defs.selectAll(`#${patternId}`).remove();
        if (this.settings.accessibility.highContrastMode) {
            const pat = defs.append("pattern")
                .attr("id", patternId)
                .attr("patternUnits", "userSpaceOnUse")
                .attr("width", 6).attr("height", 6)
                .attr("patternTransform", "rotate(45)");
            const hcFg = this.hcActive()
                ? ((this.colorPalette as any).foreground?.value || "#000000")
                : null;
            pat.append("rect").attr("width", 3).attr("height", 6).attr("fill", negColor);
            pat.append("rect").attr("x", 3).attr("width", 3).attr("height", 6)
                .attr("fill", hcFg || "#ffffff").attr("opacity", hcFg ? 1 : 0.45);
        }
        const negFill = this.settings.accessibility.highContrastMode
            ? `url(#${patternId})`
            : negColor;

        // ── Build series list ──────────────────────────────────────────────
        if (grouped && grouped.length > 0) {
            for (let i = 0; i < grouped.length; i++) {
                const group = grouped[i];
                // Use Small Multiple value if present, otherwise fall back to measure name
                // La columna de barras es la del rol "measure": con los pozos de referencia
                // enlazados, group.values[0] ya no tiene por que serlo.
                const mCol: any = (group.values as any[]).filter((gv: any) => gv?.source?.roles?.measure)[0]
                    || group.values[0];
                const name  = (group.name != null && group.name.toString().trim() !== "")
                    ? group.name.toString()
                    : (mCol?.source?.displayName || values[0]?.source?.displayName || "");
                const svRaw = mCol.values.map(v => Number(v) || 0);
                const shRaw = (mCol.highlights || []).map(v => v != null ? Number(v) : null);
                const sv    = sortIndexMap.map(i => svRaw[i]);
                const sh    = sortIndexMap.map(i => shRaw[i]);
                const sid   = host.createSelectionIdBuilder().withSeries(values, group).createSelectionId();
                const bsids = sortIndexMap.map(origCi =>
                    idOfRow(host.createSelectionIdBuilder().withSeries(values, group), origCi).createSelectionId()
                );
                let color = barColorSetting;
                const objs: any = group.objects;
                if (objs?.colorSelector?.fill && !this.hcActive()) {
                    color = objs.colorSelector.fill.solid.color;
                }
                // Sin configurar se usa el color por defecto declarado, no el del tema.
                //
                // Antes caia en colorPalette.getColor(), asi que con un tema rojo las
                // barras salian rojas mientras el panel mostraba el azul por defecto: el
                // panel y el lienzo decian cosas distintas, y eso se lee como que el
                // ajuste no funciona. Respetar el tema esta bien, pero no a costa de que
                // el selector mienta sobre lo que pinta.
                // CF colors: per-bar — check dataColors (fx button) then series-level objects
                const cfColors: (string | null)[] = sortIndexMap.map(origCi => {
                    const catObjs: any = categories.objects?.[origCi];
                    const grpObjs: any = mCol.objects?.[origCi];
                    return catObjs?.dataColors?.fill?.solid?.color
                        ?? grpObjs?.barSettings?.barColor?.solid?.color
                        ?? catObjs?.barSettings?.barColor?.solid?.color
                        ?? null;
                });
                // Extra tooltip fields (role "tooltips")
                const tooltipFields: TooltipField[] = group.values
                    .filter((gv: any) => gv.source?.roles?.tooltips)
                    .map((gv: any) => ({
                        name:   gv.source.displayName || "",
                        values: sortIndexMap.map((oi: number) => gv.values[oi] != null ? Number(gv.values[oi]) : null),
                        format: gv.source.format || ""
                    }));
                const refValues = this.readRefValues(group.values as any[], sortIndexMap);
                seriesList.push({ name, values: sv, highlights: sh, color, cfColors, refValues, selectionId: sid, barSelectionIds: bsids, tooltipFields });
            }
        } else {
            // Solo las columnas del rol "measure" son barras. Las de referencia y las de
            // tooltips comparten el pozo de valores y no deben dibujarse como series.
            const barCols: any[] = (values as any[]).filter((v: any) => v?.source?.roles?.measure);
            const cols = barCols.length > 0 ? barCols : (values as any[]);
            for (let i = 0; i < cols.length; i++) {
                const val  = cols[i];
                const name = val.source.displayName || "Measure";
                const svRaw = val.values.map(v => Number(v) || 0);
                const shRaw = (val.highlights || []).map(v => v != null ? Number(v) : null);
                const sv    = sortIndexMap.map(i => svRaw[i]);
                const sh    = sortIndexMap.map(i => shRaw[i]);
                const sid  = host.createSelectionIdBuilder().withMeasure(val.source.queryName).createSelectionId();
                const bsids = sortIndexMap.map(origCi =>
                    idOfRow(host.createSelectionIdBuilder(), origCi).createSelectionId()
                );
                let color = barColorSetting;
                const objs: any = val.objects;
                if (objs?.colorSelector?.fill && !this.hcActive()) {
                    color = objs.colorSelector.fill.solid.color;
                }
                // Sin configurar se usa el color por defecto declarado, no el del tema.
                //
                // Antes caia en colorPalette.getColor(), asi que con un tema rojo las
                // barras salian rojas mientras el panel mostraba el azul por defecto: el
                // panel y el lienzo decian cosas distintas, y eso se lee como que el
                // ajuste no funciona. Respetar el tema esta bien, pero no a costa de que
                // el selector mienta sobre lo que pinta.
                // CF colors: per-bar — check dataColors (fx button)
                const cfColors: (string | null)[] = sortIndexMap.map(origCi => {
                    const catObjs: any = categories.objects?.[origCi];
                    return catObjs?.dataColors?.fill?.solid?.color ?? null;
                });
                // Tooltip fields: other measures bound to "tooltips" role
                const tooltipFields: TooltipField[] = values
                    .filter((v2: any) => v2.source?.roles?.tooltips)
                    .map((v2: any) => ({
                        name:   v2.source.displayName || "",
                        values: sortIndexMap.map((oi: number) => v2.values[oi] != null ? Number(v2.values[oi]) : null),
                        format: v2.source.format || ""
                    }));
                const refValues = this.readRefValues(values as any[], sortIndexMap);
                seriesList.push({ name, values: sv, highlights: sh, color, cfColors, refValues, selectionId: sid, barSelectionIds: bsids, tooltipFields });
            }
        }

        if (seriesList.length === 0) return;

        // Categorías vacías (0 o en blanco en todos los paneles), típicamente los meses que aún no han llegado:
        // contra la barra anterior salen como una caída del -100% que no ha ocurrido. Se quitan del eje.
        if (this.settings.axisSettings.hideEmpty) {
            const keep = catValues.map((_, i) => i).filter(i => seriesList.some(sr => sr.values[i] !== 0));
            if (keep.length > 0 && keep.length < catValues.length) {
                const pick = <T>(a: T[]): T[] => (a ? keep.map(i => a[i]) : a);
                catValues = pick(catValues);
                for (const sr of seriesList) {
                    sr.values = pick(sr.values);
                    sr.highlights = pick(sr.highlights);
                    sr.cfColors = pick(sr.cfColors);
                    sr.barSelectionIds = pick(sr.barSelectionIds);
                    for (const r of Object.keys(sr.refValues)) { sr.refValues[r] = pick(sr.refValues[r]); }
                    for (const tf of sr.tooltipFields) { tf.values = pick(tf.values); }
                }
            }
        }

        // ── Free / Pro gates ───────────────────────────────────────────────
        const maxPanels = 3;
        // Vista previa Pro: Free con la licencia ya resuelta y en un entorno que puede
        // leerla. Las funciones Pro se pintan funcionando, con marca de agua, que las
        // directrices de Microsoft permiten para funciones de pago. Antes de resolver, o
        // donde la licencia no se puede leer (Publish to Web, exportacion), se pinta el
        // resultado gratuito sin marca: ahi un cliente que paga se lee como Free.
        // Solo en modo edicion (ViewMode: View=0, Edit=1, InFocusEdit=2): el autor ve lo que
        // obtendria pagando, pero un informe en lectura o publicado no usa Pro sin licencia.
        // Sin viewMode se trata como lectura.
        const viewMode  = (options as any).viewMode;
        const editing   = typeof viewMode === "number" && viewMode !== 0;
        const preview   = !this.isPro && editing && this.licenseResolved && !this.licenseEnvUnsupported;
        const isLimited = !this.isPro && !preview && seriesList.length > maxPanels;
        const visible   = isLimited ? seriesList.slice(0, maxPanels) : seriesList;

        // Lo que el usuario ha pedido y el tier gratuito no da. Se calcula antes de
        // apagarlo, para que Power BI muestre su aviso de compra.
        const lines = this.settings.analyticalLines;
        const attempted: string[] = [];
        if (seriesList.length > maxPanels) attempted.push(this.tr("UI_FeatPanels", "more than {0} panels").replace("{0}", String(maxPanels)));
        if (lines.showTrend) attempted.push(this.tr("UI_FeatTrend", "the trend line"));
        if (lines.showAverage || lines.showMax || lines.showMin || lines.showMedian || lines.showRef) attempted.push(this.tr("UI_FeatLines", "analytical lines"));
        if (lines.showBand) attempted.push(this.tr("UI_FeatBand", "the reference band"));
        if (this.settings.valueLabels.show) attempted.push(this.tr("UI_FeatValueLabels", "value labels"));
        if (seriesList.some(s => s.cfColors.some(c => c != null))) attempted.push(this.tr("UI_FeatBarColours", "per-bar colours"));
        // Los tres pozos de referencia son Pro desde 1.10.0.0.
        //
        // Hasta 1.9.3.0 eran gratuitos, con el argumento de que comparar contra una
        // referencia es el resultado correcto y no uno recortado. Sigue siendo verdad, pero
        // el Free tampoco se queda sin comparacion: compara contra la categoria anterior,
        // que es igual de correcto. Lo que se compra es la lectura de controlling — real
        // contra plan, contra presupuesto o contra el año pasado —, que es la capa de
        // analisis, no el grafico.
        let cmpRoleSel = this.settings.comparison.compareTo;
        const refBound = REF_ROLES.filter(r => seriesList.some(s => !!s.refValues[r]));
        if (refBound.length > 0) {
            attempted.push(refBound.length === 1
                ? this.tr("UI_FeatOneRef", "the {0} reference").replace("{0}", this.refLabel(refBound[0]))
                : this.tr("UI_FeatRefs", "the reference measures"));
        }
        if (this.settings.variationLabels.show && this.settings.comparison.varianceMode !== "relative") {
            attempted.push(this.tr("UI_FeatAbsolute", "absolute variance"));
        }
        this.attemptedPro = this.isPro ? [] : attempted;
        if (DEBUG_FX) {
            const c0: any = (grouped && grouped[0]) || null;
            const m0: any = c0 ? (c0.values as any[]).filter((g: any) => g?.source?.roles?.measure)[0] : (values as any[])[0];
            const col = (o: any) => o ? JSON.stringify(o).replace(/"solid":\{"color":/g, "").slice(0, 70) : "-";
            (this as any).diagFx = "DIAG meta.barSettings=" + col(this.dataView?.metadata?.objects?.barSettings) +
                " | grupo0.obj=" + col(c0?.objects) + " | medida.obj[0..1]=" + col(m0?.objects?.[0]) + "," + col(m0?.objects?.[1]) +
                " | cat.obj[0]=" + col(categories.objects?.[0]) + " | serie0.color=" + seriesList[0]?.color + " cf0=" + seriesList[0]?.cfColors?.[0];
        }

        // Pro-only features: enforce when not licensed and not in Pro preview
        if (!this.isPro && !preview) {
            // 1. Analytical lines — disabled
            this.settings.analyticalLines.showAverage = false;
            this.settings.analyticalLines.showMax     = false;
            this.settings.analyticalLines.showMin     = false;
            this.settings.analyticalLines.showMedian  = false;
            this.settings.analyticalLines.showTrend   = false;
            this.settings.analyticalLines.showRef     = false;
            this.settings.analyticalLines.showBand    = false;
            // 2. Value labels — disabled
            this.settings.valueLabels.show = false;
            // 3. Variance mode — Free se queda en relativa, que sigue siendo correcta
            this.settings.comparison.varianceMode = "relative";
            // 4. Pozos de referencia — Free compara contra la categoria anterior. Se fuerza
            //    la variable local ademas del ajuste: el dominio del eje y el marcador la
            //    leen mas abajo, y dejarla apuntando a un rol gateado pintaria la marca.
            this.settings.comparison.compareTo = "previous";
            cmpRoleSel = "previous";
        }

        // ── Shared Y scale ─────────────────────────────────────────────────
        // La referencia entra en el dominio: si el plan supera al real, su marca tiene que
        // caber en el panel o quedaria dibujada fuera del area visible.
        const refVals: number[] = cmpRoleSel === "previous" ? [] : visible.flatMap(s =>
            (s.refValues[cmpRoleSel] || []).filter(n => n != null && isFinite(Number(n))).map(n => Number(n)));
        const allVals = visible.flatMap(s => s.values).concat(refVals);
        const maxVal  = d3.max(allVals) || 0;
        const minVal  = d3.min(allVals) || 0;
        const yDomain = [Math.min(0, minVal), (maxVal || 1) * 1.15];

        const fmtUnits = this.settings.valueLabels.displayUnits === 0 ? maxVal : this.settings.valueLabels.displayUnits;
        // getFormatStringByColumn devuelve también la cadena de formato dinámica de la medida.
        let measureFormat: string | undefined;
        try { measureFormat = valueFormatter.getFormatStringByColumn(values[0].source as any) || values[0].source.format; }
        catch (_) { measureFormat = values[0].source.format; }
        const fmt: IValueFormatter = valueFormatter.create({
            format: measureFormat || "#,0",
            value:  fmtUnits,
            precision: this.settings.valueLabels.valueDecimalPlaces,
            cultureSelector: host.locale,
            displayUnitSystemType: 2
        });
        // El eje lleva el formato de la medida tal cual: los decimales de "Etiquetas de valor" no son suyos
        // (con formato #,0 salía "300.0").
        const fmtAxis: IValueFormatter = valueFormatter.create({
            format: measureFormat || "#,0",
            value: fmtUnits,
            cultureSelector: host.locale,
            displayUnitSystemType: 2
        });
        // Porcentajes con la coma o el punto del idioma del informe.
        const pctNf = (dp: number) => {
            try { return new Intl.NumberFormat(host.locale, { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
            catch (_) { return new Intl.NumberFormat(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
        };
        const pct = (n: number, dp: number) => pctNf(dp).format(n);

        // ── Grid layout ────────────────────────────────────────────────────
        const numPanels = visible.length;
        // 0 = automatico. Se acota a los paneles que hay: pedir 6 columnas para 2 paneles
        // deja cuatro huecos y encoge los dos que importan.
        const colsPedidas = Math.floor(this.settings.panelLayout.columns || 0);
        const ncols = colsPedidas > 0
            ? Math.max(1, Math.min(colsPedidas, numPanels))
            : (numPanels === 1 ? 1 : numPanels <= 4 ? 2 : Math.ceil(Math.sqrt(numPanels)));
        const nrows = Math.ceil(numPanels / ncols);

        const legendPos  = this.settings.legend.position;

        // Ancho real de la etiqueta mas larga del eje Y, con el formateador que se va a
        // usar de verdad. ~0.60 em de media en Segoe UI, igual que en el eje X.
        const yFs = this.settings.axisSettings.yFontSize;
        const anchoEtiquetaY = Math.max(
            fmt.format(yDomain[0]).length, fmt.format(yDomain[1]).length
        ) * yFs * (this.settings.axisSettings.yBold ? 0.66 : 0.60);

        // Horizontal: las categorías van a la izquierda de cada panel y el eje de valores abajo, uno por columna.
        const horiz = this.settings.panelLayout.orientation === "horizontal";
        // Títulos de eje: texto propio o, si está vacío, el nombre del campo.
        const axS = this.settings.axisSettings;
        const tituloFs = Math.max(axS.xFontSize, axS.yFontSize) + 1;
        const tituloX = axS.showXTitle ? (axS.xTitle || catCols.map((cc: any) => cc.source.displayName).join(" · ")) : "";
        const tituloY = axS.showYTitle ? (axS.yTitle || (values[0]?.source?.displayName || "")) : "";
        // En horizontal el título de las categorías va a la izquierda y el de los valores abajo.
        const tituloAbajo = horiz ? tituloY : tituloX;
        const tituloIzq   = horiz ? tituloX : tituloY;
        const L = this.layoutFor(width, height, ncols, nrows, anchoEtiquetaY, {
            yLabels:   !horiz && this.settings.axisSettings.showYLabels,
            legend:    this.settings.legend.show,
            legendPos,
            xTitleH:   tituloAbajo ? tituloFs + 6 : 0,
            yTitleW:   tituloIzq ? tituloFs + 6 : 0
        });
        if (!horiz) { this.settings.axisSettings.showYLabels = L.yLabels; }
        this.settings.legend.show              = L.legend;

        // Eje de valores horizontal: una franja abajo, bajo la última fila de paneles.
        const valAxisH = horiz && axS.showYLabels && height >= 120 ? axS.yFontSize + 8 : 0;
        const oML = L.oML, oMT = L.oMT, oMR = L.oMR, oMB = L.oMB + valAxisH;
        const legendH = L.legendH;

        // ── Scroll: expand SVG if panels would be narrower or shorter than the minimum ──
        // Antes solo habia scroll horizontal: con muchas filas los paneles se
        // aplastaban hasta 40px y se cortaban por abajo, sin barra vertical.
        const minPW  = Math.max(this.settings.panelLayout.minPanelWidth || 0, 40);
        const minPH  = Math.max(this.settings.panelLayout.minPanelHeight || 0, 40);
        const scroll = this.settings.panelLayout.enableScroll;
        const naturalCellW = (width  - oML - oMR) / ncols;
        const naturalCellH = (height - oMT - oMB) / nrows;
        const needsScrollX = scroll && naturalCellW < minPW;
        const needsScrollY = scroll && naturalCellH < minPH;
        const svgWidth     = needsScrollX ? oML + oMR + ncols * minPW : width;
        const svgHeight    = needsScrollY ? oMT + oMB + nrows * minPH : height;

        // Apply scroll style to host container and update SVG size
        this.target.style.overflowX = needsScrollX ? "auto" : "hidden";
        this.target.style.overflowY = needsScrollY ? "auto" : "hidden";
        this.svg.attr("width", svgWidth).attr("height", svgHeight);

        const gridW  = svgWidth - oML - oMR;
        const gridH  = svgHeight - oMT - oMB;
        const cellW  = Math.max(gridW  / ncols, 40);
        const cellH  = Math.max(gridH  / nrows, 40);

        const cellPad   = L.cellPad;
        let showTitle = this.settings.panelTitle.show;
        const titlePos  = this.settings.panelTitle.position; // "top" | "bottom"
        let titleH    = showTitle ? TITLE_H : 0;
        let varH      = this.settings.variationLabels.show ? VAR_H : 0;
        const innerW  = Math.max(cellW  - 2 * cellPad, 10);

        // ── Etiquetas del eje X: angulo y espacio reservado ────────────────
        // Una etiqueta rotada ocupa hacia abajo su ANCHO por el seno del angulo, no su
        // altura. Reservar 20px fijos como antes hacia que Power BI las recortara o que
        // se solaparan entre si. El ancho se estima con el tamano de fuente real
        // (~0.60 em de media en Segoe UI), no con pixeles por caracter fijos.
        const xFs        = this.settings.axisSettings.xFontSize;
        const longestCat = catValues.reduce((a, b) => (b.length > a.length ? b : a), "");
        const estLblW    = longestCat.length * xFs * (this.settings.axisSettings.xBold ? 0.66 : 0.60);
        const bandW      = innerW / Math.max(catValues.length, 1);
        let xAngle = 0;
        if (this.settings.axisSettings.showXLabels) {
            const sel = this.settings.axisSettings.xLabelAngle;
            if (sel === "auto") {
                // Se rota solo cuando de verdad no caben en horizontal.
                xAngle = estLblW > bandW * 2.4 ? -90 : (estLblW > bandW * 0.95 ? -45 : 0);
            } else {
                xAngle = Number(sel) || 0;
            }
        }
        const rise  = xAngle !== 0
            ? estLblW * Math.abs(Math.sin(xAngle * Math.PI / 180)) + 12
            : 0;
        // El tope es imprescindible: sin el, una etiqueta larga rotada se come el panel.
        let xLblH = this.settings.axisSettings.showXLabels
            ? Math.min(cellH * 0.45, Math.max(20, rise))
            : 0;

        // ── Etiquetas de variación: que no se pisen ──────────────────────
        // Con barras estrechas (varios paneles, muchas categorías) el porcentaje es más ancho que su hueco.
        // Por orden: fuera las flechas, hasta 2 px menos de letra (nunca por debajo de 8) y, si aún no cabe,
        // dos alturas alternas. Nunca se oculta ninguna: cada porcentaje es un dato.
        const vlS = this.settings.variationLabels;
        let varFs = vlS.fontSize, varArrows = vlS.showArrows, varStagger = false;
        let maxLen = 0;
        if (vlS.show) {
            const cmpR = this.settings.comparison.compareTo, modeV = this.settings.comparison.varianceMode;
            for (const sr of visible) {
                const ref = cmpR !== "previous" ? sr.refValues[cmpR] : undefined;
                for (let i = ref ? 0 : 1; i < sr.values.length; i++) {
                    const base = ref ? Number(ref[i]) : sr.values[i - 1];
                    if (!base || !isFinite(base)) { continue; }
                    const d = sr.values[i] - base;
                    const rel = pct(d / Math.abs(base) * 100, vlS.decimalPlaces).length + 2;
                    const len = modeV !== "absolute" && modeV !== "both" ? rel
                              : modeV === "absolute" ? fmtAxis.format(d).length + 1 : fmtAxis.format(d).length + rel + 3;
                    maxLen = Math.max(maxLen, len);
                }
            }
        }
        // Horizontal: las variaciones van en una columna a la derecha y las categorías a la izquierda, no encima ni debajo.
        if (horiz) { varH = 0; xLblH = 0; }
        if (varH > 0) {
            const ancho = () => (maxLen + (varArrows ? 2 : 0)) * varFs * 0.6;
            const hueco = bandW * 0.95;
            if (ancho() > hueco) { varArrows = false; }
            const minFs = Math.max(8, vlS.fontSize - 2);
            while (ancho() > hueco && varFs > minFs) { varFs--; }
            if (ancho() > hueco) { varStagger = true; varH += varFs + 3; }
        }

        // ── Reparto vertical ───────────────────────────────────────────────
        // El area de dibujo se reserva PRIMERO y los adornos se quedan con lo que sobra,
        // por orden de valor. Al reves -- que es como estaba -- en un panel de 140 px los
        // tres adornos sumaban 72 y dejaban 20 para las barras: el grafico desaparecia
        // debajo de sus propias etiquetas.
        //
        // El orden no es arbitrario. Las etiquetas de variacion son lo ultimo que se
        // quita porque son el producto: un grafico de barras sin el porcentaje es el
        // visual nativo. El titulo del panel solo vale algo cuando hay mas de un panel
        // que distinguir, asi que con uno solo cede antes que el eje X.
        const minPlot = Math.max(36, cellH * 0.45);
        let libre = cellH - 2 * cellPad - minPlot;
        const orden: string[] = numPanels > 1
            ? ["var", "title", "x"]
            : ["var", "x", "title"];
        for (const que of orden) {
            const coste = que === "var" ? varH : que === "title" ? titleH : xLblH;
            if (coste === 0) { continue; }
            if (coste <= libre) {
                libre -= coste;
            } else if (que === "var") {
                varH = 0;
            } else if (que === "title") {
                titleH = 0; showTitle = false;
            } else {
                xLblH = 0;
                this.settings.axisSettings.showXLabels = false;
            }
        }
        this.settings.variationLabels.show = (horiz || varH > 0) && this.settings.variationLabels.show;
        this.settings.panelTitle.show = showTitle;

        const innerH  = Math.max(cellH  - 2 * cellPad - titleH - varH - xLblH, 10);

        const y = d3.scaleLinear().domain(yDomain).nice().rangeRound([innerH, 0]);

        // ── Grid container: outer border + separators ──────────────────────
        const gridG = this.chartGroup.append("g").attr("transform", `translate(${oML},${oMT})`);

        gridG.append("rect")
            .attr("width", gridW).attr("height", gridH)
            .attr("fill", "none").attr("stroke", "#c9cdd4")
            .attr("stroke-width", 1.5).attr("rx", 4);

        for (let c = 1; c < ncols; c++) {
            gridG.append("line")
                .attr("x1", c * cellW).attr("y1", 0)
                .attr("x2", c * cellW).attr("y2", gridH)
                .attr("stroke", "#c9cdd4").attr("stroke-width", 1);
        }
        for (let r = 1; r < nrows; r++) {
            gridG.append("line")
                .attr("x1", 0).attr("y1", r * cellH)
                .attr("x2", gridW).attr("y2", r * cellH)
                .attr("stroke", "#c9cdd4").attr("stroke-width", 1);
        }

        // Inicio del área de barras dentro de la celda (el título solo se salta si va arriba).
        const chartTop = (showTitle && titlePos === "top") ? titleH + varH : varH;

        // ── Y axis — one per ROW on the left side of the grid ─────────────
        if (this.settings.axisSettings.showYLabels && !horiz) {
            for (let r = 0; r < nrows; r++) {
                const yOffsetForRow = oMT + r * cellH + cellPad + chartTop;
                const yAxisG = this.chartGroup.append("g").classed("y-axis", true)
                    .attr("transform", `translate(${oML - 4},${yOffsetForRow})`);
                d3.axisLeft(y).ticks(4).tickSize(0).tickFormat((d: any) => fmtAxis.format(d))(yAxisG as any);
                yAxisG.select(".domain").remove();
                yAxisG.selectAll("text")
                    .style("fill", this.settings.axisSettings.yColor)
                    .style("font-weight", this.settings.axisSettings.yBold ? "bold" : "normal")
                    .style("font-style", this.settings.axisSettings.yItalic ? "italic" : "normal")
                    .style("font-size", `${this.settings.axisSettings.yFontSize}px`);
            }
        }

        // ── Panel title settings ───────────────────────────────────────────
        const titleFontSize = this.settings.panelTitle.fontSize;
        const useSeriesColor = this.settings.panelTitle.useSeriesColor;
        const titleCustomColor = this.settings.panelTitle.customColor;

        // ── Drill availability ─────────────────────────────────────────────
        // drillableRoles["category"] lists available DrillType values (Up=1, Down=2)
        const drillableTypes: number[] = (this.dataView?.metadata as any)?.drillableRoles?.["category"] || [];
        const canDrillDown = drillableTypes.includes(2 /* DrillType.Down */);
        const canDrillUp   = drillableTypes.includes(1 /* DrillType.Up */);
        const hostRef      = this.host;

        // ── Horizontal: geometría común ───────────────────────────────────
        // Categorías a la izquierda, barras hacia la derecha, variación en una columna a la derecha. Si el panel es
        // estrecho, primero se quita la columna de variación encogiendo la letra y después las categorías.
        const hTop  = showTitle && titlePos === "top" ? titleH : 0;
        // La letra sigue al alto de la fila (mínimo 6 px). Las categorías que aun así no caben se aclaran (una de cada k);
        // los porcentajes no se quitan nunca.
        const hStep  = innerH / Math.max(catValues.length, 1);
        const hVarFs = Math.min(vlS.fontSize, Math.max(6, hStep * 0.9));
        const hCatFs = Math.min(xFs, Math.max(6, hStep * 0.9));
        const hCatEvery = hStep < hCatFs ? Math.ceil(hCatFs / hStep) : 1;
        const hVarArrows = vlS.showArrows && maxLen * hVarFs * 0.6 < innerW * 0.25;
        const hConn = vlS.showConnectors;
        let hCatW = horiz && axS.showXLabels ? Math.min(innerW * 0.4, estLblW + 8) : 0;
        let hVarW = horiz && vlS.show ? Math.min(innerW * 0.35, (maxLen + (hVarArrows ? 2 : 0)) * hVarFs * 0.6 + (hConn ? 16 : 8)) : 0;
        if (horiz && innerW - hCatW - hVarW < 40) { hVarW = 0; }
        if (horiz && innerW - hCatW - hVarW < 40) { hCatW = 0; }
        if (horiz && hVarW === 0) { this.settings.variationLabels.show = false; }
        const hPlotW = Math.max(innerW - hCatW - hVarW, 10);
        // Sin el 15% de aire de la vertical: aquí la variación tiene su propia columna. Solo las etiquetas de valor piden sitio.
        const xsH = d3.scaleLinear()
            .domain([yDomain[0], Math.max(maxVal, 0) * (this.settings.valueLabels.show ? 1.12 : 1) || 1]).nice()
            .range([0, hPlotW]);

        // Lo que comparten las dos orientaciones para cada barra: color, accesibilidad, tooltip y eventos.
        const barInfo = (series: SeriesData, ci: number, useRef: boolean, refArr: (number | null)[] | undefined, refLabel: string, dp: number) => {
            const cat    = catValues[ci];
            const v      = series.values[ci];
            const hl     = series.highlights[ci];
            const pv     = ci > 0 ? series.values[ci - 1] : null;
            const base   = useRef ? refArr[ci] : pv;
            const isNeg  = v < 0 || (base !== null && base !== undefined && v < base);
            const cfColor = (this.isPro || preview) && !this.hcActive() ? series.cfColors[ci] : null;
            const fill    = cfColor ? cfColor : (isNeg ? negFill : series.color);
            const opac   = (hasHighlights && hl == null) ? barOpacity * 0.3 : barOpacity;
            let ariaLabel = `${series.name}, ${cat}: ${fmt.format(v)}`;
            if (base !== null && base !== undefined && base !== 0) {
                const varN   = (v - base) / Math.abs(base) * 100;
                const sign   = varN >= 0 ? "+" : "";
                ariaLabel   += ", " + this.tr("UI_AriaVariation", "variation from {0}").replace("{0}", useRef ? refLabel : this.tr("UI_PreviousLower", "previous")) + `: ${sign}${pct(varN, dp)}%`;
            }
            const tooltipItems: VisualTooltipDataItem[] = [];
            tooltipItems.push({ displayName: cat, value: fmt.format(v), color: fill === `url(#${patternId})` ? negColor : fill, header: series.name });
            if (base !== null && base !== undefined) {
                tooltipItems.push({ displayName: useRef ? refLabel : this.tr("UI_Previous", "Previous"), value: fmt.format(base) });
                if (base !== 0) {
                    const absDelta = v - base;
                    const sign     = absDelta >= 0 ? "+" : "";
                    tooltipItems.push({ displayName: this.tr("UI_Change", "Change"), value: `${sign}${fmt.format(absDelta)}` });
                    tooltipItems.push({ displayName: this.tr("UI_VariationPct", "Variation %"), value: `${sign}${pct(absDelta / Math.abs(base) * 100, dp)}%`,
                        color: isNeg ? this.settings.variationLabels.negativeColor : this.settings.variationLabels.positiveColor });
                }
            }
            series.tooltipFields.forEach(tf => {
                const tv = tf.values[ci];
                if (tv !== null) {
                    const tfFmt = tf.format ? valueFormatter.create({ format: tf.format }) : valueFormatter.create({});
                    tooltipItems.push({ displayName: tf.name, value: tfFmt.format(tv) });
                }
            });
            return { cat, v, base, isNeg, fill, opac, ariaLabel, tooltipItems, selId: series.barSelectionIds[ci] };
        };
        const barEvents = (sel: any, selId: powerbi.visuals.ISelectionId) => {
            const interactive = this.interactive();
            sel.style("cursor", interactive ? "pointer" : "default")
                .on("click", (event: MouseEvent) => {
                    if (!interactive) { return; }
                    event.stopPropagation();
                    this.selectBar(selId, event.ctrlKey || event.metaKey);
                })
                .on("keydown", (event: KeyboardEvent) => {
                    if (!interactive) { return; }
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault(); event.stopPropagation();
                        this.selectBar(selId, event.ctrlKey || event.metaKey);
                    } else if (event.key === "Escape") {
                        event.preventDefault();
                        this.restoredIds = [];
                        this.selectionManager.clear().then(() => this.paintSelection());
                    }
                });
        };

        // Tendencia: recta de mínimos cuadrados del valor contra la posición en el eje, por panel.
        const tendencia = (vals: number[]): [number, number] | null => {
            const n = vals.length;
            if (n < 2) { return null; }
            const mx = (n - 1) / 2, my = d3.mean(vals) || 0;
            let sxy = 0, sxx = 0;
            vals.forEach((v, i) => { sxy += (i - mx) * (v - my); sxx += (i - mx) * (i - mx); });
            const b = sxx ? sxy / sxx : 0;
            return [my - b * mx, my + b * (n - 1 - mx)];
        };
        const trazoTendencia = (sel: Selection<SVGGElement>, x1: number, y1: number, x2: number, y2: number) => {
            sel.append("line").classed("trend-line", true)
                .attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2)
                .attr("stroke", this.settings.analyticalLines.trendColor).attr("stroke-width", 2)
                .attr("stroke-dasharray", "6,4").attr("stroke-linecap", "round")
                .attr("pointer-events", "none").attr("aria-hidden", "true");
        };

        const drawHorizontal = (series: SeriesData, pi: number, pg: Selection<SVGGElement>) => {
            const dp = vlS.decimalPlaces;
            const cmpRole  = this.settings.comparison.compareTo;
            const refArr   = cmpRole !== "previous" ? series.refValues[cmpRole] : undefined;
            const useRef   = !!refArr;
            const refLabel = this.refLabel(cmpRole);
            const ys = d3.scaleBand().domain(catValues).rangeRound([0, innerH]).paddingInner(0.35);
            const bh = ys.bandwidth();
            const ca = pg.append("g").attr("transform", `translate(${hCatW},${hTop})`);
            ca.append("line")
                .attr("x1", xsH(0)).attr("y1", 0).attr("x2", xsH(0)).attr("y2", innerH)
                .attr("stroke", this.settings.barSettings.axisTextColor)
                .attr("stroke-width", 0.5).attr("opacity", 0.5);
            const centro = (ci: number) => ys(catValues[ci]) + bh / 2;
            catValues.forEach((cat, ci) => {
                const b = barInfo(series, ci, useRef, refArr, refLabel, dp);
                const by = ys(cat);
                const bx = xsH(Math.min(0, b.v));
                const bw = Math.max(Math.abs(xsH(b.v) - xsH(0)), 1);
                const bw2 = Math.max(0, Math.min(this.settings.barSettings.borderWidth, bw / 2, bh / 2));
                const clipId = `bar-clip-${pi}-${ci}`;
                if (bw2 > 0) {
                    ca.append("clipPath").attr("id", clipId).append("rect")
                        .attr("x", bx).attr("y", by).attr("width", bw).attr("height", bh)
                        .attr("rx", this.settings.panelLayout.barBorderRadius);
                }
                const rect = ca.append("rect")
                    .datum({ selectionId: b.selId, tooltipInfo: b.tooltipItems } as BarDatum)
                    .classed("bar-rect", true)
                    .attr("x", bx).attr("y", by).attr("width", bw).attr("height", bh)
                    .attr("fill", b.fill).attr("opacity", b.opac)
                    .attr("stroke", bw2 > 0 ? this.settings.barSettings.borderColor : "none")
                    .attr("stroke-width", bw2 > 0 ? bw2 * 2 : 0)
                    .attr("clip-path", bw2 > 0 ? `url(#${clipId})` : null)
                    .attr("rx", this.settings.panelLayout.barBorderRadius)
                    .attr("role", "img").attr("aria-label", b.ariaLabel)
                    .attr("tabindex", "0").attr("data-opac", b.opac);
                barEvents(rect, b.selId);
                // Marca de referencia: vertical, al nivel del plan, cruzando la barra.
                if (useRef && this.settings.comparison.showMarker && b.base !== null && b.base !== undefined && isFinite(Number(b.base))) {
                    const rx = xsH(Number(b.base));
                    ca.append("line").classed("ref-marker", true)
                        .attr("x1", rx).attr("x2", rx).attr("y1", by - 1).attr("y2", by + bh + 1)
                        .attr("stroke", this.settings.comparison.markerColor).attr("stroke-width", 2)
                        .attr("stroke-linecap", "square").attr("pointer-events", "none").attr("aria-hidden", "true");
                }
                if (hCatW > 0 && ci % hCatEvery === 0) {
                    ca.append("text").classed("x-label", true)
                        .attr("x", -4).attr("y", by + bh / 2)
                        .attr("text-anchor", "end").attr("dominant-baseline", "central")
                        .style("font-size", `${hCatFs}px`).style("fill", axS.xColor)
                        .style("font-weight", axS.xBold ? "bold" : "normal").style("font-style", axS.xItalic ? "italic" : "normal")
                        .text(cat);
                }
                if (this.settings.valueLabels.show) {
                    const pos = b.v >= 0;
                    ca.append("text")
                        .attr("x", pos ? xsH(b.v) + 3 : xsH(b.v) - 3).attr("y", by + bh / 2)
                        .attr("text-anchor", pos ? "start" : "end").attr("dominant-baseline", "central")
                        .style("font-size", `${this.settings.valueLabels.fontSize}px`)
                        .style("fill", this.settings.valueLabels.color).style("font-weight", "bold")
                        .text(fmt.format(b.v));
                }
            });
            if (this.settings.analyticalLines.showTrend) {
                const t = tendencia(series.values);
                if (t) { trazoTendencia(ca, xsH(t[0]), centro(0), xsH(t[1]), centro(catValues.length - 1)); }
            }
            if (!(this.settings.variationLabels.show && hVarW > 0)) { return; }
            const mode = this.settings.comparison.varianceMode;
            const fmtVar = (delta: number, pc: number): string => {
                const sg  = delta >= 0 ? "+" : "";
                const rel = `${sg}${pct(pc, dp)}%`;
                const abs = `${sg}${fmtAxis.format(delta)}`;
                return mode === "absolute" ? abs : mode === "both" ? `${abs} (${rel})` : rel;
            };
            const etiqueta = (x: number, y: number, delta: number, pc: number) => {
                const isPos = delta >= 0;
                ca.append("text").classed("var-label", true)
                    .attr("x", x).attr("y", y).attr("text-anchor", "start").attr("dominant-baseline", "central")
                    .style("font-size", `${hVarFs}px`).style("font-weight", "bold")
                    .style("fill", isPos ? vlS.positiveColor : vlS.negativeColor)
                    .attr("aria-hidden", "true")
                    .text(`${hVarArrows ? (isPos ? "▲ " : "▼ ") : ""}${fmtVar(delta, pc)}`);
            };
            if (useRef) {
                // Con referencia: la desviación va en la fila de su barra.
                for (let i = 0; i < catValues.length; i++) {
                    const rv = refArr[i];
                    if (rv === null || rv === undefined || !isFinite(Number(rv)) || Number(rv) === 0) { continue; }
                    const delta = series.values[i] - Number(rv);
                    if (vlS.showConnectors) {
                        ca.append("line")
                            .attr("x1", Math.max(xsH(Math.max(0, series.values[i])), xsH(Number(rv)))).attr("y1", centro(i))
                            .attr("x2", hPlotW + 4).attr("y2", centro(i))
                            .attr("stroke", this.settings.barSettings.connectorColor)
                            .attr("stroke-width", 1).attr("stroke-dasharray", "2,2")
                            .attr("pointer-events", "none").attr("aria-hidden", "true");
                    }
                    etiqueta(hPlotW + 6, centro(i), delta, delta / Math.abs(Number(rv)) * 100);
                }
                return;
            }
            // Contra la barra anterior: entre las dos filas, con el corchete en vertical. Cada horizontal se pinta una vez.
            const bktX = hPlotW + 5;
            const conH = new Set<number>();
            for (let i = 1; i < catValues.length; i++) {
                const v1 = series.values[i - 1], v2 = series.values[i];
                if (v1 === 0) { continue; }
                const y1 = centro(i - 1), y2 = centro(i);
                if (hConn) {
                    conH.add(i - 1); conH.add(i);
                    ca.append("line")
                        .attr("x1", bktX).attr("y1", y1).attr("x2", bktX).attr("y2", y2)
                        .attr("stroke", this.settings.barSettings.connectorColor)
                        .attr("stroke-width", 1).attr("stroke-dasharray", "2,2").attr("aria-hidden", "true");
                }
                etiqueta(bktX + (hConn ? 5 : 1), (y1 + y2) / 2, v2 - v1, (v2 - v1) / Math.abs(v1) * 100);
            }
            conH.forEach(i => {
                ca.append("line")
                    .attr("x1", xsH(Math.max(0, series.values[i]))).attr("y1", centro(i)).attr("x2", bktX).attr("y2", centro(i))
                    .attr("stroke", this.settings.barSettings.connectorColor)
                    .attr("stroke-width", 1).attr("stroke-dasharray", "2,2").attr("aria-hidden", "true");
            });
        };

        // ── Draw each panel ────────────────────────────────────────────────
        visible.forEach((series, pi) => {
            const col = pi % ncols;
            const row = Math.floor(pi / ncols);
            const cx  = col * cellW;
            const cy  = row * cellH;

            const pg = gridG.append("g")
                .attr("class", "sm-panel")
                .attr("transform", `translate(${cx + cellPad},${cy + cellPad})`);

            // ── Panel background ───────────────────────────────────────────
            if (this.settings.panelStyle.showBackground) {
                pg.insert("rect", ":first-child")
                    .attr("x", -cellPad + 1).attr("y", -cellPad + 1)
                    .attr("width", cellW - 2).attr("height", cellH - 2)
                    .attr("rx", 4)
                    .attr("fill", this.settings.panelStyle.bgColor)
                    .attr("opacity", this.settings.panelStyle.bgOpacity / 100)
                    .attr("pointer-events", "none");
            }

            // ── Panel title ────────────────────────────────────────────────
            const titleColor = useSeriesColor ? series.color : titleCustomColor;

            // Drill buttons — only on the first panel (Pi===0) to avoid duplication
            if (pi === 0) {
                if (canDrillUp) {
                    const upBtn = pg.append("g")
                        .attr("transform", `translate(0, ${titleH / 2 - 5})`)
                        .style("cursor", "pointer")
                        .attr("aria-label", this.tr("UI_DrillUp", "Drill up"))
                        .on("click", (event: MouseEvent) => {
                            event.stopPropagation();
                            hostRef.drill({ roleName: "category", drillType: 1 as any });
                        });
                    upBtn.append("rect").attr("width", 14).attr("height", 14).attr("rx", 2)
                        .attr("fill", titleColor).attr("opacity", 0.15);
                    upBtn.append("text").attr("x", 7).attr("y", 11)
                        .attr("text-anchor", "middle").style("font-size", "10px")
                        .style("fill", titleColor).style("font-weight", "700")
                        .style("pointer-events", "none").text("↑");
                }
                if (canDrillDown) {
                    const dnBtn = pg.append("g")
                        .attr("transform", `translate(${canDrillUp ? 18 : 0}, ${titleH / 2 - 5})`)
                        .style("cursor", "pointer")
                        .attr("aria-label", this.tr("UI_DrillDown", "Drill down"))
                        .on("click", (event: MouseEvent) => {
                            event.stopPropagation();
                            hostRef.drill({ roleName: "category", drillType: 2 as any });
                        });
                    dnBtn.append("rect").attr("width", 14).attr("height", 14).attr("rx", 2)
                        .attr("fill", titleColor).attr("opacity", 0.15);
                    dnBtn.append("text").attr("x", 7).attr("y", 11)
                        .attr("text-anchor", "middle").style("font-size", "10px")
                        .style("fill", titleColor).style("font-weight", "700")
                        .style("pointer-events", "none").text("↓");
                }
            }

            if (showTitle) {
                const isBottom = titlePos === "bottom";
                const topOffset = isBottom ? varH : titleH + varH;
                const titleTextY = isBottom
                    ? topOffset + innerH + xLblH + 16
                    : titleH - 5;
                const titleLineY = isBottom
                    ? topOffset + innerH + xLblH + 4
                    : titleH;

                const conFondo = this.settings.panelTitle.titleStyle === "background";
                let textoTitulo = titleColor;

                if (conFondo) {
                    // La banda ocupa el alto reservado al titulo, no una altura inventada:
                    // asi el texto queda centrado sin recolocar nada.
                    const bandY = isBottom ? titleLineY : 0;
                    pg.append("rect")
                        .attr("x", 0).attr("y", bandY)
                        .attr("width", innerW).attr("height", titleH)
                        .attr("rx", 3)
                        .attr("fill", this.settings.panelTitle.backgroundColor);
                    // El color del titulo lo elige el usuario y el del fondo tambien, asi
                    // que pueden coincidir. Si el contraste no llega, el texto cede.
                    textoTitulo = legible(titleColor, this.settings.panelTitle.backgroundColor);
                } else {
                    pg.append("line")
                        .attr("x1", 0).attr("y1", titleLineY)
                        .attr("x2", innerW).attr("y2", titleLineY)
                        .attr("stroke", titleColor)
                        .attr("stroke-width", 1.5).attr("opacity", 0.35);
                }

                pg.append("text").classed("panel-title", true)
                    .attr("x", innerW / 2)
                    .attr("y", conFondo ? (isBottom ? titleLineY + titleH / 2 : titleH / 2) : titleTextY)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", conFondo ? "central" : null)
                    .style("font-size", `${titleFontSize}px`)
                    .style("font-weight", "700")
                    .style("fill", textoTitulo)
                    .text(series.name);
            }

            if (horiz) { drawHorizontal(series, pi, pg); return; }

            // ── Chart area ─────────────────────────────────────────────────
            const caTopOffset = (showTitle && titlePos === "top") ? titleH + varH : varH;
            const ca = pg.append("g").attr("transform", `translate(0,${caTopOffset})`);

            // Zero line
            ca.append("line")
                .attr("x1", 0).attr("y1", y(0)).attr("x2", innerW).attr("y2", y(0))
                .attr("stroke", this.settings.barSettings.axisTextColor)
                .attr("stroke-width", 0.5).attr("opacity", 0.5);

            const x = d3.scaleBand().domain(catValues).rangeRound([0, innerW]).paddingInner(0.35);

            // ── Bars + labels ──────────────────────────────────────────────
            const dp = this.settings.variationLabels.decimalPlaces;
            // Referencia activa. "previous" mantiene el comportamiento historico (barra
            // anterior del eje); si se elige un pozo de referencia que no tiene medida
            // enlazada, se cae a "previous" en vez de dejar el visual en blanco.
            const cmpRole   = this.settings.comparison.compareTo;
            const refArr    = cmpRole !== "previous" ? series.refValues[cmpRole] : undefined;
            const useRef    = !!refArr;
            const refLabel  = this.refLabel(cmpRole);
            catValues.forEach((cat, ci) => {
                const { v, base, fill, opac, ariaLabel, tooltipItems, selId } = barInfo(series, ci, useRef, refArr, refLabel, dp);
                const bx     = x(cat);
                const bw     = x.bandwidth();
                const by     = y(Math.max(0, v));
                const bh     = Math.max(Math.abs(y(v) - y(0)), 1);

                // Grosor acotado: pasado de la mitad del ancho, el borde se come la barra.
                const bw2 = Math.max(0, Math.min(this.settings.barSettings.borderWidth, bw / 2, bh / 2));
                const clipId = `bar-clip-${pi}-${ci}`;
                if (bw2 > 0) {
                    ca.append("clipPath").attr("id", clipId)
                        .append("rect")
                        .attr("x", bx).attr("y", by).attr("width", bw).attr("height", bh)
                        .attr("rx", this.settings.panelLayout.barBorderRadius);
                }

                // selectionId + tooltipInfo stored as D3 datum
                const rectV = ca.append("rect")
                    .datum({ selectionId: selId, tooltipInfo: tooltipItems } as BarDatum)
                    .classed("bar-rect", true)
                    .attr("x", bx).attr("y", by)
                    .attr("width", bw).attr("height", bh)
                    .attr("fill", fill).attr("opacity", opac)
                    // El borde se dibuja HACIA DENTRO: un stroke normal se reparte a los dos
                    // lados del contorno, asi que la barra creceria medio grosor por lado y
                    // el valor cero dejaria de estar sobre la linea base.
                    .attr("stroke", bw2 > 0 ? this.settings.barSettings.borderColor : "none")
                    .attr("stroke-width", bw2 > 0 ? bw2 * 2 : 0)
                    .attr("clip-path", bw2 > 0 ? `url(#${clipId})` : null)
                    .attr("rx", this.settings.panelLayout.barBorderRadius)
                    .attr("role", "img")
                    .attr("aria-label", ariaLabel)
                    .attr("tabindex", "0")
                    .attr("data-opac", opac);
                barEvents(rectV, selId);

                // ── Reference marker ───────────────────────────────────────
                // Marca horizontal al nivel de la referencia, al estilo IBCS: la barra es
                // el valor real y la marca dice donde deberia estar. Es lo que hace que la
                // desviacion se lea sin tener que mirar la etiqueta.
                if (useRef && this.settings.comparison.showMarker
                    && base !== null && base !== undefined && isFinite(Number(base))) {
                    const ry = y(Number(base));
                    ca.append("line")
                        .classed("ref-marker", true)
                        .attr("x1", bx - 1).attr("x2", bx + bw + 1)
                        .attr("y1", ry).attr("y2", ry)
                        .attr("stroke", this.settings.comparison.markerColor)
                        .attr("stroke-width", 2)
                        .attr("stroke-linecap", "square")
                        .attr("pointer-events", "none")
                        .attr("aria-hidden", "true");
                }

                // X label
                if (this.settings.axisSettings.showXLabels) {
                    const lx = bx + bw / 2;
                    const ly = innerH + (xAngle !== 0 ? 12 : 14);
                    const lbl = ca.append("text").classed("x-label", true)
                        .attr("x", lx).attr("y", ly)
                        .attr("text-anchor", xAngle !== 0 ? "end" : "middle")
                        .style("font-size", `${xFs}px`)
                        .style("fill", this.settings.axisSettings.xColor)
                        .style("font-weight", this.settings.axisSettings.xBold ? "bold" : "normal")
                        .style("font-style", this.settings.axisSettings.xItalic ? "italic" : "normal")
                        .text(cat);
                    if (xAngle !== 0) {
                        // Se rota alrededor del propio punto de anclaje, para que la
                        // etiqueta siga colgando de su barra y no se desplace de columna.
                        lbl.attr("transform", `rotate(${xAngle},${lx},${ly})`);
                    }
                }

                // Value label
                if (this.settings.valueLabels.show) {
                    ca.append("text")
                        .attr("x", bx + bw / 2).attr("y", by - 3)
                        .attr("text-anchor", "middle")
                        .style("font-size", `${this.settings.valueLabels.fontSize}px`)
                        .style("fill", this.settings.valueLabels.color)
                        .style("font-weight", "bold")
                        .text(fmt.format(v));
                }
            });

            if (this.settings.analyticalLines.showTrend) {
                const t = tendencia(series.values);
                const xc = (i: number) => x(catValues[i]) + x.bandwidth() / 2;
                if (t) { trazoTendencia(ca, xc(0), y(t[0]), xc(catValues.length - 1), y(t[1])); }
            }

            // ── Variation labels ───────────────────────────────────────────
            // Con referencia: una etiqueta por barra, encima de su propia columna, porque
            // la desviacion pertenece a la barra y no al hueco entre dos barras.
            if (this.settings.variationLabels.show && varH > 0 && useRef) {
                const mode = this.settings.comparison.varianceMode;
                for (let i = 0; i < catValues.length; i++) {
                    const rv = refArr[i];
                    if (rv === null || rv === undefined || !isFinite(Number(rv)) || Number(rv) === 0) continue;
                    const vv     = series.values[i];
                    const delta  = vv - Number(rv);
                    const pctV   = (delta / Math.abs(Number(rv))) * 100;
                    const isPos  = delta >= 0;
                    const vColor = isPos ? this.settings.variationLabels.positiveColor
                                         : this.settings.variationLabels.negativeColor;
                    const arrow  = varArrows ? (isPos ? "▲ " : "▼ ") : "";
                    const sign   = isPos ? "+" : "";
                    const rel    = `${sign}${pct(pctV, dp)}%`;
                    const abs    = `${sign}${fmtAxis.format(delta)}`;
                    const txt    = mode === "absolute" ? abs
                                 : mode === "both"     ? `${abs} (${rel})`
                                 :                       rel;
                    // Conector: de la etiqueta a la cima de su barra, pasando por la marca de referencia.
                    if (this.settings.variationLabels.showConnectors) {
                        const xc = x(catValues[i]) + x.bandwidth() / 2;
                        pg.append("line")
                            .attr("x1", xc).attr("y1", chartTop - 2)
                            .attr("x2", xc).attr("y2", chartTop + Math.min(y(Math.max(0, vv)), y(Number(rv))))
                            .attr("stroke", this.settings.barSettings.connectorColor)
                            .attr("stroke-width", 1).attr("stroke-dasharray", "2,2")
                            .attr("pointer-events", "none").attr("aria-hidden", "true");
                    }
                    pg.append("text").classed("var-label", true)
                        .attr("x", x(catValues[i]) + x.bandwidth() / 2)
                        .attr("y", chartTop - 8 - (varStagger && i % 2 === 1 ? varFs + 3 : 0))
                        .attr("text-anchor", "middle")
                        .style("font-size", `${varFs}px`)
                        .style("font-weight", "bold").style("fill", vColor)
                        .attr("aria-hidden", "true")
                        .text(`${arrow}${txt}`);
                }
            } else if (this.settings.variationLabels.show && varH > 0) {
                // Cada barra intermedia es extremo de dos corchetes. Si cada corchete dibujara sus dos verticales, la
                // barra tendría dos líneas discontinuas superpuestas con los guiones desfasados, que se leen como una
                // línea continua. Por eso los corchetes solo dibujan su tramo horizontal y cada vertical se pinta una vez.
                const conVertical = new Set<number>();
                // Mismo formato que con referencia: % (gratis), diferencia en unidades o las dos (Pro).
                const modoPrev = this.settings.comparison.varianceMode;
                const fmtVar = (delta: number, pc: number): string => {
                    const sg  = delta >= 0 ? "+" : "";
                    const rel = `${sg}${pct(pc, this.settings.variationLabels.decimalPlaces)}%`;
                    const abs = `${sg}${fmtAxis.format(delta)}`;
                    return modoPrev === "absolute" ? abs : modoPrev === "both" ? `${abs} (${rel})` : rel;
                };
                const bktY = chartTop - 2;
                for (let i = 1; i < catValues.length; i++) {
                    const v1 = series.values[i - 1];
                    const v2 = series.values[i];
                    if (v1 === 0) continue;
                    const diff   = ((v2 - v1) / Math.abs(v1)) * 100;
                    const xc1    = x(catValues[i - 1]) + x.bandwidth() / 2;
                    const xc2    = x(catValues[i])     + x.bandwidth() / 2;
                    const isPos  = diff >= 0;
                    const vColor = isPos ? this.settings.variationLabels.positiveColor
                                        : this.settings.variationLabels.negativeColor;
                    const arrow  = varArrows ? (isPos ? "▲ " : "▼ ") : "";

                    // Bracket connector in pg coords (spans from bar tops up into varH zone)
                    if (this.settings.variationLabels.showConnectors) {
                        conVertical.add(i - 1); conVertical.add(i);
                        pg.append("line")
                            .attr("x1", xc1).attr("y1", bktY).attr("x2", xc2).attr("y2", bktY)
                            .attr("stroke", this.settings.barSettings.connectorColor)
                            .attr("stroke-width", 1).attr("stroke-dasharray", "2,2")
                            .attr("aria-hidden", "true");
                    }

                    pg.append("text").classed("var-label", true)
                        .attr("x", (xc1 + xc2) / 2).attr("y", chartTop - 8 - (varStagger && i % 2 === 0 ? varFs + 3 : 0))
                        .attr("text-anchor", "middle")
                        .style("font-size", `${varFs}px`)
                        .style("font-weight", "bold").style("fill", vColor)
                        .text(`${arrow}${fmtVar(v2 - v1, diff)}`);
                }
                conVertical.forEach(i => {
                    const xc = x(catValues[i]) + x.bandwidth() / 2;
                    pg.append("line")
                        .attr("x1", xc).attr("y1", bktY).attr("x2", xc).attr("y2", chartTop + y(series.values[i]))
                        .attr("stroke", this.settings.barSettings.connectorColor)
                        .attr("stroke-width", 1).attr("stroke-dasharray", "2,2")
                        .attr("aria-hidden", "true");
                });
            }
        });

        // ── Analytical Lines + Bands ───────────────────────────────────────
        const al    = this.settings.analyticalLines;
        const allValsFlat = visible.flatMap(s => s.values);

        // Banda de referencia: los límites escritos, en el orden que vengan; sin límites (los dos a 0), el rango típico,
        // del percentil 25 al 75 de todos los valores. Antes, con los límites a 0, activarla no dibujaba nada.
        let banda: [number, number] | null = null;
        if (al.showBand) {
            if (al.bandMin !== 0 || al.bandMax !== 0) {
                banda = [Math.min(al.bandMin, al.bandMax), Math.max(al.bandMin, al.bandMax)];
            } else {
                const ord = allValsFlat.slice().sort((a, b) => a - b);
                banda = [d3.quantileSorted(ord, 0.25) || 0, d3.quantileSorted(ord, 0.75) || 0];
            }
            if (!(banda[1] > banda[0])) { banda = null; }
        }

        // Horizontal: un eje de valores bajo cada columna de paneles.
        if (horiz && valAxisH > 0) {
            for (let c = 0; c < Math.min(ncols, numPanels); c++) {
                const xAxisG = this.chartGroup.append("g").classed("y-axis", true)
                    .attr("transform", `translate(${oML + c * cellW + cellPad + hCatW},${oMT + gridH + 2})`);
                d3.axisBottom(xsH).ticks(Math.max(2, Math.floor(hPlotW / 70))).tickSize(0).tickFormat((d: any) => fmtAxis.format(d))(xAxisG as any);
                xAxisG.select(".domain").remove();
                xAxisG.selectAll("text")
                    .style("fill", axS.yColor)
                    .style("font-weight", axS.yBold ? "bold" : "normal")
                    .style("font-style", axS.yItalic ? "italic" : "normal")
                    .style("font-size", `${axS.yFontSize}px`);
            }
        }

        if (horiz) {
            // Líneas y banda en vertical, una por panel.
            const cfgH: { show: boolean; value: number; label: string }[] = [
                { show: al.showAverage, value: d3.mean(allValsFlat) || 0,   label: this.tr("UI_Avg", "Avg") },
                { show: al.showMax,     value: d3.max(allValsFlat)  || 0,   label: this.tr("UI_Max", "Max") },
                { show: al.showMin,     value: d3.min(allValsFlat)  || 0,   label: this.tr("UI_Min", "Min") },
                { show: al.showMedian,  value: d3.median(allValsFlat) || 0, label: this.tr("UI_Median", "Median") },
                { show: al.showRef,     value: al.refValue,                 label: fmt.format(al.refValue) }
            ];
            const dashH = al.lineStyle === "dashed" ? "6,3" : al.lineStyle === "dotted" ? "2,3" : null;
            for (let pi = 0; pi < numPanels; pi++) {
                const x0 = oML + (pi % ncols) * cellW + cellPad + hCatW;
                const y0 = oMT + Math.floor(pi / ncols) * cellH + cellPad + hTop;
                if (banda) {
                    const bx0 = xsH(Math.max(banda[0], xsH.domain()[0])), bx1 = xsH(Math.min(banda[1], xsH.domain()[1]));
                    this.chartGroup.append("rect")
                        .attr("x", x0 + bx0).attr("y", y0)
                        .attr("width", Math.max(0, bx1 - bx0)).attr("height", innerH)
                        .attr("fill", al.bandColor).attr("opacity", al.bandOpacity / 100)
                        .attr("pointer-events", "none").attr("aria-hidden", "true");
                }
                for (const lc of cfgH) {
                    if (!lc.show) { continue; }
                    const lx = x0 + xsH(lc.value);
                    const ln = this.chartGroup.append("line")
                        .attr("x1", lx).attr("x2", lx).attr("y1", y0).attr("y2", y0 + innerH)
                        .attr("stroke", al.lineColor).attr("stroke-width", 1.5)
                        .attr("pointer-events", "none").attr("aria-hidden", "true");
                    if (dashH) { ln.attr("stroke-dasharray", dashH); }
                    if (al.showLabel) {
                        this.chartGroup.append("text")
                            .attr("x", lx + 2).attr("y", y0 + al.labelSize)
                            .style("font-size", `${al.labelSize}px`).style("fill", al.lineColor).style("font-weight", "600")
                            .attr("pointer-events", "none").text(lc.label);
                    }
                }
            }
        }

        if (!horiz && banda) {
            // Una banda por fila, recortada al área del gráfico (antes era un solo rectángulo estirado desde la fila 1).
            const yTop = y(Math.min(banda[1], y.domain()[1])), yBot = y(Math.max(banda[0], y.domain()[0]));
            if (yBot > yTop) {
                for (let r = 0; r < nrows; r++) {
                    gridG.append("rect")
                        .attr("x", 0).attr("y", r * cellH + cellPad + chartTop + yTop)
                        .attr("width", gridW).attr("height", yBot - yTop)
                        .attr("fill", al.bandColor)
                        .attr("opacity", al.bandOpacity / 100)
                        .attr("pointer-events", "none")
                        .attr("aria-hidden", "true");
                }
            }
        }

        const lineConfigs: { show: boolean; value: number; label: string }[] = [
            { show: al.showAverage, value: d3.mean(allValsFlat) || 0,     label: this.tr("UI_Avg", "Avg") },
            { show: al.showMax,     value: d3.max(allValsFlat)  || 0,     label: this.tr("UI_Max", "Max") },
            { show: al.showMin,     value: d3.min(allValsFlat)  || 0,     label: this.tr("UI_Min", "Min") },
            { show: al.showMedian,  value: d3.median(allValsFlat) || 0,   label: this.tr("UI_Median", "Median") },
            { show: al.showRef,     value: al.refValue,                   label: fmt.format(al.refValue) }
        ];

        const strokeDash = al.lineStyle === "dashed" ? "6,3"
                         : al.lineStyle === "dotted" ? "2,3"
                         : null;

        for (const lc of lineConfigs) {
            if (!lc.show || horiz) continue;
            // Draw one line per row, at the correct y position inside each row's chart area
            for (let r = 0; r < nrows; r++) {
                const lineY = oMT + r * cellH + cellPad + chartTop + y(lc.value);
                const lineEl = this.chartGroup.append("line")
                    .attr("x1", oML).attr("x2", oML + gridW)
                    .attr("y1", lineY).attr("y2", lineY)
                    .attr("stroke", al.lineColor)
                    .attr("stroke-width", 1.5)
                    .attr("pointer-events", "none")
                    .attr("aria-hidden", "true");
                if (strokeDash) lineEl.attr("stroke-dasharray", strokeDash);

                if (al.showLabel) {
                    this.chartGroup.append("text")
                        .attr("x", oML + gridW - 2).attr("y", lineY - 2)
                        .attr("text-anchor", "end")
                        .style("font-size", `${al.labelSize}px`)
                        .style("fill", al.lineColor)
                        .style("font-weight", "600")
                        .attr("pointer-events", "none")
                        .text(lc.label);
                }
            }
        }

        // ── Legend ────────────────────────────────────────────────────────
        if (this.settings.legend.show) {
            const ly = legendPos === "top"
                ? 4
                : svgHeight - legendH + 4;
            const posColor = this.settings.variationLabels.positiveColor;
            const negColorLeg = this.settings.variationLabels.negativeColor;
            const swatchSize  = 10;
            const itemSpacing = 80;
            const startX      = width / 2 - itemSpacing / 2;

            this.legendGroup.selectAll("*").remove();

            // Positive item
            this.legendGroup.append("rect")
                .attr("x", startX).attr("y", ly + 2)
                .attr("width", swatchSize).attr("height", swatchSize)
                .attr("rx", 2).attr("fill", posColor);
            this.legendGroup.append("text")
                .attr("x", startX + swatchSize + 4).attr("y", ly + swatchSize)
                .style("font-size", "10px").style("fill", this.settings.legend.textColor)
                .text(this.tr("UI_Positive", "Positive"));

            // Negative item
            if (this.settings.accessibility.highContrastMode) {
                this.legendGroup.append("rect")
                    .attr("x", startX + itemSpacing).attr("y", ly + 2)
                    .attr("width", swatchSize).attr("height", swatchSize)
                    .attr("rx", 2).attr("fill", `url(#${patternId})`);
            } else {
                this.legendGroup.append("rect")
                    .attr("x", startX + itemSpacing).attr("y", ly + 2)
                    .attr("width", swatchSize).attr("height", swatchSize)
                    .attr("rx", 2).attr("fill", negColorLeg);
            }
            this.legendGroup.append("text")
                .attr("x", startX + itemSpacing + swatchSize + 4).attr("y", ly + swatchSize)
                .style("font-size", "10px").style("fill", this.settings.legend.textColor)
                .text(this.tr("UI_Negative", "Negative"));
        }

        // ── Watermark & freemium message ───────────────────────────────────
        this.renderWatermark(svgWidth, svgHeight, preview && this.attemptedPro.length > 0);
        this.renderAxisTitles(L.xTitleH ? tituloAbajo : "", L.yTitleW ? tituloIzq : "", tituloFs, oML, oMT, oMR, oMB - valAxisH, legendH,
            svgWidth, svgHeight, horiz);
        this.renderGuide(editing);
        if (DEBUG_FX && (this as any).diagFx) {
            this.messageGroup.selectAll(".dbgfx").remove();
            this.messageGroup.append("text").classed("dbgfx", true).attr("x", 4).attr("y", svgHeight - 4)
                .style("font-size", "9px").style("fill", "#C00000").text((this as any).diagFx);
        }
        // Nota neutra, sin llamada a comprar: la ruta de compra es la notificacion de Power BI.
        const msgData = isLimited ? [this.tr("UI_ShowingPanels", "Showing {0} of {1} panels").replace("{0}", String(maxPanels)).replace("{1}", String(seriesList.length))] : [];
        this.messageGroup.selectAll(".freemium-msg").data(msgData)
            .join("text").classed("freemium-msg", true)
            .attr("x", svgWidth / 2).attr("y", svgHeight - 6)
            .attr("text-anchor", "middle")
            .style("font-size", "11px").style("font-weight", "normal").style("fill", "#83827D")
            .text(d => d);

        // ── Tooltips via wrapper (handles all mouse events) ─────────────────
        this.tooltipServiceWrapper.addTooltip(
            this.svg.selectAll<Element, BarDatum>(".bar-rect"),
            (d: BarDatum) => d.tooltipInfo,
            (d: BarDatum) => d.selectionId
        );
    }

    /** Marca de agua solo sobre funciones de pago usadas sin licencia (vista previa Pro). */
    /**
     * La marca de agua, igual que en el resto de la cartera.
     *
     * Antes era gris #83827D al 22%: sobre un panel claro casi no se veia, y sobre barras
     * saturadas desaparecia. Ahora es texto blanco perfilado en oscuro —en SVG no hay
     * text-shadow, asi que se consigue con stroke y paint-order— que se lee igual sobre
     * fondo claro y sobre las barras.
     *
     * Y dice QUE funcion la enciende: una marca que no explica por que esta ahi se lee
     * como que el visual se ha colgado.
     */
    private renderWatermark(width: number, height: number, show: boolean) {
        this.watermarkGroup.selectAll("*").remove();
        if (!show) return;
        const cx = width / 2;
        const cy = height / 2;
        const fs = Math.round(Math.max(24, Math.min(88, width / 7.5, height / 3.5)));

        const g = this.watermarkGroup.append("g")
            .attr("transform", `rotate(-20 ${cx} ${cy})`)
            .attr("aria-hidden", "true").attr("pointer-events", "none")
            .attr("opacity", 0.72);

        const comun = (t: any, size: number, peso: string) => t
            .attr("x", cx).attr("text-anchor", "middle").attr("dominant-baseline", "middle")
            .style("font-family", "'Segoe UI', sans-serif")
            .style("font-size", `${size}px`).style("font-weight", peso)
            .style("letter-spacing", "0.06em")
            .style("fill", "#FFFFFF")
            .style("stroke", "#2E3440").style("stroke-width", Math.max(2, size / 14))
            .style("paint-order", "stroke");

        // Con mas de dos funciones la lista se convierte en un parrafo que tapa el grafico.
        const etiquetas = this.attemptedPro.length <= 2
            ? this.attemptedPro
            : this.attemptedPro.slice(0, 2).concat([`+${this.attemptedPro.length - 2}`]);
        const hayDetalle = etiquetas.length > 0;

        comun(g.append("text"), fs, "700")
            .attr("y", hayDetalle ? cy - fs * 0.22 : cy)
            .text(this.tr("Visual_ProPreview", "Pro preview"));

        if (hayDetalle) {
            comun(g.append("text"), Math.round(fs * 0.32), "600")
                .attr("y", cy + fs * 0.45)
                .text(etiquetas.join(" · "));
        }
    }

    /**
     * Pagina de bienvenida (supportsLandingPage estaba declarado sin implementar):
     * como empezar y que añade Pro. Solo SVG con textContent, sin innerHTML.
     */
    private renderLanding(width: number, height: number): void {
        this.svg.attr("width", width).attr("height", height);
        this.target.style.overflowX = "hidden";
        this.target.style.overflowY = "hidden";
        this.renderWatermark(width, height, false);
        this.messageGroup.selectAll("*").remove();
        const g = this.chartGroup.append("g").classed("landing", true).attr("transform", "translate(16,8)");
        const lines: [string, number, string, string, number][] = [
            ["Bar Chart with Variation %", 16, "700", "#3D3929", 16],
            [this.tr("UI_Landing1", "1. Drag a date or category field to Axis."), 12, "400", "#535146", 26],
            [this.tr("UI_Landing2", "2. Drag a numeric measure to Values: variation % appears between bars."), 12, "400", "#535146", 20],
            [this.tr("UI_Landing3", "3. Optional: Small Multiple splits the chart into panels; Tooltips adds fields."), 12, "400", "#535146", 20],
            [this.tr("UI_Landing4", "Pro plan on Microsoft AppSource: up to 100 panels, analytical lines,"), 12, "600", "#83827D", 30],
            [this.tr("UI_Landing5", "reference band, value labels and per-bar colours."), 12, "600", "#83827D", 18]
        ];
        let y = 0;
        for (const [text, size, weight, color, dy] of lines) {
            y += dy;
            g.append("text").attr("x", 0).attr("y", y)
                .style("font-size", `${size}px`).style("font-weight", weight).style("fill", color)
                .text(text);
        }
    }

    private clear() {
        this.chartGroup.selectAll("*").remove();
        this.legendGroup.selectAll("*").remove();
    }

    /**
     * Asistente de configuración: panel compacto en la esquina, solo editando. No toca los pozos (eso solo lo hace el
     * usuario): enseña qué campos faltan y aplica una plantilla. Cerrar o terminar guarda style.guide = false; se
     * reabre desde Formato → Plantilla de estilo. persistProperties sale de un clic, nunca del callback de selección.
     */
    private renderGuide(editing: boolean): void {
        if (!this.guideEl) {
            this.guideEl = document.createElement("div");
            this.guideEl.className = "bcv-guide";
            this.target.appendChild(this.guideEl);
        }
        const el = this.guideEl;
        while (el.firstChild) { el.removeChild(el.firstChild); }
        el.style.display = "none";
        const formatMode = !!(this.lastOptions as any)?.formatMode;
        if (!editing || formatMode || !this.guideOn || !this.interactive()) { return; }
        const hc = this.hcActive();
        const azul = hc ? "#FFFF00" : "#2B6CB0", fg = hc ? "#FFFFFF" : "#252423", muted = hc ? "#FFFFFF" : "#605E5C";
        el.style.display = "block";
        el.style.background = hc ? "#000000" : "#FFFFFF";
        el.style.borderColor = azul;
        el.style.color = fg;
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-label", this.tr("UI_GuideTitle", "Setup guide"));
        el.onclick = (e) => e.stopPropagation();
        el.onkeydown = (e) => e.stopPropagation();
        const terminar = () => {
            this.guideStep = 2;
            this.host.persistProperties({ merge: [{ objectName: "style", selector: null as any, properties: { guide: false } }] });
        };
        const mk = (tag: string, cls: string, text?: string) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) { n.textContent = text; } return n; };
        const boton = (texto: string, principal: boolean, accion: () => void) => {
            const b = mk("button", "bcv-g-btn", texto) as HTMLButtonElement;
            b.type = "button";
            b.style.borderColor = azul;
            b.style.background = principal ? azul : "transparent";
            b.style.color = principal ? (hc ? "#000000" : "#FFFFFF") : azul;
            b.addEventListener("click", accion);
            return b;
        };
        const cab = mk("div", "bcv-g-head");
        const paso = mk("div", "", this.tr("UI_GuideStep", "Setup · step {0} of 3").replace("{0}", String(this.guideStep)));
        paso.style.color = azul;
        const cerrar = mk("button", "bcv-g-close", "✕") as HTMLButtonElement;
        cerrar.type = "button";
        cerrar.title = this.tr("UI_GuideClose", "Close the guide");
        cerrar.setAttribute("aria-label", cerrar.title);
        cerrar.style.color = muted;
        cerrar.addEventListener("click", terminar);
        cab.appendChild(paso); cab.appendChild(cerrar);
        el.appendChild(cab);
        const titulo = mk("div", "bcv-g-title");
        el.appendChild(titulo);
        const pie = mk("div", "bcv-g-foot");
        if (this.guideStep !== 3) {
            titulo.textContent = this.tr("UI_GuideCompare", "Compare and read");
            const cols: any[] = (this.dataView?.metadata?.columns || []) as any[];
            const tiene = (rol: string) => cols.some(c => c?.roles?.[rol]);
            const items: [boolean, string, string][] = [
                [tiene("series"), this.tr("Visual_SmallMultiple", "Small Multiple"), this.tr("UI_GuideSM", "one panel per region, product or team")],
                [tiene("plan"), this.tr("Visual_Role_Plan", "Plan / Budget (Pro)"), this.tr("UI_GuidePlan", "actual against plan, with the variance on every bar")],
                [tiene("previousYear"), this.tr("Visual_Role_PreviousYear", "Previous Year (Pro)"), this.tr("UI_GuidePY", "this year against last year")],
                [tiene("forecast"), this.tr("Visual_Role_Forecast", "Forecast (Pro)"), this.tr("UI_GuideFC", "actual against forecast")],
            ];
            for (const [hecho, nombre, porque] of items) {
                const f = mk("div", "bcv-g-item");
                const marca = mk("span", "", hecho ? "✓" : "○");
                marca.setAttribute("aria-label", hecho ? this.tr("UI_GuideDone", "added") : this.tr("UI_GuideTodo", "not added"));
                marca.style.color = hecho ? (hc ? "#00FF00" : "#107C10") : muted;
                const txt = mk("span", "");
                const b = mk("b", "", nombre);
                txt.appendChild(b); txt.appendChild(document.createTextNode(" — " + porque));
                txt.style.color = hecho ? muted : fg;
                f.appendChild(marca); f.appendChild(txt);
                el.appendChild(f);
            }
            const nota = mk("div", "bcv-g-note", this.tr("UI_GuideWells", "Drag the fields into the field wells; this list updates by itself. All optional."));
            nota.style.color = muted;
            el.appendChild(nota);
            pie.appendChild(boton(this.tr("UI_GuideNext", "Next"), true, () => { this.guideStep = 3; this.renderGuide(editing); }));
        } else {
            titulo.textContent = this.tr("UI_GuideStyle", "Pick a style");
            const rejilla = mk("div", "bcv-g-grid");
            const nombres: [string, string, string][] = [["clean", "Visual_Enum_TplClean", "Clean"], ["classic", "Visual_Enum_TplClassic", "Classic"],
                ["minimal", "Visual_Enum_TplMinimal", "Minimal"], ["contrast", "Visual_Enum_TplContrast", "Contrast"],
                ["compact", "Visual_Enum_TplCompact", "Compact"], ["ibcs", "Visual_Enum_TplIbcs", "IBCS style"]];
            for (const [nombre, clave, def] of nombres) {
                const chip = mk("button", "bcv-g-chip") as HTMLButtonElement;
                chip.type = "button";
                const actual = nombre === this.template;
                chip.setAttribute("aria-pressed", String(actual));
                chip.style.borderColor = actual ? azul : "#C8C6C4";
                chip.style.borderWidth = actual ? "2px" : "1px";
                chip.appendChild(this.miniBars(nombre, hc));
                chip.appendChild(mk("div", "", this.tr(clave, def)));
                chip.addEventListener("click", () => {
                    this.host.persistProperties({ merge: [{ objectName: "style", selector: null as any, properties: { template: nombre } }] });
                });
                rejilla.appendChild(chip);
            }
            el.appendChild(rejilla);
            pie.appendChild(boton(this.tr("UI_GuideBack", "Back"), false, () => { this.guideStep = 2; this.renderGuide(editing); }));
            pie.appendChild(boton(this.tr("UI_GuideFinish", "Finish"), true, terminar));
        }
        el.appendChild(pie);
    }

    // ── Formato desde el lienzo (on-object) ───────────────────────────────────

    /** Nombre traducido de una tarjeta o de una propiedad, sacado de la misma tabla que el panel. */
    private specLabel(obj: string, prop?: string): string {
        const card = FORMAT_SPEC.find(cd => cd.obj === obj);
        if (!card) { return obj; }
        if (!prop) { return this.tr(card.key, card.label); }
        const pr = card.props.find(x => x.name === prop);
        return pr ? this.tr(pr.key, pr.label) : prop;
    }

    /** Marca los elementos que se pueden elegir en modo formato. Fuera de él, no deja rastro. */
    private markSubSelectables(): void {
        const marcar = (sel: string, objeto: string, nombre: string, tipo: powerbi.visuals.SubSelectionStylesType) => {
            this.target.querySelectorAll(sel).forEach(el => {
                if (!this.formatMode) { el.classList.remove(HtmlSubSelectableClass); return; }
                el.classList.add(HtmlSubSelectableClass);
                el.setAttribute(SubSelectableObjectNameAttribute, objeto);
                el.setAttribute(SubSelectableDisplayNameAttribute, nombre);
                el.setAttribute(SubSelectableTypeAttribute, String(tipo));
            });
        };
        marcar(".bar-rect", "bars", this.specLabel("barSettings"), powerbi.visuals.SubSelectionStylesType.Shape);
        marcar(".var-label", "variationLabels", this.specLabel("variationLabels"), powerbi.visuals.SubSelectionStylesType.Text);
        marcar(".panel-title", "panelTitle", this.specLabel("panelTitle"), powerbi.visuals.SubSelectionStylesType.Text);
        marcar(".x-label, .x-title", "xAxis", this.tr("UI_ObjXAxis", "X axis"), powerbi.visuals.SubSelectionStylesType.Text);
        marcar(".y-axis, .y-title", "yAxis", this.tr("UI_ObjYAxis", "Y axis"), powerbi.visuals.SubSelectionStylesType.Text);
        marcar(".legend-group", "legend", this.specLabel("legend"), powerbi.visuals.SubSelectionStylesType.Text);
    }

    private getSubSelectionStyles(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.SubSelectionStyles | undefined {
        const name = subs[0]?.customVisualObjects[0]?.objectName;
        const ref = (objectName: string, propertyName: string) => ({ reference: { objectName, propertyName }, label: this.specLabel(objectName, propertyName) });
        switch (name) {
            case "bars":
                return { type: powerbi.visuals.SubSelectionStylesType.Shape, fill: ref("barSettings", "barColor"), stroke: ref("barSettings", "borderColor") } as any;
            case "variationLabels":
                return { type: powerbi.visuals.SubSelectionStylesType.Text, fontSize: ref("variationLabels", "fontSize"), fontColor: ref("variationLabels", "positiveColor") } as any;
            case "panelTitle":
                return { type: powerbi.visuals.SubSelectionStylesType.Text, fontSize: ref("panelTitle", "fontSize"), fontColor: ref("panelTitle", "customColor") } as any;
            case "xAxis":
                return { type: powerbi.visuals.SubSelectionStylesType.Text, fontSize: ref("axisSettings", "xFontSize"), fontColor: ref("axisSettings", "xColor"),
                    bold: ref("axisSettings", "xBold"), italic: ref("axisSettings", "xItalic") } as any;
            case "yAxis":
                return { type: powerbi.visuals.SubSelectionStylesType.Text, fontSize: ref("axisSettings", "yFontSize"), fontColor: ref("axisSettings", "yColor"),
                    bold: ref("axisSettings", "yBold"), italic: ref("axisSettings", "yItalic") } as any;
            case "legend":
                return { type: powerbi.visuals.SubSelectionStylesType.Text, fontColor: ref("legend", "textColor") } as any;
        }
        return undefined;
    }

    private getSubSelectionShortcuts(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.VisualSubSelectionShortcuts | undefined {
        const name = subs[0]?.customVisualObjects[0]?.objectName;
        const id = (objectName: string, propertyName: string) => ({ objectName, propertyName });
        const toggle = (o: string, pr: string) => ({ type: powerbi.visuals.VisualShortcutType.Toggle, ...id(o, pr), relatedToggledFormattingIds: [id(o, pr)],
            disabledLabel: this.specLabel(o, pr), enabledLabel: this.specLabel(o, pr) });
        const picker = (o: string, pr: string) => ({ type: powerbi.visuals.VisualShortcutType.Picker, ...id(o, pr), label: this.specLabel(o, pr) });
        const reset = (o: string, props: string[]) => ({ type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: props.map(pr => id(o, pr)) });
        const nav = (o: string, label?: string) => ({ type: powerbi.visuals.VisualShortcutType.Navigate, destinationInfo: { cardUid: "Visual-" + o + "_card" }, label: label || this.specLabel(o) });
        switch (name) {
            case "bars":
                return [picker("comparison", "compareTo"), toggle("valueLabels", "show"), { type: powerbi.visuals.VisualShortcutType.Divider },
                    reset("barSettings", ["barColor", "negativeColor", "borderColor", "borderWidth", "barOpacity"]), nav("barSettings")] as any;
            case "variationLabels":
                return [picker("comparison", "varianceMode"), toggle("variationLabels", "showArrows"), toggle("variationLabels", "showConnectors"),
                    { type: powerbi.visuals.VisualShortcutType.Divider }, reset("variationLabels", ["fontSize", "positiveColor", "negativeColor", "decimalPlaces"]), nav("variationLabels")] as any;
            case "panelTitle":
                return [picker("panelTitle", "titleStyle"), picker("panelTitle", "position"), toggle("panelTitle", "useSeriesColor"),
                    { type: powerbi.visuals.VisualShortcutType.Divider }, reset("panelTitle", ["fontSize", "customColor", "backgroundColor"]), nav("panelTitle")] as any;
            case "xAxis":
                return [picker("axisSettings", "xLabelAngle"), toggle("axisSettings", "showXTitle"), toggle("axisSettings", "hideEmpty"),
                    { type: powerbi.visuals.VisualShortcutType.Divider }, reset("axisSettings", ["xFontSize", "xColor", "xBold", "xItalic"]), nav("axisSettings")] as any;
            case "yAxis":
                return [toggle("axisSettings", "showYTitle"), { type: powerbi.visuals.VisualShortcutType.Divider },
                    reset("axisSettings", ["yFontSize", "yColor", "yBold", "yItalic"]), nav("axisSettings")] as any;
            case "legend":
                return [picker("legend", "position"), { type: powerbi.visuals.VisualShortcutType.Divider }, reset("legend", ["textColor"]), nav("legend")] as any;
        }
        return undefined;
    }

    /** Títulos de eje, uno por visual (no por panel): X centrado abajo, Y girado a la izquierda. */
    private renderAxisTitles(tx: string, ty: string, fs: number, oML: number, oMT: number, oMR: number, oMB: number,
        legendH: number, w: number, h: number, horiz = false): void {
        // En horizontal cada título conserva el estilo de su eje: abajo va el de valores (Y), a la izquierda el de categorías (X).
        const a = this.settings.axisSettings;
        const axS = horiz ? { ...a, xColor: a.yColor, xBold: a.yBold, xItalic: a.yItalic, yColor: a.xColor, yBold: a.xBold, yItalic: a.xItalic } : a;
        const legAbajo = this.settings.legend.show && this.settings.legend.position === "bottom" ? legendH : 0;
        if (tx) {
            this.chartGroup.append("text").classed(horiz ? "axis-title y-title" : "axis-title x-title", true)
                .attr("x", oML + (w - oML - oMR) / 2).attr("y", h - legAbajo - 6)
                .attr("text-anchor", "middle")
                .style("font-size", `${fs}px`).style("fill", axS.xColor)
                .style("font-weight", axS.xBold ? "bold" : "normal").style("font-style", axS.xItalic ? "italic" : "normal")
                .text(tx);
        }
        if (ty) {
            const cy = oMT + (h - oMT - oMB) / 2;
            this.chartGroup.append("text").classed(horiz ? "axis-title x-title" : "axis-title y-title", true)
                .attr("x", fs + 2).attr("y", cy)
                .attr("text-anchor", "middle")
                .attr("transform", `rotate(-90,${fs + 2},${cy})`)
                .style("font-size", `${fs}px`).style("fill", axS.yColor)
                .style("font-weight", axS.yBold ? "bold" : "normal").style("font-style", axS.yItalic ? "italic" : "normal")
                .text(ty);
        }
    }

    /** Miniatura de una plantilla: cuatro barras con la tercera negativa y su color de variación. */
    private miniBars(nombre: string, hc: boolean): SVGSVGElement {
        const t = TEMPLATES[nombre] || {};
        const bar = hc ? "#FFFFFF" : (t.barSettings?.barColor || this.settings.barSettings.barColor);
        const neg = hc ? "#FFFFFF" : (t.barSettings?.negativeColor || this.settings.barSettings.negativeColor);
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg") as SVGSVGElement;
        svg.setAttribute("width", "60"); svg.setAttribute("height", "40"); svg.setAttribute("aria-hidden", "true");
        [[6, 22], [20, 14], [34, 18], [48, 8]].forEach(([x, y], i) => {
            const r = document.createElementNS(NS, "rect");
            r.setAttribute("x", String(x)); r.setAttribute("y", String(y)); r.setAttribute("width", "10"); r.setAttribute("height", String(36 - y));
            r.setAttribute("rx", String(t.panelLayout?.barBorderRadius ?? 2));
            r.setAttribute("fill", i === 2 ? neg : bar);
            svg.appendChild(r);
        });
        return svg;
    }

    private keyOf(id: any): string {
        const k = id?.getKey?.();
        if (typeof k === "string") { return k; }
        const sel = id?.getSelector?.();
        return sel ? JSON.stringify(sel) : "";
    }

    /**
     * Clic en una barra. Seleccionar no alterna: volver a pulsar la única barra seleccionada se resuelve con
     * clear() (receta de Calendar y Box & Whisker). Ctrl/Cmd añade o quita.
     */
    private selectBar(id: powerbi.visuals.ISelectionId, multi: boolean): void {
        if (!id) { return; }
        const actual = (this.selectionManager.getSelectionIds() as powerbi.visuals.ISelectionId[]) || [];
        const k = this.keyOf(id);
        this.restoredIds = [];
        const yaSola = !multi && actual.length === 1 && this.keyOf(actual[0]) === k;
        (yaSola ? this.selectionManager.clear() : this.selectionManager.select(id, multi)).then(() => this.paintSelection());
    }

    /** Atenúa las barras no seleccionadas (clic propio o marcador restaurado). */
    private paintSelection(): void {
        const own = (this.selectionManager.getSelectionIds() as powerbi.visuals.ISelectionId[]) || [];
        const sel = own.length ? own : this.restoredIds;
        const keys = new Set(sel.map(i => this.keyOf(i)).filter(Boolean));
        const igual = (a: any, b: any) => !!(a?.equals?.(b) || b?.equals?.(a) || a?.includes?.(b, true) || b?.includes?.(a, true));
        const any = keys.size > 0 || sel.length > 0;
        this.svg.selectAll<SVGRectElement, BarDatum>(".bar-rect").each(function (d: BarDatum) {
            const base = Number(this.getAttribute("data-opac") || 1);
            const on = !any || (d?.selectionId && (keys.has((d.selectionId as any)?.getKey?.() ?? "") || sel.some(x => igual(x, d.selectionId))));
            this.setAttribute("opacity", String(on ? base : base * 0.35));
            this.setAttribute("aria-selected", any && on ? "true" : "false");
        });
    }

    /**
     * Panel de formato moderno. Las tarjetas salen de src/formatSpec.ts, generado desde capabilities.json, así que
     * conservan los objetos y propiedades que ya usan los informes publicados. Muestra lo que eligió el usuario
     * (rawSettings), no lo que pinta el tier gratuito: si no, un ajuste Pro parecería apagarse solo al activarlo.
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const S: any = this.rawSettings || this.settings;
        const cards: any[] = [];
        for (const card of FORMAT_SPEC) {
            const vals = S[card.obj] || {};
            const slices = card.props.map(p => {
                const descriptor = { objectName: card.obj, propertyName: p.name };
                const displayName = this.tr(p.key, p.label);
                const v = vals[p.name];
                const uid = `${card.obj}_${p.name}`;
                switch (p.kind) {
                    case "bool": return { uid, displayName, control: { type: powerbi.visuals.FormattingComponent.ToggleSwitch, properties: { descriptor, value: !!v } } };
                    case "num": return { uid, displayName, control: { type: powerbi.visuals.FormattingComponent.NumUpDown, properties: { descriptor, value: Number(v) || 0 } } };
                    case "fontSize": return { uid, displayName, control: { type: powerbi.visuals.FormattingComponent.NumUpDown, properties: { descriptor, value: Number(v) || 0 } } };
                    case "color": {
                        // Color de barra con formato condicional (fx): la regla se evalúa por barra. Como en los gráficos
                        // nativos con Leyenda, con Small Multiple (valores agrupados por serie) Power BI no la entrega.
                        const fx = card.obj === "barSettings" && p.name === "barColor";
                        // altConstantValueSelector null: el color FIJO se guarda a nivel general (como antes de fx) y solo
                        // las reglas se evalúan por barra. Sin él, el fijo llegaba barra a barra y pisaba el color negativo.
                        const d2: any = fx ? { ...descriptor, instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule,
                            selector: dataViewWildcard.createDataViewWildcardSelector(dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals),
                            altConstantValueSelector: null } : descriptor;
                        return { uid, displayName, control: { type: powerbi.visuals.FormattingComponent.ColorPicker, properties: { descriptor: d2, value: { value: v || "" } } } };
                    }
                    case "text": return { uid, displayName, control: { type: powerbi.visuals.FormattingComponent.TextInput, properties: { descriptor, value: v ?? "", placeholder: "" } } };
                    case "enum": {
                        const items = (p.items || []).map(it => ({ value: it.value, displayName: this.tr(it.key, it.label) }));
                        const value = items.find(it => it.value === v) ?? items[0];
                        return { uid, displayName, control: { type: powerbi.visuals.FormattingComponent.Dropdown, properties: { descriptor, value, items } } };
                    }
                }
                return null;
            }).filter(Boolean);
            // "Restablecer valores predeterminados" de la tarjeta: todas sus propiedades, también el color guardado por
            // barra con el botón fx (descriptor con el selector comodín).
            const revertToDefaultDescriptors = slices.map((sl: any) => sl.control.properties.descriptor);
            cards.push({ uid: `${card.obj}_card`, displayName: this.tr(card.key, card.label), revertToDefaultDescriptors,
                groups: [{ uid: `${card.obj}_g`, displayName: "", slices }] });
        }
        // Un color por barra (Pro) y uno por serie: instancias con su selector, como hacía el enumerado anterior.
        const cat = this.dataView?.categorical?.categories?.[0];
        if (cat) {
            const slices = cat.values.map((val: any, ci: number) => {
                const fc = (cat.objects?.[ci] as any)?.dataColors?.fill?.solid?.color ?? S.barSettings.barColor;
                return { uid: `dataColors_${ci}`, displayName: val?.toString() || String(ci), control: { type: powerbi.visuals.FormattingComponent.ColorPicker, properties: {
                    descriptor: { objectName: "dataColors", propertyName: "fill", selector: cat.identity?.[ci] ? { data: [cat.identity[ci]] } : null },
                    value: { value: fc } } } };
            });
            cards.push({ uid: "dataColors_card", displayName: this.tr("Visual_BarColors", "Bar colors (Pro)"), groups: [{ uid: "dataColors_g", displayName: "", slices }] });
        }
        const values: any = this.dataView?.categorical?.values;
        if (values) {
            const sv = values.grouped ? values.grouped() : values;
            const slices = sv.map((g: any, k: number) => {
                const dn = g.name?.toString() || (g.source ? g.source.displayName : "Series");
                const fc = g.objects?.colorSelector?.fill ? g.objects.colorSelector.fill.solid.color : S.barSettings.barColor;
                // El identificador de grupo no tiene getSelector(): el selector de la serie sale del constructor de selecciones.
                const selector = g.identity
                    ? (this.host.createSelectionIdBuilder().withSeries(values, g).createSelectionId() as any).getSelector?.()
                    : (g.source ? { metadata: g.source.queryName } : null);
                return { uid: `colorSelector_${k}`, displayName: dn, control: { type: powerbi.visuals.FormattingComponent.ColorPicker, properties: {
                    descriptor: { objectName: "colorSelector", propertyName: "fill", selector }, value: { value: fc } } } };
            });
            cards.push({ uid: "colorSelector_card", displayName: this.tr("Visual_SeriesColors", "Series colors"), groups: [{ uid: "colorSelector_g", displayName: "", slices }] });
        }
        return { cards } as any;
    }
}
