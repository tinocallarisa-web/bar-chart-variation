/**
 * Tarjetas del panel de formato, generadas desde capabilities.json por tools/gen_format_spec.py.
 * No editar a mano: cambiar capabilities.json y regenerar.
 */
export interface SpecItem { value: string; key: string; label: string; }
export interface SpecProp { name: string; key: string; label: string; kind: "bool" | "num" | "color" | "fontSize" | "text" | "enum"; items?: SpecItem[]; }
export interface SpecCard { obj: string; key: string; label: string; props: SpecProp[]; }
export const FORMAT_SPEC: SpecCard[] = [
    {
        "obj": "style",
        "key": "Visual_StyleTemplate",
        "label": "Style template",
        "props": [
            {
                "name": "template",
                "key": "Visual_Template",
                "label": "Template",
                "kind": "enum",
                "items": [
                    {
                        "value": "clean",
                        "key": "Visual_Enum_TplClean",
                        "label": "Report theme"
                    },
                    {
                        "value": "classic",
                        "key": "Visual_Enum_TplClassic",
                        "label": "Classic"
                    },
                    {
                        "value": "ibcs",
                        "key": "Visual_Enum_TplIbcs",
                        "label": "IBCS style"
                    },
                    {
                        "value": "boardroom",
                        "key": "Visual_Enum_TplBoardroom",
                        "label": "Boardroom (Pro)"
                    },
                    {
                        "value": "ledger",
                        "key": "Visual_Enum_TplLedger",
                        "label": "Ledger (Pro)"
                    },
                    {
                        "value": "editorial",
                        "key": "Visual_Enum_TplEditorial",
                        "label": "Editorial (Pro)"
                    },
                    {
                        "value": "signal",
                        "key": "Visual_Enum_TplSignal",
                        "label": "Signal (Pro)"
                    },
                    {
                        "value": "aurora",
                        "key": "Visual_Enum_TplAurora",
                        "label": "Aurora (Pro)"
                    },
                    {
                        "value": "terrace",
                        "key": "Visual_Enum_TplTerrace",
                        "label": "Terrace (Pro)"
                    },
                    {
                        "value": "minimal",
                        "key": "Visual_Enum_TplMinimal",
                        "label": "Minimal"
                    },
                    {
                        "value": "contrast",
                        "key": "Visual_Enum_TplContrast",
                        "label": "Contrast"
                    },
                    {
                        "value": "compact",
                        "key": "Visual_Enum_TplCompact",
                        "label": "Compact"
                    }
                ]
            },
            {
                "name": "guide",
                "key": "Visual_SetupGuide",
                "label": "Setup guide",
                "kind": "bool"
            }
        ]
    },
    {
        "obj": "barSettings",
        "key": "Visual_BarSettings",
        "label": "Bar settings",
        "props": [
            {
                "name": "barColor",
                "key": "Visual_DefaultBarColor",
                "label": "Default bar color",
                "kind": "color"
            },
            {
                "name": "negativeColor",
                "key": "Visual_NegativeBarColor",
                "label": "Negative bar color",
                "kind": "color"
            },
            {
                "name": "barOpacity",
                "key": "Visual_Opacity",
                "label": "Opacity (%)",
                "kind": "num"
            },
            {
                "name": "axisTextColor",
                "key": "Visual_AxisTextColor",
                "label": "Axis text color",
                "kind": "color"
            },
            {
                "name": "borderColor",
                "key": "Visual_BarBorderColor",
                "label": "Bar border color",
                "kind": "color"
            },
            {
                "name": "borderWidth",
                "key": "Visual_BarBorderWidth",
                "label": "Bar border width",
                "kind": "num"
            },
            {
                "name": "connectorColor",
                "key": "Visual_ConnectorColor",
                "label": "Connector color",
                "kind": "color"
            }
        ]
    },
    {
        "obj": "comparison",
        "key": "Visual_Comparison",
        "label": "Comparison",
        "props": [
            {
                "name": "compareTo",
                "key": "Visual_CompareTo",
                "label": "Compare to",
                "kind": "enum",
                "items": [
                    {
                        "value": "previous",
                        "key": "Visual_Enum_PreviousBar",
                        "label": "Previous bar"
                    },
                    {
                        "value": "previousYear",
                        "key": "Visual_Enum_PreviousYear",
                        "label": "Previous Year"
                    },
                    {
                        "value": "plan",
                        "key": "Visual_Enum_Plan",
                        "label": "Plan / Budget"
                    },
                    {
                        "value": "forecast",
                        "key": "Visual_Enum_Forecast",
                        "label": "Forecast"
                    }
                ]
            },
            {
                "name": "varianceMode",
                "key": "Visual_Variance",
                "label": "Variance format (Pro)",
                "kind": "enum",
                "items": [
                    {
                        "value": "relative",
                        "key": "Visual_Enum_Relative",
                        "label": "Relative (%)"
                    },
                    {
                        "value": "absolute",
                        "key": "Visual_Enum_Absolute",
                        "label": "Absolute"
                    },
                    {
                        "value": "both",
                        "key": "Visual_Enum_Both",
                        "label": "Both"
                    }
                ]
            },
            {
                "name": "showMarker",
                "key": "Visual_ReferenceMarker",
                "label": "Reference marker",
                "kind": "bool"
            },
            {
                "name": "markerColor",
                "key": "Visual_MarkerColor",
                "label": "Marker color",
                "kind": "color"
            },
            {
                "name": "referenceAs",
                "key": "Visual_RefAs",
                "label": "Show reference as",
                "kind": "enum",
                "items": [
                    {
                        "value": "marker",
                        "key": "Visual_Enum_RefMarker",
                        "label": "Marker"
                    },
                    {
                        "value": "bar",
                        "key": "Visual_Enum_RefBar",
                        "label": "Bar beside the actual (Pro)"
                    }
                ]
            },
            {
                "name": "refBarColor",
                "key": "Visual_RefBarColor",
                "label": "Reference bar color",
                "kind": "color"
            }
        ]
    },
    {
        "obj": "variationLabels",
        "key": "Visual_VariationLabels",
        "label": "Variation labels",
        "props": [
            {
                "name": "show",
                "key": "Visual_Show",
                "label": "Show",
                "kind": "bool"
            },
            {
                "name": "fontSize",
                "key": "Visual_FontSize",
                "label": "Font size",
                "kind": "fontSize"
            },
            {
                "name": "positiveColor",
                "key": "Visual_PositiveColor",
                "label": "Positive color",
                "kind": "color"
            },
            {
                "name": "negativeColor",
                "key": "Visual_NegativeColor",
                "label": "Negative color",
                "kind": "color"
            },
            {
                "name": "decimalPlaces",
                "key": "Visual_DecimalPlaces",
                "label": "Decimal places",
                "kind": "num"
            },
            {
                "name": "showArrows",
                "key": "Visual_ShowArrows",
                "label": "Show arrows",
                "kind": "bool"
            },
            {
                "name": "showConnectors",
                "key": "Visual_ShowConnectors",
                "label": "Show connectors",
                "kind": "bool"
            }
        ]
    },
    {
        "obj": "valueLabels",
        "key": "Visual_DataLabels",
        "label": "Data labels (Pro)",
        "props": [
            {
                "name": "show",
                "key": "Visual_Show",
                "label": "Show",
                "kind": "bool"
            },
            {
                "name": "color",
                "key": "Visual_Color",
                "label": "Color",
                "kind": "color"
            },
            {
                "name": "fontSize",
                "key": "Visual_FontSize",
                "label": "Font size",
                "kind": "fontSize"
            },
            {
                "name": "displayUnits",
                "key": "Visual_DisplayUnits",
                "label": "Display units",
                "kind": "num"
            },
            {
                "name": "valueDecimalPlaces",
                "key": "Visual_DecimalPlaces",
                "label": "Decimal places",
                "kind": "num"
            }
        ]
    },
    {
        "obj": "panelTitle",
        "key": "Visual_PanelTitle",
        "label": "Panel title",
        "props": [
            {
                "name": "show",
                "key": "Visual_Show",
                "label": "Show",
                "kind": "bool"
            },
            {
                "name": "position",
                "key": "Visual_Position",
                "label": "Position",
                "kind": "enum",
                "items": [
                    {
                        "value": "top",
                        "key": "Visual_Enum_Top",
                        "label": "Top"
                    },
                    {
                        "value": "bottom",
                        "key": "Visual_Enum_Bottom",
                        "label": "Bottom"
                    }
                ]
            },
            {
                "name": "fontSize",
                "key": "Visual_FontSize",
                "label": "Font size",
                "kind": "fontSize"
            },
            {
                "name": "titleStyle",
                "key": "Visual_TitleStyle",
                "label": "Style",
                "kind": "enum",
                "items": [
                    {
                        "value": "line",
                        "key": "Visual_Enum_Line",
                        "label": "Separator line"
                    },
                    {
                        "value": "background",
                        "key": "Visual_Enum_Filled",
                        "label": "Filled header"
                    }
                ]
            },
            {
                "name": "backgroundColor",
                "key": "Visual_HeaderFill",
                "label": "Header fill",
                "kind": "color"
            },
            {
                "name": "useSeriesColor",
                "key": "Visual_UseSeriesColor",
                "label": "Use series color",
                "kind": "bool"
            },
            {
                "name": "customColor",
                "key": "Visual_Color",
                "label": "Color",
                "kind": "color"
            },
            {
                "name": "titleBold",
                "key": "Visual_SmTitleBold",
                "label": "Bold title",
                "kind": "bool"
            },
            {
                "name": "titleAlign",
                "key": "Visual_SmTitleAlign",
                "label": "Title alignment",
                "kind": "enum",
                "items": [
                    {
                        "value": "left",
                        "key": "Visual_Enum_Left",
                        "label": "Left"
                    },
                    {
                        "value": "center",
                        "key": "Visual_Enum_Center",
                        "label": "Center"
                    }
                ]
            }
        ]
    },
    {
        "obj": "axisSettings",
        "key": "Visual_Axis",
        "label": "Axis",
        "props": [
            {
                "name": "sortOrder",
                "key": "Visual_SortOrder",
                "label": "Sort order",
                "kind": "enum",
                "items": [
                    {
                        "value": "auto",
                        "key": "Visual_Enum_Auto",
                        "label": "Auto (Power BI)"
                    },
                    {
                        "value": "asc",
                        "key": "Visual_Enum_Ascending",
                        "label": "Ascending"
                    },
                    {
                        "value": "desc",
                        "key": "Visual_Enum_Descending",
                        "label": "Descending"
                    }
                ]
            },
            {
                "name": "hideEmpty",
                "key": "Visual_HideEmpty",
                "label": "Hide empty categories",
                "kind": "bool"
            },
            {
                "name": "showXLabels",
                "key": "Visual_ShowXLabels",
                "label": "Show X labels",
                "kind": "bool"
            },
            {
                "name": "xLabelAngle",
                "key": "Visual_XLabelAngle",
                "label": "X label angle",
                "kind": "enum",
                "items": [
                    {
                        "value": "auto",
                        "key": "Visual_Enum_Auto2",
                        "label": "Auto"
                    },
                    {
                        "value": "0",
                        "key": "Visual_Enum_Angle0",
                        "label": "Horizontal"
                    },
                    {
                        "value": "-45",
                        "key": "Visual_Enum_Angle45",
                        "label": "Diagonal (45°)"
                    },
                    {
                        "value": "-90",
                        "key": "Visual_Enum_Angle90",
                        "label": "Vertical (90°)"
                    }
                ]
            },
            {
                "name": "showYLabels",
                "key": "Visual_ShowYLabels",
                "label": "Show Y labels",
                "kind": "bool"
            },
            {
                "name": "xFontSize",
                "key": "Visual_XLabelSize",
                "label": "X label size",
                "kind": "fontSize"
            },
            {
                "name": "xColor",
                "key": "Visual_XLabelColor",
                "label": "X label color",
                "kind": "color"
            },
            {
                "name": "xBold",
                "key": "Visual_XLabelBold",
                "label": "X label bold",
                "kind": "bool"
            },
            {
                "name": "xItalic",
                "key": "Visual_XLabelItalic",
                "label": "X label italic",
                "kind": "bool"
            },
            {
                "name": "showXTitle",
                "key": "Visual_ShowXTitle",
                "label": "X axis title",
                "kind": "bool"
            },
            {
                "name": "xTitle",
                "key": "Visual_XTitleText",
                "label": "X title text",
                "kind": "text"
            },
            {
                "name": "yFontSize",
                "key": "Visual_YLabelSize",
                "label": "Y label size",
                "kind": "fontSize"
            },
            {
                "name": "yColor",
                "key": "Visual_YLabelColor",
                "label": "Y label color",
                "kind": "color"
            },
            {
                "name": "yBold",
                "key": "Visual_YLabelBold",
                "label": "Y label bold",
                "kind": "bool"
            },
            {
                "name": "yItalic",
                "key": "Visual_YLabelItalic",
                "label": "Y label italic",
                "kind": "bool"
            },
            {
                "name": "showYTitle",
                "key": "Visual_ShowYTitle",
                "label": "Y axis title",
                "kind": "bool"
            },
            {
                "name": "yTitle",
                "key": "Visual_YTitleText",
                "label": "Y title text",
                "kind": "text"
            }
        ]
    },
    {
        "obj": "panelStyle",
        "key": "Visual_PanelBackground",
        "label": "Panel background",
        "props": [
            {
                "name": "showBackground",
                "key": "Visual_ShowBackground",
                "label": "Show background",
                "kind": "bool"
            },
            {
                "name": "bgColor",
                "key": "Visual_Color",
                "label": "Color",
                "kind": "color"
            },
            {
                "name": "bgOpacity",
                "key": "Visual_Opacity",
                "label": "Opacity (%)",
                "kind": "num"
            },
            {
                "name": "border",
                "key": "Visual_SmBorder",
                "label": "Panel border",
                "kind": "bool"
            },
            {
                "name": "borderColor",
                "key": "Visual_SmBorderColor",
                "label": "Panel border color",
                "kind": "color"
            }
        ]
    },
    {
        "obj": "panelLayout",
        "key": "Visual_PanelLayout",
        "label": "Panel layout",
        "props": [
            {
                "name": "orientation",
                "key": "Visual_Orientation",
                "label": "Orientation",
                "kind": "enum",
                "items": [
                    {
                        "value": "vertical",
                        "key": "Visual_Enum_Vertical",
                        "label": "Vertical (columns)"
                    },
                    {
                        "value": "horizontal",
                        "key": "Visual_Enum_Horizontal",
                        "label": "Horizontal (bars)"
                    }
                ]
            },
            {
                "name": "columns",
                "key": "Visual_Columns",
                "label": "Columns (0 = auto)",
                "kind": "num"
            },
            {
                "name": "minPanelWidth",
                "key": "Visual_MinPanelWidth",
                "label": "Min panel width (px)",
                "kind": "num"
            },
            {
                "name": "minPanelHeight",
                "key": "Visual_MinPanelHeight",
                "label": "Min panel height (px)",
                "kind": "num"
            },
            {
                "name": "enableScroll",
                "key": "Visual_EnableScroll",
                "label": "Enable scroll",
                "kind": "bool"
            },
            {
                "name": "barBorderRadius",
                "key": "Visual_BarCornerRadius",
                "label": "Bar corner radius",
                "kind": "num"
            },
            {
                "name": "gap",
                "key": "Visual_SmGap",
                "label": "Space between panels",
                "kind": "num"
            }
        ]
    },
    {
        "obj": "analyticalLines",
        "key": "Visual_AnalyticalLines",
        "label": "Analytical lines (Pro)",
        "props": [
            {
                "name": "showAverage",
                "key": "Visual_ShowAverage",
                "label": "Show average",
                "kind": "bool"
            },
            {
                "name": "showMax",
                "key": "Visual_ShowMax",
                "label": "Show max",
                "kind": "bool"
            },
            {
                "name": "showMin",
                "key": "Visual_ShowMin",
                "label": "Show min",
                "kind": "bool"
            },
            {
                "name": "showMedian",
                "key": "Visual_ShowMedian",
                "label": "Show median",
                "kind": "bool"
            },
            {
                "name": "showTrend",
                "key": "Visual_ShowTrend",
                "label": "Trend line",
                "kind": "bool"
            },
            {
                "name": "trendColor",
                "key": "Visual_TrendColor",
                "label": "Trend color",
                "kind": "color"
            },
            {
                "name": "refValue",
                "key": "Visual_ReferenceValue",
                "label": "Reference value",
                "kind": "num"
            },
            {
                "name": "showRef",
                "key": "Visual_ShowReferenceLine",
                "label": "Show reference line",
                "kind": "bool"
            },
            {
                "name": "lineColor",
                "key": "Visual_LineColor",
                "label": "Line color",
                "kind": "color"
            },
            {
                "name": "lineStyle",
                "key": "Visual_LineStyle",
                "label": "Line style",
                "kind": "enum",
                "items": [
                    {
                        "value": "solid",
                        "key": "Visual_Enum_Solid",
                        "label": "Solid"
                    },
                    {
                        "value": "dashed",
                        "key": "Visual_Enum_Dashed",
                        "label": "Dashed"
                    },
                    {
                        "value": "dotted",
                        "key": "Visual_Enum_Dotted",
                        "label": "Dotted"
                    }
                ]
            },
            {
                "name": "showLabel",
                "key": "Visual_ShowLabel",
                "label": "Show label",
                "kind": "bool"
            },
            {
                "name": "labelSize",
                "key": "Visual_LabelSize",
                "label": "Label size",
                "kind": "num"
            },
            {
                "name": "showBand",
                "key": "Visual_ShowBand",
                "label": "Show band",
                "kind": "bool"
            },
            {
                "name": "bandMin",
                "key": "Visual_BandMin",
                "label": "Band min",
                "kind": "num"
            },
            {
                "name": "bandMax",
                "key": "Visual_BandMax",
                "label": "Band max",
                "kind": "num"
            },
            {
                "name": "bandColor",
                "key": "Visual_BandColor",
                "label": "Band color",
                "kind": "color"
            },
            {
                "name": "bandOpacity",
                "key": "Visual_BandOpacity",
                "label": "Band opacity (%)",
                "kind": "num"
            }
        ]
    },
    {
        "obj": "legend",
        "key": "Visual_Legend",
        "label": "Legend",
        "props": [
            {
                "name": "show",
                "key": "Visual_Show",
                "label": "Show",
                "kind": "bool"
            },
            {
                "name": "position",
                "key": "Visual_Position",
                "label": "Position",
                "kind": "enum",
                "items": [
                    {
                        "value": "top",
                        "key": "Visual_Enum_Top",
                        "label": "Top"
                    },
                    {
                        "value": "bottom",
                        "key": "Visual_Enum_Bottom",
                        "label": "Bottom"
                    }
                ]
            },
            {
                "name": "textColor",
                "key": "Visual_TextColor",
                "label": "Text color",
                "kind": "color"
            }
        ]
    },
    {
        "obj": "accessibility",
        "key": "Visual_Accessibility",
        "label": "Accessibility",
        "props": [
            {
                "name": "highContrast",
                "key": "Visual_HcMode",
                "label": "High contrast",
                "kind": "enum",
                "items": [
                    {
                        "value": "auto",
                        "key": "Visual_Enum_HcAuto",
                        "label": "Automatic (Windows setting)"
                    },
                    {
                        "value": "on",
                        "key": "Visual_Enum_HcOn",
                        "label": "On"
                    }
                ]
            },
            {
                "name": "highContrastMode",
                "key": "Visual_HighContrast",
                "label": "Patterns on negative bars",
                "kind": "bool"
            },
            {
                "name": "focusColor",
                "key": "Visual_FocusColor",
                "label": "Focus color",
                "kind": "color"
            },
            {
                "name": "focusWidth",
                "key": "Visual_FocusWidth",
                "label": "Focus width",
                "kind": "num"
            },
            {
                "name": "minTextSize",
                "key": "Visual_MinTextSize",
                "label": "Minimum text size",
                "kind": "num"
            }
        ]
    }
];
