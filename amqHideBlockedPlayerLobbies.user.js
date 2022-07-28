// ==UserScript==
// @name         AMQ Hide Blocked Player Lobbies
// @version      1.0
// @description  Automatically filters all rooms with blocked players in the lobby
// @match        https://animemusicquiz.com/*
// @grant        none

// ==/UserScript==

(function() {
    if (document.getElementById('startPage')) {
        return
    }

    roomBrowser.applyTileFilterToRoom = function (room) {
        var block = 0;
        var blockedList = socialTab.blockedPlayers
        for (var blocked in blockedList) {
            if (room._players.includes(blockedList[blocked])) {
                block = 1;
                break;
            }
        }
        room.setHidden(block || !roomFilter.testRoom(room));
        this.updateNumberOfRoomsText();
    };

})();
