# Dependable

A minimalist dependency injection framework for Node.js.

## Installation
To install the latest version:

```bash
npm install --save dependable
```

## Usage

Create a new container by calling `dependable.container`:

```JavaScript
const dependable = require('dependable');
const container = dependable.container();
```

To register a new dependency, call `container.register`:

```JavaScript
container.register('formatter', function () {
  return function (message) {
    return `formatted ${message}`;
  };
});
```

Dependencies can depend on each other as well:

```JavaScript
container.register('logger', function (formatter) {
  return formatter('logged message');
});
```

To get a registered dependency, simply use `dependable.get`:

```JavaScript
const logger = container.get('logger');

// This will print "formatted logged message"
console.log(logger);
```

You can also resolve a dependency with a callback using `dependable.resolve`:

```JavaScript
container.resolve('logger', function (logger) {
  // This will print "formatted logged message"
  console.log(logger);
});
```

## API

`container.register(name, function)` - Registers a dependency by name. `function` can be a function that takes dependencies and returns anything, or an object itself with no dependencies.

`container.get(name, overrides = {})` - Returns a dependency by name, with all dependencies injected. If you specify overrides, the dependency will be given those overrides instead of those registered.

`container.getSandboxed(name, overrides = {})` - Returns a dependency by name, with all dependencies injected. Unlike `get`, you _must_ specify overrides for all dependencies. This can (and should) be used during testing to ensure a module under test has been competely isolated.

`container.resolve(overrides={}, cb)` - Calls `cb` like a dependency function, injecting any dependencies found in the signature. Like `container.get`, this supports overrides.

`container.list()` - Return a list of registered dependencies.

## Development

Tests are written with Mocha. To run the tests, run `npm test`.

## License

[MIT][license]

[license]: https://github.com/Schoonology/dependable/blob/master/LICENSE
