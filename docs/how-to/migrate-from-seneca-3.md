# Migrate from Seneca 3

How to move code that uses the balance client from Seneca 3 to Seneca 4.
The plugin supports both versions; the changes are in your setup code,
options and tests. The differences are explained in
[Seneca 3 and Seneca 4](../explanation/seneca-3-and-4.md).

## 1. Load a transport plugin

Seneca 4 has no built in network transport. Add seneca-transport to
every process that listens and to every process that has web or tcp
targets:

```sh
npm install --legacy-peer-deps seneca-transport
```

(`--legacy-peer-deps` is needed while Seneca 4 is a prerelease.)

```js
// Seneca 3
require('seneca')()
  .use('balance-client')
  .client({ type: 'balance', pin: 'a:1' })
  .client({ port: 47000, pin: 'a:1' })

// Seneca 4
require('seneca')()
  .use('seneca-transport')
  .use('@seneca/balance-client')
  .client({ type: 'balance', pin: 'a:1' })
  .client({ port: 47000, pin: 'a:1' })
```

The order of the two `use` calls does not matter.

## 2. Remove `legacy: { transport: false }`

Old examples and tests created instances with
`Seneca({ legacy: { transport: false } })`. Seneca 4 accepts only
`legacy: true|false` or the keys `error`, `meta` and `builtin_actions`;
anything else fails option validation. Delete the option.

## 3. Check the plugin options

* Seneca 4 rejects unknown option keys with `invalid_plugin_option`.
  The options are `model`, `balance` and `debug.client_updates`
  (see [Options](../reference/options.md)).
* The plugin option `model` is now applied as the default model of
  every balance client. Earlier versions documented it but did not read
  it, so an instance that set `model: 'observe'` at plugin level and
  relied on round-robin must remove the option. `model` takes a model
  name; to make a model function the default, use
  `balance: { model: fn }`.
* `balance` (defaults merged into every balance client configuration)
  works as before.
* Options set in the instance options belong under
  `plugin.balance_client`, on both versions:

```js
Seneca({ plugin: { balance_client: { debug: { client_updates: true } } } })
```

## 4. Use the new package name

Versions up to 1.2.0 were published as `seneca-balance-client`; from
the next version the package is `@seneca/balance-client`:

```js
seneca.use('@seneca/balance-client')
```

`seneca.use('balance-client')` keeps working where the old package is
installed. The plugin registers as `balance_client` either way.

## 5. Check `override` with more specific local actions

On Seneca 3 with its default (legacy) transport, a balance client created
with `override: true` cannot serve wrapped local actions that are more
specific than its pin (they fail with `no-target`). On Seneca 4 they are
balanced. See [Override local actions](override-local-actions.md).

## 6. Shutdown

Nothing to change in your code: `seneca.close()` runs the plugin's close
step on both versions. Two known issues of the current prerelease
combination are described in [Shut down cleanly](shut-down-cleanly.md):
services on 4.0.0-rc5 keep listening after `close()`, and catch-all
clients on 4.0.0 forward the close message.

## 7. Tests

* Load `seneca-transport` in every test instance that listens or has
  web or tcp targets, and give every listener its own port.
* Close every instance, clients before services.
* Errors keep their codes: `err.code` is `no-target` or
  `no-current-target` on both versions.

## Other Seneca 4 changes

Seneca's own guide,
[Migrate from Seneca 3](https://github.com/senecajs/seneca/blob/master/docs/how-to/migrate-from-seneca-3.md),
covers the changes that are not specific to this plugin: promises built
in, Gubu validation, the `sys:seneca` builtin actions, Node.js 22 or
later.
