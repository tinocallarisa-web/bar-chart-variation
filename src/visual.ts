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
        gridLineColor: string;
        connectorColor: string;
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
        useSeriesColor: boolean;
        customColor: string;
    };
    axisSettings: {
        sortOrder: string;
        showXLabels: boolean;
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
        minPanelWidth: number;
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
    selectionId: powerbi.visuals.ISelectionId;
    barSelectionIds: powerbi.visuals.ISelectionId[];
    tooltipFields: TooltipField[];
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
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private isPro: boolean = false;
    private dataView: DataView;

    private settings: VisualSettings = {
        barSettings: {
            barColor: "#378ADD",
            negativeColor: "#E24B4A",
            barOpacity: 100,
            axisTextColor: "#666666",
            gridLineColor: "#EAEAEA",
            connectorColor: "#333333"
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
            useSeriesColor: true,
            customColor: "#333333"
        },
        axisSettings: {
            sortOrder:   "auto",
            showXLabels: true,
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
            minPanelWidth: 120,
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
            position: "bottom"
        },
        accessibility: {
            highContrastMode: false
        }
    };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
        this.licenseManager = options.host.licenseManager;
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
            const target = event.target as SVGElement;
            const datum  = d3.select(target).datum() as BarDatum;
            const sid    = datum && datum.selectionId ? datum.selectionId : null;
            selMgr.showContextMenu(sid, { x: event.clientX, y: event.clientY });
        });
        // Click on background clears selection
        this.svg.on("click", () => {
            selMgr.clear();
        });
    }

    public async update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);
        try {
            // Production license check via Microsoft AppSource
            try {
                const licenseResult = await this.licenseManager.getAvailableServicePlans();
                this.isPro = licenseResult.plans?.some(
                    plan => plan.spIdentifier === "bar-chart-variation-pro-tcviz" &&
                            plan.state === ServicePlanState.Active
                ) ?? false;
            } catch (_) {
                this.isPro = false;
            }

            this.dataView = options.dataViews[0];
            if (!this.dataView || !this.dataView.categorical ||
                !this.dataView.categorical.categories ||
                !this.dataView.categorical.values) {
                this.clear();
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
        this.settings.barSettings.barColor       = getValue(bS, "barColor",       "#378ADD");
        this.settings.barSettings.negativeColor  = getValue(bS, "negativeColor",  "#E24B4A");
        this.settings.barSettings.barOpacity     = getValue(bS, "barOpacity",     100);
        this.settings.barSettings.axisTextColor  = getValue(bS, "axisTextColor",  "#666666");
        this.settings.barSettings.gridLineColor  = getValue(bS, "gridLineColor",  "#EAEAEA");
        this.settings.barSettings.connectorColor = getValue(bS, "connectorColor", "#333333");

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
        this.settings.panelTitle.useSeriesColor = getValue(pT, "useSeriesColor", true);
        this.settings.panelTitle.customColor    = getValue(pT, "customColor",    "#333333");

        const ax = objects?.axisSettings;
        this.settings.axisSettings.sortOrder   = getValue(ax, "sortOrder",   "auto");
        this.settings.axisSettings.showXLabels = getValue(ax, "showXLabels", true);
        this.settings.axisSettings.showYLabels = getValue(ax, "showYLabels", true);
        this.settings.axisSettings.xFontSize   = getValue(ax, "xFontSize",   9);
        this.settings.axisSettings.yFontSize   = getValue(ax, "yFontSize",   9);

        const ps = objects?.panelStyle;
        this.settings.panelStyle.showBackground = getValue(ps, "showBackground", false);
        this.settings.panelStyle.bgColor        = getValue(ps, "bgColor",        "#F8F8F8");
        this.settings.panelStyle.bgOpacity      = getValue(ps, "bgOpacity",      30);

        const pl = objects?.panelLayout;
        this.settings.panelLayout.minPanelWidth  = getValue(pl, "minPanelWidth",  120);
        this.settings.panelLayout.enableScroll   = getValue(pl, "enableScroll",   true);
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

        const acc = objects?.accessibility;
        this.settings.accessibility.highContrastMode = getValue(acc, "highContrastMode", false);
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
        let catValues           = categories.values.map(v => v?.toString() || "");

        // ── Sort order ─────────────────────────────────────────────────────
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
        const colorPalette      = host.colorPalette;
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
            pat.append("rect").attr("width", 3).attr("height", 6).attr("fill", negColor);
            pat.append("rect").attr("x", 3).attr("width", 3).attr("height", 6)
                .attr("fill", "#ffffff").attr("opacity", 0.45);
        }
        const negFill = this.settings.accessibility.highContrastMode
            ? `url(#${patternId})`
            : negColor;

        // ── Build series list ──────────────────────────────────────────────
        if (grouped && grouped.length > 0) {
            for (let i = 0; i < grouped.length; i++) {
                const group = grouped[i];
                // Use Small Multiple value if present, otherwise fall back to measure name
                const name  = (group.name != null && group.name.toString().trim() !== "")
                    ? group.name.toString()
                    : (group.values[0]?.source?.displayName || values[0]?.source?.displayName || "");
                const svRaw = group.values[0].values.map(v => Number(v) || 0);
                const shRaw = (group.values[0].highlights || []).map(v => v != null ? Number(v) : null);
                const sv    = sortIndexMap.map(i => svRaw[i]);
                const sh    = sortIndexMap.map(i => shRaw[i]);
                const sid   = host.createSelectionIdBuilder().withSeries(values, group).createSelectionId();
                const bsids = sortIndexMap.map(origCi =>
                    host.createSelectionIdBuilder().withSeries(values, group).withCategory(categories, origCi).createSelectionId()
                );
                let color = barColorSetting;
                const objs: any = group.objects;
                if (objs?.colorSelector?.fill) {
                    color = objs.colorSelector.fill.solid.color;
                } else if (!barColorSetting || barColorSetting === "#378ADD") {
                    color = colorPalette.getColor(name).value;
                }
                // CF colors: per-bar — check dataColors (fx button) then series-level objects
                const cfColors: (string | null)[] = sortIndexMap.map(origCi => {
                    const catObjs: any = categories.objects?.[origCi];
                    const grpObjs: any = group.values[0].objects?.[origCi];
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
                seriesList.push({ name, values: sv, highlights: sh, color, cfColors, selectionId: sid, barSelectionIds: bsids, tooltipFields });
            }
        } else {
            for (let i = 0; i < values.length; i++) {
                const val  = values[i];
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
                if (objs?.colorSelector?.fill) {
                    color = objs.colorSelector.fill.solid.color;
                } else if (!barColorSetting || barColorSetting === "#378ADD") {
                    color = colorPalette.getColor(name).value;
                }
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
                seriesList.push({ name, values: sv, highlights: sh, color, cfColors, selectionId: sid, barSelectionIds: bsids, tooltipFields });
            }
        }

        if (seriesList.length === 0) return;

        // ── Free / Pro gates ───────────────────────────────────────────────
        const maxPanels = 3;
        const isLimited = !this.isPro && seriesList.length > maxPanels;
        const visible   = isLimited ? seriesList.slice(0, maxPanels) : seriesList;

        // Pro-only features: enforce when not licensed
        if (!this.isPro) {
            // 1. Analytical lines — disabled
            this.settings.analyticalLines.showAverage = false;
            this.settings.analyticalLines.showMax     = false;
            this.settings.analyticalLines.showMin     = false;
            this.settings.analyticalLines.showMedian  = false;
            this.settings.analyticalLines.showRef     = false;
            this.settings.analyticalLines.showBand    = false;
            // 2. Value labels — disabled
            this.settings.valueLabels.show = false;
            // 3. Sort order — forced to auto
            this.settings.axisSettings.sortOrder = "auto";
        }

        // ── Shared Y scale ─────────────────────────────────────────────────
        const allVals = visible.flatMap(s => s.values);
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
        const ncols = numPanels === 1 ? 1 : numPanels <= 4 ? 2 : Math.ceil(Math.sqrt(numPanels));
        const nrows = Math.ceil(numPanels / ncols);

        const legendH    = this.settings.legend.show ? 24 : 0;
        const legendPos  = this.settings.legend.position;

        const oML  = 48;  // outer left margin for Y-axis labels
        const oMT  = 8  + (legendPos === "top"    ? legendH : 0);
        const oMR  = 8;
        const oMB  = 20 + (legendPos === "bottom" ? legendH : 0);

        // ── Scroll: expand SVG if panels would be narrower than minPanelWidth ──
        const minPW  = this.settings.panelLayout.minPanelWidth;
        const scroll = this.settings.panelLayout.enableScroll;
        const naturalCellW = (width - oML - oMR) / ncols;
        const needsScroll  = scroll && naturalCellW < minPW;
        const svgWidth     = needsScroll ? oML + oMR + ncols * minPW : width;

        // Apply scroll style to host container and update SVG width
        this.target.style.overflowX = needsScroll ? "auto" : "hidden";
        this.target.style.overflowY = "hidden";
        this.svg.attr("width", svgWidth);

        const gridW  = svgWidth - oML - oMR;
        const gridH  = height - oMT - oMB;
        const cellW  = Math.max(gridW  / ncols, 40);
        const cellH  = Math.max(gridH  / nrows, 40);

        const cellPad   = 10;   // padding inside each cell
        const showTitle = this.settings.panelTitle.show;
        const titlePos  = this.settings.panelTitle.position; // "top" | "bottom"
        const titleH    = showTitle ? 22 : 0;
        const varH    = this.settings.variationLabels.show ? 30 : 0;
        const xLblH   = this.settings.axisSettings.showXLabels ? 20 : 0;
        const innerW  = Math.max(cellW  - 2 * cellPad, 10);
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

                pg.append("text")
                    .attr("x", innerW / 2).attr("y", titleTextY)
                    .attr("text-anchor", "middle")
                    .style("font-size", `${titleFontSize}px`)
                    .style("font-weight", "700")
                    .style("fill", titleColor)
                    .text(series.name);

                pg.append("line")
                    .attr("x1", 0).attr("y1", titleLineY)
                    .attr("x2", innerW).attr("y2", titleLineY)
                    .attr("stroke", titleColor)
                    .attr("stroke-width", 1.5).attr("opacity", 0.35);
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
            catValues.forEach((cat, ci) => {
                const v      = series.values[ci];
                const hl     = series.highlights[ci];
                const pv     = ci > 0 ? series.values[ci - 1] : null;
                const isNeg  = v < 0 || (pv !== null && v < pv);
                // Color priority: CF rule (per-bar) > negative color > series color
                const cfColor = this.isPro ? series.cfColors[ci] : null;
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
                if (pv !== null && pv !== 0) {
                    const varPct = ((v - pv) / Math.abs(pv) * 100).toFixed(dp);
                    const sign   = Number(varPct) >= 0 ? "+" : "";
                    ariaLabel   += `, variation from previous: ${sign}${varPct}%`;
                }

                // Tooltip data for this bar
                const tooltipItems: VisualTooltipDataItem[] = [];
                tooltipItems.push({
                    displayName: cat,
                    value: fmt.format(v),
                    color: fill === `url(#${patternId})` ? negColor : fill,
                    header: series.name
                });
                if (pv !== null) {
                    tooltipItems.push({
                        displayName: "Previous",
                        value: fmt.format(pv)
                    });
                    if (pv !== 0) {
                        const absDelta = v - pv;
                        const varPct   = (absDelta / Math.abs(pv)) * 100;
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

                // selectionId + tooltipInfo stored as D3 datum
                ca.append("rect")
                    .datum({ selectionId: selId, tooltipInfo: tooltipItems } as BarDatum)
                    .classed("bar-rect", true)
                    .attr("x", bx).attr("y", by)
                    .attr("width", bw).attr("height", bh)
                    .attr("fill", fill).attr("opacity", opac)
                    .attr("rx", this.settings.panelLayout.barBorderRadius).style("cursor", "pointer")
                    .attr("role", "img")
                    .attr("aria-label", ariaLabel)
                    .attr("tabindex", "0")
                    .on("click", function(event: MouseEvent) {
                        event.stopPropagation();
                        const multiSelect = event.ctrlKey || event.metaKey;
                        selMgr.select(selId, multiSelect).then(() => { /* update handled by Power BI */ });
                    })

                // X label
                if (this.settings.axisSettings.showXLabels) {
                    ca.append("text")
                        .attr("x", bx + bw / 2).attr("y", innerH + 14)
                        .attr("text-anchor", "middle")
                        .style("font-size", `${this.settings.axisSettings.xFontSize}px`)
                        .style("fill", this.settings.barSettings.axisTextColor)
                        .text(cat);
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

            // ── Variation labels + bracket connectors ──────────────────────
            if (this.settings.variationLabels.show && varH > 0) {
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
                : height - legendH + 4;
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
                .style("font-size", "10px").style("fill", "#444")
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
                .style("font-size", "10px").style("fill", "#444")
                .text("Negative");
        }

        // ── Watermark & freemium message ───────────────────────────────────
        this.renderWatermark(svgWidth, height);
        const msgData = isLimited ? [`Pro: +${seriesList.length - maxPanels} more panels`] : [];
        this.messageGroup.selectAll(".freemium-msg").data(msgData)
            .join("text").classed("freemium-msg", true)
            .attr("x", svgWidth / 2).attr("y", height - 6)
            .attr("text-anchor", "middle")
            .style("font-size", "11px").style("font-weight", "bold").style("fill", "#FF4081")
            .text(d => d);

        // ── Tooltips via wrapper (handles all mouse events) ─────────────────
        this.tooltipServiceWrapper.addTooltip(
            this.svg.selectAll<Element, BarDatum>(".bar-rect"),
            (d: BarDatum) => d.tooltipInfo,
            (d: BarDatum) => d.selectionId
        );
    }

    private renderWatermark(_width: number, _height: number) {
        this.watermarkGroup.selectAll("*").remove();
    }

    private clear() {
        this.chartGroup.selectAll("*").remove();
        this.legendGroup.selectAll("*").remove();
    }

    public enumerateObjectInstances(options: powerbi.EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstanceEnumeration {
        const objectName = options.objectName;
        const instances: powerbi.VisualObjectInstance[] = [];
        switch (objectName) {
            case "barSettings":
                instances.push({ objectName, selector: null, properties: {
                    barColor:       this.settings.barSettings.barColor,
                    negativeColor:  this.settings.barSettings.negativeColor,
                    barOpacity:     this.settings.barSettings.barOpacity,
                    axisTextColor:  this.settings.barSettings.axisTextColor,
                    gridLineColor:  this.settings.barSettings.gridLineColor,
                    connectorColor: this.settings.barSettings.connectorColor
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
                    useSeriesColor: this.settings.panelTitle.useSeriesColor,
                    customColor:    { solid: { color: this.settings.panelTitle.customColor } }
                }});
                break;
            case "axisSettings":
                instances.push({ objectName, selector: null, properties: {
                    sortOrder:   this.settings.axisSettings.sortOrder,
                    showXLabels: this.settings.axisSettings.showXLabels,
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
                    minPanelWidth:   this.settings.panelLayout.minPanelWidth,
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
                    show:     this.settings.legend.show,
                    position: this.settings.legend.position
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
                    const fc  = objs?.colorSelector?.fill
                        ? objs.colorSelector.fill.solid.color
                        : this.host.colorPalette.getColor(dn).value;
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
