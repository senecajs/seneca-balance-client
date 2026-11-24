# Shut down cleanly

How to stop a process that uses balance clients so that it releases
everything and exits.

## 1. Close the instance

```js
await seneca.close()
// or
seneca.close(function (err) { ... })
```

`close()` runs the close action, `sys:seneca,cmd:close`. The plugin
adds a step to that action that drops the instance's target map and
options, then continues the chain, so that other plugins, such as
`@seneca/transport`, release their resources too. The balance client
itself holds no sockets or timers; the connections belong to the target
transport clients.

## 2. Close clients before services

When clients and services run in one process (in tests and examples),
close the client instances first, then the services, so that no message
is sent to a service that has already stopped. Closing does not send
anything to the targets: a close message stays local, also in an
instance that has a catch-all client.

## 3. Remove a target when only one service goes away

Closing is for the whole instance. When one service instance stops
while the client keeps running, remove its target:

```js
await seneca.post('role:transport,type:balance,remove:client', {
  config: { type: 'web', port: 8262, pin: 'role:greet,cmd:hello' },
})
```

Until it is removed, the messages routed to it fail with the transport's
error, for example `ECONNREFUSED`. See
[Add and remove targets at runtime](add-and-remove-targets.md).

## 4. Services

`@seneca/transport` closes its listeners in its own step of the close
action, so a service that calls `close()` stops listening and its
process can exit. The programs in [docs/examples](../examples/) and the
test suite of this repository close every instance and exit without
`--test-force-exit`.

## More

Seneca's own guide,
[Shut down gracefully](https://github.com/senecajs/seneca/blob/master/docs/how-to/shut-down-gracefully.md),
covers `close_delay`, process signals and plugin shutdown in general.
