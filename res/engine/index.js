let roomNameTextbox;
let roomJoinBtn;
let roomCreateBtn;

$(document).ready(() => {
    
    $("canvas").bind('contextmenu', () => false); // Disable canvas context menu

    roomNameTextbox = $("#room-name-textbox");
    roomJoinBtn = $("#room-join-btn");
    roomCreateBtn = $("#room-create-btn");

    $("#join-menu-title").text(GAME_INFO.name);
    document.title = GAME_INFO.name;

    $("canvas").attr("width", GAME_INFO.gameWidth);
    $("canvas").attr("height", GAME_INFO.gameHeight);

    roomJoinBtn.click(() => {
        $("#join-menu").hide();
        $("#joining-room").show();

        let name = roomNameTextbox.val();
        GameNetwork.joinRoom(name);
    });

    roomCreateBtn.click(() => {
        $("#waiting-for-player").show();
        $("#join-menu").hide();

        // Select 3 random words separated by a hyphen to use
        // as the name
        let name = words({
            exactly:3
        }).join("-");

        GameNetwork.createRoom(name);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const toJoin = urlParams.get('join');
    const error = urlParams.get('error');

    if(toJoin) {
        $("#join-menu").hide();
        $("#joining-room").show();

        GameNetwork.joinRoom(toJoin);
    }
    else if(error) {
        showErrorMessage(error);
    }
});

function showErrorMessage(msg) {
    $("#join-failed-reason").text(msg);
    $("#join-failed-alert").show();
}

$(document).on("joinsuccess", () => {
    if(GameNetwork.isHost && !GameNetwork.isOtherConnected) {
        $("#waiting-for-player").show();
        $(".room-name").text(GameNetwork.roomName);
        $(".room-link").text(window.location.protocol + '//' + window.location.host + window.location.pathname + 
            "?join=" + GameNetwork.roomName);
        $(".room-link").prop("href", window.location.protocol + '//' + window.location.host + window.location.pathname + 
            "?join=" + GameNetwork.roomName);
    }
});

$(document).on("joinfailed", e => {
    // Refresh the page to prevent bugs
    window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname + "?error=" + e.originalEvent.reason;
});

$(document).on("otherdisconnected", () => {
    // Refresh the page to prevent bugs
    window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname + "?error=The other player disconnected";
});

$(document).on("gamebegin", () => {
    $(".join-menu-container").hide();
    $("#join-menu").hide();
    $("#joining-room").hide();
    $("#waiting-for-player").hide();
    $("#game").show();

    Game.init();
});
