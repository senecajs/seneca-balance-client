


var Seneca = require('seneca')

function ab(msg, reply) {
  reply({b:msg.b,x:msg.x,y:1})
}

Seneca({legacy:{transport:false}})
  .use('..')
  .add('a:1,b:1', ab)
  .add('a:1,b:2', ab)
  .ready( function() {

    this
      .client({type:'balance', pin:'a:1', override:true})
      .client({pin: 'a:1'})
      .ready( function() {
        
        this
          .act('a:1,b:1,x:1',this.util.print)
          .act('a:1,b:2,x:2',this.util.print)
          .act('a:1,b:3,x:3',this.util.print)
      })
  })
