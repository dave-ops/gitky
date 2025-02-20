const express = require('express');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const AdmZip = require('adm-zip');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// MongoDB setup
const mongoUri = 'mongodb://127.0.0.1:27017/gitky'; // Replace with your URI
const client = new MongoClient(mongoUri);

async function connectToMongoDB() {
  await client.connect();
  return client.db('gitky');
}

async function saveFileToMongoDB(db, filePath, fileContent, metadata, isDirectory = false) {
  const collection = db.collection('files');
  await collection.insertOne({
    filePath,              // Full path (e.g., "src/index.js")
    content: fileContent,  // Buffer (null for directories)
    metadata,              // { user, repo, branch }
    isDirectory,           // Boolean to distinguish files vs folders
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

    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(zipPath, response.data);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    const extractedDir = zip.getEntries()[0].entryName.split('/')[0];
    const filesDir = path.join(tempDir, extractedDir);

    // Process ZIP entries (files and directories)
    for (const entry of zip.getEntries()) {
      const relativePath = entry.entryName.replace(`${extractedDir}/`, ''); // Remove top-level dir
      if (entry.isDirectory) {
        await saveFileToMongoDB(db, relativePath, null, { user, repo, branch }, true);
      } else {
        const filePath = path.join(tempDir, entry.entryName);
        const content = await fs.readFile(filePath);
        await saveFileToMongoDB(db, relativePath, content, { user, repo, branch }, false);
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

// GET endpoint to list files and folders at a path
app.get('/files', async (req, res) => {
  const { user, repo, branch, path = '' } = req.query; // Optional path for subdirectories
  const db = await connectToMongoDB();

  try {
    const collection = db.collection('files');
    const files = await collection
      .find({
        'metadata.user': user,
        'metadata.repo': repo,
        'metadata.branch': branch,
        filePath: { $regex: `^${path}[^/]*$` }, // Match files/folders at this level
      })
      .project({ filePath: 1, isDirectory: 1, _id: 0 })
      .toArray();

    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  } finally {
    await client.close();
  }
});

// Inside server.js
app.get('/file', async (req, res) => {
  const { user, repo, branch, filePath } = req.query;
  const db = await connectToMongoDB();

  console.log('Fetching file with params:', { user, repo, branch, filePath }); // Debug

  try {
    const collection = db.collection('files');
    const file = await collection.findOne({
      'metadata.user': user,
      'metadata.repo': repo,
      'metadata.branch': branch,
      filePath,
    });

    if (!file) {
      console.log('File not found in MongoDB'); // Debug
      return res.status(404).json({ error: 'File not found' });
    }
    if (file.isDirectory) {
      console.log('Requested item is a directory'); // Debug
      return res.status(400).json({ error: 'This is a directory' });
    }

    console.log('File found, sending content'); // Debug
    res.send(file.content.toString('utf8'));
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  } finally {
    await client.close();
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));