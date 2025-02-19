const express = require('express');
const app = express();
const path = require('path');
const simpleGit = require('simple-git');
const bodyParser = require('body-parser');

const PORT = 3000;
const WORKING_DIR = path.join(__dirname, 'repos'); // Relative path where repos will be cloned

// Ensure the working directory exists
const fs = require('fs');
if (!fs.existsSync(WORKING_DIR)) {
    fs.mkdirSync(WORKING_DIR);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/clone', (req, res) => {
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
                ${filesList.map(file => `<li><a href="/${repoName}/${file}">${file}</a></li>`).join('')}
                </ul>
                <p><a href="/">Clone another repository</a></p>
            `);
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});