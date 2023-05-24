import React, { useState, useEffect } from 'react';
import { View, Modal, Text, Pressable, StyleSheet, ScrollView, Switch } from 'react-native';
import { scaleQuantize, scaleBand, scaleThreshold, scaleOrdinal } from '@visx/scale';
import MonthYearPicker from "react-month-year-picker";
import { Zoom } from '@visx/zoom';
import { Mercator, Graticule } from '@visx/geo';
import { localPoint } from '@visx/event';
import * as topojson from 'topojson-client';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import topology from './world-topo.json';
import {
  Legend,
  LegendLinear,
  LegendQuantile,
  LegendOrdinal,
  LegendSize,
  LegendThreshold,
  LegendItem,
  LegendLabel,
} from '@visx/legend';

import Bars from './Bars';
import useCSV from '../hooks/csv';
import BrushChart from './Graph';
import { ConsumtionsProperties } from '../constants/Data';
import CustomPie from './CustomPie';

export const background = '#f9f7e8';

export type GeoMercatorProps = {
  width: number;
  height: number;
  events?: boolean;
};

const MOTNHS = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
}

interface FeatureShape {
  type: 'Feature';
  id: string;
  geometry: { coordinates: [number, number][][]; type: 'Polygon' };
  properties: { name: string };
}

// @ts-expect-error
const world = topojson.feature(topology, topology.objects.units) as {
  type: 'FeatureCollection';
  features: FeatureShape[];
};

const initialTransform = {
  scaleX: 1.27,
  scaleY: 1.27,
  translateX: -211.62,
  translateY: 162.59,
  skewX: 0,
  skewY: 0,
};

const color = scaleQuantize({
  domain: [
    Math.min(...world.features.map((f) => f.geometry.coordinates.length)),
    Math.max(...world.features.map((f) => f.geometry.coordinates.length)),
  ],
  range: ['#ffb01d', '#ffa020', '#ff9221', '#ff8424', '#ff7425', '#fc5e2f', '#f94b3a', '#f63a48'],
});

const thresholdScale = scaleThreshold({
  domain: [0, 1000, 8000, 60000, 160000, 320000, 480000, 560000, 640000, 720000, 800000],
  range: ['#595957', '#4A6865', '#3A7773', '#327F7B', '#2B8682', '#238E89', '#238689', '#237F8A', '#23708B', '#23618C', '#24598C'],
});

const defaultMargin = { top: 20, right: 20, bottom: 20, left: 50 };

// accessors
const getLetter = (d: LetterFrequency) => d.letter;
const getLetterFrequency = (d: LetterFrequency) => Number(d.frequency) * 100;
const purple1 = '#6c5efb';
const purple2 = '#c998ff';
const purple3 = '#a44afe';
const colorScale = scaleOrdinal<string>({
  range: [purple1, purple2, purple3],
});

const getCountryValue = (data, country) => {
  if (data) {
    return data[country] ? data[country]["P.Electricity"] as number : 0;
  } else {
    return 0;
  }
}

