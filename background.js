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

// Initialize blocked URLs and rule IDs from storage on startup
chrome.storage.local.get({ blockedUrls: [] }, (data) => {
    blockedUrlsCache = data.blockedUrls || [];
    blockedUrlsCache.forEach((url, index) => {
        blockedRuleIds[url] = index + 1; // Assign rule ID based on position
    });
    updateBlockingRules();
});

// Updated function to fully clear and reload blocking rules
function updateBlockingRules() {
    // Remove all current dynamic rules first
    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const removeIds = existingRules.map(rule => rule.id);

        chrome.declarativeNetRequest.updateDynamicRules(
            { removeRuleIds: removeIds },
            () => {
                // Rebuild blockedRuleIds and rules array from blockedUrlsCache
                const rules = blockedUrlsCache.map((url, index) => {
                    const ruleId = index + 1;
                    blockedRuleIds[url] = ruleId;
                    return {
                        id: ruleId,
                        priority: 1,
                        action: { type: "block" },
                        condition: { urlFilter: url, resourceTypes: ["main_frame"] }
                    };
                });

                // Apply the new set of rules
                chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules }, () => {
                    console.log("Blocking rules updated:", rules);
                });
            }
        );
    });
}


// Function to block a URL
function blockUrl(url) {
    if (!blockedUrlsCache.includes(url)) {
        blockedUrlsCache.push(url);
        blockedRuleIds[url] = blockedUrlsCache.length; // Assign new rule ID
        chrome.storage.local.set({ blockedUrls: blockedUrlsCache }, () => {
            updateBlockingRules();
        });
    }
}

// Function to unblock a URL and update rules accordingly
function unblockUrl(url) {
    if (blockedUrlsCache.includes(url)) {
        // Remove URL from cache
        blockedUrlsCache = blockedUrlsCache.filter((blockedUrl) => blockedUrl !== url);
        delete blockedRuleIds[url]; // Remove rule ID entry

        // Update storage and re-apply rules
        chrome.storage.local.set({ blockedUrls: blockedUrlsCache }, () => {
            console.log(`Unblocked URL: ${url}`);
            updateBlockingRules();  // Ensure rules are updated after removal
        });
    }
}

// Listener for messages to block or unblock URLs
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "blockUrl" && request.url) {
        blockUrl(request.url);
        sendResponse({ success: true });
    } else if (request.action === "unblockUrl" && request.url) {
        unblockUrl(request.url);
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


// Listen for URL changes in active tab to scan the URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        if (tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
            const currentUrl = tab.url;
           

            // Send the URL to the Flask API for phishing detection
            fetch('http://localhost:5000/post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ URL: currentUrl })
            })
            .then(response => {
                if (!response.ok) {
                    console.error("Server returned error:", response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log("Received response data:", data); 
                if (data.error) {
                    console.error("Error from server:", data.error);
                } else {
                    const result = data.prediction;
                    const probability = data.probability;

                    console.log("Sending result to content script:", { result, probability });

                    // Send the result to content.js to display the modal
                    chrome.tabs.sendMessage(tabId, {
                        action: 'showUrlScanResult',
                        result,
                        probability
                    });
                }
            })
            .catch(error => {
                console.error('Error contacting Flask API:', error);
            });
        } 
    }
});
