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
    };
    panelStyle: {
        showBackground: boolean;
        bgColor: string;
        bgOpacity: number;
    };
    panelLayout: {
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
const PLAN_ID = "bar-chart-variation-pro-tcviz";
// La API de licencias exige localizar el texto del aviso (maximo 500 caracteres).
const ES_LABELS: Record<string, string> = {
    "more than 3 panels": "más de 3 paneles",
    "analytical lines": "las líneas analíticas",
    "the reference band": "la banda de referencia",
    "value labels": "las etiquetas de valor",
    "per-bar colours": "los colores por barra",
    "absolute variance": "la desviación absoluta"
};
// ServicePlanState es un const enum: en runtime hacen falta los numeros.
const STATE_ACTIVE = 1;
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
            yFontSize:   9
        },
        panelStyle: {
            showBackground: false,
            bgColor:        "#F8F8F8",
            bgOpacity:      30
        },
        panelLayout: {
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
            selMgr.clear();
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
                            matchesPlan(p.spIdentifier, PLAN_ID) &&
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
            const n = added.length;
            const es = (this.host.locale || "").toLowerCase().startsWith("es");
            const items = es ? added.map(a => ES_LABELS[a] || a) : added;
            const list = n === 1 ? items[0]
                : items.slice(0, -1).join(", ") + (es ? " y " : " and ") + items[n - 1];
            const msg = es
                ? `Bar Chart with Variation %: ${list} ${n === 1 ? "forma" : "forman"} parte del plan Pro y se ${n === 1 ? "muestra" : "muestran"} como vista previa con marca de agua.`
                : `Bar Chart with Variation %: ${list} ${n === 1 ? "is" : "are"} part of the Pro plan, shown as a watermarked preview.`;
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
        const getValue = <T>(obj: any, prop: string, def: T): T => {
            if (obj && obj[prop] !== undefined) {
                const val = obj[prop];
                if (typeof val === "object" && val.solid) return val.solid.color;
                return val;
            }
            return def;
        };
        const bS = objects?.barSettings;
        // Si el usuario ha puesto un color, sea cual sea, MANDA.
        //
        // Antes se comparaba el valor con el azul por defecto para decidir si estaba
        // configurado, asi que elegir ese azul exacto —que es justo el que el panel
        // ofrece— se descartaba y se usaba el color del tema del informe. Con un tema
        // rojo, todas las barras salian rojas y parecia que el ajuste no funcionaba.
        // Un valor legitimo nunca puede servir de centinela: lo que hay que mirar es si
        // la propiedad EXISTE en metadata.objects.
        this.barColorSetByUser = (bS as any)?.barColor !== undefined;
        this.settings.barSettings.barColor       = getValue(bS, "barColor",       "#378ADD");
        this.settings.barSettings.negativeColor  = getValue(bS, "negativeColor",  "#E24B4A");
        this.settings.barSettings.barOpacity     = getValue(bS, "barOpacity",     100);
        this.settings.barSettings.axisTextColor  = getValue(bS, "axisTextColor",  "#666666");
        this.settings.barSettings.borderColor    = getValue(bS, "borderColor",    "#FFFFFF");
        this.settings.barSettings.borderWidth    = getValue(bS, "borderWidth",    0);
        this.settings.barSettings.connectorColor = getValue(bS, "connectorColor", "#333333");

        const cmp = objects?.comparison;
        this.settings.comparison.compareTo    = getValue(cmp, "compareTo",    "previous");
        this.settings.comparison.varianceMode = getValue(cmp, "varianceMode", "relative");
        this.settings.comparison.showMarker   = getValue(cmp, "showMarker",   true);
        this.settings.comparison.markerColor  = getValue(cmp, "markerColor",  "#333333");

        const vL = objects?.variationLabels;
        this.settings.variationLabels.show           = getValue(vL, "show",           true);
        this.settings.variationLabels.fontSize        = getValue(vL, "fontSize",        11);
        this.settings.variationLabels.positiveColor   = getValue(vL, "positiveColor",   "#00BFA5");
        this.settings.variationLabels.negativeColor   = getValue(vL, "negativeColor",   "#FF4081");
        this.settings.variationLabels.decimalPlaces   = getValue(vL, "decimalPlaces",   1);
        this.settings.variationLabels.showArrows      = getValue(vL, "showArrows",      true);
        this.settings.variationLabels.showConnectors  = getValue(vL, "showConnectors",  true);

        const vLbl = objects?.valueLabels;
        this.settings.valueLabels.show               = getValue(vLbl, "show",               false);
        this.settings.valueLabels.color              = getValue(vLbl, "color",              "#333333");
        this.settings.valueLabels.fontSize           = getValue(vLbl, "fontSize",           10);
        this.settings.valueLabels.displayUnits       = getValue(vLbl, "displayUnits",       0);
        this.settings.valueLabels.valueDecimalPlaces = getValue(vLbl, "valueDecimalPlaces", 1);

        const pT = objects?.panelTitle;
        this.settings.panelTitle.show           = getValue(pT, "show",           true);
        this.settings.panelTitle.position       = getValue(pT, "position",       "top");
        this.settings.panelTitle.fontSize       = getValue(pT, "fontSize",       11);
        this.settings.panelTitle.titleStyle      = getValue(pT, "titleStyle",      "line");
        this.settings.panelTitle.backgroundColor = getValue(pT, "backgroundColor", "#F2F4F7");
        this.settings.panelTitle.useSeriesColor = getValue(pT, "useSeriesColor", true);
        this.settings.panelTitle.customColor    = getValue(pT, "customColor",    "#333333");

        const ax = objects?.axisSettings;
        this.settings.axisSettings.sortOrder   = getValue(ax, "sortOrder",   "auto");
        this.settings.axisSettings.showXLabels = getValue(ax, "showXLabels", true);
        this.settings.axisSettings.xLabelAngle = getValue(ax, "xLabelAngle", "auto");
        this.settings.axisSettings.showYLabels = getValue(ax, "showYLabels", true);
        this.settings.axisSettings.xFontSize   = getValue(ax, "xFontSize",   9);
        this.settings.axisSettings.yFontSize   = getValue(ax, "yFontSize",   9);

        const ps = objects?.panelStyle;
        this.settings.panelStyle.showBackground = getValue(ps, "showBackground", false);
        this.settings.panelStyle.bgColor        = getValue(ps, "bgColor",        "#F8F8F8");
        this.settings.panelStyle.bgOpacity      = getValue(ps, "bgOpacity",      30);

        const pl = objects?.panelLayout;
        this.settings.panelLayout.columns        = getValue(pl, "columns",        0);
        this.settings.panelLayout.minPanelWidth  = getValue(pl, "minPanelWidth",  120);
        this.settings.panelLayout.enableScroll   = getValue(pl, "enableScroll",   true);
        this.settings.panelLayout.minPanelHeight = getValue(pl, "minPanelHeight", 120);
        this.settings.panelLayout.barBorderRadius = getValue(pl, "barBorderRadius", 2);

        const al = objects?.analyticalLines;
        this.settings.analyticalLines.showAverage = getValue(al, "showAverage", false);
        this.settings.analyticalLines.showMax     = getValue(al, "showMax",     false);
        this.settings.analyticalLines.showMin     = getValue(al, "showMin",     false);
        this.settings.analyticalLines.showMedian  = getValue(al, "showMedian",  false);
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

        const leg = objects?.legend;
        this.settings.legend.show     = getValue(leg, "show",     false);
        this.settings.legend.position = getValue(leg, "position", "bottom");
        this.settings.legend.textColor = getValue(leg, "textColor", "#444444");

        const acc = objects?.accessibility;
        this.settings.accessibility.highContrastMode = getValue(acc, "highContrastMode", false);

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
        try {
            const s = this.localization?.getDisplayName(key);
            return s && s !== key ? s : fallback;
        } catch (_) {
            return fallback;
        }
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
        return (this.host as any)?.allowInteractions !== false;
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
        quiere: { yLabels: boolean; legend: boolean; legendPos: string }
    ) {
        // La leyenda es lo primero que sobra: repite lo que ya dice el color de la barra.
        // 24 px sobre un visual de 150 es el 16% del alto para dos palabras.
        const legend = quiere.legend && LEGEND_H <= height * 0.15;
        const legendH = legend ? LEGEND_H : 0;

        const oMT = 8 + (legend && quiere.legendPos === "top"    ? legendH : 0);
        const oMB = 8 + (legend && quiere.legendPos === "bottom" ? legendH : 0);
        const oMR = 8;

        // El eje Y se MIDE. 48 px fijos esta bien a 600 de ancho y es absurdo a 200,
        // donde se comia una cuarta parte del grafico.
        const pedido = Math.ceil(anchoEtiquetaY + 10);
        const anchoUtil = width - 8 - oMR;
        const yLabels = quiere.yLabels && anchoUtil / ncols >= 90 && pedido <= width * 0.25;
        const oML = yLabels ? Math.min(pedido, Math.floor(width * 0.25)) : 8;

        const cellW = Math.max((width - oML - oMR) / ncols, 1);
        const cellH = Math.max((height - oMT - oMB) / nrows, 1);
        const cellPad = (cellW < 120 || cellH < 100) ? 4 : 10;

        return { legend, legendH, yLabels, oML, oMT, oMR, oMB, cellPad };
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
        const categories  = categorical.categories[0];
        const values      = categorical.values;
        const host        = this.host;
        const width       = options.viewport.width;
        const height      = options.viewport.height;

        this.svg
            .attr("width", width)
            .attr("height", height)
            .attr("role", "img")
            .attr("aria-label", "Bar Chart with Variation % — " + (categories?.source?.displayName || ""));

        const hasHighlights     = values[0]?.highlights != null;
        // Las categorias se formatean con el format string de su propia columna. Sin esto,
        // una columna de fecha llega como objeto Date y toString() devuelve la cadena
        // completa de JavaScript ("Mon Jan 01 2026 00:00:00 GMT+0100 (...)"): 40 caracteres
        // por etiqueta que se pisan entre si y hacen ilegible el eje.
        const catFormatter: IValueFormatter = valueFormatter.create({
            format: categories.source.format,
            cultureSelector: host.locale
        });
        let catValues           = categories.values.map(v => {
            if (v === null || v === undefined) { return ""; }
            return v instanceof Date || categories.source.format
                ? catFormatter.format(v)
                : v.toString();
        });

        // ── Sort order ─────────────────────────────────────────────────────
        // El orden es gratuito: ya funcionaba sin licencia en la 1.9.0.0 publicada, y
        // las directrices de Microsoft no permiten recortar funcionalidad gratuita.
        const sortOrder = this.settings.axisSettings.sortOrder;
        // sortIndexMap[newIndex] = originalIndex — keeps data aligned with labels
        let sortIndexMap: number[] = catValues.map((_, i) => i);
        if (sortOrder !== "auto") {
            sortIndexMap.sort((a, b) =>
                catValues[a].localeCompare(catValues[b], undefined, { numeric: true })
            );
            if (sortOrder === "desc") sortIndexMap.reverse();
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
                    host.createSelectionIdBuilder().withSeries(values, group).withCategory(categories, origCi).createSelectionId()
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
                    host.createSelectionIdBuilder().withCategory(categories, origCi).createSelectionId()
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
        if (seriesList.length > maxPanels) attempted.push(`more than ${maxPanels} panels`);
        if (lines.showAverage || lines.showMax || lines.showMin || lines.showMedian || lines.showRef) attempted.push("analytical lines");
        if (lines.showBand) attempted.push("the reference band");
        if (this.settings.valueLabels.show) attempted.push("value labels");
        if (seriesList.some(s => s.cfColors.some(c => c != null))) attempted.push("per-bar colours");
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
                ? `the ${REF_LABELS[refBound[0]]} reference`
                : "the reference measures");
        }
        const usesRefAny = cmpRoleSel !== "previous"
            && seriesList.some(s => !!s.refValues[cmpRoleSel]);
        if (usesRefAny && this.settings.comparison.varianceMode !== "relative") {
            attempted.push("absolute variance");
        }
        this.attemptedPro = this.isPro ? [] : attempted;

        // Pro-only features: enforce when not licensed and not in Pro preview
        if (!this.isPro && !preview) {
            // 1. Analytical lines — disabled
            this.settings.analyticalLines.showAverage = false;
            this.settings.analyticalLines.showMax     = false;
            this.settings.analyticalLines.showMin     = false;
            this.settings.analyticalLines.showMedian  = false;
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
        const fmt: IValueFormatter = valueFormatter.create({
            format: values[0].source.format || "#,0",
            value:  fmtUnits,
            precision: this.settings.valueLabels.valueDecimalPlaces,
            cultureSelector: host.locale,
            displayUnitSystemType: 2
        });

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
        ) * yFs * 0.60;

        const L = this.layoutFor(width, height, ncols, nrows, anchoEtiquetaY, {
            yLabels:   this.settings.axisSettings.showYLabels,
            legend:    this.settings.legend.show,
            legendPos
        });
        this.settings.axisSettings.showYLabels = L.yLabels;
        this.settings.legend.show              = L.legend;

        const oML = L.oML, oMT = L.oMT, oMR = L.oMR, oMB = L.oMB;
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
        const estLblW    = longestCat.length * xFs * 0.60;
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
        this.settings.variationLabels.show = varH > 0 && this.settings.variationLabels.show;
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

        // ── Y axis — one per ROW on the left side of the grid ─────────────
        if (this.settings.axisSettings.showYLabels) {
            for (let r = 0; r < nrows; r++) {
                const yOffsetForRow = oMT + r * cellH + cellPad + titleH + varH;
                const yAxisG = this.chartGroup.append("g")
                    .attr("transform", `translate(${oML - 4},${yOffsetForRow})`);
                d3.axisLeft(y).ticks(4).tickSize(0).tickFormat((d: any) => fmt.format(d))(yAxisG as any);
                yAxisG.select(".domain").remove();
                yAxisG.selectAll("text")
                    .style("fill", this.settings.barSettings.axisTextColor)
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
                        .attr("aria-label", "Drill up")
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
                        .attr("aria-label", "Drill down")
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

                pg.append("text")
                    .attr("x", innerW / 2)
                    .attr("y", conFondo ? (isBottom ? titleLineY + titleH / 2 : titleH / 2) : titleTextY)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", conFondo ? "central" : null)
                    .style("font-size", `${titleFontSize}px`)
                    .style("font-weight", "700")
                    .style("fill", textoTitulo)
                    .text(series.name);
            }

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
                const v      = series.values[ci];
                const hl     = series.highlights[ci];
                const pv     = ci > 0 ? series.values[ci - 1] : null;
                // Con referencia enlazada se compara contra ella; si no, contra la barra anterior.
                const base   = useRef ? refArr[ci] : pv;
                const isNeg  = v < 0 || (base !== null && base !== undefined && v < base);
                // Color priority: CF rule (per-bar) > negative color > series color
                const cfColor = (this.isPro || preview) && !this.hcActive()
                    ? series.cfColors[ci] : null;
                const fill    = cfColor
                    ? cfColor
                    : (isNeg ? negFill : series.color);
                const opac   = (hasHighlights && hl == null) ? barOpacity * 0.3 : barOpacity;
                const bx     = x(cat);
                const bw     = x.bandwidth();
                const by     = y(Math.max(0, v));
                const bh     = Math.max(Math.abs(y(v) - y(0)), 1);

                // Aria label: panel, category, value, variation vs prior period
                let ariaLabel = `${series.name}, ${cat}: ${fmt.format(v)}`;
                if (base !== null && base !== undefined && base !== 0) {
                    const varPct = ((v - base) / Math.abs(base) * 100).toFixed(dp);
                    const sign   = Number(varPct) >= 0 ? "+" : "";
                    ariaLabel   += `, variation from ${useRef ? refLabel : "previous"}: ${sign}${varPct}%`;
                }

                // Tooltip data for this bar
                const tooltipItems: VisualTooltipDataItem[] = [];
                tooltipItems.push({
                    displayName: cat,
                    value: fmt.format(v),
                    color: fill === `url(#${patternId})` ? negColor : fill,
                    header: series.name
                });
                if (base !== null && base !== undefined) {
                    tooltipItems.push({
                        displayName: useRef ? refLabel : "Previous",
                        value: fmt.format(base)
                    });
                    if (base !== 0) {
                        const absDelta = v - base;
                        const varPct   = (absDelta / Math.abs(base)) * 100;
                        const sign     = absDelta >= 0 ? "+" : "";
                        tooltipItems.push({
                            displayName: "Change",
                            value: `${sign}${fmt.format(absDelta)}`
                        });
                        tooltipItems.push({
                            displayName: "Variation %",
                            value: `${sign}${varPct.toFixed(dp)}%`,
                            color: isNeg
                                ? this.settings.variationLabels.negativeColor
                                : this.settings.variationLabels.positiveColor
                        });
                    }
                }

                // Extra tooltip fields dragged into the Tooltips bucket
                series.tooltipFields.forEach(tf => {
                    const tv = tf.values[ci];
                    if (tv !== null) {
                        const tfFmt = tf.format
                            ? valueFormatter.create({ format: tf.format })
                            : valueFormatter.create({});
                        tooltipItems.push({ displayName: tf.name, value: tfFmt.format(tv) });
                    }
                });

                const selId    = series.barSelectionIds[ci];
                const selMgr   = this.selectionManager;
                const interactive = this.interactive();

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
                ca.append("rect")
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
                    .style("cursor", interactive ? "pointer" : "default")
                    .attr("role", "img")
                    .attr("aria-label", ariaLabel)
                    .attr("tabindex", "0")
                    .on("click", function(event: MouseEvent) {
                        if (!interactive) { return; }
                        event.stopPropagation();
                        const multiSelect = event.ctrlKey || event.metaKey;
                        selMgr.select(selId, multiSelect).then(() => { /* update handled by Power BI */ });
                    })

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
                    const lbl = ca.append("text")
                        .attr("x", lx).attr("y", ly)
                        .attr("text-anchor", xAngle !== 0 ? "end" : "middle")
                        .style("font-size", `${xFs}px`)
                        .style("fill", this.settings.barSettings.axisTextColor)
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
                    const pct    = (delta / Math.abs(Number(rv))) * 100;
                    const isPos  = delta >= 0;
                    const vColor = isPos ? this.settings.variationLabels.positiveColor
                                         : this.settings.variationLabels.negativeColor;
                    const arrow  = this.settings.variationLabels.showArrows ? (isPos ? "▲ " : "▼ ") : "";
                    const sign   = isPos ? "+" : "";
                    const rel    = `${sign}${pct.toFixed(dp)}%`;
                    const abs    = `${sign}${fmt.format(delta)}`;
                    const txt    = mode === "absolute" ? abs
                                 : mode === "both"     ? `${abs} (${rel})`
                                 :                       rel;
                    pg.append("text")
                        .attr("x", x(catValues[i]) + x.bandwidth() / 2)
                        .attr("y", titleH + varH - 8)
                        .attr("text-anchor", "middle")
                        .style("font-size", `${this.settings.variationLabels.fontSize}px`)
                        .style("font-weight", "bold").style("fill", vColor)
                        .attr("aria-hidden", "true")
                        .text(`${arrow}${txt}`);
                }
            } else if (this.settings.variationLabels.show && varH > 0) {
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
                    const arrow  = this.settings.variationLabels.showArrows ? (isPos ? "▲ " : "▼ ") : "";
                    const sign   = isPos ? "+" : "";

                    // Bracket connector in pg coords (spans from bar tops up into varH zone)
                    if (this.settings.variationLabels.showConnectors) {
                        const bTop1 = titleH + varH + y(v1);
                        const bTop2 = titleH + varH + y(v2);
                        const bktY  = titleH + varH - 2;
                        pg.append("polyline")
                            .attr("points", `${xc1},${bTop1} ${xc1},${bktY} ${xc2},${bktY} ${xc2},${bTop2}`)
                            .attr("fill", "none")
                            .attr("stroke", this.settings.barSettings.connectorColor)
                            .attr("stroke-width", 1).attr("stroke-dasharray", "2,2");
                    }

                    pg.append("text")
                        .attr("x", (xc1 + xc2) / 2).attr("y", titleH + varH - 8)
                        .attr("text-anchor", "middle")
                        .style("font-size", `${this.settings.variationLabels.fontSize}px`)
                        .style("font-weight", "bold").style("fill", vColor)
                        .text(`${arrow}${sign}${diff.toFixed(this.settings.variationLabels.decimalPlaces)}%`);
                }
            }
        });

        // ── Analytical Lines + Bands ───────────────────────────────────────
        const al    = this.settings.analyticalLines;
        const allValsFlat = visible.flatMap(s => s.values);

        if (al.showBand && al.bandMax > al.bandMin) {
            const bandY1 = y(al.bandMax);
            const bandY2 = y(al.bandMin);
            const bandH  = Math.abs(bandY2 - bandY1);
            gridG.append("rect")
                .attr("x", 0).attr("y", bandY1 + (nrows > 1 ? cellPad + titleH + varH : cellPad + titleH + varH))
                .attr("width", gridW).attr("height", bandH * nrows)
                .attr("fill", al.bandColor)
                .attr("opacity", al.bandOpacity / 100)
                .attr("pointer-events", "none")
                .attr("aria-hidden", "true");
        }

        const lineConfigs: { show: boolean; value: number; label: string }[] = [
            { show: al.showAverage, value: d3.mean(allValsFlat) || 0,     label: "Avg" },
            { show: al.showMax,     value: d3.max(allValsFlat)  || 0,     label: "Max" },
            { show: al.showMin,     value: d3.min(allValsFlat)  || 0,     label: "Min" },
            { show: al.showMedian,  value: d3.median(allValsFlat) || 0,   label: "Median" },
            { show: al.showRef,     value: al.refValue,                   label: fmt.format(al.refValue) }
        ];

        const strokeDash = al.lineStyle === "dashed" ? "6,3"
                         : al.lineStyle === "dotted" ? "2,3"
                         : null;

        for (const lc of lineConfigs) {
            if (!lc.show) continue;
            // Draw one line per row, at the correct y position inside each row's chart area
            for (let r = 0; r < nrows; r++) {
                const lineY = oMT + r * cellH + cellPad + titleH + varH + y(lc.value);
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
                .text("Positive");

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
                .text("Negative");
        }

        // ── Watermark & freemium message ───────────────────────────────────
        this.renderWatermark(svgWidth, svgHeight, preview && this.attemptedPro.length > 0);
        // Nota neutra, sin llamada a comprar: la ruta de compra es la notificacion de Power BI.
        const msgData = isLimited ? [`Showing ${maxPanels} of ${seriesList.length} panels`] : [];
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
            ["1. Drag a date or category field to Axis.", 12, "400", "#535146", 26],
            ["2. Drag a numeric measure to Values: variation % appears between bars.", 12, "400", "#535146", 20],
            ["3. Optional: Small Multiple splits the chart into panels; Tooltips adds fields.", 12, "400", "#535146", 20],
            ["Pro plan on Microsoft AppSource: up to 100 panels, analytical lines,", 12, "600", "#83827D", 30],
            ["reference band, value labels and per-bar colours.", 12, "600", "#83827D", 18]
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

    public enumerateObjectInstances(options: powerbi.EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstanceEnumeration {
        // El panel muestra lo que eligio el usuario, no lo que pinta el tier gratuito:
        // si no, un ajuste Pro se apagaba solo al activarlo.
        const effective = this.settings;
        if (this.rawSettings) this.settings = this.rawSettings;
        try {
            return this.enumerateInstances(options);
        } finally {
            this.settings = effective;
        }
    }

    private enumerateInstances(options: powerbi.EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstance[] {
        const objectName = options.objectName;
        const instances: powerbi.VisualObjectInstance[] = [];
        switch (objectName) {
            case "barSettings":
                instances.push({ objectName, selector: null, properties: {
                    barColor:       this.settings.barSettings.barColor,
                    negativeColor:  this.settings.barSettings.negativeColor,
                    barOpacity:     this.settings.barSettings.barOpacity,
                    axisTextColor:  this.settings.barSettings.axisTextColor,
                    borderColor:    this.settings.barSettings.borderColor,
                    borderWidth:    this.settings.barSettings.borderWidth,
                    connectorColor: this.settings.barSettings.connectorColor
                }});
                break;
            case "comparison":
                instances.push({ objectName, selector: null, properties: {
                    compareTo:    this.settings.comparison.compareTo,
                    varianceMode: this.settings.comparison.varianceMode,
                    showMarker:   this.settings.comparison.showMarker,
                    markerColor:  this.settings.comparison.markerColor
                }});
                break;
            case "variationLabels":
                instances.push({ objectName, selector: null, properties: {
                    show:           this.settings.variationLabels.show,
                    fontSize:       this.settings.variationLabels.fontSize,
                    positiveColor:  this.settings.variationLabels.positiveColor,
                    negativeColor:  this.settings.variationLabels.negativeColor,
                    decimalPlaces:  this.settings.variationLabels.decimalPlaces,
                    showArrows:     this.settings.variationLabels.showArrows,
                    showConnectors: this.settings.variationLabels.showConnectors
                }});
                break;
            case "valueLabels":
                instances.push({ objectName, selector: null, properties: {
                    show:               this.settings.valueLabels.show,
                    color:              this.settings.valueLabels.color,
                    fontSize:           this.settings.valueLabels.fontSize,
                    displayUnits:       this.settings.valueLabels.displayUnits,
                    valueDecimalPlaces: this.settings.valueLabels.valueDecimalPlaces
                }});
                break;
            case "panelTitle":
                instances.push({ objectName, selector: null, properties: {
                    show:           this.settings.panelTitle.show,
                    position:       this.settings.panelTitle.position,
                    fontSize:       this.settings.panelTitle.fontSize,
                    titleStyle:      this.settings.panelTitle.titleStyle,
                    backgroundColor: { solid: { color: this.settings.panelTitle.backgroundColor } },
                    useSeriesColor: this.settings.panelTitle.useSeriesColor,
                    customColor:    { solid: { color: this.settings.panelTitle.customColor } }
                }});
                break;
            case "axisSettings":
                instances.push({ objectName, selector: null, properties: {
                    sortOrder:   this.settings.axisSettings.sortOrder,
                    showXLabels: this.settings.axisSettings.showXLabels,
                    xLabelAngle: this.settings.axisSettings.xLabelAngle,
                    showYLabels: this.settings.axisSettings.showYLabels,
                    xFontSize:   this.settings.axisSettings.xFontSize,
                    yFontSize:   this.settings.axisSettings.yFontSize
                }});
                break;
            case "panelStyle":
                instances.push({ objectName, selector: null, properties: {
                    showBackground: this.settings.panelStyle.showBackground,
                    bgColor:        { solid: { color: this.settings.panelStyle.bgColor } },
                    bgOpacity:      this.settings.panelStyle.bgOpacity
                }});
                break;
            case "panelLayout":
                instances.push({ objectName, selector: null, properties: {
                    columns:         this.settings.panelLayout.columns,
                    minPanelWidth:   this.settings.panelLayout.minPanelWidth,
                    minPanelHeight:  this.settings.panelLayout.minPanelHeight,
                    enableScroll:    this.settings.panelLayout.enableScroll,
                    barBorderRadius: this.settings.panelLayout.barBorderRadius
                }});
                break;
            case "analyticalLines":
                instances.push({ objectName, selector: null, properties: {
                    showAverage: this.settings.analyticalLines.showAverage,
                    showMax:     this.settings.analyticalLines.showMax,
                    showMin:     this.settings.analyticalLines.showMin,
                    showMedian:  this.settings.analyticalLines.showMedian,
                    showRef:     this.settings.analyticalLines.showRef,
                    refValue:    this.settings.analyticalLines.refValue,
                    lineColor:   { solid: { color: this.settings.analyticalLines.lineColor } },
                    lineStyle:   this.settings.analyticalLines.lineStyle,
                    showLabel:   this.settings.analyticalLines.showLabel,
                    labelSize:   this.settings.analyticalLines.labelSize,
                    showBand:    this.settings.analyticalLines.showBand,
                    bandMin:     this.settings.analyticalLines.bandMin,
                    bandMax:     this.settings.analyticalLines.bandMax,
                    bandColor:   { solid: { color: this.settings.analyticalLines.bandColor } },
                    bandOpacity: this.settings.analyticalLines.bandOpacity
                }});
                break;
            case "legend":
                instances.push({ objectName, selector: null, properties: {
                    show:      this.settings.legend.show,
                    position:  this.settings.legend.position,
                    textColor: { solid: { color: this.settings.legend.textColor } }
                }});
                break;
            case "accessibility":
                instances.push({ objectName, selector: null, properties: {
                    highContrastMode: this.settings.accessibility.highContrastMode
                }});
                break;
            case "dataColors": {
                if (!this.dataView?.categorical?.categories?.[0]) break;
                const cats = this.dataView.categorical.categories[0];
                cats.values.forEach((val: any, ci: number) => {
                    const label = val?.toString() || String(ci);
                    const catObjs: any = cats.objects?.[ci];
                    const fc = catObjs?.dataColors?.fill?.solid?.color
                        ?? this.settings.barSettings.barColor;
                    instances.push({
                        objectName, displayName: label,
                        selector: cats.identity?.[ci]
                            ? { data: [cats.identity[ci]] }
                            : null,
                        properties: { fill: { solid: { color: fc } } }
                    });
                });
                break;
            }
            case "colorSelector": {
                if (!this.dataView?.categorical?.values) break;
                const values = this.dataView.categorical.values;
                const sv = values.grouped ? values.grouped() : values;
                sv.forEach((s: any) => {
                    const dn  = s.name?.toString() || (s.source ? s.source.displayName : "Series");
                    const objs: any = s.objects;
                    // El selector tiene que ensenar lo que se PINTA. Sin color propio de
                    // serie, la barra usa el color por defecto del ajuste general, no el
                    // del tema: si aqui se mostrara el del tema, el panel volveria a decir
                    // una cosa y el lienzo otra.
                    const fc  = objs?.colorSelector?.fill
                        ? objs.colorSelector.fill.solid.color
                        : this.settings.barSettings.barColor;
                    instances.push({
                        objectName, displayName: dn,
                        selector: s.identity ? s.identity.getSelector() : (s.source ? { metadata: s.source.queryName } : null),
                        properties: { fill: { solid: { color: fc } } }
                    });
                });
                break;
            }
        }
        return instances;
    }
}
