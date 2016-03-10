/*
  MIT License,
  Copyright (c) 2015-2016, Richard Rodger and other contributors.
*/

'use strict'

var _ = require('lodash')
var Eraro = require('eraro')
var Jsonic = require('jsonic')

var error = Eraro({
  package: 'seneca',
  msgmap: {
    // TODO: error code messages
  }
})


module.exports = balance_client

var global_target_map = {}

var preload = balance_client.preload = function () {
  var seneca = this

  seneca.options({
    transport: {
      balance: {
        makehandle: function (config) {
          var instance_map =
                (global_target_map[seneca.id] =
                 global_target_map[seneca.id] || {id: seneca.id})

          var target_map =
                (instance_map[config.pg] =
                 instance_map[config.pg] || {pg: config.pg, id: Math.random()})

          target_map.pg = config.pg

          return function ( pat, action ) {
            add_target( seneca, target_map, pat, action )
          }
        }
      }
    }
  })
}

function balance_client (options) {
  var seneca = this
  var tu = seneca.export('transport/utils')
  var modelMap = {
    publish: publishModel,
    actor: actorModel
  }

  // Merge default options with any provided by the caller
  options = seneca.util.deepextend({}, options)

  // fix for Seneca 1.0.0
  if ('1.0.0' === seneca.version) {
    preload.call(seneca)
  }

  var model = options.model

  if (model === undefined) {
    model = modelMap.actor
  }
  else if (typeof model === 'string') {
    model = modelMap[model]
  }

  if (typeof model !== 'function') {
    throw new Error('model must be a string or function')
  }

  seneca.add({
    role: 'transport', hook: 'client', type: 'balance'
  }, hook_client)

  seneca.add({
    role: 'transport', type: 'balance', add: 'client'
  }, add_client)

  seneca.add({
    role: 'transport', type: 'balance', remove: 'client'
  }, remove_client)

  seneca.add({
    role: 'transport', type: 'balance', get: 'target-map'
  }, get_client_map)


  function remove_target ( target_map, pat, config ) {
    var action_id = config.id || seneca.util.pattern(config)
    var patkey = make_patkey( seneca, pat )
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
      targetdesc.index = 0
    }
  }


  function add_client (msg, done) {
    if ( !msg.config.pg ) {
      msg.config.pg = this.util.pincanon( msg.config.pin || msg.config.pins )
    }

    this.client( msg.config )
    done()
  }


  function remove_client (msg, done) {
    var seneca = this

    if ( !msg.config.pg ) {
      msg.config.pg = this.util.pincanon( msg.config.pin || msg.config.pins )
    }

    var instance_map = global_target_map[seneca.id] || {}
    var target_map = instance_map[msg.config.pg] || {}

    var pins = msg.config.pin ? [msg.config.pin] : msg.config.pins

    _.each( pins, function (pin) {
      remove_target( target_map, pin, msg.config )
    })

    done()
  }


  function get_client_map (msg, done) {
    var seneca = this
    var instance_map = global_target_map[seneca.id] || {}
    done(null, null == msg.pg ? instance_map : instance_map[msg.pg])
  }


  function hook_client (args, clientdone) {
    var seneca = this

    var type = args.type
    var client_options = seneca.util.clean(_.extend({}, options[type], args))

    var pg = this.util.pincanon( client_options.pin || client_options.pins )

    var instance_map = global_target_map[seneca.id] || {}
    var target_map = instance_map[pg] || {}

    var model = client_options.model || actorModel
    model = _.isFunction(model) ? model : ( modelMap[model] || actorModel )

    tu.make_client(make_send, client_options, clientdone)

    function make_send (spec, topic, send_done) {
      seneca.log.debug('client', 'send', topic + '_res', client_options, seneca)

      send_done(null, function (args, done) {
        var patkey = args.meta$.pattern
        var targetdesc = target_map[patkey]

        if ( targetdesc ) {
          model(this, args, targetdesc, done)
          return
        }

        else return done( error('no-target') )
      })
    }

    seneca.add('role:seneca,cmd:close', function (close_args, done) {
      var closer = this
      closer.prior(close_args, done)
    })
  }


  function publishModel (seneca, args, targetdesc, done) {
    if ( 0 === targetdesc.targets.length ) {
      return done(error('no-current-target'))
    }

    var first = true
    for ( var i = 0; i < targetdesc.targets.length; i++ ) {
      var target = targetdesc.targets[i]
      target.action.call(seneca, args, function () {
        if ( first ) {
          done.apply(seneca, arguments)
          first = false
        }
      })
    }
  }


  function actorModel (seneca, args, targetdesc, callback) {
    var targets = targetdesc.targets
    var index = targetdesc.index

    if (!targets[index]) {
      targetdesc.index = 0
      return callback( error('no-current-target') )
    }

    targets[index].action.call( seneca, args, callback )
    targetdesc.index = ( index + 1 ) % targets.length
  }
}


// TODO: handle duplicates
function add_target ( seneca, target_map, pat, action ) {
  var patkey = make_patkey( seneca, pat )
  var targetdesc = target_map[patkey]

  targetdesc = targetdesc || { index: 0, targets: [] }
  target_map[patkey] = targetdesc

  targetdesc.targets.push( { action: action, id: action.id } )
}


function make_patkey ( seneca, pat ) {
  if ( _.isString( pat ) ) {
    pat = Jsonic(pat)
  }

  var keys = _.keys(seneca.util.clean(pat)).sort()
  var cleanpat = {}

  _.each( keys, function (k) {
    cleanpat[k] = pat[k]
  })

  var patkey = seneca.util.pattern( cleanpat )
  return patkey
}
