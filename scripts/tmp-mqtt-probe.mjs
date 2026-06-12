// One-off diagnostic: subscribe to zigbee2mqtt topics on pi-ven's broker and
// report what arrives (retained bridge state + any live plug messages) in 12s.
import mqtt from 'mqtt'

const client = mqtt.connect('mqtt://100.110.220.21:1883', { connectTimeout: 8000 })
const seen = []

client.on('connect', () => {
  console.log('CONNECTED to broker')
  client.subscribe(['zigbee2mqtt/bridge/state', 'zigbee2mqtt/plug_1', 'zigbee2mqtt/bridge/info'])
})
client.on('message', (topic, payload) => {
  const text = payload.toString()
  seen.push(topic)
  console.log(`[${topic}] ${text.length > 300 ? text.slice(0, 300) + '…' : text}`)
})
client.on('error', (e) => { console.log('ERROR:', e.message); process.exit(1) })

setTimeout(() => {
  if (!seen.length) console.log('No messages received in 12s (no retained bridge state -> z2m likely never connected since broker start, or topics differ)')
  client.end()
  process.exit(0)
}, 12000)
