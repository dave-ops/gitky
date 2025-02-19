document.getElementById('cloneForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const repoName = document.getElementById('repoName').value;
    const branch = document.getElementById('branch').value;

    const statusDiv = document.getElementById('status');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    statusDiv.textContent = 'Starting repository cloning...';
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressText.textContent = '0%';

    try {
        // Open an SSE connection to receive progress updates
        const eventSource = new EventSource(`/progress?userId=${userId}&repoName=${repoName}&branch=${branch}`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.progress !== undefined) {
                progressBar.value = data.progress;
                progressText.textContent = `${data.progress}%`;
                statusDiv.textContent = data.message || 'Cloning in progress...';
            }
            if (data.completed) {
                eventSource.close();
                statusDiv.textContent = data.message || 'Repository cloned and uploaded successfully!';
                statusDiv.style.color = 'green';
                progressContainer.style.display = 'none';
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            statusDiv.textContent = 'Error: Connection to progress updates failed';
            statusDiv.style.color = 'red';
            progressContainer.style.display = 'none';
        };

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
        if (!result.progress) { // Fallback if SSE fails
            statusDiv.textContent = result.message || 'Repository cloned and uploaded successfully!';
            statusDiv.style.color = 'green';
            progressContainer.style.display = 'none';
        }
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = 'red';
        progressContainer.style.display = 'none';
        if (eventSource) eventSource.close();
    }
});