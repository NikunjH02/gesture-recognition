from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import datetime
import json

app = Flask(__name__)
CORS(app)

# Initialize the database if it doesn't exist
def init_db():
    conn = sqlite3.connect('gestures.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS gestures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        values TEXT NOT NULL,
        message TEXT,
        timestamp TEXT NOT NULL
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        messages TEXT NOT NULL
    )
    ''')
    conn.commit()
    conn.close()

# Mapping of gesture values to messages
def get_gesture_message_mapping():
    # This is an example mapping - you should replace with your actual mappings
    return {
        # Format: tuple of values -> corresponding message
        (1, 2, 3, 4, 5): "Hello",
        (5, 4, 3, 2, 1): "Goodbye",
        (1, 1, 1, 1, 1): "Help",
        (2, 2, 2, 2, 2): "Yes",
        (3, 3, 3, 3, 3): "No",
        (4, 4, 4, 4, 4): "Thank you",
        (5, 5, 5, 5, 5): "Please",
        # Add more mappings as needed
    }

init_db()

@app.route('/add_values', methods=['POST'])
def add_values():
    data = request.json
    values = data.get('values', [])
    message = data.get('message', '')
    timestamp = datetime.datetime.now().isoformat()

    conn = sqlite3.connect('gestures.db')
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO gestures (values, message, timestamp) VALUES (?, ?, ?)',
        (json.dumps(values), message, timestamp)
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Values added successfully"})

@app.route('/history', methods=['GET'])
def get_history():
    conn = sqlite3.connect('gestures.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, values, message, timestamp FROM gestures ORDER BY id DESC')
    rows = cursor.fetchall()
    conn.close()

    history = []
    for row in rows:
        id, values_json, message, timestamp = row
        values = json.loads(values_json)
        history.append({
            "id": id,
            "values": values,
            "message": message,
            "timestamp": timestamp
        })

    return jsonify(history)

@app.route('/get_message', methods=['POST'])
def get_message():
    data = request.json
    values = data.get('values', [])
    
    # Get the gesture mappings
    mappings = get_gesture_message_mapping()
    
    # Convert the values list to a tuple for dictionary lookup
    values_tuple = tuple(values)
    
    # Try to find an exact match in the mappings
    message = mappings.get(values_tuple, None)
    
    # If no exact match, try to find the closest mapping
    if message is None:
        # For simplicity, just check if the first few values match
        for mapping_values, mapping_message in mappings.items():
            # Check if there are enough values to compare
            min_length = min(len(values), len(mapping_values))
            if values[:min_length] == mapping_values[:min_length]:
                message = mapping_message
                break
    
    # If still no match, return a default message
    if message is None:
        message = "Unrecognized gesture"
    
    return jsonify({"message": message})

@app.route('/get_messages', methods=['GET'])
def get_messages():
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    conn = sqlite3.connect('gestures.db')
    cursor = conn.cursor()
    cursor.execute('SELECT messages FROM user_messages WHERE user_id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    # Check if we found a row for this user
    if row:
        try:
            messages = json.loads(row[0])
            return jsonify({"messages": messages})
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid message format in database"}), 500
    
    # Default messages if user doesn't have custom messages
    default_messages = ["Hello", "Help", "Yes", "No", "Thank you"]
    return jsonify({"messages": default_messages})

@app.route('/save_messages', methods=['POST'])
def save_messages():
    data = request.json
    user_id = data.get('user_id')
    messages = data.get('messages', [])
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    if not messages or not isinstance(messages, list):
        return jsonify({"error": "Messages must be a non-empty list"}), 400
    
    conn = sqlite3.connect('gestures.db')
    cursor = conn.cursor()
    
    # Check if user already has messages
    cursor.execute('SELECT id FROM user_messages WHERE user_id = ?', (user_id,))
    row = cursor.fetchone()
    
    if row:
        # Update existing messages
        cursor.execute(
            'UPDATE user_messages SET messages = ? WHERE user_id = ?',
            (json.dumps(messages), user_id)
        )
    else:
        # Insert new messages
        cursor.execute(
            'INSERT INTO user_messages (user_id, messages) VALUES (?, ?)',
            (user_id, json.dumps(messages))
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Messages saved successfully"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)