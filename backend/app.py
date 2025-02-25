from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)
# Enable CORS for all routes
CORS(app)

# Configure SocketIO with less restrictive CORS
socketio = SocketIO(app, 
    cors_allowed_origins="*",
    async_mode='threading'
)

# Sample history data
history = [
    {
        "id": 1,
        "values": [0.8, 0.2, 0.6, 0.9, 0.3],
        "message": "Hello gesture detected",
        "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat()
    },
    {
        "id": 2,
        "values": [0.4, 0.7, 0.2, 0.5, 0.8],
        "message": "Thank you gesture detected",
        "timestamp": (datetime.now() - timedelta(minutes=2)).isoformat()
    },
    {
        "id": 3,
        "values": [0.9, 0.3, 0.7, 0.4, 0.6],
        "message": "Goodbye gesture detected",
        "timestamp": datetime.now().isoformat()
    }
]

@app.route('/history', methods=['GET'])
def get_history():
    return jsonify(history)

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('trigger_notification')
def handle_trigger_notification(data):
    history.append(data)
    emit('notification', data, broadcast=True)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
