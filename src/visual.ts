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

type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

interface BarDatum {
    selectionId: powerbi.visuals.ISelectionId;
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
        fontSize: number;
        useSeriesColor: boolean;
        customColor: string;
    };
}

interface SeriesData {
    name: string;
    values: number[];
    highlights: (number | null)[];
    color: string;
    selectionId: powerbi.visuals.ISelectionId;
    barSelectionIds: powerbi.visuals.ISelectionId[];
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
            fontSize: 11,
            useSeriesColor: true,
            customColor: "#333333"
        }
    };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;
        this.licenseManager = options.host.licenseManager;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();

        this.svg = d3.select(this.target)
            .append("svg")
            .classed("bar-variation-chart", true)
            .style("overflow", "visible");

        this.legendGroup  = this.svg.append("g").classed("legend-group",   true);
        this.chartGroup   = this.svg.append("g").classed("chart-group",    true);
        this.watermarkGroup= this.svg.append("g").classed("watermark-group",true);
        this.messageGroup = this.svg.append("g").classed("message-group",  true);

        // Context menu — registered ONCE on SVG root.
        // Rects store their selectionId as D3 datum; we read it here on right-click.
        const selMgr = this.selectionManager;
        this.svg.on("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const target = event.target as SVGElement;
            const datum  = d3.select(target).datum() as BarDatum;
            const sid    = datum && datum.selectionId ? datum.selectionId : null;
            selMgr.showContextMenu(sid, { x: event.clientX, y: event.clientY });
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
        this.settings.panelTitle.fontSize       = getValue(pT, "fontSize",       11);
        this.settings.panelTitle.useSeriesColor = getValue(pT, "useSeriesColor", true);
        this.settings.panelTitle.customColor    = getValue(pT, "customColor",    "#333333");
    }

    private render(options: VisualUpdateOptions) {
        this.clear();
        const categorical = this.dataView.categorical;
        const categories  = categorical.categories[0];
        const values      = categorical.values;
        const host        = this.host;
        const width       = options.viewport.width;
        const height      = options.viewport.height;

        this.svg.attr("width", width).attr("height", height);

        const hasHighlights     = values[0]?.highlights != null;
        const catValues         = categories.values.map(v => v?.toString() || "");
        const seriesList: SeriesData[] = [];
        const colorPalette      = host.colorPalette;
        const grouped           = values.grouped ? values.grouped() : null;
        const barColorSetting   = this.settings.barSettings.barColor;
        const negColor          = this.settings.barSettings.negativeColor;
        const barOpacity        = this.settings.barSettings.barOpacity / 100;

        // ── Build series list ──────────────────────────────────────────────
        if (grouped && grouped.length > 0) {
            for (let i = 0; i < grouped.length; i++) {
                const group = grouped[i];
                const name  = group.name?.toString() || "Series";
                const sv    = group.values[0].values.map(v => Number(v) || 0);
                const sh    = (group.values[0].highlights || []).map(v => v != null ? Number(v) : null);
                const sid   = host.createSelectionIdBuilder().withSeries(values, group).createSelectionId();
                const bsids = catValues.map((_, ci) =>
                    host.createSelectionIdBuilder().withSeries(values, group).withCategory(categories, ci).createSelectionId()
                );
                let color = barColorSetting;
                const objs: any = group.objects;
                if (objs?.colorSelector?.fill) {
                    color = objs.colorSelector.fill.solid.color;
                } else if (!barColorSetting || barColorSetting === "#378ADD") {
                    color = colorPalette.getColor(name).value;
                }
                seriesList.push({ name, values: sv, highlights: sh, color, selectionId: sid, barSelectionIds: bsids });
            }
        } else {
            for (let i = 0; i < values.length; i++) {
                const val  = values[i];
                const name = val.source.displayName || "Measure";
                const sv   = val.values.map(v => Number(v) || 0);
                const sh   = (val.highlights || []).map(v => v != null ? Number(v) : null);
                const sid  = host.createSelectionIdBuilder().withMeasure(val.source.queryName).createSelectionId();
                const bsids = catValues.map((_, ci) =>
                    host.createSelectionIdBuilder().withCategory(categories, ci).createSelectionId()
                );
                let color = barColorSetting;
                const objs: any = val.objects;
                if (objs?.colorSelector?.fill) {
                    color = objs.colorSelector.fill.solid.color;
                } else if (!barColorSetting || barColorSetting === "#378ADD") {
                    color = colorPalette.getColor(name).value;
                }
                seriesList.push({ name, values: sv, highlights: sh, color, selectionId: sid, barSelectionIds: bsids });
            }
        }

        if (seriesList.length === 0) return;

        // Free tier
        const maxPanels = 3;
        const isLimited = !this.isPro && seriesList.length > maxPanels;
        const visible   = isLimited ? seriesList.slice(0, maxPanels) : seriesList;

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

        const oML  = 48;  // outer left margin for Y-axis labels
        const oMT  = 8;
        const oMR  = 8;
        const oMB  = 20;

        const gridW  = width  - oML - oMR;
        const gridH  = height - oMT - oMB;
        const cellW  = Math.max(gridW  / ncols, 40);
        const cellH  = Math.max(gridH  / nrows, 40);

        const cellPad = 10;   // padding inside each cell
        const titleH  = 22;   // panel title height
        const varH    = this.settings.variationLabels.show ? 30 : 0;
        const xLblH   = 20;
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
        for (let r = 0; r < nrows; r++) {
            const yOffsetForRow = oMT + r * cellH + cellPad + titleH + varH;
            const yAxisG = this.chartGroup.append("g")
                .attr("transform", `translate(${oML - 4},${yOffsetForRow})`);
            d3.axisLeft(y).ticks(4).tickSize(0).tickFormat((d: any) => fmt.format(d))(yAxisG as any);
            yAxisG.select(".domain").remove();
            yAxisG.selectAll("text")
                .style("fill", this.settings.barSettings.axisTextColor)
                .style("font-size", "9px");
        }

        // ── Panel title settings ───────────────────────────────────────────
        const titleFontSize = this.settings.panelTitle.fontSize;
        const useSeriesColor = this.settings.panelTitle.useSeriesColor;
        const titleCustomColor = this.settings.panelTitle.customColor;

        // ── Draw each panel ────────────────────────────────────────────────
        visible.forEach((series, pi) => {
            const col = pi % ncols;
            const row = Math.floor(pi / ncols);
            const cx  = col * cellW;
            const cy  = row * cellH;

            const pg = gridG.append("g")
                .attr("class", "sm-panel")
                .attr("transform", `translate(${cx + cellPad},${cy + cellPad})`);

            // ── Panel title ────────────────────────────────────────────────
            const titleColor = useSeriesColor ? series.color : titleCustomColor;
            pg.append("text")
                .attr("x", innerW / 2).attr("y", titleH - 5)
                .attr("text-anchor", "middle")
                .style("font-size", `${titleFontSize}px`)
                .style("font-weight", "700")
                .style("fill", titleColor)
                .text(series.name);

            pg.append("line")
                .attr("x1", 0).attr("y1", titleH)
                .attr("x2", innerW).attr("y2", titleH)
                .attr("stroke", titleColor)
                .attr("stroke-width", 1.5).attr("opacity", 0.35);

            // ── Chart area ─────────────────────────────────────────────────
            const ca = pg.append("g").attr("transform", `translate(0,${titleH + varH})`);

            // Zero line
            ca.append("line")
                .attr("x1", 0).attr("y1", y(0)).attr("x2", innerW).attr("y2", y(0))
                .attr("stroke", this.settings.barSettings.axisTextColor)
                .attr("stroke-width", 0.5).attr("opacity", 0.5);

            const x = d3.scaleBand().domain(catValues).rangeRound([0, innerW]).paddingInner(0.35);

            // ── Bars + labels ──────────────────────────────────────────────
            catValues.forEach((cat, ci) => {
                const v      = series.values[ci];
                const hl     = series.highlights[ci];
                const pv     = ci > 0 ? series.values[ci - 1] : null;
                const isNeg  = v < 0 || (pv !== null && v < pv);
                const fill   = isNeg ? negColor : series.color;
                const opac   = (hasHighlights && hl == null) ? barOpacity * 0.3 : barOpacity;
                const bx     = x(cat);
                const bw     = x.bandwidth();
                const by     = y(Math.max(0, v));
                const bh     = Math.max(Math.abs(y(v) - y(0)), 1);

                // selectionId stored as D3 datum — SVG-root contextmenu handler reads it
                ca.append("rect")
                    .datum({ selectionId: series.barSelectionIds[ci] } as BarDatum)
                    .attr("x", bx).attr("y", by)
                    .attr("width", bw).attr("height", bh)
                    .attr("fill", fill).attr("opacity", opac)
                    .attr("rx", 2).style("cursor", "pointer");

                // X label
                ca.append("text")
                    .attr("x", bx + bw / 2).attr("y", innerH + 14)
                    .attr("text-anchor", "middle").style("font-size", "9px")
                    .style("fill", this.settings.barSettings.axisTextColor)
                    .text(cat);

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

        // ── Watermark & freemium message ───────────────────────────────────
        this.renderWatermark(width, height);
        const msgData = isLimited ? [`Pro: +${seriesList.length - maxPanels} more panels`] : [];
        this.messageGroup.selectAll(".freemium-msg").data(msgData)
            .join("text").classed("freemium-msg", true)
            .attr("x", width / 2).attr("y", height - 6)
            .attr("text-anchor", "middle")
            .style("font-size", "11px").style("font-weight", "bold").style("fill", "#FF4081")
            .text(d => d);
    }

    private renderWatermark(width: number, height: number) {
        this.watermarkGroup.selectAll(".watermark-text").data(["tcviz.com"])
            .join("text").classed("watermark-text", true)
            .attr("x", width - 10).attr("y", height - 10)
            .attr("text-anchor", "end")
            .style("font-size", "10px").style("fill", "#666")
            .style("opacity", 0.4).style("pointer-events", "none")
            .text(d => d);
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
                    fontSize:       this.settings.panelTitle.fontSize,
                    useSeriesColor: this.settings.panelTitle.useSeriesColor,
                    customColor:    { solid: { color: this.settings.panelTitle.customColor } }
                }});
                break;
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
