function init() {

    // Initialise when webpage is ready.
    $('#message').focus();

    // Set base server url and connect to socket.
    var url = document.domain;
    var socket = io.connect(url, {'reconnect': false});

    // We'll save our session ID in a variable for later
    var sessionId = '';
    var noOfUsers = 0;
    var language = 'en';
    
    var languageDict = {};
    languageDict["en"] = "English (US)";
    languageDict["es"] = "Spanish";
    languageDict["fr"] = "French";
    
    function scrollToBottom(){
         $("#chatWindow").scrollTop($("#chatWindow")[0].scrollHeight)
    }
    function updateUsers(users, name, language, message) {
        // Return user who has joined or left.
        $("#chatWindow").append('<hr><p><img src="/img/' + language + '.png"/><b><i>' + name + ' has ' + message + '</i></b></p><hr>');
        scrollToBottom();
        $("#userWindow").html("");
        for(var i = 0; i < users.length; i++)
            $("#userWindow").append('<p><img src="/img/' + users[i].language + '.png"/</t><b>' + users[i].name + '</b></p>');
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
            
                var languages = data.languages;
                $.each(languages, function(key, value){
                     $('#languages')
                        .append($("<option></option>")
                        .attr("value",value.name)
                        .text(languageDict[value.name])); 
                });
                
                var startDialog = $( "#dialog" ).dialog({
                    close: function( event, ui ) {},
                    resizable: false,
                    modal: false,
                    draggable: true,
                    width: 400,
                    open: function(event, ui){setTimeout("$('#dialog').dialog('close')",20000); },
                    position: { my: "center", at: "center", of: window },
                    buttons: {
                    "OK": function() {
                        $( this ).dialog( "close" );
                        },
                    Cancel: function() {
                        $( this ).dialog( "close" );
                        }
                    }
                });
                
                var form = startDialog.find( "form" ).on( "submit", function( event ) {
                  event.preventDefault();
                  startDialog.dialog( "close" );
                });
                
            $( "#dialog" ).on( "dialogclose", function( event, ui ) {
                // var name = prompt("What name will you use?\nLeave empty or cancel to be anonymous.");
                // Check to see if user is anonymous
                name = $("#nameStartup").val();
                if(name === null || name === "")
                    name = "Anonymous" + data.newAnonId;
                $("#name").val(name);
                language = $("#languages").val();
                $("#language").append('<img src="/img/' + language + '.png"/>');
                // $("#name").val(name);
                // Set languages available. Need to make this less derp.
                // Update all connected users.
                
                socket.emit('registerUser', {id: sessionId, name: name, language: $("#languages").val(), isAnon: true});
            });
        });
    });
    
    socket.on('newMessage', function(data) {
            if(data.fromLanguage != language)
            {
                $("#chatWindow").append('<p><img src="/img/' + data.fromLanguage + '.png"/><b>' + data.name + ' [translated  from ' + languageDict[data.fromLanguage] + ']</b>: ' + data.message + '</br></p>');
            }
            else
                $("#chatWindow").append('<p><img src="/img/' + data.fromLanguage + '.png"/><b>' + data.name + '</b>: ' + data.message + '</br></p>');
            scrollToBottom();
        });
        
        // Notify and update when a user connects.
        socket.on('userConnected', function(data) {
            updateUsers(data.users, data.name, data.language, "joined");
        });
        
        // Notify and update when a user leaves.
        socket.on('userDisconnected', function(data) {
            updateUsers(data.users, data.name, data.language, "left");
        });
        
        socket.on('shutdown', function(data) {
            window.location.replace("/offline.html");
        });
    
    // Once user has submitted a messge, notify server.
    function sendMessage(e) {
        // If enter key is pressed, user has submitted a message.
        if(e.which == 13)
        {
            var message = $('#message').val();
            $('#message').val('');
            socket.emit('sendMessage', {message: message, language: language});
            }
    }
    
    // Element actions referenced here.
    $('#message').on('keydown', sendMessage);
};

$(document).on('ready', init);




