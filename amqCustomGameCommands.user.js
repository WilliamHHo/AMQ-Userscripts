// ==UserScript==
// @name        	AMQ Custom Game Commands
// @version     	0.51
// @description 	Chat commands for custom game modes. Credits to nyamu and ayyu for the original concept
// @match       	https://animemusicquiz.com/*
// @grant       	none
// @require     	https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

/* The following commands are currently supported:

		/aliens (number) : Randomly assigns aliens and humans. Defaults to 2 aliens if no number is specified
		/warlords : Picks a random member from each team
		/relay : Picks a random order for each team
		/pick (number) : Picks the players in a random order. Use an argument to limit the amount of players picked. (Can be used for the Corona game mode or others)
		/pick_spec (number) : Similar to the previous function, but it only chooses the spectators in a random order.
		/pick_all (number) : Rolls the order for all players and spectators
		
*/

(() => {
    if (document.getElementById('startPage')) return;
    let loadInterval = setInterval(() => {
        if (document.getElementById("loadingScreen").classList.contains("hidden")) {
            setup();
            clearInterval(loadInterval);
        }
    }, 500);

    function processChatCommand(payload) {
        if (payload.sender !== selfName
            || quiz.gameMode == 'Ranked'
            || (!quiz.inQuiz && !lobby.inLobby)) return;

        if (!(payload.message.startsWith('/aliens') || payload.message.startsWith('/warlords') ||
              payload.message.startsWith('/relay') || payload.message.startsWith('/pick'))) return;

        let names = [];
        let teams = {};

        if (payload.message.startsWith('/relay') || payload.message.startsWith('/warlords')) {
            for (let playerId in lobby.players) {
                let name = lobby.players[playerId]._name;
                names.push(name);
                teams[name] = lobby.players[playerId].lobbySlot['$TEAM_DISPLAY'][0].outerText;
            }
        } else {
            for (let playerId in lobby.players) {
                names.push(lobby.players[playerId]._name);
            }
        }

        shuffleArray(names);

        let timeout = 0;
        var i = 0

        if (payload.message.startsWith('/aliens')) {
            let numberOfAliens = 2;
            let message = payload.message.split(" ");
            if (message.length > 1) {
                numberOfAliens = message[1];
            }
            message = names[0];
            for (i = 1; i < numberOfAliens; i++) {
                message = message + ', ' + names[1]
            }
            for (i = 0; i < names.length; i++) {
                const player = names[i];
                if (i >= numberOfAliens) {
                    setTimeout(function(){ sendDMMessage("You are human.", player); }, timeout);
                } else {
                    setTimeout(function(){ sendDMMessage('The aliens are: ' + message, player); }, timeout);
                }
                timeout = timeout + 500;
            }
        }

        if (payload.message.startsWith('/warlords')) {
            let contains = [];
            for (i = 0; i < names.length; i++) {
                if (!contains.includes(teams[names[i]])) {
                    contains.push(teams[names[i]]);
                    sendChatMessage(names[i]);
                }
            }
        }

        if (payload.message.startsWith('/relay')) {
            for (i = 1; i <= names.length; i++) {
                let team = '';
                for (let k = 0; k < names.length; k++) {
                    if (i == teams[names[k]]) {
                        team = team + ' ' + names[k];
                    }
                }
                if (!!team) {
                    sendChatMessage('Team ' + i + ':' + team);
                }
            }
        }

        if (payload.message.startsWith('/pick')) {
            if (payload.message.startsWith('/pick_spec') || payload.message.startsWith('/pick_all')) {
                if (payload.message.startsWith('/pick_spec')) {
                    names = [];
                }
                gameChat.spectators.forEach(({name}) => names.push(name));
                shuffleArray(names);
            }
            let length = names.length;
            let message = payload.message.split(" ");
            if (message.length > 1) {
                length = message[1];
            }
            for (i = 0; i < length; i++) {
                sendChatMessage(names[i]);
            }
        }
    }

    function setup() {
        new Listener("Game Chat Message", processChatCommand).bindListener();
        new Listener("game chat update", (payload) => {
            payload.messages.forEach(message => processChatCommand(message));
        }).bindListener();

        AMQ_addScriptData({
            name: "Custom Commands",
            description: `<p>Some custom game mode chat commands. Can currently auto assign roles for game modes Spy vs. Spy, Find the Alien, Warlords, and Team Relays.</p>`
    });
    }

})();

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function logToChat(message) {
    let chatElem = document.getElementById('gcMessageContainer');
    let msgElem = document.createElement("li");
    msgElem.style = "color:#aaa";
    msgElem.innerHTML = message;
    chatElem.appendChild(msgElem);
    msgElem.scrollIntoViewIfNeeded();
}

function sendDMMessage(msg, username) {
    socket.sendCommand({
        type: "social",
        command: "chat message",
        data: {
            target: username,
            message: msg
        }
    });
}

function sendChatMessage(message) {
    gameChat.$chatInputField.val(message);
    gameChat.sendMessage();
}
