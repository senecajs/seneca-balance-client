# Use custom ids

How to name targets so that you can remove them without repeating their
whole configuration. The complete program is
[docs/examples/custom-ids.js](../examples/custom-ids.js).

## 1. Give each target an `id`

```js
await client.post('role:transport,type:balance,add:client', {
  config: { id: 'greet-a', type: 'web', port: 8261, pin },
})
await client.post('role:transport,type:balance,add:client', {
  config: { id: 'greet-b', type: 'web', port: 8262, pin },
})
```

The `id` replaces the id Seneca would derive from the configuration.
It works the same with `seneca.client({ id, ... })`.

## 2. Remove a target by id

```js
await client.post('role:transport,type:balance,remove:client', {
  config: { id: 'greet-b', pin },
})
```

Only the `id` and the `pin` (or `pins`) of the balance client are
needed; the network location is not.

## Result

Running `node docs/examples/custom-ids.js` prints:

```
targets: [ 'greet-a', 'greet-b' ]
{ hello: 'Ann', port: 8261 }
{ hello: 'Bob', port: 8262 }
targets: [ 'greet-a' ]
{ hello: 'Cid', port: 8261 }
{ hello: 'Dee', port: 8261 }
```

## Notes

* Ids must be unique within a balance client: a target whose id is
  already in the list is not added, even if its address differs.
* Without an `id`, the default is the canonical form of the
  configuration as given, for example
  `pg:cmd:hello,role:greet,pin:role:greet,cmd:hello,port:8262,type:web`
  (see [Target configuration](../reference/options.md#target-configuration)).
  Removing such a target requires exactly the same keys and values.
* seneca-mesh gives every target an id made of the pin and the remote
  service's identifier, which is how it removes the right target when
  a service leaves.
