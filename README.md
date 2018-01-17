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

To register a new factory dependency, call `container.factory`:

```JavaScript
container.factory('formatter', function () {
  return function (message) {
    return `formatted ${message}`;
  };
});
```

Factories can depend on other dependencies as well:

```JavaScript
container.factory('logger', function (formatter) {
  return formatter('logged message');
});
```

You can also register constant dependencies as objects with `container.constant`:

```JavaScript
container.constant('config', {
  password: '********'
});
```

To get a registered dependency, simply use `dependable.get`:

```JavaScript
const logger = container.get('logger');

// This will print "formatted logged message"
console.log(logger);
```

## API

`container.factory(name, function)` - Registers a factory dependency by name. `function` must be a function that takes dependencies and returns anything.

`container.constant(name, object)` - Registers a constant dependency by name. `object` must be an object or string with no dependencies.

`container.get(name, overrides = {})` - Returns a dependency by name, with all dependencies injected. If you specify overrides, the dependency will be given those overrides instead of those registered.

`container.getSandboxed(name, overrides = {})` - Returns a dependency by name, with all dependencies injected. Unlike `get`, you _must_ specify overrides for all dependencies. This can (and should) be used during testing to ensure a module under test has been competely isolated.

## Development

Tests are written with Mocha. To run the tests, run `npm test`.

## License

[MIT][license]

[license]: https://github.com/Schoonology/dependable/blob/master/LICENSE
