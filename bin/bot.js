

'use strict';

var NinjaBot = require('../lib/NinjaBot');

var token = process.env.BOT_API_KEY;
var splunk_token = process.env.SPLUNK_HEC_KEY;
var splunk_url = process.env.SPLUNK_URL;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var NinjaBot = new NinjaBot({
    token: token,
    splunk_token: splunk_token,
    splunk_url: splunk_url,
    dbPath: dbPath,
    name: name
});

NinjaBot.run();