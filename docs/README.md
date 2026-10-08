# @seneca/balance-client documentation

The documentation follows the [Diátaxis](https://diataxis.fr/)
structure: tutorials to learn, how-to guides for tasks, reference to
look things up, and explanations to understand the design.

## Tutorials

| Tutorial | What you build |
| -------- | -------------- |
| [Getting started](tutorials/getting-started.md) | Two copies of a service behind one balance client, with round-robin balancing. |

The programs used in the tutorial and the guides are in
[examples](examples/); each one runs on its own and exits. The two
process version of the Quick Example is in [../examples](../examples/).

## How-to guides

| Guide | Covers |
| ----- | ------ |
| [Add and remove targets at runtime](how-to/add-and-remove-targets.md) | `add:client`, `remove:client`, listing the targets. |
| [Choose a balancing model](how-to/choose-a-balancing-model.md) | `consume`, `observe`, model functions, defaults for an instance. |
| [Use custom ids](how-to/use-custom-ids.md) | Naming targets and removing them by id. |
| [Combine with pins](how-to/combine-with-pins.md) | One balance client per pin, `pins` arrays, globs, catch-all clients. |
| [Override local actions](how-to/override-local-actions.md) | Balancing messages that also have a local implementation. |
| [Shut down cleanly](how-to/shut-down-cleanly.md) | Closing, removing targets, known issues of the Seneca 4 prerelease. |
| [Migrate from Seneca 3](how-to/migrate-from-seneca-3.md) | Transport plugin, options, package name, tests. |

## Reference

| Reference | Describes |
| --------- | --------- |
| [Options](reference/options.md) | Plugin options, the option the plugin sets, balance client and target configuration. |
| [Actions](reference/messages.md) | Every action pattern: parameters, effects, replies. |
| [Models](reference/models.md) | `consume`, `observe`, and the model function signature. |
| [Errors](reference/errors.md) | The `no-target` and `no-current-target` codes. |

## Explanation

| Explanation | Topic |
| ----------- | ----- |
| [How the balance client works](explanation/how-it-works.md) | A transport client of other clients, the meaning of the models, seneca-mesh, limits. |
| [Seneca 3 and Seneca 4](explanation/seneca-3-and-4.md) | Transport, client building, closing and option validation on each version. |

## Feature index

Every option, action pattern, model and error code defined in
`balance-client.js`, with the page that specifies it and the guides
that use it. The plugin has no exports, decorations or command line
flags.

| Feature | Kind | Reference | Guides |
| ------- | ---- | --------- | ------ |
| `model` | plugin option | [Options](reference/options.md#plugin-options) | [Choose a balancing model](how-to/choose-a-balancing-model.md) |
| `balance` | plugin option | [Options](reference/options.md#plugin-options) | [Choose a balancing model](how-to/choose-a-balancing-model.md) |
| `debug.client_updates` | plugin option | [Options](reference/options.md#plugin-options) | |
| `transport.balance.makehandle` | instance option set by `preload` | [Options](reference/options.md#options-set-by-the-plugin) | [How it works](explanation/how-it-works.md#a-client-of-clients) |
| `type: 'balance'`, `pin`, `pins`, `model`, `override` | balance client configuration | [Options](reference/options.md#balance-client-configuration) | [Getting started](tutorials/getting-started.md), [Combine with pins](how-to/combine-with-pins.md), [Override local actions](how-to/override-local-actions.md) |
| `id`, `pin`, `pins` of a target | target configuration | [Options](reference/options.md#target-configuration) | [Use custom ids](how-to/use-custom-ids.md) |
| `role:transport,hook:client,type:balance` | action (transport hook) | [Actions](reference/messages.md#roletransporthookclienttypebalance) | [Getting started](tutorials/getting-started.md) |
| `role:transport,type:balance,add:client` | action | [Actions](reference/messages.md#roletransporttypebalanceaddclient) | [Add and remove targets](how-to/add-and-remove-targets.md) |
| `role:transport,type:balance,remove:client` | action | [Actions](reference/messages.md#roletransporttypebalanceremoveclient) | [Add and remove targets](how-to/add-and-remove-targets.md), [Use custom ids](how-to/use-custom-ids.md) |
| `role:transport,type:balance,get:target-map` | action | [Actions](reference/messages.md#roletransporttypebalancegettarget-map) | [Add and remove targets](how-to/add-and-remove-targets.md) |
| `sys:seneca,cmd:close` (Seneca 4), `role:seneca,cmd:close` (Seneca 3) | close step (prior) | [Actions](reference/messages.md#close-hook) | [Shut down cleanly](how-to/shut-down-cleanly.md) |
| `consume`, alias `actor` | model | [Models](reference/models.md#consume) | [Choose a balancing model](how-to/choose-a-balancing-model.md) |
| `observe`, alias `publish` | model | [Models](reference/models.md#observe) | [Choose a balancing model](how-to/choose-a-balancing-model.md) |
| Model functions `(seneca, msg, targetstate, done, meta)` | model | [Models](reference/models.md#model-functions) | [Choose a balancing model](how-to/choose-a-balancing-model.md) |
| `no-target` | error code | [Errors](reference/errors.md) | [Add and remove targets](how-to/add-and-remove-targets.md) |
| `no-current-target` | error code | [Errors](reference/errors.md) | [Add and remove targets](how-to/add-and-remove-targets.md) |

## Other documents

* [Change log](../CHANGES.md)
* [Code of conduct](../CODE_OF_CONDUCT.md)
* [License](../LICENSE)
