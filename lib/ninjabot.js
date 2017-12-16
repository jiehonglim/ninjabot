

'use strict' ;


var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

var NinjaBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'ninja_bot';
    this.dbPath = settings.dbPath || path.resolve(process.cwd(), 'data', 'norrisbot.db');
    this.splunk_token = this.settings.splunk_token;
    this.splunk_url = this.settings.splunk_url;

    this.user = null;
    this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(NinjaBot, Bot);

module.exports = NinjaBot;

NinjaBot.prototype.run = function () {
    NinjaBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

NinjaBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

NinjaBot.prototype._loadBotUser = function () {
    var self = this;

    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];

};

NinjaBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};


NinjaBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

NinjaBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi guys, roundhouse-kick anyone?' +
        '\n I can tell jokes, but very honest ones. Just say `Chuck Norris` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

NinjaBot.prototype._onMessage = function (message) {
    var self = this;

    if (this._isChatMessage(message) && this._isChannelConversation(message)) {

        console.log('Starting Splunk')

        var SplunkLogger = require('splunk-logging').Logger;

        console.log('token is ', self.splunk_token);
        console.log('url is ', self.splunk_url);

        var config = {

            token : self.splunk_token,
            url : self.splunk_url
        };

        var slogger = new SplunkLogger(config);

        var payload = {
            message:{   
            }
        };
        
        payload.message.type = message.type;
        payload.message.channel = message.channel;
        payload.message.user = message.user;
        payload.message.id = message.id;
        payload.message.display_name = message.display_name
        payload.message.text = message.text;

        console.log('payload = ', payload);

        console.log('sending to Splunk');

        slogger.send(payload, function(err, resp, body) {
            console.log('Resp from Splunk ', body)
        });

        console.log('Ending Splunk');
    }

    if (this._isChatMessage(message) && this._isChannelConversation(message) && !this._isFromNinjaBot(message) && this._isMentioningChuckNorris(message)) {
        this._replyWithRandomJoke(message);
    }
};

NinjaBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

NinjaBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
};

NinjaBot.prototype._isFromNinjaBot = function (message) {
    var self = this

    var id = this.convertToUserID(this.name);
//    console.log ('this id is ', id);

    return message.user === id;
};

NinjaBot.prototype._isMentioningChuckNorris = function (message) {
    return message.text.toLowerCase().indexOf('chuck norris') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};


NinjaBot.prototype._replyWithRandomJoke = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var channel = self._getChannelById(originalMessage.channel);
        self.postMessageToChannel(channel.name, record.joke, {as_user: true});
        self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    });
};

NinjaBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};


NinjaBot.prototype.convertToUserID = function(key){

  // Send either a U123456 UserID or bob UserName and it will return the U123456 value all the time
  if(key in this.users) {
//    console.log('this key is ', key)
    return key;
  } // This string must already be a user ID

  for( var userid in this.users ){
//    console.log('this key is ', key);
//    console.log('this users name is ', this.users[userid].name, 'this id is ', this.users[userid].id);

    if( this.users[userid].name == key ){
        
      return this.users[userid].id;
    }
  }
}

NinjaBot.prototype.convertToUserName = function(key){
  // Send either a U123456 UserID or bob UserName and it will return the bob value all the time

  for( var userid in this.users ){
  
  //console.log('key is ', key);

  //co/nsole.log('userid name is', 'array nm', userid , this.users[userid].name);

    if( userid == key || this.users[userid].name == key ){
      return this.users[userid].name ;
    }
  }
}








