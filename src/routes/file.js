const express = require('express');
const { connectToMongoDB, client } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {

    console.log(req.query)

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

        console.log({ file })

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

module.exports = router;