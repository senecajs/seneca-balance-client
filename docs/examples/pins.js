// How-to: Combine with pins. Run: node docs/examples/pins.js
const Seneca = require('seneca')
const BalanceClient = require('../..') // in your project: require('@seneca/balance-client')

function greetService(port) {
  return Seneca({ tag: 'greet-' + port, log: 'warn' })
    .use('seneca-transport')
    .add('role:greet,cmd:hello', function (msg, reply) {
      reply({ hello: msg.name, port: port })
    })
    .add('role:greet,cmd:bye', function (msg, reply) {
      reply({ bye: msg.name, port: port })
    })
    .listen({ type: 'web', port: port, pin: 'role:greet,cmd:*' })
}

async function main() {
  const services = [greetService(8261), greetService(8262)]

  const client = Seneca({ tag: 'client', log: 'warn' })
    .use('seneca-transport')
    .use(BalanceClient)

    // hello is balanced over both services ...
    .client({ type: 'balance', pin: 'role:greet,cmd:hello' })
    .client({ type: 'web', port: 8261, pin: 'role:greet,cmd:hello' })
    .client({ type: 'web', port: 8262, pin: 'role:greet,cmd:hello' })

    // ... bye always goes to the second one: an ordinary client.
    .client({ type: 'web', port: 8262, pin: 'role:greet,cmd:bye' })

  try {
    for (const instance of [...services, client]) await ready(instance)

    console.log(await client.post('role:greet,cmd:hello', { name: 'Ann' }))
    console.log(await client.post('role:greet,cmd:hello', { name: 'Bob' }))
    console.log(await client.post('role:greet,cmd:bye', { name: 'Ann' }))
    console.log(await client.post('role:greet,cmd:bye', { name: 'Bob' }))

    // Only the balanced pin has a pin group in the target map.
    const map = await client.post('role:transport,type:balance,get:target-map')
    console.log('pin groups:', Object.keys(map).filter((key) => 'id' !== key))
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
