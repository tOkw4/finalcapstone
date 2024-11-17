function loadWhitelistedUrls() {
    chrome.storage.local.get({ whitelist: [] }, (data) => {
        const whitelist = data.whitelist || [];
        const tableBody = document.getElementById("whitelisted-urls");
        tableBody.innerHTML = ''; // Clear previous entries

        if (whitelist.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 3;
            cell.textContent = "No whitelisted URLs.";
            row.appendChild(cell);
            tableBody.appendChild(row);
        } else {
            whitelist.forEach(({ url, timestamp }) => {
                const row = document.createElement('tr');

                const urlCell = document.createElement('td');
                urlCell.textContent = url;

                const dateCell = document.createElement('td');
                dateCell.textContent = timestamp;

                const actionCell = document.createElement('td');
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.onclick = () => requestRemoveWhitelistUrl(url);

                actionCell.appendChild(removeButton);
                row.appendChild(urlCell);
                row.appendChild(dateCell);
                row.appendChild(actionCell);

                tableBody.appendChild(row);
            });
        }
    });
}


function requestRemoveWhitelistUrl(url) {
    chrome.runtime.sendMessage({ action: "removeWhitelistUrl", url }, (response) => {
        if (response && response.success) {
            alert(`${url} has been removed from the whitelist!`);
            loadWhitelistedUrls(); // Reload the displayed list to reflect changes
        } else {
            alert(`Failed to remove ${url} from whitelist.`);
        }
    });
}


document.addEventListener('DOMContentLoaded', loadWhitelistedUrls);
