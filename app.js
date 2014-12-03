/* 
		Created by Shahab Rostami
		rostami@uk.ibm.com
		
		Module dependencies
		- Express
		- Http
		- Underscore
		- Path
		- Socket.IO
		- Request
*/
var express = require('express')
	, app = express()
	, http = require('http').createServer(app)
	, request = require('request')
	, path = require('path')
	, io = require('socket.io').listen(http)
	, _ = require('underscore');

var host = 'localhost';
var port = 3000;

/* Set up Server Configuration */
app.set('ip', host);
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

/* Set up static content */
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());

/* Set up participant array 
Struct: id (sessionID), name (nickname), language, isAnon (true/false)*/
var users = [];
/* Setup HTTP options, including translation URI and langauges array 
   SET UP WTS INSTANCE URL HERE */
var translateURL = "";
var languages = [];
var options = {
      uri: translateURL,
      method: "GET",
      timeout: 10000,
      followRedirect: true,
      maxRedirects: 10
  };

/* Return available languages */
var callbackSupportedLanguages = function(error, res, body) 
{
    languageJSON = JSON.parse(body)["SupportedLanguages"];
	var languageString = '';
	// Here we parse the JSON from the webpage provided in translateURL, which is a list of supported languages in the WTS instance.
	for (var i = 0; i < languageJSON.length; i++) {
		// We loop through and return the first language in each pair, and if unique, we store it into the language array.
		// This provides us a unique list of available languages that we can translate to and from.
		firstLanguage = languageJSON[i]["LanguagePair"].substr(0,2);
		if(!(_.findWhere(languages, {name : firstLanguage})))
			languages.push({id : i, name : firstLanguage});
    }
};
// Send a request to return all languages supported, and when complete, store these into an array.
request(options, callbackSupportedLanguages);

/* Handle the translation of text */
var translateText = function(data, functionCallback)
{
	// Here we simply record the user parameters in the header.
	// This allows us to send the message back to the correct user asynchronously.
	var toUser = data.toUser;
	var fromUser = data.fromUser;
	options = {
		uri: translateURL,
		headers: {'content-type' : 'text/plain', 'toUser' : toUser.id, 'sourcelanguage' : fromUser.language , 'destinationlanguage' : toUser.language},
		method: "POST",
		body: data.text
	};
	// Send a request to translate the message, and when complete, send the message to the appropriate user defined in the header.
    request(options, functionCallback);
}


/*  Handle GET requests from root "GET/ ".*/
app.get('/', function(req, res) {
	res.render('index');
});

/* Handle POST methods to create chat functions */
app.post("/message", function(req,res) {
	// Expecting a parameter "message".
	var message = req.body.message;
	
	// If message is undefined or empty, it's a bad request.
	if(_.isUndefined(message) || _.isEmpty(message.trim())) {
		return res.json(400, {error: "Message is invalid"});
	}
	
	// Otherwise, correct request.
	res.json(200, {message: "Message received"});
});

/* Check for lowest available anonymousId */
function getAnonId(users) {
	var newAnonId = 0;
	// Loop through Anonymous users and return lowest possible anonId.
	for(var i = 0; i < users.length; i++)
		if(users[i].isAnon)
			if(users[i].name.replace('Anonymous','') == newAnonId)
				newAnonId++;
	return newAnonId;
}

/* Simple heartbeat to keep clients from timing out */
function sendHeartbeat(){
    setTimeout(sendHeartbeat, 10000);
    io.sockets.emit('ping', { beat : 1 });
}
setTimeout(sendHeartbeat, 10000);

/* All socket.IO events are handled here, this is the real-time engine we're using */
io.on('connection', function(socket){
	// Initiate chat with new user, sending any relevant chat info, here we retrieve the anonId if required.
	var newAnonId = getAnonId(users);
	socket.emit('initChat', {newAnonId : newAnonId, languages : languages});
	
    /* Once the user registers,  update the user list and notify other users connected. */
	socket.on('registerUser', function(data){
        
            users.push({
                id : data.id, 
                name : data.name,
                language: data.language,
                isAnon : data.isAnon
            });
            users = _.uniq(users);
            // Notify other users.
            io.emit('userConnected', {users: users, name: data.name, language: data.language});
	});
	
	/* What to do if we receive a message */
	socket.on('sendMessage', function(data) {
		var fromUser = _.findWhere(users, {id: socket.id});
		var toUser;
		var toSocket;
		// Loop through all connected users.
		for(var i = 0; i < users.length; i++)
		{
			toUser = users[i];
			// Return the user's socket connection.
			toSocket = io.sockets.connected[toUser.id];
			// If the user returned is the same as the user that sent the message, simply send the non-translated message back.
			if(toUser.id === fromUser.id)
			{
				toSocket.emit('newMessage', {name: fromUser.name, message: data.message, fromLanguage: fromUser.language});
			}
			// Else, we know that the user may potentially require a translation of the message to be sent.
			else
			{
				// If the user receiving the message has the same language as the user that sent the message, simply send the non-translated message back.
				if(toUser.language == fromUser.language)
				{
					toSocket.emit('newMessage', {name: fromUser.name, message: data.message, fromLanguage: fromUser.language});
				}
				else
				{
					// Else, we know that a translation is required, translate the message and send to the appropriate user when completed.
					translateText({toUser : toUser, fromUser : fromUser, text : data.message, fromLanguage: fromUser.language},
					function (error, response, body) {
						if(!error && response.statusCode == 200)
						{
							toSocket = io.sockets.connected[response.request.headers['toUser']];
							toSocket.emit('newMessage', {name: fromUser.name, message: body, fromLanguage: fromUser.language});
						}
					});
				}
			}
		}
	});
	
	// If user disconnects, update variables as required.
	socket.on('disconnect', function () {
		// Return the user from the user list.
		user = _.findWhere(users, {id: socket.id});
		
		// Remove the user from the list.
		if(typeof(user) != "undefined")
		{
			users = _.without(users, user);
			io.emit('userDisconnected', {users: users, name: user.name, language: user.language});
		}
  });
    
    /* Function to handle heartbeat on client connection */
	socket.on('pong', function(data){
        console.log("Heartbeat from client");
    });
});

/* HTTP server start at defined port and ip address. */
http.listen(app.get('port'), app.get('ip'), function() {
	console.log('Up and running, go to ' + app.get('ip') + ':' + app.get('port'));
});

process.on( 'SIGINT', function() {
  console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
  shutDownMessage = "Server is currently unavailable.";
  io.emit('shutdown', {message: shutDownMessage});
  process.exit( );
})
	