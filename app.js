var config = require('./config/config');

require('./config/passport');

// Core module imports
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var path = require('path');

var session = require('express-session');
var Redis = require('ioredis');
var redisStore = require('connect-redis')(session);
var client  = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  family: 4, // 4 (IPv4) or 6 (IPv6)
  password: config.REDIS_PASSWORD,
  db: config.REDIS_SESSION_DB
});

var morgan = require('morgan');
var passport = require('passport');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var robots = require('express-robots');
var logger = require('./common/winstonLogging');

// Get app specific modules
var routes = require('./routes/app/_index');
var apiRoutes = require('./routes/api/_index');
var webSiteRoutes = require('./routes/web_site/_index');
var partnerAppRoutes = require('./routes/partner/_index');
var testPages = require('./routes/test-pages');

// Get global middleware
var getCookieJwt = require('./common/getCookieJwt');
var forceSSL = require('./common/forceSSL');
var errorHandler = require('./common/errorHandler');

// Get some specific internal modules
var userBlacklistService = require('./services/userBlacklist');

// Initialise express application
var app = express();

const redactEmail = (urlToCensor) => {
  if(urlToCensor.includes('@')) {
    return urlToCensor.replace(/email=(.*)@/, 'email=REDACTED@');
  }
  return urlToCensor;
};

app.use(morgan((tokens, request, response) => {
  return [
    tokens.method(request, response),
    redactEmail(tokens.url(request, response)), // removes email from logging
    tokens.status(request, response),
    tokens['response-time'](request, response), 'ms'
  ].join(' ');
},{ stream: logger.streamMorgan }));

//adds robots text
app.use(robots({UserAgent: '*', Disallow: '/'}));

// Set app config
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(config.COOKIE_SECRET));

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true,
  //exposes content-disposition header to get file name on the browser
  exposedHeaders: 'content-disposition'
}));

// Enable middlewares
app.use(forceSSL);
app.use(getCookieJwt);
app.set('trust proxy', 'uniquelocal');

// view engine setup
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'dist/public')));


/**
 * If the 'sameSite' cookie property is set to 'none' the 'secure' option must
 * be set to true, but the 'secure' option, in turn,
 * only works over https, otherwise the cookie doesn't get set at all
 * so it needs to be sameSite 'lax' or 'strict' in dev environment.
 */
app.use(session({
  secret: config.SESSION_SECRET,
  name: 'soreto_session',
  resave: true,
  store: new redisStore({
    logErrors: true,
    client: client
  }),
  saveUninitialized: true,
  cookie: config.DEPLOYED_ENVIRONMENT ? { sameSite: 'none', secure: true } : { sameSite: 'lax'}
}));

// Initialise passport
app.use(passport.initialize());
app.use(passport.session());

// Set routes
app.use('/', routes);
app.use('/api/v1', apiRoutes, errorHandler);
app.use('/partner', partnerAppRoutes);
app.use('/test-pages', testPages);
app.use('/website', webSiteRoutes);

// Set server settings
var server = http.createServer(app);
server.on('error', onError);
server.on('listening', onListening);

server.listen(config.SERVER_PORT);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + config.SERVER_PORT : 'Port ' + config.SERVER_PORT;

  // handle specific listen errors with friendly messages
  switch (error.code) {
  case 'EACCES':
    logger.error(bind + ' requires elevated privileges');
    process.exit(1);
    break;
  case 'EADDRINUSE':
    logger.error(bind + ' is already in use');
    process.exit(1);
    break;
  default:
    throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  logger.info('Listening on ' + bind);
}

// Initialize user emails blacklist
userBlacklistService.initCache();

module.exports = app;
