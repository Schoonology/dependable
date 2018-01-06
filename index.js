const path = require("path");
const fs = require("fs");

const EMPTY_STRING = "";
const FUNCTION_SIGNATURE = /function.*?\(([\s\S]*?)\)/;

function toFactory(func) {
  if (typeof func === "function") {
    return { func, required: argList(func) };
  } else {
    return { func: () => func, required: [] };
  }
}

function argList(func) {
  const match = func.toString().match(FUNCTION_SIGNATURE);
  if (match === null) {
    throw new Error(
      `could not parse function arguments: ${
        func != null ? func.toString() : EMPTY_STRING
      }`
    );
  }
  return match[1]
    .split(",")
    .filter(a => a)
    .map(str => str.trim());
}

exports.container = () => {
  const factories = {};
  const modules = {};

  const register = (name, func) => {
    if (func == null) {
      throw new Error("cannot register null function");
    }
    factories[name] = toFactory(func);
  };

  const get = (name, overrides = null, visited = []) => {
    let isOverridden = overrides != null;

    if (haveVisited(visited, name)) {
      throw new Error(`circular dependency with '${name}'`);
    }

    let factory = factories[name];
    if (factory == null) {
      throw new Error(`dependency '${name}' was not registered`);
    }

    if (factory.instance != null && !isOverridden) {
      return factory.instance;
    }

    let dependencies = factory.required.map(dep => {
      if ((overrides != null ? overrides[dep] : void 0) != null) {
        return overrides != null ? overrides[dep] : void 0;
      } else {
        return get(dep, overrides, visited.concat(name));
      }
    });

    let instance = factory.func.apply(factory, dependencies);

    if (!isOverridden) {
      factory.instance = instance;
    }

    return instance;
  };

  const haveVisited = (visited, name) => {
    return visited.filter(n => n == name).length;
  };

  const resolve = (overrides, func) => {
    if (!func) {
      func = overrides;
      overrides = null;
    }
    register("__temp", func);
    return get("__temp", overrides);
  };

  const getSandboxed = (name, overrides) => {
    const mockContainer = exports.container();
    mockContainer.register(name, factories[name].func);
    return mockContainer.get(name, overrides);
  };

  let container = {
    get,
    getSandboxed,
    resolve,
    register,
    list: () => factories
  };

  return container;
};
