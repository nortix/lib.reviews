'use strict';
// External dependencies
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const i18n = require('i18n');
const hbs = require('hbs'); // handlebars templating
const hbsutils = require('hbs-utils')(hbs);
const lessMiddleware = require('less-middleware');
const thinky = require('./db');
const r = thinky.r;
const session = require('express-session');
const RDBStore = require('session-rethinkdb')(session);
const flash = require('express-flash');
const useragent = require('express-useragent');
const passport = require('passport');
const csrf = require('csurf'); // protect against request forgery using tokens
const config = require('config');
const compression = require('compression');

// Internal dependencies
const reviews = require('./routes/reviews');
const languages = require('./routes/languages'); // routes to change UI language
const actions = require('./routes/actions');
const users = require('./routes/users');
const pages = require('./routes/pages');
const api = require('./routes/api');
const apiHelper = require('./routes/helpers/api');
const things = require('./routes/things');
const debug = require('./util/debug');
const render = require('./routes/helpers/render');
const mlstring = require('./models/ml-string');
const langDefs = require('./locales/languages')();

// Auth setup
require('./auth');

// Handlebars helper setup
require('./util/handlebars-helpers.js');

// i18n setup
i18n.configure({
  locales: ['en', 'de'],
  cookie: 'locale',
  autoReload: true,
  updateFiles: false,
  directory: "" + __dirname + "/locales"
});

// express setup
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
hbsutils.registerWatchedPartials(__dirname + '/views/partials');
app.set('view engine', 'hbs');

// Ensure we have current request locale available to i18n
app.use(function(req, res, next) {
  hbs.registerHelper('__', function() {
    return i18n.__.apply(req, arguments);
  });
  hbs.registerHelper('__n', function() {
    return i18n.__n.apply(req, arguments);
  });
  hbs.registerHelper('mlString', function(str, addLanguageSpan) {
    if (addLanguageSpan === undefined)
      addLanguageSpan = true;

    let mlRv = mlstring.resolve(req.locale, str);

    if (mlRv === undefined || mlRv.str === undefined || mlRv.str === '')
      return undefined;

    if (!addLanguageSpan || mlRv.lang === req.locale)
      return mlRv.str;
    else {
      let langLabelKey = langDefs[mlRv.lang].messageKey;
      let langLabel = i18n.__.call(req, langLabelKey);
      return `${mlRv.str} <span class="language-identifier" title="${langLabel}">` +
      `<span class="fa fa-globe spaced-icon" style="color:#777;"></span>${mlRv.lang}</span>`;
    }
  });

  next();
});

app.use(cookieParser());

app.use(useragent.express()); // expose UA object to req.useragent

let store = new RDBStore(r, {
  table: 'sessions'
});

app.use(session({
  key: 'libreviews_session',
  resave: true,
  saveUninitialized: true,
  secret: config.get('sessionSecret'),
  cookie: {
    maxAge: config.get('sessionCookieDuration') * 1000 * 60
  },
  store
}));
app.use(flash());

app.use(function(req, res, next) {
  req.flashHasErrors = () => {
    if (!req.session || !req.session.flash || !req.session.flash.errors)
      return false;
    else
      return req.session.flash.errors.length > 0;
  };
  next();
});

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


app.use(i18n.init);
app.use(favicon(path.join(__dirname, 'static/img/favicon.ico')));

app.use(app.get('env') == 'production' ?
  logger('combined') :
  logger('dev'));


// API requests do not require CSRF protection (hence declared before CSRF
// middleware), but session-authenticated POST requests do require the
// X-Requested-With header to be set, which ensures they're subject to CORS
// rules. This middleware also sets req.isAPI to true for API requests.
app.use('/api', apiHelper.prepareRequest);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));


app.use(compression());

let cssPath = path.join(__dirname, 'static', 'css');
app.use('/static/css', lessMiddleware(cssPath));
app.use('/static', express.static(path.join(__dirname, 'static')));

app.use('/api', api);

app.use(csrf());
app.use('/', pages);
app.use('/', reviews);
app.use('/', languages);
app.use('/', actions);
app.use('/', things);
//app.use('/user', users);

// catch 404
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  render.template(req, res, '404', {
    titleKey: 'page not found title'
  });
});

app.use(function(error, req, res, next) {

  let showDetails;
  if (app.get('env') === 'development')
    showDetails = true;
  else
    showDetails = (req.user && req.user.showErrors);

  res.status(error.status || 500);

  if (req.isAPI) {
    let response;
    switch (error.message) {
      case 'invalid json':
        response = {
          message: 'Could not process your request.',
          errors: ['Received invalid JSON data. Make sure your payload is in JSON format.']
        };
        break;
      default:
        response = {
          message: 'An error occurred processing your request.',
          errors: showDetails ? [error.message, `Stack: ${error.stack}`] : ['Unknown error. This has been logged.']
        };
        debug.error({
          context: 'API',
          req,
          error
        });
    }
    res.type('json');
    res.send(JSON.stringify(response, null, 2));
  } else {

    debug.error({
      context: 'web app',
      req,
      error
    });

    render.template(req, res, 'error', {
      titleKey: 'something went wrong',
      showDetails,
      error
    });
  }
});


let mode = app.get('env') == 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
debug.app(`Running in ${mode} mode.`);

module.exports = app;
