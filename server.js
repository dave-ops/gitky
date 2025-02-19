const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const multer = require('multer');
const routes = require('./routes');

const PORT = 3000;

// Use multer to handle multipart/form-data
const upload = multer();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Use multer middleware for the routes that need to handle form data
app.post('/prepare-clone', upload.none(), routes.prepareClone);
app.post('/clone', upload.none(), routes.clone);
app.get('/', routes.index);
app.get('/view/:repoName/:fileName', routes.viewFile);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});