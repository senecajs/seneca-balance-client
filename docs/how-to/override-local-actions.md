# Override local actions

How to balance messages for patterns that also have a local
implementation. The complete program is
[docs/examples/override-local-actions.js](../examples/override-local-actions.js).

## 1. See that local actions win by default

A balance client for `role:greet,cmd:hello` does not capture messages
that match a more specific local action such as
`role:greet,cmd:hello,lang:en`; Seneca routes them to the local action.

```js
const client = Seneca({ tag: 'client', log: 'warn' })
  .use('seneca-transport')
  .use(BalanceClient)

  // A local action, more specific than the pin.
  .add('role:greet,cmd:hello,lang:en', function (msg, reply) {
    reply({ hello: msg.name, local: true })
  })
```

## 2. Create the balance client with `override: true`

`override: true` wraps the existing local actions that match the pin.
Their messages then go through the balance client, and the local action
is not called:

```js
client
  .client({ type: 'balance', pin, override: true })
  .client({ type: 'web', port: 8261, pin })
```

Only actions that exist when the balance client is created are wrapped,
so create it after the local actions.

## Result

Running `node docs/examples/override-local-actions.js` prints:

```
{ hello: 'Ann', local: true }
{ hello: 'Bob', port: 8261 }
{ hello: 'Cid', port: 8261 }
```

Ann was greeted locally, before the balance client existed. Bob's
message matches the wrapped local pattern and was balanced to the
service; Cid's message matches the pin directly.

## How the targets are found

For a wrapped action, the balance client looks up its targets by the pin
(the message meta data `client_pattern`) rather than by the more
specific pattern of the message, so the targets registered for
`role:greet,cmd:hello` serve the `lang:en` messages too. On Seneca 3
with the default legacy transport, the plugin uses seneca-transport's
older client builder, which looks up targets by the message pattern
only; overridden messages then fail with `no-target`.

## When to use it

seneca-mesh passes `override` to the balance clients it creates only
when its own `override` option allows it for the pin, because a local
action that is also exposed to the network, overridden on several
instances, can send a message back and forth between them. Apply the
same care in your own services.
