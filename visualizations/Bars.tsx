import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarGroupHorizontal, Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisLeft } from '@visx/axis';
import cityTemperature, { CityTemperature } from '@visx/mock-data/lib/mocks/cityTemperature';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { timeParse, timeFormat } from 'd3-time-format';
import {
  Tooltip,
  TooltipWithBounds,
  useTooltip,
  useTooltipInPortal,
  defaultStyles,
} from '@visx/tooltip';
import topology from './world-topo.json';

export type BarGroupHorizontalProps = {
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  events?: boolean;
};

type CityName = 'New York' | 'San Francisco' | 'Austin';

const blue = '#28A29C';
export const green = '#e5fd3d';
const purple = '#9caff6';
export const background = '#FFFFFF';
const defaultMargin = { top: 20, right: 20, bottom: 20, left: 50 };

const parseDate = timeParse('%Y-%m-%d');
const format = timeFormat('%b %d');
const formatDate = (date: string) => format(parseDate(date) as Date);
function max<D>(arr: D[], fn: (d: D) => number) {
  return Math.max(...arr.map(fn));
}

const data = cityTemperature.slice(0, 4);
const keys = Object.keys(data[0]).filter((d) => d !== 'date') as CityName[];

const data2 = [
  { country: "Canada", value: 20 },
  { country: "Mexico", value: 50 },
  { country: "Panama", value: 30 },
  { country: "Argentina", value: 5 },
  { country: "Dummy", value: 10 },
]

const tooltipStyles = {
  ...defaultStyles,
  minWidth: 60,
  backgroundColor: 'rgba(0,0,0,0.9)',
  color: 'white',
};

// accessors
const getDate = (d: CityTemperature) => d.date;

const getCountryAcronym = (d) => {
  const country = topology.objects.units.geometries.find((c) => c.properties.name === d.country);
  return country ? country.id : 'N/A';
}

// scales
const dateScale = scaleBand({
  domain: data.map(getDate),
  padding: 0.2,
});
const cityScale = scaleBand({
  domain: keys,
  padding: 0.1,
});
const tempScale = scaleLinear<number>({
  domain: [0, max(data, (d) => max(keys, (key) => Number(d[key])))],
});
const colorScale = scaleOrdinal<string, string>({
  domain: keys,
  range: [blue, green, purple],
});

let tooltipTimeout: number;

export default function Bars({
  width,
  height,
  barData,
  orden,
  margin = defaultMargin,
  events = false,
}: BarGroupHorizontalProps) {
  // bounds
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  const yScale = scaleBand({
    domain: barData.map((d) => d.country),
    padding: 0.4,
  });
  const xScale = scaleLinear({
    domain: [0, Math.max(...barData.map(d => d.value))],
  });

  const acronymScale = scaleBand({
    domain: barData.map(getCountryAcronym),
    padding: 0.2,
  });

  // update scale output dimensions
  dateScale.rangeRound([0, yMax]);
  cityScale.rangeRound([0, dateScale.bandwidth()]);
  tempScale.rangeRound([0, xMax]);

  xScale.rangeRound([0, xMax]);
  acronymScale.rangeRound([0, yMax]);
  yScale.rangeRound([0, yMax]);

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
  } = useTooltip<TooltipData>({
    // initial tooltip state
    tooltipOpen: false,
    tooltipLeft: width / 3,
    tooltipTop: height / 3,
    tooltipData: 'Move me with your mouse or finger',
  });

  const { containerRef, containerBounds, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
    detectBounds: true,
  });

  // event handlers
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // coordinates should be relative to the container in which Tooltip is rendered
      const containerX = ('clientX' in event ? event.clientX : 0) - containerBounds.left;
      const containerY = ('clientY' in event ? event.clientY : 0) - containerBounds.top;
      showTooltip({
        tooltipLeft: containerX,
        tooltipTop: containerY,
        tooltipData: true
          ? 'I detect my container boundary'
          : 'I will get clipped by my container',
      });
    },
    [showTooltip, true, containerBounds],
  );

  return width < 10 ? null : (
    <View>
      <svg width={width} height={height}>
        <rect x={0} y={0} width={width} height={height} fill={background} rx={14} />
        <Group top={margin.top} left={margin.left}>
          {barData.map((d) => {
            const barWidth = xScale(d.value) | 0;
            const barHeight = yScale.bandwidth();
            const barX = 0;
            const barY = yScale(d.country)
            return (
              <Bar
                key={`bar-${d.country}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={blue}
                rx={4}
                onClick={() => {
                  alert(`(${d.country}) - ${d.value}`);
                }}
                onMouseLeave={() => {
                  tooltipTimeout = window.setTimeout(() => {
                    hideTooltip();
                  }, 300);
                }}
                onMouseMove={() => {
                  if (tooltipTimeout) clearTimeout(tooltipTimeout);
                  const top = barY + margin.top;
                  const left = barX + margin.left;
                  showTooltip({
                    tooltipData: d,
                    tooltipTop: top,
                    tooltipLeft: left,
                  });
                }}
              />
            );
          })}
          <AxisLeft
              hideAxisLine
              scale={acronymScale}
              top={0}
              left={0}
              stroke={'#23618C'}
              tickStroke={'#23618C'}
              tickValues={acronymScale.domain()}
              tickLabelProps={{
                fill: '#23618C',
                fontSize: 11,
                textAnchor: 'end',
                dy: '0.33em',
              }}
            />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <Tooltip top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
          <div style={{ color: colorScale(tooltipData.key) }}>
            <strong>{tooltipData.country}</strong>
          </div>
          <div>Value: {tooltipData.value}GWh</div>
        </Tooltip>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    alignSelf: 'center',
    padding: 10,
  },
  barText: {
    fontSize: 15,
    fontWeight: "bold",
    position: 'absolute',
  },
});