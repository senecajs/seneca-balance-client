/*
  MIT License,
  Copyright (c) 2015, Richard Rodger and other contributors.
*/

'use strict'

var Lab = require('lab')
var Code = require('code')
var Seneca = require('seneca')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var testopts = {log: 'silent'}


describe('#balance-client', function () {

  it('happy', { parallel: false }, function (done) {
    var s0 = Seneca(testopts).error(done)
      .listen(44440)
      .add('a:1', function () { this.good({ x: 0 }) })

      .ready(function () {
        var s1 = Seneca(testopts).error(done)
          .listen(44441)
          .add('a:1', function () { this.good({ x: 1 }) })

          .ready(function () {
            var c0 = Seneca(testopts).error(done)
              .use('..')
              .client({ type: 'balance', pin: 'a:1' })
              .client({ port: 44440, pin: 'a:1' })
              .client({ port: 44441, pin: 'a:1' })
              .act('a:1', function (e, o) {
                expect(o.x).to.equal(0)

                c0.act('a:1', function (e, o) {
                  expect(o.x).to.equal(1)

                  c0.act('a:1', function (e, o) {
                    expect(o.x).to.equal(0)

                    s0.close(function () {
                      s1.close(function () {
                        c0.close(function () {
                          done()
                        })
                      })
                    })
                  })
                })
              })
          })
      })
  })


  it('readme', { parallel: false, timeout: 3333 }, function (done) {

    function make_server (port) {
      return Seneca({log: 'test'})
        .listen({port: function () { return port }})
        .add('a:1', function (msg, done) {
          done(null, {a: 1, p: port})
        })
    }

    var s0 = make_server('47000')
    var s1 = make_server('47001')

    s0.ready(s1.ready.bind(s1, function () {
      Seneca({tag: 'c0', log: 'test', debug: {short_logs: true}})
        .use('..')

        .client( {type: 'balance'} )
        .client( {port: 47000} )
        .client( {port: 47001} )

        .ready( function () {
          this.act( 'a:1', function (e, o) {
            expect(o.p).to.equal('47000')

            this.act( 'a:1', function (e, o) {
              expect(o.p).to.equal('47001')

              this.act( 'a:1', function (e, o) {
                expect(o.p).to.equal('47000')

                this.act( 'a:1', function (e, o) {
                  expect(o.p).to.equal('47001')

                  done()
                })
              })
            })
          })
        })
    }))
  })


  it('add-remove', { parallel: false }, function (done) {
    var s0 =
          Seneca(testopts)
          .error(done)
          .listen(44440)
          .add('a:1', function () { this.good({ x: 0 }) })

    var s1 =
          Seneca(testopts)
          .error(done)
          .listen(44441)
          .add('a:1', function () { this.good({ x: 1 }) })

    var c0 =
          Seneca(testopts)
          .error(done)
          .use('..')
          .client({ type: 'balance', pin: 'a:1' })

    s0.ready(function () {
      s1.ready(function () {
        c0.act(
          'role:transport,type:balance,add:client',
          { config: { port: 44440, pin: 'a:1' } },
          function () {
            c0.act('a:1', function (e, o) {
              expect(o.x).to.equal(0)

              c0.act(
                'role:transport,type:balance,add:client',
                { config: { port: 44441, pin: 'a:1' } },
                function () {
                  c0.act('a:1', function (e, o) {
                    expect(o.x).to.equal(0)

                    c0.act('a:1', function (e, o) {
                      expect(o.x).to.equal(1)

                      c0.act(
                        'role:transport,type:balance,remove:client',
                        { config: { port: 44441, pin: 'a:1' } },
                        function () {
                          c0.act('a:1', function (e, o) {
                            expect(o.x).to.equal(0)

                            c0.act('a:1', function (e, o) {
                              expect(o.x).to.equal(0)

                              s0.close(s1.close.bind(s1, c0.close.bind(c0, done)))
                            })
                          })
                        })
                    })
                  })
                })
            })
          })
      })
    })
  })

  it('doesn\'t remove when no match is found', { parallel: false }, function (done) {
    var s0 =
      Seneca(testopts)
      .error(done)
      .listen(44440)
      .add('a:1', function () { this.good({ x: 0 }) })
      .ready(function () {
        var s1 =
          Seneca(testopts)
          .error(done)
          .listen(44441)
          .add('a:1', function () { this.good({ x: 1 }) })
          .ready(function () {
            var c0 =
              Seneca(testopts)
              .error(done)
              .use('..')
              .client({ type: 'balance', pin: 'a:1' })
              .act(
                'role:transport,type:balance,add:client',
                { config: { port: 44440, pin: 'a:1' } },
                function () {
                  c0.act('a:1', function (e, o) {
                    expect(o.x).to.equal(0)

                    c0.act(
                      'role:transport,type:balance,add:client',
                      { config: { port: 44441, pin: 'a:1' } },
                      function () {
                        c0.act('a:1', function (e, o) {
                          expect(o.x).to.equal(0)

                          c0.act('a:1', function (e, o) {
                            expect(o.x).to.equal(1)

                            c0.act(
                              'role:transport,type:balance,remove:client',
                              { config: { port: 44440, pin: 'a:5' } },
                              function () {
                                c0.act('a:1', function (e, o) {
                                  expect(o.x).to.equal(0)

                                  c0.act('a:1', function (e, o) {
                                    expect(o.x).to.equal(1)

                                    s0.close(function () {
                                      s1.close(function () {
                                        c0.close(function () {
                                          done()
                                        })
                                      })
                                    })
                                  })
                                })
                              })
                          })
                        })
                      })
                  })
                })
          })
      })
  })


  it('uses a custom id when adding and removing clients', function (done) {
    var s0 =
      Seneca(testopts)
      .error(done)
      .listen(44440)
      .add('a:1', function () { this.good({ x: 0 }) })
      .ready(function () {
        var s1 =
          Seneca(testopts)
          .error(done)
          .listen(44441)
          .add('a:1', function () { this.good({ x: 1 }) })
          .ready(function () {
            var c0 =
              Seneca(testopts)
              .error(done)
              .use('..')
              .client({ type: 'balance', pin: 'a:1' })
              .act(
                'role:transport,type:balance,add:client',
                { config: { port: 44440, pin: 'a:1', id: 'foo' } },
                function () {
                  c0.act('a:1', function (e, o) {
                    expect(o.x).to.equal(0)

                    c0.act(
                      'role:transport,type:balance,add:client',
                      { config: { port: 44441, pin: 'a:1', id: 'bar' } },
                      function () {
                        c0.act('a:1', function (e, o) {
                          expect(o.x).to.equal(0)

                          c0.act('a:1', function (e, o) {
                            expect(o.x).to.equal(1)

                            c0.act(
                              'role:transport,type:balance,remove:client',
                              { config: { id: 'bar', pin: 'a:1' } },
                              function () {
                                c0.act('a:1', function (e, o) {
                                  expect(o.x).to.equal(0)

                                  c0.act('a:1', function (e, o) {
                                    expect(o.x).to.equal(0)

                                    s0.close(function () {
                                      s1.close(function () {
                                        c0.close(function () {
                                          done()
                                        })
                                      })
                                    })
                                  })
                                })
                              })
                          })
                        })
                      })
                  })
                })
          })
      })
  })


  it('processes actions even when no upstreams are available', function (done) {
    var c0 =
      Seneca(testopts)
      .use('..')
      .client({ type: 'balance', pin: 'a:1' })
      .act('a:1', function (e, o) {
        expect(e).to.exist()
        c0.close(done)
      })
  })


  it('supports model option', { parallel: false }, function (done) {
    var s0 =
      Seneca(testopts)
      .error(done)
      .listen(44440)
      .add('a:1', function () { this.good({ x: 0 }) })
      .ready(function () {
        var s1 =
          Seneca(testopts)
          .error(done)
          .listen(44441)
          .add('a:1', function () { this.good({ x: 1 }) })
          .ready(function () {
            var c0 =
              Seneca(testopts)
              .error(done)
              .use('..', {model: 'consume'})
              .client({ type: 'balance', pin: 'a:1' })
              .client({ port: 44440, pin: 'a:1' })
              .client({ port: 44441, pin: 'a:1' })
              .act('a:1', function (e, o) {
                expect(o.x).to.equal(0)

                c0.act('a:1', function (e, o) {
                  expect(o.x).to.equal(1)

                  c0.act('a:1', function (e, o) {
                    expect(o.x).to.equal(0)

                    s0.close(function () {
                      s1.close(function () {
                        c0.close(function () {
                          done()
                        })
                      })
                    })
                  })
                })
              })
          })
      })
  })


  it('supports observe model option', { parallel: false }, function (done) {
    var t = {}
    var s0
    var s1
    var c0

    s0 = Seneca(testopts)
      .error(done)
      .listen(44440)
      .add('a:1', function (m, d) { t.x = 1; d(); check() })

    s1 = Seneca(testopts)
      .error(done)
      .listen(44441)
      .add('a:1', function (m, d) { t.y = 1; d(); check() })

    c0 = Seneca({tag: 'c0', log: 'silent', debug: {short_logs: true}})
      .error(done)
      .use('..')
      .client({ type: 'balance', pin: 'a:1', model: 'observe' })
      .client({ port: 44440, pin: 'a:1' })
      .client({ port: 44441, pin: 'a:1' })

    s0.ready(function () {
      s1.ready(function () {
        c0.ready(function () {
          c0.act('a:1,z:1')
        })
      })
    })

    function check () {
      if ( 1 === t.x && 1 === t.y ) {
        s0.close(function () {
          s1.close(function () {
            c0.close(function () {
              done()
            })
          })
        })
      }
    }
  })


  it('multiple-client-calls', { parallel: false }, function (done) {

    var s0 = Seneca(testopts).error(done)
      .listen(44440)
      .listen(44450)
      .add('a:1', function () { this.good({ x: 0 }) })
      .add('b:1', function () { this.good({ y: 0 }) })

      .ready(function () {
        var s1 = Seneca(testopts).error(done)
          .listen(44441)
          .listen(44451)
          .add('a:1', function () { this.good({ x: 1 }) })
          .add('b:1', function () { this.good({ y: 1 }) })

          .ready(function () {
            var c0 = Seneca(testopts).error(done)
              .use('..')
              .client({ type: 'balance', pin: 'a:1' })
              .client({ port: 44440, pin: 'a:1' })
              .client({ port: 44441, pin: 'a:1' })

              .client({ type: 'balance', pin: 'b:1' })
              .client({ port: 44450, pin: 'b:1' })
              .client({ port: 44451, pin: 'b:1' })

              .act('a:1', function (e, o) {
                expect(0).to.equal(o.x)

                c0.act('a:1', function (e, o) {
                  expect(1).to.equal(o.x)

                  c0.act('a:1', function (e, o) {
                    expect(0).to.equal(o.x)

                    c0.act('b:1', function (e, o) {
                      expect(0).to.equal(o.y)

                      c0.act('b:1', function (e, o) {
                        expect(1).to.equal(o.y)

                        c0.act('b:1', function (e, o) {
                          expect(0).to.equal(o.y)

                          s0.close(function () {
                            s1.close(function () {
                              c0.close(function () {
                                done()
                              })
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })

          })
      })
  })

  it('fire-and-forget', { parallel: false }, function (done) {
    var t = {}
    var s0, s1, c0

    s0 = Seneca({tag: 's0', log: 'silent', debug: {short_logs: true}})
      .error(done).listen(44440)
      .add('a:1', function (m, d) { t.x = 1; d() })

    s1 = Seneca({tag: 's1', log: 'silent', debug: {short_logs: true}})
      .error(done).listen(44441)
      .add('a:1', function (m, d) { t.y = 1; d() })

    c0 = Seneca({tag: 'c0', log: 'silent', debug: {short_logs: true}})
      .error(done).use('..')
      .client({ type: 'balance', pin: 'a:1', model: 'observe' })
      .client({ port: 44440, pin: 'a:1' })
      .client({ port: 44441, pin: 'a:1' })

    s0.ready( s1.ready.bind(s1, c0.ready.bind(c0, function () {
      c0.act('a:1')

      setTimeout(function () {
        expect(t.x).to.equal(1)
        expect(t.y).to.equal(1)

        s0.close( s1.close.bind(s1, c0.close.bind(c0, done)))
      }, 111)
    })))
  })

  it('multiple-clients', { parallel: false }, function (done) {
    var t = {x: 0, y: 0}
    var s0, s1, c0, c1, c2

    s0 = Seneca({tag: 's0', log: 'silent', debug: {short_logs: true}})
      .error(done).listen(44450)
      .add('a:1', function (m, d) { t.x++; d(null, {x: t.x}) })

    s1 = Seneca({tag: 's1', log: 'silent', debug: {short_logs: true}})
      .error(done).listen(44451)
      .add('a:1', function (m, d) { t.y++; d(null, {y: t.y}) })

    c0 = Seneca({tag: 'c0', log: 'silent', debug: {short_logs: true}})
      .error(done).use('..')
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44450, pin: 'a:1' })
      .client({ port: 44451, pin: 'a:1' })

    c1 = Seneca({tag: 'c1', log: 'silent', debug: {short_logs: true}})
      .error(done).use('..')
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44450, pin: 'a:1' })
      .client({ port: 44451, pin: 'a:1' })

    c2 = Seneca({tag: 'c2', log: 'silent', debug: {short_logs: true}})
      .error(done).use('..')
      .client({ type: 'balance', pin: 'a:1' })
      .client({ port: 44450, pin: 'a:1' })
      .client({ port: 44451, pin: 'a:1' })

    s0.ready(
      s1.ready.bind(
        s1, c0.ready.bind(
          c0, c1.ready.bind(
            c1, c2.ready.bind(
              c2, setTimeout.bind(null, do_maps, 111))))))

    function do_maps () {
      c0.act(
        'role:transport,type:balance,get:target-map,pg:"a:1"',
        function (err, c0map) {
          if (err) return done(err)

          c1.act(
            'role:transport,type:balance,get:target-map,pg:"a:1"',
            function (err, c1map) {
              if (err) return done(err)

              c2.act(
                'role:transport,type:balance,get:target-map,pg:"a:1"',
                function (err, c2map) {
                  if (err) return done(err)

                  expect(c0map['a:1'].targets.length).to.equal(2)
                  expect(c1map['a:1'].targets.length).to.equal(2)
                  expect(c2map['a:1'].targets.length).to.equal(2)

                  do_test()
                })
            })
        })
    }

    function do_test () {
      c0.act('a:1', function (e, o) {
        expect(o.x).to.equal(1)
        expect(t.x).to.equal(1)
        expect(t.y).to.equal(0)

        c0.act('a:1', function (e, o) {
          expect(o.y).to.equal(1)
          expect(t.x).to.equal(1)
          expect(t.y).to.equal(1)

          done()
        })
      })
    }
  })
})
