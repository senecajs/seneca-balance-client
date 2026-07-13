![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js](http://senecajs.org) transport plugin that provides various client-side load balancing strategies, and enables dynamic reconfiguration of client message routing.

# @seneca/balance-client

[![build](https://github.com/senecajs/seneca-balance-client/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-balance-client/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/senecajs/seneca-balance-client/badge.svg?branch=master&service=github)](https://coveralls.io/github/senecajs/seneca-balance-client?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/senecajs/seneca-balance-client/badge.svg)](https://snyk.io/test/github/senecajs/seneca-balance-client)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install @seneca/balance-client
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

The client will balance requests over both servers using round-robin.

## More Examples

See [test/](test/) for more usage examples.

## Motivation

This module is a plugin for the Seneca framework. It provides a transport client that load balances outbound messages on a per-pattern basis.

Supports Seneca versions **3.x** and above.

## Support

If you're using this module and need help, you can:

- Post a [github issue](https://github.com/senecajs/seneca-balance-client/issues)
- Tweet to [@senecajs](http://twitter.com/senecajs)
- Ask on the [Gitter](https://gitter.im/senecajs/seneca)

## API

### Usage

The plugin provides two balancing models:

* `consume`: messages are sent to individual targets, using a round-robin approach
* `observe`: messages are duplicated and sent to all targets

You specify the model using the plugin option `model`:

```js
var Seneca = require('seneca')

var s0 = Seneca({tag: 's0'})
  .listen(44440)
  .add('a:1', function (msg, done) {
    console.log('s0;x='+msg.x);
    done()
  })

var s1 = Seneca({tag: 's1'})
  .listen(44441)
  .add('a:1', function (msg, done) {
    console.log('s1;x='+msg.x);
    done()
  })

var c0 = Seneca({tag: 'c0'})
  .use('..')
  .client({ type: 'balance', pin: 'a:1', model: 'observe' })
  .client({ port: 44440, pin: 'a:1' })
  .client({ port: 44441, pin: 'a:1' })
```



You can also provide your own balancing model by providing a function
with signature `(seneca, msg, targetstate, done)` as the value of the
`model` setting:

```js
...
    .client({
      type: 'balance',
      pin: 'a:1',
      model: function (seneca, msg, targetstate, done) {
        if (0 === targetstate.targets.length) {
          return done( new Error('No targets') )
        }

        // select a random target
        var index = Math.floor(Math.random() * targetstate.targets.length)
        targetstate.targets[index].action.call( seneca, msg, done)
      }
    })
...
```

The `targetstate` object provides you with the list of currently
available targets. Review the internal implementations of the
`observeModel` and the `consumeModel` in
[balance-client.js](https://github.com/senecajs/seneca-balance-client/blob/master/balance-client.js)
for a starting point to write your own model.

## Contributing

The [Senecajs org](https://github.com/senecajs/) encourages open participation. If you feel you can help in any way, be it with documentation, examples, extra testing, or new features please get in touch.

### Running tests

```sh
npm run test
```

## Background

Copyright (c) 2010-2016, Richard Rodger and other contributors.
Licensed under [MIT](./LICENSE).

Part of the [Senecajs org](https://github.com/senecajs/).
