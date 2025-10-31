# Finger Rehabilitation - Frontend-Only Implementation

## Overview
This implementation adds a **30-second timed rehabilitation session** feature that runs **entirely in the frontend**. No backend changes were made - it uses the existing data stream just like the bone fracture feature.

## How It Works

### Data Flow
```
Sensors → Backend (unchanged) → Frontend receives values[] → Frontend collects & analyzes
```

The backend continues sending data as before. The frontend:
1. Starts a 30-second timer
2. Collects all incoming `values` array data
3. Stores samples for each of the 5 fingers
4. After 30 seconds, calculates metrics locally
5. Displays comprehensive results with alerts

## Key Features

### 1. **30-Second Timer**
- User clicks "Start 30s Rehab Session"
- Countdown timer displays remaining time
- Real-time progress bar
- Auto-ends at 30 seconds or can be ended manually

### 2. **Data Collection**
```typescript
collectedData: {
  Thumb: [0.2, 0.3, 0.5, ...],   // ~900 samples
  Index: [0.25, 0.35, 0.55, ...], 
  Middle: [0.3, 0.4, 0.6, ...],
  Ring: [0.28, 0.38, 0.58, ...],
  Pinky: [0.22, 0.32, 0.52, ...]
}
```

### 3. **Metrics Calculation** (Frontend)

#### Range of Motion (ROM)
```typescript
ROM = max(samples) - min(samples)
```

#### Velocity
```typescript
v[i] = (sample[i] - sample[i-1]) / dt
peakVel = max(|v|)
medianVel = median(|v|)
```

#### Jerk (Smoothness)
```typescript
acceleration[i] = v[i] - v[i-1]
jerk[i] = acceleration[i] / dt
avgJerk = mean(|jerk|)
```

#### Rehabilitation Score
```typescript
jerkNormalized = min(1.0, jerk / 700)
score = (0.5 × ROM + 0.3 × velocity + 0.2 × (1 - jerkNormalized)) × 100
```

### 4. **Smart Alerts**

**ROM Alerts:**
- ROM < 0.3: ⚠️ "ROM is low - try stretching more"
- ROM > 0.7: ✅ "ROM is excellent!"

**Velocity Alerts:**
- velocity < 0.2: ⚠️ "Velocity is low - try moving faster"
- velocity > 0.6: ✅ "Velocity is great!"

**Jerk Alerts:**
- jerk > 500: ⚠️ "Movement is shaky - try smoother motions"
- jerk < 100: ✅ "Movement is smooth!"

### 5. **Score Interpretation**
- **75-100**: 🟢 Excellent recovery
- **50-74**: 🟡 Good progress
- **25-49**: 🟠 Fair, needs improvement
- **0-24**: 🔴 Poor, requires attention

## UI Components

### Active Session View
```
┌─────────────────────────────────────┐
│   Session in Progress               │
│                                     │
│         15s                         │
│   ███████████████░░░░░░░░░░ 50%   │
│                                     │
│   Open and close your hand          │
│   repeatedly with full stretch!     │
│                                     │
│   Samples collected: 450            │
│                                     │
│   [End Session]  [Cancel]          │
└─────────────────────────────────────┘
```

### Results View
```
┌─────────────────────────────────────┐
│   Overall Rehab Score               │
│         76.5                        │
│       Excellent                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Session Insights                  │
│                                     │
│   ✅ [Index] ROM is excellent!      │
│   ✅ [Thumb] Movement is smooth!    │
│   ⚠️  [Pinky] Velocity is low       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Thumb              [79.0]         │
│   ROM: 0.70  Vel: 0.90  Jerk: 120  │
│   ████████████████░░░░░░ 79%       │
└─────────────────────────────────────┘
```

## State Management

```typescript
// Session control
const [sessionActive, setSessionActive] = useState(false);
const [timeRemaining, setTimeRemaining] = useState(30);
const [progress, setProgress] = useState(0);

// Data collection
const [collectedData, setCollectedData] = useState<FingerSampleData>({
  Thumb: [], Index: [], Middle: [], Ring: [], Pinky: []
});

// Results
const [sessionResults, setSessionResults] = useState<StrokeData | null>(null);
const [overallScore, setOverallScore] = useState<number>(0);
const [alerts, setAlerts] = useState<RehabAlert[]>([]);
```

## Usage Flow

### 1. Start Session
```typescript
startSession()
  ↓
• Reset all states
• Start 30s countdown timer
• Clear collected data
• Show timer UI
• Alert user: "Open and close your hand..."
```

### 2. During Session (Real-time)
```typescript
useEffect(() => {
  if (sessionActive && values.length >= 5) {
    // Append current sensor values to collected data
    setCollectedData(prev => ({
      Thumb: [...prev.Thumb, values[0]],
      Index: [...prev.Index, values[1]],
      Middle: [...prev.Middle, values[2]],
      Ring: [...prev.Ring, values[3]],
      Pinky: [...prev.Pinky, values[4]]
    }));
  }
}, [values, sessionActive]);
```

