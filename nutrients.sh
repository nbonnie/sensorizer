# Use nutrients.json for simulator configuration
export NODE_ENV="nutrients"

export NODE_CONFIG='{"deviceProperties": {"deviceId": "FE380020"}}'
#nodejs devicesimulator.js
nodejs devicesimulator.js &

export NODE_CONFIG='{"deviceProperties": {"deviceId": "FE380021"}}'
nodejs devicesimulator.js &
