// $ node client.js   (start server.js first)
// The balance client is created with override:true, so the local actions
// a:1,b:1 and a:1,b:2 (which would reply y:1) are overridden: every a:1
// message is sent to the server through the balance client.

var Seneca = require('seneca')

function ab(msg, reply) {
  reply({ b: msg.b, x: msg.x, y: 1 })
}

Seneca()
  .use('seneca-transport')
  .use(require('..')) // in your project: .use('@seneca/balance-client')
  .add('a:1,b:1', ab)
  .add('a:1,b:2', ab)
  .ready(function () {
    this.client({ type: 'balance', pin: 'a:1', override: true })
      .client({ pin: 'a:1' })
      .ready(function () {
        this.gate()
          .act('a:1,b:1,x:1', this.util.print)
          .act('a:1,b:2,x:2', this.util.print)
          .act('a:1,b:3,x:3', this.util.print)
          .ready(function () {
            this.close()
          })
      })
  })
