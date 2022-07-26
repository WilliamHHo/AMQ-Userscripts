// ==UserScript==
// @name         AMQ Skip Buffering
// @version      1.5
// @description  Automatically skips to the next song when enabled even if there's buffering
// @match        https://animemusicquiz.com/*
// @grant        none
// ==/UserScript==

/* Usage:

Toggle ON/OFF: Alt+W
Manually Skip: Alt+X
It will display the state in the chat everytime you press Alt+W or Alt+X

*/

if (document.getElementById("startPage")) return;

let toggled_ON = false;
let songID;

function dockeyup(event) {
    if (event.altKey && event.keyCode == 87) {
        toggled_ON = !toggled_ON;
        logToChat(`Skip Buffering: toggle ${toggled_ON ? 'ON' : 'OFF'}`)
    }

    if (event.altKey && event.keyCode == 88) {
        socket.sendCommand({
            type: "quiz",
            command: "video ready",
            data: {
                songId: songID,
            },
        });
        logToChat(`Skipping to Next Song`)
    }

}

function logToChat(message) {
    let chatElem = document.getElementById('gcMessageContainer')
    let msgElem = document.createElement("li")
    msgElem.style = "color:#aaa"
    msgElem.innerHTML = message;
    chatElem.appendChild(msgElem)
    msgElem.scrollIntoViewIfNeeded()
}

new Listener("answer results", (results) => {
    if (toggled_ON && songID) {
        socket.sendCommand({
            type: "quiz",
            command: "video ready",
            data: {
                songId: songID,
            },
        });
    }
}).bindListener()

new Listener(
    "quiz next video info",
    function (data) {
        songID = data.videoInfo.id;
    }
).bindListener()
document.addEventListener('keyup', dockeyup, false);
