import logging
from flask import Flask, request, jsonify
import pickle
from flask_cors import CORS
import numpy as np
from flask_cors import CORS
from urllib.parse import urlparse, urlencode
import ipaddress
import re
from bs4 import BeautifulSoup
import urllib
import urllib.request
from datetime import datetime
import requests
import tldextract
import string
import datetime
from dateutil.relativedelta import relativedelta
from csv import reader
import os
import sys
from csv import reader
import time
import threading
from pystray import Icon, Menu, MenuItem
from PIL import Image, ImageDraw
import ctypes
import socket
from googlesearch import search
from dateutil.parser import parse as date_parse
from urllib.parse import urlparse
import pandas as pd
import whois
from feature import FeatureExtraction
from sklearn import metrics
import joblib
import warnings

warnings.filterwarnings(
    "ignore", message="X does not have valid feature names")


app = Flask(__name__)


def load_icon(icon_path):
    """Load the icon file."""
    return Image.open(icon_path)


# Function to manage the system tray


def tray_icon():
    """Set up and display the system tray icon."""
    menu = Menu(
        MenuItem('Exit', lambda: icon.stop())  # Add an exit option
    )
    # Path to your icon file
    icon_path = "icon.ico"

    # Create the tray icon
    global icon
    icon = Icon("MyApp", load_icon(icon_path), "Stinky", menu)
    icon.run()

# Hide the console window


def hide_console():
    ctypes.windll.user32.ShowWindow(
        ctypes.windll.kernel32.GetConsoleWindow(), 0)
###################


def resource_path(relative_path):
    """Get the absolute path to the resource, works for dev and for PyInstaller"""
    if getattr(sys, 'frozen', False):
        # If the app is running as a PyInstaller bundle
        base_path = sys._MEIPASS
    else:
        # If running in a normal Python environment
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


# Load the model and vectorizer using resource_path
model_path = resource_path('model.pkl')
vectorizer_path = resource_path('vectorizer.pkl')
# Load the SVM model at the start of your script
stacked_model_path = resource_path('stacked_model.pkl')


with open(model_path, 'rb') as model_file:
    email_model = pickle.load(model_file)

with open(vectorizer_path, 'rb') as vectorizer_file:
    vectorizer = pickle.load(vectorizer_file)

stacked = joblib.load(stacked_model_path)


@app.route('/')
def home():
    return "<h1>Phishing Mail Detection API</h1><p>Use the /detect endpoint to check emails.</p>"


@app.route('/detect', methods=['POST'])
def detect():
    data = request.json
    if 'email_text' not in data:
        return jsonify({'error': 'No email_text provided'}), 400

    email_text = data['email_text']

    # Transform the email text using the vectorizer
    email_vector = vectorizer.transform([email_text])
    email_vector_dense = email_vector.toarray()

    # Make a prediction using the model
    prediction = email_model.predict(email_vector_dense)[0]
    result = "It is a safe mail, don't worry :>" if prediction == 1 else 'Be careful, this mail might be a Phishing'

    return jsonify({'result': result})


@app.route('/post', methods=['POST'])
def extract_features_and_predict():
    # Get the JSON data from the request
    data = request.get_json()

    # Ensure the URL is provided in the request
    if 'URL' not in data:
        return jsonify({'error': 'URL is required'}), 400

    url = data['URL']
    obj = FeatureExtraction(url)
    x = np.array(obj.getFeaturesList()).reshape(1, 30)

    y_pred = stacked.predict(x)[0]
    y_pro_phishing = stacked.predict_proba(x)[0, 0]
    y_pro_non_phishing = stacked.predict_proba(x)[0, 1]

    # Return the prediction and features as a JSON response
    return jsonify({
        "url": url,
        "prediction": int(y_pred),  # Safe/unsafe label
        "probabilities": {
            "phishing": float(y_pro_phishing),
            "non_phishing": float(y_pro_non_phishing),
        }

    }), 200


# Function to start Flask server


def start_flask():
    app.run(debug=True, use_reloader=False)


if __name__ == "__main__":
    # Hide console window
    hide_console()

    # Start Flask server in a separate thread
    flask_thread = threading.Thread(target=start_flask, daemon=True)
    flask_thread.start()

    # Start the system tray icon
    tray_icon()
