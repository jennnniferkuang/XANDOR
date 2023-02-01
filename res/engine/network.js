/*

This file is magic and it's a miracle that room logic even works at all.
Please don't touch.

*/

let peer;
let connection;

const gameBeginEvent = new CustomEvent("gamebegin");
const otherDisconnectedEvent = new CustomEvent("otherdisconnected");
const roomCreatedEvent = new CustomEvent("roomcreated");
const joinSuccessEvent = new CustomEvent("joinsuccess");

var GameNetwork;

let onOtherDisconnected = () => {
    connection.close();
    peer.disconnect();

    GameNetwork.isConnected = false;
    GameNetwork.roomName = null;
    GameNetwork.isHost = false;

    document.dispatchEvent(otherDisconnectedEvent);
};

let onDataReceived = data => {
    if(data.type == GameNetwork.EVENT_GAME_DATA) {
        Game.netReceive(data.data);
    }
};

let onRoomCreated = () => {
    GameNetwork.isHost = true;

    document.dispatchEvent(roomCreatedEvent);
}

let onJoinSuccess = name => {
    GameNetwork.isConnected = true;
    GameNetwork.roomName = name;

    document.dispatchEvent(joinSuccessEvent);
};

let onOtherConnected = () => {
    GameNetwork.isOtherConnected = true;
}

let onGameBegin = () => {
    document.dispatchEvent(gameBeginEvent);
};

let onJoinFailed = data => {
    connection.close();
    peer.disconnect();

    // console.log(data);

    let joinFailedEvent = new CustomEvent("joinfailed");
    joinFailedEvent.reason = data.reason;

    document.dispatchEvent(joinFailedEvent);
};

GameNetwork = {

    EVENT_JOIN_ATTEMPT: 0,
    EVENT_JOIN_SUCCESS: 1,
    EVENT_JOIN_FAIL: 2,
    EVENT_DISCONNECT: 3,
    EVENT_GAME_DATA: 4,

    roomName: null,
    isConnected: false,
    isOtherConnected: false,
    isHost: false,
    offline: false,

    createRoom: function(name) {
        peer = new Peer(name);

        onRoomCreated();
        onJoinSuccess(name);

        peer.on("connection", c => {
            c.on("open", () => {
                c.on("data", content => {
                    let data = JSON.parse(content);
                    if(data.type == this.EVENT_JOIN_ATTEMPT) {
                        if(this.isOtherConnected) {
                            console.log("Someone tried to join a full room");
                            c.send(JSON.stringify({
                                type: this.EVENT_JOIN_FAIL,
                                reason: "Room full"
                            }));
                        }
                        else {
                            connection = c;
                            this.send({
                                type: this.EVENT_JOIN_SUCCESS
                            });
                            connection.on("close", onOtherDisconnected);
                            onOtherConnected();
                            onGameBegin();
                        }
                    }
                    else {
                        onDataReceived(data);
                    }
                });
            });
        });
    },

    send: function(obj) {
        if (!this.offline) {
            let content = JSON.stringify(obj);
            connection.send(content);
        }
    },

    joinRoom: function(name) {
        peer = new Peer();

        let joinTimeout;

        peer.on("error", e => {
            let reasons = {
                "peer-unavailable": "Room does not exist",
                "network": "Unknown network error"
            };

            if(joinTimeout)
                clearTimeout(joinTimeout);
                
            onJoinFailed({
                reason: reasons[e.type] || e.type
            });
        });

        peer.on("open", () => {
            joinTimeout = setTimeout(() => {
                onJoinFailed({
                    reason: "Timed out"
                });
            }, 3000);

            connection = peer.connect(name);
            connection.on("open", () => {
                connection.on("data", content => {
                    clearTimeout(joinTimeout);

                    let data = JSON.parse(content);
                    if(data.type == this.EVENT_JOIN_SUCCESS) {
                        onJoinSuccess(name);
                        onGameBegin();
                    }
                    else if(data.type == this.EVENT_JOIN_FAIL) {
                        onJoinFailed(data);                        
                    }
                    else {
                        onDataReceived(data);
                    }
                });

                connection.on("close", onOtherDisconnected);

                this.send({ 
                    type: this.EVENT_JOIN_ATTEMPT
                });
            });
        });
    }
};