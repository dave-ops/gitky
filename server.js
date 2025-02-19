const express = require('express');
const app = express();
const path = require('path');
const simpleGit = require('simple-git');

const PORT = 3000;
const GIT_USER = 'dave-ops';
const REPO_NAME = 'py-gist';
const REPO_URL = `git@github.com:${GIT_USER}/${REPO_NAME}.git`; // Replace with your GitHub URL
const WORKING_DIR = path.join(__dirname, 'repos');              // Relative path where repos will be cloned

// Ensure the working directory exists
const fs = require('fs');
if (!fs.existsSync(WORKING_DIR)) {
    fs.mkdirSync(WORKING_DIR);
}

// Clone the repository
const git = simpleGit(WORKING_DIR);
git.clone(REPO_URL, REPO_NAME, (err) => {
    if (err) {
        console.error('Failed to clone repository:', err);
        process.exit(1);
    }
    console.log(`Repository ${REPO_NAME} cloned successfully in ${WORKING_DIR}`);
});

// Serve static files from the cloned repository
app.use(express.static(path.join(WORKING_DIR, REPO_NAME)));

// Route to list files in the repository
app.get('/', (req, res) => {
    git.cwd(path.join(WORKING_DIR, REPO_NAME)).raw(['ls-tree', '-r', 'HEAD', '--name-only'], (err, result) => {
        if (err) {
            console.error('Error listing files:', err);
            return res.status(500).send('Error listing files');
        }
        let filesList = result.split('\n').filter(file => file !== '');
        res.send(`
            <h1>Files in ${REPO_NAME}:</h1>
            <ul>
            ${filesList.map(file => `<li><a href="${file}">${file}</a></li>`).join('')}
            </ul>
        `);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});