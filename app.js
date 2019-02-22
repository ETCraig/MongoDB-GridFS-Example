const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

//Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

//MongoDB URI
const mongoURI = '';

const conn = mongoose.createConnection(mongoURI);

//Init gfs
let gfs;

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

//Create Storage Obj
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });

//Get


//Post
app.get('/', (req, res) => {
    gfs.files.find().toArray((rr, files) => {
        if (!files || files.length === 0) {
            res.render('index', { files: false });
        } else {
            files.map(file => {
                if (file.contentType === 'image/jpeg' || file.contentType === 'image.png') {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            });
            res.render('index', { files: files });
        }
    });
});

app.post('/upload', upload.single('file'), (req, res) => {
    // res.json({file: req.file});
    res.redirect('/')
});

//Get Display
app.get('/files', (req, res) => {
    gfs.files.find().toArray((rr, files) => {
        if (!files || files.length === 0) {
            return res.status(404).json({ err: 'NO FILES.' });
        }
        return res.json(files);
    });
});

//Get Files by ID
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({ err: 'NO FILE.' });
        }
        return res.json(file);
    });
});

//Get Img
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({ err: 'NO FILE.' });
        }
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({ err: 'NOT IMAGE' });
        }
    });
});

//Delete File
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
        if (err) {
            return res.status(404).json({ err: err });
        }
        res.redirect('/');
    });
});

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));