var mqtt = require("mqtt");

var client  = mqtt.connect('mqtt://localhost')
 
client.on('connect', function () {
    client.subscribe('data/#'); // /type/farm/zone/shelf/tray/device
})
 
client.on('message', function (topic, message) {
    // message is Buffer 
    console.log("New message on topic '" + topic + "':" + message.toString());
})