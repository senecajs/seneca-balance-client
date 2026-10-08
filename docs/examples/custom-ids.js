// How-to: Use custom ids. Run: node docs/examples/custom-ids.js
const Seneca = require('seneca')
const BalanceClient = require('../..') // in your project: require('@seneca/balance-client')

const pin = 'role:greet,cmd:hello'

function greetService(port) {
  return Seneca({ tag: 'greet-' + port, log: 'warn' })
    .use('seneca-transport')
    .add(pin, function (msg, reply) {
      reply({ hello: msg.name, port: port })
    })
    .listen({ type: 'web', port: port, pin: 'role:greet,cmd:*' })
}

async function main() {
  const services = [greetService(8261), greetService(8262)]

  const client = Seneca({ tag: 'client', log: 'warn' })
    .use('seneca-transport')
    .use(BalanceClient)
    .client({ type: 'balance', pin })

  try {
    for (const instance of [...services, client]) await ready(instance)

    // Name each target: the id replaces the one derived from the configuration.
    await client.post('role:transport,type:balance,add:client', {
      config: { id: 'greet-a', type: 'web', port: 8261, pin },
    })
    await client.post('role:transport,type:balance,add:client', {
      config: { id: 'greet-b', type: 'web', port: 8262, pin },
    })
    console.log('targets:', await targetIds(client))

    console.log(await client.post(pin, { name: 'Ann' }))
    console.log(await client.post(pin, { name: 'Bob' }))

    // Remove by id: the network location is not needed.
    await client.post('role:transport,type:balance,remove:client', {
      config: { id: 'greet-b', pin },
    })
    console.log('targets:', await targetIds(client))

    console.log(await client.post(pin, { name: 'Cid' }))
    console.log(await client.post(pin, { name: 'Dee' }))
  } finally {
    await client.close()
    for (const service of services) await stop(service)
  }
}

async function targetIds(client) {
  const pg = client.util.pincanon(pin)
  const group = await client.post('role:transport,type:balance,get:target-map', { pg })
  return group[pg].targets.map((target) => target.id)
}

function ready(instance) {
  return new Promise((resolve) => instance.ready(resolve))
}

// seneca-transport 8.3 closes its listener in a role:seneca,cmd:close hook.
// Seneca 4.0.0 runs that hook in close(); 4.0.0-rc5 does not, so run it here.
async function stop(service) {
  if (service.version.startsWith('4.0.0-rc')) {
    await service.post('role:seneca,cmd:close')
  }
  await service.close()
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
