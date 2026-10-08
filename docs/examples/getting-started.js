// Tutorial: Getting started. Run: node docs/examples/getting-started.js
const Seneca = require('seneca')
const BalanceClient = require('../..') // in your project: require('@seneca/balance-client')

// A greeting service. In production each copy runs in its own process;
// here two copies run in this process so that the example is self-contained.
function greetService(port) {
  return Seneca({ tag: 'greet-' + port, log: 'warn' })
    .use('seneca-transport')
    .add('role:greet,cmd:hello', function (msg, reply) {
      reply({ hello: msg.name, port: port })
    })
    .listen({ type: 'web', port: port, pin: 'role:greet,cmd:*' })
}

async function main() {
  const services = [greetService(8261), greetService(8262)]

  const client = Seneca({ tag: 'client', log: 'warn' })
    .use('seneca-transport')
    .use(BalanceClient)

    // The balance client handles the pin; it has no address of its own.
    .client({ type: 'balance', pin: 'role:greet,cmd:hello' })

    // Clients with the same pin become the targets of the balance client.
    .client({ type: 'web', port: 8261, pin: 'role:greet,cmd:hello' })
    .client({ type: 'web', port: 8262, pin: 'role:greet,cmd:hello' })

  try {
    for (const instance of [...services, client]) await ready(instance)

    for (const name of ['Ann', 'Bob', 'Cid', 'Dee']) {
      console.log(await client.post('role:greet,cmd:hello', { name }))
    }
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
