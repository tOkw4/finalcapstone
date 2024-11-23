// Save scan results to chrome.storage.local
function saveScanHistory(sender, title, result) {
    const timestamp = new Date().toLocaleString();

    // Retrieve current scan history from chrome.storage.local
    chrome.storage.local.get('scanHistory', (data) => {
        const scanHistory = data.scanHistory || [];

        // Add the new scan to the history
        scanHistory.push({ sender, title, result, timestamp });

        // Save updated history back to chrome.storage.local
        chrome.storage.local.set({ scanHistory }, () => {
            console.log("Saved scan to chrome.storage.local:", { sender, title, result, timestamp });
        });
    });
}

// ************************

// Cache blocked URLs and rule IDs in memory
let blockedUrlsCache = [];
let blockedRuleIds = {};  // Map of URLs to rule IDs
let whitelistCache = [];  // Cache for whitelisted URLs

const rules = blockedUrlsCache.map((url, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: url, resourceTypes: ["main_frame"] }
}));


// Initialize blocked and whitelisted URLs from storage
chrome.storage.local.get({ blockedUrls: [], whitelist: [] }, (data) => {
    blockedUrlsCache = data.blockedUrls || [];
    whitelistCache = data.whitelist || [];

    // Initialize blockedRuleIds
    blockedUrlsCache.forEach((url, index) => {
        blockedRuleIds[url] = index + 1;
    });

    updateBlockingRules();
});

// Normalize URL by removing query params and fragments
function normalizeUrl(url) {
    try {
        const normalizedUrl = new URL(url);
        return normalizedUrl.origin + normalizedUrl.pathname; // Ensure this returns a string
    } catch (e) {
        console.error("Invalid URL:", url);
        return ''; // Return an empty string if URL parsing fails
    }
}

// Check if the URL is whitelisted
function isWhitelisted(url) {
    const normalizedUrl = normalizeUrl(url);
    return whitelistCache.some(entry => entry.url === normalizedUrl);
}

// Listen for messages to handle URL blocking, whitelisting, and unblocking
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const normalizedUrl = normalizeUrl(request.url);

    if (request.action === "blockUrl" && normalizedUrl) {
        blockUrl(normalizedUrl);
        sendResponse({ success: true });
    } else if (request.action === "unblockUrl" && normalizedUrl) {
        unblockUrl(normalizedUrl);
        sendResponse({ success: true });
    } else if (request.action === "whitelistUrl" && normalizedUrl) {
        whitelistUrl(normalizedUrl);
        sendResponse({ success: true });
    } else if (request.action === "removeWhitelistUrl" && normalizedUrl) {
        removeWhitelistUrl(normalizedUrl);
        sendResponse({ success: true });
    }
});

// Normalize URL function
function normalizeUrl(url) {
    try {
        const normalizedUrl = new URL(url);
        return normalizedUrl.origin + normalizedUrl.pathname; // Removes query parameters and fragments
    } catch (e) {
        console.error("Invalid URL:", url);
        return url; // Return original URL if parsing fails
    }
}

function blockUrl(url) {
    const normalizedUrl = normalizeUrl(url); // Normalize the URL

    chrome.storage.local.get({ blockedUrls: [] }, (data) => {
        let blockedUrls = data.blockedUrls || [];

        // Check if the URL is already blocked
        if (!blockedUrls.some(entry => entry.url === normalizedUrl)) {
            blockedUrls.push({ url: normalizedUrl, timestamp: new Date().toLocaleString() });

            // Save updated blocked URLs to storage
            chrome.storage.local.set({ blockedUrls }, () => {
                // After updating storage, update the blocking rules
                updateBlockingRules();  // Rebuild the blocking rules
                console.log("Blocked URL:", normalizedUrl);
            });
        }
    });
}

// Function to unblock a URL and update rules
function unblockUrl(url) {
    const normalizedUrl = normalizeUrl(url);

    chrome.storage.local.get({ blockedUrls: [] }, (data) => {
        let blockedUrls = data.blockedUrls || [];

        // Remove the URL from the blocked list
        blockedUrls = blockedUrls.filter(entry => entry.url !== normalizedUrl);

        // Save updated blocked URLs to storage
        chrome.storage.local.set({ blockedUrls }, () => {
            updateBlockingRules(); // Rebuild the blocking rules
            console.log("Unblocked URL:", normalizedUrl);
        });
    });
}

// Function to add a URL to the whitelist
function whitelistUrl(url) {
    chrome.storage.local.get({ whitelist: [] }, (data) => {
        const whitelist = data.whitelist || [];
        if (!whitelist.some(entry => entry.url === url)) {
            whitelist.push({ url, timestamp: new Date().toLocaleString() });
            chrome.storage.local.set({ whitelist }, () => {
                console.log("Whitelisted URL:", url);
            });
        }
    });
}

