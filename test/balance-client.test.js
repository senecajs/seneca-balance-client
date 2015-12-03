/*
  MIT License,
  Copyright (c) 2015, Richard Rodger and other contributors.
*/

'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Seneca = require('seneca')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

var testopts = {log: 'silent'}


describe('#balance-client', function () {

  it('happy', function (done) {
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
              .client({ port: 44440, pin: 'a:1' })
              .client({ port: 44441, pin: 'a:1' })
              .act('a:1', function (e, o) {
                Assert.equal(0, o.x)

                c0.act('a:1', function (e, o) {
                  Assert.equal(1, o.x)

                  c0.act('a:1', function (e, o) {
                    Assert.equal(0, o.x)

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


  it('add-remove', function (done) {
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
                    Assert.equal(0, o.x)

                    c0.act(
                      'role:transport,type:balance,add:client',
                      { config: { port: 44441, pin: 'a:1' } },
                      function () {
                        c0.act('a:1', function (e, o) {
                          Assert.equal(0, o.x)

                          c0.act('a:1', function (e, o) {
                            Assert.equal(1, o.x)

                            c0.act(
                              'role:transport,type:balance,remove:client',
                              { config: { port: 44441, pin: 'a:1' } },
                              function () {
                                c0.act('a:1', function (e, o) {
                                  Assert.equal(0, o.x)

                                  c0.act('a:1', function (e, o) {
                                    Assert.equal(0, o.x)

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


  it('doesn\'t remove when no match is found', function (done) {
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
                    Assert.equal(0, o.x)

                    c0.act(
                      'role:transport,type:balance,add:client',
                      { config: { port: 44441, pin: 'a:1' } },
                      function () {
                        c0.act('a:1', function (e, o) {
                          Assert.equal(0, o.x)

                          c0.act('a:1', function (e, o) {
                            Assert.equal(1, o.x)

                            c0.act(
                              'role:transport,type:balance,remove:client',
                              { config: { port: 44440, pin: 'a:5' } },
                              function () {
                                c0.act('a:1', function (e, o) {
                                  Assert.equal(0, o.x)

                                  c0.act('a:1', function (e, o) {
                                    Assert.equal(1, o.x)

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
                    Assert.equal(0, o.x)

                    c0.act(
                      'role:transport,type:balance,add:client',
                      { config: { port: 44441, pin: 'a:1', id: 'bar' } },
                      function () {
                        c0.act('a:1', function (e, o) {
                          Assert.equal(0, o.x)

                          c0.act('a:1', function (e, o) {
                            Assert.equal(1, o.x)

                            c0.act(
                              'role:transport,type:balance,remove:client',
                              { config: { id: 'bar', pin: 'a:1' } },
                              function () {
                                c0.act('a:1', function (e, o) {
                                  Assert.equal(0, o.x)

                                  c0.act('a:1', function (e, o) {
                                    Assert.equal(0, o.x)

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
      .error(done)
      .use('..')
      .client({ type: 'balance', pin: 'a:1' })
      .act('a:1', function (e, o) {
        Assert.strictEqual(e, null)
        Assert.strictEqual(o, undefined)
        c0.close(done)
      })
  })
})
