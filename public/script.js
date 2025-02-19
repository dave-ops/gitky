document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const repoName = document.getElementById('repoName').value;
    const branch = document.getElementById('branch').value;

    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Downloading ZIP from GitHub...';

    try {
        // Construct the GitHub ZIP URL
        const zipUrl = `https://github.com/${userId}/${repoName}/archive/refs/heads/${branch}.zip`;

        // Fetch the ZIP file from GitHub
        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`Failed to download ZIP: ${response.status} ${response.statusText}`);
        }

        // Convert the response to a Blob (binary data)
        const blob = await response.blob();

        // Create a FormData object to upload the ZIP
        const formData = new FormData();
        formData.append('zipFile', blob, `${repoName}-${branch}.zip`);

        // Upload the ZIP to the server
        const uploadResponse = await fetch('/upload-zip', {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ZIP: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        const result = await uploadResponse.json();
        statusDiv.textContent = result.message || 'ZIP downloaded and uploaded successfully!';
        statusDiv.style.color = 'green';
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = 'red';
    }
});