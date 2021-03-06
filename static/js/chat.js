/** Client-side of groupchat. */

const urlParts = document.URL.split("/");
const roomName = urlParts[urlParts.length - 1];
const ws = new WebSocket(`ws://localhost:3000/chat/${roomName}`);


const name = prompt("Username?");


/** called when connection opens, sends join info to server. */

ws.onopen = function (evt) {
  console.log("open", evt);

  let data = { type: "join", name: name };
  ws.send(JSON.stringify(data));
};


/** called when msg received from server; displays it. */

ws.onmessage = function (evt) {
  console.log("message", evt);

  let msg = JSON.parse(evt.data);
  let item;

  if (msg.type === "note") {
    item = $(`<li><i>${msg.text}</i></li>`);
  } else if (msg.type === "chat") {
    item = $(`<li><b>${msg.name}: </b>${msg.text}</li>`);
  } else if (msg.type === "alert") {
    item = $(`<li><b>${msg.text}</b></li>`);
  } else {
    return console.error(`bad message: ${msg}`);
  }

  $("#messages").append(item);
};


/** called on error; logs it. */

ws.onerror = function (evt) {
  console.error(`err ${evt}`);
};


/** called on connection-closed; logs it. */

ws.onclose = function (evt) {
  console.log("close", evt);
};


/** send message when button pushed. */

$("form").submit(function (evt) {
  evt.preventDefault();

  let text = $("#m").val();
  if(text === '') return;

  // store in var and destructure data
  let chatTexts = text.split(" ");

  let data = { type: "chat", text };

  if(chatTexts[0] === '/joke') data.type = "joke"
  if(chatTexts[0] === '/members') data.type = "members"
  if(chatTexts[0] === '/name') {
    data.type = "nameChange";
    data.newName = chatTexts[1];
  }
  if(chatTexts[0] === '/priv') { 
    chatTexts.shift();
    data.type = "priv"
    data.to = chatTexts.shift();
    data.text = chatTexts.join(" ");
  }
  
  ws.send(JSON.stringify(data));

  $("#m").val("");
});

