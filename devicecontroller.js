var mqtt = require("mqtt");

var client  = mqtt.connect('mqtt://localhost')
 
var deviceType = "nutrients";
var pause = true;

var timerId = setInterval(
    function()
    {
        client.publish("control/" + deviceType + "/F1/A/3/16/2/3/3FE52AB", 
                       "[{\"command\": \"" + (pause? "pause" : "resume") + "\"}]", // can be more than one command potentially
                       { retain: true }); // retain messages while we're disonnected. TODO: How do we limit storage? I think Store of MQTT client library.
        pause = !pause;
    }, 
    5000); // Interval

// TODO: Get keepalive messages, disable devices, pause/resume devices.
client.on('connect', function () {
    client.subscribe('control/#'); // /type/farm/zone/shelf/tray/device
})
 
client.on('message', function (topic, message) {
    // message is Buffer 
    console.log("New message on topic '" + topic + "':" + message.toString());
})