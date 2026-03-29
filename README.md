# Gesture Recognition Project

This project consists of a React Native frontend (Expo) and a Python Flask backend for gesture recognition and health monitoring.

## Prerequisites

*   **Node.js** (for the frontend)
*   **Python** (for the backend)
*   **Expo Go App** (Version 2.32.20 or compatible) installed on your mobile device.

## Installation & Setup

### 1. Base Folder (Frontend Setup)

Open a terminal in the root directory of the project and install the React Native dependencies:

```bash
npm install
```

### 2. Backend Setup

Navigate to the `backend` folder and install the required Python dependencies.

First, ensure you have a `requirements.txt` file (created based on `app.py` and `test_gestures.py`). Then run:

```bash
cd backend
pip install -r requirements.txt
```

Also create a .env file and setup your MONGODB_URI for database setup.


## Running the Project

Follow these steps in order to start the application.

### Step 1: Start the Backend

Open a terminal, navigate to the `backend` directory, and start the Flask server:

```bash
cd backend
python app.py
```

**Important:** After starting the backend, note the URL it is running on (e.g., `http://192.168.x.x:5000`). You will need this for the next step.

### Step 2: Configure Frontend Connection

1.  Open the file `src/constants/api.ts` in your code editor.
2.  Update the backend URL in that file to match the URL you got from Step 1.

### Step 3: Start the Frontend (Mobile App)

Return to the root directory and start the Expo development server:

```bash
npm start
```

1.  Wait for the Metro Bundler to start.
2.  You will see a QR code in the terminal.
3.  Open the **Expo Go** app on your phone.
4.  Scan the QR code to load the app.

**Note:** Ensure your laptop and phone are connected to the **same Wi-Fi network** (non-proxy) for them to communicate.

## Testing & Simulation

### Simulating Raspberry Pi Data

You can simulate data coming from a Raspberry Pi by running the test script.

1.  Open `backend/test_gestures.py`.
2.  Update the `BACKEND_WS_URL` variable with the new backend URL you obtained in Step 1.
3.  Run the script:

```bash
cd backend
python test_gestures.py
```

### Using Actual Raspberry Pi

If you are using the actual Raspberry Pi hardware:

1.  Open the code on your Raspberry Pi.
2.  Update the backend URL in the Pi's code to match your running backend server.
3.  Run the code on the Pi.

### Troubleshooting

*   **Socket Connection Error:** If you encounter any socket connection errors, try stopping and restarting the code (both backend and the script/Pi code).
*   **Network Issues:** Double-check that both devices are on the same network and that your firewall is not blocking the connection.
