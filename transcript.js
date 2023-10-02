const { Deepgram } = require("@deepgram/sdk");
const client = new Deepgram(process.env.DEEPGRAM_API_KEY);
const Rx = require('rxjs');
const transcriptSubject = new Rx.Subject();

let keepAlive;


const setupDeepgram = (socket) => {
  transcriptSubject.subscribe(async (transcript) => {
    console.log(`Subject received: ${transcript}`);

    // For now emit on 2 languages 
//    let germanText = await translateText("de", transcript);
//    let frenchText = await translateText("fr", transcript);
//    io.in('de').emit('translated', germanText);
//    io.in('fr').emit('translated', frenchText);
  });

  const deepgram = client.transcription.live({
    language: "en",
    punctuate: true,
    smart_format: true,
    model: "nova",
  });

  if (keepAlive) clearInterval(keepAlive);
  keepAlive = setInterval(() => {
    console.log("deepgram: keepalive");
    deepgram.keepAlive();
  }, 10 * 1000);

  deepgram.addListener("open", async () => {
    console.log("deepgram: connected");

    deepgram.addListener("close", async () => {
      console.log("deepgram: disconnected");
      clearInterval(keepAlive);
      deepgram.finish();
    });

    deepgram.addListener("error", async (error) => {
      console.log("deepgram: error recieved");
      console.error(error);
    });

    deepgram.addListener("transcriptReceived", (packet) => {
      console.log("deepgram: packet received");
      const data = JSON.parse(packet);
      const { type } = data;
      switch (type) {
        case "Results":
          console.log("deepgram: transcript received");
          const transcript = data.channel.alternatives[0].transcript ?? "";
          transcriptSubject.next(transcript);
          console.log("socket: transcript sent to client");
          socket.emit("transcript", transcript);
          break;
        case "Metadata":
          console.log("deepgram: metadata received");
          break;
        default:
          console.log("deepgram: unknown packet received");
          break;
      }
    });
  });

  return deepgram;
};

let aborter;
function abortStream() {
  aborter.abort();
}

async function sendStreamToDeepgram(deepgram, url) {
  aborter = new AbortController();
  const signal = aborter.signal;
  try {
    const response = await fetch(url, { signal });
    const body = response.body;
    const reader = body.getReader();
    while (true) {
      if (signal.aborted) throw signal.reason;
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (deepgram.getReadyState() === 1) {
        deepgram.send(value);
      }
    }
  } catch (e) {
    console.log(e);
  }

}

module.exports = {
  abortStream,
  sendStreamToDeepgram,
  setupDeepgram,
  transcriptSubject
}