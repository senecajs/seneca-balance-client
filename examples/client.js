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
