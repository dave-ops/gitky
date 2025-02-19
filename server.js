const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process'); // Use spawn for real-time output
const mongoose = require('mongoose'); // If you added MongoDB

const app = express();
const PORT = 3000;

// MongoDB Connection (if you integrated MongoDB)
const MONGODB_URI = 'mongodb://127.0.0.1:27017/gitky';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

const repoSchema = new mongoose.Schema({
    userId: String,
    repoName: String,
    branch: String,
    clonePath: String,
    clonedAt: { type: Date, default: Date.now }
});

const Repo = mongoose.model('Repo', repoSchema);

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Configure directory for cloned repositories
const cloneDir = 'cloned_repos';
if (!fs.existsSync(cloneDir)) {
    fs.mkdirSync(cloneDir);
}

// Store SSE connections
const sseConnections = new Map();

app.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { userId, repoName, branch } = req.query;
    const clientId = `${userId}-${repoName}-${branch}`;
    sseConnections.set(clientId, res);

    res.on('close', () => {
        sseConnections.delete(clientId);
        res.end();
    });
});

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

    // Use spawn to capture real-time output for progress
    const gitClone = spawn('git', ['clone', '--branch', branch, repoUrl, clonePath]);

    const clientId = `${userId}-${repoName}-${branch}`;
    let progress = 0;
    let totalLines = 0;
    let processedLines = 0;

    gitClone.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Git output:', output);

        // Parse Git clone output to estimate progress (simplified)
        const lines = output.split('\n').filter(line => line.trim());
        totalLines += lines.length;
        processedLines += lines.length;

        // Estimate progress based on output lines (crude approximation)
        if (totalLines > 0) {
            progress = Math.min(90, Math.floor((processedLines / totalLines) * 100)); // Cap at 90% for cloning
        }

        // Send progress update via SSE
        if (sseConnections.has(clientId)) {
            const sseRes = sseConnections.get(clientId);
            sseRes.write(`data: ${JSON.stringify({ progress, message: 'Cloning repository...' })}\n\n`);
        }
    });

    gitClone.stderr.on('data', (data) => {
        console.error('Git error:', data.toString());
    });

    gitClone.on('close', (code) => {
        if (code !== 0) {
            console.error(`Git clone process exited with code ${code}`);
            if (sseConnections.has(clientId)) {
                const sseRes = sseConnections.get(clientId);
                sseRes.write(`data: ${JSON.stringify({ progress: 0, message: 'Failed to clone repository' })}\n\n`);
                sseRes.end();
                sseConnections.delete(clientId);
            }
            return res.status(500).json({ message: 'Failed to clone repository' });
        }

        // After cloning, rename the .git folder to ..git
        const gitFolderPath = path.join(clonePath, '.git');
        const newGitFolderPath = path.join(clonePath, '..git');

        if (fs.existsSync(gitFolderPath)) {
            fs.renameSync(gitFolderPath, newGitFolderPath);
            console.log(`Renamed .git to ..git in ${clonePath}`);
        } else {
            console.warn(`.git folder not found in ${clonePath}`);
        }

        // Update progress to 100% and mark as completed
        if (sseConnections.has(clientId)) {
            const sseRes = sseConnections.get(clientId);
            sseRes.write(`data: ${JSON.stringify({ progress: 100, message: 'Repository cloned and processed successfully', completed: true })}\n\n`);
            sseRes.end();
            sseConnections.delete(clientId);
        }

        // Save metadata to MongoDB (if integrated)
        try {
            const newRepo = new Repo({ userId, repoName, branch, clonePath });
            newRepo.save();
            console.log('Repository metadata saved to MongoDB');
        } catch (err) {
            console.error('Error saving to MongoDB:', err);
        }

        res.json({ message: `Repository cloned to ${clonePath} and .git renamed to ..git` });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});