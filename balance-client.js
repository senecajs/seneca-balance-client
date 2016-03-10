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
    'no-target': 'No targets have been registered for message <%=msg%>',
    'no-current-target': 'No targets are currently active for message <%=msg%>'
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
    observe: observeModel,
    consume: consumeModel,

    // legacy
    publish: observeModel,
    actor: consumeModel
  }

  // Merge default options with any provided by the caller
  options = seneca.util.deepextend({}, options)

  // fix for Seneca 1.0.0
  if ('1.0.0' === seneca.version) {
    preload.call(seneca)
  }

  var model = options.model

  if (model === undefined) {
    model = modelMap.consume
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
    var targetstate = target_map[patkey]

    targetstate = targetstate || { index: 0, targets: [] }
    target_map[patkey] = targetstate

    for ( var i = 0; i < targetstate.targets.length; i++ ) {
      if ( action_id === targetstate.targets[i].id ) {
        break
      }
    }

    if ( i < targetstate.targets.length ) {
      targetstate.targets.splice(i, 1)
      targetstate.index = 0
    }
  }


  function add_client (msg, done) {
    msg.config = msg.config || {}

    if ( !msg.config.pg ) {
      msg.config.pg = this.util.pincanon( msg.config.pin || msg.config.pins )
    }

    this.client( msg.config )
    done()
  }


  function remove_client (msg, done) {
    var seneca = this

    msg.config = msg.config || {}

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


  function hook_client (msg, clientdone) {
    var seneca = this

    var type = msg.type
    var client_options = seneca.util.clean(_.extend({}, options[type], msg))

    var pg = this.util.pincanon( client_options.pin || client_options.pins )

    var instance_map = global_target_map[seneca.id] || {}
    var target_map = instance_map[pg] || {}

    var model = client_options.model || consumeModel
    model = _.isFunction(model) ? model : ( modelMap[model] || consumeModel )

    tu.make_client(make_send, client_options, clientdone)

    function make_send (spec, topic, send_done) {
      seneca.log.debug('client', 'send', topic + '_res', client_options, seneca)

      send_done(null, function (msg, done) {
        var patkey = msg.meta$.pattern
        var targetstate = target_map[patkey]

        if ( targetstate ) {
          model(this, msg, targetstate, done)
          return
        }

        else return done( error('no-target', {msg: msg}) )
      })
    }

    seneca.add('role:seneca,cmd:close', function (close_msg, done) {
      var closer = this
      closer.prior(close_msg, done)
    })
  }


  function observeModel (seneca, msg, targetstate, done) {
    if ( 0 === targetstate.targets.length ) {
      return done(error('no-current-target', {msg: msg}))
    }

    var first = true
    for ( var i = 0; i < targetstate.targets.length; i++ ) {
      var target = targetstate.targets[i]
      target.action.call(seneca, msg, function () {
        if ( first ) {
          done.apply(seneca, arguments)
          first = false
        }
      })
    }
  }


  function consumeModel (seneca, msg, targetstate, done) {
    var targets = targetstate.targets
    var index = targetstate.index

    if (!targets[index]) {
      index = targetstate.index = 0
    }

    if (!targets[index]) {
      return done( error('no-current-target', {msg: msg}) )
    }

    targets[index].action.call( seneca, msg, done )
    targetstate.index = ( index + 1 ) % targets.length
  }
}


// TODO: handle duplicates
function add_target ( seneca, target_map, pat, action ) {
  var patkey = make_patkey( seneca, pat )
  var targetstate = target_map[patkey]

  targetstate = targetstate || { index: 0, targets: [] }
  target_map[patkey] = targetstate

  targetstate.targets.push( { action: action, id: action.id } )
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
