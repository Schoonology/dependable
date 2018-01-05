const container = require("../rewrite.js").container;
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("dependency injection", function() {
  let subject;

  beforeEach(function() {
    subject = container();
  });

  describe("#register", function() {
    it("should register a factory", function() {
      subject.register("logger", function() {
        return "message";
      });
      assert.equal(subject.get("logger"), "message");
    });

    it("should register a factory with a single dependency", function() {
      subject.register("logger", function() {
        return "message";
      });
      subject.register("app", function(logger) {
        return logger;
      });
      assert.equal(subject.get("app"), "message");
    });

    it("should not care about dependency registration order", function() {
      subject.register("app", function(logger) {
        return logger;
      });
      subject.register("logger", function() {
        return "message";
      });
      assert.equal(subject.get("app"), "message");
    });

    it("should register a factory with multiple dependencies", function() {
      subject.register("app", function(logger, router) {
        return [logger, router];
      });
      subject.register("logger", function() {
        return "message";
      });
      subject.register("router", function() {
        return "route";
      });
      assert.deepEqual(subject.get("app"), ["message", "route"]);
    });
  });

  describe("#get", function() {
    it("should return a registered dependency", function() {
      subject.register("logger", function() {
        return "message";
      });
      assert.equal(subject.get("logger"), "message");
    });

    it("should allow overriding of a dependency with an object", function() {
      subject.register("app", function(logger, router) {
        return [logger, router];
      });
      subject.register("logger", function() {
        return "message";
      });
      subject.register("router", function() {
        return "route";
      });
      assert.deepEqual(
        subject.get("app", {
          logger: "custom-message"
        }),
        ["custom-message", "route"]
      );
    });

    xit("should allow overriding of a dependency with a function?", function() {});

    it("should traverse a graph of dependencies", function() {
      subject.register("app", function(logger) {
        return logger;
      });
      subject.register("logger", function(formatter) {
        return formatter("message");
      });
      subject.register("formatter", function() {
        return message => `formatted ${message}`;
      });
      assert.deepEqual(subject.get("app"), "formatted message");
    });

    it("should only initialize a dependency once", function() {
      subject.register("logger", function(formatter) {
        return { formatter };
      });
      subject.register("router", function(formatter) {
        return { formatter };
      });
      subject.register("formatter", function() {
        return message => `formatted ${message}`;
      });
      assert.equal(
        subject.get("logger").formatter,
        subject.get("router").formatter
      );
    });

    it("should not clobber dependencies that are overridden", function() {
      subject.register("logger", function(formatter) {
        return formatter("message");
      });
      subject.register("formatter", function() {
        return message => `formatted ${message}`;
      });
      assert.equal(
        subject.get("logger", { formatter: () => "overridden message" }),
        "overridden message"
      );
      assert.equal(subject.get("logger"), "formatted message");
    });

    context("errors", function() {
      it("should throw error on circular dependency", function() {
        subject.register("app", function(logger) {
          return logger;
        });
        subject.register("logger", function(app) {
          return app;
        });
        assert.throws(() => subject.get("app"), /circular dependency/);
      });

      it("should NOT throw circular dependency error if two modules require the same dependency", function() {
        subject.register("app", function(logger, router) {
          return [logger, router];
        });
        subject.register("logger", function(formatter) {
          return formatter("message");
        });
        subject.register("router", function(formatter) {
          return formatter("route");
        });
        subject.register("formatter", function() {
          return message => `formatted ${message}`;
        });
        assert.deepEqual(subject.get("app"), [
          "formatted message",
          "formatted route"
        ]);
      });

      it("should throw an error if it cant find a dependency", function() {
        assert.throws(() => subject.get("goats"));
      });

      it("should throw an error if it cant find a transitive dependency", function() {
        subject.register("goats", function(cans) {
          return cans;
        });
        assert.throws(() => subject.get("goats"));
      });
    });

    context("internals", function() {
      it('should register the container as "_container"', function() {
        assert.equal(subject.get("_container"), subject);
      });
    });
  });

  describe("#list", function() {
    it("should list dependencies registered", function() {
      subject.register("logger", function() {
        return "message";
      });
      subject.register("router", function() {
        return "route";
      });
      assert.equal(Object.keys(subject.list()).length, 3);
      assert.deepEqual(Object.keys(subject.list()), [
        "_container",
        "logger",
        "router"
      ]);
    });
  });

  describe("#resolve", function() {
    it("should return a dependency", function(done) {
      subject.register("logger", function() {
        return "message";
      });
      subject.resolve(function(logger) {
        assert.equal(logger, "message");
        done();
      });
    });

    it("should return multiple dependencies", function(done) {
      subject.register("logger", function() {
        return "message";
      });
      subject.register("router", function() {
        return "route";
      });
      subject.resolve(function(logger, router) {
        assert.equal(logger, "message");
        assert.equal(router, "route");
        done();
      });
    });
  });

  describe("overrides", function() {
    it("should ignore the cache when you override", function() {
      var a, deps, overridenA;
      deps = container();
      deps.register("a", function(b) {
        return {
          value: b
        };
      });
      deps.register("b", "b");
      a = deps.get("a");
      overridenA = deps.get("a", {
        b: "henry"
      });
      assert.notEqual(overridenA.value, "b", "it used the cached value");
      return assert.equal(overridenA.value, "henry");
    });
    return it("should override on resolve", function(done) {
      var deps;
      deps = container();
      deps.register("a", function(b) {
        return {
          value: b
        };
      });
      deps.register("b", "b");
      return deps.resolve(
        {
          b: "bob"
        },
        function(a) {
          assert.equal(a.value, "bob");
          return done();
        }
      );
    });
  });
  return describe("simple dependencies", function() {
    return it("doesnt have to be a function. objects work too", function() {
      var deps;
      deps = container();
      deps.register("a", "a");
      return assert.equal(deps.get("a"), "a");
    });
  });
});

describe("getSandboxed", function() {
  it("should return a module without deps", function() {
    var Abc, deps;
    Abc = function() {
      return "abc";
    };
    deps = container();
    deps.register("abc", Abc);
    return assert.equal(deps.getSandboxed("abc"), "abc");
  });
  it("should get a single, replaced dependency", function() {
    var Names, Stuff, deps;
    Stuff = function(names) {
      return names[0];
    };
    Names = function() {
      return ["one", "two"];
    };
    deps = container();
    deps.register("stuff", Stuff);
    deps.register("names", Names);
    return assert.equal(
      deps.getSandboxed("stuff", {
        names: ["three", "four"]
      }),
      "three"
    );
  });
  return it("should throw if an override is missing", function() {
    var Names, Stuff, closure, deps;
    Stuff = function(names) {
      return names[0];
    };
    Names = function() {
      return ["one", "two"];
    };
    deps = container();
    deps.register("stuff", Stuff);
    deps.register("names", Names);
    closure = function() {
      return deps.getSandboxed("stuff");
    };
    return assert.throws(closure, /was not registered/);
  });
});
