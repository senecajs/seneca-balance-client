var Seneca = require('seneca')

Seneca()
  .listen(47000)
  .add('a:1', function (msg, done) {
    done( null, {a: 1, x: msg.x} )
  })
  .ready(function() {
  
    Seneca()
      .listen(47001)
      .add('a:1', function (msg, done) {
        done( null, {a: 2, x: msg.x} )
      })
      .ready(function() {

        Seneca()
          .use('../')
          .client( {pin: 'a:1', type: 'balance'} )
          .client( {pin: 'a:1', type: 'balance'} )
          .client( {pin: 'a:1', port: 47000} )
          .client( {pin: 'a:1', port: 47001} )

          .act('a:1', console.log)

      })
  })
