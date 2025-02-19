const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const routes = require('./routes');

const app = express();
const PORT = 3000;

// Middleware setup
const upload = multer();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
app.post('/prepare-clone', upload.none(), routes.prepareClone);
app.post('/clone', upload.none(), routes.clone);
app.get('/', routes.index);
app.get('/view/:repoName/:fileName', routes.viewFile);
app.get('/download/:repoName', routes.downloadZip);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});