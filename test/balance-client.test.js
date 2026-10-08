/* MIT License. Copyright (c) 2017-2026, Richard Rodger and other contributors. */
'use strict'

const { describe, it: node_it } = require('node:test')
const Assert = require('node:assert')

const Seneca = require('seneca')

const tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)
const it = make_it()

const BalanceClient = require('..')

describe('#balance-client', function() {
  it('nextgen-ordering', function(fin) {
    var s0, c0, s1, s2, c1

    s0 = Seneca({ tag: 's0' })
      .test(fin)
      .use('seneca-transport')
      .add('a:1', function a1(msg, reply) {
        reply({ x: 'a' })
      })
      .add('a:1,b:1', function a1b1(msg, reply) {
        reply({ x: 'ab' })
      })
      .add('c:1', function c1(msg, reply) {
        reply({ x: 'c' })
      })
      .add('c:1,d:1', function c1d1(msg, reply) {
        reply({ x: 'cd' })
      })
      .listen(44470)

    c0 = Seneca({ tag: 'c0' })
      .test(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44470, pin: 'a:1' })
      .client({ type: 'balance', pin: 'a:1,b:1' })
      .client({ port: 44470, pin: 'a:1,b:1' })
      .client({ type: 'balance', pin: 'c:1,d:1' })
      .client({ port: 44470, pin: 'c:1,d:1' })
      .client({ type: 'balance', pin: 'c:1' })
      .client({ port: 44470, pin: 'c:1' })

    s1 = Seneca({ tag: 's1' })
      .test(fin)
      .use('seneca-transport')
      .listen(47000)
      .add('a:1', function a1(msg, reply) {
        reply({ a: 1 })
      })

    s2 = Seneca({ tag: 's2' })
      .test(fin)
      .use('seneca-transport')
      .listen(47001)
      .add('a:1,b:1', function a1b1(msg, reply) {
        reply({ a: 1, b: 1 })
      })

    c1 = Seneca({ tag: 'c1' })
      .test(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 47000, pin: 'a:1' })
      .client({ type: 'balance', pin: 'a:1,b:1' })
      .client({ port: 47001, pin: 'a:1,b:1' })

    s0.ready(
      c0.ready.bind(c0, function() {
        var i = 0

        this.act('a:1', function(ignore, out) {
          Assert.deepStrictEqual(out, { x: 'a' })
          i++
        })
          .act('c:1', function(ignore, out) {
            Assert.deepStrictEqual(out, { x: 'c' })
            i++
          })
          .act('a:1,b:1', function(ignore, out) {
            Assert.deepStrictEqual(out, { x: 'ab' })
            i++
          })
          .act('c:1,d:1', function(ignore, out) {
            Assert.deepStrictEqual(out, { x: 'cd' })
            i++
          })
          .ready(function() {
            Assert.strictEqual(i, 4)

            close(s1s2c0, 55, s0, c0)
          })
      })
    )

    function s1s2c0() {
      s1.ready(
        s2.ready.bind(
          s2,
          c1.ready.bind(c1, function() {
            var i = 0
            this.act('a:1', function(ignore, out) {
              Assert.deepStrictEqual(out, { a: 1 })
              i++
            })
              .act('a:1,b:1', function(ignore, out) {
                Assert.deepStrictEqual(out, { a: 1, b: 1 })
                i++
              })
              .ready(function() {
                Assert.strictEqual(i, 2)

                close(fin, 55, s1, s2, c1)
              })
          })
        )
      )
    }
  })

  it('nextgen-basic-consume', function(fin) {
    var s0, c0

    s0 = Seneca({ tag: 's0' })
      .test(fin)
      .use('seneca-transport')
      .add('a:1', function(msg, reply) {
        reply({ x: 1 + msg.x })
      })
      .add('a:2', function(msg, reply) {
        reply([msg.x, msg.y])
      })
      .listen(44460)

    c0 = Seneca({ tag: 'c0' })
      .test(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:*', model: 'consume' })
      .client({ port: 44460, pin: 'a:*' })

    s0.ready(
      c0.ready.bind(c0, function() {
        c0.act('a:1,x:2', function(ignore, out) {
          Assert.strictEqual(out.x, 3)

          c0.act('a:2,x:4,y:5', function(ignore, out) {
            Assert.deepStrictEqual(out, [4, 5])

            close(fin, 55, s0, c0)
          })
        })
      })
    )
  })

  it('nextgen-multi-model', function(fin) {
    var s0,
      s1,
      c0,
      tmp = { s0: 0, s1: 0 }

    s0 = Seneca({ id$: 's0' })
      .test(fin)
      .use('seneca-transport')
      .add('a:1', function a1(msg, reply) {
        reply({ x: 1 + msg.x })
      })
      .add('a:2', function a2s0(msg, reply) {
        tmp.s0++
        reply()
      })
      .listen(44570)

    s1 = Seneca({ id$: 's1' })
      .test(fin)
      .use('seneca-transport')
      .add('a:2', function a2s1(msg, reply) {
        tmp.s1++
        reply()
      })
      .listen(44571)

    c0 = Seneca({ id$: 'c0' })
      .test(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1', model: 'consume' })
      .client({ port: 44570, pin: 'a:1' })
      .client({ type: 'balance', pin: 'a:2', model: 'observe' })
      .client({ port: 44570, pin: 'a:2' })
      .client({ port: 44571, pin: 'a:2' })

    s0.ready(
      s1.ready.bind(
        s1,
        c0.ready.bind(c0, function() {
          c0.gate()
            .act('a:1,x:2', function(ignore, out) {
              Assert.strictEqual(out.x, 3)
            })
            .act('a:2')
            .act('a:2')
            .ready(function() {
              Assert.strictEqual(tmp.s0, 2)
              Assert.strictEqual(tmp.s1, 2)

              close(fin, 55, s0, s1, c0)
            })
        })
      )
    )
  })

  it('happy', function(fin) {
    var s0 = Seneca({ tag: 's0' })
      .test(fin)
      .use('seneca-transport')
      .listen(44440)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })

    var s1 = Seneca({ tag: 's1' })
      .test(fin)
      .use('seneca-transport')
      .listen(44441)
      .add('a:1', function(msg, reply) {
        reply({ x: 1 })
      })

    var c0 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44440, pin: 'a:1' })
      .client({ port: 44441, pin: 'a:1' })

    s0.ready(
      s1.ready.bind(s1, function() {
        c0.gate()
          .act('a:1', function(e, o) {
            Assert.strictEqual(o.x, 0)
          })
          .act('a:1', function(e, o) {
            Assert.strictEqual(o.x, 1)
          })
          .act('a:1', function(e, o) {
            Assert.strictEqual(o.x, 0)

            close(fin, 55, s0, s1, c0)
          })
      })
    )
  })

  it('readme', { timeout: 3333 }, function(fin) {
    function make_server(tag, port, fin) {
      return Seneca({ id$: tag })
        .test(fin)
        .use('seneca-transport')
        .listen({
          port: function() {
            return port
          }
        })
        .add('a:1', function(msg, done) {
          done({ a: 1, p: port })
        })
    }

    var s0 = make_server('s0', '47100', fin)
    var s1 = make_server('s1', '47101', fin)

    s0.ready(
      s1.ready.bind(s1, function() {
        var c0 = Seneca({ id$: 'c0' })
          .test(fin)
          .use('seneca-transport')
          .use(BalanceClient, {
            debug: { client_updates: true }
          })
          .client({ type: 'balance' })
          .client({ port: 47100 })
          .client({ port: 47101 })
          .ready(function() {
            this.gate()
              .act(
                { role: 'transport', type: 'balance', get: 'target-map' },
                function(err, out) {
                  Assert.strictEqual(out[''][''].targets.length, 2)
                }
              )
              .act('a:1', function(e, o) {
                Assert.strictEqual(o.p, '47100')
              })
              .act('a:1', function(e, o) {
                Assert.strictEqual(o.p, '47101')
              })
              .act('a:1', function(e, o) {
                Assert.strictEqual(o.p, '47100')
              })
              .act('a:1', function(e, o) {
                Assert.strictEqual(o.p, '47101')

                // Close the client before the services. With seneca 4.0.0 and
                // seneca-transport 8.3, closing an instance that has catch-all
                // clients sends role:seneca,cmd:close through them, which
                // fails if the services are already closed.
                close(fin, 55, c0, s0, s1)
              })
          })
      })
    )
  })

  it('add-remove', function(fin) {
    var s0 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .listen(44480)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })

    var s1 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .listen(44481)
      .add('a:1', function(msg, reply) {
        reply({ x: 1 })
      })

    var c0 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })

    s0.ready(function() {
      s1.ready(function() {
        c0.act(
          'role:transport,type:balance,add:client',
          { config: { port: 44480, pin: 'a:1' } },
          function() {
            c0.act('a:1', function(e, o) {
              Assert.strictEqual(o.x, 0)

              c0.act(
                'role:transport,type:balance,add:client',
                { config: { port: 44481, pin: 'a:1' } },
                function() {
                  c0.act('a:1', function(e, o) {
                    Assert.strictEqual(o.x, 0)

                    c0.act('a:1', function(e, o) {
                      Assert.strictEqual(o.x, 1)

                      c0.act(
                        'role:transport,type:balance,remove:client',
                        { config: { port: 44481, pin: 'a:1' } },
                        function() {
                          c0.act('a:1', function(e, o) {
                            Assert.strictEqual(o.x, 0)

                            c0.act('a:1', function(e, o) {
                              Assert.strictEqual(o.x, 0)

                              close(fin, 55, s0, s1, c0)
                            })
                          })
                        }
                      )
                    })
                  })
                }
              )
            })
          }
        )
      })
    })
  })

  it("doesn't remove when no match is found", function(fin) {
    var s0 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .listen(44490)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })
      .ready(function() {
        var s1 = Seneca()
          .test(fin)
          .use('seneca-transport')
          .listen(44491)
          .add('a:1', function(msg, reply) {
            reply({ x: 1 })
          })
          .ready(function() {
            var c0 = Seneca()
              .test(fin)
              .use('seneca-transport')
              .use(BalanceClient)
              .client({ type: 'balance', pin: 'a:1' })
              .act(
                'role:transport,type:balance,add:client',
                { config: { port: 44490, pin: 'a:1' } },
                function() {
                  c0.act('a:1', function(e, o) {
                    Assert.strictEqual(o.x, 0)

                    c0.act(
                      'role:transport,type:balance,add:client',
                      { config: { port: 44491, pin: 'a:1' } },
                      function() {
                        c0.act('a:1', function(e, o) {
                          Assert.strictEqual(o.x, 0)

                          c0.act('a:1', function(e, o) {
                            Assert.strictEqual(o.x, 1)

                            c0.act(
                              'role:transport,type:balance,remove:client',
                              { config: { port: 44490, pin: 'a:5' } },
                              function() {
                                c0.act('a:1', function(e, o) {
                                  Assert.strictEqual(o.x, 0)

                                  c0.act('a:1', function(e, o) {
                                    Assert.strictEqual(o.x, 1)

                                    close(fin, 55, s0, s1, c0)
                                  })
                                })
                              }
                            )
                          })
                        })
                      }
                    )
                  })
                }
              )
          })
      })
  })

  it('uses a custom id when adding and removing clients', function(fin) {
    var s0 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .listen(44500)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })
      .ready(function() {
        var s1 = Seneca()
          .test(fin)
          .use('seneca-transport')
          .listen(44501)
          .add('a:1', function(msg, reply) {
            reply({ x: 1 })
          })
          .ready(function() {
            var c0 = Seneca()
              .test(fin)
              .use('seneca-transport')
              .use(BalanceClient)
              .client({ type: 'balance', pin: 'a:1' })
              .act(
                'role:transport,type:balance,add:client',
                { config: { port: 44500, pin: 'a:1', id: 'foo' } },
                function() {
                  c0.act('a:1', function(e, o) {
                    Assert.strictEqual(o.x, 0)

                    c0.act(
                      'role:transport,type:balance,add:client',
                      { config: { port: 44501, pin: 'a:1', id: 'bar' } },
                      function() {
                        c0.act('a:1', function(e, o) {
                          Assert.strictEqual(o.x, 0)

                          c0.act('a:1', function(e, o) {
                            Assert.strictEqual(o.x, 1)

                            c0.act(
                              'role:transport,type:balance,remove:client',
                              { config: { id: 'bar', pin: 'a:1' } },
                              function() {
                                c0.act('a:1', function(e, o) {
                                  Assert.strictEqual(o.x, 0)

                                  c0.act('a:1', function(e, o) {
                                    Assert.strictEqual(o.x, 0)

                                    close(fin, 55, s0, s1, c0)
                                  })
                                })
                              }
                            )
                          })
                        })
                      }
                    )
                  })
                }
              )
          })
      })
  })

  it('no-target-error', function(fin) {
    var c0 = Seneca()
      .quiet()
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .act('a:1', function(e) {
        Assert.ok(e)
        Assert.strictEqual(e.code, 'no-target')
        close(fin, 55, c0)
      })
  })

  it('no-current-target-error', function(fin) {
    var c0 = Seneca({ log: 'silent' })
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ pin: 'a:1', port: 55555 })
      .ready(function() {
        this.act(
          'role:transport,type:balance,remove:client',
          { config: { pin: 'a:1', port: 55555 } },
          function(e) {
            Assert.ok(!e)
            this.act('a:1', function(e) {
              Assert.ok(e)
              Assert.strictEqual(e.code, 'no-current-target')
              close(fin, 55, c0)
            })
          }
        )
      })
  })

  it('supports model option', function(fin) {
    var s0 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .listen(44510)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })
      .ready(function() {
        var s1 = Seneca()
          .test(fin)
          .use('seneca-transport')
          .listen(44511)
          .add('a:1', function(msg, reply) {
            reply({ x: 1 })
          })
          .ready(function() {
            var c0 = Seneca()
              .test(fin)
              .use('seneca-transport')
              .use(BalanceClient, { model: 'consume' })
              .client({ type: 'balance', pin: 'a:1' })
              .client({ port: 44510, pin: 'a:1' })
              .client({ port: 44511, pin: 'a:1' })
              .act('a:1', function(e, o) {
                Assert.strictEqual(o.x, 0)

                c0.act('a:1', function(e, o) {
                  Assert.strictEqual(o.x, 1)

                  c0.act('a:1', function(e, o) {
                    Assert.strictEqual(o.x, 0)

                    close(fin, 55, s0, s1, c0)
                  })
                })
              })
          })
      })
  })

  it('supports observe model option', function(fin) {
    var t = {}
    var s0
    var s1
    var c0

    s0 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .listen(44520)
      .add('a:1', function(m, d) {
        t.x = 1
        d()
        check()
      })

    s1 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .listen(44521)
      .add('a:1', function(m, d) {
        t.y = 1
        d()
        check()
      })

    c0 = Seneca({ tag: 'c0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1', model: 'observe' })
      .client({ port: 44520, pin: 'a:1' })
      .client({ port: 44521, pin: 'a:1' })

    s0.ready(function() {
      s1.ready(function() {
        c0.ready(function() {
          c0.act('a:1,z:1')
        })
      })
    })

    function check() {
      if (1 === t.x && 1 === t.y) {
        close(fin, 55, s0, s1, c0)
      }
    }
  })

  it('multiple-client-calls', function(fin) {
    var s0 = Seneca()
      .test(fin)
      .use('seneca-transport')
      .listen(44530)
      .listen(44540)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })
      .add('b:1', function(msg, reply) {
        reply({ y: 0 })
      })
      .ready(function() {
        var s1 = Seneca()
          .test(fin)
          .use('seneca-transport')
          .listen(44531)
          .listen(44541)
          .add('a:1', function(msg, reply) {
            reply({ x: 1 })
          })
          .add('b:1', function(msg, reply) {
            reply({ y: 1 })
          })
          .ready(function() {
            var c0 = Seneca()
              .test(fin)
              .use('seneca-transport')
              .use(BalanceClient)
              .client({ type: 'balance', pin: 'a:1' })
              .client({ port: 44530, pin: 'a:1' })
              .client({ port: 44531, pin: 'a:1' })
              .client({ type: 'balance', pin: 'b:1' })
              .client({ port: 44540, pin: 'b:1' })
              .client({ port: 44541, pin: 'b:1' })
              .act('a:1', function(e, o) {
                Assert.strictEqual(0, o.x)

                c0.act('a:1', function(e, o) {
                  Assert.strictEqual(1, o.x)

                  c0.act('a:1', function(e, o) {
                    Assert.strictEqual(0, o.x)

                    c0.act('b:1', function(e, o) {
                      Assert.strictEqual(0, o.y)

                      c0.act('b:1', function(e, o) {
                        Assert.strictEqual(1, o.y)

                        c0.act('b:1', function(e, o) {
                          Assert.strictEqual(0, o.y)

                          close(fin, 55, s0, s1, c0)
                        })
                      })
                    })
                  })
                })
              })
          })
      })
  })

  it('fire-and-forget', function(fin) {
    var t = {}
    var s0, s1, c0

    s0 = Seneca({ tag: 's0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use('seneca-transport')
      .listen(44550)
      .add('a:1', function(m, d) {
        t.x = 1
        d()
      })

    s1 = Seneca({ tag: 's1', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use('seneca-transport')
      .listen(44551)
      .add('a:1', function(m, d) {
        t.y = 1
        d()
      })

    c0 = Seneca({ tag: 'c0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1', model: 'observe' })
      .client({ port: 44550, pin: 'a:1' })
      .client({ port: 44551, pin: 'a:1' })

    s0.ready(
      s1.ready.bind(
        s1,
        c0.ready.bind(c0, function() {
          c0.act('a:1')

          setTimeout(function() {
            Assert.strictEqual(t.x, 1)
            Assert.strictEqual(t.y, 1)

            close(fin, 55, s0, s1, c0)
          }, 111)
        })
      )
    )
  })

  it('multiple-clients', function(fin) {
    var t = { x: 0, y: 0 }
    var s0, s1, c0, c1, c2

    s0 = Seneca({ tag: 's0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use('seneca-transport')
      .listen(44560)
      .add('a:1', function(m, d) {
        t.x++
        d(null, { x: t.x })
      })

    s1 = Seneca({ tag: 's1', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use('seneca-transport')
      .listen(44561)
      .add('a:1', function(m, d) {
        t.y++
        d(null, { y: t.y })
      })

    c0 = Seneca({ tag: 'c0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44560, pin: 'a:1' })
      .client({ port: 44561, pin: 'a:1' })

    c1 = Seneca({ tag: 'c1', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44560, pin: 'a:1' })
      .client({ port: 44561, pin: 'a:1' })

    c2 = Seneca({ tag: 'c2', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use('seneca-transport')
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44560, pin: 'a:1' })
      .client({ port: 44561, pin: 'a:1' })

    s0.ready(
      s1.ready.bind(
        s1,
        c0.ready.bind(
          c0,
          c1.ready.bind(
            c1,
            c2.ready.bind(c2, setTimeout.bind(null, do_maps, 111))
          )
        )
      )
    )

    function do_maps() {
      c0.act('role:transport,type:balance,get:target-map,pg:"a:1"', function(
        err,
        c0map
      ) {
        if (err) return fin(err)

        c1.act('role:transport,type:balance,get:target-map,pg:"a:1"', function(
          err,
          c1map
        ) {
          if (err) return fin(err)

          c2.act(
            'role:transport,type:balance,get:target-map,pg:"a:1"',
            function(err, c2map) {
              if (err) return fin(err)

              Assert.strictEqual(c0map['a:1'].targets.length, 2)
              Assert.strictEqual(c1map['a:1'].targets.length, 2)
              Assert.strictEqual(c2map['a:1'].targets.length, 2)

              do_test()
            }
          )
        })
      })
    }

    function do_test() {
      c0.act('a:1', function(e, o) {
        Assert.strictEqual(o.x, 1)
        Assert.strictEqual(t.x, 1)
        Assert.strictEqual(t.y, 0)

        c0.act('a:1', function(e, o) {
          Assert.strictEqual(o.y, 1)
          Assert.strictEqual(t.x, 1)
          Assert.strictEqual(t.y, 1)

          close(fin, 55, s0, s1, c0, c1, c2)
        })
      })
    }
  })
})

// Close each instance in turn, then wait a little before finishing.
function close() {
  var fin = arguments[0]
  var delay = arguments[1]
  var instances = Array.prototype.slice.call(arguments, 2)

  close_instance(0)
  function close_instance(index) {
    if (instances.length <= index) {
      setTimeout(fin, delay * tmx)
    } else {
      instances[index].close(function(err) {
        if (err) return fin(err)
        close_instance(index + 1)
      })
    }
  }
}

// Adapts the `function (fin)` test signature (call fin() when done, fin(err)
// on failure) to the node:test runner. node:test has no default per-test
// timeout; lab used 2 seconds.
function make_it() {
  var default_timeout = 11111 * tmx

  return function it(name, opts, func) {
    if ('function' === typeof opts) {
      func = opts
      opts = {}
    }

    var options = Object.assign({ timeout: default_timeout }, opts)

    node_it(name, options, function(t, fin) {
      func(fin)
    })
  }
}
