# 服务器端推送技术简介

## 技术实现方案
 - ajax轮询
 - commet配合ajax长轮询
 - websocket
 - server-sent event

### ajax轮询
实践简单，基于`http`协议，`setInterval`定时发送请求，但会造成数据同步不及时及无效的请求，增加后端处理压力。

### 基于AJAX的长轮询（long-polling）方式
在ajax轮询基础上做的一次升级，利用`http`的长链接，实现原理与ajax轮询无异。客户端向服务器发送Ajax请求，服务器接到请求后hold住连接，直到有新消息才返回响应信息并关闭连接，客户端处理完响应信息后再向服务器发送新的请求。

通常的做法是，在服务器的程序中加入一个死循环，在循环中监测数据的变动。当发现新数据时，立即将其输出给浏览器并断开连接，浏览器在收到数据后，再次发起请求以进入下一个周期。

### websocket

**客户端API**

定义一套新的通信协议，实现客户端与服务端的全双式通信。

```javascript
var connection = new WebSocket('ws://localhost:8080');

// When the connection is open, send some data to the server
connection.onopen = function () {
  connection.send('Ping'); // Send the message 'Ping' to the server
};

// Log errors
connection.onerror = function (error) {
  console.log('WebSocket Error ' + error);
};

// Log messages from the server
connection.onmessage = function (e) {
  console.log('Server: ' + e.data);
};
```

note: `ws://`与`wss://`

```javascript
// Sending String
connection.send('your message');

// Sending canvas ImageData as ArrayBuffer
var img = canvas_context.getImageData(0, 0, 400, 320);
var binary = new Uint8Array(img.data.length);
for (var i = 0; i < img.data.length; i++) {
  binary[i] = img.data[i];
}
connection.send(binary.buffer);

// Sending file as Blob
var file = document.querySelector('input[type="file"]').files[0];
connection.send(file);
```

**协议**

请求头信息
```
Connection:Upgrade
Sec-WebSocket-Key:eDCPPyPQZq7PiwRcx8SPog==
Sec-WebSocket-Version:13
Upgrade:websocket
```

响应头信息
```
Connection:Upgrade
Sec-WebSocket-Accept:/ZVAP3n6XuqDUoDp416PYUO+ZJc=
Upgrade:websocket
```

**服务端实现**

 - Node (Socket.IO, WebSocket-Node, ws)
 - Java (Jetty)
 - Python (Tornado, pywebsocket)
 - ...

**使用场景**

适合于对数据的实时性要求比较强的场景，如通信、股票、Feed、直播、共享桌面，特别适合于客户端与服务频繁交互的情况下，如实时共享、多人协作等平台。

**优点**
 
 - 真正的全双工通信
 - 支持跨域设置(Access-Control-Allow-Origin)

**缺点**

 - 采用新的协议，后端需要单独实现
 - 客户端并不是所有浏览器都支持
 - 代理服务器会有不支持websocket的情况
 - 无超时处理

**实例**

简易聊天室，贴上主要核心代码即可

### server-sent event

基于现有的`http`协议，无须额外的协议及后端实现，通过服务器端事件通知实时将数据更新到客户端。

**javascript API**

```javascript
var source = new EventSource('http://localhost:8080');

source.addEventListener('message', function(e) {
  console.log(e.data);
}, false);

source.addEventListener('open', function(e) {
  // Connection was opened.
}, false);

source.addEventListener('error', function(e) {
  if (e.readyState == EventSource.CLOSED) {
    // Connection was closed.
  }
}, false);
```

**响应头**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**响应数据格式**

```
id: 123\n
retry: 10000\n
event: userlogon\n
data: {"username": "John123"}\n\n
```

**优点**

 - 基于现有http协议，实现简单
 - 断开后自动重联，并可设置重联超时
 - 派发任意事件
 - 跨域并有相应的安全过滤
 - 无须担心中间层代理问题

**缺点**

  - 只能单向通信，服务器端向客户端推送事件
  - IE下目前所有不支持EventSource