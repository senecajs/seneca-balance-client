# Add and remove targets at runtime

How to change the set of services behind a balance client while it
keeps running, for example when service instances start and stop. The
complete program is
[docs/examples/add-remove-targets.js](../examples/add-remove-targets.js).

## 1. Create the balance client

```js
const pin = 'role:greet,cmd:hello'

const client = Seneca({ tag: 'client', log: 'warn' })
  .use('seneca-transport')
  .use('@seneca/balance-client')
  .client({ type: 'balance', pin })
```

Until a target is added, a message for the pin fails with the error
code [`no-target`](../reference/errors.md).

## 2. Add a target

```js
await client.post('role:transport,type:balance,add:client', {
  config: { type: 'web', port: 8261, pin },
})
```

`config` is an ordinary client configuration for the target's transport,
with the same `pin` as the balance client. The action calls
`seneca.client(config)`, so `client.client(config)` has the same effect;
the action is convenient when the change arrives as a message, for
example from a discovery service.

## 3. Add more targets

```js
await client.post('role:transport,type:balance,add:client', {
  config: { type: 'web', port: 8262, pin },
})
```

New targets are appended to the list. The round-robin continues from
its current position, so the next message may go to either target.

## 4. List the targets

```js
const pg = client.util.pincanon(pin) // 'cmd:hello,role:greet'
const group = await client.post('role:transport,type:balance,get:target-map', { pg })
console.log(group[pg].targets.map((target) => target.id))
```

The target map is keyed by the canonical form of the pin, with the keys
of each pattern sorted. See
[`get:target-map`](../reference/messages.md#roletransporttypebalancegettarget-map).

## 5. Remove a target

```js
await client.post('role:transport,type:balance,remove:client', {
  config: { type: 'web', port: 8262, pin },
})
```

Pass the same keys and values that were used to add the target: the
target's default id is derived from them. To remove targets by a name
instead, give them an `id` (see [Use custom ids](use-custom-ids.md)).
Removing a target that is not in the list does nothing.

## Result

Running `node docs/examples/add-remove-targets.js` prints:

```
{ hello: 'Ann', port: 8261 }
{ hello: 'Bob', port: 8261 }
{ hello: 'Cid', port: 8261 }
{ hello: 'Dee', port: 8262 }
targets: [
  'pg:cmd:hello,role:greet,pin:role:greet,cmd:hello,port:8261,type:web',
  'pg:cmd:hello,role:greet,pin:role:greet,cmd:hello,port:8262,type:web'
]
{ hello: 'Eve', port: 8261 }
{ hello: 'Fay', port: 8261 }
```

Ann and Bob were sent while there was one target. Cid went to the first
target because the round-robin position was back at the start when the
second target was appended; Dee went to the second. After the second
target was removed (which also resets the position), Eve and Fay went
to the first.

## Notes

* Adding a target whose id is already in the list has no effect, even
  if its address differs.
* Removing a target does not close its transport client; it stays
  registered on the instance but receives no more messages.
* When every target has been removed, messages for the pin fail with
  [`no-current-target`](../reference/errors.md).
* seneca-mesh calls these actions for you as services join and leave
  the network, see
  [How the balance client works](../explanation/how-it-works.md#runtime-changes-and-seneca-mesh).
