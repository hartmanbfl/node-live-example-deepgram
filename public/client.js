

const captions = window.document.getElementById("captions");
const languages = window.document.getElementById("selectLang");

let currentLang = "en";


async function getMicrophone() {
  const userMedia = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  return new MediaRecorder(userMedia);
}

async function openMicrophone(microphone, socket) {
  await microphone.start(500);

  microphone.onstart = () => {
    console.log("client: microphone opened");
    document.body.classList.add("recording");
  };

  microphone.onstop = () => {
    console.log("client: microphone closed");
    document.body.classList.remove("recording");
  };

  microphone.ondataavailable = (e) => {
    console.log("client: sent data to websocket");
    socket.emit("packet-sent", e.data);
  };
}

async function closeMicrophone(microphone) {
  microphone.stop();
}

async function startRecording(socket) {
  const listenButton = document.getElementById("record");
  let microphone;

  console.log("client: waiting to open microphone");

  listenButton.addEventListener("click", async () => {
    if (!microphone) {
      // open and close the microphone
      microphone = await getMicrophone();
      await openMicrophone(microphone, socket);
    } else {
      await closeMicrophone(microphone);
      microphone = undefined;
    }
  });
}

async function startRadio(socket) {
  const listenButton = document.getElementById("record");
  let radio;
  listenButton.addEventListener("click", async () => {
    if (!radio) {
      radio = "ON"
      await startStreaming(socket);
    } else {
      await stopStreaming(socket);
      radio = undefined;
    }
  })
}

async function startStreaming(socket) {
  socket.emit("startStream");    
}
async function stopStreaming(socket) {
  socket.emit("stopStream");    
}

window.addEventListener("load", () => {
  const socket = io((options = { transports: ["websocket"] }));

  socket.on("connect", async () => {
    console.log("client: connected to websocket");
//    await startRecording(socket);
    await startRadio(socket);
  });

  socket.on("transcript", (transcript) => {
    captions.innerHTML = transcript ? `<span>${transcript}</span>` : "";
  });

  // Subscribe to translations
//  socket.emit('subscribe', 'de');
  socket.on('translated', (translated) => {
    console.log(`Received translation: ${translated}`);
    translations.innerHTML = translated ? `<span>${translated}</span>` : "";
  });

  languages.addEventListener("change", function() {
    let selectedLang = languages.options[languages.selectedIndex].value;
    if (selectedLang != currentLang) {
      socket.emit('unsubscribe', currentLang);
      currentLang = selectedLang;
    }
    console.log(`Selected language: ${selectedLang}`);
    socket.emit("subscribe", selectedLang);
  })
});
