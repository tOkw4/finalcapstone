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
    modal.style.border = '1px solid #A91D3A';
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
    console.log("Creating modal with result:", result, "and probability:", probability); // Add this line
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '300px';
    modal.style.backgroundColor = '#FFFFFF';
    modal.style.padding = '20px';
    modal.style.borderRadius = '15px';
    modal.style.border = '1px solid #A91D3A';
    modal.style.zIndex = 9999;
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    
    // Add the result text
    const resultText = document.createElement('p');
    resultText.innerText = `Prediction: ${result}`;
    resultText.style.textAlign = 'center';
    resultText.style.margin = '0';
    modal.appendChild(resultText);

    


    // Add the probability text
    const probabilityText = document.createElement('p');
    probabilityText.innerText = `Prediction Confidence: ${Math.round(probability * 100)}%`;
    probabilityText.style.margin = '0';
    probabilityText.style.fontSize = '20px';
    probabilityText.style.color = '#000000';
    modal.appendChild(probabilityText);


// *****************************
     // Add "Block URL" button
     const blockButton = document.createElement('button');
     blockButton.innerText = 'Block URL';
     blockButton.style.display = 'block';
     blockButton.style.margin = '10px auto';
     blockButton.style.padding = '8px 12px';
     blockButton.style.backgroundColor = '#C73659';
     blockButton.style.color = '#FFFFFF';
     blockButton.style.border = 'none';
     blockButton.style.borderRadius = '5px';
     blockButton.onclick = function () {
         chrome.runtime.sendMessage({ action: 'blockUrl', url: window.location.href });
         alert('URL has been blocked!');
         document.body.removeChild(modal); // Close modal after blocking
     };
     modal.appendChild(blockButton);



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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message in content script:", request); // Add this line
    if (request.action === 'showUrlScanResult') {
        showUrlScanModal(request.result, request.probability);
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

