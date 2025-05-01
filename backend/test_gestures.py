# import asyncio
# import websockets
# import json
# import random
# import time

# BACKEND_WS_URL = "ws://127.0.0.1:5000/ws"

# async def send_data():
#     async with websockets.connect(BACKEND_WS_URL) as websocket:
#         while True:
#             timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
#             data = {
#                 "timestamp": timestamp,
#                 "channels": [
#                     {"channel": i, "raw": random.randint(0, 65535), "voltage": round(random.uniform(0, 3.3), 3)}
#                     for i in range(5)
#                 ]
#             }
#             await websocket.send(json.dumps(data))
#             print("Sent:", data)
#             await asyncio.sleep(4)  # Simulate 1-second intervals

# asyncio.run(send_data())


import time
import random
import socketio
import sys

# WebSocket URL
BACKEND_WS_URL = "http://192.168.182.120:5000/"

# Create a socketio client
sio = socketio.Client()

# Connection event handlers
@sio.event
def connect():
    print(f"Connected to backend at {BACKEND_WS_URL}")

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
    while True:
        data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "channels": [
                {"channel": i, "raw": random.randint(0, 65535), "voltage": round(random.uniform(0, 3.3), 3)}
                for i in range(5)
            ]
        }
        try:
            sio.emit("adc_data", data)
            print(f"Sent data at {data['timestamp']}")
        except Exception as e:
            print(f"Error sending data: {e}")
        
        time.sleep(5)  # Send every 5 seconds
except KeyboardInterrupt:
    print("Program interrupted by user")
finally:
    print("Disconnecting...")
    sio.disconnect()