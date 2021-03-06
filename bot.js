'use strict'

// Import TOKENS, and FB code
const Config = require('./const.js');
const FB = require('./facebook.js');

// APIs for actions
const weather = require('openweathermap-js'); // to get current weather
const fs = require('fs'); // read/write files
const momentTime = require('moment-timezone');  // to get time at different cities
var bingTranslator = require('./node_modules/bing-translate/lib/bing-translate.js').init({
    client_id: Config.TRANS_CLIENT_ID, 
    client_secret: Config.TRANS_CLIENT_SECRET
  });

let Wit = null;
let log = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}

// ----------------------------------------------------------------------------
// Wit.ai bot specific code
// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};

// First entity
const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};


// Our bot actions
const actions = {
  send({sessionId}, {text}) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return FB.fbMessage(recipientId, text)
      .then(() => null)
      .catch((err) => {
        console.error(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err.stack || err
        );
      });
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  },
  
  // Greetings
  greet({context, entities}) {
    return new Promise(function(resolve, reject) {
      // Read greeings.txt, since it's not a big file, we use readFileSync
      var greetingsArr = fs.readFileSync('./text/greetings.txt').toString().split('\n');
      // Randomly choose a greetings
      context.greetings = greetingsArr[Math.floor(Math.random()*greetingsArr.length)];
      return resolve(context);
    });
  },

  // Get Weather
  getForecast({context, entities}) {
  return new Promise(function(resolve, reject) {
    var loc = firstEntityValue(entities, 'location')
    if (loc) {
      delete context.missingLocation;
      weather.defaults({
          appid: Config.OPENWEATHERMAP_API_KEY,
          location: loc,
          method: 'name',
          format: 'JSON',
          accuracy: 'accurate',
          units: 'imperial'
      });

      weather.current(function(err, data) {
      if (!err) {
        context.forecast = Math.round(data.main.temp) + "°F with " 
        + data.weather[0].description + " in " + loc;
        return resolve(context);
      }
      else 
        context.forecast = "Mission unaccomplished. Bad Shinimi :(. Please try again."
      });
    } else {
      context.missingLocation = true;
      delete context.forecast;
      return resolve(context);
    }
    });
  },

  // Tell Jokes
  tellJokes({context, entities}) {
    return new Promise(function(resolve, reject) {
      // Read greeings.txt, since it's not a big file, we use readFileSync
      var jokesArr = fs.readFileSync('./text/jokes.txt').toString().split('\n');
      // Randomly choose a greetings
      context.jokes = jokesArr[Math.floor(Math.random()*jokesArr.length)];
      return resolve(context);
    });
  },

  // Translate
  translate({context, entities}) {
  	return new Promise(function(resolve, reject) {
  		// Get entities from wit.ai
    	var originalText = firstEntityValue(entities, 'phrase_to_translate');
    	var language = firstEntityValue(entities, 'language');

      	// Read translator.txt, since it's not a big file, we use readFileSync
      	var languageCodeArr = fs.readFileSync('./text/translator.txt').toString().split('\n');

      	// Find the language and its code
      	var languageIndex = -1;
      	for (var i = 0; i < languageCodeArr.length; i++) {
      		if (languageCodeArr[i].toLowerCase() === language.toLowerCase()) {
      			languageIndex = i - 1;
      			break;
      		}
      	}

      	if (originalText && languageIndex >= 0) {
      		bingTranslator.translate(originalText, 'en', languageCodeArr[languageIndex], function(err, res) {
      			if (!err) {
      				context.newVersion = res.translated_text;
      				return resolve(context);
      			} 
	      	});
	      } else {
	      	context.newVersion = "Something's wrong!";
	      	return resolve(context);
	      }
	    });
  	},
};

const getWit = () => {
	return new Wit({
		accessToken: Config.WIT_TOKEN,
  		actions,
  		logger: new log.Logger(log.INFO)
	});
}

module.exports = {
	getWit: getWit,
	findOrCreateSession: findOrCreateSession,
	sessions: sessions	
};


