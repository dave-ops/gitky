const express = require('express');
const app = express();
const path = require('path');
const simpleGit = require('simple-git');
const bodyParser = require('body-parser');
const fs = require('fs').promises;

const PORT = 3000;
const WORKING_DIR = path.join(__dirname, 'repos');

// Ensure the working directory exists
async function ensureWorkingDir() {
    try {
        await fs.mkdir(WORKING_DIR, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

ensureWorkingDir().catch(console.error);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// New route to handle directory removal or renaming before cloning
app.post('/prepare-clone', async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const repoName = repoUrl.split('/').pop().split('.')[0];

    if (!repoUrl || !repoName) {
        return res.status(400).send('Please provide a valid GitHub repository URL.');
    }

    const repoPath = path.join(WORKING_DIR, repoName);

    try {
        // Check if directory exists
        const dirContent = await fs.readdir(repoPath);
        if (dirContent.length > 0) {
            // Option to delete or rename
            return res.status(400).send(`Directory ${repoName} already exists and is not empty. Please choose to delete or rename it before cloning.`);
        }
        res.send(`Prepared to clone ${repoName}. Proceed with cloning.`);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // Directory does not exist, proceed with cloning
            res.send(`Directory ${repoName} does not exist. Proceed with cloning.`);
        } else {
            console.error('Error preparing directory:', err);
            res.status(500).send('Error preparing directory: ' + err.message);
        }
    }
});

app.post('/clone', async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const repoName = repoUrl.split('/').pop().split('.')[0];

    if (!repoUrl || !repoName) {
        return res.status(400).send('Please provide a valid GitHub repository URL.');
    }

    const git = simpleGit(WORKING_DIR);
    git.clone(repoUrl, repoName, (err) => {
        if (err) {
            console.error('Failed to clone repository:', err);
            return res.status(500).send('Error cloning repository: ' + err.message);
        }
        console.log(`Repository ${repoName} cloned successfully in ${WORKING_DIR}`);
        
        // List files in the repository
        git.cwd(path.join(WORKING_DIR, repoName)).raw(['ls-tree', '-r', 'HEAD', '--name-only'], (err, result) => {
            if (err) {
                console.error('Error listing files:', err);
                return res.status(500).send('Error listing files: ' + err.message);
            }
            let filesList = result.split('\n').filter(file => file !== '');
            res.send(`
                <h1>Files in ${repoName}:</h1>
                <ul>
                ${filesList.map(file => `<li><a href="/view/${repoName}/${encodeURIComponent(file)}">${file}</a></li>`).join('')}
                </ul>
                <p><a href="/">Clone another repository</a></p>
            `);
        });
    });
});

app.get('/view/:repoName/:fileName', async (req, res) => {
    const { repoName, fileName } = req.params;
    const filePath = path.join(WORKING_DIR, repoName, decodeURIComponent(fileName));

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        res.send(`
            <h1>Viewing ${fileName}</h1>
            <pre>${content}</pre>
            <p><a href="/">Back to Repository List</a></p>
        `);
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(404).send('File not found or error reading file');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});