// script.js

// Function to save URL to local storage
function saveToLocalStorage(url) {
    let urls = JSON.parse(localStorage.getItem('repoUrls')) || [];
    // Check for duplicates
    if (!urls.includes(url)) {
        urls.push(url);
        // Sort URLs alphabetically
        urls.sort();
        localStorage.setItem('repoUrls', JSON.stringify(urls));
    }
}

// Function to populate the datalist
function populateDatalist() {
    let urls = JSON.parse(localStorage.getItem('repoUrls')) || [];
    const datalist = document.getElementById('repoUrls');
    datalist.innerHTML = '';
    urls.forEach(url => {
        const option = document.createElement('option');
        option.value = url;
        datalist.appendChild(option);
    });
}

// Function to create download buttons
function createDownloadButton(repoName) {
    const downloadButton = document.createElement('a');
    downloadButton.href = `/download/${encodeURIComponent(repoName)}`;
    downloadButton.textContent = 'Download as ZIP';
    downloadButton.className = 'download-button';
    console.log('Created download button for:', repoName);
    return downloadButton;
}

// Form submission handler
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const repoUrl = formData.get('repoUrl');
    saveToLocalStorage(repoUrl);

    const response = await fetch('/prepare-clone', {
        method: 'POST',
        body: formData
    });
    const text = await response.text();
    alert(text);
    if (text.includes('Proceed with cloning')) {
        const cloneResponse = await fetch('/clone', {
            method: 'POST',
            body: formData
        });
        const cloneText = await cloneResponse.text();
        console.log('Clone response:', cloneText);
        const parser = new DOMParser();
        const doc = parser.parseFromString(cloneText, 'text/html');
        const listItems = doc.querySelectorAll('li');
        console.log('Number of list items:', listItems.length);
        
        listItems.forEach(li => {
            const fileName = li.textContent;
            const repoName = fileName.split('/')[0];
            const downloadButton = createDownloadButton(repoName);
            console.log('Appending download button to:', fileName);
            li.appendChild(downloadButton);
        });
        
        document.body.innerHTML = doc.body.innerHTML;
        console.log('Page content updated');
    }
});

// Populate the datalist when the page loads
populateDatalist();