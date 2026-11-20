# Changes

## 2.0.0 2026-11-20

First release under the name `@seneca/balance-client`. Version 1.3.0
was prepared in the repository but never published; its changes are
part of this release.

* Seneca 4: the peer dependency is `seneca` `^4.0.0`, and Seneca 3 is no
  longer supported. Seneca 3 users stay on `seneca-balance-client@1`.
  Tested against seneca 4.0.0 with `@seneca/transport` 9.0.0.
* Renamed from `seneca-balance-client` to `@seneca/balance-client`.
* Node.js 24 or later (`engines.node` `>=24`).
* Seneca 4 has no built in network transport: load `@seneca/transport`
  (or another transport plugin) in the processes that listen or have
  web or tcp targets.
* The balance client always uses the core transport protocol and reads
  the pattern from the `meta` argument of `send` (B9). On Seneca 3, when
  seneca-transport was loaded before the plugin, 1.x used
  seneca-transport's older `make_client`, with which local actions
  wrapped by `override` and more specific than the pin failed with
  `no-target`.
* The close step is registered on `sys:seneca,cmd:close` and releases
  the instance's target map and options. Earlier versions registered a
  step that did nothing, and only when `make_client` was used.
* Options are declared for Seneca 4's option validation: `model`
  (default `'consume'`), `balance` and `debug.client_updates`; an
  unknown key fails with `invalid_plugin_option`. The plugin option
  `model` is now applied as the default model of every balance client
  (it was documented but not read); `balance.model` and a `model` in the
  client configuration take precedence, as before.
* `debug.client_updates` applies per instance. Earlier versions shared
  one setting between all instances of a process, and did not log the
  targets added before the plugin was defined.
* Removed the `lodash` and `jsonic` dependencies: patterns are parsed
  with `seneca.util.Jsonic`. The package has no runtime dependencies.
* Development: tests migrated from lab 22 to `node:test`; every test
  closes its instances and uses its own ports, and loads
  `@seneca/transport` by its full name. `npm test` exits without
  `--test-force-exit`. Removed `debug.short_logs` from the tests (D3).
  The development dependencies are `seneca` `^4.0.0` and
  `@seneca/transport` `^9.0.0`. No `package-lock.json` or `.npmrc` is
  committed. Removed the Travis CI configuration, the coveralls script
  and the `repo-tag` and `repo-publish` scripts.
* Examples updated for Seneca 4. Documentation reorganized following the
  Diátaxis structure (see `docs/`), with runnable programs in
  `docs/examples/`; the workarounds for the Seneca 4 release candidates
  are gone. The package now includes the documentation, the examples and
  this change log.

## 0.6.0 26-08-2016

* Updated dependencies
* Added Seneca 3 and Node 6 support
* Dropped Node 0.10, 0.12, 5 support
