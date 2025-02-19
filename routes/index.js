const path = require('path');
const fs = require('fs').promises;
const { ensureWorkingDir, checkAndPrepareDir } = require('../utils/fsUtils');
const { cloneRepo, listFiles } = require('../utils/gitUtils');
const config = require('../config');

ensureWorkingDir().catch(console.error);

exports.index = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
};

// In routes/index.js
exports.prepareClone = async (req, res) => {
    console.log('Request Headers:', req.headers);
    console.log('Request Body:', req.body);
    
    const repoUrl = req.body.repoUrl;
    const action = req.body.action;
    
    if (!repoUrl) {
        console.log('repoUrl is undefined');
        return res.status(400).send('Repository URL is required.');
    }

    console.log('repoUrl:', repoUrl);
    console.log('action:', action);

    const repoName = repoUrl.split('/').pop().split('.')[0];

    if (!repoName) {
        return res.status(400).send('Please provide a valid GitHub repository URL.');
    }

    try {
        const canClone = await checkAndPrepareDir(repoName);
        res.send(`Prepared to clone ${repoName}. Proceed with cloning.`);
    } catch (err) {
        res.status(400).send(err.message);
    }
};

exports.clone = async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const repoName = repoUrl.split('/').pop().split('.')[0];

    if (!repoUrl || !repoName) {
        return res.status(400).send('Please provide a valid GitHub repository URL.');
    }

    try {
        await cloneRepo(repoUrl, repoName);
        console.log(`Repository ${repoName} cloned successfully in ${config.WORKING_DIR}`);
        const filesList = await listFiles(repoName);
        res.send(`
            <h1>Files in ${repoName}:</h1>
            <ul>
            ${filesList.map(file => `<li><a href="/view/${repoName}/${encodeURIComponent(file)}">${file}</a></li>`).join('')}
            </ul>
            <p><a href="/">Clone another repository</a></p>
        `);
    } catch (err) {
        console.error('Failed to clone repository:', err);
        res.status(500).send('Error cloning repository: ' + err.message);
    }
};

exports.viewFile = async (req, res) => {
    const { repoName, fileName } = req.params;
    const filePath = path.join(config.WORKING_DIR, repoName, decodeURIComponent(fileName));

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
};

exports.downloadZip = async (req, res) => {
    const repoName = req.params.repoName;
    
    const repoPath = path.join(config.WORKING_DIR, repoName);
    
    try {
        // Check if the repository exists
        await fs.access(repoPath);
        
        // Set the headers for the response
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${repoName}.zip`);
        
        // Create a zip archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });
        
        // Pipe the archive to the response
        archive.pipe(res);
        
        // Append the directory contents to the archive
        archive.directory(repoPath, repoName);
        
        // Finalize the archive
        archive.finalize();
        
    } catch (error) {
        console.error('Error in downloading zip:', error);
        res.status(404).send('Repository not found or error in creating zip');
    }
};