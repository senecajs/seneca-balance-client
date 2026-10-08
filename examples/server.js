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
