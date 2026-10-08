// How-to: Choose a balancing model (observe).
// Run: node docs/examples/observe-model.js
const Seneca = require('seneca')
const BalanceClient = require('../..') // in your project: require('@seneca/balance-client')

const pin = 'role:greet,cmd:hello'
const handled = { 8261: [], 8262: [] }

function greetService(port) {
  return Seneca({ tag: 'greet-' + port, log: 'warn' })
    .use('seneca-transport')
    .add(pin, function (msg, reply) {
      handled[port].push(msg.name)
      reply({ hello: msg.name, port: port })
    })
    .listen({ type: 'web', port: port, pin: 'role:greet,cmd:*' })
}

async function main() {
  const services = [greetService(8261), greetService(8262)]

  const client = Seneca({ tag: 'client', log: 'warn' })
    // seneca-transport warns about the replies after the first one
    // (unknown_message_id); this option turns the warning off.
    .use('seneca-transport', { warn: { unknown_message_id: false } })
    .use(BalanceClient)

    // observe: every message goes to every target; the first reply is used.
    .client({ type: 'balance', pin, model: 'observe' })
    .client({ type: 'web', port: 8261, pin })
    .client({ type: 'web', port: 8262, pin })

  try {
    for (const instance of [...services, client]) await ready(instance)

    console.log(await client.post(pin, { name: 'Ann' }))
    console.log(await client.post(pin, { name: 'Bob' }))

    // Give the second reply of the last message time to arrive.
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log('handled:', handled)
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
