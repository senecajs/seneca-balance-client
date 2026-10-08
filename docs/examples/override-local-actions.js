// How-to: Override local actions. Run: node docs/examples/override-local-actions.js
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
  const services = [greetService(8261)]

  const client = Seneca({ tag: 'client', log: 'warn' })
    .use('seneca-transport')
    .use(BalanceClient)

    // A local action, more specific than the pin.
    .add('role:greet,cmd:hello,lang:en', function (msg, reply) {
      reply({ hello: msg.name, local: true })
    })

  try {
    for (const instance of [...services, client]) await ready(instance)

    // Without a balance client, lang:en messages are handled locally.
    console.log(await client.post(pin, { name: 'Ann', lang: 'en' }))

    // override:true wraps the existing local actions that match the pin,
    // so that their messages are balanced too.
    client
      .client({ type: 'balance', pin, override: true })
      .client({ type: 'web', port: 8261, pin })
    await ready(client)

    console.log(await client.post(pin, { name: 'Bob', lang: 'en' }))
    console.log(await client.post(pin, { name: 'Cid' }))
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
