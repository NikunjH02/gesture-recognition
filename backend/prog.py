import pandas as pd
import numpy as np
import pickle

# Load the scaler
with open("scaler.pkl", "rb") as f:
    scaler = pickle.load(f)

# Load feature names from a dataset
sample_df = pd.read_csv("combined_dataset.csv")  # Load one of the original datasets
feature_columns = sample_df.drop(columns=['Timestamp', 'Target'], errors='ignore').columns

print("Expected input format (feature names):", list(feature_columns))

# Define model names
model_names = [
    "logistic_regression.pkl",
    "knn.pkl",
    "multinomial_naive_bayes.pkl",
    "svm.pkl",
    "random_forest.pkl",
    "gradient_boosting.pkl"
]

# Load models
models = {}
for model_name in model_names:
    with open(model_name, "rb") as f:
        models[model_name] = pickle.load(f)

# Function to make predictions
def predict(input_data):
    if len(input_data) != len(feature_columns):
        raise ValueError(f"Expected {len(feature_columns)} values, but got {len(input_data)}")
    
    input_data = np.array(input_data).reshape(1, -1)  # Ensure the input is a 2D array for a single row
    input_scaled = scaler.transform(input_data)  # Scale the input
    
    predictions = {}
    for name, model in models.items():
        if "multinomial_naive_bayes" in name:  # MNB requires non-negative data
            pred = model.predict(np.abs(input_scaled))
        else:
            pred = model.predict(input_scaled)
        predictions[name] = pred[0]
    
    return predictions

# Example usage with a single row of input data
sample_input = [65279,65343,65343,48559,44459,3.284,3.287,3.284,2.458,2.242]  # Replace with actual input based on feature names
results = predict(sample_input)
print("Predictions:", results)
