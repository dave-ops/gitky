const express = require('express');
const { connectToMongoDB, client } = require('../config/db');
const { buildHierarchicalStructure, getItemsAtPath } = require('../utils/fileUtils');

const router = express.Router();

router.get('/', async (req, res) => {
  const { user, repo, branch, path } = req.query;
  const db = await connectToMongoDB();

  try {
    const collection = db.collection('files');
    const entries = await collection
      .find({ 'metadata.user': user, 'metadata.repo': repo, 'metadata.branch': branch })
      .sort({ filePath: 1 }) // Sort by path for hierarchical order
      .toArray();

    const structure = buildHierarchicalStructure(entries);

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

module.exports = router;