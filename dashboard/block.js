// Load blocked URLs when the page loads
document.addEventListener('DOMContentLoaded', loadBlockedUrls);

function loadBlockedUrls() {
    chrome.storage.local.get('blockedUrls', (data) => {
        const blockedUrls = data.blockedUrls || [];
        const tableBody = document.getElementById('blocked-urls');
        tableBody.innerHTML = ''; // Clear previous entries

        if (blockedUrls.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 3;
            cell.textContent = "No blocked URLs.";
            row.appendChild(cell);
            tableBody.appendChild(row);
        } else {
            blockedUrls.forEach(({ url, timestamp }) => {
                const row = document.createElement('tr');

                const urlCell = document.createElement('td');
                urlCell.textContent = url;

                const dateCell = document.createElement('td');
                dateCell.textContent = timestamp;

                const actionCell = document.createElement('td');
                const unblockButton = document.createElement('button');
                unblockButton.textContent = 'Unblock';
                unblockButton.onclick = () => requestUnblockUrl(url);

                actionCell.appendChild(unblockButton);
                row.appendChild(urlCell);
                row.appendChild(dateCell);
                row.appendChild(actionCell);

                tableBody.appendChild(row);
            });
        }
    });
}

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
