const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

async function ensureWorkingDir() {
    try {
        await fs.mkdir(config.WORKING_DIR, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

async function checkAndPrepareDir(repoName) {
    const repoPath = path.join(config.WORKING_DIR, repoName);
    try {
        const dirContent = await fs.readdir(repoPath);
        if (dirContent.length > 0) {
            throw new Error(`Directory ${repoName} already exists and is not empty.`);
        }
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return true; // Directory does not exist, proceed with cloning
        }
        throw err;
    }
}

module.exports = {
    ensureWorkingDir,
    checkAndPrepareDir
};