var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8110;

app.use(express.static(__dirname + '/public'));

var avatarArr = ['samczhang', 'bairedzhang', 'elainezhan', 'gavinning', 'haixialiu', 'nazhao', 'rocksun', 'thornwang'];

var numUsers = 0;

console.log('zhangchen');

io.on('connection', function(socket) {
    var addedUser = false;

    socket.on('new message', function(data) {
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data,
            avatar: socket.avatar
        });
    });

    socket.on('add user', function(username) {
        if (addedUser) return;

        var avatar = username;
        if (avatarArr.indexOf(username) < 0) {
            avatar = 'default';
        }

        ++numUsers;
        socket.username = username;
        socket.avatar = '/image/'+ avatar +'.jpg';
        
        addedUser = true;

        socket.emit('login', {
            numUsers: numUsers,
            username: username,
            avatar: socket.avatar
        });
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
    });

    socket.on('typing', function() {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    socket.on('stop typing', function() {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    socket.on('disconnect', function() {
        if (addedUser) {
            --numUsers;

            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
});
