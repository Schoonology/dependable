# Dependable

A minimalist dependency injection framework for Node.js

## Example

### Create a container

Create a new container by calling `dependable.container`:

```js
var dependable = require('dependable'),
    container = dependable.container();
```

### Register some dependencies

Register a few dependencies for later use:

```js
container.register('app', 'web app');
container.register('logger', function() { return 'message'; } );
```

### Register a dependency that has other dependencies

When the argument is a function, the function's arguments are automatically
populated with the correct dependencies, and the return value of the function
is registered as the dependency:

```js
container.register('app', function (logger, middleware) {
  let app = {
    log: function() {
      return logger;
    },
    middleware };
  return app;
});
```

### Register a dependency out-of-order

`app` depends on a `middleware`, which hasn't been registered yet.
Dependable resolves dependencies lazily, so we can define this dependency
after-the-fact:

```js
container.register('middleware', {
  session: 'cookies',
  auth: 'json-web-token'
});
```

### Resolve a dependency and use it

Like with container.register, the function arguments are automatically resolved, along
with their dependencies:

```js
container.resolve(function (logger) {
  console.log(logger);
  /*
   * message
   */
});
```

### Override dependencies at resolve time

It's also possible to override dependencies at resolve time:

```js
let logger = 'overridden message';

container.resolve({ logger: logger }, function (app) {
  console.log(app.log());
  /*
   * overridden message
   */
});
```

## API

`container.register(name, function|object)` - Registers a dependency by name.

`container.get(name, overrides = {})` - Returns a dependency by name, with all dependencies injected. If you specify overrides, the dependency will be given those overrides instead of those registered.

`container.getSandboxed(name, overrides = {})` - Returns a dependency by name, with all dependencies injected. Unlike `get`, you _must_ specify overrides for all dependencies. This can (and should) be used during testing to ensure a module under test has been competely isolated.

`container.resolve(overrides={}, cb)` - Calls `cb` like a dependency function, injecting any dependencies found in the signature. Like `container.get`, this supports overrides.

`container.list()` - Return a list of registered dependencies.

## Development

Tests are written with mocha. To run the tests, run `npm test`.

## License

[MIT][license]

[license]: https://github.com/Schoonology/dependable/blob/master/LICENSE
