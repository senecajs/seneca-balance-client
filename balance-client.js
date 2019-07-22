/* MIT License. Copyright (c) 2015-2018, Richard Rodger and other contributors. */

'use strict'

const _ = require('lodash')
//const Eraro = require('eraro')
const Jsonic = require('jsonic')
// const Optioner = require('optioner')
// const Joi = Optioner.Joi

/*
const optioner = Optioner({
  model: Joi.alternatives().try(Joi.string(), Joi.func()),
  debug: {
    client_updates: false
  }
})
*/
/*
var error = Eraro({
  package: 'seneca',
  msgmap: {
    'no-target': 'No targets have been registered for message <%=msg%>',
    'no-current-target': 'No targets are currently active for message <%=msg%>'
  }
})
*/

module.exports = balance_client
balance_client.defaults = {
  debug: {
    client_updates: false
  }
}
balance_client.errors = {
  'no-target': 'No targets have been registered for message <%=msg%>',
  'no-current-target': 'No targets are currently active for message <%=msg%>'
}

// Not as bad as it looks - seneca.id is used at top level to isolate instances.
// Need this here so that preload can reference it.
const global_target_map = {}

var global_options = { debug: {} }

balance_client.preload = function() {
  var seneca = this

  seneca.options({
    transport: {
      balance: {
        makehandle: function(config) {
          global_target_map[seneca.id] = global_target_map[seneca.id] || {
            id: seneca.id
          }
          var instance_map = global_target_map[seneca.id]

          instance_map[config.pg] = instance_map[config.pg] || {
            pg: config.pg,
            id: Math.random()
          }
          var target_map = instance_map[config.pg]

          target_map.pg = config.pg

          //return function(pat, action) {
          return function(actdef) {
            var pat = actdef.client_pattern || actdef.pattern
            add_target(seneca, target_map, config, pat, actdef.func)
          }
        }
      }
    }
  })
}

