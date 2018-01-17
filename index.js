const EMPTY_STRING = ''
const FUNCTION_SIGNATURE = /function.*?\(([\s\S]*?)\)/

function argList (func) {
  const match = func.toString().match(FUNCTION_SIGNATURE)
  if (match === null) {
    throw new Error(`Could not parse function arguments: ${func != null ? func.toString() : EMPTY_STRING}`)
  }

  return match[1]
    .split(',')
    .filter(a => a)
    .map(str => str.trim())
}

exports.container = () => {
  const dependencyMap = {}

  function constant (name, object) {
    if (object == null) {
      throw new Error('Cannot register a constant if no object is provided.')
    }

    if (typeof object !== 'object' && typeof object !== 'string') {
      throw new Error(`Cannot register a constant that is not a string or object. Provided constant was a ${typeof object}.`)
    }

    dependencyMap[name] = {
      func: () => object,
      required: []
    }
  }

  function factory (name, func) {
    if (func == null) {
      throw new Error('Cannot register a factory if no factory is provided.')
    }

    if (typeof func !== 'function') {
      throw new Error(`Cannot register a factory that is not a function. Provided factory was a ${typeof object}.`)
    }

    dependencyMap[name] = {
      func,
      required: argList(func)
    }
  }

  function get (name, overrides = null, visited = []) {
    const isOverridden = overrides != null

    if (haveVisited(visited, name)) {
      throw new Error(`circular dependency with '${name}'`)
    }

    const dependency = dependencyMap[name]
    if (dependency == null) {
      throw new Error(`dependency '${name}' was not registered`)
    }

    if (dependency.instance != null && !isOverridden) {
      return dependency.instance
    }

    const childDependencies = dependency.required.map(dep => {
      if ((overrides != null ? overrides[dep] : void 0) != null) {
        return overrides != null ? overrides[dep] : void 0
      } else {
        return get(dep, overrides, visited.concat(name))
      }
    })

    const instance = dependency.func.apply(dependency, childDependencies)

    if (!isOverridden) {
      dependency.instance = instance
    }

    return instance
  }

  function haveVisited (visited, name) {
    return visited.filter(n => n === name).length
  }

  function getSandboxed (name, overrides) {
    const mockContainer = exports.container()
    mockContainer.factory(name, dependencyMap[name].func)

    return mockContainer.get(name, overrides)
  }

  return {
    constant,
    get,
    getSandboxed,
    factory
  }
}
