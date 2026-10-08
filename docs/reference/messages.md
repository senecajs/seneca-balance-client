# Actions reference

Every action pattern the plugin adds, with parameters and replies. The
plugin has no exports, decorations or command line flags.

## `role:transport,hook:client,type:balance`

The transport hook. Seneca core calls it, through
`role:transport,cmd:client`, for every `seneca.client` configuration
whose `type` is `balance`. You do not call it yourself.

| Parameter | Meaning |
| --------- | ------- |
| the client configuration | `pin` or `pins`, `model`, the pin group `pg` computed by core, and `makehandle` (see [Options set by the plugin](options.md#options-set-by-the-plugin)). |

Reply: a transport client object `{ config, send }`. The `send` function
looks up the targets registered for the message's pattern (the pin, for
messages of wrapped local actions) and hands the message to the model.
When no target has ever been registered for the pattern, it replies with
the error [`no-target`](errors.md).

On Seneca 3, when seneca-transport is loaded (the default in 3.x), the
hook builds the client with seneca-transport's older `make_client`
instead. Messages are balanced the same way, except that wrapped local
actions more specific than the pin fail with `no-target`.

## `role:transport,type:balance,add:client`

Add a target at runtime.

| Parameter | Type | Meaning |
| --------- | ---- | ------- |
| `config` | object | A client configuration: the transport `type` and its network keys (`port`, `host`, ...), the `pin` or `pins` of the balance client, and an optional `id`. |

Effect: sets `config.pg` (the pin group, from `pin` or `pins`) when it
is missing, then calls `seneca.client(config)`. When a balance client
with the same pin group exists, the new client becomes one of its
targets; otherwise it is an ordinary client. Messages sent after the
reply can use the new target. A target whose id is already present is
not added twice.

Reply: none (`null` with `seneca.post`).

## `role:transport,type:balance,remove:client`

Remove a target.

| Parameter | Type | Meaning |
| --------- | ---- | ------- |
| `config` | object | `pin` or `pins` of the balance client, and either `id` or the same keys and values that were used to add the target (see [Target configuration](options.md#target-configuration)). |

Effect: for each pattern, the target with the matching id is removed
from the list and the round-robin position is reset to 0. Nothing
happens when no target matches. The target's transport client is not
closed; it stays registered on the instance but receives no more
messages from the balance client.

Reply: none (`null` with `seneca.post`).

## `role:transport,type:balance,get:target-map`

Inspect the targets of this instance.

| Parameter | Type | Meaning |
| --------- | ---- | ------- |
| `pg` | string, optional | A pin group in canonical form: `seneca.util.pincanon(pin)`, which sorts the keys of each pattern and joins several patterns, sorted, with `;`. For the pin `role:greet,cmd:hello` it is `cmd:hello,role:greet`. |

Reply without `pg`: the map of all pin groups of the instance (an empty
object before the first balance client is created):

```js
{
  id: '<seneca instance id>',
  'cmd:hello,role:greet': {               // one entry per pin group
    pg: 'cmd:hello,role:greet',
    id: 0.73,                             // random, internal
    'cmd:hello,role:greet': {             // one entry per pattern of the group
      index: 1,                           // next round-robin position
      targets: [
        { action: [Function], id: 'pg:cmd:hello,role:greet,pin:role:greet,cmd:hello,port:8261,type:web', config: { ... } },
        { action: [Function], id: 'pg:cmd:hello,role:greet,pin:role:greet,cmd:hello,port:8262,type:web', config: { ... } },
      ],
    },
  },
}
```

Reply with `pg`: the entry for that pin group, or `null` when the group
is unknown. Each target holds the `action` function that sends to it and
its `id`; its `config` is the configuration of the *balance client*
(the same object for every target of the group), not of the target.
Treat the reply as read only.

## Close hook

The plugin adds a prior to the close action, `sys:seneca,cmd:close` on
Seneca 4 and `role:seneca,cmd:close` on Seneca 3. It drops the target
map and the options of the instance, then continues the close chain.
See [Shut down cleanly](../how-to/shut-down-cleanly.md).