function balance_client(options) {
  var seneca = this
  var tu = seneca.export('transport/utils')
  var modelMap = {
    observe: observeModel,
    consume: consumeModel,

    // legacy
    publish: observeModel,
    actor: consumeModel
  }

  // options = optioner.check(options)

  // hack to make add_target debug logging work
  // to be fixed when seneca plugin handling is rewritten to not need preload
  Object.assign(global_options, options)

  seneca.add(
    {
      role: 'transport',
      hook: 'client',
      type: 'balance'
    },
    hook_client
  )

  seneca.add(
    {
      role: 'transport',
      type: 'balance',
      add: 'client'
    },
    add_client
  )

  seneca.add(
    {
      role: 'transport',
      type: 'balance',
      remove: 'client'
    },
    remove_client
  )

  seneca.add(
    {
      role: 'transport',
      type: 'balance',
      get: 'target-map'
    },
    get_client_map
  )

  function remove_target(target_map, pat, config) {
    var action_id = config.id || seneca.util.pattern(config)
    var patkey = make_patkey(seneca, pat)
    var targetstate = target_map[patkey]
    var found = false

    targetstate = targetstate || { index: 0, targets: [] }
    target_map[patkey] = targetstate

    for (var i = 0; i < targetstate.targets.length; i++) {
      if (action_id === targetstate.targets[i].id) {
        break
      }
    }

    if (i < targetstate.targets.length) {
      targetstate.targets.splice(i, 1)
      targetstate.index = 0
      found = true
    }

    if (options.debug.client_updates) {
      seneca.log.info('remove', patkey, action_id, found)
    }
  }

  function add_client(msg, done) {
    msg.config = msg.config || {}

    if (!msg.config.pg) {
      msg.config.pg = this.util.pincanon(msg.config.pin || msg.config.pins)
    }

    this.client(msg.config)
    done()
  }

  function remove_client(msg, done) {
    var seneca = this

    msg.config = msg.config || {}

    if (!msg.config.pg) {
      msg.config.pg = this.util.pincanon(msg.config.pin || msg.config.pins)
    }

    var instance_map = global_target_map[seneca.id] || {}
    var target_map = instance_map[msg.config.pg] || {}

    var pins = msg.config.pin ? [msg.config.pin] : msg.config.pins

    _.each(pins, function(pin) {
      remove_target(target_map, pin, msg.config)
    })

    done()
  }

  function get_client_map(msg, done) {
    var seneca = this
    var instance_map = global_target_map[seneca.id] || {}
    done(null, null == msg.pg ? instance_map : instance_map[msg.pg])
  }

  function hook_client(msg, clientdone) {
    var seneca = this.root.delegate()

    // console.log('BC', msg)

    var type = msg.type
    var client_options = seneca.util.clean(_.extend({}, options[type], msg))

    var pg = this.util.pincanon(client_options.pin || client_options.pins)

    var instance_map = global_target_map[seneca.id] || {}
    var target_map = instance_map[pg] || {}

    var model = client_options.model || consumeModel
    model = _.isFunction(model) ? model : modelMap[model] || consumeModel

    // legacy transport
    if (tu.make_client) {
      var make_send = function(spec, topic, send_done) {
        seneca.log.debug(
          'client',
          'send',
          topic + '_res',
          client_options,
          seneca
        )

        send_done(null, function(msg, done, meta) {
          var patkey = (meta || msg.meta$).pattern
          var targetstate = target_map[patkey]

          if (targetstate) {
            model(this, msg, targetstate, done, meta)
            return
          } else return done(seneca.error('no-target', { msg: msg }))
        })
      }

      tu.make_client(make_send, client_options, clientdone)
    } else {
      // console.log('BC A ', pg)

      var send_msg = function(msg, reply, meta) {
        msg = tu.externalize_msg(seneca, msg)

        var msg_meta = meta || msg.meta$

        // console.log('BCM', this.util.clean(msg), pg, msg_meta.client_pattern, msg_meta.pattern)
        // console.dir(target_map,{depth:null})

        var patkey = msg_meta.client_pattern || msg_meta.pattern
        var targetstate = target_map[patkey]

        if (targetstate) {
          model(this, msg, targetstate, reply, meta)
          return
        } else return reply(seneca.error('no-target', { msg: msg }))
      }

      return clientdone({
        config: msg,
        send: send_msg
      })
    }

    seneca.add('role:seneca,cmd:close', function(close_msg, done) {
      var closer = this
      closer.prior(close_msg, done)
    })
  }

  function observeModel(seneca, msg, targetstate, done, meta) {
    if (0 === targetstate.targets.length) {
      return done(seneca.error('no-current-target', { msg: msg }))
    }

    var first = true
    for (var i = 0; i < targetstate.targets.length; i++) {
      var target = targetstate.targets[i]
      target.action.call(
        seneca,
        msg,
        function() {
          if (first) {
            done.apply(seneca, arguments)
            first = false
          }
        },
        meta
      )
    }
  }

  function consumeModel(seneca, msg, targetstate, done, meta) {
    var targets = targetstate.targets
    var index = targetstate.index

    if (!targets[index]) {
      index = targetstate.index = 0
    }

    if (!targets[index]) {
      return done(seneca.error('no-current-target', { msg: msg }))
    }

    targets[index].action.call(seneca, msg, done, meta)
    targetstate.index = (index + 1) % targets.length
  }
}

function add_target(seneca, target_map, config, pat, action) {
  var patkey = make_patkey(seneca, pat)
  var targetstate = target_map[patkey]
  var add = true

  targetstate = targetstate || { index: 0, targets: [] }
  target_map[patkey] = targetstate

  // don't add duplicates
  for (var i = 0; i < targetstate.targets.length; ++i) {
    if (action.id === targetstate.targets[i].id) {
      add = false
      break
    }
  }

  if (add) {
    targetstate.targets.push({
      action: action,
      id: action.id,
      config: config
    })
  }

  if (global_options.debug.client_updates) {
    seneca.log.info('add', patkey, action.id, add)
  }
}

function make_patkey(seneca, pat) {
  if (_.isString(pat)) {
    pat = Jsonic(pat)
  }

  var keys = _.keys(seneca.util.clean(pat)).sort()
  var cleanpat = {}

  _.each(keys, function(k) {
    cleanpat[k] = pat[k]
  })

  var patkey = seneca.util.pattern(cleanpat)
  return patkey
}
