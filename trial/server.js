// $ node server.js
// Listens on the default port (10101) with seneca-transport.

var Seneca = require('seneca')

function ab(msg, reply) {
  reply({ b: msg.b, x: msg.x })
}

Seneca()
  .use('seneca-transport')
  .add('a:1,b:1', ab)
  .add('a:1,b:2', ab)
  .add('a:1,b:3', ab)
  .listen()
