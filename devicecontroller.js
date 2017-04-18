var express = require('express');
var farmutils = require("./farmutils");
var mqtt = require("mqtt");

var app = express();
var httpServer = require('http').Server(app);
var websockets = require('socket.io')(httpServer);
var client  = mqtt.connect('mqtt://localhost');

var webPort = 3000;
var devices = [];

// TODO: Get keepalive messages, disable devices, pause/resume devices.
client.on('connect', function () {
    client.subscribe('notify/#'); // /type/farm/zone/shelf/tray/device
})
 
client.on('message', function (topicStr, message) {
    // message is Buffer 
    topic = farmutils.parseTopic(topicStr);
    switch (topic.channelType) {
        case "notify": 
            var notification = JSON.parse(message.toString());
            
            switch(notification.action) {
                case "ping":
                    registerPing(topic);
                    break;
                default:
                    console.warn("Unknown notification action " + payload.action)
            }
            break;
        default:
            console.log("New message on topic '" + topic + "':" + message.toString());
    }
})

var registerPing = function(topic) {

    if (typeof devices[topic.deviceId] === 'undefined') {
        // New device. Add it to the devices list.
        devices[topic.deviceId] = {};
        devices[topic.deviceId].properties = topic;
        console.info("Device " + topic.deviceId + " (" + topic.deviceType + ") added.");
    }
    else {
        // Existing device - delete the current timeout and set a new one.
        clearTimeout(devices[topic.deviceId].pingTimeout);
    }

    devices[topic.deviceId].properties.connected  = true;
    devices[topic.deviceId].pingTimeout = setTimeout(
        function() {
            console.warn("Device " + topic.deviceId + " (" + topic.deviceType + ") is offline. ");
            devices[topic.deviceId].properties.connected = false;
        }
        , 10000); // Alert if we didn't hear from the device for 10 seconds.
}

var handlePauseReq = function(req, res) {
    console.log("pause request: ", req.params);

    client.publish("control/" + 
                    req.params.deviceType + "/" +
                    req.params.farmId + "/" + 
                    req.params.zoneId + "/" +
                    req.params.shelfId + "/" +
                    req.params.trayId + "/" + 
                    req.params.position + "/" + 
                    req.params.deviceId, 
                    "[{\"command\": \"" + (req.params.pause === "true"? "pause" : "resume") + "\"}]", // can be more than one command potentially
                    { retain: true }); // retain messages while we're disonnected. TODO: How do we limit storage? I think Store of MQTT client library.

    res.send(JSON.stringify({deviceId: req.params.deviceId, deviceType: req.params.deviceType}));
}

var getDevicesList = function() {
    var response = [];

    for(device in devices) {
        if (devices.hasOwnProperty(device)) {
            response.push(devices[device].properties);
        }
    };

    return response;
}
var getDevicesReq = function(req, res) {
    res.send(JSON.stringify(getDevicesList()));
}


httpServer.listen(webPort, function() {
    console.info("Controller app started on port " + webPort);
})

app.use(express.static("wwwroot"));
app.get("/pause/:deviceType/:farmId/:zoneId/:shelfId/:trayId/:position/:deviceId/:pause", handlePauseReq);
app.get("/devices", getDevicesReq);


websockets.on('connection', function(socket) {
    console.log("Got new websocket connection");
})

setInterval(function() {
    websockets.emit("devices", getDevicesList());
}, 2000);
