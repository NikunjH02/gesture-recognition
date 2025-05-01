from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import pandas as pd
from pymongo import MongoClient
import pickle
import numpy as np
import time
from dotenv import load_dotenv
import os
import uuid
import re

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_secret_key')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
bcrypt = Bcrypt(app)

# MongoDB setup
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = MongoClient(mongo_url)
db = client["sensor_data"]
classification_collection = db["classified_results"]
user_collection = db["users"]
messages_collection = db["user_messages"]

# Default messages for new users
DEFAULT_MESSAGES = {
  "0": "I am hungry",
  "1": "I am thirsty",
  "2": "I need water",
  "3": "I want to eat",
  "4": "I need help",
  "5": "I am tired",
  "6": "I am feeling sick",
  "7": "I am in pain",
  "8": "Call a doctor",
  "9": "I need medicine",
  "10": "Please wait",
  "11": "I am okay",
  "12": "Thank you",
  "13": "Sorry",
  "14": "Yes",
  "15": "No",
  "16": "Where is the bathroom?",
  "17": "I am cold",
  "18": "I am hot",
  "19": "Can you help me?",
  "20": "What is your name?",
  "21": "My name is [Name]",
  "22": "Nice to meet you",
  "23": "I don't understand",
  "24": "Can you repeat that?",
  "25": "I need to go",
  "26": "Please come here",
  "27": "I am lost",
  "28": "Call my family",
  "29": "I can't hear",
  "30": "I use sign language",
  "31": "I need to rest"
}

# Load scaler
with open("scaler.pkl", "rb") as f:
    scaler = pickle.load(f)

# Load models
model_files = [
    "logistic_regression.pkl",
    "knn.pkl",
    "multinomial_naive_bayes.pkl",
    "svm.pkl",
    "random_forest.pkl",
    "gradient_boosting.pkl"
]
models = {}
for file in model_files:
    with open(file, "rb") as f:
        models[file] = pickle.load(f)

# Define feature columns (Update with real names)
sample_df = pd.read_csv("combined_dataset.csv")  # Load one of the original datasets
feature_columns = sample_df.drop(columns=['Timestamp', 'Target'], errors='ignore').columns

# print("Expected input format (feature names):", list(feature_columns))


# Function to classify input data
def classify_data(input_data):
    if len(input_data) != len(feature_columns):
        raise ValueError(f"Expected {len(feature_columns)} values, but got {len(input_data)}")

    input_array = np.array(input_data).reshape(1, -1)
    input_scaled = scaler.transform(input_array)

    predictions = {}
    for name, model in models.items():
        if "multinomial_naive_bayes" in name:
            pred = model.predict(np.abs(input_scaled))
        else:
            pred = model.predict(input_scaled)
        predictions[name] = int(pred[0])

    return predictions


# Routes for authentication
@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')
    device_id = data.get('device_id')
    
    # Validation
    if not email or not password or not username or not device_id:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    if not is_valid_email(email):
        return jsonify({"success": False, "message": "Invalid email format"}), 400
    
    if not is_valid_username(username):
        return jsonify({"success": False, "message": "Username must be 3-20 characters, alphanumeric"}), 400
        
    if not is_valid_password(password):
        return jsonify({"success": False, "message": "Password must be at least 8 characters"}), 400
    
    # Check if user already exists
    if user_collection.find_one({"email": email}):
        return jsonify({"success": False, "message": "Email already registered"}), 400
    
    if user_collection.find_one({"username": username}):
        return jsonify({"success": False, "message": "Username already taken"}), 400
        
    # Check if device_id is already registered
    if user_collection.find_one({"device_id": device_id}):
        return jsonify({"success": False, "message": "Device ID already registered"}), 400
    
    # Create new user
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    user_id = str(uuid.uuid4())
    
    user = {
        "user_id": user_id,
        "email": email,
        "username": username,
        "password": hashed_password,
        "device_id": device_id,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    user_collection.insert_one(user)
    
    # Save default messages for the new user
    user_messages = {
        "user_id": user_id,
        "messages": DEFAULT_MESSAGES
    }
    messages_collection.insert_one(user_messages)
    
    return jsonify({
        "success": True, 
        "message": "User registered successfully",
        "user_id": user_id,
        "username": username,
        "device_id": device_id
    }), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"success": False, "message": "Missing email or password"}), 400
    
    # Find user
    user = user_collection.find_one({"email": email})
    if not user:
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
    
    # Verify password
    if not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
    
    # Create session
    session['user_id'] = user['user_id']
    session['username'] = user['username']
    
    return jsonify({
        "success": True,
        "message": "Login successful",
        "user_id": user['user_id'],
        "username": user['username']
    }), 200

