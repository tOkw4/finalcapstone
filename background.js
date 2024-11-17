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
let whitelistCache = []; //whitelist

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

// Updated function to fully clear and reload blocking rules
function updateBlockingRules() {
    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const removeIds = existingRules.map(rule => rule.id);

        chrome.declarativeNetRequest.updateDynamicRules(
            { removeRuleIds: removeIds },
            () => {
                const rules = blockedUrlsCache.map((url, index) => ({
                    id: index + 1,
                    priority: 1,
                    action: { type: "block" },
                    condition: { urlFilter: url, resourceTypes: ["main_frame"] }
                }));

                chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules }, () => {
                    console.log("Blocking rules updated:", rules);
                });
            }
        );
    });
}

function normalizeUrl(url) {
    try {
        const normalizedUrl = new URL(url);
        return normalizedUrl.origin + normalizedUrl.pathname; // Removes query parameters and fragments
    } catch (e) {
        console.error("Invalid URL:", url);
        return url; // Return the original URL if parsing fails
    }
}


function blockUrl(url) {
    const normalizedUrl = normalizeUrl(url);
    if (!blockedUrlsCache.includes(normalizedUrl)) {
        blockedUrlsCache.push(normalizedUrl);
        blockedRuleIds[normalizedUrl] = blockedUrlsCache.length;
        chrome.storage.local.set({ blockedUrls: blockedUrlsCache }, () => {
            updateBlockingRules();
        });
    }
}




// Function to unblock a URL and update rules accordingly
function unblockUrl(url) {
    const normalizedUrl = normalizeUrl(url);
    if (blockedUrlsCache.includes(normalizedUrl)) {
        blockedUrlsCache = blockedUrlsCache.filter((blockedUrl) => blockedUrl !== normalizedUrl);
        delete blockedRuleIds[normalizedUrl];
        chrome.storage.local.set({ blockedUrls: blockedUrlsCache }, () => {
            updateBlockingRules();
        });
    } else {
        console.log("URL not found in blocked list:", url);
    }
}


// Function to add a URL to the whitelist
function whitelistUrl(url) {
    const normalizedUrl = normalizeUrl(url);
    if (!whitelistCache.includes(normalizedUrl)) {
        whitelistCache.push(normalizedUrl);
        chrome.storage.local.set({ whitelist: whitelistCache }, () => {
            console.log("Added to whitelist:", normalizedUrl);
        });
    }
}

function removeWhitelistUrl(url) {
    const normalizedUrl = normalizeUrl(url);
    if (whitelistCache.includes(normalizedUrl)) {
        whitelistCache = whitelistCache.filter((whitelistedUrl) => whitelistedUrl !== normalizedUrl);
        chrome.storage.local.set({ whitelist: whitelistCache }, () => {
            console.log("Removed from whitelist:", normalizedUrl);
        });
    }
}

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



// Function to log blocked URLs from storage
function logBlockedUrls() {
    chrome.storage.local.get('blockedUrls', (data) => {
        console.log("Blocked URLs in storage:", data.blockedUrls);
    });
}

// ******************************************
// *********************************************


// Sync blocked URLs cache with any changes in chrome.storage.local
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blockedUrls) {
        blockedUrlsCache = changes.blockedUrls.newValue || [];
        // Rebuild the blockedRuleIds based on updated blockedUrlsCache
        blockedRuleIds = {};
        blockedUrlsCache.forEach((url, index) => {
            blockedRuleIds[url] = index + 1; // Assign rule ID based on position
        });
        updateBlockingRules(); // Update blocking rules based on new cache
    }
});
// ***********************************************
console.log("Blocked URLs Cache:", blockedUrlsCache);
console.log("Blocked Rule IDs:", blockedRuleIds);


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
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email_text: emailContent })
                })
                .then(response => response.json())
                .then(data => {
                    const result = data.result;

                    // Send the scan result to the content script to show the modal
                    chrome.tabs.sendMessage(tab.id, { action: 'showResult', result });

                    // Save scan details to localStorage
                    saveScanHistory(sender, title, result);
                    
                })
                
            } else {
                chrome.tabs.executeScript(tab.id, {
                    code: alert('Could not extract email details.')
                });
            }
        });
    }
});


// Normalize URL before checking whitelist
function normalizeUrl(url) {
    try {
        const normalizedUrl = new URL(url);
        return normalizedUrl.origin + normalizedUrl.pathname; // Removes query parameters and fragments
    } catch (e) {
        console.error("Invalid URL:", url);
        return url; // This return is valid because it's inside the function
    }
}


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active) {
        if (tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
            const currentUrl = tab.url;

            if (isWhitelisted(currentUrl)) {
                console.log("URL is whitelisted, skipping scan:", currentUrl);
                return;
            }

            // Perform phishing detection
            fetch('http://localhost:5000/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ URL: currentUrl })
            })
            .then(response => response.json())
            .then(data => {
                const result = data.prediction;
                const probability = data.probability;

                chrome.tabs.sendMessage(tabId, {
                    action: 'showUrlScanResult',
                    result,
                    probability
                });
            })
            .catch(error => console.error("Error contacting Flask API:", error));
        }
    }
});

