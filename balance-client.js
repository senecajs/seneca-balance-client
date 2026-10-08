/* MIT License. Copyright (c) 2015-2026, Richard Rodger and other contributors. */

'use strict'

module.exports = balance_client
balance_client.defaults = {
  // Default balancing model for the balance clients of this instance:
  // 'consume' (round-robin) or 'observe' (the aliases 'actor' and 'publish'
  // also work). A `model` in the client configuration, which may also be a
  // model function, takes precedence.
  model: 'consume',

  // Default configuration merged into every balance client configuration
  // (type:balance); keys given to seneca.client() take precedence.
  balance: {},

  debug: {
    // Log each target added to or removed from a balance client.
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

// Plugin options per instance (by seneca.id), for the target handle that
// preload creates.
const global_options_map = {}

balance_client.preload = function(plugin) {
  var seneca = this

  // Targets can be added before the plugin is defined (for example
  // .use(BalanceClient).client(...)), so start with the options as given;
  // the definition replaces them with the resolved options.
  global_options_map[seneca.id] = (plugin && plugin.options) || {}

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
  var tu = seneca.export('transport/utils') || {}
  var legacy_transport = seneca.version.startsWith('3.')
  var modelMap = {
    observe: observeModel,
    consume: consumeModel,

    // legacy
    publish: observeModel,
    actor: consumeModel
  }

  // Make the options available to add_target, which preload references.
  global_options_map[seneca.id] = options

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

  // Seneca 3 closes via role:seneca,cmd:close; Seneca 4 via sys:seneca,cmd:close.
  // Release the target map of this instance, then continue the close chain.
  var close_pattern = legacy_transport
    ? 'role:seneca,cmd:close'
    : 'sys:seneca,cmd:close'

  seneca.add(close_pattern, function(close_msg, done) {
    delete global_target_map[seneca.id]
    delete global_options_map[seneca.id]
    this.prior(close_msg, done)
  })

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

    var pins = msg.config.pin ? [msg.config.pin] : msg.config.pins || []

    pins.forEach(function(pin) {
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

    var type = msg.type
    var client_options = seneca.util.clean(
      Object.assign({}, options[type], msg)
    )

    var pg = this.util.pincanon(client_options.pin || client_options.pins)

    var instance_map = global_target_map[seneca.id] || {}
    var target_map = instance_map[pg] || {}

    var model = client_options.model || options.model || consumeModel
    model =
      'function' === typeof model ? model : modelMap[model] || consumeModel

    // Seneca 3 with the legacy transport (the default in 3.x) provides
    // make_client; Seneca 4 always uses the core transport protocol below,
    // whichever utils object seneca-transport exported.
    if (legacy_transport && tu.make_client) {
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
      var send_msg = function(msg, reply, meta) {
        var msg_meta = meta || msg.meta$

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

  var options = global_options_map[seneca.id]
  if (options && options.debug && options.debug.client_updates) {
    seneca.log.info('add', patkey, action.id, add)
  }
}

function make_patkey(seneca, pat) {
  if ('string' === typeof pat) {
    // The empty string is the catch-all pattern; Jsonic parses it as undefined.
    pat = '' === pat.trim() ? {} : seneca.util.Jsonic(pat)
  }

  var keys = Object.keys(seneca.util.clean(pat)).sort()
  var cleanpat = {}

  keys.forEach(function(k) {
    cleanpat[k] = pat[k]
  })

  var patkey = seneca.util.pattern(cleanpat)
  return patkey
}