const top20Countries = (data) => {
  return Object.keys(data)
    .map((country) => ({
      country,
      value: data[country]["P.Electricity"],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
}

const top20LCountries = (data) => {
  return Object.keys(data)
    .map((country) => ({
      country,
      value: data[country]["P.Electricity"],
    }))
    .sort((a, b) => a.value - b.value)
    .slice(1, 21);
}

const countryHistory = (data, country: string) => {
  return Object.keys(data)
    .map((date) => ({
      date,
      close: data[date][country] ? data[date][country]["P.Electricity"] as number : 0,
    }))
}

const countryProduction = (data, country: string) => {
  console.info('country', country)
  return Object.keys(data && data[country] ? data[country] : {})
    .map((property) => ({
      property,
      value: data[country][property] as number,
    })
    ).filter((property) => ConsumtionsProperties.includes(property.property))
}

const legendGlyphSize = 15;

export default function Map({ width, height, events = false }: GeoMercatorProps) {
  const mheight = height * 0.95;
  const mwidth = width * 0.79 - 10;
  const centerX = (mwidth / 2);
  const centerY = mheight / 2;
  const scale = (mwidth / 630) * 100;
  const [modalVisible, setModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [country, setCountry] = useState({});
  const [smonth, setMonth] = useState(11);
  const [syear, setYear] = useState(2020);
  const [isCSVInitialized, csvData] = useCSV();
  const [barData, setBarData] = useState(top20Countries({}))
  const [orden, setOrden] = useState('M');
  const [date, setDate] = useState('December 2020');
  const [isBarDataInitialized, setBarDataInitialized] = useState(false);
  const [isComparativeMode, setIsComparativeMode] = useState(false);
  const toggleSwitch = () => setIsComparativeMode(previousState => !previousState);
  let rankingCountries = []
  let lowestCountries = []

  useEffect(() => {
    if (isCSVInitialized && !isBarDataInitialized) {
      setBarData(top20Countries(csvData[date]))
      setBarDataInitialized(true)
    }
  }, [isCSVInitialized, isBarDataInitialized])

  useEffect(() => {
    if (isBarDataInitialized) {
      setBarData(orden === 'M' ? top20Countries(csvData[date]) : top20LCountries(csvData[date]));
    }
  }, [orden, date])

  if (isCSVInitialized) {
    rankingCountries = top20Countries(csvData[date])
    lowestCountries = top20LCountries(csvData[date])
  }

  const handleOrdenChange = (event: SelectChangeEvent) => {
    if (event.target.value === 'M') {
      setBarData(rankingCountries)
    } else {
      setBarData(lowestCountries)
    }
    setOrden(event.target.value);
  };

  return width < 10 ? null : (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <Text style={styles.subTitle}>{orden === 'M' ? "Highest" : "Lowest"} Consumption</Text>
        <FormControl fullWidth>
          <InputLabel id="orden-label">Sort</InputLabel>
          <Select
            labelId="orden-label"
            id="orden-select"
            value={orden}
            label="Orden"
            onChange={handleOrdenChange}
            style={{ width: width * 0.1 }}
          >
            <MenuItem value={'M'}>Highest Consumption</MenuItem>
            <MenuItem value={'L'}>Lowest Consumption</MenuItem>
          </Select>
        </FormControl>
        <View>
          <Bars width={width * 0.21} height={height * 0.6} barData={barData} orden={orden} />
        </View>
        <View>
          <Text style={styles.rangeTitle}>Consumption Range (GWh)</Text>
          <LegendThreshold scale={thresholdScale}>
            {(labels) =>
              labels.reverse().map((label, i) => (
                <LegendItem
                  key={`legend-quantile-${i}`}
                  margin="1px 0"
                  onClick={() => {
                    if (events) alert(`clicked: ${JSON.stringify(label)}`);
                  }}
                >
                  <svg width={legendGlyphSize} height={legendGlyphSize}>
                    <rect fill={label.value} width={legendGlyphSize} height={legendGlyphSize} />
                  </svg>
                  <LegendLabel align="left" margin="2px 0 0 10px">
                    {label.text}
                  </LegendLabel>
                </LegendItem>
              ))
            }
          </LegendThreshold>
        </View>
      </View>
      <View>
        <Modal
          animationType="slide"
          transparent={true}
          onRequestClose={() => { setModalVisible(false) }}
          visible={modalVisible}
          onDismiss={() => { setModalVisible(false) }}>
          <ScrollView style={styles.modalView} contentContainerStyle={styles.centeredView}>
            <Text style={styles.titleText}>{country.name}</Text>
            <Text style={styles.subTitle}>Distribution of Total Energy Consumed</Text>
            <Text style={styles.modalText}>Total Consumption: {country["P.Electricity"] ? country["P.Electricity"] + "GWh" : "No data reported"}</Text>
            <CustomPie width={width * 0.70} height={height * 0.70} total={country["P.Electricity"]} data={countryProduction(csvData[date], country.name)} />
            <Text style={styles.subTitle}>History Total Energy Consumption</Text>
            <BrushChart width={width * 0.70} height={height * 0.70} data={countryHistory(csvData, country.name)} />
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.textStyle}>Hide Modal</Text>
            </Pressable>
          </ScrollView>
        </Modal>
        <Modal
          animationType="slide"
          transparent={true}
          onRequestClose={() => { setDateModalVisible(false) }}
          visible={dateModalVisible}
          onDismiss={() => {
            setDate(`${MOTNHS[smonth]} ${syear}`)
            setDateModalVisible(false)
          }}>
          <View style={styles.dateModalContainer}>
            <MonthYearPicker
              selectedMonth={smonth}
              selectedYear={syear}
              minYear={2010}
              maxYear={2023}
              onChangeYear={(year) => setYear(year)}
              onChangeMonth={(month) => setMonth(month)}
            />
            <Pressable
              style={styles.btn}
              onPress={() => setDateModalVisible(false)}>
              <Text style={styles.textStyle}>Accept</Text>
            </Pressable>
          </View>
        </Modal>
        <Text style={styles.titleText}>Electricity Total Consumption on {date}</Text>
        <View style={styles.dateContainer}>
          <Text style={styles.normalText}>Selected Date: </Text>
          <Pressable style={styles.dateBtn} onPress={() => setDateModalVisible(true)}><Text style={styles.textStyle}>{date}</Text></Pressable>
        </View>
        <>
          <Zoom<SVGSVGElement>
            width={mwidth}
            height={mheight}
            scaleXMin={1 / 2}
            scaleXMax={4}
            scaleYMin={1 / 2}
            scaleYMax={4}
            initialTransformMatrix={initialTransform}>
            {(zoom) => (
              <div className="relative">
                <svg width={mwidth} height={mheight} style={{ cursor: zoom.isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                  ref={zoom.containerRef}>
                  <rect
                    x={0}
                    y={0}
                    width={mwidth}
                    height={mheight}
                    fill={background}
                    rx={14}
                    onTouchStart={zoom.dragStart}
                    onTouchMove={zoom.dragMove}
                    onTouchEnd={zoom.dragEnd}
                    onMouseDown={zoom.dragStart}
                    onMouseMove={zoom.dragMove}
                    onMouseUp={zoom.dragEnd}
                    onMouseLeave={() => {
                      if (zoom.isDragging) zoom.dragEnd();
                    }}
                    onDoubleClick={(event) => {
                      const point = localPoint(event) || { x: 0, y: 0 };
                      zoom.scale({ scaleX: 1.1, scaleY: 1.1, point });
                    }} />
                  <Mercator<FeatureShape>
                    data={world.features}
                    scale={scale}
                    translate={[centerX, centerY + 50]}
                  >
                    {(mercator) => (
                      <g transform={zoom.toString()}>
                        <Graticule graticule={(g) => mercator.path(g) || ''} stroke="rgba(33,33,33,0.05)" />
                        {mercator.features.map(({ feature, path }, i) => (
                          <path
                            key={`map-feature-${i}`}
                            d={path || ''}
                            fill={thresholdScale(getCountryValue(csvData[date], feature.properties.name))}
                            stroke={background}
                            strokeWidth={0.5}
                            onClick={() => {
                              //alert(`Clicked: ${feature.properties.name} (${feature.id})`);
                              setModalVisible(true);
                              setCountry({ name: feature.properties.name, ...csvData[date][feature.properties.name] });
                            }}
                          />
                        ))}
                      </g>
                    )}
                  </Mercator>
                </svg>
              </div>
            )}
          </Zoom>
          <style jsx>{`
        .btn {
          margin: 0;
          text-align: center;
          border: none;
          background: #2f2f2f;
          color: #888;
          padding: 0 4px;
          border-top: 1px solid #0a0a0a;
        }
        .btn-lg {
          font-size: 12px;
          line-height: 1;
          padding: 4px;
        }
        .btn-zoom {
          width: 26px;
          font-size: 22px;
        }
        .btn-bottom {
          margin-bottom: 1rem;
        }
        .description {
          font-size: 12px;
          margin-right: 0.25rem;
        }
        .controls {
          position: absolute;
          top: 15px;
          right: 15px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .mini-map {
          position: absolute;
          bottom: 25px;
          background: 'rgba(255,255,255,0.8)';
          right: 15px;
          display: flex;
          flex-direction: row-reverse;
          align-items: flex-end;
        }
        .relative {
          position: relative;
        }
      `}</style>
        </>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  titleText: {
    fontSize: 30,
    fontWeight: "bold",
    alignSelf: 'center',
    padding: 10,
  },
  dateContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  dateBtn: {
    marginBottom: 5,
    marginTop: -5,
    marginRight: 15,
    padding: 5,
    textAlign: 'center',
    border: 'none',
    alignSelf: 'flex-start',
    borderRadius: 4,
    backgroundColor: '#28A29C',
  },
  dateModalContainer: {
    flex: 1,
    width: '30%',
    height: '10%',
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  normalText: {
    fontSize: 15,
    fontWeight: "bold",
    paddingHorizontal: 10,
  },
  btn: {
    margin: 0,
    padding: 10,
    textAlign: 'center',
    border: 'none',
    alignSelf: 'center',
    borderRadius: 4,
    backgroundColor: '#28A29C',
    width: '90px',
    height: '20px',
  },
  subTitle: {
    fontSize: 20,
    fontWeight: "bold",
    alignSelf: 'center',
    padding: 10,
  },
  rangeTitle: {
    fontSize: 15,
    fontWeight: "bold",
    paddingTop: 5,
  },
  barContainer: {
    flex: 1,
    flexDirection: 'column',
    paddingTop: 10,
    paddingLeft: 5,
    paddingRight: 10,
  },
  mapContainer: {
    flex: 1,
  },
  centeredView: {
    justifyContent: 'space-between',
    alignItems: 'center',
    alignContent: 'space-between',
  },
  modalView: {
    backgroundColor: 'white',
    alignSelf: 'center',
    borderRadius: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#28A29C',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    alignSelf: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    alignSelf: 'center',
  },
});