"use strict";

const axios = require("axios");
const JOKES_API_BASE_URL = "https://icanhazdadjoke.com/"

/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** Make chat user: store connection-device, room.
   *
   * @param send {function} callback to send message to this user
   * @param room {Room} room user will be in
   * */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** Send msgs to this client using underlying connection-send-function.
   *
   * @param data {string} message to send
   * */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** Handle joining: add to room members, announce join.
   *
   * @param name {string} name to use in room
   * */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** Handle a chat: broadcast to room.
   *
   * @param text {string} message to send
   * */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: "chat",
      text: text,
    });
  }

  /** Handle a joke: send a joke to only this user */

  async handleJoke() {
    // make a helper function to get joke
    let resp = await axios.get(JOKES_API_BASE_URL, {headers: {Accept: "text/plain"}});
    let joke = resp.data;
    
    let jokeObj = {
      type: "chat",
      text: joke,
      name: "Jokester Bot"
    }

    this.send(JSON.stringify(jokeObj));
  }

  /** Handle a request for members in current room: sends list of room members to only this user */

  handleMembers() {
    // could spread this, and chain these actions
    let members = Array.from(this.room.members);
    members = members.map(m => m.name);
    let membersNames = members.join(', ');
    
    let membersObj = {
      type: "chat",
      text: membersNames,
      name: "In room"
    }

    this.send(JSON.stringify(membersObj));
  }

  /** Handle a request to send private message to another user in the room: 
   *  sends list of room members to only this user 
   * 
   * @param msg {object} contains information about the message
   *  
   * @example<code>
   * - {type: "priv", to: "to_username", text: "message to send"} : msg
   * </code>
   * */

  handlePrivate(msg) {
    let privateMessageObj = {
      type: "chat",
      text: msg.text,
      name: "PRIVATE FROM " + this.name
    }

    let user = this.room.getUser(msg.to);

    if (user) {
      user.send(JSON.stringify(privateMessageObj));
    } else {
      privateMessageObj.text = `No user found with username: ${msg.to}`;
      privateMessageObj.name = "ERROR"
      this.send(JSON.stringify(privateMessageObj));
    }
  }

  /** Handle a user name change: broadcast to room.
   *
   * @param newName {string} new user name
   * */

  handleNameChange(newName) {
    let prevName = this.name;
    this.name = newName;
    this.room.broadcast({
      type: "alert",
      text: `${prevName} changed username to ${this.name}.`,
    });
  }

  /** Handle messages from client:
   *
   * @param jsonData {string} raw message data
   *
   * @example<code>
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * </code>
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    switch (msg.type) {
      case "join": 
        this.handleJoin(msg.name);
        break;
      case "chat":
        this.handleChat(msg.text);
        break;
      case "joke":
        this.handleJoke();
        break;
      case "members":
        this.handleMembers();
        break;
      case "priv":
        this.handlePrivate(msg);
        break;
      case "nameChange":
        this.handleNameChange(msg.newName);
        break;
      default:
        throw new Error(`bad message: ${msg.type}`);
    }

    // if (msg.type === "join") this.handleJoin(msg.name);
    // else if (msg.type === "chat") this.handleChat(msg.text);
    // else if (msg.type === "joke") this.handleJoke();
    // else if (msg.type === "members") this.handleMembers();
    // else if (msg.type === "priv") this.handlePrivate(msg);
    // else if (msg.type === "nameChange") this.handleNameChange(msg.newName);

    // else throw new Error(`bad message: ${msg.type}`);
  }



  /** Connection was closed: leave room, announce exit to others. */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left ${this.room.name}.`,
    });
  }
}

module.exports = ChatUser;
