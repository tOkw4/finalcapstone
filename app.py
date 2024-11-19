import logging
from flask import Flask, request, jsonify
import pickle
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
import whois
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
svm_model_path = resource_path('SVM_Model.pkl')

with open(model_path, 'rb') as model_file:
    email_model = pickle.load(model_file)

with open(vectorizer_path, 'rb') as vectorizer_file:
    vectorizer = pickle.load(vectorizer_file)

with open(svm_model_path, 'rb') as svm_file:
    url_model = pickle.load(svm_file)

# Load the CSV file
csv_file_path = resource_path('Web_Scrapped_websites.csv')
print(f"Looking for CSV file at: {csv_file_path}")
with open(csv_file_path, 'r') as read_obj:
    csv_reader = reader(read_obj)
    for row in csv_reader:
        pass


@app.route('/')
def home():
    return "<h1>Phishing Mail Detection API</h1><p>Use the /detect endpoint to check emails.</p>"

# MAIL


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

# 2.Checks for IP address in URL (Have_IP)


def havingIP(url):
    index = url.find("://")
    split_url = url[index+3:]
    index = split_url.find("/")
    split_url = split_url[:index]
    split_url = split_url.replace(".", "")
    counter_hex = 0
    for i in split_url:
        if i in string.hexdigits:
            counter_hex += 1
    total_len = len(split_url)
    having_IP_Address = 0
    if counter_hex >= total_len:
        having_IP_Address = 1
    return having_IP_Address


# 3.Checks the presence of @ in URL (Have_At)
sc = ['@', '~', '`', '!', '$', '%', '&']


def haveAtSign(url):
    flag = 0
    for i in range(len(sc)):
        if sc[i] in url:
            at = 1
            flag = 1
            break
    if flag == 0:
        at = 0
    return at

# 4.Finding the length of URL and categorizing (URL_Length)


def getLength(url):
    if len(url) < 54:
        length = 0
    else:
        length = 1
    return length

# 5.Gives number of '/' in URL (URL_Depth)


def getDepth(url):
    s = urlparse(url).path.split('/')
    depth = 0
    for j in range(len(s)):
        if len(s[j]) != 0:
            depth = depth+1
    return depth

# 6.Checking for redirection '//' in the url (Redirection)


def redirection(url):
    pos = url.rfind('//')
    if pos > 6:
        if pos > 7:
            return 1
        else:
            return 0
    else:
        return 0

# 7.Existence of “HTTPS” Token in the Domain Part of the URL (https_Domain)


def httpDomain(url):
    domain = urlparse(url).netloc
    if 'https' in domain:
        return 1
    else:
        return 0


# listing shortening services
shortening_services = r"bit\.ly|goo\.gl|shorte\.st|go2l\.ink|x\.co|ow\.ly|t\.co|tinyurl|tr\.im|is\.gd|cli\.gs|" \
                      r"yfrog\.com|migre\.me|ff\.im|tiny\.cc|url4\.eu|twit\.ac|su\.pr|twurl\.nl|snipurl\.com|" \
                      r"short\.to|BudURL\.com|ping\.fm|post\.ly|Just\.as|bkite\.com|snipr\.com|fic\.kr|loopt\.us|" \
                      r"doiop\.com|short\.ie|kl\.am|wp\.me|rubyurl\.com|om\.ly|to\.ly|bit\.do|t\.co|lnkd\.in|db\.tt|" \
                      r"qr\.ae|adf\.ly|goo\.gl|bitly\.com|cur\.lv|tinyurl\.com|ow\.ly|bit\.ly|ity\.im|q\.gs|is\.gd|" \
                      r"po\.st|bc\.vc|twitthis\.com|u\.to|j\.mp|buzurl\.com|cutt\.us|u\.bb|yourls\.org|x\.co|" \
                      r"prettylinkpro\.com|scrnch\.me|filoops\.info|vzturl\.com|qr\.net|1url\.com|tweez\.me|v\.gd|" \
                      r"tr\.im|link\.zip\.net"

# 8. Checking for Shortening Services in URL (Tiny_URL)


def tinyURL(url):
    match = re.search(shortening_services, url)
    if match:
        return 1
    else:
        return 0

# 9.Checking for Prefix or Suffix Separated by (-) in the Domain (Prefix/Suffix)


def prefixSuffix(url):
    if '-' in urlparse(url).netloc:
        return 1            # phishing
    else:
        return 0            # legitimate


# 11.DNS Record availability (DNS_Record)
# obtained in the featureExtraction function itself

