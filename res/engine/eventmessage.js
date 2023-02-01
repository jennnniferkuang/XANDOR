// The "Notifications" section is just the yellow text that
// sometimes comes up on the bottom right of the screen

// Default time that the message will stay onscreen
const MESSAGE_DURATION = 3.0;

var Notifications = {
    active: [ ] // All active messages
}

// Send a message (also optionally to just the local client)
Notifications.send = (text, foreign = false) => {
    Notifications.active.unshift({ text: text, timeLeft: MESSAGE_DURATION });
    if(!foreign)
        NetworkBuffer.write("eventMessage", text);
};

// Update and draw the chat section in the bottom right
Notifications.tick = (dt, g) => {
    for (let i = 0; i < Notifications.active.length; i++) {
        const msg = Notifications.active[i];
        g.fillStyle = "rgba(255, 255, 0, " + (msg.timeLeft / MESSAGE_DURATION) + ")";
        g.font = "14px Arial";
        g.textAlign = "right";
        g.textBaseline = "bottom";
        g.fillText(msg.text, Game.WIDTH - 10, Game.HEIGHT - i * 20 - 10);

        // Subtract time, and if this message has 0 time left then delete it
        msg.timeLeft -= dt;
        if(msg.timeLeft <= 0) {
            Notifications.active = Notifications.active.filter(x => x.timeLeft > 0);
        }
    }
}

// Receive any messages from the other client
Notifications.receiveMessages = data => {
    if(data.eventMessage) {
        data.eventMessage.forEach(function(e) {
            Notifications.send(e, true);
        });
    }
};
