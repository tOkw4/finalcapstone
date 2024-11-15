document.getElementById('checkButton').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getEmailDetails' }, function(response) {
            if (response && response.emailContent) {
                const { emailContent, sender, title } = response;

                fetch('http://localhost:5000/detect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email_text: emailContent })
                })
                .then(response => response.json())
                .then(data => {
                    const result = data.result;
                    const timestamp = new Date().toLocaleString();

                    // Display result in the popup
                    document.getElementById('result').innerText = `Result: ${result}`;

                    // Save scan details to localStorage
                    const scanHistory = JSON.parse(localStorage.getItem('scanHistory')) || [];
                    scanHistory.push({
                        sender,
                        title,
                        result,
                        timestamp
                    });
                    localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('result').innerText = 'Error while scanning.';
                });
            } else {
                document.getElementById('result').innerText = 'Could not extract email details.';
            }
        });
    });
});

// Add a listener for the Dashboard button
document.getElementById('dashboardButton').addEventListener('click', function() {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
});