# 12.Web traffic (Web_Traffic)
def web_traffic(url):
    try:
        extract_res = tldextract.extract(url)
        url_ref = extract_res.domain + "." + extract_res.suffix
        html_content = requests.get(
            "https://www.alexa.com/siteinfo/" + url_ref).text
        soup = BeautifulSoup(html_content, "lxml")
        value = str(soup.find(
            'div', {'class': "rankmini-rank"}))[42:].split("\n")[0].replace(",", "")
        if not value.isdigit():
            return 1
        value = int(value)
        if value < 100000:
            return 0
        else:
            return 1
    except:
        return 1

# 13.Survival time of domain: The difference between termination time and creation time (Domain_Age)


def domainAge(url):
    extract_res = tldextract.extract(url)
    url_ref = extract_res.domain + "." + extract_res.suffix
    try:
        whois_res = whois.whois(url)
        if datetime.datetime.now() > whois_res["creation_date"][0] + relativedelta(months=+6):
            return 0
        else:
            return 1
    except:
        return 1

# 14.End time of domain: The difference between termination time and current time (Domain_End)


def domainEnd(domain_name):
    expiration_date = domain_name.expiration_date
    if isinstance(expiration_date, str):
        try:
            expiration_date = datetime.strptime(expiration_date, "%Y-%m-%d")
        except:
            end = 1
    if (expiration_date is None):
        end = 1
    elif (type(expiration_date) is list):
        today = datetime.datetime.now()
        domainDate = abs((expiration_date[0] - today).days)
        if ((domainDate/30) < 6):
            end = 1
        else:
            end = 0
    else:
        today = datetime.datetime.now()
        domainDate = abs((expiration_date - today).days)
        if ((domainDate/30) < 6):
            end = 1
        else:
            end = 0
    return end

# 15. IFrame Redirection (iFrame)


def iframe(response):
    if response == "":
        return 1
    else:
        if re.findall(r"[<iframe>|<frameBorder>]", response.text):
            return 0
        else:
            return 1

# 16.Checks the effect of mouse over on status bar (Mouse_Over)


def mouseOver(response):
    if response == "":
        return 1
    else:
        if re.findall("<script>.+onmouseover.+</script>", response.text):
            return 1
        else:
            return 0

# 18.Checks the number of forwardings (Web_Forwards)


def forwarding(response):
    if response == "":
        return 1
    else:
        if len(response.history) <= 2:
            return 0
        else:
            return 1

# 16. Extra feature checks url exists in popular websites data


def checkCSV(url):
    flag = 0
    try:
        checkURL = urlparse(url).netloc
    except:
        return 1
    with open('Web_Scrapped_websites.csv', 'r') as read_obj:
        csv_reader = reader(read_obj)
        for row in csv_reader:
            if row[0] == checkURL:
                flag = 0
                break
            else:
                flag = 1
    if flag == 0:
        return 0
    else:
        return 1


def featureExtraction(url):

    features = []
    # Address bar based features (10)
    # features.append(getDomain(url))
    features.append(havingIP(url))
    features.append(haveAtSign(url))
    features.append(getLength(url))
    features.append(getDepth(url))
    features.append(redirection(url))
    features.append(httpDomain(url))
    features.append(tinyURL(url))
    features.append(prefixSuffix(url))

    # Domain based features (4)
    dns = 0
    try:
        domain_name = whois.whois(urlparse(url).netloc)
    except:
        dns = 1

    features.append(dns)
    features.append(web_traffic(url))
    features.append(1 if dns == 1 else domainAge(url))
    features.append(1 if dns == 1 else domainEnd(domain_name))

    # HTML & Javascript based features
    try:
        response = requests.get(url)
    except:
        response = ""

    features.append(iframe(response))
    features.append(mouseOver(response))
    features.append(forwarding(response))

    return features


# URL
logging.basicConfig(level=logging.INFO)


@app.route('/post', methods=['POST'])
def predict_URL():
    data = request.get_json()
    logging.info(f"Received data: {data}")

    if not data or 'URL' not in data:
        logging.error("Invalid data or missing 'URL'")
        return jsonify({'error': 'No URL provided'}), 400

    url = data['URL']
    logging.info(f"Processing URL: {url}")

    # Proceed with checking CSV, extracting features, and returning prediction and probability
    if checkCSV(url) == 0:
        return jsonify({'prediction': "1", 'probability': 1.0})  # Known safe

    features = featureExtraction(url)
    if features:
        prediction = url_model.predict([features])[0]
        probability = url_model.predict_proba(
            [features])[0][prediction]  # Confidence score
    else:
        prediction, probability = "1", 0.0  # Default safe if no features

    result = "1" if prediction == 0 else "-1"
    return jsonify({'prediction': result, 'probability': probability})


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
