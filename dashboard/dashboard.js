document.addEventListener('DOMContentLoaded', () => {
    const scanHistoryTable = document.getElementById('scan-history-table');
    const totalScannedEl = document.getElementById('total-scanned-count');
    const spamDetectedEl = document.getElementById('spam-detected-count');
    const nonSpamDetectedEl = document.getElementById('non-spam-detected-count');

    let pieChart, barChart;

    function updateCharts(spamDetected, nonSpamDetected) {
        const data = [spamDetected, nonSpamDetected];
        const labels = ['Phishing', 'Non-Spam'];
    
        // Destroy previous instances of charts to avoid overlap
        if (pieChart) pieChart.destroy();
        if (barChart) barChart.destroy();
    
        // Initialize pie chart
        pieChart = new Chart(document.getElementById('pieChart'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Scan Results',
                    data: data,
                    backgroundColor: ['#ff0000', '#008000'],
                    borderColor: '#EEEEEE',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Phishing vs. Non-Spam' }
                }
            }
        });
    
        // Initialize bar chart
        barChart = new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Scans',
                    data: data,
                    backgroundColor: ['#ff0000', '#008000'],
                    borderColor: '#151515',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Phishing and Non-Spam Counts' }
                }
            }
        });
    }
    
    function loadScanHistory() {
        // Retrieve scan history from chrome.storage.local
        chrome.storage.local.get('scanHistory', (data) => {
            const history = data.scanHistory || [];
            console.log("Loaded scan history from chrome.storage.local:", history);
    
            const totalScans = history.length;
            const spamDetected = history.filter(scan => scan.result && scan.result.includes('Phishing')).length;
            const nonSpamDetected = totalScans - spamDetected;
    
            // Update count elements
            totalScannedEl.textContent = totalScans;
            spamDetectedEl.textContent = spamDetected;
            nonSpamDetectedEl.textContent = nonSpamDetected;
    
            // Clear table and populate with data
            scanHistoryTable.innerHTML = '';
            const header = document.createElement('thead');
            header.innerHTML = `
                <tr>
                    <th></th>
                    <th>Sender</th>
                    <th>Title</th>
                    <th>Result</th>
                    <th>Date</th>
                    <th>Action</th>
                </tr>
            `;
            scanHistoryTable.appendChild(header);
    
            if (history.length === 0) {
                scanHistoryTable.innerHTML += '<tr><td colspan="6" class="no-history">No scan history available</td></tr>';
            } else {
                history.forEach((scan, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${scan.sender}</td>
                        <td>${scan.title}</td>
                        <td>${scan.result}</td>
                        <td>${scan.timestamp || 'N/A'}</td>
                        <td><button class="delete-btn" data-index="${index}"
                            style="background-color: #800000; color: white; border: #191C24; border-radius: 5px; padding: 8px 12px; cursor: pointer;">Delete</button></td>
                    `;
                    scanHistoryTable.appendChild(row);
                });
            }
    
            // Update charts with the latest data
            updateCharts(spamDetected, nonSpamDetected);
        });
    }
    


// Function to delete a specific scan from the history
function deleteScan(index) {
    chrome.storage.local.get('scanHistory', (data) => {
        const history = data.scanHistory || [];
        history.splice(index, 1); // Remove the specific item
        chrome.storage.local.set({ scanHistory: history }, () => {
            loadScanHistory();  // Reload history after deletion
        });
    });
}



    // Handle delete button clicks
    scanHistoryTable.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const index = event.target.getAttribute('data-index');
            deleteScan(index);
        }
    });

    // Initially load scan history and show statistics
    loadScanHistory();
});
