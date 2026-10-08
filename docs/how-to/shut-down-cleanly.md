# Shut down cleanly

How to stop a process that uses balance clients so that it releases
everything and exits.

## 1. Close the instance

```js
await seneca.close()
// or
seneca.close(function (err) { ... })
```

`close()` runs the close action: `sys:seneca,cmd:close` on Seneca 4,
`role:seneca,cmd:close` on Seneca 3. The plugin adds a step to that
action that drops the instance's target map and options, then continues
the chain, so that other plugins, such as seneca-transport, release
their resources too. The balance client itself holds no sockets or
timers; the connections belong to the target transport clients.

## 2. Close clients before services

When clients and services run in one process (in tests and examples),
close the client instances first, then the services. A client that is
closed after its services can fail while closing; see
[Catch-all clients on seneca 4.0.0](#catch-all-clients-on-seneca-400).

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

## Services on seneca 4.0.0-rc5

seneca-transport 8.3 registers the hook that closes its listener on the
Seneca 3 pattern `role:seneca,cmd:close`. Seneca 4.0.0 runs that pattern
during `close()`; 4.0.0-rc5 does not. With rc5, a process that
*listens* therefore keeps its sockets open after `close()` and does not
exit. Clients are not affected.

Run the hook yourself before closing a service:

```js
async function stop(service) {
  if (service.version.startsWith('4.0.0-rc')) {
    await service.post('role:seneca,cmd:close')
  }
  await service.close()
}
```

The programs in [docs/examples](../examples/) use this helper. The test
suite of this repository runs with `node --test --test-force-exit` for
the same reason; with seneca 4.0.0 it also exits without the flag.

## Catch-all clients on seneca 4.0.0

With seneca 4.0.0 and seneca-transport 8.3, the `role:seneca,cmd:close`
hooks that `close()` runs end, in an instance that has a catch-all
client (a client without `pin`, such as a catch-all balance client and
its targets), in that client. The close message is then sent to a
remote service, whose seneca-transport hook closes the service's
listener. This happens with plain seneca-transport clients too, not only
with balance clients, and does not happen with seneca 4.0.0-rc5 or
Seneca 3.

Until a seneca-transport release registers its hooks on
`sys:seneca,cmd:close`, give the clients of such processes pins.

## More

Seneca's own guide,
[Shut down gracefully](https://github.com/senecajs/seneca/blob/master/docs/how-to/shut-down-gracefully.md),
covers `close_delay`, process signals and plugin shutdown in general.
