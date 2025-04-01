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

# WebSocket URL
BACKEND_WS_URL = "http://localhost:5000"

# Create a socketio client
sio = socketio.Client()

# Connect to backend
sio.connect(BACKEND_WS_URL)

while True:
    data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "channels": [
            {"channel": i, "raw": random.randint(0, 65535), "voltage": round(random.uniform(0, 3.3), 3)}
            for i in range(5)
        ]
    }
    sio.emit("adc_data", data)  # Send data to backend
    print("Sent:", data)
    time.sleep(5)  # Send every second