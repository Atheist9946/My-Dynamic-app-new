var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var admin = require('firebase-admin');
var fs = require('fs'); // नया जोड़ा गया

// Firebase Admin Initialization
var serviceAccount = require('./config/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://love2play-e2c54.firebaseio.com"
});

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static files configuration (Updated)
app.use(express.static(path.join(__dirname, 'public'))); // Main static folder
app.use('/css2', express.static(path.join(__dirname, 'public', 'css'))); // CSS files
app.use('/js', express.static(path.join(__dirname, 'public', 'js'))); // JS files
app.use('/images', express.static(path.join(__dirname, 'public', 'images'))); // Images

// Debug route
app.get('/debug-static', (req, res) => {
  const cssFiles = fs.readdirSync(path.join(__dirname, 'public', 'css'));
  const jsFiles = fs.readdirSync(path.join(__dirname, 'public', 'js'));
  
  res.json({
    status: 'Debugging Static Files',
    cssFiles: cssFiles,
    jsFiles: jsFiles,
    cssPath: path.join(__dirname, 'public', 'css'),
    jsPath: path.join(__dirname, 'public', 'js')
  });
});

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);

// HTML Routes with fallback
app.get(['/user2', '/user2.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user2.html'));
});

app.get(['/pcm', '/PCM.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'PCM.html'));
});

app.get(['/pcs', '/PCS.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'PCS.html'));
});

// Test route for CSS files
app.get('/test-css/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'css', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('CSS file not found: ' + filePath);
  }
});

// Error handlers
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Static files configuration:');
  console.log('- Main static: ', path.join(__dirname, 'public'));
  console.log('- CSS: ', path.join(__dirname, 'public', 'css'));
  console.log('- JS: ', path.join(__dirname, 'public', 'js'));
  console.log('- Images: ', path.join(__dirname, 'public', 'images'));
  console.log('\nDebug URLs:');
  console.log('- http://localhost:' + PORT + '/debug-static');
  console.log('- http://localhost:' + PORT + '/test-css/user2.css');
});

module.exports = app;