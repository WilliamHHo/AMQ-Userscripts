// ==UserScript==
// @name         AMQ Player Lobby Viewer
// @version      0.8
// @description  See all players in a lobby by hovering over the player bar. Updates when the room tiles are reloaded.
// @match        https://animemusicquiz.com/*
// @grant        none
// ==/UserScript==

if(!document.getElementById("startPage")){
    // Wait until the LOADING... screen is hidden and load script
    let loadInterval = setInterval(() => {
        if (document.getElementById("loadingScreen").classList.contains("hidden")) {
            // No need for setup or anything, this is the only thing it does and should only run once
            if(ROOM_TILE_TEMPLATE){
                ROOM_TILE_TEMPLATE = ROOM_TILE_TEMPLATE.replace('title="Players"', 'title={16}');
            }
            clearInterval(loadInterval);
        }
    }, 500);

    window.RoomTile = function RoomTile(
    settings,
     host,
     hostAvatar,
     id,
     numberOfPlayers,
     numberOfSpectators,
     players,
     inLobby,
     parent,
     songLeft,
     tutorialRoom,
     $scrollContainer
    ) {
        this.settings = settings;
        this.id = id;
        this.host = host;
        this._inLobby = inLobby;

        this._roomSize = this.settings.roomSize;
        this._numberOfPlayers = numberOfPlayers;
        this._numberOfSpectators = numberOfSpectators;
        this._players = players;

        this._private = this.settings.privateRoom;
        this.modalPreviewOpen = false;

        //Calculate number of friends
        this._friendsInGameMap = {};

        let openingClass = this.getSelectionClass(
            this.settings.songType.standardValue.openings &&
            (this.settings.songType.advancedValue.openings || this.settings.songType.advancedValue.random)
        );
        let endingClass = this.getSelectionClass(
            this.settings.songType.standardValue.endings &&
            (this.settings.songType.advancedValue.endings || this.settings.songType.advancedValue.random)
        );
        let insertClass = this.getSelectionClass(
            this.settings.songType.standardValue.inserts &&
            (this.settings.songType.advancedValue.inserts || this.settings.songType.advancedValue.random)
        );

        let modeName;
        if (this.settings.showSelection === quiz.SHOW_SELECTION_IDS.LOOTING) {
            modeName = "Battle Royale";
        } else if (this.settings.scoreType === quiz.SCORE_TYPE_IDS.LIVES) {
            modeName = "Last Man Standing";
        } else if (this.settings.scoreType === quiz.SCORE_TYPE_IDS.SPEED) {
            modeName = "Quick Draw";
        } else {
            modeName = "Standard";
        }

        let avatar = hostAvatar.avatar;
        this.parent = parent;
        this.parent.appendRoomTile(
            format(
                ROOM_TILE_TEMPLATE,
                escapeHtml(this.settings.roomName),
                this.host,
                id,
                numberOfSpectators,
                Object.keys(this._friendsInGameMap).length,
                this._numberOfPlayers,
                this._roomSize,
                this.translateGuessTime(this.settings.guessTime),
                this.settings.numberOfSongs,
                this.translateSongSelection(this.settings.songSelection),
                openingClass,
                endingClass,
                insertClass,
                (this._numberOfPlayers / this._roomSize) * 100,
                modeName,
                "sizeMod" + avatar.sizeModifier,
                this._players
            )
        );

        this.$tile = $("#rbRoom-" + id);
        this.$tile.find("[data-toggle=popover]").popover();
        this.$tile.find('[data-toggle="tooltip"]').tooltip();

        this.$tile.find(".rbrFriendPopover").popover({
            trigger: "hover",
            placement: "auto top",
            title: "Friends",
            container: "#roomBrowserPage",
            content: "",
            html: true,
        });

        this.updateFriends();

        this.resizeRoomName();

        this.togglePrivate();

        this.$joinButton = this.$tile.find(".rbrJoinButton");

        this.toggleJoinButton();

        if (!this._inLobby) {
            this.setSongsLeft(songLeft);
            this.$tile.addClass("rbrPlaying");
        }

        //LISTENERS
        if (!tutorialRoom) {
            this._changeListner = new Listener(
                "Room Change",
                function (payload) {
                    if (this.id === payload.roomId) {
                        if (payload.changeType === "settings") {
                            for (let key in payload.change) {
                                if (payload.change.hasOwnProperty(key)) {
                                    this.updateSetting(key, payload.change[key]);
                                    this.toggleJoinButton();
                                }
                            }
                            if (this.modalPreviewOpen) {
                                hostModal.changeSettings(payload.change);
                            }
                        } else if (payload.changeType === "players") {
                            if (payload.player) {
                                if (payload.playerCount > this._numberOfPlayers) {
                                    this._players.push(payload.player);
                                } else {
                                    this._players.splice(this._players.indexOf(payload.player), 1);
                                }
                                if (socialTab.onlineFriends[payload.player]) {
                                    this.updateFriends();
                                }
                            }
                            this._numberOfPlayers = payload.playerCount;
                            this.$tile.find(".rbrPlayerCount").text(this._numberOfPlayers);
                            this.updateProgressBar();
                            this.toggleJoinButton();
                            if (payload.newHost) {
                                this.$tile.find(".rbrHost").text(payload.newHost.name);
                                this.host = payload.newHost.name;
                            }
                        } else if (payload.changeType === "spectators") {
                            if (payload.player) {
                                if (payload.spectatorCount > this._numberOfSpectators) {
                                    this._players.push(payload.player);
                                } else {
                                    this._players.splice(this._players.indexOf(payload.player), 1);
                                }
                                if (socialTab.onlineFriends[payload.player]) {
                                    this.updateFriends();
                                }
                            }
                            this.$tile.find(".rbrNumberOfSpectators").text(payload.spectatorCount);
                            this._numberOfSpectators = payload.spectatorCount;
                        } else if (payload.changeType === "songsLeft") {
                            this.setSongsLeft(payload.songsLeft);
                        } else if (payload.changeType === "game start") {
                            this._inLobby = false;
                            this.toggleJoinButton();
                            this.setSongsLeft(this.settings.numberOfSongs);
                            this.$tile.addClass("rbrPlaying");
                        } else if (payload.changeType === "game over") {
                            this._inLobby = true;
                            this.toggleJoinButton();
                            this.$tile.removeClass("rbrPlaying");
                        } else {
                            this.delete();
                            if (this.modalPreviewOpen) {
                                hostModal.hide();
                                displayMessage("Room Closed");
                            }
                        }
                        roomBrowser.applyTileFilterToRoom(this);
                    }
                }.bind(this)
            );
            this._changeListner.bindListener();
        }

        this.$tile.find(".rbrJoinButton").click(() => {
            this.joinGame();
        });

        if (!tutorialRoom) {
            this.$tile.find(".rbrSpectateButton").click(() => {
                this.spectateGame();
            });

            this.$tile.find(".rbrAllOptionsIcon").click(() => {
                this.previewSettings();
            });

            roomBrowser.applyTileFilterToRoom(this);
        }

        let avatarSrc = cdnFormater.newAvatarSrc(
            avatar.avatarName,
            avatar.outfitName,
            avatar.optionName,
            avatar.optionActive,
            avatar.colorName,
            cdnFormater.AVATAR_POSE_IDS.BASE
        );
        let avatarSrcSet = cdnFormater.newAvatarSrcSet(
            avatar.avatarName,
            avatar.outfitName,
            avatar.optionName,
            avatar.optionActive,
            avatar.colorName,
            cdnFormater.AVATAR_POSE_IDS.BASE
        );
        let avatarSizeMod = this.AVATAR_SIZE_MOD_SIZES[avatar.sizeModifier];
        let $avatarImg = this.$tile.find(".rbrRoomImage");

        this.avatarPreloadImage = new PreloadImage(
            $avatarImg,
            avatarSrc,
            avatarSrcSet,
            false,
            avatarSizeMod,
            () => {
                let $imgContainer = this.$tile.find(".rbrRoomImageContainer");
                $imgContainer.css(
                    "background-image",
                    'url("' +
                    cdnFormater.newAvatarBackgroundSrc(
                        hostAvatar.background.backgroundHori,
                        cdnFormater.BACKGROUND_ROOM_BROWSER_SIZE
                    ) +
                    '")'
                );
            },
            false,
            $scrollContainer
        );
        if(tutorialRoom) {
            this.avatarPreloadImage.load();
        }
    }

    RoomTile.prototype.joinGame = function () {
        if (this._private) {
            swal({
                title: "Password Required",
                input: "password",
                showCancelButton: true,
                confirmButtonText: "Join",
                inputAttributes: {
                    maxlength: 50,
                    minlength: 1,
                },
            }).then((result) => {
                if (!result.dismiss) {
                    roomBrowser.fireJoinLobby(this.id, result.value);
                }
            });
        } else {
            roomBrowser.fireJoinLobby(this.id);
        }
    };

    RoomTile.prototype.spectateGame = function () {
        if (this._private) {
            roomBrowser.spectateGameWithPassword(this.id);
        } else {
            roomBrowser.fireSpectateGame(this.id);
        }
    };

    RoomTile.prototype.togglePrivate = function () {
        let $privateContainer = this.$tile.find(".rbrPrivateContainer");
        if (this._private) {
            $privateContainer.removeClass("hidden");
        } else {
            $privateContainer.addClass("hidden");
        }
    };

    RoomTile.prototype.isPrivate = function () {
        return this._private;
    };

    RoomTile.prototype.translateSongSelection = function (songSelection) {
        if (songSelection.advancedOn) {
            return "Custom";
        } else {
            switch (songSelection.standardValue) {
                case 1:
                    return "Random";
                case 2:
                    return "Mainly Watched";
                case 3:
                    return "Only Watched";
            }
        }
    };

    RoomTile.prototype.translateGuessTime = function (guessTimeEntry) {
        let guessTimeString = "";
        if (guessTimeEntry.randomOn) {
            let guessTime = guessTimeEntry.randomValue;
            guessTimeString = guessTime[0] + "-" + guessTime[1];
        } else {
            guessTimeString = guessTimeEntry.standardValue;
        }
        return guessTimeString;
    };

    RoomTile.prototype.updateFriendInfo = function () {
        this.$tile.find(".rbrNumberOfFriends").text(Object.keys(this._friendsInGameMap).length);

        let popoverContent;
        if (Object.keys(this._friendsInGameMap).length) {
            let $friendList = $("<ul></ul>");
            Object.keys(this._friendsInGameMap)
                .sort((a, b) => {
                return a.toLowerCase().localeCompare(b.toLocaleLowerCase());
            })
                .forEach((friends) => {
                $friendList.append($("<li></li>").text(friends));
            });
            popoverContent = $friendList[0].outerHTML;
        }

        this.$tile.find(".rbrFriendPopover").data("bs.popover").options.content = popoverContent;
    };

    RoomTile.prototype.updateSetting = function (setting, change) {
        switch (setting) {
            case "guessTime":
                this.$tile.find(".rbrGuessTime").text(this.translateGuessTime(change));
                break;
            case "songSelection":
                this.$tile.find(".rbrSongFilter").text(this.translateSongSelection(change));
                break;
            case "numberOfSongs":
                this.$tile.find(".rbrSongCount").text(change);
                break;
            case "roomSize":
                this.$tile.find(".rbrMaxPlayerCount").text(change);
                this._roomSize = change;
                this.updateProgressBar();
                break;
            case "songType":
                this.updateSelection(
                    ".rbrTypeOpening",
                    change.standardValue.openings && (change.advancedValue.openings || change.advancedValue.random)
                );
                this.updateSelection(
                    ".rbrTypeEnding",
                    change.standardValue.endings && (change.advancedValue.endings || change.advancedValue.random)
                );
                this.updateSelection(
                    ".rbrTypeInsert",
                    change.standardValue.inserts && (change.advancedValue.inserts || change.advancedValue.random)
                );
                break;
            case "roomName":
                this.$tile.find(".rbrRoomName").text(change);
                this.resizeRoomName();
                break;
            case "privateRoom":
                this._private = change;
                this.togglePrivate();
                break;
            case "gameMode":
                this.$tile.find(".rbrGameMode").text(change);
                break;
        }
        this.settings[setting] = change;
    };

    RoomTile.prototype.updateAdvancedSetting = function (className, newValue) {
        let $extraOptionIcon = this.$tile.find(".rbrAllOptionsIcon");
        let newPopout = $("<div>" + $extraOptionIcon.attr("data-content") + "</div>");
        newPopout.find(className).text(newValue);
        $extraOptionIcon.attr("data-content", newPopout.html());
    };

    RoomTile.prototype.updateAdvancedSelection = function (className, selected) {
        let $extraOptionIcon = this.$tile.find(".rbrAllOptionsIcon");
        let newPopout = $("<div>" + $extraOptionIcon.attr("data-content") + "</div>");
        if (selected) {
            newPopout.find(className).addClass("rbrSelected");
        } else {
            newPopout.find(className).removeClass("rbrSelected");
        }
        $extraOptionIcon.attr("data-content", newPopout.html());
    };

    RoomTile.prototype.updateSelection = function (className, selected) {
        if (selected) {
            this.$tile.find(className).addClass("rbrSelected");
        } else {
            this.$tile.find(className).removeClass("rbrSelected");
        }
    };

    RoomTile.prototype.updateProgressBar = function () {
        let newPercent = (this._numberOfPlayers / this._roomSize) * 100;
        this.$tile.find(".progress-bar").css("width", newPercent + "%");
    };

    RoomTile.prototype.toggleJoinButton = function () {
        let off = this._numberOfPlayers === this._roomSize || !this._inLobby;
        if (off) {
            this.$joinButton.addClass("disabled");
        } else {
            this.$joinButton.removeClass("disabled");
        }
        if (this.modalPreviewOpen) {
            hostModal.toggleJoinButton(!off);
        }
    };

    RoomTile.prototype.isInLobby = function () {
        return this._inLobby;
    };

    RoomTile.prototype.isFull = function () {
        return this._numberOfPlayers === this._roomSize;
    };

    RoomTile.prototype.getSelectionClass = function (checked) {
        if (checked) {
            return "rbrSelected";
        } else {
            return "";
        }
    };

    RoomTile.prototype.delete = function () {
        this._changeListner.unbindListener();
        this.$tile.find("[data-toggle=popover]").popover("destroy");
        this.$tile.find('[data-toggle="tooltip"]').tooltip("destroy");
        this.$tile.find(".rbrFriendPopover").popover("destroy");
        if (this.avatarPreloadImage) {
            this.avatarPreloadImage.cancel();
        }
        this.parent.removeRoomTile(this.id);
    };

    RoomTile.prototype.setHidden = function (hide) {
        if (hide) {
            this.$tile.addClass("hidden");
        } else {
            this.$tile.removeClass("hidden");
            if (this.avatarPreloadImage) {
                this.avatarPreloadImage.lazyLoadEvent();
            }
        }
    };

    RoomTile.prototype.updateFriends = function () {
        this._friendsInGameMap = {};
        this._players.forEach((player) => {
            if (socialTab.onlineFriends[player]) {
                this._friendsInGameMap[player] = true;
            }
        });

        this.updateFriendInfo();
    };

    RoomTile.prototype.resizeRoomName = function () {
        fitTextToContainer(this.$tile.find(".rbrRoomName"), this.$tile.find(".rbrRoomNameContainer"), 21, 13);
    };

    RoomTile.prototype.setSongsLeft = function (newValue) {
        this.$tile.find(".rbrSongsLeft").text(newValue);
    };

    RoomTile.prototype.previewSettings = function () {
        this.modalPreviewOpen = true;
        hostModal.changeSettings(this.settings);
        hostModal.setModePreviewGame(this);
        this.toggleJoinButton();
        hostModal.showSettings();
        hostModal.show();
    };

    RoomTile.prototype.settingPreviewClosed = function () {
        this.modalPreviewOpen = false;
    };

    RoomTile.prototype.getFriendsInGame = function () {
        return Object.keys(this._friendsInGameMap);
    };

    RoomTile.prototype.AVATAR_SIZE_MOD_SIZES = {
        0: "105px",
        20: "126px",
        51: "160px",
    };
}

