![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js](http://senecajs.org) plugin

# @seneca/balance-client

[![npm version](https://img.shields.io/npm/v/seneca-balance-client.svg)](https://npmjs.com/package/seneca-balance-client)
[![build](https://github.com/senecajs/seneca-balance-client/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-balance-client/actions/workflows/build.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/senecajs/seneca-balance-client/badge.svg)](https://snyk.io/test/github/senecajs/seneca-balance-client)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

A Seneca transport plugin for client side load balancing. A balance
client sits in front of several ordinary transport clients that share
its pin and spreads the matching messages over them, round-robin, to
all of them, or with your own model function; targets can be added and
removed while the client runs. It works with Seneca 3 and Seneca 4
(tested with 3.38, 4.0.0-rc5 and the unreleased 4.0.0) on Node.js 18 or
later, and is the balancer that seneca-mesh uses.

## Install

```sh
npm install --legacy-peer-deps seneca@^4.0.0-rc5 seneca-transport @seneca/balance-client
```

Seneca 4 has no built in network transport, so the targets need
seneca-transport (or another transport plugin). `--legacy-peer-deps` is
needed while Seneca 4 is a prerelease: seneca-transport 8.3 declares the
peer dependency `seneca >=3`, which excludes `4.0.0-rc5`. Seneca 3
bundles seneca-transport:

```sh
npm install seneca @seneca/balance-client
```

Versions up to 1.2.0 were published as `seneca-balance-client`; from the
next version the package is `@seneca/balance-client`.

```js
const Seneca = require('seneca')

const seneca = Seneca()
  .use('seneca-transport') // Seneca 4
  .use('@seneca/balance-client', { model: 'consume' })
```

## Quick Example

Two copies of a server, and a client that balances over them. The files
are in [examples/](examples/).

### examples/server.js

```js
// Run twice, on two ports, in two terminals:
// $ node examples/server.js 47000
// $ node examples/server.js 47001
// Seneca 4 does not bundle a network transport, so load seneca-transport.
// Stop with Ctrl-C.

var port = parseInt(process.argv[2], 10)

require('seneca')({ log: 'warn' })
  .use('seneca-transport')
  .add('a:1', function (msg, done) {
    done(null, { a: 1, x: msg.x, port: port })
  })
  .listen({ port: port })
  .ready(function () {
    console.log('listening on port ' + port)
  })
```

### examples/client.js

```js
// Start the two servers first (see server.js), then:
// $ node examples/client.js
// The four messages are shared between the two servers, round-robin.

require('seneca')({ log: 'warn' })
  .use('seneca-transport')
  .use(require('..')) // in your project: .use('@seneca/balance-client')

  .client({ type: 'balance', pin: 'a:1' })
  .client({ port: 47000, pin: 'a:1' })
  .client({ port: 47001, pin: 'a:1' })

  .ready(function () {
    var seneca = this
    var count = 0

    for (var i = 0; i < 4; i++) {
      seneca.act('a:1', { x: i }, function (err, out) {
        console.log(err ? err.message : out)

        // Close after the last reply, whether it was a result or an error.
        if (4 === ++count) seneca.close()
      })
    }
  })
```

Run `node examples/server.js 47000` and `node examples/server.js 47001`
in two terminals (each prints `listening on port ...`), then
`node examples/client.js` in a third. Output (Node.js 24, seneca
4.0.0-rc5):

```
{ a: 1, x: 1, port: 47001 }
{ a: 1, x: 3, port: 47001 }
{ a: 1, x: 0, port: 47000 }
{ a: 1, x: 2, port: 47000 }
```

Messages 0 and 2 went to port 47000, messages 1 and 3 to port 47001.
The four messages are sent at once, so the replies can arrive in any
order. The `balance` client has no address of its own: the two clients
with the same pin are its targets.

## More Examples

* Tutorial: [Getting started](docs/tutorials/getting-started.md), two
  services behind one balance client in a single program.
* [Add and remove targets at runtime](docs/how-to/add-and-remove-targets.md)
* [Choose a balancing model](docs/how-to/choose-a-balancing-model.md)
* [Use custom ids](docs/how-to/use-custom-ids.md)
* [Combine with pins](docs/how-to/combine-with-pins.md)
* [Override local actions](docs/how-to/override-local-actions.md)
* [Shut down cleanly](docs/how-to/shut-down-cleanly.md)
* [Migrate from Seneca 3](docs/how-to/migrate-from-seneca-3.md)

All the programs are in [docs/examples](docs/examples/); the full index
is [docs/README.md](docs/README.md).

## Motivation

Running several instances of a service usually means putting a load
balancer in front of them. With Seneca the client can do the balancing
itself, per message pattern, with the same `seneca.client` calls that
connect it to one instance, and a discovery mechanism such as
seneca-mesh can change the set of instances at runtime.
[How the balance client works](docs/explanation/how-it-works.md)
explains the design.

## Support

* Questions and bugs: [GitHub issues](https://github.com/senecajs/seneca-balance-client/issues).
* Seneca documentation: [senecajs.org](http://senecajs.org) and the
  [Seneca 4 docs](https://github.com/senecajs/seneca/tree/master/docs).
* This module is sponsored and supported by [Voxgig](https://www.voxgig.com).

## API

The plugin has no exports. Everything is used through `seneca.client`
and actions; the details are in [docs/reference](docs/reference/).

### Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `model` | `'consume'` | Default model of every balance client: `'consume'` or `'observe'` (aliases `'actor'`, `'publish'`). |
| `balance` | `{}` | Defaults merged into every balance client configuration, for example `{ model: fn }`. |
| `debug.client_updates` | `false` | Log each target added or removed. |

See [Options](docs/reference/options.md).

### Client configuration

| Key | Description |
| --- | ----------- |
| `type: 'balance'` | Creates a balance client for `pin` or `pins` (none: catch-all). |
| `model` | Model of this balance client: a name or a model function. |
| `pin`, `pins` of other clients | Clients with exactly the same pins become the targets. |
| `id` of a target | Names the target, for `remove:client`. |

### Actions

| Pattern | Description |
| ------- | ----------- |
| `role:transport,hook:client,type:balance` | The transport hook Seneca calls for `client({ type: 'balance' })`. |
| `role:transport,type:balance,add:client` | Add a target: `{ config }`. |
| `role:transport,type:balance,remove:client` | Remove a target: `{ config }` with its `id` or its original keys. |
| `role:transport,type:balance,get:target-map` | The targets of the instance, or of one pin group `pg`. |

See [Actions](docs/reference/messages.md).

### Models and errors

| Name | Description |
| ---- | ----------- |
| `consume` | Round-robin over the targets (default). |
| `observe` | Send to every target, reply with the first answer. |
| function | `(seneca, msg, targetstate, done, meta)`, see [Models](docs/reference/models.md). |
| `no-target` | Error: no target was ever registered for the pattern. |
| `no-current-target` | Error: every target has been removed. |

See [Models](docs/reference/models.md) and [Errors](docs/reference/errors.md).

## Contributing

The [Senecajs org](https://github.com/senecajs/) encourages open
participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features, please get in
touch.

Run the tests on Node.js 24 (the default target) or 22:

```sh
npm install   # .npmrc sets legacy-peer-deps while seneca 4 is a prerelease
npm test      # node:test
```

The devDependency is the Seneca 4 prerelease, `seneca@^4.0.0-rc5`. To
test another version of Seneca, install it without saving, run the
tests, then restore the locked versions:

```sh
npm install --no-save seneca@3.38.0   # or the path of a seneca package tarball
npm test
npm install
```

`npm test` runs `node --test --test-force-exit` because seneca 4.0.0-rc5
leaves seneca-transport listeners open after `close()` (see
[Shut down cleanly](docs/how-to/shut-down-cleanly.md#services-on-seneca-400-rc5));
every test closes its instances. `npm run coverage` reports test
coverage.

The CI workflow update is provided as a patch in [.patches](.patches/),
because the branch that introduced it could not change workflow files;
[.patches/README.md](.patches/README.md) explains how to apply it.

## Background

The balance client was written by Richard Rodger and contributors as
part of the [Senecajs org](https://github.com/senecajs/), to balance
messages on the client side, and it became the balancer of seneca-mesh.
Versions up to 1.2.0 were published as `seneca-balance-client`; from the
next version the package is `@seneca/balance-client`.

| Version | Package | Seneca | Node.js |
| ------- | ------- | ------ | ------- |
| 1.3.0 | `@seneca/balance-client` | 3.x (tested with 3.38), 4.0.0-rc5, 4.0.0 | 18 or later (tested with 24 and 22) |
| 1.2.0 and earlier | `seneca-balance-client` | 3.x | 8 or later |

Changes are listed in [CHANGES.md](CHANGES.md).

Copyright (c) 2010-2016, Richard Rodger and other contributors.
Licensed under [MIT](./LICENSE).
