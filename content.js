function getEmailDetails() {
    // Get the email body content
    const emailBody = document.querySelector('div.ii.gt');
    const emailContent = emailBody ? emailBody.innerText : '';
    // Get the sender's email
    const sender = document.querySelector('.gD') ? document.querySelector('.gD').innerText : 'Unknown Sender';
    // Get the email title (subject)
    const title = document.querySelector('.hP') ? document.querySelector('.hP').innerText : 'No Title';
    return { emailContent, sender, title };
}

// Function to show a modal with the scan result
function showModal(result) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '300px';
    modal.style.backgroundColor = '#FFFFFF';
    modal.style.padding = '20px';
    modal.style.borderRadius = '15px';
    modal.style.border = '2px solid #000000';
    modal.style.zIndex = 9999;
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';

    

    // Add the result text
    const resultText = document.createElement('p');
    resultText.innerText = `Prediction: ${result}`;
    resultText.style.textAlign = 'center';
    resultText.style.margin = '0';
    modal.appendChild(resultText);

    // Close button in the bottom right
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Close';
    closeButton.style.display = 'block';
    closeButton.style.margin = '15px auto 0';
    closeButton.style.padding = '8px 12px';
    closeButton.style.backgroundColor = '#C73659';
    closeButton.style.color = '#FFFFFF';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.onclick = function () {
        document.body.removeChild(modal);
    };

    modal.appendChild(closeButton);
    document.body.appendChild(modal);
}


function showUrlScanModal(result, probability) {
    // Debug the input
    console.log("Prediction result:", result);
    console.log("Prediction probability:", probability);

    // Ensure result is a number
    result = Number(result);

    // Create Modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '350px';
    modal.style.backgroundColor = '#FFFFFF';
    modal.style.padding = '25px';
    modal.style.borderRadius = '15px';
    modal.style.zIndex = 9999;
    modal.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';
    modal.style.fontFamily = 'Arial, sans-serif';
    modal.style.textAlign = 'center';
    modal.style.border = '2px solid #000000';

    // Modal Title
    const title = document.createElement('h2');
    title.innerText = 'Scan Results';
    title.style.marginBottom = '15px';
    title.style.color = '#333';
    modal.appendChild(title);

    // Prediction Result Text
    const resultLabel = result === 1 ? 'Safe' : result === -1 ? 'Unsafe' : 'Unknown';
    const resultText = document.createElement('p');
    resultText.innerText = `Prediction: ${resultLabel}`;
    resultText.style.margin = '10px 0';
    resultText.style.fontWeight = 'bold';

    // Change color based on prediction value
    if (result === 1) {
        resultText.style.color = 'green'; // Green for "Safe"
    } else if (result === -1) {
        resultText.style.color = 'red'; // Red for "Unsafe"
    } else {
        resultText.style.color = '#555'; // Neutral color for unknown states
    }
    modal.appendChild(resultText);

    // Prediction Confidence Text
    const probabilityText = document.createElement('p');
    probabilityText.innerText = `Prediction Confidence: ${Math.round(probability * 100)}%`;
    probabilityText.style.margin = '10px 0';
    probabilityText.style.color = '#555';
    modal.appendChild(probabilityText);

    // Add Buttons Container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '20px';

    // Whitelist Button
    const whitelistButton = document.createElement('button');
    whitelistButton.innerText = 'Whitelist URL';
    whitelistButton.style.padding = '10px 15px';
    whitelistButton.style.border = 'none';
    whitelistButton.style.borderRadius = '5px';
    whitelistButton.style.backgroundColor = '#4CAF50';
    whitelistButton.style.color = 'white';
    whitelistButton.style.cursor = 'pointer';
    whitelistButton.onclick = () => {
        chrome.runtime.sendMessage({ action: 'whitelistUrl', url: window.location.href });
        alert('URL has been added to whitelist!');
        document.body.removeChild(modal);
    };
    buttonContainer.appendChild(whitelistButton);

    // Block Button
    const blockButton = document.createElement('button');
    blockButton.innerText = 'Block URL';
    blockButton.style.padding = '10px 15px';
    blockButton.style.border = 'none';
    blockButton.style.borderRadius = '5px';
    blockButton.style.backgroundColor = '#F44336';
    blockButton.style.color = 'white';
    blockButton.style.cursor = 'pointer';
    blockButton.onclick = () => {
        chrome.runtime.sendMessage({ action: 'blockUrl', url: window.location.href });
        alert('URL has been blocked!');
        document.body.removeChild(modal);
    };
    buttonContainer.appendChild(blockButton);

    // Add Button Container to Modal
    modal.appendChild(buttonContainer);

    // Close Button
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Close';
    closeButton.style.padding = '10px 15px';
    closeButton.style.marginTop = '15px';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.backgroundColor = '#555';
    closeButton.style.color = 'white';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(modal);
    modal.appendChild(closeButton);

    // Append Modal to Body
    document.body.appendChild(modal);
}





// Listen for the result and show modal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getEmailDetails') {
        const emailDetails = getEmailDetails();
        sendResponse(emailDetails);
    }else if (request.action === 'showResult') {
        showModal(
            
            `${request.result}`);
    }
});

// Listen for URL scan result and show modal
// Listen for URL scan result and show modal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message in content script:", request); // Debug log

    if (request.action === 'showUrlScanResult') {
        const result = Number(request.result); // Ensure result is converted to a number
        const probability = request.probability;

        // Only show the modal if the prediction result is -1 (unsafe)
        if (result === -1) {
            showUrlScanModal(result, probability);
        } else {
            console.log("Prediction is safe (1). No modal displayed.");
        }
    }
});


// ********************************************************
// ********************************************************
// Send message to background script to block the URL
function blockCurrentUrl(url) {
    chrome.runtime.sendMessage({ action: "blockUrl", url }, (response) => {
        if (response && response.success) {
            alert("URL has been blocked!");
        }
    });
}

// Add this function to call `blockCurrentUrl` with the desired URL when the button is clicked

