import React, { useState } from 'react';
import Pie, { ProvidedProps, PieArcDatum } from '@visx/shape/lib/shapes/Pie';
import { scaleOrdinal } from '@visx/scale';
import { Group } from '@visx/group';
import { GradientLightgreenGreen} from '@visx/gradient';
import letterFrequency, { LetterFrequency } from '@visx/mock-data/lib/mocks/letterFrequency';
import browserUsage, { BrowserUsage as Browsers } from '@visx/mock-data/lib/mocks/browserUsage';
import { animated, useTransition, interpolate } from '@react-spring/web';
import { ConsumtionsProperties } from '../constants/Data';
import {
  Tooltip,
  TooltipWithBounds,
  useTooltip,
  useTooltipInPortal,
  defaultStyles,
} from '@visx/tooltip';
const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 };

const propertyValue = (d: any) => d.value;

let tooltipTimeout: number;

interface PropertyUsage {
  property: string;
  value: number;
}

export default function CustomPie({
  width,
  height,
  data,
  total,
  margin = defaultMargin,
  animate = true,
}) {
  const [selectedAlphabetLetter, setSelectedAlphabetLetter] = useState<string | null>(null);
  if (width < 10) return null;

  const getPropertyText = (p: PropertyUsage): string => {
    if (selectedAlphabetLetter) {
      const value = `${p.property}: ${p.value}GWh`;
      const percent = ((p.value / total as number) * 100).toFixed(2); 
      return value + ` (${percent}%)`;
    } else {
      return `${p.property}`;
    }
  };

  const getBrowserColor = scaleOrdinal({
    domain: data.map((d) => d.property),
    range: [
      '#001219',
      '#005f73',
      '#0a9396',
      '#94d2bd',
      '#e9d8a6',
      '#ee9b00',
      '#ca6702',
      '#bb3e03',
      '#ae2012',
      '#9b2226',
      '#800000',
    ],
  });

  const getTextColor = scaleOrdinal({
    domain: data.map((d) => d.property),
    range: [
      '#ffffff', 
      '#ffffff', 
      '#000000', 
      '#000000', 
      '#000000', 
      '#ffffff', 
      '#ffffff',
      '#ffffff',
      '#ffffff',
      '#ffffff',
      '#ffffff',
    ],
  })

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const centerY = innerHeight / 2;
  const centerX = innerWidth / 2;
  const donutThickness = 50;

  return (
    <svg width={width} height={height}>
      <GradientLightgreenGreen id="visx-pie-gradient" />
      <rect rx={14} width={width} height={height} fill="url('#visx-pie-gradient')" />
      <Group top={centerY + margin.top} left={centerX + margin.left}>
        <Pie
          data={
            selectedAlphabetLetter
              ? data.filter(({ property }) => property === selectedAlphabetLetter)
              : data
          }
          pieValue={propertyValue}
          pieSortValues={() => -1}
          outerRadius={radius - donutThickness * 1.3}
          p
        >
          {(pie) => (
            <AnimatedPie<PropertyUsage>
              {...pie}
              animate={animate}
              getKey={(arc) => getPropertyText(arc.data)}
              onClickDatum={({ data: { property } }) =>
                animate &&
                setSelectedAlphabetLetter(
                  selectedAlphabetLetter && selectedAlphabetLetter === property ? null : property,
                )
              }
              getColor={(arc) => getBrowserColor(arc.data.property)}
              getTextColor={(arc) => getTextColor(arc.data.property)}
            />
          )}
        </Pie>
      </Group>
    </svg>
  );
}

// react-spring transition definitions
type AnimatedStyles = { startAngle: number; endAngle: number; opacity: number };

const fromLeaveTransition = ({ endAngle }: PieArcDatum<any>) => ({
  // enter from 360° if end angle is > 180°
  startAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  endAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  opacity: 0,
});
const enterUpdateTransition = ({ startAngle, endAngle }: PieArcDatum<any>) => ({
  startAngle,
  endAngle,
  opacity: 1,
});

type AnimatedPieProps<Datum> = ProvidedProps<Datum> & {
  animate?: boolean;
  getKey: (d: PieArcDatum<Datum>) => string;
  getColor: (d: PieArcDatum<Datum>) => string;
  getTextColor: (d: PieArcDatum<Datum>) => string;
  onClickDatum: (d: PieArcDatum<Datum>) => void;
  delay?: number;
};

function AnimatedPie<Datum>({
  animate,
  arcs,
  path,
  getKey,
  getColor,
  getTextColor,
  onClickDatum,
}: AnimatedPieProps<Datum>) {
  const transitions = useTransition<PieArcDatum<Datum>, AnimatedStyles>(arcs, {
    from: animate ? fromLeaveTransition : enterUpdateTransition,
    enter: enterUpdateTransition,
    update: enterUpdateTransition,
    leave: animate ? fromLeaveTransition : enterUpdateTransition,
    keys: getKey,
  });

  return transitions((props, arc, { key }) => {
    const [centroidX, centroidY] = path.centroid(arc);
    const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.1;

    return (
      <g key={key}>
        <animated.path
          // compute interpolated path d attribute from intermediate angle values
          d={interpolate([props.startAngle, props.endAngle], (startAngle, endAngle) =>
            path({
              ...arc,
              startAngle,
              endAngle,
            }),
          )}
          fill={getColor(arc)}
          onClick={() => onClickDatum(arc)}
          onTouchStart={() => onClickDatum(arc)}
        />
        {hasSpaceForLabel && (
          <animated.g style={{ opacity: props.opacity }}>
            <text
              fill={getTextColor(arc)}
              x={centroidX}
              y={centroidY}
              dy=".33em"
              fontSize={12}
              textAnchor="middle"
              pointerEvents="none"
            >
              {getKey(arc)}
            </text>
          </animated.g>
        )}
      </g>
    );
  });
}