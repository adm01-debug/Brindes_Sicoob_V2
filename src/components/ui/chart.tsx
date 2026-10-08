import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipContentProps = React.ComponentProps<typeof RechartsPrimitive.Tooltip> & React.ComponentProps<"div"> & {
  hideLabel?: boolean; hideIndicator?: boolean; indicator?: "line" | "dot" | "dashed"; nameKey?: string; labelKey?: string;
};
type TooltipItemData = NonNullable<ChartTooltipContentProps["payload"]>[number];

function tooltipItemKey(item: TooltipItemData, labelKey?: string) {
  return String(labelKey || item.dataKey || item.name || "value");
}

function tooltipLabelValue(props: ChartTooltipContentProps, item: TooltipItemData, config: ChartConfig) {
  const itemConfig = getPayloadConfigFromPayload(config, item, tooltipItemKey(item, props.labelKey));
  if (!props.labelKey && typeof props.label === "string") return config[props.label]?.label || props.label;
  return itemConfig?.label;
}

function buildTooltipLabel(props: ChartTooltipContentProps, config: ChartConfig) {
  if (props.hideLabel || !props.payload?.length) return null;
  const item = props.payload[0];
  if (!item) return null;
  const value = tooltipLabelValue(props, item, config);
  if (props.labelFormatter) return <div className={cn("font-medium", props.labelClassName)}>{props.labelFormatter(value, props.payload)}</div>;
  return value ? <div className={cn("font-medium", props.labelClassName)}>{value}</div> : null;
}

function useTooltipLabel(props: ChartTooltipContentProps, config: ChartConfig) {
  return React.useMemo(() => buildTooltipLabel(props, config), [props, config]);
}

function TooltipIndicator({ color, indicator, nestLabel }: { color: string | undefined; indicator: "line" | "dot" | "dashed"; nestLabel: boolean }) {
  return <div className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {
    "h-2.5 w-2.5": indicator === "dot", "w-1": indicator === "line",
    "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed", "my-0.5": nestLabel && indicator === "dashed",
  })} style={{ "--color-bg": color, "--color-border": color } as React.CSSProperties} />;
}

function tooltipIndicatorColor(item: TooltipItemData, override?: string) {
  return override || item.payload.fill || item.color;
}

function TooltipIconOrIndicator({ icon, hidden, color, indicator, nestLabel }: {
  icon?: React.ComponentType; hidden: boolean; color?: string; indicator: "line" | "dot" | "dashed"; nestLabel: boolean;
}) {
  const Icon = icon;
  if (Icon) return <Icon />;
  return hidden ? null : <TooltipIndicator color={color} indicator={indicator} nestLabel={nestLabel} />;
}

function TooltipValue({ value }: { value: TooltipItemData["value"] }) {
  return value ? <span className="font-mono font-medium tabular-nums text-foreground">{value.toLocaleString()}</span> : null;
}

function DefaultTooltipItem({ item, config, hideIndicator, indicator, nestLabel, label, colorOverride }: {
  item: TooltipItemData; config: ChartConfig; hideIndicator: boolean; indicator: "line" | "dot" | "dashed"; nestLabel: boolean; label: React.ReactNode; colorOverride?: string;
}) {
  const key = `${item.name || item.dataKey || "value"}`;
  const itemConfig = getPayloadConfigFromPayload(config, item, key);
  const Icon = itemConfig?.icon;
  return <><TooltipIconOrIndicator icon={Icon} hidden={hideIndicator} color={tooltipIndicatorColor(item, colorOverride)} indicator={indicator} nestLabel={nestLabel} />
    <div className={cn("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center")}>
      <div className="grid gap-1.5">{nestLabel ? label : null}<span className="text-muted-foreground">{itemConfig?.label || item.name}</span></div>
      <TooltipValue value={item.value} />
    </div></>;
}

function TooltipRow({ item, index, props, config, nestLabel, label }: {
  item: TooltipItemData; index: number; props: ChartTooltipContentProps; config: ChartConfig; nestLabel: boolean; label: React.ReactNode;
}) {
  const formatted = props.formatter && item.value !== undefined && item.name
    ? props.formatter(item.value, item.name, item, index, item.payload) : null;
  return <div key={String(item.dataKey)} className={cn("flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", props.indicator === "dot" && "items-center")}>
    {formatted || <DefaultTooltipItem item={item} config={config} hideIndicator={Boolean(props.hideIndicator)} indicator={props.indicator ?? "dot"} nestLabel={nestLabel} label={label} colorOverride={props.color} />}
  </div>;
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart();
    const tooltipProps = { active, payload, className, indicator, hideLabel, hideIndicator, label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey } as ChartTooltipContentProps;
    const tooltipLabel = useTooltipLabel(tooltipProps, config);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => <TooltipRow key={String(item.dataKey)} item={item} index={index} props={tooltipProps} config={config} nestLabel={nestLabel} label={tooltipLabel} />)}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div
            key={item.value}
            className={cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground")}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegend";

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload = objectProperty(payload, "payload");

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

function objectProperty(payload: object, key: string) {
  if (!(key in payload)) return undefined;
  const value = payload[key as keyof typeof payload];
  return typeof value === "object" && value !== null ? value : undefined;
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
