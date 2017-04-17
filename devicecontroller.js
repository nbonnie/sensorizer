var express = require('express');
var mqtt = require("mqtt");

var app = express();

var client  = mqtt.connect('mqtt://localhost');

var webPort = 3000;
var deviceType = "nutrients";

// TODO: Get keepalive messages, disable devices, pause/resume devices.
client.on('connect', function () {
    client.subscribe('control/#'); // /type/farm/zone/shelf/tray/device
})
 
client.on('message', function (topic, message) {
    // message is Buffer 
    console.log("New message on topic '" + topic + "':" + message.toString());
})

var handlePause = function(req, res) {
    console.log("pause request: ", req.params);

    client.publish("control/" + deviceType + "/F1/A/3/*/2/3/3FE52AB", 
                    "[{\"command\": \"" + (req.params.pause === "true"? "pause" : "resume") + "\"}]", // can be more than one command potentially
                    { retain: true }); // retain messages while we're disonnected. TODO: How do we limit storage? I think Store of MQTT client library.

    res.send(JSON.stringify({deviceId: req.params.deviceId, deviceType: req.params.deviceType}));
}

app.get("/pause/:deviceType/:farmId/:zoneId/:shelfId/:trayId/:position/:deviceId/:pause", handlePause);

app.listen(webPort, function() {
    console.info("Controller app started on port " + webPort);
})