# # import asyncio
# # import websockets
# # import json
# # import random
# # import time

# # BACKEND_WS_URL = "ws://127.0.0.1:5000/ws"

# # async def send_data():
# #     async with websockets.connect(BACKEND_WS_URL) as websocket:
# #         while True:
# #             timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
# #             data = {
# #                 "timestamp": timestamp,
# #                 "channels": [
# #                     {"channel": i, "raw": random.randint(0, 65535), "voltage": round(random.uniform(0, 3.3), 3)}
# #                     for i in range(5)
# #                 ]
# #             }
# #             await websocket.send(json.dumps(data))
# #             print("Sent:", data)
# #             await asyncio.sleep(4)  # Simulate 1-second intervals

# # asyncio.run(send_data())


# import time
# import random
# import socketio
# import sys

# # WebSocket URL
# BACKEND_WS_URL = "http://192.168.182.120:5000/"

# # Create a socketio client
# sio = socketio.Client()

# # Connection event handlers
# @sio.event
# def connect():
#     print(f"Connected to backend at {BACKEND_WS_URL}")

# @sio.event
# def connect_error(data):
#     print(f"Connection failed: {data}")
#     sys.exit(1)

# @sio.event
# def disconnect():
#     print("Disconnected from backend")

# # Try to connect to backend
# try:
#     print(f"Attempting to connect to {BACKEND_WS_URL}...")
#     sio.connect(BACKEND_WS_URL)
# except Exception as e:
#     print(f"Connection error: {e}")
#     sys.exit(1)

# # Main loop for sending data
# try:
#     while True:
#         data = {
#             "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
#             "channels": [
#                 {"channel": i, "raw": random.randint(0, 65535), "voltage": round(random.uniform(0, 3.3), 3)}
#                 for i in range(5)
#             ]
#         }
#         try:
#             sio.emit("adc_data", data)
#             print(f"Sent data at {data['timestamp']}")
#         except Exception as e:
#             print(f"Error sending data: {e}")
        
#         time.sleep(5)  # Send every 5 seconds
# except KeyboardInterrupt:
#     print("Program interrupted by user")
# finally:
#     print("Disconnecting...")
#     sio.disconnect()



import time
import random
import socketio
import sys
import math

# WebSocket URL
BACKEND_WS_URL = "http://10.197.108.120:5000"

# Dummy device_id — replace this with actual one registered in your DB
DEVICE_ID = "b@gmail.com"

# Ask user for mode
print("Select data generation mode:")
print("1. normal - Random gesture data")
print("2. rehab - Simulated hand opening/closing for rehabilitation")
print("3. fracture - Simulated bone fracture with baseline deviation")
print("4. parkinson - Simulated Parkinson's symptoms (tremor, rigidity, bradykinesia)")
mode = input("Enter mode (normal/rehab/fracture/parkinson): ").strip().lower()

if mode not in ['normal', 'rehab', 'fracture', 'parkinson']:
    print("Invalid mode. Defaulting to 'normal'")
    mode = 'normal'

print(f"Mode selected: {mode}")

# Create a socketio client
sio = socketio.Client()

# Rehab simulation state
rehab_time = 0
rehab_direction = 1  # 1 for opening, -1 for closing

# Fracture simulation state
fracture_baseline = [48000, 50000, 52000, 49000, 51000]  # Normal baseline values
fracture_deviation = [0, 0, 8000, 0, 0]  # Middle finger has fracture (high deviation)

# Parkinson's simulation state  
parkinson_time = 0
parkinson_tremor_freq = [4.5, 5.2, 3.8, 4.1, 5.0]  # Tremor frequencies for each finger (3-8 Hz range)
parkinson_severity = 1
  # 0.0 = normal, 1.0 = severe symptoms

def generate_normal_data():
    """Generate random ADC values for normal gesture recognition"""
    return [random.randint(45000, 56000) for _ in range(5)]

def generate_rehab_data():
    """Generate simulated hand opening/closing motion for rehabilitation"""
    global rehab_time, rehab_direction
    
    # Simulate a smooth opening/closing cycle (sinusoidal motion)
    # Full cycle takes about 2-3 seconds
    cycle_speed = 0.05  # Controls how fast the hand opens/closes
    rehab_time += cycle_speed
    
    # Use sine wave for smooth motion: closed (45000) <-> open (55000)
    base_value = 50000
    amplitude = 5000
    
    # Each finger can have slightly different timing for more realistic motion
    values = []
    for i in range(5):
        # Add slight phase offset for each finger
        phase_offset = i * 0.1
        finger_value = base_value + amplitude * math.sin(rehab_time + phase_offset)
        
        # Add small random noise for realism
        noise = random.randint(-200, 200)
        values.append(int(finger_value + noise))
    
    return values

