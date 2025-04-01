# from flask import Flask, jsonify
# from flask_socketio import SocketIO, emit
# from flask_cors import CORS
# from datetime import datetime, timedelta

# app = Flask(__name__)
# # Enable CORS for all routes
# CORS(app)

# # Configure SocketIO with less restrictive CORS
# socketio = SocketIO(app, 
#     cors_allowed_origins="*",
#     async_mode='threading'
# )

# # Sample history data
# history = [
#     {
#         "id": 1,
#         "values": [0.8, 0.2, 0.6, 0.9, 0.3],
#         "message": "Hello gesture detected",
#         "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat()
#     },
#     {
#         "id": 2,
#         "values": [0.4, 0.7, 0.2, 0.5, 0.8],
#         "message": "Thank you gesture detected",
#         "timestamp": (datetime.now() - timedelta(minutes=2)).isoformat()
#     },
#     {
#         "id": 3,
#         "values": [0.9, 0.3, 0.7, 0.4, 0.6],
#         "message": "Goodbye gesture detected",
#         "timestamp": datetime.now().isoformat()
#     }
# ]

# @app.route('/history', methods=['GET'])
# def get_history():
#     return jsonify(history)

# @socketio.on('connect')
# def handle_connect():
#     print('Client connected')

# @socketio.on('disconnect')
# def handle_disconnect():
#     print('Client disconnected')

# @socketio.on('trigger_notification')
# def handle_trigger_notification(data):
#     history.append(data)
#     emit('notification', data, broadcast=True)

# @app.after_request
# def after_request(response):
#     response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
#     response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
#     response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
#     return response

# if __name__ == '__main__':
#     socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)



from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import pandas as pd
from pymongo import MongoClient
import pickle
import numpy as np
import time
from dotenv import load_dotenv
import os

# Flask & SocketIO setup
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# MongoDB setup
# Load environment variables
load_dotenv()

# MongoDB setup
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = MongoClient(mongo_url)
db = client["sensor_data"]
adc_collection = db["adc_values"]
classification_collection = db["classified_results"]

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

# REST API: Fetch stored ADC values
@app.route('/adc_history', methods=['GET'])
def get_adc_history():
    data = list(adc_collection.find({}, {"_id": 0})) 
    return jsonify(data)


@app.route('/history', methods=['GET'])
def get_classified_history():
    data = list(classification_collection.find({}))

    formatted_data = []
    for entry in data:
        formatted_entry = {
            "id": str(entry.get("_id", "")),  # Convert ObjectId to string
            "values": entry.get("features", []),  # Extract 'features' as values
            "message": str(entry.get("predictions", {}).get("random_forest.pkl", "No prediction")),  # Extract message
            "timestamp": entry.get("timestamp", "Unknown")  # Ensure timestamp exists
        }
        formatted_data.append(formatted_entry)

    print("Classified Data:", formatted_data)
    return jsonify(formatted_data)

    # data = list(classification_collection.find({}))  
    # print("Classified data:", data)
    # return jsonify(data)

# WebSocket: Raspberry Pi sends ADC data
@socketio.on('adc_data')
def handle_adc_data(data):
    # print("Received ADC data:", data)

    # Extract features
    input_features = []
    for ch in data["channels"]:
        input_features.append(ch["raw"])
        input_features.append(ch["voltage"])
    
    # Ensure we have the correct number of features
    if len(input_features) != len(feature_columns):
        print(f"Warning: Expected {len(feature_columns)} features, but got {len(input_features)}")
    
    # Save ADC values in MongoDB
    adc_entry = {
        "timestamp": data["timestamp"],
        "features": input_features
    }
    adc_collection.insert_one(adc_entry)

    # Perform classification

    predictions = classify_data(input_features)
    print(predictions)

    # Save classified results in MongoDB
    classified_entry = {
        "timestamp": data["timestamp"],
        "features": input_features,
        "predictions": predictions
    }
    classification_collection.insert_one(classified_entry)

    # # Send results to frontend  
    # emit('classified_data', {"timestamp": data["timestamp"], "predictions": predictions}, broadcast=True)
    # Prepare data for frontend
    response_data = {
        "values": input_features[::2],  # Assuming the first 5 features are relevant
        "message": str(predictions.get("random_forest.pkl", "No gesture detected"))
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