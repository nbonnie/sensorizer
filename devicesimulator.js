var config = require("config");
var mqtt = require("mqtt");
var farmutils = require("./farmutils");

var client  = mqtt.connect('mqtt://localhost')
// TODO: Figure out if it makes sense to have the device ID in the topic or not.
var deviceId   = config.get("deviceProperties.deviceId"); 
var deviceType = config.get("deviceProperties.deviceType"); // TODO: ENUM for device types
var farmId     = config.get("deviceProperties.farmId");
var zoneId     = config.get("deviceProperties.zoneId");
var shelfId    = config.get("deviceProperties.shelfId");
var trayId     = config.get("deviceProperties.trayId");
var position   = config.get("deviceProperties.position");

var sendData = true;

// TODO: Add to a shared library
var fromTopicStr = function(topic) {
    var result = farmutils.parseTopic(topic);

    // TODO: Can do real wildcard.
    // We need to be able to subscribe to the entire hierarchy for cases such as disable all sensors in a tray,
    // upgrade all cameras etc. MQTT does not allow for publishing to wildcards. That's where the asterisk comes in handy.
    result.isActionable = (result.deviceType === deviceType || result.deviceType === "*") &&
                          (result.farmId === farmId         || result.farmId === "*") &&
                          (result.zoneId === zoneId         || result.zoneId === "*") &&
                          (result.shelfId === shelfId       || result.shelfId === "*") &&
                          (result.trayId === trayId         || result.trayId === "*") &&
                          (result.position === position     || result.position === "*") && 
                          (result.deviceId === deviceId     || result.deviceId === "*");

    return result;
}

var dataTimer = setInterval(
    function()
    {
        if (sendData) {
            client.publish("data/" + 
                            deviceType + "/" +
                            farmId + "/" +
                            zoneId + "/" + 
                            shelfId + "/" + 
                            trayId + "/" +
                            position + "/" + 
                            deviceId, 
                           "[{timestamp: " + (new Date()).getTime() + ", ph: 6.3}]",
                           { retain: true }) // retain messages while we're disonnected. TODO: How do we limit storage? I think Store of MQTT client library.
        }
    }, 
    1000); // Interval

var keepAliveTimer  = setInterval(
    function()
    {
        client.publish("notify/" + 
                        deviceType + "/" +
                        farmId + "/" +
                        zoneId + "/" + 
                        shelfId + "/" + 
                        trayId + "/" +
                        position + "/" + 
                        deviceId, 
                        "{\"action\": \"ping\", \"sendingData\": " + sendData + "}",
                        { retain: true }) // retain messages while we're disonnected. TODO: How do we limit storage? I think Store of MQTT client library.
    }, 
    5000); // Interval

// Types of channels: data, control, admin
// Topic structure: <channel-type>/<device-type>/<farm-id>/<zone-id>/<shelf-id>/<tray-id>/<position>/<device-id>
// TODO: This is a naive implementation. Client will be bombarded with all admin and control messages. 
//       For actions on entire farm/zone we may want to loop through all farms/zones in the sender's side.
//       We may also want to split control and keep-alive and info messages so only the controller listens to info
//       and clients only listen to control requests.

client.on("connect", function () {
    console.info("device " + deviceId + " (" + deviceType + ") connected to MQTT broker.");
    client.subscribe("admin/#");
    client.subscribe("control/#");
})

client.on("reconnect", function() {
    console.info("device " + deviceId + " (" + deviceType + ") reconnect attempt.");
})

client.on("close", function() {
    console.warn("device " + deviceId + " (" + deviceType + ") disconnected.");
})

client.on("offline", function() {
    console.warn("device " + deviceId + " (" + deviceType + ") is offline.");
})

client.on("error", function() {
    console.error("device " + deviceId + " (" + deviceType + ") MQTT error.");
})

client.on("message", function (topicStr, messageBuf) {
    var topic = fromTopicStr(topicStr);

    if (topic.isActionable) {
        switch(topic.channelType) {
            case "admin":
                console.log("admin message received: " + messageBuf.toString());
                break;
            case "control":
                console.log("control message received: " + messageBuf.toString());

                // Control messages are arrays of commands
                var message = JSON.parse(messageBuf.toString());
                message.forEach(function(element) {
                    console.log("command: " + element.command);
                    switch (element.command) {
                        case ("pause"):
                            console.info("Pausing data publishing. [deviceId: " + deviceId + "]");
                            sendData = false;
                            break;
                        case ("resume"): 
                            console.info("Resuming data publishing. [deviceId: " + deviceId + "]");
                            sendData = true;
                            break;
                        default:
                            console.log("Not acting on " + element.command + " command.")
                    }
                }, this);
                break;
            default:
                console.warn("Unsupported message received: " + topic.channelType);
            
        }
    }
    else {
        console.log("message on topic " + topicStr + " is not actionable: ", topic, messageBuf.toString());
    }
})