def is_valid_email(email):
    """Check if email format is valid"""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

def is_valid_username(username):
    """Check if username is valid (alphanumeric, 3-20 chars)"""
    pattern = r'^[a-zA-Z0-9_]{3,20}$'
    return re.match(pattern, username) is not None

def is_valid_password(password):
    """Check if password is strong enough"""
    if len(password) < 8:
        return False
    return True


# REST API: Fetch stored ADC values
@app.route('/adc_history', methods=['GET'])
def get_adc_history():
    # data = list(adc_collection.find({}, {"_id": 0})) 
    data=[]
    return jsonify(data)


@app.route('/history', methods=['GET'])
def get_classified_history():
    user_id = request.args.get('user_id')
    
    # Filter by user_id if provided
    query = {"user_id": user_id} if user_id else {}
    data = list(classification_collection.find(query))

    formatted_data = []
    for entry in data:
        formatted_entry = {
            "id": str(entry.get("_id", "")),
            "user_id": entry.get("user_id", ""),
            "values": entry.get("features", []),
            "message": str(entry.get("predictions", {}).get("random_forest.pkl", "No prediction")),
            "timestamp": entry.get("timestamp", "Unknown")
        }
        formatted_data.append(formatted_entry)

    return jsonify(formatted_data)

@app.route('/get_messages', methods=['GET'])
def get_user_messages():
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400
    
    user_messages = messages_collection.find_one({"user_id": user_id})
    
    if not user_messages:
        # If no messages found, create default messages for the user
        user_messages = {
            "user_id": user_id,
            "messages": DEFAULT_MESSAGES
        }
        messages_collection.insert_one(user_messages)
    
    return jsonify({
        "success": True,
        "messages": user_messages.get("messages", DEFAULT_MESSAGES)
    })

@app.route('/update_messages', methods=['POST'])
def update_user_messages():
    data = request.json
    user_id = data.get('user_id')
    messages = data.get('messages')
    
    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400
    
    if not messages or not isinstance(messages, dict):
        return jsonify({"success": False, "message": "Valid messages dictionary is required"}), 400
    
    # Verify user exists
    user = user_collection.find_one({"user_id": user_id})
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
    
    # Update or create message entry
    result = messages_collection.update_one(
        {"user_id": user_id},
        {"$set": {"messages": messages}},
        upsert=True
    )
    
    if result.modified_count > 0 or result.upserted_id:
        return jsonify({"success": True, "message": "Messages updated successfully"})
    else:
        return jsonify({"success": False, "message": "No changes made to messages"}), 400

# WebSocket: Raspberry Pi sends ADC data
@socketio.on('adc_data')
def handle_adc_data(data):
    # Extract features
    input_features = []
    for ch in data["channels"]:
        input_features.append(ch["raw"])
    
    for ch in data["channels"]:
        input_features.append(ch["voltage"])
    
    # Ensure we have the correct number of features
    if len(input_features) != len(feature_columns):
        print(f"Warning: Expected {len(feature_columns)} features, but got {len(input_features)}")
    
    # Get device_id from data
    device_id = data.get("device_id")
    user_id = None
    
    # Look up user_id based on device_id
    if device_id:
        user = user_collection.find_one({"device_id": device_id})
        if user:
            user_id = user.get("user_id")
            print(f"Device {device_id} mapped to user {user_id}")
        else:
            print(f"Warning: Device {device_id} not registered to any user")

    # Perform classification
    predictions = classify_data(input_features)
    print(predictions)

    # Save classified results in MongoDB with device_id and user_id
    classified_entry = {
        "timestamp": data["timestamp"],
        "features": input_features,
        "predictions": predictions,
        "device_id": device_id,
        "user_id": user_id
    }
    classification_collection.insert_one(classified_entry)

    # Prepare data for frontend
    response_data = {
        "values": input_features[:5],  # Only the first 5 values from input_features
        "message": str(predictions.get("random_forest.pkl", "No gesture detected")),
        "device_id": device_id,
        "user_id": user_id
    }

    # Send results to frontend
    emit('adc_data', response_data, broadcast=True)

# WebSocket: Frontend Connection
@socketio.on('connect')
def handle_connect():
    print("Frontend connected")

@socketio.on('disconnect')
def handle_disconnect():
    print("Frontend disconnected")

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)