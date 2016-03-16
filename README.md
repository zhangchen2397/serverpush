# 服务器端推送技术简介

### 技术实现方案
 - Ajax轮询
 - Ajax长轮询
 - websocket
 - server-sent-events

### Ajax轮询
实践简单，利用`XHR`，通过`setInterval`定时发送请求，但会造成数据同步不及时及无效的请求，增加后端处理压力。

### Ajax长轮询
在`Ajax`轮询基础上做的一些改进，在没有更新的时候不再返回空响应，而且把连接保持到有更新的时候，客户端向服务器发送Ajax请求，服务器接到请求后hold住连接，直到有新消息才返回响应信息并关闭连接，客户端处理完响应信息后再向服务器发送新的请求，通常把这种实现也叫做`comet`。

通常的做法是，在服务器的程序中加入一个死循环，在循环中监测数据的变动。当发现新数据时，立即将其输出给浏览器并断开连接，浏览器在收到数据后，再次发起请求以进入下一个周期。

普通`Ajax`轮询与基于AJAX的长轮询原理对比：
![Ajax](https://raw.githubusercontent.com/zhangchen2397/serverpush/master/image/ajax.jpg)












### Server-sent-events(SSE)

`Server-sent-events(SSE)`让服务端可以向客户端流式发送文本消息，在实现上，客户端浏览器中增加`EventSource`对象，使其能通过事件的方式接收到服务器推送的消息，在服务端，使用长连接的事件流协议，即请求响应时增加新数据流数据格式。

非常适应于后端数据更新频繁且对实时性要求较高而又不需要客户端向服务端通信的场景下。

![Ajax](https://github.com/zhangchen2397/serverpush/blob/master/image/sse.png?raw=true)

#### EventSource API

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

source.addEventListener('userlogin', function(e) {
  console.log(e.data);
}, false);
```

客户端API使用非常简单，浏览器在支持的情况下会自动处理一切，包括连接管理接收并解析数据到最后触发DOM事件，开发时只需要关注业务逻辑，`EventSource`接口还能自动重新连接并跟踪最近接收的消息，还可以向服务器发送上一次接收到消息的ID，以便服务器重传丢失的消息并恢复流。

#### Event Stream协议

SSE事件流以流式HTTP响应请求，客户端发起普通的`HTTP`请求，服务器以自定义的`text/event-stream`
内容类型响应，然后通过事件传递数据。

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
event: userlogin\n
data: {"username": "John123"}\n\n
```

客户端通过EventSource接口发起连接，服务器以`text/event-stream`内容类型响应，可设置中断后重连时间间隔`retry`，数据通过字符串的方式赋值给`data`字段，也可以指定消息类型给`event`字段。在客户端`EventSource`接口通过检查换行分隔符来解析到来的数据流，从`data`字段中获取数据，检查可选的`ID`和类型，最后分配事件告知应用，如果存在某个类型，触发自定义的事件回调，否则就会调用通用的`onmessage`回调。

为了在连接中断时恢复中断过程中丢失的消息，服务器在响应时可以给每条消息关联任意的`ID`字符串，浏览器会自动记录最后一次接收到消息`ID`，并在发送重新连接请求时自动在`HTTP`请求头中追加`Last-Event-ID`，这样就可以标识中断过程中丢失的消息并重新发送给客户端。

**优点**

 - 基于现有http协议，实现简单
 - 断开后自动重联，并可设置重联超时
 - 派发任意事件
 - 跨域并有相应的安全过滤

**缺点**

  - 只能单向通信，服务器端向客户端推送事件
  - 事件流协议只能传输UTF-8数据，不支持二进制流。
  - IE下目前所有不支持EventSource

`Tip` 如果代理服务器或中间设备不支持SSE，会导致连接失效，正式环境中使用通过TLS协议发送SSE事件流。








### WebSocket

`WebSocket`可以实现与客户端与服务器双向，基于消息的文本或二进制数据通信，主要包括两个部分，客户端`WebSocket API`及`WebSocket`协议。

WebSocket是HTML5出的东西（协议），也就是说HTTP协议没有变化，或者说没关系，但HTTP是不支持持久连接的（长连接，循环连接的不算）首先HTTP有1.1和1.0之说，也就是所谓的keep-alive，把多个HTTP请求合并为一个，但是Websocket其实是一个新协议，跟HTTP协议基本没有关系，只是为了兼容现有浏览器的握手规范而已。

![Ajax](https://github.com/zhangchen2397/serverpush/blob/master/image/websockets.png?raw=true)

####WebSocket API

浏览器提供的`WebSocket API`很简单，使用时无需关心连接管理和消息处理等底层细节，只需要发起连接，绑定相应的事件回调即可。

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

`WebSocket`资源URL采用了自定议模式，没有使用`http`是为了在非`http`协议场景下也能使用，`wss`表示使用加密信道通信(TCP + TLS)，支持接收和发送文本和二进制数据。

####WebSocket 协议

`WebSocket`通信协议包含两个部分，一是开放性`HTTP`握手连接协商连接参数，二是二进制消息分帧机制（接收消息的文本和二进制数据传输）。它是一个独立完善的协议，也可以在浏览器之外实现。

**HTTP升级协商**

`WebSocket`协议提供了很多强大的特性：基于消息的通信、自定义的二进制分帧层、子协议协商、可选的协议扩展，等等。即在交换数据之前，客户端必须与服务器协商适当的参数以建立连接。

利用`HTTP`完成握手有几个好处。首先，让`WebSockets`与现有`HTTP`基础设施兼容：`WebSocket`服务器可以运行在80和443 端口上，这通常是对客户端唯一开放的端口。其次，让我们可以重用并扩展`HTTP`的`Upgrade`流，为其添加自定义的`WebSocket`首部，以完成协商。

请求头信息
```
Connection:Upgrade
Sec-WebSocket-Key:eDCPPyPQZq7PiwRcx8SPog==
Sec-WebSocket-Version:13
Upgrade:websocket
```

响应头信息
```
HTTP/1.1 101 Switching Protocols
Connection:Upgrade
Sec-WebSocket-Accept:/ZVAP3n6XuqDUoDp416PYUO+ZJc=
Upgrade:websocket
```

最后，前述握手完成后，如果握手成功，该连接就可以用作双向通信信道交换`WebSocket`消息。到此，客户端与服务器之间不会再发生`HTTP`通信，一切由`WebSocket` 协议接管。

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
 - 更耗电及占用资源

`TIP` 代理、很多现有的`HTTP`中间设备可能不理解新的`WebSocket`协议，而这可能导致各种问题，使用时需要注意，可以使借助`TLS`，通过建立一条端到端的加密信道，可以让`WebSocket`通信绕过所有中间代理。


![Ajax](https://github.com/zhangchen2397/serverpush/blob/master/image/iso.png?raw=true)