def generate_fracture_data():
    """Generate simulated bone fracture data with baseline deviation"""
    values = []
    for i in range(5):
        # Normal variation around baseline
        normal_variation = random.randint(-7000, 7000)
        
        # Add fracture deviation (consistent offset for fractured finger)
        fractured_value = fracture_baseline[i] + fracture_deviation[i] + normal_variation
        
        # Add some stability - fractured finger shows consistent deviation
        if fracture_deviation[i] > 0:  # This finger is fractured
            # Add slight random walk to simulate healing/displacement changes
            fracture_deviation[i] += random.randint(-100, 100)
            # Keep within reasonable bounds
            fracture_deviation[i] = max(5000, min(12000, fracture_deviation[i]))
        
        values.append(int(fractured_value))
    
    return values

def generate_parkinson_data():
    """Generate simulated Parkinson's disease data with tremor, rigidity, and bradykinesia"""
    global parkinson_time
    
    # Time increment for continuous tremor simulation
    dt = 0.033  # ~30 Hz sampling
    parkinson_time += dt
    
    values = []
    base_values = [48000, 50000, 52000, 49000, 51000]
    
    for i in range(5):
        # Base value for this finger
        base_value = base_values[i]
        
        # 1. Tremor simulation (3-8 Hz oscillation)
        tremor_amplitude = 800 * parkinson_severity  # Tremor strength
        tremor = tremor_amplitude * math.sin(2 * math.pi * parkinson_tremor_freq[i] * parkinson_time)
        
        # 2. Rigidity simulation (reduced range of motion)
        rigidity_factor = 1.0 - (0.4 * parkinson_severity)  # Reduce ROM by up to 40%
        movement_range = 3000 * rigidity_factor
        
        # 3. Bradykinesia simulation (slower movements)
        slow_movement_freq = 0.3 * (1.0 - 0.5 * parkinson_severity)  # Slower movements
        slow_movement = movement_range * math.sin(2 * math.pi * slow_movement_freq * parkinson_time)
        
        # 4. Add jerkiness (irregular acceleration)
        jerk_noise = random.randint(-300, 300) * parkinson_severity
        
        # Combine all symptoms
        finger_value = base_value + tremor + slow_movement + jerk_noise
        
        # Add small random noise for realism
        noise = random.randint(-100, 100)
        values.append(int(finger_value + noise))
    
    return values

# Connection event handlers
@sio.event
def connect():
    print(f"Connected to backend at {BACKEND_WS_URL}")
    print(f"Generating {mode} data...")

@sio.event
def connect_error(data):
    print(f"Connection failed: {data}")
    sys.exit(1)

@sio.event
def disconnect():
    print("Disconnected from backend")

# Try to connect to backend
try:
    print(f"Attempting to connect to {BACKEND_WS_URL}...")
    sio.connect(BACKEND_WS_URL)
except Exception as e:
    print(f"Connection error: {e}")
    sys.exit(1)

# Main loop for sending data
try:
    iteration = 0
    while True:
        # Generate data based on mode
        if mode == 'rehab':
            raw_values = generate_rehab_data()
            interval = 0.33  # ~30 fps for smooth rehab data
        elif mode == 'fracture':
            raw_values = generate_fracture_data()
            interval = 1.5  # 2 Hz for fracture monitoring
        elif mode == 'parkinson':
            raw_values = generate_parkinson_data()
            interval = 0.033  # ~30 Hz for tremor detection
        else:  # normal mode
            raw_values = generate_normal_data()
            interval = 4  # 4 seconds for normal mode
        
        data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "device_id": DEVICE_ID,
            "channels": [
                {
                    "channel": i,
                    "raw": raw_values[i],
                    "voltage": round(raw_values[i] / 65535 * 3.3, 3)
                }
                for i in range(5)
            ]
        }

        try:
            sio.emit("adc_data", data)
            
            # Print status based on mode
            if mode in ['rehab', 'parkinson']:
                # Print less frequently for high-frequency modes
                if iteration % 30 == 0:  # Every ~1 second
                    print(f"[{mode}] Sample values: {[v for v in raw_values]}")
            elif mode == 'fracture':
                if iteration % 10 == 0:  # Every ~5 seconds
                    print(f"[{mode}] Fracture simulation - Middle finger deviation: {fracture_deviation[2]}")
                    print(f"[{mode}] Values: {raw_values}")
            else:  # normal
                print(f"[{mode}] Sent data at {data['timestamp']} for device {DEVICE_ID}")
                
        except Exception as e:
            print(f"Error sending data: {e}")
        
        iteration += 1
        time.sleep(interval)
except KeyboardInterrupt:
    print("\nProgram interrupted by user")
finally:
    print("Disconnecting...")
    sio.disconnect()
