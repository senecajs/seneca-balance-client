# How the balance client works

This page explains the design of the plugin: how a transport client can
have other transport clients as its targets, what the models mean, how
seneca-mesh uses the plugin, and where the limits are. The differences
between Seneca versions are in [Seneca 3 and Seneca 4](seneca-3-and-4.md).

## Clients are actions

In Seneca, `seneca.client({ pin })` does not open a connection by
itself. It adds an action for the pin whose implementation hands the
message to a transport client object, which Seneca obtains by sending
`role:transport,hook:client,type:<type>` to the plugin that implements
that type. seneca-transport implements `web` and `tcp`; this plugin
implements `balance`.

Because a client is an action, the usual pattern rules apply: a message
goes to the most specific matching pattern, and an action added later
for the same pattern takes over and keeps the previous one as its
prior. The balance client relies on one more rule of Seneca core: when
a client action is added for exactly the same pattern as an existing
client action that has a *handle* function, the new action is given to
that handle instead of being added to the pattern router.

## A client of clients

The plugin's `preload` sets `transport.balance.makehandle` in the
instance options. Seneca core copies the `transport.<type>` section of
the options into every client configuration of that type, so every
`seneca.client({ type: 'balance', pin })` carries `makehandle`, and core
calls it to create the handle of that client. The handle owns a *target
map* for the client's pin group: for each pattern, a list of targets.

Now `seneca.client({ type: 'web', port: 8261, pin })` with the same pin
adds a client action for the same pattern. Core finds the balance
client's action there, sees its handle, and gives the new action to the
handle, which appends it to the list for that pattern. The web client
still exists, and its transport client is created as usual, but the only
route to it is through the balance client.

When a message arrives, the balance client looks up the list for the
pattern that matched (the pin, for messages of local actions wrapped by
`override`) and asks the model to choose. Calling a target's action is
exactly what core would do for a direct client: the message travels over
that target's transport and the reply comes back through the same
callback. The balance client adds no serialization of its own.

This is why the pins of the targets must be identical to the pin of the
balance client. Client actions are added with strict pattern matching,
so only an action for exactly the same pattern finds the balance
client's action and its handle. A target with a different pattern
becomes a client of its own, and messages for it bypass the balancer.

## State lives in the process

The target lists hold function references in memory, per Seneca
instance, so several instances in one process do not interfere. The
state is not shared between processes, is not persisted, and is dropped
when the instance closes. Nothing checks the targets: adding a target
for a port where nothing listens succeeds, and the failure appears when
a message is sent there.

## What the models mean

`consume` is the work queue idea: each message is handled once, by one
of the equivalent services behind the pin. It spreads load but does not
tolerate faults: a failing target returns its error, and the next
message goes elsewhere only because the position moved on.

`observe` is the broadcast idea: every service behind the pin sees every
message. The caller gets the first reply, so it suits notifications and
cache invalidation better than queries, where different targets could
answer differently.

A model function receives the live target list and can implement
anything in between: failover, weighted selection, sticky routing by a
message field, health tracking. The only contract is to call `done`
once.

## Runtime changes and seneca-mesh

The `add:client` and `remove:client` actions let the set of targets
follow the deployment. seneca-mesh is the main user: it discovers
services with the SWIM gossip protocol, creates one balance client for
each pin that a remote service announces, and adds a target for every
service instance it hears about, removing it when the instance leaves.
Each target's id is the pin plus the remote service's identifier, which
is how mesh removes the right one.

Removing a target does not close its transport client. The client
action stays registered on the instance; it just receives no messages,
because the only route to it was the balance client.

## Limits

* No health checks, retries or failover in the built in models.
* `observe` duplicates the work and uses only one reply.
* A target's default id is derived from the configuration keys given
  when it was added; removing it needs the same keys, or an explicit id.
* The target map is per instance and per process; coordinate changes
  across processes with a discovery mechanism such as seneca-mesh.
