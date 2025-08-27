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
  const bendAmount = Math.max(0, value); // Normalize value between 0-1
  const isActive = value > 0;
  
  // Opacity based on activity - active fingers are fully visible, inactive ones are faded
  const opacity = isActive ? 1 : 0.4;
  
  // Configure different lengths based on which finger
  const lengthMultiplier = fingerIndex === 2 ? 1.1 : fingerIndex === 4 ? 0.8 : 1.0;
  const fingerLength = 45 * lengthMultiplier;
  
  // Simple state check
  const isOpen = bendAmount > THRESHOLD;
  
  // Simple color feedback
  const fingerColor = isOpen ? "#00DD00" : "#FF6666";
  
  // Width of finger - simple but adequately thick
  const fingerWidth = 14 - (fingerIndex * 0.8);
  
  // Add gap between palm and finger
  const offsetY = 5;

  return (
    <G opacity={opacity}>
      {/* Finger base */}
      <G
        origin={`${x}, ${y-offsetY}`}
        rotation={baseRotation}
      >
        <Circle cx={x} cy={y-offsetY} r={fingerWidth * 0.6} fill="#E8C298" />
        
        {/* Full straight finger */}
        <Rect
          x={x - fingerWidth/2}
          y={y - fingerLength - offsetY}
          width={fingerWidth}
          height={fingerLength}
          rx={fingerWidth/2}
          fill="#E8C298"
        />
        
        {/* Fingertip */}
        <Circle 
          cx={x} 
          cy={y - fingerLength - offsetY} 
          r={fingerWidth * 0.5} 
          fill="#E8C298" 
        />
        
        {/* Status indicator */}
        <Circle
          cx={x}
          cy={y - fingerLength - offsetY}
          r={fingerWidth * 0.3}
          fill={isActive ? fingerColor : "transparent"}
          stroke={fingerColor}
          strokeWidth={isActive ? 0 : 1}
        />
      </G>
      
      {/* Label */}
      <Text
        fontSize="9"
        fontWeight="bold"
        textAnchor="middle"
        x={x}
        y={y + 15}
        fill="#333"
      >
        {fingerName}
      </Text>
    </G>
  );
};

type HandDiagramProps = {
  values: number[];
  scale?: number;
};

const HandDiagram = ({ values, scale = 1 }: HandDiagramProps) => {
  const fingerNames = ["", "", "", "", ""];
  
  useEffect(() => {
    console.log('HandDiagram received values:', values);
  }, [values]);

  const containerStyle = {
    ...styles.container,
    transform: [{ scale }]
  };

  return (
    <View style={containerStyle}>
      <Svg height="240" width="200" viewBox="0 0 200 240">
        <Defs>
          {/* Simple palm gradient */}
          <LinearGradient id="palmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E8C298" />
            <Stop offset="100%" stopColor="#D0A070" />
          </LinearGradient>
        </Defs>
        
        {/* Simpler palm */}
        <Path 
          d="M65,130 C60,120 68,105 85,100 C97,95 110,95 123,100 C140,105 148,120 143,130 L140,145 C136,160 103,165 80,155 L65,130 Z" 
          fill="url(#palmGradient)"
        />
        
        {/* Simple palm line */}
        <Path 
          d="M80,120 C95,130 115,130 125,120" 
          stroke="#C0966A"
          strokeWidth="1.5"
          fill="none"
        />
        
        {/* Fingers - all straight */}
        <Finger 
          value={values[0]} 
          x={75} 
          y={125} 
          baseRotation={-40} 
          fingerName={fingerNames[0]} 
          fingerIndex={0} 
        />
        
        <Finger 
          value={values[1]} 
          x={90} 
          y={101} 
          baseRotation={-10} 
          fingerName={fingerNames[1]} 
          fingerIndex={1} 
        />
        
        <Finger 
          value={values[2]} 
          x={102} 
          y={97} 
          baseRotation={0} 
          fingerName={fingerNames[2]} 
          fingerIndex={2} 
        />
        
        <Finger 
          value={values[3]} 
          x={116} 
          y={101} 
          baseRotation={10} 
          fingerName={fingerNames[3]} 
          fingerIndex={3} 
        />
        
        <Finger 
          value={values[4]} 
          x={130} 
          y={107} 
          baseRotation={20} 
          fingerName={fingerNames[4]} 
          fingerIndex={4} 
        />
        
        {/* Simple wrist */}
        <Path 
          d="M75,160 C90,172 120,172 135,160 L140,180 C115,198 95,198 70,180 L75,160 Z" 
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
    borderRadius: 16,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});

