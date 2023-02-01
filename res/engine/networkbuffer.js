let buffer = { };

var NetworkBuffer = { };

// Gets the buffer.
NetworkBuffer.getBuffer = () => buffer;

// Adds one or more structures to the network buffer. An example of an 
// argument to pass is something like this:
/*

NetworkBuffer.writeAll({
    eventA: {
        id: "whatever",
        pos: "whatever"
    },
    eventB: {
        id: "whatever",
        size: "whatever"
    }
});

*/
NetworkBuffer.writeAll = obj => {
    buffer = { 
        ...buffer, 
        obj
    };
};

/*
* Adds only one event to the network buffer
*
* Every event type is an array that gets
* added to. If an event of the same type
* has already been received in this buffer
* load, then add it to the same array.
* Otherwise create an array for this event
* type with the event's data inside.
*
* Client functions receiving network events 
* must work on every array element.
*/
NetworkBuffer.write = (name, data) => {
    // If name in buffer add event to array
    // other create array
    if (name in buffer) {
        buffer[name].push(data);
    } else {
        buffer[name] = [data];
    }
};

// Sends everything inside the network buffer to the other player
NetworkBuffer.flush = () => {
    if(buffer && Object.keys(buffer).length === 0 && buffer.constructor === Object) return;

    Game.send(buffer);
    buffer = { };
};