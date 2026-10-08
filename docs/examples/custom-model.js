// How-to: Choose a balancing model (custom function).
// Run: node docs/examples/custom-model.js
const Seneca = require('seneca')
const BalanceClient = require('../..') // in your project: require('@seneca/balance-client')

const pin = 'role:greet,cmd:hello'

// A model is a function (seneca, msg, targetstate, done, meta).
// This one tries the targets in order until one replies without an error.
function failover(seneca, msg, targetstate, done, meta) {
  const targets = targetstate.targets
  let index = 0

  if (0 === targets.length) {
    return done(new Error('No targets are currently active'))
  }

  attempt()

  function attempt() {
    const target = targets[index]
    target.action.call(
      seneca,
      msg,
      function (err, out) {
        if (err && ++index < targets.length) {
          console.log('target ' + target.id + ' failed: ' + err.code + '; trying the next one')
          return attempt()
        }
        done(err, out)
      },
      meta
    )
  }
}

function greetService(port) {
  return Seneca({ tag: 'greet-' + port, log: 'warn' })
    .use('seneca-transport')
    .add(pin, function (msg, reply) {
      reply({ hello: msg.name, port: port })
    })
    .listen({ type: 'web', port: port, pin: 'role:greet,cmd:*' })
}

async function main() {
  // Only one service runs; nothing listens on port 8269.
  const services = [greetService(8261)]

  const client = Seneca({ tag: 'client', log: 'warn' })
    .use('seneca-transport')
    .use(BalanceClient)
    .client({ type: 'balance', pin, model: failover })
    .client({ id: 'down', type: 'web', port: 8269, pin })
    .client({ id: 'up', type: 'web', port: 8261, pin })

  try {
    for (const instance of [...services, client]) await ready(instance)

    console.log(await client.post(pin, { name: 'Ann' }))
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
