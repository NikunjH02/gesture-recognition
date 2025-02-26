import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Ellipse, Rect, G, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface FingerProps {
  value: number;
  x: number;
  y: number;
  baseRotation: number;
  fingerName: string;
  fingerIndex: number;
}

const THRESHOLD = 0.5; // Threshold for finger bending

const Finger: React.FC<FingerProps> = ({ value, x, y, baseRotation, fingerName, fingerIndex }) => {
  const isOpen = value > THRESHOLD;
  
  // Configure different lengths based on which finger and state (open/closed)
  const lengthMultiplier = fingerIndex === 2 ? 1.1 : fingerIndex === 4 ? 0.8 : 1.0;
  const fingerLength = isOpen ? 45 : 20  ; // Shorter length when closed
  
  // Add gap between palm and finger (moved up by offsetY)
  const offsetY = 5;

  return (
    <G>
      {/* Finger base */}
      <G
        origin={`${x}, ${y-offsetY}`}
        rotation={baseRotation}
      >
        <Circle cx={x} cy={y-offsetY} r={6} fill="#E8C298" />
        
        {/* Simple finger - just one rectangle with rounded corners */}
        <Rect
          x={x - 6}
          y={y - fingerLength - offsetY}
          width={12}
          height={fingerLength * lengthMultiplier}
          rx={6}
          fill={isOpen ? "#00DD00" : "#FF6666"}
        />
        
        {/* Fingertip */}
        <Circle cx={x} cy={y - fingerLength - offsetY} r={6} fill="#E8C298" />
      </G>
      
      {/* Label */}
      <Text
        fill="#333"
        fontSize="8"
        textAnchor="middle"
        x={x}
        y={y + 15}
      >
        {fingerName}
      </Text>
    </G>
  );
};

const HandDiagram = ({ values }: { values: number[] }) => {
  useEffect(() => {
    console.log('HandDiagram values:', values);
  }, [values]);

  return (
    <View style={styles.container}>
      <Svg height="220" width="180" viewBox="0 0 180 220">
        <Defs>
          <LinearGradient id="palmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#DBAC7A" />
            <Stop offset="50%" stopColor="#E8C298" />
            <Stop offset="100%" stopColor="#DBAC7A" />
          </LinearGradient>
        </Defs>
        
        {/* Even Smaller Palm */}
        <Path 
          d="M70,130 C67,115 73,100 85,92 C95,85 105,85 115,92 C127,100 133,115 130,130 L127,150 C124,165 100,170 83,160 L70,130 Z" 
          fill="url(#palmGradient)" 
        />
        
        {/* Thumb */}
        <Finger 
          value={values[0]} 
          x={75} 
          y={125} 
          baseRotation={-40} 
          fingerName="Thumb" 
          fingerIndex={0} 
        />
        
        {/* Index */}
        <Finger 
          value={values[1]} 
          x={90} 
          y={95} 
          baseRotation={-10} 
          fingerName="Index" 
          fingerIndex={1} 
        />
        
        {/* Middle */}
        <Finger 
          value={values[2]} 
          x={100} 
          y={90} 
          baseRotation={0} 
          fingerName="Middle" 
          fingerIndex={2} 
        />
        
        {/* Ring */}
        <Finger 
          value={values[3]} 
          x={112} 
          y={95} 
          baseRotation={10} 
          fingerName="Ring" 
          fingerIndex={3} 
        />
        
        {/* Pinky */}
        <Finger 
          value={values[4]} 
          x={120} 
          y={115} 
          baseRotation={20} 
          fingerName="Pinky" 
          fingerIndex={4} 
        />
        
        {/* Updated Wrist */}
        <Path 
          d="M80,160 C90,170 110,170 120,160 L125,180 C105,195 95,195 75,180 L80,160 Z" 
          fill="url(#palmGradient)" 
        />
      </Svg>
    </View>
  );
};

export default HandDiagram;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
  },
});


