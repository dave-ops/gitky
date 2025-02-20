const express = require('express');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const AdmZip = require('adm-zip');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const mongoUri = 'mongodb://127.0.0.1:27017/gitky'; // Replace with your URI
const client = new MongoClient(mongoUri);

async function connectToMongoDB() {
  await client.connect();
  return client.db('gitky');
}

async function saveFileToMongoDB(db, filePath, fileContent, metadata, isDirectory = false) {
  const collection = db.collection('files');
  await collection.insertOne({
    filePath,
    content: fileContent,
    metadata,
    isDirectory,
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
        Authorization: token ? `Bearer ${token}` : undefined, // Only include token if provided
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'gitky/1.0', // Add a User-Agent to comply with GitHub API
      },
    });

    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(zipPath, response.data);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    const extractedDir = zip.getEntries()[0].entryName.split('/')[0];
    const filesDir = path.join(tempDir, extractedDir);

    for (const entry of zip.getEntries()) {
      const relativePath = entry.entryName.replace(`${extractedDir}/`, '');
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
    await fs.rm(tempDir, { recursive: true, force: true }).catch(err => console.error('Error cleaning up temp dir:', err));
    await client.close();
  }
});

// GET endpoint to list files and folders at a path
app.get('/files', async (req, res) => {
  const { user, repo, branch, path = '' } = req.query;
  const db = await connectToMongoDB();

  try {
    const collection = db.collection('files');
    const files = await collection
      .find({
        'metadata.user': user,
        'metadata.repo': repo,
        'metadata.branch': branch,
        filePath: { $regex: `^${path}[^/]*$` },
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

// GET endpoint to retrieve file contents
app.get('/file', async (req, res) => {
  const { user, repo, branch, filePath } = req.query;
  const db = await connectToMongoDB();

  try {
    const collection = db.collection('files');
    const file = await collection.findOne({
      'metadata.user': user,
      'metadata.repo': repo,
      'metadata.branch': branch,
      filePath,
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    if (file.isDirectory) {
      return res.status(400).json({ error: 'This is a directory' });
    }

    res.send(file.content.toString('utf8'));
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  } finally {
    await client.close();
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));