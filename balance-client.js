/*
  MIT License,
  Copyright (c) 2015, Richard Rodger and other contributors.
*/

'use strict'

var _ = require('lodash')
var Jsonic = require('jsonic')


module.exports = function (options) {
  var seneca = this

  // merge default options with any provided by the caller
  options = seneca.util.deepextend({
  }, options)


  var target_map = {}

  seneca.options({
    transport: {
      balance: {
        handle: function ( pat, action ) {
          add_target( pat, action )
        }
      }
    }
  })

  function add_target( pat, action ) {
    var patkey = make_patkey( pat )
    var targetdesc = target_map[patkey]

    targetdesc = targetdesc || { index: 0, targets: [] }
    target_map[patkey] = targetdesc

    targetdesc.targets.push( { action: action, id: action.id } )

    //console.log( 'add_target', pat, patkey, action.id, targetdesc )
  }


  function remove_target( pat, action_id ) {
    var patkey = make_patkey( pat )
    var targetdesc = target_map[patkey]

    targetdesc = targetdesc || { index: 0, targets: [] }
    target_map[patkey] = targetdesc

    for( var i = 0; i < targetdesc.targets.length; i++ ) {
      if( action_id === targetdesc.targets[i].id ) {
        break
      }
    }

    if( i < targetdesc.targets.length ) {
      targetdesc.targets.splice(i,1)
    }

    //console.log( 'remove_target', pat, patkey, action_id, targetdesc )
  }


  function make_patkey ( pat ) {

    // TOOD: sort!
    if( _.isString( pat ) ) {
      return pat
    }

    var keys = _.keys(seneca.util.clean(pat)).sort()
    var cleanpat = {}
    _.each( keys, function (k) {
      cleanpat[k] = pat[k]
    })

    //var patkey = Jsonic.stringify( cleanpat )
    var patkey = seneca.util.pattern( cleanpat )
    return patkey
  }


  var tu = seneca.export('transport/utils')

  seneca.add({
    role: 'transport', hook: 'client', type: 'balance'
  }, hook_client)


  seneca.add({
    role: 'transport', type: 'balance', add: 'client'
  }, add_client)


  seneca.add({
    role: 'transport', type: 'balance', remove: 'client'
  }, remove_client)



  function add_client (msg, done) {
    if( !msg.config.id ) {
      msg.config.id = this.util.pattern( msg.config )
    }

    this.client( msg.config )
    done()
  }


  function remove_client (msg, done) {
    if( !msg.config.id ) {
      msg.config.id = this.util.pattern( msg.config )
    }

    // TODO: what about array of pins?
    var patkey = make_patkey( msg.config.pin )    
    remove_target( patkey, msg.config.id )

    done()
  }
  



  function hook_client (args, clientdone) {
    var seneca = this
    var type = args.type
    var client_options = seneca.util.clean(_.extend({}, options[type], args))
    
    tu.make_client(make_send, client_options, clientdone)

    var index = -1

    function make_send (spec, topic, send_done) {
      seneca.log.debug('client', 'send', topic + '_res', client_options, seneca)

      send_done(null, function (args, done) {
        var patkey  = args.meta$.pattern
        var targetdesc = target_map[patkey]
 
        //console.log( 'send', patkey, targetdesc )

        if( targetdesc ) {
          var targets = targetdesc.targets
          var index   = targetdesc.index

          if( targetdesc.targets.length <= index ) {
            index = targetdesc.targets.length - 1
          }
          
          if( targets[index] ) {
            targets[index].action.call( this, args, done )
            targetdesc.index = ( index + 1 ) % targets.length
          }
          else {
            done()
          }
        }
        else {
          done()
        }
      })
    }

    seneca.add('role:seneca,cmd:close', function (close_args, done) {
      var closer = this
      closer.prior(close_args, done)
    })
  }
}

