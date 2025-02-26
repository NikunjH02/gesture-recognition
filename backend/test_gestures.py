import socketio
import time
import random
from datetime import datetime

# List of possible gestures for testing
GESTURES = ['Hello', 'Thank you', 'Goodbye', 'Yes', 'No', 'Please', 'Help']

# Create a Socket.IO client with engineio_logger for debugging
sio = socketio.Client(logger=True)

@sio.event
def connect():
    print('Successfully connected to server')
    start_sending_gestures()

@sio.event
def connect_error(data):
    print(f'Connection error: {data}')

@sio.event
def disconnect():
    print('Disconnected from server')

def generate_random_gesture():
    return {
        'id': int(time.time() * 1000),
        'values': [round(random.random(), 2) for _ in range(5)],
        'message': random.choice(GESTURES),
        'timestamp': datetime.now().isoformat()
    }

def start_sending_gestures():
    print('Starting to send random gestures every 5 seconds...')
    while True:
        try:
            gesture_data = generate_random_gesture()
            print(f"Sending gesture: {gesture_data['message']}")
            sio.emit('trigger_notification', gesture_data)
            time.sleep(50)
        except Exception as e:
            print(f"Error: {e}")
            break

if __name__ == '__main__':
    try:
        # Connect with explicit transport
        print('Attempting to connect to server...')
        sio.connect(
            'http://192.168.171.68:5000',
            transports=['websocket'],
            wait_timeout=10
        )
        sio.wait()
    except KeyboardInterrupt:
        print('\nStopping gesture simulation...')
        sio.disconnect()
    except Exception as e:
        print(f"Connection error: {e}")
