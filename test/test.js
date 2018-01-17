/* global beforeEach, context, describe, it */
const container = require('../index.js').container
const assert = require('assert')

describe('dependency injection', function () {
  let subject

  beforeEach(function () {
    subject = container()
  })

  describe('#constant', function () {
    it('should register a string', function () {
      subject.constant('logger', 'message')
      assert.equal(subject.get('logger'), 'message')
    })

    it('should register an object', function () {
      subject.constant('logger', { message: 'log message' })
      assert.equal(subject.get('logger').message, 'log message')
    })

    it('should fail to register a non-object', function () {
      assert.throws(() => subject.constant('logger', function () {
        return 'message'
      }), /Cannot register a constant that is not a string or object./)
    })
  })

  describe('#factory', function () {
    it('should register a function', function () {
      subject.factory('logger', function () {
        return 'message'
      })
      assert.equal(subject.get('logger'), 'message')
    })

    it('should fail to register a missing function', function () {
      assert.throws(() => subject.factory('logger'), /Cannot register a factory if no factory is provided./)
    })

    it('should fail to register a null function', function () {
      assert.throws(() => subject.factory('logger', null), /Cannot register a factory if no factory is provided./)
    })

    it('should fail to register an arrow function', function () {
      assert.throws(() => subject.factory('logger', () => {}), /Could not parse function arguments/)
    })

    it('should fail to register a non-function', function () {
      assert.throws(() => subject.factory('logger', 'message'))
    })

    it('should register a factory with a single dependency', function () {
      subject.factory('logger', function () {
        return 'message'
      })
      subject.factory('app', function (logger) {
        return logger
      })
      assert.equal(subject.get('app'), 'message')
    })

    it('should not care about dependency registration order', function () {
      subject.factory('app', function (logger) {
        return logger
      })
      subject.factory('logger', function () {
        return 'message'
      })
      assert.equal(subject.get('app'), 'message')
    })

    it('should register a factory with multiple dependencies', function () {
      subject.factory('app', function (logger, router) {
        return [logger, router]
      })
      subject.factory('logger', function () {
        return 'message'
      })
      subject.factory('router', function () {
        return 'route'
      })
      assert.deepEqual(subject.get('app'), ['message', 'route'])
    })
  })

  describe('#get', function () {
    it('should return a registered dependency', function () {
      subject.factory('logger', function () {
        return 'message'
      })
      assert.equal(subject.get('logger'), 'message')
    })

    it('should allow overriding of a dependency with an object', function () {
      subject.factory('app', function (logger, router) {
        return [logger, router]
      })
      subject.factory('logger', function () {
        return 'message'
      })
      subject.factory('router', function () {
        return 'route'
      })
      assert.deepEqual(
        subject.get('app', {
          logger: 'custom-message'
        }),
        ['custom-message', 'route']
      )
    })

    it('should traverse a graph of dependencies', function () {
      subject.factory('app', function (logger) {
        return logger
      })
      subject.factory('logger', function (formatter) {
        return formatter('message')
      })
      subject.factory('formatter', function () {
        return message => `formatted ${message}`
      })
      assert.deepEqual(subject.get('app'), 'formatted message')
    })

    it('should only initialize a dependency once', function () {
      subject.factory('logger', function (formatter) {
        return { formatter }
      })
      subject.factory('router', function (formatter) {
        return { formatter }
      })
      subject.factory('formatter', function () {
        return message => `formatted ${message}`
      })
      assert.equal(
        subject.get('logger').formatter,
        subject.get('router').formatter
      )
    })

    it('should not clobber dependencies that are overridden', function () {
      subject.factory('logger', function (formatter) {
        return formatter('message')
      })
      subject.factory('formatter', function () {
        return message => `formatted ${message}`
      })
      assert.equal(
        subject.get('logger', { formatter: () => 'overridden message' }),
        'overridden message'
      )
      assert.equal(subject.get('logger'), 'formatted message')
    })

    context('errors', function () {
      it('should throw error on circular dependency', function () {
        subject.factory('app', function (logger) {
          return logger
        })
        subject.factory('logger', function (app) {
          return app
        })
        assert.throws(() => subject.get('app'), /circular dependency/)
      })

      it('should NOT throw circular dependency error if two modules require the same dependency', function () {
        subject.factory('app', function (logger, router) {
          return [logger, router]
        })
        subject.factory('logger', function (formatter) {
          return formatter('message')
        })
        subject.factory('router', function (formatter) {
          return formatter('route')
        })
        subject.factory('formatter', function () {
          return message => `formatted ${message}`
        })
        assert.deepEqual(subject.get('app'), [
          'formatted message',
          'formatted route'
        ])
      })

      it('should throw an error if it cant find a dependency', function () {
        assert.throws(() => subject.get('goats'))
      })

      it('should throw an error if it cant find a transitive dependency', function () {
        subject.factory('goats', function (cans) {
          return cans
        })
        assert.throws(() => subject.get('goats'))
      })
    })
  })
})

describe('test utils', function () {
  let subject

  beforeEach(function () {
    subject = container()
  })

  describe('#getSandboxed', function () {
    it('should return a module without deps', function () {
      subject.factory('logger', function () {
        return 'message'
      })
      return assert.equal(subject.getSandboxed('logger'), 'message')
    })

    it('should get a single, replaced dependency', function () {
      subject.factory('logger', function (formatter) {
        return formatter('message')
      })
      subject.factory('formatter', function () {
        return message => `formatted ${message}`
      })
      assert.equal(
        subject.getSandboxed('logger', {
          formatter: () => 'overridden message'
        }),
        'overridden message'
      )
    })

    it('should throw if an override is missing', function () {
      subject.factory('logger', function (formatter) {
        return formatter('message')
      })
      subject.factory('formatter', function () {
        return message => `formatted ${message}`
      })
      assert.throws(() => subject.getSandboxed('logger'), /was not registered/)
    })
  })
})
