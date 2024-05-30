import { Image, StyleSheet,Text,View, Platform } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen () {
  return (
   
      <View style={styles.container}>
       <Text>aruba </Text>
       <StatusBar style="auto"/>
       </View>
  
  );
}

const styles = StyleSheet.create({
  container:{
    
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
});
