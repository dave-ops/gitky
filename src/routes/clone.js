const express = require('express');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { connectToMongoDB, client } = require('../config/db');
const { saveFileToMongoDB } = require('../utils/fileUtils');
const fs = require('fs').promises;
const path = require('path'); // Add path module for normalization

const router = express.Router();

router.post('/', async (req, res) => {
    const { user, repo, branch, token } = req.body;
    const db = await connectToMongoDB();
    const tempDir = `./temp-${user}-${repo}-${branch}`;
    const zipPath = `${tempDir}/repo.zip`;

    try {
        const url = `https://api.github.com/repos/${user}/${repo}/zipball/${branch}`;
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'gitky/1.0',
            },
        });

        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(zipPath, response.data);

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(tempDir, true);

        const extractedDir = zip.getEntries()[0].entryName.split('/')[0];
        const filesDir = path.join(tempDir, extractedDir);

        for (const entry of zip.getEntries()) {
            let relativePath = entry.entryName.replace(`${extractedDir}/`, '').trim(); // Remove extractedDir prefix and trim whitespace
            relativePath = path.normalize(relativePath); // Normalize path to ensure consistency
            console.log('Saving file/directory with path:', relativePath, 'Is Directory:', entry.isDirectory);
            if (entry.isDirectory) {
                if (!relativePath) {
                    console.warn('Skipping directory with empty path');
                    continue; // Skip saving directories with empty paths
                }
                await saveFileToMongoDB(db, relativePath, null, { user, repo, branch }, true);
            } else {
                const filePath = path.join(tempDir, entry.entryName);
                const content = await fs.readFile(filePath);
                await saveFileToMongoDB(db, relativePath, content, { user, repo, branch }, false);
            }
        }

        res.json({ message: `Successfully processed ${user}/${repo}/${branch}` });
    } catch (error) {
        console.error('Error cloning repo:', error);
        let errorMessage = 'Error processing repo';
        if (error.response) {
            errorMessage = `GitHub API Error: ${error.response.status} - ${error.response.data.message || error.response.statusText}`;
        } else if (error.request) {
            errorMessage = 'Network error: Unable to connect to GitHub';
        } else {
            errorMessage = error.message;
        }
        res.status(500).json({ error: errorMessage });
    } finally {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (err) {
            console.error('Error cleaning up temp dir:', err);
        }
        await client.close();
    }
});

module.exports = router;