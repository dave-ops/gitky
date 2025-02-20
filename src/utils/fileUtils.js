async function saveFileToMongoDB(db, filePath, content, metadata, isDirectory) {
    const collection = db.collection('files');
    await collection.updateOne(
        { filePath, 'metadata.user': metadata.user, 'metadata.repo': metadata.repo, 'metadata.branch': metadata.branch },
        { $set: { content, metadata, isDirectory, createdAt: new Date() } },
        { upsert: true }
    );
}

function buildHierarchicalStructure(files) {
    const root = { type: 'directory', path: '', children: {}, content: null };

    files.forEach(file => {
        if (!file.filePath) return;

        const parts = file.filePath.split('/').filter(part => part);
        let current = root;

        parts.forEach((part, index) => {
            if (!current.children) current.children = {};
            if (!current.children[part]) {
                current.children[part] = {
                    id: file._id.toString(),
                    type: index === parts.length - 1 && !file.isDirectory ? 'file' : 'directory',
                    path: parts.slice(0, index + 1).join('/'),
                    content: file.isDirectory ? null : file.content,
                    children: file.isDirectory && index === parts.length - 1 ? {} : undefined,
                };
            }
            current = current.children[part];
        });
    });

    console.log(root);

    return root;
}

module.exports = { saveFileToMongoDB, buildHierarchicalStructure };