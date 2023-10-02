const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
dotenv.config();
const fetch = require("cross-fetch");

const {translateText} = require('./translate.js');
const {abortStream, sendStreamToDeepgram, setupDeepgram} = require('./transcript.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


const TIME_LIMIT = 20
const url = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service"

// Keep track of how many subscribers to each language
let subscriberList = {};


io.on("connection", (socket) => {
  console.log("socket: client connected");
  let deepgram = setupDeepgram(socket);

  socket.on("packet-sent", (data) => {
    console.log("socket: client data received");

    if (deepgram.getReadyState() === 1 /* OPEN */) {
      console.log("socket: data sent to deepgram");
      deepgram.send(data);
    } else if (deepgram.getReadyState() >= 2 /* 2 = CLOSING, 3 = CLOSED */) {
      console.log("socket: data couldn't be sent to deepgram");
      console.log("socket: retrying connection to deepgram");
      /* Attempt to reopen the Deepgram connection */
      deepgram.finish();
      deepgram.removeAllListeners();
      deepgram = setupDeepgram(socket);
    } else {
      console.log("socket: data couldn't be sent to deepgram");
    }
  });

  socket.on("disconnect", () => {
    console.log("socket: client disconnected");
    deepgram.finish();
    deepgram.removeAllListeners();
    deepgram = null;
  });

  socket.on("subscribe", (language) => {
    console.log(`Subscribing to ${language}`);
    socket.join(language);
  });

  socket.on('unsubscribe', (language) => {
    console.log(`Unsubscribing from ${language}`);
    socket.leave(language);
  });

  socket.on('startStream', () => {
    sendStreamToDeepgram(deepgram, url);
  });
  socket.on('stopStream', () => {
    abortStream();
  });

});

app.use(express.static("public/"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

server.listen(3000, () => {
  console.log("listening on localhost:3000");
});
