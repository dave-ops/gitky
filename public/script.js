document.getElementById('cloneForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const repoName = document.getElementById('repoName').value;
    const branch = document.getElementById('branch').value;

    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Cloning repository and preparing upload...';

    try {
        // Send repository details to the server
        const response = await fetch('/clone-repo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, repoName, branch }),
        });

        if (!response.ok) {
            throw new Error(`Failed to clone repository: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        statusDiv.textContent = result.message || 'Repository cloned and uploaded successfully!';
        statusDiv.style.color = 'green';
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = 'red';
    }
});