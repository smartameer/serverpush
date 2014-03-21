/**
 * @author : Pradeep Patro
 */
$(function () {
  "use strict";
  // for better performance - to avoid searching in DOM
  var content = $('#content'),
      input = $('#input'),
      status = $('#status'),
      userStatus = $('#user-status'),
      myStatus = false,       // my color assigned by the server
      myName = false;         // my name sent to the server

  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;

  // if browser doesn't support WebSocket, just show some notification and exit
  if (!window.WebSocket) {
    content.html($('<p>', { text: 'Sorry, but your browser doesn\'t support WebSockets.'} ));
    input.hide();
    $('span').hide();
    return;
  }

  // open connection
  var connection = new WebSocket('ws://localhost:8123');

  connection.onopen = function () {
    // first we want users to enter their names
    input.removeAttr('disabled').val('');
    status.text('Choose name:');
  };

  connection.onerror = function (error) {
    // just in there were some problems with conenction...
    content.html($('<p>', { text: 'Sorry, but there\'s some problem with your connection or the server is down.' } ));
  };

  // most important part - incoming messages
  connection.onmessage = function (message) {
    // try to parse JSON message. Because we know that the server always returns
    // JSON this should work without any problem but we should make sure that
    // the massage is not chunked or otherwise damaged.
    try {
      var json = JSON.parse(message.data);
    } catch (e) {
      console.log('This doesn\'t look like a valid JSON: ', message.data);
      return;
    }

    // NOTE: if you're not sure about the JSON structure
    // check the server source code above
    // first response from the server with user's color
    if (json.type === 'color') {
      myStatus = json.data;
      status.text(myName + ': ').addClass("text-"+myStatus);
      userStatus.append($("<p>",{ class : 'text-'+myStatus , text: myName  +" has joined the conversation." }));
      input.removeAttr('disabled').focus();
      // from now user can start sending messages
      // entire message history
    } else if (json.type === 'history') {
      // insert every single message to the chat window
      for (var i=0; i < json.data.length; i++) {
        addMessage(json.data[i].author, json.data[i].text, json.data[i].color, new Date(json.data[i].time));
      }
      // it's a single message
    } else if (json.type === 'message') {
      input.removeAttr('disabled'); // let the user write another message
      addMessage(json.data.author, json.data.text, json.data.color, new Date(json.data.time));
    } else {
      console.log('Invalid JSON Response', json);
    }
  };

  /**
   * Send mesage when user presses Enter key
   */
  input.keydown(function(e) {
    if (e.keyCode === 13) {
      var msg = $(this).val();
      if (!msg) {
        return;
      }
      // send the message as an ordinary text
      connection.send(msg);
      $(this).val('');
      // disable the input field to make the user wait until server sends back response
      input.attr('disabled', 'disabled');

      // we know that the first message sent from a user their name
      if (myName === false) {
        myName = msg;
      }
    }
  });

  /**
   * This method is optional. If the server wasn't able to respond to the
   * in 3 seconds then show some error message to notify the user that
   * something is wrong.
   */
  setInterval(function() {
    if (connection.readyState !== 1) {
      status.text('Error');
      input.attr('disabled', 'disabled').val('Unable to comminucate with the WebSocket server.');
    }
  }, 3000);

  /**
   * Add message to the chat window
   */
  function addMessage(author, message, color, dt) {
    var time = (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':' + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes());
    var str = "<p class='msg'><label class='label label-"+ color +"'>"+ author +"</label>  "
      + "<span class='message pull-left'>"+message+"</span>"
      + "<span class='text-small pull-right'>"+ time +"</span>"
      + "</p>";
    content.append(str);

    content.animate({ scrollTop: content.prop("scrollHeight") - content.height() }, 20);
  }
});
