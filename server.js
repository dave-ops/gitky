const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // For running git commands

const app = express();
const PORT = 3000;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Configure directory for cloned repositories
const cloneDir = '.workspace';
if (!fs.existsSync(cloneDir)) {
    fs.mkdirSync(cloneDir);
}

// Handle repository cloning and upload
app.post('/clone-repo', (req, res) => {
    const { userId, repoName, branch } = req.body;

    if (!userId || !repoName || !branch) {
        return res.status(400).json({ message: 'Missing user ID, repository name, or branch' });
    }

    const repoUrl = `https://github.com/${userId}/${repoName}.git`;
    const clonePath = path.join(cloneDir, `${repoName}-${branch}`);

    // Check if the directory already exists to avoid re-cloning
    if (fs.existsSync(clonePath)) {
        fs.rmSync(clonePath, { recursive: true, force: true });
    }

    // Clone the repository using git
    exec(`git clone --branch ${branch} ${repoUrl} ${clonePath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error cloning repository: ${error.message}`);
            return res.status(500).json({ message: `Failed to clone repository: ${error.message}` });
        }

        // Optionally, you can zip the cloned folder here if needed, but for now, we'll just save the folder
        res.json({ message: `Repository cloned to ${clonePath}` });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});