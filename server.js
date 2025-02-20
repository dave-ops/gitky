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
  const { user, repo, branch, path } = req.query;
  const db = await connectToMongoDB();

  try {
    const collection = db.collection('files');
    const entries = await collection
      .find({ 'metadata.user': user, 'metadata.repo': repo, 'metadata.branch': branch })
      .sort({ filePath: 1 }) // Sort by path for hierarchical order
      .toArray();

    console.log('MongoDB entries:', entries); // Log the raw MongoDB data

    // Initialize the structure object
    const structure = {};
    if (entries.length === 0) {
      console.log('No entries found, returning empty structure');
      return res.json({ structure }); // Return empty structure if no entries
    }

    // Build hierarchical structure
    entries.forEach(entry => {
      console.log('Processing entry:', entry); // Log each entry
      if (!entry.filePath) {
        console.error('Entry missing filePath:', entry);
        return; // Skip this entry if filePath is missing
      }

      const parts = entry.filePath.split('/').filter(part => part.length > 0 && part !== '');
      console.log('Parts for filePath:', parts); // Log the path parts

      if (parts.length === 0) {
        console.error('No valid parts for filePath:', entry.filePath);
        return; // Skip if no valid parts
      }

      let current = structure;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        console.log(`Processing part ${i}: ${part}, current:`, current); // Log the current state

        if (typeof current !== 'object' || current === null) {
          console.error(`Current is not an object at part ${part}:`, current);
          break; // Exit loop if current is invalid
        }

        if (i === parts.length - 1) {
          // Leaf node (file or final directory)
          if (current[part] !== undefined) {
            console.warn(`Overwriting existing entry for ${part} in:`, current);
          }
          current[part] = {
            type: entry.isDirectory ? 'directory' : 'file',
            path: entry.filePath,
            content: entry.content, // Only for files, can be null for directories
          };
        } else {
          // Ensure current[part] exists and has children
          if (!current[part]) {
            console.log(`Initializing ${part} in current:`, current); // Log initialization
            current[part] = { type: 'directory', children: {}, path: parts.slice(0, i + 1).join('/') };
          } else if (typeof current[part] !== 'object' || !current[part].children) {
            console.error(`current[part] is not an object or missing children for ${part}:`, current[part]);
            current[part] = { type: 'directory', children: {}, path: parts.slice(0, i + 1).join('/') }; // Force reinitialize
          }
          current = current[part].children;
          console.log(`After assignment, current:`, current); // Log after assignment

          if (typeof current !== 'object' || current === null) {
            console.error(`Current became invalid after assignment for ${part}:`, current);
            break; // Exit loop if current is invalid
          }
        }
      }
    });

    console.log('Final structure:', structure); // Log the final structure

    // If path is provided, return only items at that path
    if (path) {
      const items = getItemsAtPath(structure, path);
      return res.json(items);
    }

    res.json({ structure });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Error fetching files' });
  } finally {
    await client.close();
  }
});

// Helper function for path navigation
function getItemsAtPath(structure, path) {
  let current = structure;
  if (!path) return current;

  const parts = path.split('/').filter(p => p);
  for (const part of parts) {
    if (current[part] && current[part].children) {
      current = current[part].children;
    } else {
      return {};
    }
  }
  return current;
}

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