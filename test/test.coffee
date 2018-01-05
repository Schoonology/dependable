
{container} = require '../index'
assert = require 'assert'
fs = require 'fs'
os = require 'os'
path = require 'path'

describe 'inject', ->
  it 'should create a container', ->
    deps = container()

  it 'should return module without deps', ->
    Abc = -> "abc"
    deps = container()
    deps.register "abc", Abc
    assert.equal deps.get("abc"), "abc"

  it 'should get a single dependency', ->
    Stuff = (names) -> names[0]
    Names = () -> ["one", "two"]
    deps = container()
    deps.register "stuff", Stuff
    deps.register "names", Names
    assert.equal deps.get("stuff"), "one"

  it 'should resovle multiple dependencies', ->
    post = (Comments, Users) ->
      class Post
        constructor: (@comments, @author) ->
        authorName: -> Users.getName @author
        firstCommentText: -> Comments.getText @comments[0]

    comments = -> getText: (obj) -> obj.text
    users = -> getName: (obj) -> obj.name

    deps = container()
    deps.register "Post", post
    deps.register "Users", users
    deps.register "Comments", comments

    PostClass = deps.get "Post"

    apost = new PostClass [{text: "woot"}], {name: "bob"}
    assert.equal apost.authorName(), "bob"
    assert.equal apost.firstCommentText(), "woot"

  it 'should let me use different databases for different collections (pass in info)', ->
    db = (data) ->
      data: data
      get: (key) -> @data[key]
      set: (key, value) -> @data[key] = value

    name = -> "bob"

    people = (name, db) ->
      name: name
      add: (person) -> db.set person.name, person
      find: (name) -> db.get name

    places = (name, db) ->
      name: name
      add: (place) -> db.set place.name, place
      find: (name) -> db.get name

    deps = container()
    deps.register "name", name
    deps.register "people", people
    deps.register "places", places

    peopleDb = db {}
    placesDb = db {}

    peoplez = deps.get "people", {db: peopleDb}
    placez = deps.get "places", {db: placesDb}

    assert.equal peoplez.name, "bob"
    assert.equal placez.name, "bob"

    peoplez.add {name: "one"}
    placez.add {name: "two"}

    assert.ok peoplez.find "one"
    assert.ok !placez.find "one"

    assert.ok placez.find "two"
    assert.ok !peoplez.find "two"

  it 'should get nested dependencies', ->
    gpa = -> age: 86
    dad = (gpa) -> age: gpa.age - 20
    son = (dad) -> age: dad.age - 20

    deps = container()
    deps.register "gpa", gpa
    deps.register "dad", dad
    deps.register "son", son

    ason = deps.get "son"
    assert.equal ason.age, 46

  it 'should throw error on circular dependency', ->
    one = (two) -> two + 1
    two = (one) -> one + 2

    deps = container()
    deps.register "one", one
    deps.register "two", two

    try
      aone = deps.get "one"
    catch e
      err = e

    assert.ok err.toString().match 'circular dependency'

  it "should NOT throw circular dependency error if two modules require the same thing", ->
    deps = container()
    deps.register "name", -> "bob"
    deps.register "one", (name) -> name + " one"
    deps.register "two", (name) -> name + " two"
    deps.register "all", (one, two) -> one.name + " " + two.name

    try
      all = deps.get "all"
    catch e
      assert.ok false, "should not have thrown error"

  it "should list dependencies registered", ->
    deps = container()
    deps.register "one", (name) -> name + " one"
    deps.register "two", (name) -> name + " two"

    list = deps.list()
    assert.equal list.one.func("1"), "1 one"
    assert.equal list.two.func("2"), "2 two"

  it "should throw error if it cant find dependency", ->
    deps = container()

    try
      deps.get "one"
    catch e
      err = e

    assert.ok err

  it "should throw error if it cant find dependency of dependency", ->
    deps = container()
    deps.register "one", (two) -> "one"
    try
      deps.get "one"
    catch e
      err = e
    assert.ok err

  it 'should let you get multiple dependencies at once, injector style', (done) ->
    deps = container()
    deps.register "name", -> "bob"
    deps.register "one", (name) -> name + " one"
    deps.register "two", (name) -> name + " two"
    deps.resolve (one, two) ->
      assert.ok one
      assert.ok two
      assert.equal one, "bob one"
      assert.equal two, "bob two"
      done()

  it 'should return the SAME instance to everyone', ->
    deps = container()
    deps.register "asdf", -> {woot: "hi"}
    deps.register "a", (asdf) -> asdf.a = "a"
    deps.register "b", (asdf) -> asdf.b = "b"
    asdf = deps.get "asdf"
    a = deps.get 'a'
    b = deps.get 'b'
    assert.equal asdf.a, "a"
    assert.equal asdf.b, "b"

  it 'should inject the container (_container)', ->
    deps = container()
    assert.equal deps.get('_container'), deps

  describe 'cache', ->
    it 'should re-use the same instance', ->
      deps = container()
      deps.register "a", -> {one: "one"}
      a = deps.get "a"
      assert.deepEqual a, {one: "one"}
      assert.notEqual a, {one: "one"}
      a2 = deps.get "a"
      assert.equal a, a2

  describe 'overrides', ->
    it 'should override a dependency', ->
      deps = container()
      deps.register "a", (b) -> value: b
      deps.register "b", "b"
      a = deps.get "a", {b: "henry"}
      assert.equal a.value, "henry"

    it 'should not cache when you override', ->
      deps = container()
      deps.register "a", (b) -> value: b
      deps.register "b", "b"

      overridenA = deps.get "a", {b: "henry"}
      a = deps.get "a"
      assert.notEqual a.value, "henry", 'it cached the override value'
      assert.equal a.value, "b"

    it 'should ignore the cache when you override', ->
      deps = container()
      deps.register "a", (b) -> value: b
      deps.register "b", "b"

      a = deps.get "a"
      overridenA = deps.get "a", {b: "henry"}
      assert.notEqual overridenA.value, "b", 'it used the cached value'
      assert.equal overridenA.value, "henry"

    it 'should override on resolve', (done) ->
      deps = container()
      deps.register "a", (b) -> value: b
      deps.register "b", "b"
      deps.resolve {b: "bob"}, (a) ->
        assert.equal a.value, "bob"
        done()

  describe 'simple dependencies', ->
    it 'doesnt have to be a function. objects work too', ->
      deps = container()
      deps.register "a", "a"
      assert.equal deps.get("a"), "a"

  describe 'registering a hash', ->
    it 'should register a hash of key : dep pairs', ->
      deps = container()
      deps.register {
        a: "a"
        b: "b"
      }
      assert.equal deps.get("a"), "a"
      assert.equal deps.get("b"), "b"

  describe 'nested containers', ->
    it 'should inherit deps from the parent'

  describe 'maybe', ->
    it 'should support objects/data instead of functions?'
    it 'should support optional dependencies?'

describe 'getSandboxed', ->
  it 'should return a module without deps', ->
    Abc = -> "abc"
    deps = container()
    deps.register "abc", Abc
    assert.equal deps.getSandboxed("abc"), "abc"

  it 'should get a single, replaced dependency', ->
    Stuff = (names) -> names[0]
    Names = () -> ["one", "two"]
    deps = container()
    deps.register "stuff", Stuff
    deps.register "names", Names
    assert.equal deps.getSandboxed("stuff", {
      names: ["three", "four"]
    }), "three"

  it 'should throw if an override is missing', ->
    Stuff = (names) -> names[0]
    Names = () -> ["one", "two"]
    deps = container()
    deps.register "stuff", Stuff
    deps.register "names", Names

    closure = () -> deps.getSandboxed("stuff")
    assert.throws(closure, /was not registered/)

