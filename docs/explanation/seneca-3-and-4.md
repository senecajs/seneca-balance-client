# Seneca 3 and Seneca 4

The plugin runs on Seneca 3 and on Seneca 4 (tested with 3.38,
4.0.0-rc5 and the unreleased 4.0.0). This page explains what differs
between the versions and why. The steps to move an application are in
[Migrate from Seneca 3](../how-to/migrate-from-seneca-3.md).

## The network transport moved out of core

Seneca 3 bundled seneca-transport and loaded it by default (the options
`legacy.transport` and `default_plugins.transport`, both true), so
`seneca.client({ port })` worked without further setup. Seneca 4 core
has no network code: every process that listens, or has web or tcp
targets, must load seneca-transport or another transport plugin. The
balance client itself needs no transport, but its targets do.

The option `legacy: { transport: false }`, which old tests and examples
used to select the newer transport protocol on Seneca 3, is rejected by
Seneca 4's option validation.

## Two ways to build the client

seneca-transport replaces the `transport/utils` export of Seneca core
with its own utilities, which include `make_client`, a client builder
from the Seneca 2 era. On Seneca 3 the plugin uses `make_client` when it
is present, as it always did: there it is present whenever
seneca-transport was loaded before the plugin, which is the default. On
Seneca 4 the plugin always uses the core transport protocol, whichever
plugin was loaded first.

The difference shows with `override`. The core protocol tells the
balance client the pin a wrapped local action belongs to
(`client_pattern`), so its targets serve the local action's messages.
`make_client` passes only the message's own pattern, which has no
targets, and the message fails with `no-target`.

## Closing

Seneca 3 closes an instance through `role:seneca,cmd:close`, Seneca 4
through `sys:seneca,cmd:close`. The plugin adds its close step to the
pattern of the version it runs on, and uses it to drop the instance's
target map.

Two issues come from seneca-transport 8.3, which registers its own close
hooks on the Seneca 3 pattern only:

* seneca 4.0.0-rc5 does not run that pattern during `close()`, so
  services keep listening after `close()`;
* seneca 4.0.0 runs it, and in an instance with a catch-all client the
  hook chain ends in that client, which sends the close message to a
  remote service.

[Shut down cleanly](../how-to/shut-down-cleanly.md) shows how to deal
with both.

## Option validation

Seneca 4 validates plugin options against the plugin's defaults and
fails on unknown keys and wrong types; Seneca 3.38 does not reject
unknown keys. The plugin therefore declares all its options in its
defaults: `model`, `balance` and `debug.client_updates`. Declaring
`model` revealed that the plugin had never read the plugin option of
that name (it read `balance.model`); it now applies both.

## What did not change

* The actions, their parameters and replies, and the target map.
* The error codes and messages.
* The plugin name, `balance_client`, under which instance options are
  read (`plugin.balance_client`).
