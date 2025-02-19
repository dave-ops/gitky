const express = require('express');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const AdmZip = require('adm-zip');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve the web form

// MongoDB setup
const mongoUri = 'mongodb://127.0.0.1:27017'; // Replace with your URI
const client = new MongoClient(mongoUri);

async function connectToMongoDB() {
  await client.connect();
  return client.db('gitky');
}

async function saveFileToMongoDB(db, fileName, fileContent, metadata) {
  const collection = db.collection('files');
  await collection.insertOne({
    fileName,
    content: fileContent,
    metadata,
    createdAt: new Date(),
  });
}

// POST endpoint for cloning
app.post('/clone', async (req, res) => {
  const { user, repo, branch, token } = req.body;
  const db = await connectToMongoDB();
  const tempDir = `./temp-${user}-${repo}-${branch}`;
  const zipPath = `${tempDir}/repo.zip`;

  try {
    // GitHub API to download repo as ZIP
    const url = `https://api.github.com/repos/${user}/${repo}/zipball/${branch}`;
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // Save ZIP temporarily
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(zipPath, response.data);

    // Extract ZIP
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    // Process files
    const extractedDir = zip.getEntries()[0].entryName.split('/')[0];
    const filesDir = path.join(tempDir, extractedDir);
    const files = await fs.readdir(filesDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(filesDir, file.name);
        const content = await fs.readFile(filePath);
        await saveFileToMongoDB(db, file.name, content, { user, repo, branch });
      }
    }

    res.json({ message: `Successfully processed ${user}/${repo}/${branch}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error processing repo',
      error: error.response ? error.response.data : error.message,
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    await client.close();
  }
});

// Start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));