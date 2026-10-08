# Options reference

Plugin options are passed to `use`, or set under `plugin.balance_client`
in the instance options. The plugin registers as `balance_client`, the
name of its definition function, whatever name it is loaded by.

```js
seneca.use('@seneca/balance-client', { model: 'observe' })

// equivalent
Seneca({ plugin: { balance_client: { model: 'observe' } } })
  .use('@seneca/balance-client')
```

Seneca 4 validates the options against the defaults: an unknown key,
or a value of the wrong type, fails plugin loading with the error code
`invalid_plugin_option`. Seneca 3.38 does not reject unknown keys.

## Plugin options

| Option | Type | Default | Effect |
| ------ | ---- | ------- | ------ |
| `model` | string | `'consume'` | Default model of every balance client of the instance: `'consume'` (round-robin) or `'observe'` (send to all targets), or their older aliases `'actor'` (consume) and `'publish'` (observe). Any other name selects `consume`. Must be a name; for a model function use `balance.model`. See [Models](models.md). |
| `balance` | object | `{}` | Defaults merged into every balance client configuration; keys given to `seneca.client()` take precedence. The plugin reads `model` from the merged configuration, so `balance: { model }` sets a default model, which may be a function. |
| `debug.client_updates` | boolean | `false` | Log every target added to or removed from a balance client, at level `info`. |

The model of a balance client is the first one set of: `model` in the
client configuration, the plugin option `balance.model`, the plugin
option `model`.

With `debug.client_updates`, each change produces one log entry whose
`data` is `['add', pattern, target_id, added]` or
`['remove', pattern, target_id, found]`. `added` is `false` when a
target with that id was already present; `found` is `false` when no
target matched. For example:

```
{"data":["add","a:1","pg:a:1,pin:a:1,port:47610",true],"level":300,"level_name":"info",...}
```

## Options set by the plugin

The plugin's `preload` sets the instance option
`transport.balance.makehandle`, a function. Seneca core copies the
`transport.<type>` section of the instance options into every client
configuration of that type, and calls `makehandle(config)` for each
balance client to create the handle that collects its targets (see
[How the balance client works](../explanation/how-it-works.md#a-client-of-clients)).
Do not set this option yourself.

## Balance client configuration

A balance client is created with `seneca.client`. The plugin reads these
keys; network keys such as `port` and `host` have no meaning for a
balance client, which has no address of its own.

| Key | Meaning |
| --- | ------- |
| `type` | Must be `'balance'`. |
| `pin`, `pins` | The pattern, or the array of patterns, that this client handles. Omit both for a catch-all client (the empty pattern). The canonical form of the patterns is the client's *pin group*. |
| `model` | The model of this client: a name, as for the plugin option, or a model function. Overrides the plugin options. |
| `override` | A Seneca core option. When `true`, existing local actions that match the pin are wrapped, so that their messages are balanced too. See [Override local actions](../how-to/override-local-actions.md). |

## Target configuration

A target is an ordinary transport client, for example `type: 'web'` or
`type: 'tcp'` from seneca-transport, created with `seneca.client` or with
the [`add:client`](messages.md#roletransporttypebalanceaddclient) action.
Two keys matter to the balance client:

| Key | Meaning |
| --- | ------- |
| `pin`, `pins` | Must be identical to the balance client's `pin` or `pins`. A client with different patterns is not a target; it is routed as a client of its own. |
| `id` | Identifies the target, for `remove:client` and in the target map. Default: the canonical pattern of the configuration as given, including the pin group `pg` that core adds, for example `pg:cmd:hello,role:greet,pin:role:greet,cmd:hello,port:8262,type:web`. Arrays such as `pins` are not part of it. A target whose id is already present is not added again. |

Because the default `id` is built from the keys you pass, a
`remove:client` call without an explicit `id` must repeat the same keys
and values that were used to add the target.
