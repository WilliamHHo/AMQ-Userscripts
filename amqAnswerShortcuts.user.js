// ==UserScript==
// @name         AMQ Answer Shortcuts
// @version      1.0
// @description  Allows you to type manually made shortcuts for anime titles without the need of dropdown. Also can be used as a shortcut for Song/Artist mode
// @match        https://animemusicquiz.com/*
// @grant        none
// ==/UserScript==

if (document.getElementById('startPage')) {
    return
}
let shortcuts = {'mahoiku': 'Mahou Shoujo Ikusei Keikaku',
                 'bandori': 'BanG Dream!',
                 'youzitsu': 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e',
                 'cg': 'The IDOLM@STER Cinderella Girls',
                 'sao': 'Sword Art Online',
                 'ggo': 'Sword Art Online Alternative: Gun Gale Online',
                 'zls': 'Zombie Land Saga',
                 'zlsr': 'Zombie Land Saga Revenge',
                 'pokemon': 'pokémon',
                 'denyuden': 'Densetsu no Yuusha no Densetsu',
                 'scryed': 's-CRY-ed',
                 'swn': 'SawanoHiroyuki[nZk]:',
                 'kn': '(K)NoW_NAME:'}


$("#qpAnswerInput").unbind("click keypress");
$("#qpAnswerInput").keypress((event) => {
    if (event.which === 13) {
        let answer = $("#qpAnswerInput").val();
        if (answer in shortcuts) {
            quiz.answerInput.setNewAnswer(shortcuts[answer]);
        }
    }
});