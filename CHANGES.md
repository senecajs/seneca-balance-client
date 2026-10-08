## 1.3.0 2026-10-08

* Seneca 4 support (tested with seneca 4.0.0-rc5 and the unreleased
  4.0.0), alongside Seneca 3 (tested with 3.38). Seneca 4 has no built in
  network transport: load `seneca-transport` in the processes that listen
  or have web or tcp targets.
* On Seneca 4 the balance client always uses the core transport protocol.
  When seneca-transport was loaded before the plugin, earlier versions
  used seneca-transport's older `make_client`, with which local actions
  wrapped by `override` and more specific than the pin failed with
  `no-target`. Seneca 3 keeps the earlier behaviour.
* The close step is registered on `sys:seneca,cmd:close` on Seneca 4
  (`role:seneca,cmd:close` on Seneca 3) and releases the instance's
  target map and options. Earlier versions registered a step that did
  nothing, and only when `make_client` was used.
* Options are declared for Seneca 4's option validation: `model`
  (default `'consume'`), `balance` and `debug.client_updates`. The
  plugin option `model` is now applied as the default model of every
  balance client (it was documented but not read); `balance.model` and a
  `model` in the client configuration take precedence, as before.
* `debug.client_updates` applies per instance. Earlier versions shared
  one setting between all instances of a process, and did not log the
  targets added before the plugin was defined.
* Removed the `lodash` and `jsonic` dependencies: patterns are parsed
  with `seneca.util.Jsonic`. The package has no runtime dependencies.
* Tests migrated from lab 22 to `node:test`; every test closes its
  instances and uses its own ports. `npm test` runs with
  `--test-force-exit` because seneca 4.0.0-rc5 does not run the close
  hooks that seneca-transport 8.3 uses for its listeners (with seneca
  4.0.0 the suite exits without the flag).
* Node.js 24 is the default target (Node.js 22 also tested); `engines.node`
  is `>=18`. Removed the Travis CI configuration and the coveralls
  script; the CI workflow update is provided in `.patches/`.
* Versions up to 1.2.0 were published as `seneca-balance-client`; from
  this version the package is `@seneca/balance-client`. The package now
  includes the documentation, the examples and this change log.
* Examples updated for Seneca 4. Documentation reorganized following the
  Diátaxis structure (see `docs/`), with runnable programs in
  `docs/examples/`.

## 0.6.0 26-08-2016

* Updated dependencies
* Added Seneca 3 and Node 6 support
* Dropped Node 0.10, 0.12, 5 support
