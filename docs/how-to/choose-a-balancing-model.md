# Choose a balancing model

How to decide which targets receive a message. The models are specified
in the [Models reference](../reference/models.md).

| You want | Model |
| -------- | ----- |
| Each message handled once, load spread over the targets | `consume` (the default) |
| Every target to see every message | `observe` |
| Something else: failover, weights, sticky routing | a model function |

## 1. Set the model of one balance client

```js
seneca.client({ type: 'balance', pin: 'role:greet,cmd:hello', model: 'observe' })
```

## 2. Or set a default for every balance client of the instance

```js
seneca.use('@seneca/balance-client', { model: 'observe' })
```

The plugin option `model` takes a model name. To make a model function
the default, put it in the `balance` option, whose keys are merged into
every balance client configuration:

```js
seneca.use('@seneca/balance-client', { balance: { model: failover } })
```

A `model` in the client configuration takes precedence over
`balance.model`, which takes precedence over the plugin option `model`
(see [Options](../reference/options.md)).

## consume: round-robin

Nothing to configure. The tutorial
[Getting started](../tutorials/getting-started.md) shows four messages
alternating between two services.

A target that fails is not skipped: the caller gets the error (for
example `ECONNREFUSED` when the service is down) and the next message
goes to the next target.

## observe: send to all

The program is
[docs/examples/observe-model.js](../examples/observe-model.js). The
services record the names they receive:

```js
const client = Seneca({ tag: 'client', log: 'warn' })
  .use('seneca-transport', { warn: { unknown_message_id: false } })
  .use(BalanceClient)
  .client({ type: 'balance', pin, model: 'observe' })
  .client({ type: 'web', port: 8261, pin })
  .client({ type: 'web', port: 8262, pin })
```

Output:

```
{ hello: 'Ann', port: 8261 }
{ hello: 'Bob', port: 8261 }
handled: { '8261': [ 'Ann', 'Bob' ], '8262': [ 'Ann', 'Bob' ] }
```

Both services handled both messages; the caller got the first reply
each time. The replies after the first are dropped, and seneca-transport
logs each of them as an `unknown_message_id` warning; the
`warn: { unknown_message_id: false }` option of seneca-transport turns
those warnings off.

Use `observe` for notifications, cache invalidation and other messages
where every service must act and the reply does not matter much.

## A model function: failover

A model is a function `(seneca, msg, targetstate, done, meta)`. The
program [docs/examples/custom-model.js](../examples/custom-model.js)
tries the targets in order until one replies without an error:

```js
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

seneca
  .client({ type: 'balance', pin, model: failover })
  .client({ id: 'down', type: 'web', port: 8269, pin }) // nothing listens here
  .client({ id: 'up', type: 'web', port: 8261, pin })
```

Output:

```
target down failed: ECONNREFUSED; trying the next one
{ hello: 'Ann', port: 8261 }
```

Call `done` exactly once. `targetstate.index` is yours to use; the
`consume` model keeps its position there.
