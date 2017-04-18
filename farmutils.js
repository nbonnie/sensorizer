var parseTopic = function(topic) {
    var splitTopic = topic.split("/");

    var result =  
        { 
            channelType: splitTopic[0],
            deviceType:  splitTopic[1],
            farmId:      splitTopic[2],
            zoneId:      splitTopic[3],
            shelfId:     splitTopic[4],
            trayId:      splitTopic[5],
            position:    splitTopic[6],
            deviceId:    splitTopic[7]
        };

    return result;
}

module.exports.parseTopic = parseTopic;