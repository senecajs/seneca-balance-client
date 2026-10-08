# Models reference

A model decides which targets receive a message. The model of a balance
client is the first one set of: `model` in the client configuration, the
plugin option `balance.model`, the plugin option `model` (default
`'consume'`). See [Options](options.md).

| Name | Alias | Behaviour |
| ---- | ----- | --------- |
| `consume` | `actor` | Round-robin: each message goes to one target, the next message to the next target. |
| `observe` | `publish` | Every message goes to every target; the first reply is returned to the caller. |
| a function | | Your own selection, see [Model functions](#model-functions). |

An unknown model name selects `consume`.

## consume

Targets are kept in a list in the order they were added. The model sends
the message to the target at the current position and advances the
position by one, wrapping around at the end of the list. Removing a
target resets the position to 0. Each pattern of a balance client has
its own list and position.

The reply, or the error, of the chosen target is passed to the caller
unchanged. A target that fails (for example with `ECONNREFUSED` from
seneca-transport when its service is down) is not retried and not
removed: the caller gets the error, and the next message goes to the
next target. Use `remove:client` when a service goes away, or a model
function that fails over.

With an empty list, the reply is the error
[`no-current-target`](errors.md).

## observe

The message is sent to every target in the list, in order and without
waiting. The first reply to arrive, a result or an error, is passed to
the caller; later replies are dropped.

seneca-transport logs each dropped reply as an `unknown_message_id`
warning, because the message has already been answered. Its option
`warn: { unknown_message_id: false }` turns the warning off.

With an empty list, the reply is the error
[`no-current-target`](errors.md).

## Model functions

A model is a function with the signature

```js
function model(seneca, msg, targetstate, done, meta)
```

| Argument | Meaning |
| -------- | ------- |
| `seneca` | The Seneca instance handling the message. Use it as `this` when calling a target. |
| `msg` | The message to send. |
| `targetstate` | `{ index, targets }`, the live state for the message's pattern. `targets` is an array of `{ action, id, config }` (`config` is the balance client's configuration); `index` is free for your own use (`consume` keeps its position there). |
| `done` | The reply callback: `done(err)` or `done(null, out)`. Call it exactly once. |
| `meta` | The message meta data; pass it on to the target. |

To send the message to a target, call its `action`:

```js
target.action.call(seneca, msg, done, meta)
```

The `action` is the transport client action Seneca created for that
target; it sends the message over the target's transport and calls the
callback with the reply. This is the built in `consume` model:

```js
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
```

A model that tries the targets in order until one succeeds is in
[docs/examples/custom-model.js](../examples/custom-model.js); the guide
[Choose a balancing model](../how-to/choose-a-balancing-model.md) shows
it running.
