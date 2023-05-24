import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import Map from './visualizations/Map';

import window from './constants/Layout';

export default function App() {
  return (
    <View style={styles.container}>
      <Map
        width={window.window.width-10}
        height={window.window.height-30}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
