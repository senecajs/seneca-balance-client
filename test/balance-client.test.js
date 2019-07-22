/* MIT License. Copyright (c) 2017-2019, Richard Rodger and other contributors. */
'use strict'

var Util = require('util')

var Lab = require('@hapi/lab')
var Code = require('code')
var Seneca = require('seneca')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = make_it(lab)
var expect = Code.expect

var tmx = parseInt(process.env.TIMEOUT_MULTIPLIER || 1, 10)
var BalanceClient = require('..')

describe('#balance-client', function() {
  it('nextgen-ordering', { parallel: false }, function(fin) {
    var s0, c0, s1, s2, c1

    s0 = Seneca({ tag: 's0', legacy: { transport: false } })
      .test(fin)
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

    c0 = Seneca({ tag: 'c0', legacy: { transport: false } })
      .test(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44470, pin: 'a:1' })
      .client({ type: 'balance', pin: 'a:1,b:1' })
      .client({ port: 44470, pin: 'a:1,b:1' })
      .client({ type: 'balance', pin: 'c:1,d:1' })
      .client({ port: 44470, pin: 'c:1,d:1' })
      .client({ type: 'balance', pin: 'c:1' })
      .client({ port: 44470, pin: 'c:1' })

    s1 = Seneca({ tag: 's1', legacy: { transport: false } })
      .test(fin)
      .listen(47000)
      .add('a:1', function a1(msg, reply) {
        reply({ a: 1 })
      })

    s2 = Seneca({ tag: 's2', legacy: { transport: false } })
      .test(fin)
      .listen(47001)
      .add('a:1,b:1', function a1b1(msg, reply) {
        reply({ a: 1, b: 1 })
      })

    c1 = Seneca({ tag: 'c1', legacy: { transport: false } })
      .test(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 47000, pin: 'a:1' })
      .client({ type: 'balance', pin: 'a:1,b:1' })
      .client({ port: 47001, pin: 'a:1,b:1' })

    s0.ready(
      c0.ready.bind(c0, function() {
        var i = 0

        this.act('a:1', function(ignore, out) {
          expect(out).equal({ x: 'a' })
          i++
        })
          .act('c:1', function(ignore, out) {
            expect(out).equal({ x: 'c' })
            i++
          })
          .act('a:1,b:1', function(ignore, out) {
            expect(out).equal({ x: 'ab' })
            i++
          })
          .act('c:1,d:1', function(ignore, out) {
            expect(out).equal({ x: 'cd' })
            i++
          })
          .ready(function() {
            expect(i).equal(4)

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
              expect(out).equal({ a: 1 })
              i++
            })
              .act('a:1,b:1', function(ignore, out) {
                expect(out).equal({ a: 1, b: 1 })
                i++
              })
              .ready(function() {
                expect(i).equal(2)

                close(fin, 55, s1, s2, c1)
              })
          })
        )
      )
    }
  })

  it('nextgen-basic-consume', { parallel: false }, function(fin) {
    var s0, c0

    s0 = Seneca({ tag: 's0', legacy: { transport: false } })
      .test(fin)
      .add('a:1', function(msg, reply) {
        reply({ x: 1 + msg.x })
      })
      .add('a:2', function(msg, reply) {
        reply([msg.x, msg.y])
      })
      .listen(44460)

    c0 = Seneca({ tag: 'c0', legacy: { transport: false } })
      .test(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:*', model: 'consume' })
      .client({ port: 44460, pin: 'a:*' })

    s0.ready(
      c0.ready.bind(c0, function() {
        c0.act('a:1,x:2', function(ignore, out) {
          expect(out.x).equal(3)

          c0.act('a:2,x:4,y:5', function(ignore, out) {
            expect(out).equal([4, 5])

            close(fin, 55, s0, c0)
          })
        })
      })
    )
  })

  it('nextgen-multi-model', { parallel: false }, function(fin) {
    var s0,
      s1,
      c0,
      tmp = { s0: 0, s1: 0 }

    s0 = Seneca({ id$: 's0', legacy: { transport: false } })
      .test(fin)
      .add('a:1', function a1(msg, reply) {
        reply({ x: 1 + msg.x })
      })
      .add('a:2', function a2s0(msg, reply) {
        tmp.s0++
        reply()
      })
      .listen(44570)

    s1 = Seneca({ id$: 's1', legacy: { transport: false } })
      .test(fin)
      .add('a:2', function a2s1(msg, reply) {
        tmp.s1++
        reply()
      })
      .listen(44571)

    c0 = Seneca({ id$: 'c0', legacy: { transport: false } })
      .test(fin)
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
              expect(out.x).equal(3)
            })
            .act('a:2')
            .act('a:2')
            .ready(function() {
              expect(tmp.s0).equal(2)
              expect(tmp.s1).equal(2)

              close(fin, 55, s0, s1, c0)
            })
        })
      )
    )
  })

  it('happy', { parallel: false }, function(fin) {
    var s0 = Seneca({ tag: 's0' })
      .test(fin)
      .listen(44440)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })

    var s1 = Seneca({ tag: 's1' })
      .test(fin)
      .listen(44441)
      .add('a:1', function(msg, reply) {
        reply({ x: 1 })
      })

    var c0 = Seneca()
      .test(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44440, pin: 'a:1' })
      .client({ port: 44441, pin: 'a:1' })

    s0.ready(
      s1.ready.bind(s1, function() {
        c0.gate()
          .act('a:1', function(e, o) {
            expect(o.x).to.equal(0)
          })
          .act('a:1', function(e, o) {
            expect(o.x).to.equal(1)
          })
          .act('a:1', function(e, o) {
            expect(o.x).to.equal(0)

            close(fin, 55, s0, s1, c0)
          })
      })
    )
  })

  it('readme', { parallel: false, timeout: 3333 }, function(fin) {
    function make_server(tag, port, fin) {
      return Seneca({ id$: tag, legacy: { transport: false } })
        .test(fin)
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
        Seneca({ id$: 'c0', legacy: { transport: false } })
          .test(fin)
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
                  expect(out[''][''].targets.length).equal(2)
                }
              )
              .act('a:1', function(e, o) {
                expect(o.p).to.equal('47100')
              })
              .act('a:1', function(e, o) {
                expect(o.p).to.equal('47101')
              })
              .act('a:1', function(e, o) {
                expect(o.p).to.equal('47100')
              })
              .act('a:1', function(e, o) {
                expect(o.p).to.equal('47101')

                fin()
              })
          })
      })
    )
  })

  it('add-remove', { parallel: false }, function(fin) {
    var s0 = Seneca()
      .test(fin)
      .listen(44440)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })

    var s1 = Seneca()
      .test(fin)
      .listen(44441)
      .add('a:1', function(msg, reply) {
        reply({ x: 1 })
      })

    var c0 = Seneca()
      .test(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })

    s0.ready(function() {
      s1.ready(function() {
        c0.act(
          'role:transport,type:balance,add:client',
          { config: { port: 44440, pin: 'a:1' } },
          function() {
            c0.act('a:1', function(e, o) {
              expect(o.x).to.equal(0)

              c0.act(
                'role:transport,type:balance,add:client',
                { config: { port: 44441, pin: 'a:1' } },
                function() {
                  c0.act('a:1', function(e, o) {
                    expect(o.x).to.equal(0)

                    c0.act('a:1', function(e, o) {
                      expect(o.x).to.equal(1)

                      c0.act(
                        'role:transport,type:balance,remove:client',
                        { config: { port: 44441, pin: 'a:1' } },
                        function() {
                          c0.act('a:1', function(e, o) {
                            expect(o.x).to.equal(0)

                            c0.act('a:1', function(e, o) {
                              expect(o.x).to.equal(0)

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

  it("doesn't remove when no match is found", { parallel: false }, function(
    fin
  ) {
    var s0 = Seneca()
      .test(fin)
      .listen(44440)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })
      .ready(function() {
        var s1 = Seneca()
          .test(fin)
          .listen(44441)
          .add('a:1', function(msg, reply) {
            reply({ x: 1 })
          })
          .ready(function() {
            var c0 = Seneca()
              .test(fin)
              .use(BalanceClient)
              .client({ type: 'balance', pin: 'a:1' })
              .act(
                'role:transport,type:balance,add:client',
                { config: { port: 44440, pin: 'a:1' } },
                function() {
                  c0.act('a:1', function(e, o) {
                    expect(o.x).to.equal(0)

                    c0.act(
                      'role:transport,type:balance,add:client',
                      { config: { port: 44441, pin: 'a:1' } },
                      function() {
                        c0.act('a:1', function(e, o) {
                          expect(o.x).to.equal(0)

                          c0.act('a:1', function(e, o) {
                            expect(o.x).to.equal(1)

                            c0.act(
                              'role:transport,type:balance,remove:client',
                              { config: { port: 44440, pin: 'a:5' } },
                              function() {
                                c0.act('a:1', function(e, o) {
                                  expect(o.x).to.equal(0)

                                  c0.act('a:1', function(e, o) {
                                    expect(o.x).to.equal(1)

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
      .listen(44440)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })
      .ready(function() {
        var s1 = Seneca()
          .test(fin)
          .listen(44441)
          .add('a:1', function(msg, reply) {
            reply({ x: 1 })
          })
          .ready(function() {
            var c0 = Seneca()
              .test(fin)
              .use(BalanceClient)
              .client({ type: 'balance', pin: 'a:1' })
              .act(
                'role:transport,type:balance,add:client',
                { config: { port: 44440, pin: 'a:1', id: 'foo' } },
                function() {
                  c0.act('a:1', function(e, o) {
                    expect(o.x).to.equal(0)

                    c0.act(
                      'role:transport,type:balance,add:client',
                      { config: { port: 44441, pin: 'a:1', id: 'bar' } },
                      function() {
                        c0.act('a:1', function(e, o) {
                          expect(o.x).to.equal(0)

                          c0.act('a:1', function(e, o) {
                            expect(o.x).to.equal(1)

                            c0.act(
                              'role:transport,type:balance,remove:client',
                              { config: { id: 'bar', pin: 'a:1' } },
                              function() {
                                c0.act('a:1', function(e, o) {
                                  expect(o.x).to.equal(0)

                                  c0.act('a:1', function(e, o) {
                                    expect(o.x).to.equal(0)

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
        expect(e).to.exist()
        expect(e.code).to.equal('no-target')
        close(fin, 55, c0)
      })
  })

  it('no-current-target-error', function(fin) {
    var c0 = Seneca({ log: 'silent' })
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ pin: 'a:1', port: 55555 })
      .ready(function() {
        this.act(
          'role:transport,type:balance,remove:client',
          { config: { pin: 'a:1', port: 55555 } },
          function(e) {
            expect(e).to.not.exist()
            this.act('a:1', function(e) {
              expect(e).to.exist()
              expect(e.code).to.equal('no-current-target')
              close(fin, 55, c0)
            })
          }
        )
      })
  })

  it('supports model option', { parallel: false }, function(fin) {
    var s0 = Seneca()
      .test(fin)
      .listen(44440)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })
      .ready(function() {
        var s1 = Seneca()
          .test(fin)
          .listen(44441)
          .add('a:1', function(msg, reply) {
            reply({ x: 1 })
          })
          .ready(function() {
            var c0 = Seneca()
              .test(fin)
              .use(BalanceClient, { model: 'consume' })
              .client({ type: 'balance', pin: 'a:1' })
              .client({ port: 44440, pin: 'a:1' })
              .client({ port: 44441, pin: 'a:1' })
              .act('a:1', function(e, o) {
                expect(o.x).to.equal(0)

                c0.act('a:1', function(e, o) {
                  expect(o.x).to.equal(1)

                  c0.act('a:1', function(e, o) {
                    expect(o.x).to.equal(0)

                    close(fin, 55, s0, s1, c0)
                  })
                })
              })
          })
      })
  })

  it('supports observe model option', { parallel: false }, function(fin) {
    var t = {}
    var s0
    var s1
    var c0

    s0 = Seneca()
      .test(fin)
      .listen(44440)
      .add('a:1', function(m, d) {
        t.x = 1
        d()
        check()
      })

    s1 = Seneca()
      .test(fin)
      .listen(44441)
      .add('a:1', function(m, d) {
        t.y = 1
        d()
        check()
      })

    c0 = Seneca({ tag: 'c0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1', model: 'observe' })
      .client({ port: 44440, pin: 'a:1' })
      .client({ port: 44441, pin: 'a:1' })

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

  it('multiple-client-calls', { parallel: false }, function(fin) {
    var s0 = Seneca()
      .test(fin)
      .listen(44440)
      .listen(44450)
      .add('a:1', function(msg, reply) {
        reply({ x: 0 })
      })
      .add('b:1', function(msg, reply) {
        reply({ y: 0 })
      })
      .ready(function() {
        var s1 = Seneca()
          .test(fin)
          .listen(44441)
          .listen(44451)
          .add('a:1', function(msg, reply) {
            reply({ x: 1 })
          })
          .add('b:1', function(msg, reply) {
            reply({ y: 1 })
          })
          .ready(function() {
            var c0 = Seneca()
              .test(fin)
              .use(BalanceClient)
              .client({ type: 'balance', pin: 'a:1' })
              .client({ port: 44440, pin: 'a:1' })
              .client({ port: 44441, pin: 'a:1' })
              .client({ type: 'balance', pin: 'b:1' })
              .client({ port: 44450, pin: 'b:1' })
              .client({ port: 44451, pin: 'b:1' })
              .act('a:1', function(e, o) {
                expect(0).to.equal(o.x)

                c0.act('a:1', function(e, o) {
                  expect(1).to.equal(o.x)

                  c0.act('a:1', function(e, o) {
                    expect(0).to.equal(o.x)

                    c0.act('b:1', function(e, o) {
                      expect(0).to.equal(o.y)

                      c0.act('b:1', function(e, o) {
                        expect(1).to.equal(o.y)

                        c0.act('b:1', function(e, o) {
                          expect(0).to.equal(o.y)

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

  it('fire-and-forget', { parallel: false }, function(fin) {
    var t = {}
    var s0, s1, c0

    s0 = Seneca({ tag: 's0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .listen(44440)
      .add('a:1', function(m, d) {
        t.x = 1
        d()
      })

    s1 = Seneca({ tag: 's1', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .listen(44441)
      .add('a:1', function(m, d) {
        t.y = 1
        d()
      })

    c0 = Seneca({ tag: 'c0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1', model: 'observe' })
      .client({ port: 44440, pin: 'a:1' })
      .client({ port: 44441, pin: 'a:1' })

    s0.ready(
      s1.ready.bind(
        s1,
        c0.ready.bind(c0, function() {
          c0.act('a:1')

          setTimeout(function() {
            expect(t.x).to.equal(1)
            expect(t.y).to.equal(1)

            close(fin, 55, s0, s1, c0)
          }, 111)
        })
      )
    )
  })

  it('multiple-clients', { parallel: false }, function(fin) {
    var t = { x: 0, y: 0 }
    var s0, s1, c0, c1, c2

    s0 = Seneca({ tag: 's0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .listen(44450)
      .add('a:1', function(m, d) {
        t.x++
        d(null, { x: t.x })
      })

    s1 = Seneca({ tag: 's1', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .listen(44451)
      .add('a:1', function(m, d) {
        t.y++
        d(null, { y: t.y })
      })

    c0 = Seneca({ tag: 'c0', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44450, pin: 'a:1' })
      .client({ port: 44451, pin: 'a:1' })

    c1 = Seneca({ tag: 'c1', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44450, pin: 'a:1' })
      .client({ port: 44451, pin: 'a:1' })

    c2 = Seneca({ tag: 'c2', log: 'silent', debug: { short_logs: true } })
      .error(fin)
      .use(BalanceClient)
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44450, pin: 'a:1' })
      .client({ port: 44451, pin: 'a:1' })

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

              expect(c0map['a:1'].targets.length).to.equal(2)
              expect(c1map['a:1'].targets.length).to.equal(2)
              expect(c2map['a:1'].targets.length).to.equal(2)

              do_test()
            }
          )
        })
      })
    }

    function do_test() {
      c0.act('a:1', function(e, o) {
        expect(o.x).to.equal(1)
        expect(t.x).to.equal(1)
        expect(t.y).to.equal(0)

        c0.act('a:1', function(e, o) {
          expect(o.y).to.equal(1)
          expect(t.x).to.equal(1)
          expect(t.y).to.equal(1)

          fin()
        })
      })
    }
  })
})

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

function make_it(lab) {
  return function it(name, opts, func) {
    if ('function' === typeof opts) {
      func = opts
      opts = {}
    }

    lab.it(
      name,
      opts,
      Util.promisify(function(x, fin) {
        func(fin)
      })
    )
  }
}
