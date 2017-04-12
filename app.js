// Copyright 2015-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Sample of web sockets for Google App Engine
// https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/master/appengine/websockets

'use strict';
const http = require('http');
const request = require('request');

const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const session = require('express-session');

const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({
    extended: false
})

const Particle = require('particle-api-js');
const particle = new Particle();

var websocket;
const ws_port = '50051'; // https://cloud.google.com/shell/docs/limitations#outgoing_connections
const ws_route = '/ws';

const config_filename = './config.json'
const fs = require('fs');
const config = JSON.parse(fs.readFileSync(config_filename, 'utf8'));

// In order to use websockets on App Engine, you need to connect directly to
// application instance using the instance's public external IP. This IP can
// be obtained from the metadata server.
const METADATA_NETWORK_INTERFACE_URL = 'http://metadata/computeMetadata/v1/' +
    '/instance/network-interfaces/0/access-configs/0/external-ip';

function get_external_ip(cb) {
    const options = {
        url: METADATA_NETWORK_INTERFACE_URL,
        headers: {
            'Metadata-Flavor': 'Google'
        }
    };

    request(options, (err, resp, body) => {
        if (err || resp.statusCode !== 200) {
            console.log('Error while talking to metadata server, assuming localhost');
            cb('localhost');
            return;
        }
        cb(body);
    });
}

// session middleware
// Warning The default server-side session storage, MemoryStore, is purposely not 
// designed for a production environment. It will leak memory under most conditions, 
// does not scale past a single process, and is meant for debugging and developing.
// for a list of compatible, production read stores, see: 
// https://github.com/expressjs/session#compatible-session-stores
// or https://cloud.google.com/appengine/docs/flexible/nodejs/using-redislabs-memcache
app.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: 'shhhh, very very secret',
}));

// session persisted message middleware
app.use(function(req, res, next) {
    var msg = req.session.message;
    delete req.session.message;
    res.locals.message = '';
    if (msg) res.locals.message = '<p class="msg">' + msg + '</p>';
    next();
});

// our websocket setup
app.ws(ws_route, (ws) => {
    // simply grab the websocket and store so we can call it at a later time
    // no need for event handling since the client should never be sending 
    // messages our way 
    websocket = ws;

    ws.on('open', function(msg) {
        console.log('websocket open');
    });
    ws.on('close', function(msg) {
        console.log('websocket close');
    });
    ws.on('err', function(msg) {
        console.log('websocket error');
    });
    ws.on('message', function(msg) {
        console.log('websocket msg: ' + JSON.stringify(msg));
    });
});

// default page leads you to login
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render("login.ejs");
});

// logs into particle then set up the event listener
app.post('/login', urlencodedParser, function(req, res) {
    console.log('Logging in');
    particle.login({
        username: req.body.username,
        password: req.body.password
    }).then(function(data) {
            console.log('logged in. Getting event stream');
            req.session.token = data.body.access_token;
            //Get your devices events
            particle.getEventStream({
                deviceId: 'mine',
                auth: req.session.token
            }).then(function(stream) {
                    console.log('Got event stream.');
                    stream.on('event', function(data) {
                        console.log('Event: ' + JSON.stringify(data));
                        // this is the event handler for particle events
                        // make sure we are only looking at the deviceLocator events
                        if (data.name.startsWith('hook-response/'+ config.event_name)) {
                            var a = data.data.split(",");
                            // convert strings to numbers: lat, lng, accuracy
                            a[0] = parseFloat(a[0]);
                            a[1] = parseFloat(a[1]);
                            a[2] = parseInt(a[2]);
                            // get he device id from the name of the event
                            var device_id = data.name.split("/")[2];
                            // send the event to the client
                            var msg = JSON.stringify({
                                id: device_id,
                                pub: data.published_at,
                                pos: {
                                    lat: a[0],
                                    lng: a[1],
                                },
                                acc: a[2]
                            });
                            websocket.send(msg);
                            console.log(msg);
                        }
                    });
                    res.redirect('/map');
                },
                function(err) {
                    req.session.message = 'Get stream failed, please try again.' + err.shortErrorDescription;
                    res.redirect('/logout');
                }
            );
        },
        function(err) {
            req.session.message = 'Login failed, please try again. ' + err.shortErrorDescription;
            res.redirect('/login');
        }
    );
})

app.get('/logout', function(req, res) {
    // destroy the user's session to log them out
    // will be re-created next request
    req.session.destroy(function() {
        res.redirect('/');
    });
});

// you have to be logged in to get the map page
function restrict(req, res, next) {
    if (req.session.token) {
        next();
    } else {
        req.session.message = 'Access denied! Login required.';
        res.redirect('/login');
    }
}

// render the map page with relevent ip and websocket information
app.get('/map', restrict, (req, res) => {
    // render the map page
    get_external_ip((external_ip) => {
        console.log('External IP: ' + external_ip);
        res.render("map.ejs", {
            external_ip: external_ip,
            ws_port: ws_port,
            ws_route: ws_route,
            map_api_key: config.map_api_key
        });

    });
});

// fake an event for testing purposes
app.get('/event', (req, res) => {
    websocket.send(JSON.stringify({
        id: '32001a001147343339383037',
        pub: '2017-03-30T05:00:46.167Z',
        pos: {
            lat: 39.043756699999996,
            lng: -77.4874416
        },
        acc: 3439
    }));
    res.send('Event!!');
});

// see what the external ip address is
app.get('/ip', (req, res) => {
    get_external_ip((external_ip) => {
        console.log('External IP: ' + external_ip);
        res.send(externalIp);
    });
});

// lauch our servers
if (module === require.main) {
    // Start the websocket server
    const wsServer = app.listen(ws_port, () => {
        console.log('Websocket server listening on port %s', wsServer.address().port);
    });
    // Additionally listen for non-websocket connections on the default App Engine
    // port 8080. Using http.createServer will skip express-ws's logic to upgrade
    // websocket connections.
    const PORT = process.env.PORT || 8080;
    http.createServer(app).listen(PORT, () => {
        console.log(`App listening on port ${PORT}`);
        console.log('Press Ctrl+C to quit.');
    });
}

module.exports = app;
