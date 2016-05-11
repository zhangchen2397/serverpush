(function() {
    var socket = io();
    var typing = false;
    var lastTypingTime = '';

    var loginPage = $('#login');
    var chatPage = $('#chat');

    var usernameIpt = loginPage.find('input');
    var enterChatPageBtn = loginPage.find('.enter');

    var chatList = chatPage.find('.chat-list ul');
    var userNum = chatPage.find('.userNum');

    var msgIpt = chatPage.find('input');
    var sendMsgBtn = chatPage.find('button');

    var title = chatPage.find('.title');
    var typingStatus = chatPage.find('.typing-status');

    var username = '';
    var avatar = '';

    var pageRun = {
        init: function() {
            this.initLogin();
            this.initEvent();
            this.initSocketEvent();
        },

        initLogin: function() {
            usernameIpt.focus();
        },

        initEvent: function() {
            var me = this;

            enterChatPageBtn.on('click', function() {
                var username = $.trim(usernameIpt.val());
                if (username) {
                    loginPage.hide();
                    chatPage.show();
                    socket.emit('add user', username);
                } else {
                    alert('请输入rtx进入群聊!');
                }
            });

            sendMsgBtn.on('click', function() {
                sendMessage();
            });

            msgIpt.on('input', function() {
                if (!typing) {
                    typing = true;
                    socket.emit('typing');
                }

                lastTypingTime = (new Date()).getTime();

                setTimeout(function() {
                    var typingTimer = (new Date()).getTime();
                    var timeDiff = typingTimer - lastTypingTime;
                    if (timeDiff >= 1000 && typing) {
                        socket.emit('stop typing');
                        typing = false;
                    }
                }, 1000);
            });

            $(window).on('keydown', function(event) {
                if (event.which === 13) {
                    if (username) {
                        sendMessage();
                        typing = false;
                    }
                }
            });

            function sendMessage() {
                var msg = $.trim(msgIpt.val());
                if (msg) {
                    msgIpt.val('');
                    socket.emit('new message', msg);
                    me.addMsg({
                        username: username,
                        avatar: avatar,
                        message: msg
                    }, true);
                } else {
                    alert('请输入消息再发送');
                }
            }
        },

        initSocketEvent: function() {
            var me = this;

            socket.on('login', function(data) {
                username = data.username;
                avatar = data.avatar;

                me.addLogMsg(data.username, true);
                me.updateUserNum(data.numUsers);
            });

            socket.on('user joined', function(data) {
                me.addLogMsg(data.username, true);
                me.updateUserNum(data.numUsers);
            });

            socket.on('user left', function(data) {
                me.addLogMsg(data.username);
                me.updateUserNum(data.numUsers);
            });

            socket.on('new message', function(data) {
                me.addMsg(data);
            });

            socket.on('typing', function(data) {
                typingStatus.text(data.username + '正在输入...');
                typingStatus.show();
                title.hide();
            });

            socket.on('stop typing', function(data) {
                typingStatus.hide();
                title.show();
            });
        },

        addLogMsg: function(msg, isJoin) {
            if (isJoin) {
                msg =  msg + '加入';
            } else {
                msg = msg + '离开';
            }

            chatList.append('<li class="log"><p>' + msg + '资讯开发组</p></li>');
            window.scrollTo(0, 9999);
        },

        updateUserNum: function(num) {
            userNum.text(num);
        },

        addMsg: function(data, isMe) {
            var msgType = 'other';
            if (isMe) {
                msgType = 'me';
            }

            var tpl = [
                '<li class="msg ' + msgType +' clearfix">',
                    '<div class="avatar">',
                        '<img src="'+ data.avatar +'" />',
                    '</div>',
                    '<div class="info">',
                        '<p class="nickname">'+ data.username +'</p>',
                        '<p class="msg">'+ data.message +'</p>',
                    '</div>',
                '</li>'
            ].join('');

            chatList.append(tpl);

            window.scrollTo(0, 9999);
        }
    };

    pageRun.init();
})();