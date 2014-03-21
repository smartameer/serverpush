/**
 * @author : Pradeep Patro
 */
"use strict";
process.title = 'node-chat';
var webSocketsServerPort = 8123,
    webSocketServer = require('websocket').server,
    http = require('http'),
    history = [],
    clients = [],
    type = [ 'success', 'inverse', 'default', 'warning', 'error', 'info', 'primary' ];

var htmlEntities = function(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&ldquo;')
    .replace(/'/g, '&lsquo;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

type.sort(function(a, b) {
  return Math.random() > 0.5;
});

var server = http.createServer(function(request, response) { });

server.listen(webSocketsServerPort, function() {
  console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

var wsServer = new webSocketServer({ httpServer: server });
wsServer.on('request', function(request) {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  var connection = request.accept(null, request.origin),
      index = clients.push(connection) - 1,
      userName = false,
      userType = false;
  console.log((new Date()) + ' Connection accepted.');

  if (history.length > 0) {
    connection.sendUTF(JSON.stringify( { type: 'history', data: history} ));
  }

  connection.on('message', function(message) {
    if (message.type === 'utf8') { // accept only text
      if (userName === false) { // first message sent by user is their name
        userName = htmlEntities(message.utf8Data);
        userType = type.shift();
        connection.sendUTF(JSON.stringify({ type: 'color', data: userType }));
      } else { // log and broadcast the message
        var obj = {
          time: (new Date()).getTime(),
          text: htmlEntities(message.utf8Data),
          author: userName,
          color: userType
        };
        history.push(obj);
        history = history.slice(-100);

        // broadcast message to all connected clients
        var json = JSON.stringify({ type: 'message', data: obj });
        for (var i = 0; i < clients.length; i++) {
          clients[i].sendUTF(json);
        }
      }
    }
  });

  // user disconnected
  connection.on('close', function(connection) {
    if (userName !== false && userType !== false) {
      clients.splice(index, 1);
      type.push(userType);
    }
  });
});
