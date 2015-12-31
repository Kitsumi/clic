#! /usr/bin/env node
/********************
 * CLIc: A CLI chat *
 *                  *
 *      Client      *
 ********************/

// Check if a address is specified.
if (process.argv[2] === undefined) {
    console.log('Please enter a server address');
    process.exit();
}

// Check port validity.
if (process.argv[3] === undefined) {
    var port = 1111;
} else if (process.argv[3] <= 0 || process.argv[3] >= 65536) {
    console.log('Invalid port '+process.argv[3]);
    process.exit();
} else {
    var port = process.argv[3];
}

// Import files.
var socket = require('socket.io-client')('http://'+process.argv[2]+':'+port+'/');
var blessed = require('blessed');
var screen = blessed.screen();

// Create GUI elements
var topicBox = blessed.box({
    top: 0,
    tags: true,
    height: 1,
    align: 'center',
    style: {
        fg: 'white',
        bg: 'blue'
    }
});

var onlineUsers = blessed.box({
    parent: chatBox,
    top: 1,
    right: 0,
    align: 'right',
    padding: {
        left: 1,
        right: 1
    },
    width: 'shrink',
    border: 'line'
});

var chatBox = blessed.box({
    bottom: 1,
    keys: true,
    vi: true,
    tags: true,
    height: screen.height-2,
    scrollable: true,
    scrollbar: {
        ch: ' ',
        track: {
            bg: 'blue'
        },
        style: {
            inverse: true
        }
    }
});

var inputArea = blessed.textbox({
    height: 1,
    bottom: 0,
    inputOnFocus: true,
    style: {
        bg: 'white',
        fg: 'black',
    }
});

// Add GUI to the screen
screen.append(chatBox);
screen.append(onlineUsers);
screen.append(topicBox);
screen.append(inputArea);

screen.key(['C-c'], function(ch, key) {
    return process.exit(0);
});

topicBox.setContent('Connecting...');
screen.render();

// Add handler, finish GUI stuff
inputArea.key('enter', function(ch, key) {
    textHandle(inputArea.getValue());
    inputArea.setValue('');
    screen.render();
    inputArea.focus();
});

inputArea.focus();
screen.render();

// Show text
function write(text) {
    var date = new Date();
    var hours = (date.getHours()>12?(date.getHours()-12).toString():date.getHours().toString());
    var minutes = date.getMinutes().toString();
    var time = (hours.length<2?' '+hours:hours)+':'+(minutes.length<2?0+minutes:minutes)

    chatBox.pushLine('{/}'+time+' '+text);
    chatBox.setScrollPerc(100);
    screen.render();
}

// Handle all text.
function textHandle(text) {
    var com = text.split("");
    if (com[0] == '/' && com[1] != "*" && com[1] != "_") {
        commandHandler(text);
    } else {
        socket.emit('message', text);
    }
}

// Handle Commands
function commandHandler(str) {
    var args = str.split(" ");
    var command = args[0].substring(1).toLowerCase();
    args.splice(0, 1);
    if (command == "exit") {
        process.exit();
    } else if (command == "nick") {
        socket.emit('nickChange', args[0]);
    } else if (command == 'topic') {
        socket.emit('topic', args.join(" "));
    } else if (command == "me") {
        socket.emit('me', args.join(" "));
    } else if (command == "toggle") {
        if (args[0].toLowerCase() == "onlineusers") {
            onlineUsers.toggle();
        } else {
            write("* {red-fg}Sorry, that can't be toggled.{/} *");
        }
    } else if (command == "register") {
        socket.emit('register', args.join(" "));
    } else if (command == "login") {
        socket.emit('login', args[0], args[1]);
    } else if (command == "help") {
        write('* {#05F-fg}-- Help --{/} *');
        write('* {#0DF-fg}Exit: {#05F-fg}Closes the chat program.{/} *');
        write('* {#0DF-fg}Nick: {#05F-fg}Changes your name.{/} *');
        write('* {#0DF-fg}Topic: {#05F-fg}Sets the topic of the chat, if you have the permissions.{/} *');
        write('* {#0DF-fg}Me: {#05F-fg}Outputs a message like, "* Anon does a thing *"{/} *');
        write('* {#0DF-fg}Toggle: {#05F-fg}Toggles different things (onlineUsers, topic){/} *');
        write('* {#0DF-fg}Register: {#05F-fg}</register password>{/} *');
        write('* {#0DF-fg}Login: {#05F-fg}</login password username>{/} *');
    } else {
        write('* {red-fg}'+ command + ' is not a command.{/} *');
    }
}

// Start Handling all socket input.
socket.on('message', function(message) {
    write(message);
});

socket.on('users', function(users) {
    onlineUsers.setContent("Users:\n"+users);
    screen.render();
});

socket.on('topic', function(topic) {
    topicBox.setContent(topic);
    screen.render();
});

socket.on('server-message', function(message){
    write('* '+message+' *');
});
socket.on('connect', function(){
    write('* Connected! *');
    socket.on('disconnect', function(){
        if (!socket.connected) {
            write('* {red-fg}Connection closed.{/} *');
        }
    });
});
