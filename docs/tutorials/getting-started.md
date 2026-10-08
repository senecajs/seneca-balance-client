# Getting started

In this tutorial you will run two copies of a small service and put one
balance client in front of them, so that the messages a client sends
are shared between the copies. The finished program is
[docs/examples/getting-started.js](../examples/getting-started.js).

You should know how to define an action with `seneca.add` and send a
message with `seneca.post`. The tutorial uses the Seneca 4 prerelease
(`seneca@^4.0.0-rc5`).

## 1. Install

```sh
mkdir greet && cd greet
npm init -y
npm install --legacy-peer-deps seneca@^4.0.0-rc5 seneca-transport @seneca/balance-client
```

* `seneca` is the framework. Seneca 4 core has no network code.
* `seneca-transport` provides the HTTP (`web`) and TCP transports.
* `@seneca/balance-client` is this plugin (see
  [Install](../../README.md#install) about the package name).

`--legacy-peer-deps` is needed while Seneca 4 is a prerelease:
seneca-transport 8.3 declares the peer dependency `seneca >=3`, which npm
does not consider satisfied by `4.0.0-rc5`.

## 2. Write the program

Create `greet.js`:

```js
const Seneca = require('seneca')
const BalanceClient = require('@seneca/balance-client')

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
```

The copy in [docs/examples](../examples/getting-started.js) is the same
program, except that it loads the plugin from the repository with
`require('../..')`.

## 3. Run it

```sh
node greet.js
```

Output (Node.js 24, seneca 4.0.0-rc5):

```
{ hello: 'Ann', port: 8261 }
{ hello: 'Bob', port: 8262 }
{ hello: 'Cid', port: 8261 }
{ hello: 'Dee', port: 8262 }
```

The four messages alternate between the two services, and the program
exits.

## What happened

* `greetService` created two Seneca instances that listen for
  `role:greet,cmd:*` messages over HTTP, on ports 8261 and 8262. They
  reply with the port they run on, so you can see who answered.
* `client({ type: 'balance', pin })` created a *balance client*. Seneca
  asked the plugin, through the action
  `role:transport,hook:client,type:balance`, for a transport client of
  type `balance`. That client does not talk to the network itself.
* The two `client({ type: 'web', port, pin })` calls created ordinary
  HTTP clients. Because their pin is identical to the balance client's
  pin, Seneca handed them to the balance client as its *targets*,
  instead of routing messages to them directly.
* Each `role:greet,cmd:hello` message matched the pin and reached the
  balance client, which used its default model, `consume`: each message
  goes to one target, round-robin, in the order the targets were added.
* At the end the client was closed first, then the services. The
  `stop` helper works around a seneca 4.0.0-rc5 issue: rc5 does not run
  the close hook seneca-transport 8.3 uses to release its listener, so
  a service would keep the process alive. See
  [Shut down cleanly](../how-to/shut-down-cleanly.md).

The pin `role:greet,cmd:hello` is a pattern; any message that matches
it is balanced. Messages for other patterns, such as
`role:greet,cmd:bye`, are not affected by this balance client.

## Next steps

* Run the same idea as separate processes: the README
  [Quick Example](../../README.md#quick-example) uses
  [examples/server.js](../../examples/server.js) and
  [examples/client.js](../../examples/client.js).
* [Add and remove targets at runtime](../how-to/add-and-remove-targets.md)
  while the client keeps running.
* [Choose a balancing model](../how-to/choose-a-balancing-model.md):
  round-robin, send to all, or your own function.
* [How the balance client works](../explanation/how-it-works.md)
  explains why a transport client can have other clients as targets.
