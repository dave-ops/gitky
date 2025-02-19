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

// GET endpoint to list files
app.get('/files', async (req, res) => {
  const { user, repo, branch } = req.query;
  const db = await connectToMongoDB();

  try {
    const collection = db.collection('files');
    const files = await collection
      .find({
        'metadata.user': user,
        'metadata.repo': repo,
        'metadata.branch': branch,
      })
      .project({ fileName: 1, _id: 0 }) // Only return fileName
      .toArray();

    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  } finally {
    await client.close();
  }
});

// Start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));