const express = require('express');
const { connectToMongoDB, client } = require('../config/db');
const { buildHierarchicalStructure, getItemsAtPath } = require('../utils/fileUtils');

const router = express.Router();

// Existing route for fetching file structure
router.get('/', async (req, res) => {
    const { user, repo, branch, path } = req.query;
    const db = await connectToMongoDB();

    try {
        const collection = db.collection('files');
        const entries = await collection
            .find({ 'metadata.user': user, 'metadata.repo': repo, 'metadata.branch': branch })
            .project({ content: 0 }) // This line excludes the 'content' field
            .sort({ filePath: 1 }) // Sort by path for hierarchical order
            .toArray();

        console.log(entries)

        const structure = buildHierarchicalStructure(entries);

        // If path is provided, return only items at that path
        if (path) {
            const items = getItemsAtPath(structure, path);
            return res.json(items);
        }

        res.json(structure);
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ error: 'Error fetching files' });
    } finally {
        await client.close();
    }
});

// New route for fetching file content by _id
router.get('/content/:id', async (req, res) => {
    const { id } = req.params;
    const db = await connectToMongoDB();

    try {
        const collection = db.collection('files');
        const file = await collection.findOne({ _id: id }, { projection: { content: 1, filePath: 1 } });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Assuming content is stored as Binary in MongoDB, convert it to a string or buffer as needed
        const content = file.content ? file.content.toString('utf-8') : 'No content available';
        res.json({ content, filePath: file.filePath });
    } catch (error) {
        console.error('Error fetching file content:', error);
        res.status(500).json({ error: 'Error fetching file content' });
    } finally {
        await client.close();
    }
});

module.exports = router;