// Function to load blocked URLs from chrome.storage.local and display them
function loadBlockedUrls() {
    chrome.storage.local.get({ blockedUrls: [] }, (data) => {
        const blockedUrls = data.blockedUrls;
       

        const tableBody = document.getElementById("blocked-urls");
        
        // Clear any existing rows
        tableBody.innerHTML = '';

        if (blockedUrls.length === 0) {
            
        } else {
            // Populate the table with blocked URLs and add an Unblock button
            blockedUrls.forEach((url) => {
                const row = document.createElement('tr');
                
                const urlCell = document.createElement('td');
                urlCell.textContent = url;

                const actionCell = document.createElement('td');
                const unblockButton = document.createElement('button');
                unblockButton.textContent = 'Unblock';
                unblockButton.classList.add('unblock-btn');
                unblockButton.onclick = () => requestUnblockUrl(url);

                actionCell.appendChild(unblockButton);
                row.appendChild(urlCell);
                row.appendChild(actionCell);
                tableBody.appendChild(row);
            });
            
        }
    });
}


// Request to unblock URL via message to background
function requestUnblockUrl(url) {
    chrome.runtime.sendMessage({ action: "unblockUrl", url }, (response) => {
        if (response && response.success) {
            alert(`${url} has been removed from the blocklist!`);
            loadBlockedUrls(); // Reload the displayed list to reflect changes
        } else {
            alert(`Failed to unblock ${url}.`);
        }
    });
}


// Load blocked URLs when the page loads
document.addEventListener('DOMContentLoaded', loadBlockedUrls);
