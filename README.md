NodeJS-Translation-Chatroom
===========================
-- node_modules
contains modules used by the application, which are used in most nodejs applications (web framework, HTTP request module, underscore, jade)
-- public
contains the public web scripts, including javascript and css files
-- views
contains the public webpage
-- app.js
 the node.js code
-- package.json 
the packages used by node.js, allowing the node_modules to be excluded and running "npm install" to install all required packages by the application.

Setup
===========================
Download, run npm install for packages.
Edit app.js translateURL with the translation service URL (for WTS).
If WTS not available, this will just act as a normal chat room with no languages available.

Description
===========================
This is a very, very simple application in NodeJS, completely for educating myself with NodeJS.

Using NodeJS I've created an application that acts as a chatroom with integrated real-time translation from and to the languages available in a WTS (translation program) install. Without WTS this acts as a normal chatroom.
Anonymous user setup is available.


TODO
===========================
- Work with GoogleTranslate, currently relies on WTS install.
- Rich text DIV instead of textareas.
- Lots... lots more functionality.

Version
===========================
v0.1
Implemented a simple heartbeat due to socket.io's timeout configurations. 

