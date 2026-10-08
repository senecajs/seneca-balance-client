// How-to: Add and remove targets at runtime.
// Run: node docs/examples/add-remove-targets.js
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

  // A balance client without targets.
  const client = Seneca({ tag: 'client', log: 'warn' })
    .use('seneca-transport')
    .use(BalanceClient)
    .client({ type: 'balance', pin })

  try {
    for (const instance of [...services, client]) await ready(instance)

    // Add the first target.
    await client.post('role:transport,type:balance,add:client', {
      config: { type: 'web', port: 8261, pin },
    })
    console.log(await client.post(pin, { name: 'Ann' }))
    console.log(await client.post(pin, { name: 'Bob' }))

    // Add a second target: messages alternate between the two.
    await client.post('role:transport,type:balance,add:client', {
      config: { type: 'web', port: 8262, pin },
    })
    console.log(await client.post(pin, { name: 'Cid' }))
    console.log(await client.post(pin, { name: 'Dee' }))

    // List the targets. The map is keyed by canonical pin (sorted keys).
    const pg = client.util.pincanon(pin)
    const group = await client.post('role:transport,type:balance,get:target-map', { pg })
    console.log('targets:', group[pg].targets.map((target) => target.id))

    // Remove the second target, with the same configuration used to add it.
    await client.post('role:transport,type:balance,remove:client', {
      config: { type: 'web', port: 8262, pin },
    })
    console.log(await client.post(pin, { name: 'Eve' }))
    console.log(await client.post(pin, { name: 'Fay' }))
  } finally {
    await client.close()
    for (const service of services) await stop(service)
  }
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