// Function to remove a URL from the whitelist
function removeWhitelistUrl(url) {
    chrome.storage.local.get({ whitelist: [] }, (data) => {
        const whitelist = data.whitelist || [];
        const updatedWhitelist = whitelist.filter(entry => entry.url !== url);
        chrome.storage.local.set({ whitelist: updatedWhitelist }, () => {
            console.log("Removed from whitelist:", url);
        });
    });
}

// Update blocking rules based on the blocked URLs in storage
function updateBlockingRules() {
    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const removeIds = existingRules.map(rule => rule.id);

        chrome.declarativeNetRequest.updateDynamicRules(
            { removeRuleIds: removeIds },
            () => {
                // Get the updated list of blocked URLs from storage
                chrome.storage.local.get({ blockedUrls: [] }, (data) => {
                    const blockedUrls = data.blockedUrls || [];

                    // Create new blocking rules
                    const rules = blockedUrls.map((entry, index) => ({
                        id: index + 1,
                        priority: 1,
                        action: { type: "block" },
                        condition: { urlFilter: entry.url, resourceTypes: ["main_frame"] }
                    }));

                    // Add the new blocking rules
                    chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules }, () => {
                        console.log("Blocking rules updated:", rules);
                    });
                });
            }
        );
    });
}

// Display blocked URLs
function displayBlockedUrls() {
    chrome.storage.local.get('blockedUrls', (data) => {
        const blockedUrls = data.blockedUrls || [];
        const container = document.getElementById('blockedUrlsContainer');
        container.innerHTML = ''; // Clear existing entries

        blockedUrls.forEach((url, index) => {
            const row = document.createElement('div');
            row.className = 'url-row';
            row.innerHTML = `
                <span class="url">${url}</span>
                <button class="remove-btn" data-index="${index}">Unblock</button>
            `;
            container.appendChild(row);
        });

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                unblockUrlByIndex(index);
            });
        });
    });
}

// Sync blocked URLs cache with any changes in chrome.storage.local
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.blockedUrls) {
            blockedUrlsCache = changes.blockedUrls.newValue || [];
            // Rebuild the blockedRuleIds based on updated blockedUrlsCache
            blockedRuleIds = {};
            blockedUrlsCache.forEach((url, index) => {
                blockedRuleIds[url] = index + 1;
            });
            updateBlockingRules();
        }
        if (changes.whitelist) {
            whitelistCache = changes.whitelist.newValue || [];
        }
    }
});

// Function to log blocked URLs and whitelist from storage
function logBlockedUrls() {
    chrome.storage.local.get(['blockedUrls', 'whitelist'], (data) => {
        console.log("Blocked URLs:", data.blockedUrls);
        console.log("Whitelist:", data.whitelist);
    });
}

// Context menu item for scanning emails
chrome.contextMenus.create({
    id: "scanEmail",
    title: "Scan Email for Phishing",
    contexts: ["all"]
});

// Add an event listener for the context menu click
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === "scanEmail") {
        // Send a message to the content script to get the email content
        chrome.tabs.sendMessage(tab.id, { action: 'getEmailDetails' }, function(response) {
            if (response && response.emailContent) {
                const { emailContent, sender, title } = response;

                // Send the email content to the Flask API for phishing detection
                fetch('http://localhost:5000/detect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email_text: emailContent })
                })
                .then(response => response.json())
                .then(data => {
                    const result = data.result;
                    chrome.tabs.sendMessage(tab.id, { action: 'showResult', result });

                    // Save scan details to localStorage
                    saveScanHistory(sender, title, result);
                })
                .catch(error => console.error("Error contacting Flask API:", error));
            } else {
                chrome.tabs.executeScript(tab.id, { code: alert('Could not extract email details.') });
            }
        });
    }
});

// Function to save scan results to chrome.storage.local
function saveScanHistory(sender, title, result) {
    const timestamp = new Date().toLocaleString();
    chrome.storage.local.get('scanHistory', (data) => {
        const scanHistory = data.scanHistory || [];
        scanHistory.push({ sender, title, result, timestamp });

        chrome.storage.local.set({ scanHistory }, () => {
            console.log("Saved scan to chrome.storage.local:", { sender, title, result, timestamp });
        });
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active) {
        const currentUrl = tab.url;

        console.log("Checking URL:", currentUrl); // Debug log

        // Skip whitelisted URLs
        if (whitelistCache.some(entry => entry.url === currentUrl)) {
            console.log("URL is whitelisted, skipping scan:", currentUrl);
            return;
        }

        // Check if the URL is blocked
        if (blockedUrlsCache.includes(currentUrl)) {
            console.log("URL is blocked, blocking:", currentUrl);
            return;
        }

        // Proceed with phishing detection
        fetch('http://localhost:5000/post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ URL: currentUrl })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    console.error("Error response from Flask API:", err);
                    throw new Error(`Server error: ${err.error}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Received data from Flask API:", data); // Debug log
            const result = data.prediction;
            const probability = data.probability;
        
            // Send result to content.js
            chrome.tabs.sendMessage(tabId, {
                action: 'showUrlScanResult',
                result,
                probability
            });
        })
        .catch(error => console.error("Error contacting Flask API:", error));
        
        
    }
});
