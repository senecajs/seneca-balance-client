![Seneca](http://senecajs.org/files/assets/seneca-logo.png) 

> A [Seneca.js][] transport plugin that provides various client-side
load balancing strategies, and enables dynamic reconfiguration of
client message routing.

# seneca-balance-client
[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Dependency Status][david-badge]][david-url]
[![Gitter][gitter-badge]][gitter-url]

This module is a plugin for the Seneca framework. It provides a
transport client that load balances outbound messages on a per-pattern basis.

*seneca-balance-client*'s source can be read in an annotated fashion by,

- running `npm run annotate`
- viewing [online](http://senecajs.org/annotations/balance-client.html).

The annotated source can be found locally at [./doc/seneca-balance-client.html]().

If you're using this module, and need help, you can:

- Post a [github issue][],
- Tweet to [@senecajs][],
- Ask on the [Gitter][gitter-url].

If you are new to Seneca in general, please take a look at
[senecajs.org][]. We have everything from tutorials to sample apps to
help get you up and running quickly.


## Install

```sh
npm install seneca-balance-client
```

And in your code:

```js
require('seneca')()
  .use('balance-client', { ... options ... })
```

## Test
To run tests, simply use npm:

```sh
npm run test
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
action patterns to which this applies.

<!--

## Usage

TODO


## Releases

TODO

-->

## Contributing

The [Senecajs org][] encourages open participation. If you feel you
can help in any way, be it with documentation, examples, extra
testing, or new features please get in touch.

## License
Copyright (c) 2015, Richard Rodger and other contributors.
Licensed under [MIT][].

[MIT]: ./LICENSE
[npm-badge]: https://img.shields.io/npm/v/seneca-balance-client.svg
[npm-url]: https://npmjs.com/package/seneca-balance-client
[coveralls-badge]:https://coveralls.io/repos/rjrodger/seneca-balance-client/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/rjrodger/seneca-balance-client?branch=master
[david-badge]: https://david-dm.org/rjrodger/seneca-balance-client.svg
[david-url]: https://david-dm.org/rjrodger/seneca-balance-client
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[@senecajs]: http://twitter.com/senecajs
[senecajs.org]: http://senecajs.org/
[travis-badge]: https://travis-ci.org/rjrodger/seneca-balance-client.svg
[travis-url]: https://travis-ci.org/rjrodger/seneca-balance-client
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/rjrodger/seneca
[github issue]: https://github.com/rjrodger/seneca-balance-client/issues