### 3. End Session
```typescript
endSession()
  ↓
• Stop timer
• For each finger:
  - Calculate ROM, velocity, jerk
  - Generate alerts based on thresholds
  - Calculate rehabilitation score
• Calculate overall score (average of all fingers)
• Display results with metrics and alerts
```

## Implementation Details

### Timer Logic
```typescript
useEffect(() => {
  if (sessionActive && sessionStartTimeRef.current) {
    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - sessionStartTimeRef.current!) / 1000;
      const remaining = Math.max(0, SESSION_DURATION - elapsed);
      const currentProgress = (elapsed / SESSION_DURATION) * 100;
      
      setTimeRemaining(Math.ceil(remaining));
      setProgress(Math.min(100, currentProgress));
      
      if (remaining <= 0) {
        endSession(); // Auto-end at 30 seconds
      }
    }, 100); // Update every 100ms for smooth progress

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }
}, [sessionActive]);
```

### Metrics Functions

```typescript
// Calculate mean, min, max, ROM
const meanMinMaxROM = (arr: number[]) => {
  const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const rom = max - min;
  return { mean, min, max, rom };
};

// Calculate velocity statistics
const velocityStats = (arr: number[], dt = 0.033) => {
  const velocities = [];
  for (let i = 1; i < arr.length; i++) {
    velocities.push(Math.abs((arr[i] - arr[i - 1]) / dt));
  }
  const peakVel = Math.max(...velocities);
  const medianVel = sortedVel[Math.floor(sortedVel.length / 2)];
  return { peakVel, medianVel };
};

// Calculate jerk metric
const jerkMetric = (arr: number[], dt = 0.033) => {
  const velocities = [];
  for (let i = 1; i < arr.length; i++) {
    velocities.push((arr[i] - arr[i - 1]) / dt);
  }
  
  const jerks = [];
  for (let i = 1; i < velocities.length; i++) {
    jerks.push(Math.abs((velocities[i] - velocities[i - 1]) / dt));
  }
  
  return jerks.reduce((sum, val) => sum + val, 0) / jerks.length;
};
```

## Testing

### Test the Feature
1. Run the app: `npm start`
2. Navigate to Finger Rehabilitation section
3. Click "Start 30s Rehab Session"
4. Open and close your hand repeatedly
5. Watch the countdown timer
6. After 30 seconds, view comprehensive results

### Expected Results
- **Sample Count**: ~900 per finger (30fps × 30s)
- **Score Range**: 0-100 based on ROM, velocity, jerk
- **Alerts**: Contextual feedback per finger
- **Status**: Excellent/Good/Fair/Needs Improvement

## Advantages of Frontend-Only Approach

✅ **No Backend Changes** - Uses existing data stream  
✅ **Zero Network Overhead** - All processing happens locally  
✅ **Instant Results** - No server round-trip delay  
✅ **Offline Capable** - Works without backend (once data arrives)  
✅ **Simple Deployment** - Just update frontend code  
✅ **Easy Debugging** - All logic visible in browser/app console  

## Configuration

### Adjustable Parameters
```typescript
const SESSION_DURATION = 30;  // Change session length (seconds)
const dt = 0.033;             // Time delta (assumes ~30fps)
const jkMax = 700;            // Jerk normalization factor

// Alert thresholds
ROM_LOW = 0.3;
ROM_EXCELLENT = 0.7;
VEL_LOW = 0.2;
VEL_GREAT = 0.6;
JERK_SHAKY = 500;
JERK_SMOOTH = 100;

// Score weights
ROM_WEIGHT = 0.5;      // 50%
VEL_WEIGHT = 0.3;      // 30%
SMOOTHNESS_WEIGHT = 0.2; // 20%
```

## Future Enhancements

1. **Save to Local Storage** - Keep session history on device
2. **Export Results** - Share/email session summary
3. **Progress Charts** - Show improvement over multiple sessions
4. **Custom Duration** - Let user choose session length
5. **Exercise Variations** - Different movement patterns
6. **Audio Feedback** - Voice prompts during session
7. **Haptic Feedback** - Vibration at milestones

## Troubleshooting

### Low Sample Count
**Problem**: Only 100 samples instead of 900  
**Solution**: Ensure backend is sending data at ~30fps

### Incorrect Metrics
**Problem**: ROM always near 0  
**Solution**: Check that sensor values are normalized (0-1 range)

### Timer Not Starting
**Problem**: Nothing happens when clicking start  
**Solution**: Check console for errors, verify all states initialized

### Session Not Ending
**Problem**: Timer stuck  
**Solution**: Click "End Session" manually, check timer interval cleanup

## Code Location

**File**: `app/components/FingerRehabDisplay.tsx`

**Key Functions**:
- `startSession()` - Initialize and start
- `endSession()` - Process and display results  
- `analyzeFingerData()` - Calculate metrics
- `meanMinMaxROM()`, `velocityStats()`, `jerkMetric()` - Math functions

**States**:
- `sessionActive` - Is session running
- `collectedData` - All samples collected
- `sessionResults` - Final analyzed metrics
- `alerts` - Generated warnings/successes

---

**Implementation Date**: October 29, 2025  
**Approach**: Pure frontend calculation  
**Backend Changes**: None ✅
