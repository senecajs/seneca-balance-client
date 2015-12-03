/*
  MIT License,
  Copyright (c) 2015, Richard Rodger and other contributors.
*/

'use strict'

var _ = require('lodash')


module.exports = function (options) {
  var seneca = this
  var target_map = {}
  var tu = seneca.export('transport/utils')

  // Merge default options with any provided by the caller
  options = seneca.util.deepextend({}, options)

  seneca.options({
    transport: {
      balance: {
        handle: function ( pat, action ) {
          add_target( pat, action )
        }
      }
    }
  })

  seneca.add({
    role: 'transport', hook: 'client', type: 'balance'
  }, hook_client)

  seneca.add({
    role: 'transport', type: 'balance', add: 'client'
  }, add_client)

  seneca.add({
    role: 'transport', type: 'balance', remove: 'client'
  }, remove_client)


  function add_target ( pat, action ) {
    var patkey = make_patkey( pat )
    var targetdesc = target_map[patkey]

    targetdesc = targetdesc || { index: 0, targets: [] }
    target_map[patkey] = targetdesc
    targetdesc.targets.push( { action: action, id: action.id } )
  }


  function remove_target ( pat, action_id ) {
    var patkey = make_patkey( pat )
    var targetdesc = target_map[patkey]

    targetdesc = targetdesc || { index: 0, targets: [] }
    target_map[patkey] = targetdesc

    for ( var i = 0; i < targetdesc.targets.length; i++ ) {
      if ( action_id === targetdesc.targets[i].id ) {
        break
      }
    }

    if ( i < targetdesc.targets.length ) {
      targetdesc.targets.splice(i, 1)
    }
  }


  function make_patkey ( pat ) {
    // TODO: sort!
    if ( _.isString( pat ) ) {
      return pat
    }

    var keys = _.keys(seneca.util.clean(pat)).sort()
    var cleanpat = {}

    _.each( keys, function (k) {
      cleanpat[k] = pat[k]
    })

    var patkey = seneca.util.pattern( cleanpat )
    return patkey
  }


  function add_client (msg, done) {
    if ( !msg.config.id ) {
      msg.config.id = this.util.pattern( msg.config )
    }

    this.client( msg.config )
    done()
  }


  function remove_client (msg, done) {
    if ( !msg.config.id ) {
      msg.config.id = this.util.pattern( msg.config )
    }

    // TODO: what about array of pins?
    var patkey = make_patkey( msg.config.pin )

    remove_target( patkey, msg.config.id )
    done()
  }


  function hook_client (args, clientdone) {
    var type = args.type
    var client_options = seneca.util.clean(_.extend({}, options[type], args))

    tu.make_client(make_send, client_options, clientdone)

    function make_send (spec, topic, send_done) {
      seneca.log.debug('client', 'send', topic + '_res', client_options, seneca)

      send_done(null, function (args, done) {
        var patkey = args.meta$.pattern
        var targetdesc = target_map[patkey]

        if ( targetdesc ) {
          var targets = targetdesc.targets
          var index = targetdesc.index

          if ( targets[index] ) {
            targets[index].action.call( this, args, done )
            targetdesc.index = ( index + 1 ) % targets.length
            return
          }
        }

        done()
      })
    }

    seneca.add('role:seneca,cmd:close', function (close_args, done) {
      var closer = this
      closer.prior(close_args, done)
    })
  }
}