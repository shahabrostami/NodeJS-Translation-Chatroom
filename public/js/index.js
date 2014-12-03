function init() {

	// Initialise when webpage is ready.
	$('#message').focus();

	// Set base server url and connect to socket.
	var url = document.domain;
	var socket = io.connect(url);

	// We'll save our session ID in a variable for later
	var sessionId = '';
    var noOfUsers = 0;
	
	function updateUsers(users, name, message) {
		// Return user who has joined or left.
		$("#chatWindow").append("" + name + " has " + message + ".\n");
		$("#userWindow").html("");
		for(var i = 0; i < users.length; i++)
			$("#userWindow").append("" + users[i].name + "\n");
	}
	
	// Simple client heartbeat to keep from timing out.
	socket.on('ping', function(data){
      socket.emit('pong', {beat: 1});
    });
	
	// On client successful connect, record sessionID of client.
	socket.on('connect', function () {
		// Set the client's sessionId
		sessionId = socket.io.engine.id;
		
		socket.on('initChat', function(data) {
			// Prompt user for name
			var name = prompt("What name will you use?\nLeave empty or cancel to be anonymous.");
			// Check to see if user is anonymous
			if(name === null || name === "")
				name = "Anonymous" + data.newAnonId;
			$("#name").val(name);
			
			// Set languages available. Need to make this less derp.
			var languages = data.languages;
			$.each(languages, function(key, value){
				 $('#languages')
					.append($("<option></option>")
					.attr("value",value.name)
					.text(value.name)); 
			});
			// Update all connected users.
			socket.emit('registerUser', {id: sessionId, name: name, language:"en", isAnon: true});
		});
		
		socket.on('newMessage', function(data) {
			$("#chatWindow").append("" + data.name + ": " + data.message + "\n");
		});
		
		// Notify and update when a user connects.
		socket.on('userConnected', function(data) {
			updateUsers(data.users, data.name, "joined");
		});
		
		// Notify and update when a user leaves.
		socket.on('userDisconnected', function(data) {
			updateUsers(data.users, data.name, "left");
		});
	});
	
	// Once user has submitted a messge, notify server.
	function sendMessage(e) {
		// If enter key is pressed, user has submitted a message.
		if(e.which == 13)
		{
			var message = $('#message').val();
			$('#message').val('');
			var language = $('#languages').val();
			socket.emit('sendMessage', {message: message, language: language});
			}
	}
	
	// Element actions referenced here.
	$('#message').on('keydown', sendMessage);
	$( "#languages" ).change(function() {
		var language = $('#languages').val();
		socket.emit('updateLanguage', {language: language});
	});
};

$(document).on('ready', init);




