// ==UserScript==
// @name         AMQ Openings Only Room Filter
// @version      0.4
// @description  Filters all rooms without either ending or insert songs.
// @match        https://animemusicquiz.com/*
// @grant        none

// ==/UserScript==

(function() {
    if (document.getElementById('startPage')) {
        return
    }

    $("#rbMajorFilters").css("width", 350);
    $("#rbMajorFilters").css("left", -350);
    $("#rbMajorFilters").append(`<div><div class="customCheckbox"><input type="checkbox" id="Openings"><label for="Openings"><i class="fa fa-check" aria-hidden="true"></i></label></div><p>Openings</p><div>`);

    $("#Openings").on('click', () => {
        roomBrowser.applyTileFilter();
    });

    roomBrowser.applyTileFilterToRoom = function (room) {
        var openings = ($("#Openings").prop('checked') && room.settings.songType.advancedValue.endings == 0 && room.settings.songType.advancedValue.inserts == 0 &&
                        !room.settings.songType.standardValue.endings && !room.settings.songType.standardValue.inserts);
        room.setHidden(openings || !roomFilter.testRoom(room));
        this.updateNumberOfRoomsText();
    };
})();
