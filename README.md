![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

> A [Seneca.js][] transport plugin that provides various client-side
load balancing strategies, and enables dynamic reconfiguration of
client message routing.

# @seneca/balance-client
[![build](https://github.com/senecajs/seneca-balance-client/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-balance-client/actions/workflows/build.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/senecajs/seneca-balance-client/badge.svg)](https://snyk.io/test/github/senecajs/seneca-balance-client)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

### Description

This module is a plugin for the Seneca framework. It provides a
transport client that load balances outbound messages on a per-pattern basis.

If you're using this module, and need help, you can:

- Post a [github issue][],
- Tweet to [@senecajs][],
- Ask on the [Gitter][gitter-url].

If you are new to Seneca in general, please take a look at
[Senecajs.org][]. We have everything from tutorials to sample apps to
help get you up and running quickly.

### Seneca compatibility
Supports Seneca versions **3.x** and above.

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install seneca-balance-client
```

And in your code:

```js
require('seneca')()
  .use('balance-client', { ... options ... })
```

## Quick Example

### _server.js_

```js
require('seneca')()

  .listen( {port: function () { return process.argv[2] }} )

  .add('a:1', function (msg, done) {
    done( null, {a: 1, x: msg.x} )
  })

// run twice:
// $ node server.js 47000 --seneca.log=type:act
// $ node server.js 47001 --seneca.log=type:act
```

### _client.js_

```js
require('seneca')()
  .use('balance-client')

  .client( {type: 'balance'} )
  .client( {port: 47000} )
  .client( {port: 47001} )

  .ready( function () {

    for ( var i = 0; i < 4; i++ ) {
      this.act( 'a:1,x:1', console.log )
    }

  })

// $ node client.js --seneca.log=type:act
```

The client will balance requests over both servers using
round-robin. As there is no _pin_ in the `.client` configuration, this
will apply to all non-local actions. Add a _pin_ to restrict the
action patterns to which this applies - make sure to use the same
_pin_ on both client and server to avoid ambiguity.

## More Examples

See [test/](test/) for usage examples.

## Motivation

This module is a plugin for the Seneca framework. It provides a transport client that load balances outbound messages on a per-pattern basis.

## Support

If you're using this module and need help, you can:

- Post a [github issue][]
- Tweet to [@senecajs][]
- Ask on the [Gitter][gitter-url]

## API

The plugin provides two balancing models:

- `consume`: messages are sent to individual targets using round-robin
- `observe`: messages are duplicated and sent to all targets

Specify the model using the `model` plugin option.

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can help in any way, be it with documentation, examples, extra testing, or new features please get in touch.

### Running tests

```sh
npm run test
```

## Background

See [seneca-transport](http://github.com/rjrodger/seneca-transport) for more information about message transports.

[Senecajs.org][]. We have everything from tutorials to sample apps to
[balance-client.js](https://github.com/senecajs/seneca-balance-client/blob/master/balance-client.js)
[MIT]: ./LICENSE
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[@senecajs]: http://twitter.com/senecajs
[senecajs.org]: http://senecajs.org/
[github issue]: https://github.com/senecajs/seneca-balance-client/issues
