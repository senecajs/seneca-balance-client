# Errors reference

The plugin defines two error codes. Its errors are Seneca errors:
`err.code` holds the code, `err.message` is `seneca: <code>`, and
`err.details.msg` holds the message that could not be delivered. This is
the same on Seneca 3.38 and Seneca 4.

| Code | When | What to do |
| ---- | ---- | ---------- |
| `no-target` | A message reached a balance client, but no target was ever registered for its pattern: no `client` or `add:client` with the same pin has been made. On Seneca 3, also for wrapped local actions more specific than the pin (see [Override local actions](../how-to/override-local-actions.md)). | Add a target with the same pin; check that the targets' pins are identical to the balance client's pin. |
| `no-current-target` | Targets were registered for the pattern, but all of them have been removed. | Add a target, or treat the pattern as unavailable. |

The plugin's `errors` map gives these codes the descriptions "No targets
have been registered for message" and "No targets are currently active
for message".

Errors from a target are passed through unchanged. For example, with
seneca-transport a target whose service is not running replies with an
error whose `code` is `ECONNREFUSED`; the balance client returns it to
the caller and keeps the target (see [Models](models.md#consume)).

Plugin loading fails with the Seneca error `invalid_plugin_option` when
an option is unknown or has the wrong type (Seneca 4; see
[Options](options.md)).
