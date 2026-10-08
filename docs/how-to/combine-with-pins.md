# Combine with pins

How to decide which messages are balanced, and over which targets, with
pins. The complete program is [docs/examples/pins.js](../examples/pins.js).

## 1. One balance client per pin

A balance client handles exactly the patterns of its pin, and its
targets must repeat that pin. Patterns that should always go to one
place use an ordinary client:

```js
const client = Seneca({ tag: 'client', log: 'warn' })
  .use('seneca-transport')
  .use(BalanceClient)

  // hello is balanced over both services ...
  .client({ type: 'balance', pin: 'role:greet,cmd:hello' })
  .client({ type: 'web', port: 8261, pin: 'role:greet,cmd:hello' })
  .client({ type: 'web', port: 8262, pin: 'role:greet,cmd:hello' })

  // ... bye always goes to the second one: an ordinary client.
  .client({ type: 'web', port: 8262, pin: 'role:greet,cmd:bye' })
```

Running `node docs/examples/pins.js` prints:

```
{ hello: 'Ann', port: 8261 }
{ hello: 'Bob', port: 8262 }
{ bye: 'Ann', port: 8262 }
{ bye: 'Bob', port: 8262 }
pin groups: [ 'cmd:hello,role:greet' ]
```

The target map has one pin group, for the balanced pin, under its
canonical form (`seneca.util.pincanon` sorts the keys of a pattern).

## 2. Repeat the pin exactly

The balance client finds its targets by the canonical form of the pin.
A client whose pin differs, even a more specific one, is not a target:
Seneca routes it as a client of its own, and the messages it matches
bypass the balancer. For example, with a balance client for
`role:greet,cmd:*`, a client for `role:greet,cmd:hello` receives every
`cmd:hello` message itself, and only the other commands are balanced.

## 3. Several patterns in one balance client

Pass an array as `pins` to create one balance client for several
patterns. The targets must use the same array:

```js
const pins = ['role:greet,cmd:hello', 'role:greet,cmd:bye']

seneca
  .client({ type: 'balance', pins })
  .client({ type: 'web', port: 8261, pins })
  .client({ type: 'web', port: 8262, pins })
```

The pin group is `cmd:bye,role:greet;cmd:hello,role:greet`: the
canonical patterns, sorted and joined with `;`. Each pattern keeps its
own target list and round-robin position; a target added with the
`pins` array is added to every list, and `remove:client` with the same
`pins` removes it from every list.

## 4. Glob pins

A pin may contain globs, for example `role:greet,cmd:*`. Messages for
any `cmd` match it and are balanced over the targets registered with
that pin. Local actions for more specific patterns still take
precedence over the pin, unless the balance client is created with
`override: true` (see [Override local actions](override-local-actions.md)).

## 5. No pin: a catch-all balance client

A balance client without `pin` handles every message that has no local
action, and its targets are clients without `pin`:

```js
seneca
  .client({ type: 'balance' })
  .client({ type: 'web', port: 8261 })
  .client({ type: 'web', port: 8262 })
```

The pin group and the pattern of this client are the empty string. With
seneca 4.0.0 and seneca-transport 8.3, closing an instance that has
catch-all clients sends a close message to a remote service; see
[Shut down cleanly](shut-down-cleanly.md#catch-all-clients-on-seneca-400).
