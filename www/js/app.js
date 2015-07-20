(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
(function () {

    var async = {};
    function noop() {}

    // global on the server, window in the browser
    var previous_async;

    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this;

    if (root != null) {
        previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(this, arguments);
        };
    }

    function _once(fn) {
        var called = false;
        return function() {
            if (called) return;
            called = true;
            fn.apply(this, arguments);
        };
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    function _isArrayLike(arr) {
        return _isArray(arr) || (
            // has a positive integer length property
            typeof arr.length === "number" &&
            arr.length >= 0 &&
            arr.length % 1 === 0
        );
    }

    function _each(coll, iterator) {
        return _isArrayLike(coll) ?
            _arrayEach(coll, iterator) :
            _forEachOf(coll, iterator);
    }

    function _arrayEach(arr, iterator) {
        var index = -1,
            length = arr.length;

        while (++index < length) {
            iterator(arr[index], index, arr);
        }
    }

    function _map(arr, iterator) {
        var index = -1,
            length = arr.length,
            result = Array(length);

        while (++index < length) {
            result[index] = iterator(arr[index], index, arr);
        }
        return result;
    }

    function _range(count) {
        return _map(Array(count), function (v, i) { return i; });
    }

    function _reduce(arr, iterator, memo) {
        _arrayEach(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    }

    function _forEachOf(object, iterator) {
        _arrayEach(_keys(object), function (key) {
            iterator(object[key], key);
        });
    }

    var _keys = Object.keys || function (obj) {
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    function _keyIterator(coll) {
        var i = -1;
        var len;
        var keys;
        if (_isArrayLike(coll)) {
            len = coll.length;
            return function next() {
                i++;
                return i < len ? i : null;
            };
        } else {
            keys = _keys(coll);
            len = keys.length;
            return function next() {
                i++;
                return i < len ? keys[i] : null;
            };
        }
    }

    function _baseSlice(arr, start) {
        start = start || 0;
        var index = -1;
        var length = arr.length;

        if (start) {
            length -= start;
            length = length < 0 ? 0 : length;
        }
        var result = Array(length);

        while (++index < length) {
            result[index] = arr[index + start];
        }
        return result;
    }

    function _withoutIndex(iterator) {
        return function (value, index, callback) {
            return iterator(value, callback);
        };
    }

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////

    // capture the global reference to guard against fakeTimer mocks
    var _setImmediate;
    if (typeof setImmediate === 'function') {
        _setImmediate = setImmediate;
    }

    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (_setImmediate) {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                _setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (_setImmediate) {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
                _setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.forEach =
    async.each = function (arr, iterator, callback) {
        return async.eachOf(arr, _withoutIndex(iterator), callback);
    };

    async.forEachSeries =
    async.eachSeries = function (arr, iterator, callback) {
        return async.eachOfSeries(arr, _withoutIndex(iterator), callback);
    };


    async.forEachLimit =
    async.eachLimit = function (arr, limit, iterator, callback) {
        return _eachOfLimit(limit)(arr, _withoutIndex(iterator), callback);
    };

    async.forEachOf =
    async.eachOf = function (object, iterator, callback) {
        callback = _once(callback || noop);
        object = object || [];
        var size = _isArrayLike(object) ? object.length : _keys(object).length;
        var completed = 0;
        if (!size) {
            return callback(null);
        }
        _each(object, function (value, key) {
            iterator(object[key], key, only_once(done));
        });
        function done(err) {
            if (err) {
                callback(err);
            }
            else {
                completed += 1;
                if (completed >= size) {
                    callback(null);
                }
            }
        }
    };

    async.forEachOfSeries =
    async.eachOfSeries = function (obj, iterator, callback) {
        callback = _once(callback || noop);
        obj = obj || [];
        var nextKey = _keyIterator(obj);
        var key = nextKey();
        function iterate() {
            var sync = true;
            if (key === null) {
                return callback(null);
            }
            iterator(obj[key], key, only_once(function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    key = nextKey();
                    if (key === null) {
                        return callback(null);
                    } else {
                        if (sync) {
                            async.nextTick(iterate);
                        } else {
                            iterate();
                        }
                    }
                }
            }));
            sync = false;
        }
        iterate();
    };



    async.forEachOfLimit =
    async.eachOfLimit = function (obj, limit, iterator, callback) {
        _eachOfLimit(limit)(obj, iterator, callback);
    };

    function _eachOfLimit(limit) {

        return function (obj, iterator, callback) {
            callback = _once(callback || noop);
            obj = obj || [];
            var nextKey = _keyIterator(obj);
            if (limit <= 0) {
                return callback(null);
            }
            var done = false;
            var running = 0;
            var errored = false;

            (function replenish () {
                if (done && running <= 0) {
                    return callback(null);
                }

                while (running < limit && !errored) {
                    var key = nextKey();
                    if (key === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iterator(obj[key], key, only_once(function (err) {
                        running -= 1;
                        if (err) {
                            callback(err);
                            errored = true;
                        }
                        else {
                            replenish();
                        }
                    }));
                }
            })();
        };
    }


    function doParallel(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOf, obj, iterator, callback);
        };
    }
    function doParallelLimit(limit, fn) {
        return function (obj, iterator, callback) {
            return fn(_eachOfLimit(limit), obj, iterator, callback);
        };
    }
    function doSeries(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOfSeries, obj, iterator, callback);
        };
    }

    function _asyncMap(eachfn, arr, iterator, callback) {
        callback = _once(callback || noop);
        var results = [];
        eachfn(arr, function (value, index, callback) {
            iterator(value, function (err, v) {
                results[index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }

    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    function _mapLimit(limit) {
        return doParallelLimit(limit, _asyncMap);
    }

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.inject =
    async.foldl =
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachOfSeries(arr, function (x, i, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err || null, memo);
        });
    };

    async.foldr =
    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };

    function _filter(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, index, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function () {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    }

    async.select =
    async.filter = doParallel(_filter);

    async.selectSeries =
    async.filterSeries = doSeries(_filter);

    function _reject(eachfn, arr, iterator, callback) {
        _filter(eachfn, arr, function(value, cb) {
            iterator(value, function(v) {
                cb(!v);
            });
        }, callback);
    }
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    function _detect(eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, index, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = noop;
                }
                else {
                    callback();
                }
            });
        }, function () {
            main_callback();
        });
    }
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.any =
    async.some = function (arr, iterator, main_callback) {
        async.eachOf(arr, function (x, _, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = noop;
                }
                callback();
            });
        }, function () {
            main_callback(false);
        });
    };

    async.all =
    async.every = function (arr, iterator, main_callback) {
        async.eachOf(arr, function (x, _, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = noop;
                }
                callback();
            });
        }, function () {
            main_callback(true);
        });
    };

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                callback(null, _map(results.sort(comparator), function (x) {
                    return x.value;
                }));
            }

        });

        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    };

    async.auto = function (tasks, callback) {
        callback = _once(callback || noop);
        var keys = _keys(tasks);
        var remainingTasks = keys.length;
        if (!remainingTasks) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        function addListener(fn) {
            listeners.unshift(fn);
        }
        function removeListener(fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        }
        function taskComplete() {
            remainingTasks--;
            _arrayEach(listeners.slice(0), function (fn) {
                fn();
            });
        }

        addListener(function () {
            if (!remainingTasks) {
                callback(null, results);
            }
        });

        _arrayEach(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            function taskCallback(err) {
                var args = _baseSlice(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _arrayEach(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            }
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            // prevent dead-locks
            var len = requires.length;
            var dep;
            while (len--) {
                if (!(dep = tasks[requires[len]])) {
                    throw new Error('Has inexistant dependency');
                }
                if (_isArray(dep) && !!~dep.indexOf(k)) {
                    throw new Error('Has cyclic dependencies');
                }
            }
            function ready() {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            }
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                addListener(listener);
            }
            function listener() {
                if (ready()) {
                    removeListener(listener);
                    task[task.length - 1](taskCallback, results);
                }
            }
        });
    };



    async.retry = function(/*[times,] task [, callback]*/) {
        var DEFAULT_TIMES = 5;
        var DEFAULT_INTERVAL = 0;

        var attempts = [];

        var opts = {
          times: DEFAULT_TIMES,
          interval: DEFAULT_INTERVAL
        };

        function parseTimes(acc, t){
          if(typeof t === 'number'){
            acc.times = parseInt(t, 10) || DEFAULT_TIMES;
          } else if(typeof t === 'object'){
            acc.times = parseInt(t.times, 10) || DEFAULT_TIMES;
            acc.interval = parseInt(t.interval, 10) || DEFAULT_INTERVAL;
          } else {
            throw new Error('Unsupported argument type for \'times\': ' + typeof(t));
          }
        }

        switch(arguments.length){
            case 1: {
              opts.task = arguments[0];
              break;
            }
            case 2 : {
              if(typeof arguments[0] === 'number' || typeof arguments[0] === 'object'){
                parseTimes(opts, arguments[0]);
                opts.task = arguments[1];
              } else {
                opts.task = arguments[0];
                opts.callback = arguments[1];
              }
              break;
            }
            case 3: {
              parseTimes(opts, arguments[0]);
              opts.task = arguments[1];
              opts.callback = arguments[2];
              break;
            }
            default: {
              throw new Error('Invalid arguments - must be either (task), (task, callback), (times, task) or (times, task, callback)');
            }
          }

        function wrappedTask(wrappedCallback, wrappedResults) {
            function retryAttempt(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            }

            function retryInterval(interval){
              return function(seriesCallback){
                setTimeout(function(){
                  seriesCallback(null);
                }, interval);
              };
            }

            while (opts.times) {

                var finalAttempt = !(opts.times-=1);
                attempts.push(retryAttempt(opts.task, finalAttempt));
                if(!finalAttempt && opts.interval > 0){
                  attempts.push(retryInterval(opts.interval));
                }
            }

            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || opts.callback)(data.err, data.result);
            });
        }

        // If a callback is passed, run this as a controll flow
        return opts.callback ? wrappedTask() : wrappedTask;
    };

    async.waterfall = function (tasks, callback) {
        callback = _once(callback || noop);
        if (!_isArray(tasks)) {
            var err = new Error('First argument to waterfall must be an array of functions');
            return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        function wrapIterator(iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                }
                else {
                    var args = _baseSlice(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    ensureAsync(iterator).apply(null, args);
                }
            };
        }
        wrapIterator(async.iterator(tasks))();
    };

    function _parallel(eachfn, tasks, callback) {
        callback = callback || noop;
        var results = _isArrayLike(tasks) ? [] : {};

        eachfn(tasks, function (task, key, callback) {
            task(function (err) {
                var args = _baseSlice(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                results[key] = args;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }

    async.parallel = function (tasks, callback) {
        _parallel(async.eachOf, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel(_eachOfLimit(limit), tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || noop;
        var results = _isArrayLike(tasks) ? [] : {};

        async.eachOfSeries(tasks, function (task, key, callback) {
            task(function (err) {
                var args = _baseSlice(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                results[key] = args;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };

    async.iterator = function (tasks) {
        function makeCallback(index) {
            function fn() {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            }
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        }
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = _baseSlice(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(_baseSlice(arguments))
            );
        };
    };

    function _concat(eachfn, arr, fn, callback) {
        var result = [];
        eachfn(arr, function (x, index, cb) {
            fn(x, function (err, y) {
                result = result.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, result);
        });
    }
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        callback = callback || noop;
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback(null);
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        callback = callback || noop;
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = _baseSlice(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback(null);
            }
        });
    };

    async.until = function (test, iterator, callback) {
        callback = callback || noop;
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback(null);
        }
    };

    async.doUntil = function (iterator, test, callback) {
        callback = callback || noop;
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = _baseSlice(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback(null);
            }
        });
    };

    async.during = function (test, iterator, callback) {
        callback = callback || noop;
        test(function(err, truth) {
            if (err) {
                return callback(err);
            }
            if (truth) {
                iterator(function (err) {
                    if (err) {
                        return callback(err);
                    }
                    async.during(test, iterator, callback);
                });
            }
            else {
                callback(null);
            }
        });
    };

    async.doDuring = function (iterator, test, callback) {
        callback = callback || noop;
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = _baseSlice(arguments, 1);
            args.push(function (err, truth) {
                if (err) {
                   return callback(err);
                }
                if (truth) {
                    async.doDuring(iterator, test, callback);
                }
                else {
                    callback(null);
                }
            });
            test.apply(null, args);
        });
    };

    function _queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new Error('Concurrency must not be zero');
        }
        function _insert(q, data, pos, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                   q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    callback: callback || noop
                };

                if (pos) {
                    q.tasks.unshift(item);
                } else {
                    q.tasks.push(item);
                }

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
            });
            async.setImmediate(q.process);
        }
        function _next(q, tasks) {
            return function(){
                workers -= 1;
                var args = arguments;
                _arrayEach(tasks, function (task) {
                    task.callback.apply(task, args);
                });
                if (q.tasks.length + workers === 0) {
                    q.drain();
                }
                q.process();
            };
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            payload: payload,
            saturated: noop,
            empty: noop,
            drain: noop,
            started: false,
            paused: false,
            push: function (data, callback) {
                _insert(q, data, false, callback);
            },
            kill: function () {
                q.drain = noop;
                q.tasks = [];
            },
            unshift: function (data, callback) {
                _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    while(workers < q.concurrency && q.tasks.length){
                        var tasks = q.payload ?
                            q.tasks.splice(0, q.payload) :
                            q.tasks.splice(0, q.tasks.length);

                        var data = _map(tasks, function (task) {
                            return task.data;
                        });

                        if (q.tasks.length === 0) {
                            q.empty();
                        }
                        workers += 1;
                        var cb = only_once(_next(q, tasks));
                        worker(data, cb);
                    }
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                var resumeCount = Math.min(q.concurrency, q.tasks.length);
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= resumeCount; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    }

    async.queue = function (worker, concurrency) {
        var q = _queue(function (items, cb) {
            worker(items[0], cb);
        }, concurrency, 1);

        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
            return a.priority - b.priority;
        }

        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
              var mid = beg + ((end - beg + 1) >>> 1);
              if (compare(item, sequence[mid]) >= 0) {
                  beg = mid;
              } else {
                  end = mid - 1;
              }
          }
          return beg;
        }

        function _insert(q, data, priority, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    priority: priority,
                    callback: typeof callback === 'function' ? callback : noop
                };

                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
            _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        return _queue(worker, 1, payload);
    };

    function _console_fn(name) {
        return function (fn) {
            var args = _baseSlice(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = _baseSlice(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _arrayEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    }
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        function memoized() {
            var args = _baseSlice(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = _baseSlice(arguments);
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        }
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };

    function _times(mapper) {
        return function (count, iterator, callback) {
            mapper(_range(count), iterator, callback);
        };
    }

    async.times = _times(async.map);
    async.timesSeries = _times(async.mapSeries);
    async.timesLimit = function (count, limit, iterator, callback) {
        return async.mapLimit(_range(count), limit, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = _baseSlice(arguments);

            var callback = args.slice(-1)[0];
            if (typeof callback == 'function') {
                args.pop();
            } else {
                callback = noop;
            }

            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = _baseSlice(arguments, 1);
                    cb(err, nextargs);
                }]));
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
        return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };


    function _applyEach(eachfn, fns /*args...*/) {
        function go() {
            var that = this;
            var args = _baseSlice(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, _, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        }
        if (arguments.length > 2) {
            var args = _baseSlice(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    }

    async.applyEach = function (/*fns, args...*/) {
        var args = _baseSlice(arguments);
        return _applyEach.apply(null, [async.eachOf].concat(args));
    };
    async.applyEachSeries = function (/*fns, args...*/) {
        var args = _baseSlice(arguments);
        return _applyEach.apply(null, [async.eachOfSeries].concat(args));
    };


    async.forever = function (fn, callback) {
        var done = only_once(callback || noop);
        var task = ensureAsync(fn);
        function next(err) {
            if (err) {
                return done(err);
            }
            task(next);
        }
        next();
    };

    function ensureAsync(fn) {
        return function (/*...args, callback*/) {
            var args = _baseSlice(arguments);
            var callback = args.pop();
            args.push(function () {
                var innerArgs = arguments;
                if (sync) {
                    async.setImmediate(function () {
                        callback.apply(null, innerArgs);
                    });
                } else {
                    callback.apply(null, innerArgs);
                }
            });
            var sync = true;
            fn.apply(this, args);
            sync = false;
        };
    }

    async.ensureAsync = ensureAsync;

    async.constant = function constant(/*values...*/) {
        var args = [null].concat(_baseSlice(arguments));
        return function (callback) {
            return callback.apply(this, args);
        };
    };

    async.wrapSync =
    async.asyncify = function asyncify(func) {
        return function (/*args..., callback*/) {
            var args = _baseSlice(arguments);
            var callback = args.pop();
            var result;
            try {
                result = func.apply(this, args);
            } catch (e) {
                return callback(e);
            }
            callback(null, result);
        };
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":25}],2:[function(require,module,exports){
/*!
  Copyright (c) 2015 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/

(function () {
	'use strict';

	function classNames () {

		var classes = '';

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if ('string' === argType || 'number' === argType) {
				classes += ' ' + arg;

			} else if (Array.isArray(arg)) {
				classes += ' ' + classNames.apply(null, arg);

			} else if ('object' === argType) {
				for (var key in arg) {
					if (arg.hasOwnProperty(key) && arg[key]) {
						classes += ' ' + key;
					}
				}
			}
		}

		return classes.substr(1);
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = classNames;
	} else if (typeof define === 'function' && typeof define.amd === 'object' && define.amd){
		// AMD. Register as an anonymous module.
		define(function () {
			return classNames;
		});
	} else {
		window.classNames = classNames;
	}

}());

},{}],3:[function(require,module,exports){
function makeshiftTitle(title, message) {
  return title ? (title + '\n\n' + message) : message
}

// See http://docs.phonegap.com/en/edge/cordova_notification_notification.md.html for documentation
module.exports = {
  alert: function alert(message, callback, title) {
    if (window.navigator.notification && window.navigator.notification.alert) {
      return window.navigator.notification.alert.apply(null, arguments)
    }

    var text = makeshiftTitle(title, message)

    setTimeout(function() {
      window.alert(text)

      callback()
    }, 0)
  },
  confirm: function confirm(message, callback, title) {
    if (window.navigator.notification && window.navigator.notification.confirm) {
      return window.navigator.notification.confirm.apply(null, arguments)
    }

    var text = makeshiftTitle(title, message)

    setTimeout(function() {
      var confirmed = window.confirm(text)
      var buttonIndex = confirmed ? 1 : 2

      callback(buttonIndex)
    }, 0)
  },

  prompt: function prompt(message, callback, title, defaultText) {
    if (window.navigator.notification && window.navigator.notification.prompt) {
      return window.navigator.notification.prompt.apply(null, arguments)
    }

    var question = makeshiftTitle(title, message)

    setTimeout(function() {
      var text = window.prompt(question, defaultText)
      var buttonIndex = (text === null) ? 0 : 1

      callback({
        buttonIndex: buttonIndex,
        input1: text
      })
    }, 0)
  }
}

},{}],4:[function(require,module,exports){
var Promise = require('promise');
var request = require('request');

module.exports = function (options, callback) {
  return new Promise(function (resolve, reject) {
    request(options, function (err, response, body) {
      var status = (response) ? response.statusCode : 0;
      callback = callback || function () {};
      
      if (err) {
        callback(err);
        reject(err);
        return 
      }
      
      try{
        response.body = JSON.parse(body);
      }
      catch (e) {}
      
      if (status >= 400 && status < 600) {
        callback(null, response);
        reject(response);
        return
      }
      
      callback(null, response);
      resolve(response);
    });
  });
};
},{"promise":6,"request":5}],5:[function(require,module,exports){
var request = require('xhr');

// Wrapper to make the features more similiar between
// request and xhr

module.exports = function (options, callback) {
  callback = callback || function () {};
  
  // Set up for Request module
  if (options.data && !window) options.form = options.data;
  
  // Set up for xhr module
  if (options.form && window) {
    options.body = (typeof options.form === 'object')
      ? JSON.stringify(options.form)
      : options.form;
  }
  
  if (options.data) {
    options.body = (typeof options.data === 'object')
      ? JSON.stringify(options.data)
      : options.data;
  }
  
  if (options.url && window) options.uri = options.url;
  if (window) options.cors = options.withCredentials;
  
  return request(options, callback);
};
},{"xhr":12}],6:[function(require,module,exports){
'use strict';

module.exports = require('./lib/core.js')
require('./lib/done.js')
require('./lib/es6-extensions.js')
require('./lib/node-extensions.js')
},{"./lib/core.js":7,"./lib/done.js":8,"./lib/es6-extensions.js":9,"./lib/node-extensions.js":10}],7:[function(require,module,exports){
'use strict';

var asap = require('asap')

module.exports = Promise;
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new self.constructor(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

},{"asap":11}],8:[function(require,module,exports){
'use strict';

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise
Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    asap(function () {
      throw err
    })
  })
}
},{"./core.js":7,"asap":11}],9:[function(require,module,exports){
'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      })
    })
  }
}
ValuePromise.prototype = Promise.prototype

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}

Promise.all = function (arr) {
  var args = Array.prototype.slice.call(arr)

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    })
  });
}

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
}

},{"./core.js":7,"asap":11}],10:[function(require,module,exports){
'use strict';

//This file contains then/promise specific extensions that are only useful for node.js interop

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      var res = fn.apply(self, args)
      if (res && (typeof res === 'object' || typeof res === 'function') && typeof res.then === 'function') {
        resolve(res)
      }
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    var ctx = this
    try {
      return fn.apply(this, arguments).nodeify(callback, ctx)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        asap(function () {
          callback.call(ctx, ex)
        })
      }
    }
  }
}

Promise.prototype.nodeify = function (callback, ctx) {
  if (typeof callback != 'function') return this

  this.then(function (value) {
    asap(function () {
      callback.call(ctx, null, value)
    })
  }, function (err) {
    asap(function () {
      callback.call(ctx, err)
    })
  })
}

},{"./core.js":7,"asap":11}],11:[function(require,module,exports){
(function (process){

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var isNodeJS = false;

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;
        var domain = head.domain;

        if (domain) {
            head.domain = void 0;
            domain.enter();
        }

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function() {
                   throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    flushing = false;
}

if (typeof process !== "undefined" && process.nextTick) {
    // Node.js before 0.9. Note that some fake-Node environments, like the
    // Mocha test runner, introduce a `process` global without a `nextTick`.
    isNodeJS = true;

    requestFlush = function () {
        process.nextTick(flush);
    };

} else if (typeof setImmediate === "function") {
    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
    if (typeof window !== "undefined") {
        requestFlush = setImmediate.bind(window, flush);
    } else {
        requestFlush = function () {
            setImmediate(flush);
        };
    }

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    requestFlush = function () {
        channel.port2.postMessage(0);
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
    };

    if (!flushing) {
        flushing = true;
        requestFlush();
    }
};

module.exports = asap;


}).call(this,require('_process'))

},{"_process":25}],12:[function(require,module,exports){
var window = require("global/window")
var once = require("once")
var parseHeaders = require('parse-headers')

var messages = {
    "0": "Internal XMLHttpRequest Error",
    "4": "4xx Client Error",
    "5": "5xx Server Error"
}

var XHR = window.XMLHttpRequest || noop
var XDR = "withCredentials" in (new XHR()) ? XHR : window.XDomainRequest

module.exports = createXHR

function createXHR(options, callback) {
    if (typeof options === "string") {
        options = { uri: options }
    }

    options = options || {}
    callback = once(callback)

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new XDR()
        }else{
            xhr = new XHR()
        }
    }

    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var key
    var load = options.response ? loadResponse : loadXhr

    if ("json" in options) {
        isJson = true
        headers["Accept"] = "application/json"
        if (method !== "GET" && method !== "HEAD") {
            headers["Content-Type"] = "application/json"
            body = JSON.stringify(options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = load
    xhr.onerror = error
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    // hate IE
    xhr.ontimeout = noop
    xhr.open(method, uri, !sync)
                                    //backward compatibility
    if (options.withCredentials || (options.cors && options.withCredentials !== false)) {
        xhr.withCredentials = true
    }

    // Cannot set timeout with sync request
    if (!sync) {
        xhr.timeout = "timeout" in options ? options.timeout : 5000
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }
    
    if ("beforeSend" in options && 
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    xhr.send(body)

    return xhr

    function readystatechange() {
        if (xhr.readyState === 4) {
            load()
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = null

        if (xhr.response) {
            body = xhr.response
        } else if (xhr.responseType === 'text' || !xhr.responseType) {
            body = xhr.responseText || xhr.responseXML
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }

    function getStatusCode() {
        return xhr.status === 1223 ? 204 : xhr.status
    }

    // if we're getting a none-ok statusCode, build & return an error
    function errorFromStatusCode(status, body) {
        var error = null
        if (status === 0 || (status >= 400 && status < 600)) {
            var message = (typeof body === "string" ? body : false) ||
                messages[String(status).charAt(0)]
            error = new Error(message)
            error.statusCode = status
        }

        return error
    }

    // will load the data & process the response in a special response object
    function loadResponse() {
        var status = getStatusCode()
        var body = getBody()
        var error = errorFromStatusCode(status, body)
        var response = {
            body: body,
            statusCode: status,
            statusText: xhr.statusText,
            raw: xhr
        }
        if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
            response.headers = parseHeaders(xhr.getAllResponseHeaders())
        } else {
            response.headers = {}
        }

        callback(error, response, response.body)
    }

    // will load the data and add some response properties to the source xhr
    // and then respond with that
    function loadXhr() {
        var status = getStatusCode()
        var error = errorFromStatusCode(status)

        xhr.status = xhr.statusCode = status
        xhr.body = getBody()
        xhr.headers = parseHeaders(xhr.getAllResponseHeaders())

        callback(error, xhr, xhr.body)
    }

    function error(evt) {
        callback(evt, xhr)
    }
}


function noop() {}

},{"global/window":13,"once":14,"parse-headers":18}],13:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],14:[function(require,module,exports){
module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var called = false
  return function () {
    if (called) return
    called = true
    return fn.apply(this, arguments)
  }
}

},{}],15:[function(require,module,exports){
var isFunction = require('is-function')

module.exports = forEach

var toString = Object.prototype.toString
var hasOwnProperty = Object.prototype.hasOwnProperty

function forEach(list, iterator, context) {
    if (!isFunction(iterator)) {
        throw new TypeError('iterator must be a function')
    }

    if (arguments.length < 3) {
        context = this
    }
    
    if (toString.call(list) === '[object Array]')
        forEachArray(list, iterator, context)
    else if (typeof list === 'string')
        forEachString(list, iterator, context)
    else
        forEachObject(list, iterator, context)
}

function forEachArray(array, iterator, context) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            iterator.call(context, array[i], i, array)
        }
    }
}

function forEachString(string, iterator, context) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        iterator.call(context, string.charAt(i), i, string)
    }
}

function forEachObject(object, iterator, context) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            iterator.call(context, object[k], k, object)
        }
    }
}

},{"is-function":16}],16:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],17:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],18:[function(require,module,exports){
var trim = require('trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}
},{"for-each":15,"trim":17}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react');

function hasChildrenWithVerticalFill(children) {
	var result = false;

	React.Children.forEach(children, function (c) {
		if (result) return; // early-exit
		if (!c) return;
		if (!c.type) return;

		result = !!c.type.shouldFillVerticalSpace;
	});

	return result;
}

var Container = React.createClass({
	displayName: 'Container',

	propTypes: {
		align: React.PropTypes.oneOf(['end', 'center', 'start']),
		direction: React.PropTypes.oneOf(['column', 'row']),
		justify: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(['end', 'center', 'start'])]),
		grow: React.PropTypes.bool,
		fill: React.PropTypes.bool
	},
	componentDidMount: function componentDidMount() {
		if (this.props.scrollable && this.props.scrollable.mount) {
			this.props.scrollable.mount(this);
		}
	},
	componentWillUnmount: function componentWillUnmount() {
		if (this.props.scrollable && this.props.scrollable.unmount) {
			this.props.scrollable.unmount(this);
		}
	},
	render: function render() {
		var direction = this.props.direction;
		if (!direction) {
			if (hasChildrenWithVerticalFill(this.props.children)) {
				direction = 'column';
			}
		}

		var fill = this.props.fill;
		if (direction === 'column' || this.props.scrollable) {
			fill = true;
		}

		var align = this.props.align;
		if (direction === 'column' && align === 'top') align = 'start';
		if (direction === 'column' && align === 'bottom') align = 'end';
		if (direction === 'row' && align === 'left') align = 'start';
		if (direction === 'row' && align === 'right') align = 'end';

		var className = classnames(this.props.className, {
			'Container--fill': fill,
			'Container--direction-column': direction === 'column',
			'Container--direction-row': direction === 'row',
			'Container--align-center': align === 'center',
			'Container--align-start': align === 'start',
			'Container--align-end': align === 'end',
			'Container--justify-center': this.props.justify === 'center',
			'Container--justify-start': this.props.justify === 'start',
			'Container--justify-end': this.props.justify === 'end',
			'Container--justified': this.props.justify === true,
			'Container--scrollable': this.props.scrollable
		});

		var props = blacklist(this.props, 'className', 'direction', 'fill', 'justify', 'scrollable');

		return React.createElement(
			'div',
			_extends({ className: className }, props),
			this.props.children
		);
	}
});

function initScrollable() {
	var pos;
	var scrollable = {
		reset: function reset() {
			pos = { left: 0, top: 0 };
		},
		mount: function mount(element) {
			var node = React.findDOMNode(element);
			node.scrollLeft = pos.left;
			node.scrollTop = pos.top;
		},
		unmount: function unmount(element) {
			var node = React.findDOMNode(element);
			pos.left = node.scrollLeft;
			pos.top = node.scrollTop;
		}
	};
	scrollable.reset();
	return scrollable;
}

Container.initScrollable = initScrollable;

exports['default'] = Container;
module.exports = exports['default'];
},{"blacklist":20,"classnames":2,"react":undefined}],20:[function(require,module,exports){
module.exports = function blacklist (src) {
  var copy = {}, filter = arguments[1]

  if (typeof filter === 'string') {
    filter = {}
    for (var i = 1; i < arguments.length; i++) {
      filter[arguments[i]] = true
    }
  }

  for (var key in src) {
    // blacklist?
    if (filter[key]) continue

    copy[key] = src[key]
  }

  return copy
}

},{}],21:[function(require,module,exports){
"use strict";

module.exports = function () {
  var listeners = [];

  return {
    componentWillUnmount: function componentWillUnmount() {
      listeners.forEach(function (listener) {
        var emitter = listener.emitter;
        var eventName = listener.eventName;
        var callback = listener.callback;

        var removeListener = emitter.removeListener || emitter.removeEventListener;
        removeListener.call(emitter, eventName, callback);
      });
    },

    watch: function watch(emitter, eventName, callback) {
      listeners.push({
        emitter: emitter,
        eventName: eventName,
        callback: callback
      });

      var addListener = emitter.addListener || emitter.addEventListener;
      addListener.call(emitter, eventName, callback);
    },

    unwatch: function unwatch(emitter, eventName, callback) {
      listeners = listeners.filter(function (listener) {
        return listener.emitter === emitter && listener.eventName === eventName && listener.callback === callback;
      });

      var removeListener = emitter.removeListener || emitter.removeEventListener;
      removeListener.call(emitter, eventName, callback);
    }
  };
};
},{}],22:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react');

// Enable React Touch Events
React.initializeTouchEvents(true);

function getTouchProps(touch) {
	if (!touch) return {};
	return {
		pageX: touch.pageX,
		pageY: touch.pageY,
		clientX: touch.clientX,
		clientY: touch.clientY
	};
}

function isDataOrAriaProp(key) {
	return key.indexOf('data-') === 0 || key.indexOf('aria-') === 0;
}

function getPinchProps(touches) {
	return {
		touches: Array.prototype.map.call(touches, function copyTouch(touch) {
			return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY };
		}),
		center: { x: (touches[0].pageX + touches[1].pageX) / 2, y: (touches[0].pageY + touches[1].pageY) / 2 },
		angle: Math.atan() * (touches[1].pageY - touches[0].pageY) / (touches[1].pageX - touches[0].pageX) * 180 / Math.PI,
		distance: Math.sqrt(Math.pow(Math.abs(touches[1].pageX - touches[0].pageX), 2) + Math.pow(Math.abs(touches[1].pageY - touches[0].pageY), 2))
	};
}

/**
 * Tappable Mixin
 * ==============
 */

var Mixin = {
	propTypes: {
		moveThreshold: React.PropTypes.number, // pixels to move before cancelling tap
		activeDelay: React.PropTypes.number, // ms to wait before adding the `-active` class
		pressDelay: React.PropTypes.number, // ms to wait before detecting a press
		pressMoveThreshold: React.PropTypes.number, // pixels to move before cancelling press
		preventDefault: React.PropTypes.bool, // whether to preventDefault on all events
		stopPropagation: React.PropTypes.bool, // whether to stopPropagation on all events

		onTap: React.PropTypes.func, // fires when a tap is detected
		onPress: React.PropTypes.func, // fires when a press is detected
		onTouchStart: React.PropTypes.func, // pass-through touch event
		onTouchMove: React.PropTypes.func, // pass-through touch event
		onTouchEnd: React.PropTypes.func, // pass-through touch event
		onMouseDown: React.PropTypes.func, // pass-through mouse event
		onMouseUp: React.PropTypes.func, // pass-through mouse event
		onMouseMove: React.PropTypes.func, // pass-through mouse event
		onMouseOut: React.PropTypes.func, // pass-through mouse event

		onPinchStart: React.PropTypes.func, // fires when a pinch gesture is started
		onPinchMove: React.PropTypes.func, // fires on every touch-move when a pinch action is active
		onPinchEnd: React.PropTypes.func // fires when a pinch action ends
	},

	getDefaultProps: function getDefaultProps() {
		return {
			activeDelay: 0,
			moveThreshold: 100,
			pressDelay: 1000,
			pressMoveThreshold: 5
		};
	},

	getInitialState: function getInitialState() {
		return {
			isActive: false,
			touchActive: false,
			pinchActive: false
		};
	},

	componentWillUnmount: function componentWillUnmount() {
		this.cleanupScrollDetection();
		this.cancelPressDetection();
		this.clearActiveTimeout();
	},

	processEvent: function processEvent(event) {
		if (this.props.preventDefault) event.preventDefault();
		if (this.props.stopPropagation) event.stopPropagation();
	},

	onTouchStart: function onTouchStart(event) {
		if (this.props.onTouchStart && this.props.onTouchStart(event) === false) return;
		this.processEvent(event);
		window._blockMouseEvents = true;
		if (event.touches.length === 1) {
			this._initialTouch = this._lastTouch = getTouchProps(event.touches[0]);
			this.initScrollDetection();
			this.initPressDetection(event, this.endTouch);
			this._activeTimeout = setTimeout(this.makeActive, this.props.activeDelay);
		} else if ((this.props.onPinchStart || this.props.onPinchMove || this.props.onPinchEnd) && event.touches.length === 2) {
			this.onPinchStart(event);
		}
	},

	makeActive: function makeActive() {
		if (!this.isMounted()) return;
		this.clearActiveTimeout();
		this.setState({
			isActive: true
		});
	},

	clearActiveTimeout: function clearActiveTimeout() {
		clearTimeout(this._activeTimeout);
		this._activeTimeout = false;
	},

	onPinchStart: function onPinchStart(event) {
		// in case the two touches didn't start exactly at the same time
		if (this._initialTouch) {
			this.endTouch();
		}
		var touches = event.touches;
		this._initialPinch = getPinchProps(touches);
		this._initialPinch = _extends(this._initialPinch, {
			displacement: { x: 0, y: 0 },
			displacementVelocity: { x: 0, y: 0 },
			rotation: 0,
			rotationVelocity: 0,
			zoom: 1,
			zoomVelocity: 0,
			time: Date.now()
		});
		this._lastPinch = this._initialPinch;
		this.props.onPinchStart && this.props.onPinchStart(this._initialPinch, event);
	},

	onPinchMove: function onPinchMove(event) {
		if (this._initialTouch) {
			this.endTouch();
		}
		var touches = event.touches;
		if (touches.length !== 2) {
			return this.onPinchEnd(event) // bail out before disaster
			;
		}

		var currentPinch = touches[0].identifier === this._initialPinch.touches[0].identifier && touches[1].identifier === this._initialPinch.touches[1].identifier ? getPinchProps(touches) // the touches are in the correct order
		: touches[1].identifier === this._initialPinch.touches[0].identifier && touches[0].identifier === this._initialPinch.touches[1].identifier ? getPinchProps(touches.reverse()) // the touches have somehow changed order
		: getPinchProps(touches); // something is wrong, but we still have two touch-points, so we try not to fail

		currentPinch.displacement = {
			x: currentPinch.center.x - this._initialPinch.center.x,
			y: currentPinch.center.y - this._initialPinch.center.y
		};

		currentPinch.time = Date.now();
		var timeSinceLastPinch = currentPinch.time - this._lastPinch.time;

		currentPinch.displacementVelocity = {
			x: (currentPinch.displacement.x - this._lastPinch.displacement.x) / timeSinceLastPinch,
			y: (currentPinch.displacement.y - this._lastPinch.displacement.y) / timeSinceLastPinch
		};

		currentPinch.rotation = currentPinch.angle - this._initialPinch.angle;
		currentPinch.rotationVelocity = currentPinch.rotation - this._lastPinch.rotation / timeSinceLastPinch;

		currentPinch.zoom = currentPinch.distance / this._initialPinch.distance;
		currentPinch.zoomVelocity = (currentPinch.zoom - this._lastPinch.zoom) / timeSinceLastPinch;

		this.props.onPinchMove && this.props.onPinchMove(currentPinch, event);

		this._lastPinch = currentPinch;
	},

	onPinchEnd: function onPinchEnd(event) {
		// TODO use helper to order touches by identifier and use actual values on touchEnd.
		var currentPinch = _extends({}, this._lastPinch);
		currentPinch.time = Date.now();

		if (currentPinch.time - this._lastPinch.time > 16) {
			currentPinch.displacementVelocity = 0;
			currentPinch.rotationVelocity = 0;
			currentPinch.zoomVelocity = 0;
		}

		this.props.onPinchEnd && this.props.onPinchEnd(currentPinch, event);

		this._initialPinch = this._lastPinch = null;

		// If one finger is still on screen, it should start a new touch event for swiping etc
		// But it should never fire an onTap or onPress event.
		// Since there is no support swipes yet, this should be disregarded for now
		// if (event.touches.length === 1) {
		// 	this.onTouchStart(event);
		// }
	},

	initScrollDetection: function initScrollDetection() {
		this._scrollPos = { top: 0, left: 0 };
		this._scrollParents = [];
		this._scrollParentPos = [];
		var node = this.getDOMNode();
		while (node) {
			if (node.scrollHeight > node.offsetHeight || node.scrollWidth > node.offsetWidth) {
				this._scrollParents.push(node);
				this._scrollParentPos.push(node.scrollTop + node.scrollLeft);
				this._scrollPos.top += node.scrollTop;
				this._scrollPos.left += node.scrollLeft;
			}
			node = node.parentNode;
		}
	},

	calculateMovement: function calculateMovement(touch) {
		return {
			x: Math.abs(touch.clientX - this._initialTouch.clientX),
			y: Math.abs(touch.clientY - this._initialTouch.clientY)
		};
	},

	detectScroll: function detectScroll() {
		var currentScrollPos = { top: 0, left: 0 };
		for (var i = 0; i < this._scrollParents.length; i++) {
			currentScrollPos.top += this._scrollParents[i].scrollTop;
			currentScrollPos.left += this._scrollParents[i].scrollLeft;
		}
		return !(currentScrollPos.top === this._scrollPos.top && currentScrollPos.left === this._scrollPos.left);
	},

	cleanupScrollDetection: function cleanupScrollDetection() {
		this._scrollParents = undefined;
		this._scrollPos = undefined;
	},

	initPressDetection: function initPressDetection(event, callback) {
		if (!this.props.onPress) return;
		this._pressTimeout = setTimeout((function () {
			this.props.onPress(event);
			callback();
		}).bind(this), this.props.pressDelay);
	},

	cancelPressDetection: function cancelPressDetection() {
		clearTimeout(this._pressTimeout);
	},

	onTouchMove: function onTouchMove(event) {
		if (this._initialTouch) {
			this.processEvent(event);

			if (this.detectScroll()) return this.endTouch(event);

			this.props.onTouchMove && this.props.onTouchMove(event);
			this._lastTouch = getTouchProps(event.touches[0]);
			var movement = this.calculateMovement(this._lastTouch);
			if (movement.x > this.props.pressMoveThreshold || movement.y > this.props.pressMoveThreshold) {
				this.cancelPressDetection();
			}
			if (movement.x > this.props.moveThreshold || movement.y > this.props.moveThreshold) {
				if (this.state.isActive) {
					this.setState({
						isActive: false
					});
				} else if (this._activeTimeout) {
					this.clearActiveTimeout();
				}
			} else {
				if (!this.state.isActive && !this._activeTimeout) {
					this.setState({
						isActive: true
					});
				}
			}
		} else if (this._initialPinch && event.touches.length === 2) {
			this.onPinchMove(event);
			event.preventDefault();
		}
	},

	onTouchEnd: function onTouchEnd(event) {
		var _this = this;

		if (this._initialTouch) {
			this.processEvent(event);
			var afterEndTouch;
			var movement = this.calculateMovement(this._lastTouch);
			if (movement.x <= this.props.moveThreshold && movement.y <= this.props.moveThreshold && this.props.onTap) {
				event.preventDefault();
				afterEndTouch = function () {
					var finalParentScrollPos = _this._scrollParents.map(function (node) {
						return node.scrollTop + node.scrollLeft;
					});
					var stoppedMomentumScroll = _this._scrollParentPos.some(function (end, i) {
						return end !== finalParentScrollPos[i];
					});
					if (!stoppedMomentumScroll) {
						_this.props.onTap(event);
					}
				};
			}
			this.endTouch(event, afterEndTouch);
		} else if (this._initialPinch && event.touches.length + event.changedTouches.length === 2) {
			this.onPinchEnd(event);
			event.preventDefault();
		}
	},

	endTouch: function endTouch(event, callback) {
		this.cancelPressDetection();
		this.clearActiveTimeout();
		if (event && this.props.onTouchEnd) {
			this.props.onTouchEnd(event);
		}
		this._initialTouch = null;
		this._lastTouch = null;
		if (this.state.isActive) {
			this.setState({
				isActive: false
			}, callback);
		} else if (callback) {
			callback();
		}
	},

	onMouseDown: function onMouseDown(event) {
		if (window._blockMouseEvents) {
			window._blockMouseEvents = false;
			return;
		}
		if (this.props.onMouseDown && this.props.onMouseDown(event) === false) return;
		this.processEvent(event);
		this.initPressDetection(event, this.endMouseEvent);
		this._mouseDown = true;
		this.setState({
			isActive: true
		});
	},

	onMouseMove: function onMouseMove(event) {
		if (window._blockMouseEvents || !this._mouseDown) return;
		this.processEvent(event);
		this.props.onMouseMove && this.props.onMouseMove(event);
	},

	onMouseUp: function onMouseUp(event) {
		if (window._blockMouseEvents || !this._mouseDown) return;
		this.processEvent(event);
		this.props.onMouseUp && this.props.onMouseUp(event);
		this.props.onTap && this.props.onTap(event);
		this.endMouseEvent();
	},

	onMouseOut: function onMouseOut(event) {
		if (window._blockMouseEvents || !this._mouseDown) return;
		this.processEvent(event);
		this.props.onMouseOut && this.props.onMouseOut(event);
		this.endMouseEvent();
	},

	endMouseEvent: function endMouseEvent() {
		this.cancelPressDetection();
		this._mouseDown = false;
		this.setState({
			isActive: false
		});
	},

	touchStyles: function touchStyles() {
		return {
			WebkitTapHighlightColor: 'rgba(0,0,0,0)',
			WebkitTouchCallout: 'none',
			WebkitUserSelect: 'none',
			KhtmlUserSelect: 'none',
			MozUserSelect: 'none',
			msUserSelect: 'none',
			userSelect: 'none',
			cursor: 'pointer'
		};
	},

	handlers: function handlers() {
		return {
			onTouchStart: this.onTouchStart,
			onTouchMove: this.onTouchMove,
			onTouchEnd: this.onTouchEnd,
			onMouseDown: this.onMouseDown,
			onMouseUp: this.onMouseUp,
			onMouseMove: this.onMouseMove,
			onMouseOut: this.onMouseOut
		};
	}
};

/**
 * Tappable Component
 * ==================
 */

var Component = React.createClass({

	displayName: 'Tappable',

	mixins: [Mixin],

	propTypes: {
		component: React.PropTypes.any, // component to create
		className: React.PropTypes.string, // optional className
		classBase: React.PropTypes.string, // base for generated classNames
		style: React.PropTypes.object, // additional style properties for the component
		disabled: React.PropTypes.bool // only applies to buttons
	},

	getDefaultProps: function getDefaultProps() {
		return {
			component: 'span',
			classBase: 'Tappable'
		};
	},

	render: function render() {
		var props = this.props;
		var className = props.classBase + (this.state.isActive ? '-active' : '-inactive');

		if (props.className) {
			className += ' ' + props.className;
		}

		var style = {};
		_extends(style, this.touchStyles(), props.style);

		var newComponentProps = _extends({}, props, {
			style: style,
			className: className,
			disabled: props.disabled,
			handlers: this.handlers
		}, this.handlers());

		delete newComponentProps.onTap;
		delete newComponentProps.onPress;
		delete newComponentProps.onPinchStart;
		delete newComponentProps.onPinchMove;
		delete newComponentProps.onPinchEnd;
		delete newComponentProps.moveThreshold;
		delete newComponentProps.pressDelay;
		delete newComponentProps.pressMoveThreshold;
		delete newComponentProps.preventDefault;
		delete newComponentProps.stopPropagation;
		delete newComponentProps.component;

		return React.createElement(props.component, newComponentProps, props.children);
	}
});

Component.Mixin = Mixin;
module.exports = Component;
},{"react":undefined}],23:[function(require,module,exports){
module.exports = function Timers () {
  var intervals = []
  var timeouts = []

  return {
    clearIntervals: function () {
      intervals.forEach(clearInterval)
    },

    clearTimeouts: function () {
      timeouts.forEach(clearTimeout)
    },

    clearTimers: function () {
      this.clearInterval()
      this.clearTimeouts()
    },

    componentWillMount: function () {
      intervals = []
      timeouts = []
    },

    componentWillUnmount: function () {
      this.clearIntervals()
      this.clearTimeouts()
    },

    countDown: function (callback, timeout, interval) {
      var self = this
      var sleep = Math.min(timeout, interval)

      this.setTimeout(function () {
        var remaining = timeout - sleep

        callback(remaining)
        if (remaining <= 0) return

        self.countDown(callback, remaining, interval)
      }, sleep)
    },

    setInterval: function (callback, interval) {
      var self = this

      intervals.push(setInterval(function () {
        if (!self.isMounted()) return

        callback.call(self)
      }, interval))
    },

    setTimeout: function (callback, timeout) {
      var self = this

      timeouts.push(setTimeout(function () {
        if (!self.isMounted()) return

        callback.call(self)
      }, timeout))
    }
  }
}

},{}],24:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],25:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var React = require('react');
var Container = require('react-container');

var ErrorView = React.createClass({
	displayName: 'ErrorView',

	propTypes: {
		children: React.PropTypes.node
	},

	render: function render() {
		return React.createElement(
			Container,
			{ fill: true, className: 'View ErrorView' },
			this.props.children
		);
	}
});

exports['default'] = ErrorView;
module.exports = exports['default'];
},{"react":undefined,"react-container":19}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var React = require('react');
var Tappable = require('react-tappable');
var Transitions = require('../mixins/Transitions');

var Link = React.createClass({
	displayName: 'Link',

	mixins: [Transitions],
	propTypes: {
		children: React.PropTypes.any,
		options: React.PropTypes.object,
		transition: React.PropTypes.string,
		to: React.PropTypes.string,
		viewProps: React.PropTypes.any
	},

	doTransition: function doTransition() {
		var options = _extends({ viewProps: this.props.viewProps, transition: this.props.transition }, this.props.options);
		console.info('Link to "' + this.props.to + '" using transition "' + this.props.transition + '"' + ' with props ', this.props.viewProps);
		this.transitionTo(this.props.to, options);
	},

	render: function render() {
		var tappableProps = blacklist(this.props, 'children', 'options', 'transition', 'viewProps');

		return React.createElement(
			Tappable,
			_extends({ onTap: this.doTransition }, tappableProps),
			this.props.children
		);
	}
});

exports['default'] = Link;
module.exports = exports['default'];
},{"../mixins/Transitions":32,"blacklist":64,"react":undefined,"react-tappable":22}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var React = require('react');

var View = React.createClass({
	displayName: 'View',

	propTypes: {
		component: React.PropTypes.func.isRequired,
		name: React.PropTypes.string.isRequired
	},
	render: function render() {
		throw new Error('TouchstoneJS <View> should not be rendered directly.');
	}
});

exports['default'] = View;
module.exports = exports['default'];
},{"react":undefined}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classNames = require('classnames');
var ErrorView = require('./ErrorView');
var React = require('react/addons');
var Transition = React.addons.CSSTransitionGroup;

function createViewsFromChildren(children) {
	var views = {};
	React.Children.forEach(children, function (view) {
		views[view.props.name] = view;
	});
	return views;
}

var ViewContainer = React.createClass({
	displayName: 'ViewContainer',

	statics: {
		shouldFillVerticalSpace: true
	},
	propTypes: {
		children: React.PropTypes.node
	},
	render: function render() {
		var props = blacklist(this.props, 'children');
		return React.createElement(
			'div',
			props,
			this.props.children
		);
	}
});

var ViewManager = React.createClass({
	displayName: 'ViewManager',

	statics: {
		shouldFillVerticalSpace: true
	},
	contextTypes: {
		app: React.PropTypes.object.isRequired
	},
	propTypes: {
		name: React.PropTypes.string,
		children: React.PropTypes.node,
		className: React.PropTypes.string,
		defaultView: React.PropTypes.string,
		onViewChange: React.PropTypes.func
	},
	getDefaultProps: function getDefaultProps() {
		return {
			name: '__default'
		};
	},
	getInitialState: function getInitialState() {
		return {
			views: createViewsFromChildren(this.props.children),
			currentView: this.props.defaultView,
			options: {}
		};
	},
	componentDidMount: function componentDidMount() {
		this.context.app.viewManagers[this.props.name] = this;
	},
	componentWillUnmount: function componentWillUnmount() {
		delete this.context.app.viewManagers[this.props.name];
	},
	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		this.setState({
			views: createViewsFromChildren(this.props.children)
		});
		if (nextProps.name !== this.props.name) {
			this.context.app.viewManagers[nextProps.name] = this;
			delete this.context.app.viewManagers[this.props.name];
		}
		if (nextProps.currentView && nextProps.currentView !== this.state.currentView) {
			this.transitionTo(nextProps.currentView, { viewProps: nextProps.viewProps });
		}
	},
	transitionTo: function transitionTo(viewKey, options) {
		var _this = this;

		if (typeof options === 'string') {
			options = { transition: options };
		}
		if (!options) options = {};
		this.activeTransitionOptions = options;
		this.context.app.viewManagerInTransition = this;
		this.props.onViewChange && this.props.onViewChange(viewKey);
		this.setState({
			currentView: viewKey,
			options: options
		}, function () {
			delete _this.activeTransitionOptions;
			delete _this.context.app.viewManagerInTransition;
		});
	},
	renderViewContainer: function renderViewContainer() {
		var viewKey = this.state.currentView;
		if (!viewKey) {
			return React.createElement(
				ErrorView,
				null,
				React.createElement(
					'span',
					{ className: 'ErrorView__heading' },
					'ViewManager: ',
					this.props.name
				),
				React.createElement(
					'span',
					{ className: 'ErrorView__text' },
					'Error: There is no current View.'
				)
			);
		}
		var view = this.state.views[viewKey];
		if (!view || !view.props.component) {
			return React.createElement(
				ErrorView,
				null,
				React.createElement(
					'span',
					{ className: 'ErrorView__heading' },
					'ViewManager: "',
					this.props.name,
					'"'
				),
				React.createElement(
					'span',
					{ className: 'ErrorView__text' },
					'The View "',
					viewKey,
					'" is invalid.'
				)
			);
		}
		var options = this.state.options || {};
		var viewClassName = classNames('View View--' + viewKey, view.props.className);
		var ViewComponent = view.props.component;
		var viewProps = blacklist(view.props, 'component', 'className');
		_extends(viewProps, options.viewProps);
		var viewElement = React.createElement(ViewComponent, viewProps);

		if (this.__lastRenderedView !== viewKey) {
			// console.log('initialising view ' + viewKey + ' with options', options);
			if (viewElement.type.navigationBar && viewElement.type.getNavigation) {
				var app = this.context.app;
				var transition = options.transition;
				if (app.viewManagerInTransition) {
					transition = app.viewManagerInTransition.activeTransitionOptions.transition;
				}
				setTimeout(function () {
					app.navigationBars[viewElement.type.navigationBar].updateWithTransition(viewElement.type.getNavigation(viewProps, app), transition);
				}, 0);
			}
			this.__lastRenderedView = viewKey;
		}

		return React.createElement(
			ViewContainer,
			{ className: viewClassName, key: viewKey },
			viewElement
		);
	},
	render: function render() {
		var className = classNames('ViewManager', this.props.className);
		var viewContainer = this.renderViewContainer(this.state.currentView, { viewProps: this.state.currentViewProps });

		var transitionName = 'view-transition-instant';
		if (this.state.options.transition) {
			// console.log('applying view transition: ' + this.state.options.transition + ' to view ' + this.state.currentView);
			transitionName = 'view-transition-' + this.state.options.transition;
		}
		return React.createElement(
			Transition,
			{ transitionName: transitionName, transitionEnter: true, transitionLeave: true, className: className, component: 'div' },
			viewContainer
		);
	}
});

exports['default'] = ViewManager;
module.exports = exports['default'];
},{"./ErrorView":26,"blacklist":64,"classnames":2,"react/addons":undefined}],30:[function(require,module,exports){
'use strict';

var animation = require('tween.js');
var React = require('react');

function update() {
	animation.update();
	if (animation.getAll().length) {
		window.requestAnimationFrame(update);
	}
}

function scrollToTop(el, options) {
	options = options || {};
	var from = el.scrollTop;
	var duration = Math.min(Math.max(200, from / 2), 350);
	if (from > 200) duration = 300;
	el.style.webkitOverflowScrolling = 'auto';
	el.style.overflow = 'hidden';
	var tween = new animation.Tween({ pos: from }).to({ pos: 0 }, duration).easing(animation.Easing.Quadratic.Out).onUpdate(function () {
		el.scrollTop = this.pos;
		if (options.onUpdate) {
			options.onUpdate();
		}
	}).onComplete(function () {
		el.style.webkitOverflowScrolling = 'touch';
		el.style.overflow = 'scroll';
		if (options.onComplete) options.onComplete();
	}).start();
	update();
	return tween;
}

exports.scrollToTop = scrollToTop;

var Mixins = exports.Mixins = {};

Mixins.ScrollContainerToTop = {
	componentDidMount: function componentDidMount() {
		window.addEventListener('statusTap', this.scrollContainerToTop);
	},
	componentWillUnmount: function componentWillUnmount() {
		window.removeEventListener('statusTap', this.scrollContainerToTop);
		if (this._scrollContainerAnimation) {
			this._scrollContainerAnimation.stop();
		}
	},
	scrollContainerToTop: function scrollContainerToTop() {
		var _this = this;

		if (!this.isMounted() || !this.refs.scrollContainer) return;
		this._scrollContainerAnimation = scrollToTop(React.findDOMNode(this.refs.scrollContainer), {
			onComplete: function onComplete() {
				delete _this._scrollContainerAnimation;
			}
		});
	}
};
},{"react":undefined,"tween.js":65}],31:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports.createApp = createApp;
var React = require('react');

var animation = require('./core/animation');
exports.animation = animation;
var Link = require('./core/Link');
exports.Link = Link;
var View = require('./core/View');
exports.View = View;
var ViewManager = require('./core/ViewManager');

exports.ViewManager = ViewManager;
var Container = require('react-container');
exports.Container = Container;
var Mixins = require('./mixins');
exports.Mixins = Mixins;
var UI = require('./ui');

exports.UI = UI;

function createApp() {
	var app = {
		navigationBars: {},
		viewManagers: {},
		views: {},
		transitionTo: function transitionTo(view, opts) {
			var vm = '__default';
			view = view.split(':');
			if (view.length > 1) {
				vm = view.shift();
			}
			view = view[0];
			app.viewManagers[vm].transitionTo(view, opts);
		}
	};
	return {
		childContextTypes: {
			app: React.PropTypes.object
		},
		getChildContext: function getChildContext() {
			return {
				app: app
			};
		}
	};
}
},{"./core/Link":27,"./core/View":28,"./core/ViewManager":29,"./core/animation":30,"./mixins":33,"./ui":63,"react":undefined,"react-container":19}],32:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var React = require('react');

var Transitions = {
	contextTypes: {
		app: React.PropTypes.object
	},
	transitionTo: function transitionTo(view, opts) {
		this.context.app.transitionTo(view, opts);
	}
};

exports['default'] = Transitions;
module.exports = exports['default'];
},{"react":undefined}],33:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var Transitions = require('./Transitions');
exports.Transitions = Transitions;
},{"./Transitions":32}],34:[function(require,module,exports){
'use strict';

var React = require('react/addons');
var classnames = require('classnames');
var Transition = React.addons.CSSTransitionGroup;

module.exports = React.createClass({
	displayName: 'Alertbar',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string,
		pulse: React.PropTypes.bool,
		type: React.PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger']),
		visible: React.PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = classnames('Alertbar', 'Alertbar--' + this.props.type, {
			'Alertbar--pulse': this.props.pulse
		}, this.props.className);

		var inner = this.props.pulse ? React.createElement(
			'div',
			{ className: 'Alertbar__inner' },
			this.props.children
		) : this.props.children;
		var content = this.props.visible ? React.createElement(
			'div',
			{ className: className },
			inner
		) : null;

		return React.createElement(
			Transition,
			{ transitionName: 'Alertbar', className: 'Alertbar__testything', component: 'div' },
			content
		);
	}
});
},{"classnames":2,"react/addons":undefined}],35:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react/addons');
var Tappable = require('react-tappable');

var blacklist = require('blacklist');
var classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'Button',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string,
		type: React.PropTypes.oneOf(['default', 'info', 'primary', 'success', 'warning', 'danger'])
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = classnames('Button', 'Button--' + this.props.type, this.props.className);
		var props = blacklist(this.props, 'type');

		return React.createElement(Tappable, _extends({}, props, { className: className, component: 'button' }));
	}
});
},{"blacklist":64,"classnames":2,"react-tappable":22,"react/addons":undefined}],36:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'ButtonGroup',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('ButtonGroup', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],37:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'FieldControl',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('FieldControl', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],38:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'FieldLabel',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('FieldLabel', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],39:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'Group',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('Group', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],40:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'GroupBody',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('GroupBody', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],41:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'GroupFooter',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('GroupFooter', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],42:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'GroupHeader',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('GroupHeader', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],43:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var Item = require('./Item');
var ItemContent = require('./ItemContent');
var ItemInner = require('./ItemInner');
var React = require('react/addons');

var blacklist = require('blacklist');

module.exports = React.createClass({
	displayName: 'Input',

	propTypes: {
		className: React.PropTypes.string,
		children: React.PropTypes.node,
		disabled: React.PropTypes.bool
	},

	render: function render() {
		var inputProps = blacklist(this.props, 'children', 'className');

		return React.createElement(
			Item,
			{ className: this.props.className, selectable: this.props.disabled, component: 'label' },
			React.createElement(
				ItemInner,
				null,
				React.createElement(
					ItemContent,
					{ component: 'label' },
					React.createElement('input', _extends({ className: 'field', type: 'text' }, inputProps))
				),
				this.props.children
			)
		);
	}
});
},{"./Item":44,"./ItemContent":45,"./ItemInner":46,"blacklist":64,"react/addons":undefined}],44:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react/addons');
var classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'Item',

	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string,
		showDisclosureArrow: React.PropTypes.bool
	},

	render: function render() {
		var className = classnames('Item', {
			'Item--has-disclosure-arrow': this.props.showDisclosureArrow
		}, this.props.className);

		return React.createElement('div', _extends({}, this.props, { className: className }));
	}
});
},{"classnames":2,"react/addons":undefined}],45:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'ItemContent',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('Item__content', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],46:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react/addons');

var classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'ItemInner',

	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},

	render: function render() {
		var className = classnames('Item__inner', this.props.className);

		return React.createElement('div', _extends({ className: className }, this.props));
	}
});
},{"classnames":2,"react/addons":undefined}],47:[function(require,module,exports){
'use strict';

var React = require('react/addons');
var classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'ItemMedia',
	propTypes: {
		avatar: React.PropTypes.string,
		avatarInitials: React.PropTypes.string,
		className: React.PropTypes.string,
		icon: React.PropTypes.string,
		thumbnail: React.PropTypes.string
	},

	render: function render() {
		var className = classnames({
			'Item__media': true,
			'Item__media--icon': this.props.icon,
			'Item__media--avatar': this.props.avatar || this.props.avatarInitials,
			'Item__media--thumbnail': this.props.thumbnail
		}, this.props.className);

		// media types
		var icon = this.props.icon ? React.createElement('div', { className: 'Item__media__icon ' + this.props.icon }) : null;
		var avatar = this.props.avatar || this.props.avatarInitials ? React.createElement(
			'div',
			{ className: 'Item__media__avatar' },
			this.props.avatar ? React.createElement('img', { src: this.props.avatar }) : this.props.avatarInitials
		) : null;
		var thumbnail = this.props.thumbnail ? React.createElement(
			'div',
			{ className: 'Item__media__thumbnail' },
			React.createElement('img', { src: this.props.thumbnail })
		) : null;

		return React.createElement(
			'div',
			{ className: className },
			icon,
			avatar,
			thumbnail
		);
	}
});
},{"classnames":2,"react/addons":undefined}],48:[function(require,module,exports){
'use strict';

var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'ItemNote',
	propTypes: {
		className: React.PropTypes.string,
		icon: React.PropTypes.string,
		label: React.PropTypes.string,
		type: React.PropTypes.string
	},
	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},
	render: function render() {
		var className = classnames('Item__note', 'Item__note--' + this.props.type, this.props.className);

		// elements
		var label = this.props.label ? React.createElement(
			'div',
			{ className: 'Item__note__label' },
			this.props.label
		) : null;
		var icon = this.props.icon ? React.createElement('div', { className: 'Item__note__icon ' + this.props.icon }) : null;

		return React.createElement(
			'div',
			{ className: className },
			label,
			icon
		);
	}
});
},{"classnames":2,"react/addons":undefined}],49:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'ItemSubTitle',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('Item__subtitle', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],50:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'ItemTitle',
	propTypes: {
		children: React.PropTypes.node.isRequired,
		className: React.PropTypes.string
	},
	render: function render() {
		var className = classnames('Item__title', this.props.className);
		var props = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],51:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var FieldControl = require('./FieldControl');
var FieldLabel = require('./FieldLabel');
var Item = require('./Item');
var ItemInner = require('./ItemInner');
var React = require('react/addons');

var blacklist = require('blacklist');

module.exports = React.createClass({
	displayName: 'LabelInput',

	propTypes: {
		alignTop: React.PropTypes.bool,
		children: React.PropTypes.node,
		className: React.PropTypes.string,
		disabled: React.PropTypes.bool,
		label: React.PropTypes.string,
		readOnly: React.PropTypes.bool,
		value: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			readOnly: false
		};
	},

	render: function render() {
		var inputProps = blacklist(this.props, 'alignTop', 'children', 'first', 'readOnly');
		var renderInput = this.props.readOnly ? React.createElement(
			'div',
			{ className: 'field u-selectable' },
			this.props.value
		) : React.createElement('input', _extends({ className: 'field', type: 'text' }, inputProps));

		return React.createElement(
			Item,
			{ alignTop: this.props.alignTop, selectable: this.props.disabled, className: this.props.className, component: 'label' },
			React.createElement(
				ItemInner,
				null,
				React.createElement(
					FieldLabel,
					null,
					this.props.label
				),
				React.createElement(
					FieldControl,
					null,
					renderInput,
					this.props.children
				)
			)
		);
	}
});
},{"./FieldControl":37,"./FieldLabel":38,"./Item":44,"./ItemInner":46,"blacklist":64,"react/addons":undefined}],52:[function(require,module,exports){
'use strict';

var FieldControl = require('./FieldControl');
var FieldLabel = require('./FieldLabel');
var Item = require('./Item');
var ItemInner = require('./ItemInner');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'LabelSelect',
	propTypes: {
		alignTop: React.PropTypes.bool,
		className: React.PropTypes.string,
		disabled: React.PropTypes.bool,
		first: React.PropTypes.bool,
		label: React.PropTypes.string,
		options: React.PropTypes.array,
		value: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			className: ''
		};
	},

	getInitialState: function getInitialState() {
		return {
			value: this.props.value
		};
	},

	updateInputValue: function updateInputValue(event) {
		this.setState({
			value: event.target.value
		});
	},

	render: function render() {
		// Map Options
		var options = this.props.options.map(function (op) {
			return React.createElement(
				'option',
				{ key: 'option-' + op.value, value: op.value },
				op.label
			);
		});

		return React.createElement(
			Item,
			{ alignTop: this.props.alignTop, selectable: this.props.disabled, className: this.props.className, component: 'label' },
			React.createElement(
				ItemInner,
				null,
				React.createElement(
					FieldLabel,
					null,
					this.props.label
				),
				React.createElement(
					FieldControl,
					null,
					React.createElement(
						'select',
						{ value: this.state.value, onChange: this.updateInputValue, className: 'select-field' },
						options
					),
					React.createElement(
						'div',
						{ className: 'select-field-indicator' },
						React.createElement('div', { className: 'select-field-indicator-arrow' })
					)
				)
			)
		);
	}
});
},{"./FieldControl":37,"./FieldLabel":38,"./Item":44,"./ItemInner":46,"react/addons":undefined}],53:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var blacklist = require('blacklist');
var classnames = require('classnames');
var React = require('react/addons');

module.exports = React.createClass({
	displayName: 'LabelTextarea',

	propTypes: {
		children: React.PropTypes.node,
		className: React.PropTypes.string,
		disabled: React.PropTypes.bool,
		first: React.PropTypes.bool,
		label: React.PropTypes.string,
		readOnly: React.PropTypes.bool,
		value: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			rows: 3
		};
	},

	render: function render() {
		var className = classnames(this.props.className, 'list-item', 'field-item', 'align-top', {
			'is-first': this.props.first,
			'u-selectable': this.props.disabled
		});

		var props = blacklist(this.props, 'children', 'className', 'disabled', 'first', 'label', 'readOnly');

		var renderInput = this.props.readOnly ? React.createElement(
			'div',
			{ className: 'field u-selectable' },
			this.props.value
		) : React.createElement('textarea', _extends({}, props, { className: 'field' }));

		return React.createElement(
			'div',
			{ className: className },
			React.createElement(
				'label',
				{ className: 'item-inner' },
				React.createElement(
					'div',
					{ className: 'field-label' },
					this.props.label
				),
				React.createElement(
					'div',
					{ className: 'field-control' },
					renderInput,
					this.props.children
				)
			)
		);
	}
});
},{"blacklist":64,"classnames":2,"react/addons":undefined}],54:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react');

var blacklist = require('blacklist');
var classNames = require('classnames');

module.exports = React.createClass({
	displayName: 'ListHeader',

	propTypes: {
		className: React.PropTypes.string,
		sticky: React.PropTypes.bool
	},

	render: function render() {
		var className = classNames('list-header', {
			'sticky': this.props.sticky
		}, this.props.className);

		var props = blacklist(this.props, 'sticky');

		return React.createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":64,"classnames":2,"react":undefined}],55:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var classNames = require('classnames');
var React = require('react/addons');
var Tappable = require('react-tappable');
var Transition = React.addons.CSSTransitionGroup;

var DIRECTIONS = {
	'reveal-from-right': -1,
	'show-from-left': -1,
	'show-from-right': 1,
	'reveal-from-left': 1
};

var defaultControllerState = {
	direction: 0,
	fade: false,
	leftArrow: false,
	leftButtonDisabled: false,
	leftIcon: '',
	leftLabel: '',
	leftAction: null,
	rightArrow: false,
	rightButtonDisabled: false,
	rightIcon: '',
	rightLabel: '',
	rightAction: null,
	title: ''
};

function newState(from) {
	var ns = _extends({}, defaultControllerState);
	if (from) _extends(ns, from);
	delete ns.name; // may leak from props
	return ns;
}

var NavigationBar = React.createClass({
	displayName: 'NavigationBar',

	contextTypes: {
		app: React.PropTypes.object
	},

	propTypes: {
		name: React.PropTypes.string
	},

	getInitialState: function getInitialState() {
		return newState(this.props);
	},

	componentDidMount: function componentDidMount() {
		if (this.props.name) {
			this.context.app.navigationBars[this.props.name] = this;
		}
	},

	componentWillUnmount: function componentWillUnmount() {
		if (this.props.name) {
			delete this.context.app.navigationBars[this.props.name];
		}
	},

	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		this.setState(newState(nextProps));
		if (nextProps.name !== this.props.name) {
			if (nextProps.name) {
				this.context.app.navigationBars[nextProps.name] = this;
			}
			if (this.props.name) {
				delete this.context.app.navigationBars[this.props.name];
			}
		}
	},

	update: function update(state) {
		// FIXME: what is happening here
		state = newState(state);
		this.setState(newState(state));
	},

	updateWithTransition: function updateWithTransition(state, transition) {
		state = newState(state);
		state.direction = DIRECTIONS[transition] || 0;

		if (transition === 'fade' || transition === 'fade-contract' || transition === 'fade-expand') {
			state.fade = true;
		}

		this.setState(state);
	},

	renderLeftButton: function renderLeftButton() {
		var className = classNames('NavigationBarLeftButton', {
			'has-arrow': this.state.leftArrow
		});

		return React.createElement(
			Tappable,
			{ onTap: this.state.leftAction, className: className, disabled: this.state.leftButtonDisabled, component: 'button' },
			this.renderLeftArrow(),
			this.renderLeftLabel()
		);
	},

	renderLeftArrow: function renderLeftArrow() {
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade || this.state.direction) {
			transitionName = 'NavigationBarTransition-Fade';
		}

		var arrow = this.state.leftArrow ? React.createElement('span', { className: 'NavigationBarLeftArrow' }) : null;

		return React.createElement(
			Transition,
			{ transitionName: transitionName },
			arrow
		);
	},

	renderLeftLabel: function renderLeftLabel() {
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade) {
			transitionName = 'NavigationBarTransition-Fade';
		} else if (this.state.direction > 0) {
			transitionName = 'NavigationBarTransition-Forwards';
		} else if (this.state.direction < 0) {
			transitionName = 'NavigationBarTransition-Backwards';
		}

		return React.createElement(
			Transition,
			{ transitionName: transitionName },
			React.createElement(
				'span',
				{ key: Date.now(), className: 'NavigationBarLeftLabel' },
				this.state.leftLabel
			)
		);
	},

	renderTitle: function renderTitle() {
		var title = this.state.title ? React.createElement(
			'span',
			{ key: Date.now(), className: 'NavigationBarTitle' },
			this.state.title
		) : null;
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade) {
			transitionName = 'NavigationBarTransition-Fade';
		} else if (this.state.direction > 0) {
			transitionName = 'NavigationBarTransition-Forwards';
		} else if (this.state.direction < 0) {
			transitionName = 'NavigationBarTransition-Backwards';
		}

		return React.createElement(
			Transition,
			{ transitionName: transitionName },
			title
		);
	},

	renderRightButton: function renderRightButton() {
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade || this.state.direction) {
			transitionName = 'NavigationBarTransition-Fade';
		}
		var button = this.state.rightIcon || this.state.rightLabel ? React.createElement(
			Tappable,
			{ key: Date.now(), onTap: this.state.rightAction, className: 'NavigationBarRightButton', disabled: this.state.rightButtonDisabled, component: 'button' },
			this.renderRightLabel(),
			this.renderRightIcon()
		) : null;
		return React.createElement(
			Transition,
			{ transitionName: transitionName },
			button
		);
	},

	renderRightIcon: function renderRightIcon() {
		if (!this.state.rightIcon) return null;

		var className = classNames('NavigationBarRightIcon', this.state.rightIcon);

		return React.createElement('span', { className: className });
	},

	renderRightLabel: function renderRightLabel() {
		return this.state.rightLabel ? React.createElement(
			'span',
			{ key: Date.now(), className: 'NavigationBarRightLabel' },
			this.state.rightLabel
		) : null;
	},

	render: function render() {
		return React.createElement(
			'div',
			{ className: 'NavigationBar' },
			this.renderLeftButton(),
			this.renderTitle(),
			this.renderRightButton()
		);
	}
});

exports['default'] = NavigationBar;
module.exports = exports['default'];
},{"classnames":2,"react-tappable":22,"react/addons":undefined}],56:[function(require,module,exports){
'use strict';

var React = require('react/addons');
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var classnames = require('classnames');

module.exports = React.createClass({
	displayName: 'Popup',

	propTypes: {
		children: React.PropTypes.node,
		className: React.PropTypes.string,
		visible: React.PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			transition: 'none'
		};
	},

	renderBackdrop: function renderBackdrop() {
		if (!this.props.visible) return null;
		return React.createElement('div', { className: 'Popup-backdrop' });
	},

	renderDialog: function renderDialog() {
		if (!this.props.visible) return null;

		// Set classnames
		var dialogClassName = classnames('Popup-dialog', this.props.className);

		return React.createElement(
			'div',
			{ className: dialogClassName },
			this.props.children
		);
	},

	render: function render() {
		return React.createElement(
			'div',
			{ className: 'Popup' },
			React.createElement(
				ReactCSSTransitionGroup,
				{ transitionName: 'Popup-dialog', component: 'div' },
				this.renderDialog()
			),
			React.createElement(
				ReactCSSTransitionGroup,
				{ transitionName: 'Popup-background', component: 'div' },
				this.renderBackdrop()
			)
		);
	}
});
},{"classnames":2,"react/addons":undefined}],57:[function(require,module,exports){
'use strict';

var React = require('react/addons');
var classNames = require('classnames');

module.exports = React.createClass({
	displayName: 'PopupIcon',
	propTypes: {
		name: React.PropTypes.string,
		type: React.PropTypes.oneOf(['default', 'muted', 'primary', 'success', 'warning', 'danger']),
		spinning: React.PropTypes.bool
	},

	render: function render() {
		var className = classNames('PopupIcon', {
			'is-spinning': this.props.spinning
		}, this.props.name, this.props.type);

		return React.createElement('div', { className: className });
	}
});
},{"classnames":2,"react/addons":undefined}],58:[function(require,module,exports){
'use strict';

var classnames = require('classnames');
var Item = require('./Item');
var ItemInner = require('./ItemInner');
var ItemNote = require('./ItemNote');
var ItemTitle = require('./ItemTitle');
var React = require('react');
var Tappable = require('react-tappable');

module.exports = React.createClass({
	displayName: 'RadioList',

	propTypes: {
		options: React.PropTypes.array,
		value: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number]),
		icon: React.PropTypes.string,
		onChange: React.PropTypes.func
	},

	onChange: function onChange(value) {
		this.props.onChange(value);
	},

	render: function render() {
		var self = this;
		var options = this.props.options.map(function (op, i) {
			var iconClassname = classnames('item-icon primary', op.icon);
			var checkMark = op.value === self.props.value ? React.createElement(ItemNote, { type: 'primary', icon: 'ion-checkmark' }) : null;
			var icon = op.icon ? React.createElement(
				'div',
				{ className: 'item-media' },
				React.createElement('span', { className: iconClassname })
			) : null;

			function onChange() {
				self.onChange(op.value);
			}

			return React.createElement(
				Tappable,
				{ key: 'option-' + i, onTap: onChange },
				React.createElement(
					Item,
					{ key: 'option-' + i, onTap: onChange },
					icon,
					React.createElement(
						ItemInner,
						null,
						React.createElement(
							ItemTitle,
							null,
							op.label
						),
						checkMark
					)
				)
			);
		});

		return React.createElement(
			'div',
			null,
			options
		);
	}
});
},{"./Item":44,"./ItemInner":46,"./ItemNote":48,"./ItemTitle":50,"classnames":2,"react":undefined,"react-tappable":22}],59:[function(require,module,exports){
'use strict';

var React = require('react');
var classnames = require('classnames');
var Tappable = require('react-tappable');

module.exports = React.createClass({
	displayName: 'SegmentedControl',

	propTypes: {
		className: React.PropTypes.string,
		equalWidthSegments: React.PropTypes.bool,
		hasGutter: React.PropTypes.bool,
		onChange: React.PropTypes.func.isRequired,
		options: React.PropTypes.array.isRequired,
		type: React.PropTypes.string,
		value: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'primary'
		};
	},

	onChange: function onChange(value) {
		this.props.onChange(value);
	},

	render: function render() {
		var componentClassName = classnames('SegmentedControl', 'SegmentedControl--' + this.props.type, {
			'SegmentedControl--has-gutter': this.props.hasGutter,
			'SegmentedControl--equal-widths': this.props.equalWidthSegments
		}, this.props.className);
		var self = this;

		var options = this.props.options.map(function (op) {
			function onChange() {
				self.onChange(op.value);
			}

			var itemClassName = classnames('SegmentedControl__item', {
				'is-selected': op.value === self.props.value
			});

			return React.createElement(
				Tappable,
				{ key: 'option-' + op.value, onTap: onChange, className: itemClassName },
				op.label
			);
		});

		return React.createElement(
			'div',
			{ className: componentClassName },
			options
		);
	}
});
},{"classnames":2,"react":undefined,"react-tappable":22}],60:[function(require,module,exports){
'use strict';

var classnames = require('classnames');
var React = require('react');
var Tappable = require('react-tappable');

module.exports = React.createClass({
	displayName: 'Switch',

	propTypes: {
		disabled: React.PropTypes.bool,
		on: React.PropTypes.bool,
		onTap: React.PropTypes.func,
		type: React.PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = classnames('Switch', 'Switch--' + this.props.type, {
			'is-disabled': this.props.disabled,
			'is-on': this.props.on
		});

		return React.createElement(
			Tappable,
			{ onTap: this.props.onTap, className: className, component: 'label' },
			React.createElement(
				'div',
				{ className: 'Switch__track' },
				React.createElement('div', { className: 'Switch__handle' })
			)
		);
	}
});
},{"classnames":2,"react":undefined,"react-tappable":22}],61:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react');
var Tappable = require('react-tappable');

var blacklist = require('blacklist');
var classnames = require('classnames');

var Navigator = React.createClass({
	displayName: 'Navigator',

	propTypes: {
		className: React.PropTypes.string
	},

	render: function render() {
		var className = classnames('Tabs-Navigator', this.props.className);
		var otherProps = blacklist(this.props, 'className');

		return React.createElement('div', _extends({ className: className }, otherProps));
	}
});

exports.Navigator = Navigator;
var Tab = React.createClass({
	displayName: 'Tab',

	propTypes: {
		selected: React.PropTypes.bool
	},

	render: function render() {
		var className = classnames('Tabs-Tab', { 'is-selected': this.props.selected });
		var otherProps = blacklist(this.props, 'selected');

		return React.createElement(Tappable, _extends({ className: className }, otherProps));
	}
});

exports.Tab = Tab;
var Label = React.createClass({
	displayName: 'Label',

	render: function render() {
		return React.createElement('div', _extends({ className: 'Tabs-Label' }, this.props));
	}
});
exports.Label = Label;
},{"blacklist":64,"classnames":2,"react":undefined,"react-tappable":22}],62:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react/addons');

var Item = require('./Item');
var ItemContent = require('./ItemContent');
var ItemInner = require('./ItemInner');

var blacklist = require('blacklist');

module.exports = React.createClass({
	displayName: 'Input',
	propTypes: {
		className: React.PropTypes.string,
		children: React.PropTypes.node,
		disabled: React.PropTypes.bool
	},

	render: function render() {
		var inputProps = blacklist(this.props, 'children', 'className');

		return React.createElement(
			Item,
			{ selectable: this.props.disabled, className: this.props.className, component: 'label' },
			React.createElement(
				ItemInner,
				null,
				React.createElement(
					ItemContent,
					{ component: 'label' },
					React.createElement('textarea', _extends({ className: 'field', rows: 3 }, inputProps))
				),
				this.props.children
			)
		);
	}
});
},{"./Item":44,"./ItemContent":45,"./ItemInner":46,"blacklist":64,"react/addons":undefined}],63:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var Alertbar = require('./Alertbar');
exports.Alertbar = Alertbar;
var Button = require('./Button');
exports.Button = Button;
var ButtonGroup = require('./ButtonGroup');
exports.ButtonGroup = ButtonGroup;
var FieldControl = require('./FieldControl');
exports.FieldControl = FieldControl;
var FieldLabel = require('./FieldLabel');
exports.FieldLabel = FieldLabel;
var Group = require('./Group');
exports.Group = Group;
var GroupBody = require('./GroupBody');
exports.GroupBody = GroupBody;
var GroupFooter = require('./GroupFooter');
exports.GroupFooter = GroupFooter;
var GroupHeader = require('./GroupHeader');
exports.GroupHeader = GroupHeader;
var Item = require('./Item');
exports.Item = Item;
var ItemContent = require('./ItemContent');
exports.ItemContent = ItemContent;
var ItemInner = require('./ItemInner');
exports.ItemInner = ItemInner;
var ItemMedia = require('./ItemMedia');
exports.ItemMedia = ItemMedia;
var ItemNote = require('./ItemNote');
exports.ItemNote = ItemNote;
var ItemSubTitle = require('./ItemSubTitle');
exports.ItemSubTitle = ItemSubTitle;
var ItemTitle = require('./ItemTitle');
exports.ItemTitle = ItemTitle;
var LabelInput = require('./LabelInput');
exports.LabelInput = LabelInput;
var LabelSelect = require('./LabelSelect');
exports.LabelSelect = LabelSelect;
var LabelTextarea = require('./LabelTextarea');
exports.LabelTextarea = LabelTextarea;
var ListHeader = require('./ListHeader');
exports.ListHeader = ListHeader;
var NavigationBar = require('./NavigationBar');
exports.NavigationBar = NavigationBar;
var Popup = require('./Popup');
exports.Popup = Popup;
var PopupIcon = require('./PopupIcon');
exports.PopupIcon = PopupIcon;
var RadioList = require('./RadioList');
exports.RadioList = RadioList;
var SegmentedControl = require('./SegmentedControl');
exports.SegmentedControl = SegmentedControl;
var Switch = require('./Switch');
exports.Switch = Switch;
var Tabs = require('./Tabs');
exports.Tabs = Tabs;
var Textarea = require('./Textarea');

exports.Textarea = Textarea;
// depends on above
var Input = require('./Input');
exports.Input = Input;
},{"./Alertbar":34,"./Button":35,"./ButtonGroup":36,"./FieldControl":37,"./FieldLabel":38,"./Group":39,"./GroupBody":40,"./GroupFooter":41,"./GroupHeader":42,"./Input":43,"./Item":44,"./ItemContent":45,"./ItemInner":46,"./ItemMedia":47,"./ItemNote":48,"./ItemSubTitle":49,"./ItemTitle":50,"./LabelInput":51,"./LabelSelect":52,"./LabelTextarea":53,"./ListHeader":54,"./NavigationBar":55,"./Popup":56,"./PopupIcon":57,"./RadioList":58,"./SegmentedControl":59,"./Switch":60,"./Tabs":61,"./Textarea":62}],64:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],65:[function(require,module,exports){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/sole/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/sole/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

// Date.now shim for (ahem) Internet Explo(d|r)er
if ( Date.now === undefined ) {

	Date.now = function () {

		return new Date().valueOf();

	};

}

var TWEEN = TWEEN || ( function () {

	var _tweens = [];

	return {

		REVISION: '14',

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function ( tween ) {

			_tweens.push( tween );

		},

		remove: function ( tween ) {

			var i = _tweens.indexOf( tween );

			if ( i !== -1 ) {

				_tweens.splice( i, 1 );

			}

		},

		update: function ( time ) {

			if ( _tweens.length === 0 ) return false;

			var i = 0;

			time = time !== undefined ? time : ( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );

			while ( i < _tweens.length ) {

				if ( _tweens[ i ].update( time ) ) {

					i++;

				} else {

					_tweens.splice( i, 1 );

				}

			}

			return true;

		}
	};

} )();

TWEEN.Tween = function ( object ) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	// Set all starting values present on the target object
	for ( var field in object ) {

		_valuesStart[ field ] = parseFloat(object[field], 10);

	}

	this.to = function ( properties, duration ) {

		if ( duration !== undefined ) {

			_duration = duration;

		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function ( time ) {

		TWEEN.add( this );

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : ( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );
		_startTime += _delayTime;

		for ( var property in _valuesEnd ) {

			// check if an Array was provided as property value
			if ( _valuesEnd[ property ] instanceof Array ) {

				if ( _valuesEnd[ property ].length === 0 ) {

					continue;

				}

				// create a local copy of the Array with the start value at the front
				_valuesEnd[ property ] = [ _object[ property ] ].concat( _valuesEnd[ property ] );

			}

			_valuesStart[ property ] = _object[ property ];

			if( ( _valuesStart[ property ] instanceof Array ) === false ) {
				_valuesStart[ property ] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[ property ] = _valuesStart[ property ] || 0;

		}

		return this;

	};

	this.stop = function () {

		if ( !_isPlaying ) {
			return this;
		}

		TWEEN.remove( this );
		_isPlaying = false;

		if ( _onStopCallback !== null ) {

			_onStopCallback.call( _object );

		}

		this.stopChainedTweens();
		return this;

	};

	this.stopChainedTweens = function () {

		for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

			_chainedTweens[ i ].stop();

		}

	};

	this.delay = function ( amount ) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function ( times ) {

		_repeat = times;
		return this;

	};

	this.yoyo = function( yoyo ) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function ( easing ) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function ( interpolation ) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function ( callback ) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function ( callback ) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function ( callback ) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function ( callback ) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function ( time ) {

		var property;

		if ( time < _startTime ) {

			return true;

		}

		if ( _onStartCallbackFired === false ) {

			if ( _onStartCallback !== null ) {

				_onStartCallback.call( _object );

			}

			_onStartCallbackFired = true;

		}

		var elapsed = ( time - _startTime ) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		var value = _easingFunction( elapsed );

		for ( property in _valuesEnd ) {

			var start = _valuesStart[ property ] || 0;
			var end = _valuesEnd[ property ];

			if ( end instanceof Array ) {

				_object[ property ] = _interpolationFunction( end, value );

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if ( typeof(end) === "string" ) {
					end = start + parseFloat(end, 10);
				}

				// protect against non numeric properties.
				if ( typeof(end) === "number" ) {
					_object[ property ] = start + ( end - start ) * value;
				}

			}

		}

		if ( _onUpdateCallback !== null ) {

			_onUpdateCallback.call( _object, value );

		}

		if ( elapsed == 1 ) {

			if ( _repeat > 0 ) {

				if( isFinite( _repeat ) ) {
					_repeat--;
				}

				// reassign starting values, restart by making startTime = now
				for( property in _valuesStartRepeat ) {

					if ( typeof( _valuesEnd[ property ] ) === "string" ) {
						_valuesStartRepeat[ property ] = _valuesStartRepeat[ property ] + parseFloat(_valuesEnd[ property ], 10);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[ property ];
						_valuesStartRepeat[ property ] = _valuesEnd[ property ];
						_valuesEnd[ property ] = tmp;
					}

					_valuesStart[ property ] = _valuesStartRepeat[ property ];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				_startTime = time + _delayTime;

				return true;

			} else {

				if ( _onCompleteCallback !== null ) {

					_onCompleteCallback.call( _object );

				}

				for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

					_chainedTweens[ i ].start( time );

				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function ( k ) {

			return k;

		}

	},

	Quadratic: {

		In: function ( k ) {

			return k * k;

		},

		Out: function ( k ) {

			return k * ( 2 - k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
			return - 0.5 * ( --k * ( k - 2 ) - 1 );

		}

	},

	Cubic: {

		In: function ( k ) {

			return k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k + 2 );

		}

	},

	Quartic: {

		In: function ( k ) {

			return k * k * k * k;

		},

		Out: function ( k ) {

			return 1 - ( --k * k * k * k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
			return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );

		}

	},

	Quintic: {

		In: function ( k ) {

			return k * k * k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );

		}

	},

	Sinusoidal: {

		In: function ( k ) {

			return 1 - Math.cos( k * Math.PI / 2 );

		},

		Out: function ( k ) {

			return Math.sin( k * Math.PI / 2 );

		},

		InOut: function ( k ) {

			return 0.5 * ( 1 - Math.cos( Math.PI * k ) );

		}

	},

	Exponential: {

		In: function ( k ) {

			return k === 0 ? 0 : Math.pow( 1024, k - 1 );

		},

		Out: function ( k ) {

			return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );

		},

		InOut: function ( k ) {

			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
			return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );

		}

	},

	Circular: {

		In: function ( k ) {

			return 1 - Math.sqrt( 1 - k * k );

		},

		Out: function ( k ) {

			return Math.sqrt( 1 - ( --k * k ) );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
			return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

		},

		Out: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

		},

		InOut: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
			return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

		}

	},

	Back: {

		In: function ( k ) {

			var s = 1.70158;
			return k * k * ( ( s + 1 ) * k - s );

		},

		Out: function ( k ) {

			var s = 1.70158;
			return --k * k * ( ( s + 1 ) * k + s ) + 1;

		},

		InOut: function ( k ) {

			var s = 1.70158 * 1.525;
			if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
			return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

		}

	},

	Bounce: {

		In: function ( k ) {

			return 1 - TWEEN.Easing.Bounce.Out( 1 - k );

		},

		Out: function ( k ) {

			if ( k < ( 1 / 2.75 ) ) {

				return 7.5625 * k * k;

			} else if ( k < ( 2 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

			} else if ( k < ( 2.5 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

			} else {

				return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

			}

		},

		InOut: function ( k ) {

			if ( k < 0.5 ) return TWEEN.Easing.Bounce.In( k * 2 ) * 0.5;
			return TWEEN.Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.Linear;

		if ( k < 0 ) return fn( v[ 0 ], v[ 1 ], f );
		if ( k > 1 ) return fn( v[ m ], v[ m - 1 ], m - f );

		return fn( v[ i ], v[ i + 1 > m ? m : i + 1 ], f - i );

	},

	Bezier: function ( v, k ) {

		var b = 0, n = v.length - 1, pw = Math.pow, bn = TWEEN.Interpolation.Utils.Bernstein, i;

		for ( i = 0; i <= n; i++ ) {
			b += pw( 1 - k, n - i ) * pw( k, i ) * v[ i ] * bn( n, i );
		}

		return b;

	},

	CatmullRom: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.CatmullRom;

		if ( v[ 0 ] === v[ m ] ) {

			if ( k < 0 ) i = Math.floor( f = m * ( 1 + k ) );

			return fn( v[ ( i - 1 + m ) % m ], v[ i ], v[ ( i + 1 ) % m ], v[ ( i + 2 ) % m ], f - i );

		} else {

			if ( k < 0 ) return v[ 0 ] - ( fn( v[ 0 ], v[ 0 ], v[ 1 ], v[ 1 ], -f ) - v[ 0 ] );
			if ( k > 1 ) return v[ m ] - ( fn( v[ m ], v[ m ], v[ m - 1 ], v[ m - 1 ], f - m ) - v[ m ] );

			return fn( v[ i ? i - 1 : 0 ], v[ i ], v[ m < i + 1 ? m : i + 1 ], v[ m < i + 2 ? m : i + 2 ], f - i );

		}

	},

	Utils: {

		Linear: function ( p0, p1, t ) {

			return ( p1 - p0 ) * t + p0;

		},

		Bernstein: function ( n , i ) {

			var fc = TWEEN.Interpolation.Utils.Factorial;
			return fc( n ) / fc( i ) / fc( n - i );

		},

		Factorial: ( function () {

			var a = [ 1 ];

			return function ( n ) {

				var s = 1, i;
				if ( a[ n ] ) return a[ n ];
				for ( i = n; i > 1; i-- ) s *= i;
				return a[ n ] = s;

			};

		} )(),

		CatmullRom: function ( p0, p1, p2, p3, t ) {

			var v0 = ( p2 - p0 ) * 0.5, v1 = ( p3 - p1 ) * 0.5, t2 = t * t, t3 = t * t2;
			return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;

		}

	}

};

module.exports=TWEEN;
},{}],66:[function(require,module,exports){
'use strict';

var React = require('react/addons');

var _require = require('touchstonejs');

var Container = _require.Container;
var createApp = _require.createApp;
var UI = _require.UI;
var View = _require.View;
var ViewManager = _require.ViewManager;

// App Config
// ------------------------------

var PeopleStore = require('./stores/people');
var peopleStore = new PeopleStore();

var App = React.createClass({
	displayName: 'App',

	mixins: [createApp()],

	childContextTypes: {
		peopleStore: React.PropTypes.object
	},

	getChildContext: function getChildContext() {
		return {
			peopleStore: peopleStore
		};
	},

	render: function render() {
		var appWrapperClassName = 'app-wrapper device--' + (window.device || {}).platform;

		return React.createElement(
			'div',
			{ className: appWrapperClassName },
			React.createElement(
				'div',
				{ className: 'device-silhouette' },
				React.createElement(
					ViewManager,
					{ name: 'app', defaultView: 'main' },
					React.createElement(View, { name: 'main', component: MainViewController }),
					React.createElement(View, { name: 'transitions-target-over', component: require('./views/transitions-target-over') })
				)
			)
		);
	}
});

// Main Controller
// ------------------------------

var MainViewController = React.createClass({
	displayName: 'MainViewController',

	render: function render() {
		return React.createElement(
			Container,
			null,
			React.createElement(UI.NavigationBar, { name: 'main' }),
			React.createElement(
				ViewManager,
				{ name: 'main', defaultView: 'tabs' },
				React.createElement(View, { name: 'tabs', component: TabViewController })
			)
		);
	}
});

// Tab Controller
// ------------------------------

var lastSelectedTab = 'lists';
var TabViewController = React.createClass({
	displayName: 'TabViewController',

	getInitialState: function getInitialState() {
		return {
			selectedTab: lastSelectedTab
		};
	},

	onViewChange: function onViewChange(nextView) {
		lastSelectedTab = nextView;

		this.setState({
			selectedTab: nextView
		});
	},

	selectTab: function selectTab(value) {
		var viewProps;

		this.refs.vm.transitionTo(value, {
			transition: 'instant',
			viewProps: viewProps
		});

		this.setState({
			selectedTab: value
		});
	},

	render: function render() {
		var selectedTab = this.state.selectedTab;
		var selectedTabSpan = selectedTab;

		if (selectedTab === 'lists' || selectedTab === 'list-simple' || selectedTab === 'list-complex' || selectedTab === 'list-details') {
			selectedTabSpan = 'lists';
		}

		if (selectedTab === 'transitions' || selectedTab === 'transitions-target') {
			selectedTabSpan = 'transitions';
		}

		return React.createElement(
			Container,
			null,
			React.createElement(
				ViewManager,
				{ ref: 'vm', name: 'tabs', defaultView: selectedTab, onViewChange: this.onViewChange },
				React.createElement(View, { name: 'lists', component: require('./views/lists') }),
				React.createElement(View, { name: 'list-simple', component: require('./views/list-simple') }),
				React.createElement(View, { name: 'list-complex', component: require('./views/list-complex') }),
				React.createElement(View, { name: 'list-details', component: require('./views/list-details') }),
				React.createElement(View, { name: 'form', component: require('./views/form') }),
				React.createElement(View, { name: 'controls', component: require('./views/controls') }),
				React.createElement(View, { name: 'transitions', component: require('./views/transitions') }),
				React.createElement(View, { name: 'transitions-target', component: require('./views/transitions-target') })
			),
			React.createElement(
				UI.Tabs.Navigator,
				null,
				React.createElement(
					UI.Tabs.Tab,
					{ onTap: this.selectTab.bind(this, 'lists'), selected: selectedTabSpan === 'lists' },
					React.createElement('span', { className: 'Tabs-Icon Tabs-Icon--lists' }),
					React.createElement(
						UI.Tabs.Label,
						null,
						'Lists'
					)
				),
				React.createElement(
					UI.Tabs.Tab,
					{ onTap: this.selectTab.bind(this, 'form'), selected: selectedTabSpan === 'form' },
					React.createElement('span', { className: 'Tabs-Icon Tabs-Icon--forms' }),
					React.createElement(
						UI.Tabs.Label,
						null,
						'Forms'
					)
				),
				React.createElement(
					UI.Tabs.Tab,
					{ onTap: this.selectTab.bind(this, 'controls'), selected: selectedTabSpan === 'controls' },
					React.createElement('span', { className: 'Tabs-Icon Tabs-Icon--controls' }),
					React.createElement(
						UI.Tabs.Label,
						null,
						'Controls'
					)
				),
				React.createElement(
					UI.Tabs.Tab,
					{ onTap: this.selectTab.bind(this, 'transitions'), selected: selectedTabSpan === 'transitions' },
					React.createElement('span', { className: 'Tabs-Icon Tabs-Icon--transitions' }),
					React.createElement(
						UI.Tabs.Label,
						null,
						'Transitions'
					)
				)
			)
		);
	}
});

function startApp() {
	if (window.StatusBar) {
		window.StatusBar.styleDefault();
	}

	React.render(React.createElement(App, null), document.getElementById('app'));
}

if (!window.cordova) {
	startApp();
} else {
	document.addEventListener('deviceready', startApp, false);
}

},{"./stores/people":67,"./views/controls":68,"./views/form":69,"./views/list-complex":70,"./views/list-details":71,"./views/list-simple":72,"./views/lists":73,"./views/transitions":76,"./views/transitions-target":75,"./views/transitions-target-over":74,"react/addons":undefined,"touchstonejs":31}],67:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var EventEmitter = require('events').EventEmitter;

var async = require('async');
var httpify = require('httpify');

function PeopleStore() {
	EventEmitter.call(this);

	// initialize internal cache
	var storage = this.cache = {
		people: []
	};
	var self = this;

	// Dispatchers
	this.starQueue = async.queue(function (data, callback) {
		var id = data.id;
		var starred = data.starred;

		// update internal data
		self.cache.people.filter(function (person) {
			return person.id === id;
		}).forEach(function (person) {
			return person.isStarred = starred;
		});

		// emit events
		self.emit('people-updated', storage.people);

		callback();
	}, 1);

	this.refreshQueue = async.queue(function (_, callback) {
		// update
		httpify({
			method: 'GET',
			type: 'jsonp',
			//url: 'https://randomuser.me/api?nat=au&results=10'
			//url: 'https://www.google.com/search?hl=ja&num=100&q=abc'
			//url: 'https://thecatapi.com/api/images/get?api_key=MjgyNjc&format=src&type=gif'
			url: 'https://itunes.apple.com/search?callback=angular.callbacks._1&entity=&term=Alicia+Keys'
			//url: 'http://thecatapi.com/api/images/get?api_key=MjgyNjc&sub_id=12345'
		}, function (err, res) {
			if (err) return callback(err);

			storage.people = res.body.results.map(function (p) {
				return p.user;
			});

			// post process new data
			storage.people.forEach(function (person, i) {
				person.id = i;
				person.name.first = person.name.first[0].toUpperCase() + person.name.first.slice(1);
				person.name.last = person.name.last[0].toUpperCase() + person.name.last.slice(1);
				person.name.initials = person.name.first[0] + person.name.last[0];
				person.name.full = person.name.first + ' ' + person.name.last;
				person.category = Math.random() > 0.5 ? 'A' : 'B';
				person.github = person.name.first.toLowerCase() + person.name.last.toLowerCase();
				person.picture = person.picture.medium;
				person.twitter = '@' + person.name.first.toLowerCase() + Math.random().toString(32).slice(2, 5);
			});

			// emit events
			self.emit('people-updated', storage.people);
			self.emit('refresh');

			callback(null, storage.people);
		});
	}, 1);

	// refresh immediately
	this.refresh();
}

_extends(PeopleStore.prototype, EventEmitter.prototype);

// Intents
PeopleStore.prototype.refresh = function (callback) {
	this.refreshQueue.push(null, callback);
};

PeopleStore.prototype.star = function (_ref, starred, callback) {
	var id = _ref.id;

	this.starQueue.push({ id: id, starred: starred }, callback);
};

// Getters
PeopleStore.prototype.getPeople = function () {
	return this.cache.people;
};

module.exports = PeopleStore;

},{"async":1,"events":24,"httpify":4}],68:[function(require,module,exports){
'use strict';

var Container = require('react-container');
var React = require('react');
var Tappable = require('react-tappable');
var Timers = require('react-timers');

var _require = require('touchstonejs');

var Link = _require.Link;
var UI = _require.UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Timers()],
	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation() {
			return {
				title: 'Controls'
			};
		}
	},
	getInitialState: function getInitialState() {
		return {
			alertbar: {
				visible: false,
				type: '',
				text: ''
			},
			popup: {
				visible: false
			}
		};
	},
	showLoadingPopup: function showLoadingPopup() {
		this.setState({
			popup: {
				visible: true,
				loading: true,
				header: 'Loading',
				iconName: 'ion-load-c',
				iconType: 'default'
			}
		});

		var self = this;

		this.setTimeout(function () {
			self.setState({
				popup: {
					visible: true,
					loading: false,
					header: 'Done!',
					iconName: 'ion-ios-checkmark',
					iconType: 'success'
				}
			});
		}, 2000);

		this.setTimeout(function () {
			self.setState({
				popup: {
					visible: false
				}
			});
		}, 3000);
	},
	showAlertbar: function showAlertbar(type, text) {
		var self = this;

		this.setState({
			alertbar: {
				visible: true,
				type: type,
				text: text
			}
		});

		this.setTimeout(function () {
			self.setState({
				alertbar: {
					visible: false
				}
			});
		}, 2000);
	},
	handleModeChange: function handleModeChange(newMode) {
		var selectedItem = newMode;

		if (this.state.selectedMode === newMode) {
			selectedItem = null;
		}

		this.setState({
			selectedMode: selectedItem
		});
	},
	render: function render() {
		var alertbar = this.state.alertbar;

		return React.createElement(
			Container,
			{ scrollable: true },
			React.createElement(
				UI.Alertbar,
				{ type: alertbar.type, visible: alertbar.visible },
				alertbar.text
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'Segmented Control'
			),
			React.createElement(UI.SegmentedControl, { value: this.state.selectedMode, onChange: this.handleModeChange, hasGutter: true, options: [{ label: 'One', value: 'one' }, { label: 'Two', value: 'two' }, { label: 'Three', value: 'three' }, { label: 'Four', value: 'four' }] }),
			React.createElement(
				UI.GroupHeader,
				null,
				'Alert Bar'
			),
			React.createElement(
				UI.ButtonGroup,
				null,
				React.createElement(
					UI.Button,
					{ type: 'primary', onTap: this.showAlertbar.bind(this, 'danger', 'No Internet Connection'), disabled: this.state.alertbar.visible },
					'Danger'
				),
				React.createElement(
					UI.Button,
					{ type: 'primary', onTap: this.showAlertbar.bind(this, 'warning', 'Connecting...'), disabled: this.state.alertbar.visible },
					'Warning'
				),
				React.createElement(
					UI.Button,
					{ type: 'primary', onTap: this.showAlertbar.bind(this, 'success', 'Connected'), disabled: this.state.alertbar.visible },
					'Success'
				)
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'Popup'
			),
			React.createElement(
				UI.Button,
				{ type: 'primary', onTap: this.showLoadingPopup, disabled: this.state.popup.visible },
				'Show Popup'
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'Application State'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(
					Link,
					{ linkTo: 'tabs:non-existent', transition: 'show-from-right' },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							'Invalid View'
						)
					)
				)
			),
			React.createElement(
				UI.Popup,
				{ visible: this.state.popup.visible },
				React.createElement(UI.PopupIcon, { name: this.state.popup.iconName, type: this.state.popup.iconType, spinning: this.state.popup.loading }),
				React.createElement(
					'div',
					null,
					React.createElement(
						'strong',
						null,
						this.state.popup.header
					)
				)
			)
		);
	}
});

},{"react":undefined,"react-container":19,"react-tappable":22,"react-timers":23,"touchstonejs":31}],69:[function(require,module,exports){
'use strict';

var Container = require('react-container');
var dialogs = require('cordova-dialogs');
var React = require('react');
var Tappable = require('react-tappable');

var _require = require('touchstonejs');

var UI = _require.UI;

var scrollable = Container.initScrollable();

module.exports = React.createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation() {
			return {
				title: 'Forms'
			};
		}
	},
	getInitialState: function getInitialState() {
		return {
			flavour: 'chocolate',
			switchValue: true
		};
	},
	handleFlavourChange: function handleFlavourChange(newFlavour) {
		this.setState({
			flavour: newFlavour
		});
	},
	handleSwitch: function handleSwitch(key, event) {
		var newState = {};
		newState[key] = !this.state[key];

		this.setState(newState);
	},
	alert: function alert(message) {
		dialogs.alert(message, function () {}, null);
	},
	render: function render() {

		return React.createElement(
			Container,
			{ scrollable: scrollable },
			React.createElement(
				UI.GroupHeader,
				null,
				'Checkbox'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(
					UI.Item,
					null,
					React.createElement(
						UI.ItemInner,
						null,
						React.createElement(
							UI.FieldLabel,
							null,
							'Switch'
						),
						React.createElement(UI.Switch, { onTap: this.handleSwitch.bind(this, 'switchValue'), on: this.state.switchValue })
					)
				),
				React.createElement(
					UI.Item,
					null,
					React.createElement(
						UI.ItemInner,
						null,
						React.createElement(
							UI.FieldLabel,
							null,
							'Disabled'
						),
						React.createElement(UI.Switch, { disabled: true })
					)
				)
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'Radio'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(UI.RadioList, { value: this.state.flavour, onChange: this.handleFlavourChange, options: [{ label: 'Vanilla', value: 'vanilla' }, { label: 'Chocolate', value: 'chocolate' }, { label: 'Caramel', value: 'caramel' }, { label: 'Strawberry', value: 'strawberry' }] })
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'Inputs'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(UI.Input, { placeholder: 'Default' }),
				React.createElement(UI.Input, { defaultValue: 'With Value', placeholder: 'Placeholder' }),
				React.createElement(UI.Textarea, { defaultValue: 'Longtext is good for bios etc.', placeholder: 'Longtext' })
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'Labelled Inputs'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(UI.LabelInput, { type: 'email', label: 'Email', placeholder: 'your.name@example.com' }),
				React.createElement(UI.LabelInput, { type: 'url', label: 'URL', placeholder: 'http://www.yourwebsite.com' }),
				React.createElement(UI.LabelInput, { noedit: true, label: 'No Edit', defaultValue: 'Un-editable, scrollable, selectable content' }),
				React.createElement(UI.LabelSelect, { label: 'Flavour', value: this.state.flavour, onChange: this.handleFlavourChange, options: [{ label: 'Vanilla', value: 'vanilla' }, { label: 'Chocolate', value: 'chocolate' }, { label: 'Caramel', value: 'caramel' }, { label: 'Strawberry', value: 'strawberry' }, { label: 'Banana', value: 'banana' }, { label: 'Lemon', value: 'lemon' }, { label: 'Pastaccio', value: 'pastaccio' }] })
			),
			React.createElement(
				UI.Button,
				{ type: 'primary', onTap: this.alert.bind(this, 'You clicked the Primary Button') },
				'Primary Button'
			),
			React.createElement(
				UI.Button,
				{ onTap: this.alert.bind(this, 'You clicked the Default Button') },
				'Default Button'
			),
			React.createElement(
				UI.Button,
				{ type: 'danger', onTap: this.alert.bind(this, 'You clicked the Danger Button') },
				'Danger Button'
			),
			React.createElement(
				UI.Button,
				{ type: 'danger', onTap: this.alert.bind(this, 'You clicked the Danger Button'), disabled: true },
				'Disabled Button'
			)
		);
	}
});

},{"cordova-dialogs":3,"react":undefined,"react-container":19,"react-tappable":22,"touchstonejs":31}],70:[function(require,module,exports){
'use strict';

var Container = require('react-container');
var React = require('react');
var Tappable = require('react-tappable');
var Sentry = require('react-sentry');

var _require = require('touchstonejs');

var Link = _require.Link;
var UI = _require.UI;

var scrollable = Container.initScrollable();

var ComplexLinkItem = React.createClass({
	displayName: 'ComplexLinkItem',

	contextTypes: { peopleStore: React.PropTypes.object.isRequired },

	toggleStar: function toggleStar() {
		var person = this.props.person;

		this.context.peopleStore.star(person, !person.isStarred);
	},

	render: function render() {
		var person = this.props.person;

		return React.createElement(
			Link,
			{ to: 'tabs:list-details', transition: 'show-from-right', viewProps: { person: person, prevView: 'list-complex' } },
			React.createElement(
				UI.Item,
				null,
				React.createElement(UI.ItemMedia, { avatar: person.picture, avatarInitials: person.initials }),
				React.createElement(
					UI.ItemInner,
					null,
					React.createElement(
						UI.ItemContent,
						null,
						React.createElement(
							UI.ItemTitle,
							null,
							person.name.full
						),
						React.createElement(
							UI.ItemSubTitle,
							null,
							person.bio
						)
					),
					React.createElement(
						Tappable,
						{ onTap: this.toggleStar, stopPropagation: true },
						React.createElement(UI.ItemNote, { icon: person.isStarred ? 'ion-ios-star' : 'ion-ios-star-outline', type: person.isStarred ? 'warning' : 'default', className: 'ion-lg' })
					)
				)
			)
		);
	}
});

// FIXME: this bit is global and hacky, expect it to change
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

function getNavigation(props, app, filterStarred) {
	return {
		leftLabel: 'Lists',
		leftArrow: true,
		leftAction: function leftAction() {
			app.transitionTo('tabs:lists', { transition: 'reveal-from-right' });
		},
		rightLabel: filterStarred ? 'All' : 'Starred',
		rightAction: emitter.emit.bind(emitter, 'navigationBarRightAction'),
		title: 'Complex'
	};
}

module.exports = React.createClass({
	displayName: 'exports',

	contextTypes: {
		app: React.PropTypes.object,
		peopleStore: React.PropTypes.object.isRequired
	},
	mixins: [Sentry()],

	statics: {
		navigationBar: 'main',
		getNavigation: getNavigation
	},

	getInitialState: function getInitialState() {
		return {
			filterStarred: false,
			people: this.context.peopleStore.getPeople()
		};
	},

	componentDidMount: function componentDidMount() {
		var self = this;

		this.watch(this.context.peopleStore, 'people-updated', function (people) {
			self.setState({ people: people });
		});

		this.watch(emitter, 'navigationBarRightAction', this.toggleStarred);
	},

	toggleStarred: function toggleStarred() {
		var filterStarred = !this.state.filterStarred;
		this.setState({ filterStarred: filterStarred });
		this.context.app.navigationBars.main.update(getNavigation({}, this.context.app, filterStarred));
	},

	handleModeChange: function handleModeChange(newMode) {
		var selectedMode = newMode;

		if (this.state.selectedMode === newMode) {
			selectedMode = null;
		}

		this.setState({ selectedMode: selectedMode });
	},

	render: function render() {
		var _state = this.state;
		var people = _state.people;
		var filterStarred = _state.filterStarred;
		var selectedMode = _state.selectedMode;

		if (filterStarred) {
			people = people.filter(function (person) {
				return person.isStarred;
			});
		}

		if (selectedMode === 'A' || selectedMode === 'B') {
			people = people.filter(function (person) {
				return person.category === selectedMode;
			});
		}

		function sortByName(a, b) {
			return a.name.full.localeCompare(b.name.full);
		}

		var sortedPeople = people.sort(sortByName);
		var results;

		if (sortedPeople.length) {
			var aPeople = sortedPeople.filter(function (person) {
				return person.category === 'A';
			}).map(function (person, i) {
				return React.createElement(ComplexLinkItem, { key: 'persona' + i, person: person });
			});

			var bPeople = sortedPeople.filter(function (person) {
				return person.category === 'B';
			}).map(function (person, i) {
				return React.createElement(ComplexLinkItem, { key: 'personb' + i, person: person });
			});

			results = React.createElement(
				UI.Group,
				null,
				aPeople.length > 0 ? React.createElement(
					UI.ListHeader,
					{ sticky: true },
					'Category A'
				) : '',
				aPeople,
				bPeople.length > 0 ? React.createElement(
					UI.ListHeader,
					{ sticky: true },
					'Category B'
				) : '',
				bPeople
			);
		} else {
			results = React.createElement(
				Container,
				{ direction: 'column', align: 'center', justify: 'center', className: 'no-results' },
				React.createElement('div', { className: 'no-results__icon ion-ios-star' }),
				React.createElement(
					'div',
					{ className: 'no-results__text' },
					'Go star some people!'
				)
			);
		}

		return React.createElement(
			Container,
			{ scrollable: scrollable },
			React.createElement(UI.SegmentedControl, { value: this.state.selectedMode, onChange: this.handleModeChange, hasGutter: true, equalWidthSegments: true, options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }] }),
			results
		);
	}
});

},{"events":24,"react":undefined,"react-container":19,"react-sentry":21,"react-tappable":22,"touchstonejs":31}],71:[function(require,module,exports){
'use strict';

var Container = require('react-container');
var React = require('react');

module.exports = React.createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation(props, app) {
			var leftLabel = props.prevView === 'list-simple' ? 'Simple' : 'Complex';
			return {
				leftArrow: true,
				leftLabel: leftLabel,
				leftAction: function leftAction() {
					app.transitionTo('tabs:' + props.prevView, { transition: 'reveal-from-right' });
				},
				title: 'Person'
			};
		}
	},
	getDefaultProps: function getDefaultProps() {
		return {
			prevView: 'home'
		};
	},
	render: function render() {
		var person = this.props.person;

		return React.createElement(
			Container,
			{ direction: 'column' },
			React.createElement(
				Container,
				{ fill: true, scrollable: true, ref: 'scrollContainer', className: 'PersonDetails' },
				React.createElement('img', { src: person.picture, className: 'PersonDetails__avatar' }),
				React.createElement(
					'div',
					{ className: 'PersonDetails__heading' },
					person.name.full
				),
				React.createElement(
					'div',
					{ className: 'PersonDetails__text text-block' },
					person.bio
				),
				(person.twitter || person.github) && React.createElement(
					'div',
					{ className: 'PersonDetails__profiles' },
					person.twitter && React.createElement(
						'div',
						{ className: 'PersonDetails__profile' },
						React.createElement('span', { className: 'PersonDetails__profile__icon ion-social-twitter' }),
						person.twitter
					),
					person.github && React.createElement(
						'div',
						{ className: 'PersonDetails__profile' },
						React.createElement('span', { className: 'PersonDetails__profile__icon ion-social-github' }),
						person.github
					)
				)
			)
		);
	}
});

},{"react":undefined,"react-container":19}],72:[function(require,module,exports){
'use strict';

var Container = require('react-container');
var React = require('react');
var Tappable = require('react-tappable');
var Sentry = require('react-sentry');

var _require = require('touchstonejs');

var Link = _require.Link;
var UI = _require.UI;

var Search = React.createClass({
	displayName: 'Search',
	propTypes: {
		searchString: React.PropTypes.string,
		onChange: React.PropTypes.func.isRequired
	},

	getDefaultProps: function getDefaultProps() {
		return {
			searchString: ''
		};
	},

	handleChange: function handleChange(event) {
		this.props.onChange(event.target.value);
	},

	reset: function reset() {
		this.props.onChange('');
	},

	render: function render() {
		var clearIcon;

		if (this.props.searchString.length > 0) {
			clearIcon = React.createElement(Tappable, { className: 'SearchField__icon SearchField__icon--clear', onTap: this.reset });
		}

		return React.createElement(
			'div',
			{ className: 'SearchField' },
			React.createElement('span', { className: 'SearchField__icon SearchField__icon--search' }),
			React.createElement('input', { ref: 'input', value: this.props.searchString, onChange: this.handleChange, className: 'SearchField__input', placeholder: 'Search...' }),
			clearIcon
		);
	}
});

var SimpleLinkItem = React.createClass({
	displayName: 'SimpleLinkItem',

	propTypes: {
		person: React.PropTypes.object.isRequired
	},

	render: function render() {
		return React.createElement(
			Link,
			{ to: 'tabs:list-details', transition: 'show-from-right', viewProps: { person: this.props.person, prevView: 'list-simple' } },
			React.createElement(
				UI.Item,
				{ showDisclosureArrow: true },
				React.createElement(
					UI.ItemInner,
					null,
					React.createElement(
						UI.ItemTitle,
						null,
						this.props.person.name.full
					)
				)
			)
		);
	}
});

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Sentry()],
	contextTypes: { peopleStore: React.PropTypes.object.isRequired },

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation(props, app) {
			return {
				leftArrow: true,
				leftLabel: 'Lists',
				leftAction: function leftAction() {
					app.transitionTo('tabs:lists', { transition: 'reveal-from-right' });
				},
				title: 'Simple'
			};
		}
	},

	componentDidMount: function componentDidMount() {
		var self = this;

		this.watch(this.context.peopleStore, 'people-updated', function (people) {
			self.setState({ people: people });
		});
	},

	getInitialState: function getInitialState() {
		return {
			searchString: '',
			people: this.context.peopleStore.getPeople()
		};
	},

	updateSearch: function updateSearch(str) {
		this.setState({ searchString: str });
	},

	render: function render() {
		var searchString = this.state.searchString;

		var searchRegex = new RegExp(searchString);

		function searchFilter(person) {
			return searchRegex.test(person.name.full);
		}
		function sortByName(a, b) {
			return a.name.full.localeCompare(b.name.full);
		}

		var people = this.state.people;

		var filteredPeople = people.filter(searchFilter).sort(sortByName);

		var results;

		if (searchString && !filteredPeople.length) {
			results = React.createElement(
				Container,
				{ direction: 'column', align: 'center', justify: 'center', className: 'no-results' },
				React.createElement('div', { className: 'no-results__icon ion-ios-search-strong' }),
				React.createElement(
					'div',
					{ className: 'no-results__text' },
					'No results for "' + searchString + '"'
				)
			);
		} else {
			var aPeople = filteredPeople.filter(function (person) {
				return person.category === 'A';
			}).map(function (person, i) {
				return React.createElement(SimpleLinkItem, { key: 'persona' + i, person: person });
			});

			var bPeople = filteredPeople.filter(function (person) {
				return person.category === 'B';
			}).map(function (person, i) {
				return React.createElement(SimpleLinkItem, { key: 'personb' + i, person: person });
			});

			results = React.createElement(
				UI.Group,
				null,
				aPeople.length > 0 ? React.createElement(
					UI.ListHeader,
					{ sticky: true },
					'Category A'
				) : '',
				aPeople,
				bPeople.length > 0 ? React.createElement(
					UI.ListHeader,
					{ sticky: true },
					'Category B'
				) : '',
				bPeople
			);
		}

		return React.createElement(
			Container,
			{ scrollable: true },
			React.createElement(Search, { searchString: this.state.searchString, onChange: this.updateSearch }),
			results
		);
	}
});

},{"react":undefined,"react-container":19,"react-sentry":21,"react-tappable":22,"touchstonejs":31}],73:[function(require,module,exports){
'use strict';

var Container = require('react-container');
var React = require('react');

var _require = require('touchstonejs');

var Link = _require.Link;
var UI = _require.UI;

module.exports = React.createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation() {
			return {
				title: 'Lists'
			};
		}
	},

	render: function render() {
		return React.createElement(
			Container,
			{ scrollable: true },
			React.createElement(
				UI.GroupHeader,
				null,
				'Lists'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(
					Link,
					{ to: 'tabs:list-simple', transition: 'show-from-right' },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							'Simple List'
						)
					)
				),
				React.createElement(
					Link,
					{ to: 'tabs:list-complex', transition: 'show-from-right' },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							'Complex List'
						)
					)
				)
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'GroupHeader'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(
					UI.GroupBody,
					null,
					'Use groups to contain content or lists. Where appropriate a Group should be accompanied by a GroupHeading and optionally a GroupFooter.'
				),
				React.createElement(
					UI.GroupBody,
					null,
					'You can use GroupBody for content inside groups. Subsequent GroupBody components will be separated.'
				)
			),
			React.createElement(
				UI.GroupFooter,
				null,
				'GroupFooter: useful for a detailed explaination to express the intentions of the Group. Try to be concise - remember that users are likely to read the text in your UI many times.'
			)
		);
	}
});

},{"react":undefined,"react-container":19,"touchstonejs":31}],74:[function(require,module,exports){
'use strict';

var Container = require('react-container');
var React = require('react');
var Timers = require('react-timers');

var _require = require('touchstonejs');

var Mixins = _require.Mixins;
var UI = _require.UI;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Mixins.Transitions, Timers()],
	componentDidMount: function componentDidMount() {
		var self = this;
		this.setTimeout(function () {
			self.transitionTo('app:main', { transition: 'fade' });
		}, 1000);
	},
	render: function render() {
		return React.createElement(
			Container,
			{ direction: 'column' },
			React.createElement(UI.NavigationBar, { name: 'over', title: this.props.navbarTitle }),
			React.createElement(
				Container,
				{ direction: 'column', align: 'center', justify: 'center', className: 'no-results' },
				React.createElement('div', { className: 'no-results__icon ion-ios-photos' }),
				React.createElement(
					'div',
					{ className: 'no-results__text' },
					'Hold on a sec...'
				)
			)
		);
	}
});

},{"react":undefined,"react-container":19,"react-timers":23,"touchstonejs":31}],75:[function(require,module,exports){
'use strict';

var Container = require('react-container');
var React = require('react');
var Timers = require('react-timers');

var _require = require('touchstonejs');

var Mixins = _require.Mixins;

module.exports = React.createClass({
	displayName: 'exports',

	mixins: [Mixins.Transitions, Timers()],
	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation(props) {
			return {
				title: props.navbarTitle
			};
		}
	},
	componentDidMount: function componentDidMount() {
		var self = this;

		this.setTimeout(function () {
			self.transitionTo('tabs:transitions', { transition: 'fade' });
		}, 1000);
	},
	render: function render() {
		return React.createElement(
			Container,
			{ direction: 'column', align: 'center', justify: 'center', className: 'no-results' },
			React.createElement('div', { className: 'no-results__icon ion-ios-photos' }),
			React.createElement(
				'div',
				{ className: 'no-results__text' },
				'Hold on a sec...'
			)
		);
	}
});

},{"react":undefined,"react-container":19,"react-timers":23,"touchstonejs":31}],76:[function(require,module,exports){
'use strict';

var Container = require('react-container');
var React = require('react');

var _require = require('touchstonejs');

var Link = _require.Link;
var UI = _require.UI;

var scrollable = Container.initScrollable();

module.exports = React.createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation() {
			return {
				title: 'Transitions'
			};
		}
	},
	render: function render() {
		return React.createElement(
			Container,
			{ scrollable: scrollable },
			React.createElement(
				UI.GroupHeader,
				null,
				'Default'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(
					Link,
					{ to: 'tabs:transitions-target', viewProps: { navbarTitle: 'Instant' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							'Instant'
						)
					)
				)
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'Fade'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(
					Link,
					{ to: 'tabs:transitions-target', transition: 'fade', viewProps: { navbarTitle: 'Fade' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							'Fade'
						)
					)
				),
				React.createElement(
					Link,
					{ to: 'tabs:transitions-target', transition: 'fade-expand', viewProps: { navbarTitle: 'Fade Expand' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							React.createElement(
								'span',
								null,
								'Fade Expand ',
								React.createElement(
									'span',
									{ className: 'text-muted' },
									'(non-standard)'
								)
							)
						)
					)
				),
				React.createElement(
					Link,
					{ to: 'tabs:transitions-target', transition: 'fade-contract', viewProps: { navbarTitle: 'Fade Contract' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							React.createElement(
								'span',
								null,
								'Fade Contract ',
								React.createElement(
									'span',
									{ className: 'text-muted' },
									'(non-standard)'
								)
							)
						)
					)
				)
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'Show'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(
					Link,
					{ to: 'tabs:transitions-target', transition: 'show-from-left', viewProps: { navbarTitle: 'Show from Left' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							React.createElement(
								'span',
								null,
								'Show from Left ',
								React.createElement(
									'span',
									{ className: 'text-muted' },
									'(non-standard)'
								)
							)
						)
					)
				),
				React.createElement(
					Link,
					{ to: 'tabs:transitions-target', transition: 'show-from-right', viewProps: { navbarTitle: 'Show from Right' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							'Show from Right'
						)
					)
				),
				React.createElement(
					Link,
					{ to: 'app:transitions-target-over', transition: 'show-from-top', viewProps: { navbarTitle: 'Show from Top' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							React.createElement(
								'span',
								null,
								'Show from Top ',
								React.createElement(
									'span',
									{ className: 'text-muted' },
									'(non-standard)'
								)
							)
						)
					)
				),
				React.createElement(
					Link,
					{ to: 'app:transitions-target-over', transition: 'show-from-bottom', viewProps: { navbarTitle: 'Show from Bottom' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							'Show from Bottom'
						)
					)
				)
			),
			React.createElement(
				UI.GroupHeader,
				null,
				'Reveal'
			),
			React.createElement(
				UI.Group,
				null,
				React.createElement(
					Link,
					{ to: 'tabs:transitions-target', transition: 'reveal-from-left', viewProps: { navbarTitle: 'Reveal from Left' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							React.createElement(
								'span',
								null,
								'Reveal from Left ',
								React.createElement(
									'span',
									{ className: 'text-muted' },
									'(non-standard)'
								)
							)
						)
					)
				),
				React.createElement(
					Link,
					{ to: 'tabs:transitions-target', transition: 'reveal-from-right', viewProps: { navbarTitle: 'Reveal from Right' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							'Reveal from Right'
						)
					)
				),
				React.createElement(
					Link,
					{ to: 'app:transitions-target-over', transition: 'reveal-from-top', viewProps: { navbarTitle: 'Reveal from Top' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							React.createElement(
								'span',
								null,
								'Reveal from Top ',
								React.createElement(
									'span',
									{ className: 'text-muted' },
									'(non-standard)'
								)
							)
						)
					)
				),
				React.createElement(
					Link,
					{ to: 'app:transitions-target-over', transition: 'reveal-from-bottom', viewProps: { navbarTitle: 'Reveal from Bottom' } },
					React.createElement(
						UI.Item,
						{ showDisclosureArrow: true },
						React.createElement(
							UI.ItemInner,
							null,
							'Reveal from Bottom'
						)
					)
				)
			)
		);
	}
});

},{"react":undefined,"react-container":19,"touchstonejs":31}]},{},[66])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMtdGFza3Mvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9hc3luYy9saWIvYXN5bmMuanMiLCJub2RlX21vZHVsZXMvY2xhc3NuYW1lcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb3Jkb3ZhLWRpYWxvZ3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHR0cGlmeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9odHRwaWZ5L2xpYi9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2h0dHBpZnkvbm9kZV9tb2R1bGVzL3Byb21pc2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHR0cGlmeS9ub2RlX21vZHVsZXMvcHJvbWlzZS9saWIvY29yZS5qcyIsIm5vZGVfbW9kdWxlcy9odHRwaWZ5L25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9kb25lLmpzIiwibm9kZV9tb2R1bGVzL2h0dHBpZnkvbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zLmpzIiwibm9kZV9tb2R1bGVzL2h0dHBpZnkvbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL25vZGUtZXh0ZW5zaW9ucy5qcyIsIm5vZGVfbW9kdWxlcy9odHRwaWZ5L25vZGVfbW9kdWxlcy9wcm9taXNlL25vZGVfbW9kdWxlcy9hc2FwL2FzYXAuanMiLCJub2RlX21vZHVsZXMvaHR0cGlmeS9ub2RlX21vZHVsZXMveGhyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2h0dHBpZnkvbm9kZV9tb2R1bGVzL3hoci9ub2RlX21vZHVsZXMvZ2xvYmFsL3dpbmRvdy5qcyIsIm5vZGVfbW9kdWxlcy9odHRwaWZ5L25vZGVfbW9kdWxlcy94aHIvbm9kZV9tb2R1bGVzL29uY2Uvb25jZS5qcyIsIm5vZGVfbW9kdWxlcy9odHRwaWZ5L25vZGVfbW9kdWxlcy94aHIvbm9kZV9tb2R1bGVzL3BhcnNlLWhlYWRlcnMvbm9kZV9tb2R1bGVzL2Zvci1lYWNoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2h0dHBpZnkvbm9kZV9tb2R1bGVzL3hoci9ub2RlX21vZHVsZXMvcGFyc2UtaGVhZGVycy9ub2RlX21vZHVsZXMvZm9yLWVhY2gvbm9kZV9tb2R1bGVzL2lzLWZ1bmN0aW9uL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2h0dHBpZnkvbm9kZV9tb2R1bGVzL3hoci9ub2RlX21vZHVsZXMvcGFyc2UtaGVhZGVycy9ub2RlX21vZHVsZXMvdHJpbS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9odHRwaWZ5L25vZGVfbW9kdWxlcy94aHIvbm9kZV9tb2R1bGVzL3BhcnNlLWhlYWRlcnMvcGFyc2UtaGVhZGVycy5qcyIsIm5vZGVfbW9kdWxlcy9yZWFjdC1jb250YWluZXIvbGliL0NvbnRhaW5lci5qcyIsIm5vZGVfbW9kdWxlcy9yZWFjdC1jb250YWluZXIvbm9kZV9tb2R1bGVzL2JsYWNrbGlzdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yZWFjdC1zZW50cnkvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JlYWN0LXRhcHBhYmxlL2xpYi9UYXBwYWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yZWFjdC10aW1lcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzLXRhc2tzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy10YXNrcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvY29yZS9FcnJvclZpZXcuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi9jb3JlL0xpbmsuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi9jb3JlL1ZpZXcuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi9jb3JlL1ZpZXdNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvY29yZS9hbmltYXRpb24uanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL21peGlucy9UcmFuc2l0aW9ucy5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL21peGlucy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0FsZXJ0YmFyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvQnV0dG9uLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvQnV0dG9uR3JvdXAuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9GaWVsZENvbnRyb2wuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9GaWVsZExhYmVsLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvR3JvdXAuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Hcm91cEJvZHkuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Hcm91cEZvb3Rlci5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0dyb3VwSGVhZGVyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvSW5wdXQuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9JdGVtLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvSXRlbUNvbnRlbnQuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9JdGVtSW5uZXIuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9JdGVtTWVkaWEuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9JdGVtTm90ZS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0l0ZW1TdWJUaXRsZS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0l0ZW1UaXRsZS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0xhYmVsSW5wdXQuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9MYWJlbFNlbGVjdC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0xhYmVsVGV4dGFyZWEuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9MaXN0SGVhZGVyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvTmF2aWdhdGlvbkJhci5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL1BvcHVwLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvUG9wdXBJY29uLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvUmFkaW9MaXN0LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvU2VnbWVudGVkQ29udHJvbC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL1N3aXRjaC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL1RhYnMuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9UZXh0YXJlYS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9ub2RlX21vZHVsZXMvdHdlZW4uanMvaW5kZXguanMiLCIvVXNlcnMvaHNjaGluc2svZ2l0aHViLXByb2plY3RzL3JlYWN0anMtcGhvbmVnYXAtc2FtcGxlci9zcmMvanMvYXBwLmpzIiwiL1VzZXJzL2hzY2hpbnNrL2dpdGh1Yi1wcm9qZWN0cy9yZWFjdGpzLXBob25lZ2FwLXNhbXBsZXIvc3JjL2pzL3N0b3Jlcy9wZW9wbGUuanMiLCIvVXNlcnMvaHNjaGluc2svZ2l0aHViLXByb2plY3RzL3JlYWN0anMtcGhvbmVnYXAtc2FtcGxlci9zcmMvanMvdmlld3MvY29udHJvbHMuanMiLCIvVXNlcnMvaHNjaGluc2svZ2l0aHViLXByb2plY3RzL3JlYWN0anMtcGhvbmVnYXAtc2FtcGxlci9zcmMvanMvdmlld3MvZm9ybS5qcyIsIi9Vc2Vycy9oc2NoaW5zay9naXRodWItcHJvamVjdHMvcmVhY3Rqcy1waG9uZWdhcC1zYW1wbGVyL3NyYy9qcy92aWV3cy9saXN0LWNvbXBsZXguanMiLCIvVXNlcnMvaHNjaGluc2svZ2l0aHViLXByb2plY3RzL3JlYWN0anMtcGhvbmVnYXAtc2FtcGxlci9zcmMvanMvdmlld3MvbGlzdC1kZXRhaWxzLmpzIiwiL1VzZXJzL2hzY2hpbnNrL2dpdGh1Yi1wcm9qZWN0cy9yZWFjdGpzLXBob25lZ2FwLXNhbXBsZXIvc3JjL2pzL3ZpZXdzL2xpc3Qtc2ltcGxlLmpzIiwiL1VzZXJzL2hzY2hpbnNrL2dpdGh1Yi1wcm9qZWN0cy9yZWFjdGpzLXBob25lZ2FwLXNhbXBsZXIvc3JjL2pzL3ZpZXdzL2xpc3RzLmpzIiwiL1VzZXJzL2hzY2hpbnNrL2dpdGh1Yi1wcm9qZWN0cy9yZWFjdGpzLXBob25lZ2FwLXNhbXBsZXIvc3JjL2pzL3ZpZXdzL3RyYW5zaXRpb25zLXRhcmdldC1vdmVyLmpzIiwiL1VzZXJzL2hzY2hpbnNrL2dpdGh1Yi1wcm9qZWN0cy9yZWFjdGpzLXBob25lZ2FwLXNhbXBsZXIvc3JjL2pzL3ZpZXdzL3RyYW5zaXRpb25zLXRhcmdldC5qcyIsIi9Vc2Vycy9oc2NoaW5zay9naXRodWItcHJvamVjdHMvcmVhY3Rqcy1waG9uZWdhcC1zYW1wbGVyL3NyYy9qcy92aWV3cy90cmFuc2l0aW9ucy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2h4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QyxVQUFNLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUNiLFVBQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNuRixVQUFNLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDaEYsVUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDakUsVUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO0FBQzdELFVBQU0sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFBO0FBQ2pELFVBQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7QUFDaEYsVUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtBQUN0QyxVQUFNLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBSSxJ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LEFBQUM7S0FDdkg7QUFBQyxRQUFFLENBQUMsSUFBSTtRQUFDLG1CQUFtQixNQUFBO01BQzNCO0FBQUMsU0FBRSxDQUFDLFNBQVM7OztPQUFrQztNQUN0QztLQUNKO0lBQ0c7R0FDQSxDQUNYO0VBQ0Y7Q0FDRCxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohXG4gKiBhc3luY1xuICogaHR0cHM6Ly9naXRodWIuY29tL2Nhb2xhbi9hc3luY1xuICpcbiAqIENvcHlyaWdodCAyMDEwLTIwMTQgQ2FvbGFuIE1jTWFob25cbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICovXG4oZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGFzeW5jID0ge307XG4gICAgZnVuY3Rpb24gbm9vcCgpIHt9XG5cbiAgICAvLyBnbG9iYWwgb24gdGhlIHNlcnZlciwgd2luZG93IGluIHRoZSBicm93c2VyXG4gICAgdmFyIHByZXZpb3VzX2FzeW5jO1xuXG4gICAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgKGBzZWxmYCkgaW4gdGhlIGJyb3dzZXIsIGBnbG9iYWxgXG4gICAgLy8gb24gdGhlIHNlcnZlciwgb3IgYHRoaXNgIGluIHNvbWUgdmlydHVhbCBtYWNoaW5lcy4gV2UgdXNlIGBzZWxmYFxuICAgIC8vIGluc3RlYWQgb2YgYHdpbmRvd2AgZm9yIGBXZWJXb3JrZXJgIHN1cHBvcnQuXG4gICAgdmFyIHJvb3QgPSB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZi5zZWxmID09PSBzZWxmICYmIHNlbGYgfHxcbiAgICAgICAgICAgIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbC5nbG9iYWwgPT09IGdsb2JhbCAmJiBnbG9iYWwgfHxcbiAgICAgICAgICAgIHRoaXM7XG5cbiAgICBpZiAocm9vdCAhPSBudWxsKSB7XG4gICAgICAgIHByZXZpb3VzX2FzeW5jID0gcm9vdC5hc3luYztcbiAgICB9XG5cbiAgICBhc3luYy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByb290LmFzeW5jID0gcHJldmlvdXNfYXN5bmM7XG4gICAgICAgIHJldHVybiBhc3luYztcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gb25seV9vbmNlKGZuKSB7XG4gICAgICAgIHZhciBjYWxsZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGNhbGxlZCkgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgd2FzIGFscmVhZHkgY2FsbGVkLlwiKTtcbiAgICAgICAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9vbmNlKGZuKSB7XG4gICAgICAgIHZhciBjYWxsZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGNhbGxlZCkgcmV0dXJuO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8vLyBjcm9zcy1icm93c2VyIGNvbXBhdGlibGl0eSBmdW5jdGlvbnMgLy8vL1xuXG4gICAgdmFyIF90b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbiAgICB2YXIgX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIF90b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9pc0FycmF5TGlrZShhcnIpIHtcbiAgICAgICAgcmV0dXJuIF9pc0FycmF5KGFycikgfHwgKFxuICAgICAgICAgICAgLy8gaGFzIGEgcG9zaXRpdmUgaW50ZWdlciBsZW5ndGggcHJvcGVydHlcbiAgICAgICAgICAgIHR5cGVvZiBhcnIubGVuZ3RoID09PSBcIm51bWJlclwiICYmXG4gICAgICAgICAgICBhcnIubGVuZ3RoID49IDAgJiZcbiAgICAgICAgICAgIGFyci5sZW5ndGggJSAxID09PSAwXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2VhY2goY29sbCwgaXRlcmF0b3IpIHtcbiAgICAgICAgcmV0dXJuIF9pc0FycmF5TGlrZShjb2xsKSA/XG4gICAgICAgICAgICBfYXJyYXlFYWNoKGNvbGwsIGl0ZXJhdG9yKSA6XG4gICAgICAgICAgICBfZm9yRWFjaE9mKGNvbGwsIGl0ZXJhdG9yKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfYXJyYXlFYWNoKGFyciwgaXRlcmF0b3IpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgICBsZW5ndGggPSBhcnIubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihhcnJbaW5kZXhdLCBpbmRleCwgYXJyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9tYXAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICAgIGxlbmd0aCA9IGFyci5sZW5ndGgsXG4gICAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICByZXN1bHRbaW5kZXhdID0gaXRlcmF0b3IoYXJyW2luZGV4XSwgaW5kZXgsIGFycik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcmFuZ2UoY291bnQpIHtcbiAgICAgICAgcmV0dXJuIF9tYXAoQXJyYXkoY291bnQpLCBmdW5jdGlvbiAodiwgaSkgeyByZXR1cm4gaTsgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3JlZHVjZShhcnIsIGl0ZXJhdG9yLCBtZW1vKSB7XG4gICAgICAgIF9hcnJheUVhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgbWVtbyA9IGl0ZXJhdG9yKG1lbW8sIHgsIGksIGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2ZvckVhY2hPZihvYmplY3QsIGl0ZXJhdG9yKSB7XG4gICAgICAgIF9hcnJheUVhY2goX2tleXMob2JqZWN0KSwgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgaXRlcmF0b3Iob2JqZWN0W2tleV0sIGtleSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBfa2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICBrZXlzLnB1c2goayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9rZXlJdGVyYXRvcihjb2xsKSB7XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHZhciBsZW47XG4gICAgICAgIHZhciBrZXlzO1xuICAgICAgICBpZiAoX2lzQXJyYXlMaWtlKGNvbGwpKSB7XG4gICAgICAgICAgICBsZW4gPSBjb2xsLmxlbmd0aDtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICByZXR1cm4gaSA8IGxlbiA/IGkgOiBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleXMgPSBfa2V5cyhjb2xsKTtcbiAgICAgICAgICAgIGxlbiA9IGtleXMubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIHJldHVybiBpIDwgbGVuID8ga2V5c1tpXSA6IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2Jhc2VTbGljZShhcnIsIHN0YXJ0KSB7XG4gICAgICAgIHN0YXJ0ID0gc3RhcnQgfHwgMDtcbiAgICAgICAgdmFyIGluZGV4ID0gLTE7XG4gICAgICAgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoO1xuXG4gICAgICAgIGlmIChzdGFydCkge1xuICAgICAgICAgICAgbGVuZ3RoIC09IHN0YXJ0O1xuICAgICAgICAgICAgbGVuZ3RoID0gbGVuZ3RoIDwgMCA/IDAgOiBsZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBhcnJbaW5kZXggKyBzdGFydF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfd2l0aG91dEluZGV4KGl0ZXJhdG9yKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsdWUsIGluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZXJhdG9yKHZhbHVlLCBjYWxsYmFjayk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8vLyBleHBvcnRlZCBhc3luYyBtb2R1bGUgZnVuY3Rpb25zIC8vLy9cblxuICAgIC8vLy8gbmV4dFRpY2sgaW1wbGVtZW50YXRpb24gd2l0aCBicm93c2VyLWNvbXBhdGlibGUgZmFsbGJhY2sgLy8vL1xuXG4gICAgLy8gY2FwdHVyZSB0aGUgZ2xvYmFsIHJlZmVyZW5jZSB0byBndWFyZCBhZ2FpbnN0IGZha2VUaW1lciBtb2Nrc1xuICAgIHZhciBfc2V0SW1tZWRpYXRlO1xuICAgIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIF9zZXRJbW1lZGlhdGUgPSBzZXRJbW1lZGlhdGU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSAndW5kZWZpbmVkJyB8fCAhKHByb2Nlc3MubmV4dFRpY2spKSB7XG4gICAgICAgIGlmIChfc2V0SW1tZWRpYXRlKSB7XG4gICAgICAgICAgICBhc3luYy5uZXh0VGljayA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIC8vIG5vdCBhIGRpcmVjdCBhbGlhcyBmb3IgSUUxMCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICAgICAgX3NldEltbWVkaWF0ZShmbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gYXN5bmMubmV4dFRpY2s7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhc3luYy5uZXh0VGljayA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhc3luYy5uZXh0VGljayA9IHByb2Nlc3MubmV4dFRpY2s7XG4gICAgICAgIGlmIChfc2V0SW1tZWRpYXRlKSB7XG4gICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgLy8gbm90IGEgZGlyZWN0IGFsaWFzIGZvciBJRTEwIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBfc2V0SW1tZWRpYXRlKGZuKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUgPSBhc3luYy5uZXh0VGljaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jLmZvckVhY2ggPVxuICAgIGFzeW5jLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLmVhY2hPZihhcnIsIF93aXRob3V0SW5kZXgoaXRlcmF0b3IpLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLmZvckVhY2hTZXJpZXMgPVxuICAgIGFzeW5jLmVhY2hTZXJpZXMgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLmVhY2hPZlNlcmllcyhhcnIsIF93aXRob3V0SW5kZXgoaXRlcmF0b3IpLCBjYWxsYmFjayk7XG4gICAgfTtcblxuXG4gICAgYXN5bmMuZm9yRWFjaExpbWl0ID1cbiAgICBhc3luYy5lYWNoTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfZWFjaE9mTGltaXQobGltaXQpKGFyciwgX3dpdGhvdXRJbmRleChpdGVyYXRvciksIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuZm9yRWFjaE9mID1cbiAgICBhc3luYy5lYWNoT2YgPSBmdW5jdGlvbiAob2JqZWN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgb2JqZWN0ID0gb2JqZWN0IHx8IFtdO1xuICAgICAgICB2YXIgc2l6ZSA9IF9pc0FycmF5TGlrZShvYmplY3QpID8gb2JqZWN0Lmxlbmd0aCA6IF9rZXlzKG9iamVjdCkubGVuZ3RoO1xuICAgICAgICB2YXIgY29tcGxldGVkID0gMDtcbiAgICAgICAgaWYgKCFzaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgX2VhY2gob2JqZWN0LCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgaXRlcmF0b3Iob2JqZWN0W2tleV0sIGtleSwgb25seV9vbmNlKGRvbmUpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZ1bmN0aW9uIGRvbmUoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuZm9yRWFjaE9mU2VyaWVzID1cbiAgICBhc3luYy5lYWNoT2ZTZXJpZXMgPSBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgb2JqID0gb2JqIHx8IFtdO1xuICAgICAgICB2YXIgbmV4dEtleSA9IF9rZXlJdGVyYXRvcihvYmopO1xuICAgICAgICB2YXIga2V5ID0gbmV4dEtleSgpO1xuICAgICAgICBmdW5jdGlvbiBpdGVyYXRlKCkge1xuICAgICAgICAgICAgdmFyIHN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZXJhdG9yKG9ialtrZXldLCBrZXksIG9ubHlfb25jZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAga2V5ID0gbmV4dEtleSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3luYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzeW5jLm5leHRUaWNrKGl0ZXJhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBzeW5jID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaXRlcmF0ZSgpO1xuICAgIH07XG5cblxuXG4gICAgYXN5bmMuZm9yRWFjaE9mTGltaXQgPVxuICAgIGFzeW5jLmVhY2hPZkxpbWl0ID0gZnVuY3Rpb24gKG9iaiwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBfZWFjaE9mTGltaXQobGltaXQpKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2VhY2hPZkxpbWl0KGxpbWl0KSB7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgICAgIG9iaiA9IG9iaiB8fCBbXTtcbiAgICAgICAgICAgIHZhciBuZXh0S2V5ID0gX2tleUl0ZXJhdG9yKG9iaik7XG4gICAgICAgICAgICBpZiAobGltaXQgPD0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkb25lID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgcnVubmluZyA9IDA7XG4gICAgICAgICAgICB2YXIgZXJyb3JlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAoZnVuY3Rpb24gcmVwbGVuaXNoICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9uZSAmJiBydW5uaW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlIChydW5uaW5nIDwgbGltaXQgJiYgIWVycm9yZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IG5leHRLZXkoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVubmluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcnVubmluZyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpdGVyYXRvcihvYmpba2V5XSwga2V5LCBvbmx5X29uY2UoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVubmluZyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsZW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH07XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBkb1BhcmFsbGVsKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBmbihhc3luYy5lYWNoT2YsIG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZG9QYXJhbGxlbExpbWl0KGxpbWl0LCBmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4oX2VhY2hPZkxpbWl0KGxpbWl0KSwgb2JqLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBkb1Nlcmllcyhmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4oYXN5bmMuZWFjaE9mU2VyaWVzLCBvYmosIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2FzeW5jTWFwKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHZhbHVlLCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHZhbHVlLCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0c1tpbmRleF0gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMubWFwID0gZG9QYXJhbGxlbChfYXN5bmNNYXApO1xuICAgIGFzeW5jLm1hcFNlcmllcyA9IGRvU2VyaWVzKF9hc3luY01hcCk7XG4gICAgYXN5bmMubWFwTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfbWFwTGltaXQobGltaXQpKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX21hcExpbWl0KGxpbWl0KSB7XG4gICAgICAgIHJldHVybiBkb1BhcmFsbGVsTGltaXQobGltaXQsIF9hc3luY01hcCk7XG4gICAgfVxuXG4gICAgLy8gcmVkdWNlIG9ubHkgaGFzIGEgc2VyaWVzIHZlcnNpb24sIGFzIGRvaW5nIHJlZHVjZSBpbiBwYXJhbGxlbCB3b24ndFxuICAgIC8vIHdvcmsgaW4gbWFueSBzaXR1YXRpb25zLlxuICAgIGFzeW5jLmluamVjdCA9XG4gICAgYXN5bmMuZm9sZGwgPVxuICAgIGFzeW5jLnJlZHVjZSA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoT2ZTZXJpZXMoYXJyLCBmdW5jdGlvbiAoeCwgaSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKG1lbW8sIHgsIGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgICAgICBtZW1vID0gdjtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciB8fCBudWxsLCBtZW1vKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLmZvbGRyID1cbiAgICBhc3luYy5yZWR1Y2VSaWdodCA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmV2ZXJzZWQgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9KS5yZXZlcnNlKCk7XG4gICAgICAgIGFzeW5jLnJlZHVjZShyZXZlcnNlZCwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2ZpbHRlcihlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIGFyciA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHtpbmRleDogaSwgdmFsdWU6IHh9O1xuICAgICAgICB9KTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soX21hcChyZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XG4gICAgICAgICAgICB9KSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMuc2VsZWN0ID1cbiAgICBhc3luYy5maWx0ZXIgPSBkb1BhcmFsbGVsKF9maWx0ZXIpO1xuXG4gICAgYXN5bmMuc2VsZWN0U2VyaWVzID1cbiAgICBhc3luYy5maWx0ZXJTZXJpZXMgPSBkb1NlcmllcyhfZmlsdGVyKTtcblxuICAgIGZ1bmN0aW9uIF9yZWplY3QoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBfZmlsdGVyKGVhY2hmbiwgYXJyLCBmdW5jdGlvbih2YWx1ZSwgY2IpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHZhbHVlLCBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgY2IoIXYpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICB9XG4gICAgYXN5bmMucmVqZWN0ID0gZG9QYXJhbGxlbChfcmVqZWN0KTtcbiAgICBhc3luYy5yZWplY3RTZXJpZXMgPSBkb1NlcmllcyhfcmVqZWN0KTtcblxuICAgIGZ1bmN0aW9uIF9kZXRlY3QoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBtYWluX2NhbGxiYWNrKSB7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2soeCk7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sgPSBub29wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbWFpbl9jYWxsYmFjaygpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgYXN5bmMuZGV0ZWN0ID0gZG9QYXJhbGxlbChfZGV0ZWN0KTtcbiAgICBhc3luYy5kZXRlY3RTZXJpZXMgPSBkb1NlcmllcyhfZGV0ZWN0KTtcblxuICAgIGFzeW5jLmFueSA9XG4gICAgYXN5bmMuc29tZSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBtYWluX2NhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLmVhY2hPZihhcnIsIGZ1bmN0aW9uICh4LCBfLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gbm9vcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLmFsbCA9XG4gICAgYXN5bmMuZXZlcnkgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWFpbl9jYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoT2YoYXJyLCBmdW5jdGlvbiAoeCwgXywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2KSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gbm9vcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKHRydWUpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc29ydEJ5ID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLm1hcChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKGVyciwgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7dmFsdWU6IHgsIGNyaXRlcmlhOiBjcml0ZXJpYX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBfbWFwKHJlc3VsdHMuc29ydChjb21wYXJhdG9yKSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbXBhcmF0b3IobGVmdCwgcmlnaHQpIHtcbiAgICAgICAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYSwgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmF1dG8gPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gX29uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgICAgIHZhciBrZXlzID0gX2tleXModGFza3MpO1xuICAgICAgICB2YXIgcmVtYWluaW5nVGFza3MgPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgaWYgKCFyZW1haW5pbmdUYXNrcykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gW107XG4gICAgICAgIGZ1bmN0aW9uIGFkZExpc3RlbmVyKGZuKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMudW5zaGlmdChmbik7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZm4pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXSA9PT0gZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiB0YXNrQ29tcGxldGUoKSB7XG4gICAgICAgICAgICByZW1haW5pbmdUYXNrcy0tO1xuICAgICAgICAgICAgX2FycmF5RWFjaChsaXN0ZW5lcnMuc2xpY2UoMCksIGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFkZExpc3RlbmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghcmVtYWluaW5nVGFza3MpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2FycmF5RWFjaChrZXlzLCBmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSBfaXNBcnJheSh0YXNrc1trXSkgPyB0YXNrc1trXTogW3Rhc2tzW2tdXTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHRhc2tDYWxsYmFjayhlcnIpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IF9iYXNlU2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FmZVJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgX2FycmF5RWFjaChfa2V5cyhyZXN1bHRzKSwgZnVuY3Rpb24ocmtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2FmZVJlc3VsdHNbcmtleV0gPSByZXN1bHRzW3JrZXldO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc2FmZVJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHNhZmVSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUodGFza0NvbXBsZXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSB0YXNrLnNsaWNlKDAsIE1hdGguYWJzKHRhc2subGVuZ3RoIC0gMSkpIHx8IFtdO1xuICAgICAgICAgICAgLy8gcHJldmVudCBkZWFkLWxvY2tzXG4gICAgICAgICAgICB2YXIgbGVuID0gcmVxdWlyZXMubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGRlcDtcbiAgICAgICAgICAgIHdoaWxlIChsZW4tLSkge1xuICAgICAgICAgICAgICAgIGlmICghKGRlcCA9IHRhc2tzW3JlcXVpcmVzW2xlbl1dKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0hhcyBpbmV4aXN0YW50IGRlcGVuZGVuY3knKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKF9pc0FycmF5KGRlcCkgJiYgISF+ZGVwLmluZGV4T2YoaykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdIYXMgY3ljbGljIGRlcGVuZGVuY2llcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlYWR5KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfcmVkdWNlKHJlcXVpcmVzLCBmdW5jdGlvbiAoYSwgeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGEgJiYgcmVzdWx0cy5oYXNPd25Qcm9wZXJ0eSh4KSk7XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSkgJiYgIXJlc3VsdHMuaGFzT3duUHJvcGVydHkoayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVhZHkoKSkge1xuICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICB0YXNrW3Rhc2subGVuZ3RoIC0gMV0odGFza0NhbGxiYWNrLCByZXN1bHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cblxuXG4gICAgYXN5bmMucmV0cnkgPSBmdW5jdGlvbigvKlt0aW1lcyxdIHRhc2sgWywgY2FsbGJhY2tdKi8pIHtcbiAgICAgICAgdmFyIERFRkFVTFRfVElNRVMgPSA1O1xuICAgICAgICB2YXIgREVGQVVMVF9JTlRFUlZBTCA9IDA7XG5cbiAgICAgICAgdmFyIGF0dGVtcHRzID0gW107XG5cbiAgICAgICAgdmFyIG9wdHMgPSB7XG4gICAgICAgICAgdGltZXM6IERFRkFVTFRfVElNRVMsXG4gICAgICAgICAgaW50ZXJ2YWw6IERFRkFVTFRfSU5URVJWQUxcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBwYXJzZVRpbWVzKGFjYywgdCl7XG4gICAgICAgICAgaWYodHlwZW9mIHQgPT09ICdudW1iZXInKXtcbiAgICAgICAgICAgIGFjYy50aW1lcyA9IHBhcnNlSW50KHQsIDEwKSB8fCBERUZBVUxUX1RJTUVTO1xuICAgICAgICAgIH0gZWxzZSBpZih0eXBlb2YgdCA9PT0gJ29iamVjdCcpe1xuICAgICAgICAgICAgYWNjLnRpbWVzID0gcGFyc2VJbnQodC50aW1lcywgMTApIHx8IERFRkFVTFRfVElNRVM7XG4gICAgICAgICAgICBhY2MuaW50ZXJ2YWwgPSBwYXJzZUludCh0LmludGVydmFsLCAxMCkgfHwgREVGQVVMVF9JTlRFUlZBTDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBhcmd1bWVudCB0eXBlIGZvciBcXCd0aW1lc1xcJzogJyArIHR5cGVvZih0KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoKGFyZ3VtZW50cy5sZW5ndGgpe1xuICAgICAgICAgICAgY2FzZSAxOiB7XG4gICAgICAgICAgICAgIG9wdHMudGFzayA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIDIgOiB7XG4gICAgICAgICAgICAgIGlmKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdudW1iZXInIHx8IHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdvYmplY3QnKXtcbiAgICAgICAgICAgICAgICBwYXJzZVRpbWVzKG9wdHMsIGFyZ3VtZW50c1swXSk7XG4gICAgICAgICAgICAgICAgb3B0cy50YXNrID0gYXJndW1lbnRzWzFdO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9wdHMudGFzayA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgICAgICBvcHRzLmNhbGxiYWNrID0gYXJndW1lbnRzWzFdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAzOiB7XG4gICAgICAgICAgICAgIHBhcnNlVGltZXMob3B0cywgYXJndW1lbnRzWzBdKTtcbiAgICAgICAgICAgICAgb3B0cy50YXNrID0gYXJndW1lbnRzWzFdO1xuICAgICAgICAgICAgICBvcHRzLmNhbGxiYWNrID0gYXJndW1lbnRzWzJdO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGFyZ3VtZW50cyAtIG11c3QgYmUgZWl0aGVyICh0YXNrKSwgKHRhc2ssIGNhbGxiYWNrKSwgKHRpbWVzLCB0YXNrKSBvciAodGltZXMsIHRhc2ssIGNhbGxiYWNrKScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB3cmFwcGVkVGFzayh3cmFwcGVkQ2FsbGJhY2ssIHdyYXBwZWRSZXN1bHRzKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiByZXRyeUF0dGVtcHQodGFzaywgZmluYWxBdHRlbXB0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlcmllc0NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2soZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VyaWVzQ2FsbGJhY2soIWVyciB8fCBmaW5hbEF0dGVtcHQsIHtlcnI6IGVyciwgcmVzdWx0OiByZXN1bHR9KTtcbiAgICAgICAgICAgICAgICAgICAgfSwgd3JhcHBlZFJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJldHJ5SW50ZXJ2YWwoaW50ZXJ2YWwpe1xuICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oc2VyaWVzQ2FsbGJhY2spe1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgIHNlcmllc0NhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgIH0sIGludGVydmFsKTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2hpbGUgKG9wdHMudGltZXMpIHtcblxuICAgICAgICAgICAgICAgIHZhciBmaW5hbEF0dGVtcHQgPSAhKG9wdHMudGltZXMtPTEpO1xuICAgICAgICAgICAgICAgIGF0dGVtcHRzLnB1c2gocmV0cnlBdHRlbXB0KG9wdHMudGFzaywgZmluYWxBdHRlbXB0KSk7XG4gICAgICAgICAgICAgICAgaWYoIWZpbmFsQXR0ZW1wdCAmJiBvcHRzLmludGVydmFsID4gMCl7XG4gICAgICAgICAgICAgICAgICBhdHRlbXB0cy5wdXNoKHJldHJ5SW50ZXJ2YWwob3B0cy5pbnRlcnZhbCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXN5bmMuc2VyaWVzKGF0dGVtcHRzLCBmdW5jdGlvbihkb25lLCBkYXRhKXtcbiAgICAgICAgICAgICAgICBkYXRhID0gZGF0YVtkYXRhLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICh3cmFwcGVkQ2FsbGJhY2sgfHwgb3B0cy5jYWxsYmFjaykoZGF0YS5lcnIsIGRhdGEucmVzdWx0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgYSBjYWxsYmFjayBpcyBwYXNzZWQsIHJ1biB0aGlzIGFzIGEgY29udHJvbGwgZmxvd1xuICAgICAgICByZXR1cm4gb3B0cy5jYWxsYmFjayA/IHdyYXBwZWRUYXNrKCkgOiB3cmFwcGVkVGFzaztcbiAgICB9O1xuXG4gICAgYXN5bmMud2F0ZXJmYWxsID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IF9vbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgICAgICBpZiAoIV9pc0FycmF5KHRhc2tzKSkge1xuICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgdG8gd2F0ZXJmYWxsIG11c3QgYmUgYW4gYXJyYXkgb2YgZnVuY3Rpb25zJyk7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gd3JhcEl0ZXJhdG9yKGl0ZXJhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gX2Jhc2VTbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaCh3cmFwSXRlcmF0b3IobmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBc3luYyhpdGVyYXRvcikuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICB3cmFwSXRlcmF0b3IoYXN5bmMuaXRlcmF0b3IodGFza3MpKSgpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfcGFyYWxsZWwoZWFjaGZuLCB0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IF9pc0FycmF5TGlrZSh0YXNrcykgPyBbXSA6IHt9O1xuXG4gICAgICAgIGVhY2hmbih0YXNrcywgZnVuY3Rpb24gKHRhc2ssIGtleSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRhc2soZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gX2Jhc2VTbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzW2tleV0gPSBhcmdzO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMucGFyYWxsZWwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbChhc3luYy5lYWNoT2YsIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnBhcmFsbGVsTGltaXQgPSBmdW5jdGlvbih0YXNrcywgbGltaXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbChfZWFjaE9mTGltaXQobGltaXQpLCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5zZXJpZXMgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgbm9vcDtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBfaXNBcnJheUxpa2UodGFza3MpID8gW10gOiB7fTtcblxuICAgICAgICBhc3luYy5lYWNoT2ZTZXJpZXModGFza3MsIGZ1bmN0aW9uICh0YXNrLCBrZXksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0YXNrKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IF9iYXNlU2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0c1trZXldID0gYXJncztcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5pdGVyYXRvciA9IGZ1bmN0aW9uICh0YXNrcykge1xuICAgICAgICBmdW5jdGlvbiBtYWtlQ2FsbGJhY2soaW5kZXgpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGZuKCkge1xuICAgICAgICAgICAgICAgIGlmICh0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFza3NbaW5kZXhdLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmbi5uZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmbi5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoaW5kZXggPCB0YXNrcy5sZW5ndGggLSAxKSA/IG1ha2VDYWxsYmFjayhpbmRleCArIDEpOiBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBmbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFrZUNhbGxiYWNrKDApO1xuICAgIH07XG5cbiAgICBhc3luYy5hcHBseSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICB2YXIgYXJncyA9IF9iYXNlU2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShcbiAgICAgICAgICAgICAgICBudWxsLCBhcmdzLmNvbmNhdChfYmFzZVNsaWNlKGFyZ3VtZW50cykpXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfY29uY2F0KGVhY2hmbiwgYXJyLCBmbiwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgaW5kZXgsIGNiKSB7XG4gICAgICAgICAgICBmbih4LCBmdW5jdGlvbiAoZXJyLCB5KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LmNvbmNhdCh5IHx8IFtdKTtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGFzeW5jLmNvbmNhdCA9IGRvUGFyYWxsZWwoX2NvbmNhdCk7XG4gICAgYXN5bmMuY29uY2F0U2VyaWVzID0gZG9TZXJpZXMoX2NvbmNhdCk7XG5cbiAgICBhc3luYy53aGlsc3QgPSBmdW5jdGlvbiAodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgbm9vcDtcbiAgICAgICAgaWYgKHRlc3QoKSkge1xuICAgICAgICAgICAgaXRlcmF0b3IoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFzeW5jLndoaWxzdCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5kb1doaWxzdCA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgYXJncyA9IF9iYXNlU2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGlmICh0ZXN0LmFwcGx5KG51bGwsIGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9XaGlsc3QoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMudW50aWwgPSBmdW5jdGlvbiAodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgbm9vcDtcbiAgICAgICAgaWYgKCF0ZXN0KCkpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy51bnRpbCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5kb1VudGlsID0gZnVuY3Rpb24gKGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3A7XG4gICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBhcmdzID0gX2Jhc2VTbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgaWYgKCF0ZXN0LmFwcGx5KG51bGwsIGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9VbnRpbChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5kdXJpbmcgPSBmdW5jdGlvbiAodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgbm9vcDtcbiAgICAgICAgdGVzdChmdW5jdGlvbihlcnIsIHRydXRoKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHJ1dGgpIHtcbiAgICAgICAgICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLmR1cmluZyh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5kb0R1cmluZyA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgYXJncyA9IF9iYXNlU2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGFyZ3MucHVzaChmdW5jdGlvbiAoZXJyLCB0cnV0aCkge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRydXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLmRvRHVyaW5nKGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRlc3QuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfcXVldWUod29ya2VyLCBjb25jdXJyZW5jeSwgcGF5bG9hZCkge1xuICAgICAgICBpZiAoY29uY3VycmVuY3kgPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uY3VycmVuY3kgPSAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoY29uY3VycmVuY3kgPT09IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uY3VycmVuY3kgbXVzdCBub3QgYmUgemVybycpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIF9pbnNlcnQocSwgZGF0YSwgcG9zLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwgJiYgdHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0YXNrIGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHEuc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoIV9pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAwICYmIHEuaWRsZSgpKSB7XG4gICAgICAgICAgICAgICAgLy8gY2FsbCBkcmFpbiBpbW1lZGlhdGVseSBpZiB0aGVyZSBhcmUgbm8gdGFza3NcbiAgICAgICAgICAgICAgICByZXR1cm4gYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9hcnJheUVhY2goZGF0YSwgZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2sgfHwgbm9vcFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAocG9zKSB7XG4gICAgICAgICAgICAgICAgICAgIHEudGFza3MudW5zaGlmdChpdGVtKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBxLnRhc2tzLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHEudGFza3MubGVuZ3RoID09PSBxLmNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICAgIHEuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUocS5wcm9jZXNzKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBfbmV4dChxLCB0YXNrcykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgd29ya2VycyAtPSAxO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgIF9hcnJheUVhY2godGFza3MsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2suY2FsbGJhY2suYXBwbHkodGFzaywgYXJncyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHEudGFza3MubGVuZ3RoICsgd29ya2VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBxLmRyYWluKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHEucHJvY2VzcygpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB3b3JrZXJzID0gMDtcbiAgICAgICAgdmFyIHEgPSB7XG4gICAgICAgICAgICB0YXNrczogW10sXG4gICAgICAgICAgICBjb25jdXJyZW5jeTogY29uY3VycmVuY3ksXG4gICAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBub29wLFxuICAgICAgICAgICAgZW1wdHk6IG5vb3AsXG4gICAgICAgICAgICBkcmFpbjogbm9vcCxcbiAgICAgICAgICAgIHN0YXJ0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgcGF1c2VkOiBmYWxzZSxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgZmFsc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBraWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcS5kcmFpbiA9IG5vb3A7XG4gICAgICAgICAgICAgICAgcS50YXNrcyA9IFtdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc2hpZnQ6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgdHJ1ZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXEucGF1c2VkICYmIHdvcmtlcnMgPCBxLmNvbmN1cnJlbmN5ICYmIHEudGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKHdvcmtlcnMgPCBxLmNvbmN1cnJlbmN5ICYmIHEudGFza3MubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YXNrcyA9IHEucGF5bG9hZCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcS50YXNrcy5zcGxpY2UoMCwgcS5wYXlsb2FkKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcS50YXNrcy5zcGxpY2UoMCwgcS50YXNrcy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IF9tYXAodGFza3MsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhc2suZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocS50YXNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBxLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JrZXJzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2IgPSBvbmx5X29uY2UoX25leHQocSwgdGFza3MpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtlcihkYXRhLCBjYik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHEudGFza3MubGVuZ3RoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bm5pbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2VycztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZGxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhdXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc3VtZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChxLnBhdXNlZCA9PT0gZmFsc2UpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdW1lQ291bnQgPSBNYXRoLm1pbihxLmNvbmN1cnJlbmN5LCBxLnRhc2tzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgLy8gTmVlZCB0byBjYWxsIHEucHJvY2VzcyBvbmNlIHBlciBjb25jdXJyZW50XG4gICAgICAgICAgICAgICAgLy8gd29ya2VyIHRvIHByZXNlcnZlIGZ1bGwgY29uY3VycmVuY3kgYWZ0ZXIgcGF1c2VcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB3ID0gMTsgdyA8PSByZXN1bWVDb3VudDsgdysrKSB7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfVxuXG4gICAgYXN5bmMucXVldWUgPSBmdW5jdGlvbiAod29ya2VyLCBjb25jdXJyZW5jeSkge1xuICAgICAgICB2YXIgcSA9IF9xdWV1ZShmdW5jdGlvbiAoaXRlbXMsIGNiKSB7XG4gICAgICAgICAgICB3b3JrZXIoaXRlbXNbMF0sIGNiKTtcbiAgICAgICAgfSwgY29uY3VycmVuY3ksIDEpO1xuXG4gICAgICAgIHJldHVybiBxO1xuICAgIH07XG5cbiAgICBhc3luYy5wcmlvcml0eVF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcblxuICAgICAgICBmdW5jdGlvbiBfY29tcGFyZVRhc2tzKGEsIGIpe1xuICAgICAgICAgICAgcmV0dXJuIGEucHJpb3JpdHkgLSBiLnByaW9yaXR5O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gX2JpbmFyeVNlYXJjaChzZXF1ZW5jZSwgaXRlbSwgY29tcGFyZSkge1xuICAgICAgICAgIHZhciBiZWcgPSAtMSxcbiAgICAgICAgICAgICAgZW5kID0gc2VxdWVuY2UubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoYmVnIDwgZW5kKSB7XG4gICAgICAgICAgICAgIHZhciBtaWQgPSBiZWcgKyAoKGVuZCAtIGJlZyArIDEpID4+PiAxKTtcbiAgICAgICAgICAgICAgaWYgKGNvbXBhcmUoaXRlbSwgc2VxdWVuY2VbbWlkXSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgYmVnID0gbWlkO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgZW5kID0gbWlkIC0gMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYmVnO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gX2luc2VydChxLCBkYXRhLCBwcmlvcml0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsICYmIHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidGFzayBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKCFfaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIGNhbGwgZHJhaW4gaW1tZWRpYXRlbHkgaWYgdGhlcmUgYXJlIG5vIHRhc2tzXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX2FycmF5RWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHRhc2ssXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBwcmlvcml0eSxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyA/IGNhbGxiYWNrIDogbm9vcFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBxLnRhc2tzLnNwbGljZShfYmluYXJ5U2VhcmNoKHEudGFza3MsIGl0ZW0sIF9jb21wYXJlVGFza3MpICsgMSwgMCwgaXRlbSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocS50YXNrcy5sZW5ndGggPT09IHEuY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICAgICAgcS5zYXR1cmF0ZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKHEucHJvY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0YXJ0IHdpdGggYSBub3JtYWwgcXVldWVcbiAgICAgICAgdmFyIHEgPSBhc3luYy5xdWV1ZSh3b3JrZXIsIGNvbmN1cnJlbmN5KTtcblxuICAgICAgICAvLyBPdmVycmlkZSBwdXNoIHRvIGFjY2VwdCBzZWNvbmQgcGFyYW1ldGVyIHJlcHJlc2VudGluZyBwcmlvcml0eVxuICAgICAgICBxLnB1c2ggPSBmdW5jdGlvbiAoZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIHByaW9yaXR5LCBjYWxsYmFjayk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmVtb3ZlIHVuc2hpZnQgZnVuY3Rpb25cbiAgICAgICAgZGVsZXRlIHEudW5zaGlmdDtcblxuICAgICAgICByZXR1cm4gcTtcbiAgICB9O1xuXG4gICAgYXN5bmMuY2FyZ28gPSBmdW5jdGlvbiAod29ya2VyLCBwYXlsb2FkKSB7XG4gICAgICAgIHJldHVybiBfcXVldWUod29ya2VyLCAxLCBwYXlsb2FkKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2NvbnNvbGVfZm4obmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IF9iYXNlU2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBfYmFzZVNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjb25zb2xlW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYXJyYXlFYWNoKGFyZ3MsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZVtuYW1lXSh4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfV0pKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgYXN5bmMubG9nID0gX2NvbnNvbGVfZm4oJ2xvZycpO1xuICAgIGFzeW5jLmRpciA9IF9jb25zb2xlX2ZuKCdkaXInKTtcbiAgICAvKmFzeW5jLmluZm8gPSBfY29uc29sZV9mbignaW5mbycpO1xuICAgIGFzeW5jLndhcm4gPSBfY29uc29sZV9mbignd2FybicpO1xuICAgIGFzeW5jLmVycm9yID0gX2NvbnNvbGVfZm4oJ2Vycm9yJyk7Ki9cblxuICAgIGFzeW5jLm1lbW9pemUgPSBmdW5jdGlvbiAoZm4sIGhhc2hlcikge1xuICAgICAgICB2YXIgbWVtbyA9IHt9O1xuICAgICAgICB2YXIgcXVldWVzID0ge307XG4gICAgICAgIGhhc2hlciA9IGhhc2hlciB8fCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH07XG4gICAgICAgIGZ1bmN0aW9uIG1lbW9pemVkKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBfYmFzZVNsaWNlKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgIGlmIChrZXkgaW4gbWVtbykge1xuICAgICAgICAgICAgICAgIGFzeW5jLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgbWVtb1trZXldKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGtleSBpbiBxdWV1ZXMpIHtcbiAgICAgICAgICAgICAgICBxdWV1ZXNba2V5XS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldID0gW2NhbGxiYWNrXTtcbiAgICAgICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBtZW1vW2tleV0gPSBfYmFzZVNsaWNlKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxID0gcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWV1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBxLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgIHFbaV0uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1dKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbWVtb2l6ZWQubWVtbyA9IG1lbW87XG4gICAgICAgIG1lbW9pemVkLnVubWVtb2l6ZWQgPSBmbjtcbiAgICAgICAgcmV0dXJuIG1lbW9pemVkO1xuICAgIH07XG5cbiAgICBhc3luYy51bm1lbW9pemUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAoZm4udW5tZW1vaXplZCB8fCBmbikuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX3RpbWVzKG1hcHBlcikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNvdW50LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIG1hcHBlcihfcmFuZ2UoY291bnQpLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGFzeW5jLnRpbWVzID0gX3RpbWVzKGFzeW5jLm1hcCk7XG4gICAgYXN5bmMudGltZXNTZXJpZXMgPSBfdGltZXMoYXN5bmMubWFwU2VyaWVzKTtcbiAgICBhc3luYy50aW1lc0xpbWl0ID0gZnVuY3Rpb24gKGNvdW50LCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBhc3luYy5tYXBMaW1pdChfcmFuZ2UoY291bnQpLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc2VxID0gZnVuY3Rpb24gKC8qIGZ1bmN0aW9ucy4uLiAqLykge1xuICAgICAgICB2YXIgZm5zID0gYXJndW1lbnRzO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBfYmFzZVNsaWNlKGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3Muc2xpY2UoLTEpWzBdO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgYXJncy5wb3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBub29wO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhc3luYy5yZWR1Y2UoZm5zLCBhcmdzLCBmdW5jdGlvbiAobmV3YXJncywgZm4sIGNiKSB7XG4gICAgICAgICAgICAgICAgZm4uYXBwbHkodGhhdCwgbmV3YXJncy5jb25jYXQoW2Z1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVyciA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5leHRhcmdzID0gX2Jhc2VTbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBjYihlcnIsIG5leHRhcmdzKTtcbiAgICAgICAgICAgICAgICB9XSkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseSh0aGF0LCBbZXJyXS5jb25jYXQocmVzdWx0cykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGFzeW5jLmNvbXBvc2UgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb25zLi4uICovKSB7XG4gICAgICAgIHJldHVybiBhc3luYy5zZXEuYXBwbHkobnVsbCwgQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICB9O1xuXG5cbiAgICBmdW5jdGlvbiBfYXBwbHlFYWNoKGVhY2hmbiwgZm5zIC8qYXJncy4uLiovKSB7XG4gICAgICAgIGZ1bmN0aW9uIGdvKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBfYmFzZVNsaWNlKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIGVhY2hmbihmbnMsIGZ1bmN0aW9uIChmbiwgXywgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBhcmdzLmNvbmNhdChbY2JdKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBfYmFzZVNsaWNlKGFyZ3VtZW50cywgMik7XG4gICAgICAgICAgICByZXR1cm4gZ28uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZ287XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYy5hcHBseUVhY2ggPSBmdW5jdGlvbiAoLypmbnMsIGFyZ3MuLi4qLykge1xuICAgICAgICB2YXIgYXJncyA9IF9iYXNlU2xpY2UoYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIF9hcHBseUVhY2guYXBwbHkobnVsbCwgW2FzeW5jLmVhY2hPZl0uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICAgIGFzeW5jLmFwcGx5RWFjaFNlcmllcyA9IGZ1bmN0aW9uICgvKmZucywgYXJncy4uLiovKSB7XG4gICAgICAgIHZhciBhcmdzID0gX2Jhc2VTbGljZShhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gX2FwcGx5RWFjaC5hcHBseShudWxsLCBbYXN5bmMuZWFjaE9mU2VyaWVzXS5jb25jYXQoYXJncykpO1xuICAgIH07XG5cblxuICAgIGFzeW5jLmZvcmV2ZXIgPSBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBkb25lID0gb25seV9vbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgICAgICB2YXIgdGFzayA9IGVuc3VyZUFzeW5jKGZuKTtcbiAgICAgICAgZnVuY3Rpb24gbmV4dChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFzayhuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGVuc3VyZUFzeW5jKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoLyouLi5hcmdzLCBjYWxsYmFjayovKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IF9iYXNlU2xpY2UoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICBhcmdzLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBpbm5lckFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICAgICAgaWYgKHN5bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIGlubmVyQXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIGlubmVyQXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgc3luYyA9IHRydWU7XG4gICAgICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIHN5bmMgPSBmYWxzZTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhc3luYy5lbnN1cmVBc3luYyA9IGVuc3VyZUFzeW5jO1xuXG4gICAgYXN5bmMuY29uc3RhbnQgPSBmdW5jdGlvbiBjb25zdGFudCgvKnZhbHVlcy4uLiovKSB7XG4gICAgICAgIHZhciBhcmdzID0gW251bGxdLmNvbmNhdChfYmFzZVNsaWNlKGFyZ3VtZW50cykpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGFzeW5jLndyYXBTeW5jID1cbiAgICBhc3luYy5hc3luY2lmeSA9IGZ1bmN0aW9uIGFzeW5jaWZ5KGZ1bmMpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgvKmFyZ3MuLi4sIGNhbGxiYWNrKi8pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gX2Jhc2VTbGljZShhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gTm9kZS5qc1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGFzeW5jO1xuICAgIH1cbiAgICAvLyBBTUQgLyBSZXF1aXJlSlNcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gaW5jbHVkZWQgZGlyZWN0bHkgdmlhIDxzY3JpcHQ+IHRhZ1xuICAgIGVsc2Uge1xuICAgICAgICByb290LmFzeW5jID0gYXN5bmM7XG4gICAgfVxuXG59KCkpO1xuIiwiLyohXG4gIENvcHlyaWdodCAoYykgMjAxNSBKZWQgV2F0c29uLlxuICBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UgKE1JVCksIHNlZVxuICBodHRwOi8vamVkd2F0c29uLmdpdGh1Yi5pby9jbGFzc25hbWVzXG4qL1xuXG4oZnVuY3Rpb24gKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZnVuY3Rpb24gY2xhc3NOYW1lcyAoKSB7XG5cblx0XHR2YXIgY2xhc3NlcyA9ICcnO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBhcmcgPSBhcmd1bWVudHNbaV07XG5cdFx0XHRpZiAoIWFyZykgY29udGludWU7XG5cblx0XHRcdHZhciBhcmdUeXBlID0gdHlwZW9mIGFyZztcblxuXHRcdFx0aWYgKCdzdHJpbmcnID09PSBhcmdUeXBlIHx8ICdudW1iZXInID09PSBhcmdUeXBlKSB7XG5cdFx0XHRcdGNsYXNzZXMgKz0gJyAnICsgYXJnO1xuXG5cdFx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkge1xuXHRcdFx0XHRjbGFzc2VzICs9ICcgJyArIGNsYXNzTmFtZXMuYXBwbHkobnVsbCwgYXJnKTtcblxuXHRcdFx0fSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gYXJnVHlwZSkge1xuXHRcdFx0XHRmb3IgKHZhciBrZXkgaW4gYXJnKSB7XG5cdFx0XHRcdFx0aWYgKGFyZy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIGFyZ1trZXldKSB7XG5cdFx0XHRcdFx0XHRjbGFzc2VzICs9ICcgJyArIGtleTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gY2xhc3Nlcy5zdWJzdHIoMSk7XG5cdH1cblxuXHRpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGNsYXNzTmFtZXM7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PT0gJ29iamVjdCcgJiYgZGVmaW5lLmFtZCl7XG5cdFx0Ly8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuXHRcdGRlZmluZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gY2xhc3NOYW1lcztcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHR3aW5kb3cuY2xhc3NOYW1lcyA9IGNsYXNzTmFtZXM7XG5cdH1cblxufSgpKTtcbiIsImZ1bmN0aW9uIG1ha2VzaGlmdFRpdGxlKHRpdGxlLCBtZXNzYWdlKSB7XG4gIHJldHVybiB0aXRsZSA/ICh0aXRsZSArICdcXG5cXG4nICsgbWVzc2FnZSkgOiBtZXNzYWdlXG59XG5cbi8vIFNlZSBodHRwOi8vZG9jcy5waG9uZWdhcC5jb20vZW4vZWRnZS9jb3Jkb3ZhX25vdGlmaWNhdGlvbl9ub3RpZmljYXRpb24ubWQuaHRtbCBmb3IgZG9jdW1lbnRhdGlvblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFsZXJ0OiBmdW5jdGlvbiBhbGVydChtZXNzYWdlLCBjYWxsYmFjaywgdGl0bGUpIHtcbiAgICBpZiAod2luZG93Lm5hdmlnYXRvci5ub3RpZmljYXRpb24gJiYgd2luZG93Lm5hdmlnYXRvci5ub3RpZmljYXRpb24uYWxlcnQpIHtcbiAgICAgIHJldHVybiB3aW5kb3cubmF2aWdhdG9yLm5vdGlmaWNhdGlvbi5hbGVydC5hcHBseShudWxsLCBhcmd1bWVudHMpXG4gICAgfVxuXG4gICAgdmFyIHRleHQgPSBtYWtlc2hpZnRUaXRsZSh0aXRsZSwgbWVzc2FnZSlcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB3aW5kb3cuYWxlcnQodGV4dClcblxuICAgICAgY2FsbGJhY2soKVxuICAgIH0sIDApXG4gIH0sXG4gIGNvbmZpcm06IGZ1bmN0aW9uIGNvbmZpcm0obWVzc2FnZSwgY2FsbGJhY2ssIHRpdGxlKSB7XG4gICAgaWYgKHdpbmRvdy5uYXZpZ2F0b3Iubm90aWZpY2F0aW9uICYmIHdpbmRvdy5uYXZpZ2F0b3Iubm90aWZpY2F0aW9uLmNvbmZpcm0pIHtcbiAgICAgIHJldHVybiB3aW5kb3cubmF2aWdhdG9yLm5vdGlmaWNhdGlvbi5jb25maXJtLmFwcGx5KG51bGwsIGFyZ3VtZW50cylcbiAgICB9XG5cbiAgICB2YXIgdGV4dCA9IG1ha2VzaGlmdFRpdGxlKHRpdGxlLCBtZXNzYWdlKVxuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjb25maXJtZWQgPSB3aW5kb3cuY29uZmlybSh0ZXh0KVxuICAgICAgdmFyIGJ1dHRvbkluZGV4ID0gY29uZmlybWVkID8gMSA6IDJcblxuICAgICAgY2FsbGJhY2soYnV0dG9uSW5kZXgpXG4gICAgfSwgMClcbiAgfSxcblxuICBwcm9tcHQ6IGZ1bmN0aW9uIHByb21wdChtZXNzYWdlLCBjYWxsYmFjaywgdGl0bGUsIGRlZmF1bHRUZXh0KSB7XG4gICAgaWYgKHdpbmRvdy5uYXZpZ2F0b3Iubm90aWZpY2F0aW9uICYmIHdpbmRvdy5uYXZpZ2F0b3Iubm90aWZpY2F0aW9uLnByb21wdCkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5uYXZpZ2F0b3Iubm90aWZpY2F0aW9uLnByb21wdC5hcHBseShudWxsLCBhcmd1bWVudHMpXG4gICAgfVxuXG4gICAgdmFyIHF1ZXN0aW9uID0gbWFrZXNoaWZ0VGl0bGUodGl0bGUsIG1lc3NhZ2UpXG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHRleHQgPSB3aW5kb3cucHJvbXB0KHF1ZXN0aW9uLCBkZWZhdWx0VGV4dClcbiAgICAgIHZhciBidXR0b25JbmRleCA9ICh0ZXh0ID09PSBudWxsKSA/IDAgOiAxXG5cbiAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgYnV0dG9uSW5kZXg6IGJ1dHRvbkluZGV4LFxuICAgICAgICBpbnB1dDE6IHRleHRcbiAgICAgIH0pXG4gICAgfSwgMClcbiAgfVxufVxuIiwidmFyIFByb21pc2UgPSByZXF1aXJlKCdwcm9taXNlJyk7XG52YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ3JlcXVlc3QnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICByZXF1ZXN0KG9wdGlvbnMsIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlLCBib2R5KSB7XG4gICAgICB2YXIgc3RhdHVzID0gKHJlc3BvbnNlKSA/IHJlc3BvbnNlLnN0YXR1c0NvZGUgOiAwO1xuICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgIFxuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgcmV0dXJuIFxuICAgICAgfVxuICAgICAgXG4gICAgICB0cnl7XG4gICAgICAgIHJlc3BvbnNlLmJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHt9XG4gICAgICBcbiAgICAgIGlmIChzdGF0dXMgPj0gNDAwICYmIHN0YXR1cyA8IDYwMCkge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XG4gICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgXG4gICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XG4gICAgICByZXNvbHZlKHJlc3BvbnNlKTtcbiAgICB9KTtcbiAgfSk7XG59OyIsInZhciByZXF1ZXN0ID0gcmVxdWlyZSgneGhyJyk7XG5cbi8vIFdyYXBwZXIgdG8gbWFrZSB0aGUgZmVhdHVyZXMgbW9yZSBzaW1pbGlhciBiZXR3ZWVuXG4vLyByZXF1ZXN0IGFuZCB4aHJcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgXG4gIC8vIFNldCB1cCBmb3IgUmVxdWVzdCBtb2R1bGVcbiAgaWYgKG9wdGlvbnMuZGF0YSAmJiAhd2luZG93KSBvcHRpb25zLmZvcm0gPSBvcHRpb25zLmRhdGE7XG4gIFxuICAvLyBTZXQgdXAgZm9yIHhociBtb2R1bGVcbiAgaWYgKG9wdGlvbnMuZm9ybSAmJiB3aW5kb3cpIHtcbiAgICBvcHRpb25zLmJvZHkgPSAodHlwZW9mIG9wdGlvbnMuZm9ybSA9PT0gJ29iamVjdCcpXG4gICAgICA/IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuZm9ybSlcbiAgICAgIDogb3B0aW9ucy5mb3JtO1xuICB9XG4gIFxuICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgb3B0aW9ucy5ib2R5ID0gKHR5cGVvZiBvcHRpb25zLmRhdGEgPT09ICdvYmplY3QnKVxuICAgICAgPyBKU09OLnN0cmluZ2lmeShvcHRpb25zLmRhdGEpXG4gICAgICA6IG9wdGlvbnMuZGF0YTtcbiAgfVxuICBcbiAgaWYgKG9wdGlvbnMudXJsICYmIHdpbmRvdykgb3B0aW9ucy51cmkgPSBvcHRpb25zLnVybDtcbiAgaWYgKHdpbmRvdykgb3B0aW9ucy5jb3JzID0gb3B0aW9ucy53aXRoQ3JlZGVudGlhbHM7XG4gIFxuICByZXR1cm4gcmVxdWVzdChvcHRpb25zLCBjYWxsYmFjayk7XG59OyIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9jb3JlLmpzJylcbnJlcXVpcmUoJy4vbGliL2RvbmUuanMnKVxucmVxdWlyZSgnLi9saWIvZXM2LWV4dGVuc2lvbnMuanMnKVxucmVxdWlyZSgnLi9saWIvbm9kZS1leHRlbnNpb25zLmpzJykiLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2FwID0gcmVxdWlyZSgnYXNhcCcpXG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZTtcbmZ1bmN0aW9uIFByb21pc2UoZm4pIHtcbiAgaWYgKHR5cGVvZiB0aGlzICE9PSAnb2JqZWN0JykgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZXMgbXVzdCBiZSBjb25zdHJ1Y3RlZCB2aWEgbmV3JylcbiAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IFR5cGVFcnJvcignbm90IGEgZnVuY3Rpb24nKVxuICB2YXIgc3RhdGUgPSBudWxsXG4gIHZhciB2YWx1ZSA9IG51bGxcbiAgdmFyIGRlZmVycmVkcyA9IFtdXG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIHRoaXMudGhlbiA9IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gICAgcmV0dXJuIG5ldyBzZWxmLmNvbnN0cnVjdG9yKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaGFuZGxlKG5ldyBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCByZXNvbHZlLCByZWplY3QpKVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGUoZGVmZXJyZWQpIHtcbiAgICBpZiAoc3RhdGUgPT09IG51bGwpIHtcbiAgICAgIGRlZmVycmVkcy5wdXNoKGRlZmVycmVkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGFzYXAoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY2IgPSBzdGF0ZSA/IGRlZmVycmVkLm9uRnVsZmlsbGVkIDogZGVmZXJyZWQub25SZWplY3RlZFxuICAgICAgaWYgKGNiID09PSBudWxsKSB7XG4gICAgICAgIChzdGF0ZSA/IGRlZmVycmVkLnJlc29sdmUgOiBkZWZlcnJlZC5yZWplY3QpKHZhbHVlKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciByZXRcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldCA9IGNiKHZhbHVlKVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXQpXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc29sdmUobmV3VmFsdWUpIHtcbiAgICB0cnkgeyAvL1Byb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjI3RoZS1wcm9taXNlLXJlc29sdXRpb24tcHJvY2VkdXJlXG4gICAgICBpZiAobmV3VmFsdWUgPT09IHNlbGYpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZSBjYW5ub3QgYmUgcmVzb2x2ZWQgd2l0aCBpdHNlbGYuJylcbiAgICAgIGlmIChuZXdWYWx1ZSAmJiAodHlwZW9mIG5ld1ZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgbmV3VmFsdWUgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgIHZhciB0aGVuID0gbmV3VmFsdWUudGhlblxuICAgICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBkb1Jlc29sdmUodGhlbi5iaW5kKG5ld1ZhbHVlKSwgcmVzb2x2ZSwgcmVqZWN0KVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzdGF0ZSA9IHRydWVcbiAgICAgIHZhbHVlID0gbmV3VmFsdWVcbiAgICAgIGZpbmFsZSgpXG4gICAgfSBjYXRjaCAoZSkgeyByZWplY3QoZSkgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVqZWN0KG5ld1ZhbHVlKSB7XG4gICAgc3RhdGUgPSBmYWxzZVxuICAgIHZhbHVlID0gbmV3VmFsdWVcbiAgICBmaW5hbGUoKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluYWxlKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBkZWZlcnJlZHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspXG4gICAgICBoYW5kbGUoZGVmZXJyZWRzW2ldKVxuICAgIGRlZmVycmVkcyA9IG51bGxcbiAgfVxuXG4gIGRvUmVzb2x2ZShmbiwgcmVzb2x2ZSwgcmVqZWN0KVxufVxuXG5cbmZ1bmN0aW9uIEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlc29sdmUsIHJlamVjdCl7XG4gIHRoaXMub25GdWxmaWxsZWQgPSB0eXBlb2Ygb25GdWxmaWxsZWQgPT09ICdmdW5jdGlvbicgPyBvbkZ1bGZpbGxlZCA6IG51bGxcbiAgdGhpcy5vblJlamVjdGVkID0gdHlwZW9mIG9uUmVqZWN0ZWQgPT09ICdmdW5jdGlvbicgPyBvblJlamVjdGVkIDogbnVsbFxuICB0aGlzLnJlc29sdmUgPSByZXNvbHZlXG4gIHRoaXMucmVqZWN0ID0gcmVqZWN0XG59XG5cbi8qKlxuICogVGFrZSBhIHBvdGVudGlhbGx5IG1pc2JlaGF2aW5nIHJlc29sdmVyIGZ1bmN0aW9uIGFuZCBtYWtlIHN1cmVcbiAqIG9uRnVsZmlsbGVkIGFuZCBvblJlamVjdGVkIGFyZSBvbmx5IGNhbGxlZCBvbmNlLlxuICpcbiAqIE1ha2VzIG5vIGd1YXJhbnRlZXMgYWJvdXQgYXN5bmNocm9ueS5cbiAqL1xuZnVuY3Rpb24gZG9SZXNvbHZlKGZuLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICB2YXIgZG9uZSA9IGZhbHNlO1xuICB0cnkge1xuICAgIGZuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgaWYgKGRvbmUpIHJldHVyblxuICAgICAgZG9uZSA9IHRydWVcbiAgICAgIG9uRnVsZmlsbGVkKHZhbHVlKVxuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIGlmIChkb25lKSByZXR1cm5cbiAgICAgIGRvbmUgPSB0cnVlXG4gICAgICBvblJlamVjdGVkKHJlYXNvbilcbiAgICB9KVxuICB9IGNhdGNoIChleCkge1xuICAgIGlmIChkb25lKSByZXR1cm5cbiAgICBkb25lID0gdHJ1ZVxuICAgIG9uUmVqZWN0ZWQoZXgpXG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUuanMnKVxudmFyIGFzYXAgPSByZXF1aXJlKCdhc2FwJylcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9taXNlXG5Qcm9taXNlLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIHZhciBzZWxmID0gYXJndW1lbnRzLmxlbmd0aCA/IHRoaXMudGhlbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogdGhpc1xuICBzZWxmLnRoZW4obnVsbCwgZnVuY3Rpb24gKGVycikge1xuICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgdGhyb3cgZXJyXG4gICAgfSlcbiAgfSlcbn0iLCIndXNlIHN0cmljdCc7XG5cbi8vVGhpcyBmaWxlIGNvbnRhaW5zIHRoZSBFUzYgZXh0ZW5zaW9ucyB0byB0aGUgY29yZSBQcm9taXNlcy9BKyBBUElcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUuanMnKVxudmFyIGFzYXAgPSByZXF1aXJlKCdhc2FwJylcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9taXNlXG5cbi8qIFN0YXRpYyBGdW5jdGlvbnMgKi9cblxuZnVuY3Rpb24gVmFsdWVQcm9taXNlKHZhbHVlKSB7XG4gIHRoaXMudGhlbiA9IGZ1bmN0aW9uIChvbkZ1bGZpbGxlZCkge1xuICAgIGlmICh0eXBlb2Ygb25GdWxmaWxsZWQgIT09ICdmdW5jdGlvbicpIHJldHVybiB0aGlzXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJlc29sdmUob25GdWxmaWxsZWQodmFsdWUpKVxuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIHJlamVjdChleCk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxufVxuVmFsdWVQcm9taXNlLnByb3RvdHlwZSA9IFByb21pc2UucHJvdG90eXBlXG5cbnZhciBUUlVFID0gbmV3IFZhbHVlUHJvbWlzZSh0cnVlKVxudmFyIEZBTFNFID0gbmV3IFZhbHVlUHJvbWlzZShmYWxzZSlcbnZhciBOVUxMID0gbmV3IFZhbHVlUHJvbWlzZShudWxsKVxudmFyIFVOREVGSU5FRCA9IG5ldyBWYWx1ZVByb21pc2UodW5kZWZpbmVkKVxudmFyIFpFUk8gPSBuZXcgVmFsdWVQcm9taXNlKDApXG52YXIgRU1QVFlTVFJJTkcgPSBuZXcgVmFsdWVQcm9taXNlKCcnKVxuXG5Qcm9taXNlLnJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkgcmV0dXJuIHZhbHVlXG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gTlVMTFxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIFVOREVGSU5FRFxuICBpZiAodmFsdWUgPT09IHRydWUpIHJldHVybiBUUlVFXG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHJldHVybiBGQUxTRVxuICBpZiAodmFsdWUgPT09IDApIHJldHVybiBaRVJPXG4gIGlmICh2YWx1ZSA9PT0gJycpIHJldHVybiBFTVBUWVNUUklOR1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICB2YXIgdGhlbiA9IHZhbHVlLnRoZW5cbiAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UodGhlbi5iaW5kKHZhbHVlKSlcbiAgICAgIH1cbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVqZWN0KGV4KVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFZhbHVlUHJvbWlzZSh2YWx1ZSlcbn1cblxuUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gcmVzb2x2ZShbXSlcbiAgICB2YXIgcmVtYWluaW5nID0gYXJncy5sZW5ndGhcbiAgICBmdW5jdGlvbiByZXMoaSwgdmFsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAodmFsICYmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICAgIHZhciB0aGVuID0gdmFsLnRoZW5cbiAgICAgICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRoZW4uY2FsbCh2YWwsIGZ1bmN0aW9uICh2YWwpIHsgcmVzKGksIHZhbCkgfSwgcmVqZWN0KVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFyZ3NbaV0gPSB2YWxcbiAgICAgICAgaWYgKC0tcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgcmVzb2x2ZShhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgcmVqZWN0KGV4KVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlcyhpLCBhcmdzW2ldKVxuICAgIH1cbiAgfSlcbn1cblxuUHJvbWlzZS5yZWplY3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgXG4gICAgcmVqZWN0KHZhbHVlKTtcbiAgfSk7XG59XG5cblByb21pc2UucmFjZSA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgXG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpe1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSlcbiAgfSk7XG59XG5cbi8qIFByb3RvdHlwZSBNZXRob2RzICovXG5cblByb21pc2UucHJvdG90eXBlWydjYXRjaCddID0gZnVuY3Rpb24gKG9uUmVqZWN0ZWQpIHtcbiAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGVkKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy9UaGlzIGZpbGUgY29udGFpbnMgdGhlbi9wcm9taXNlIHNwZWNpZmljIGV4dGVuc2lvbnMgdGhhdCBhcmUgb25seSB1c2VmdWwgZm9yIG5vZGUuanMgaW50ZXJvcFxuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZS5qcycpXG52YXIgYXNhcCA9IHJlcXVpcmUoJ2FzYXAnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2VcblxuLyogU3RhdGljIEZ1bmN0aW9ucyAqL1xuXG5Qcm9taXNlLmRlbm9kZWlmeSA9IGZ1bmN0aW9uIChmbiwgYXJndW1lbnRDb3VudCkge1xuICBhcmd1bWVudENvdW50ID0gYXJndW1lbnRDb3VudCB8fCBJbmZpbml0eVxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB3aGlsZSAoYXJncy5sZW5ndGggJiYgYXJncy5sZW5ndGggPiBhcmd1bWVudENvdW50KSB7XG4gICAgICAgIGFyZ3MucG9wKClcbiAgICAgIH1cbiAgICAgIGFyZ3MucHVzaChmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgaWYgKGVycikgcmVqZWN0KGVycilcbiAgICAgICAgZWxzZSByZXNvbHZlKHJlcylcbiAgICAgIH0pXG4gICAgICB2YXIgcmVzID0gZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgICAgIGlmIChyZXMgJiYgKHR5cGVvZiByZXMgPT09ICdvYmplY3QnIHx8IHR5cGVvZiByZXMgPT09ICdmdW5jdGlvbicpICYmIHR5cGVvZiByZXMudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgIH1cbiAgICB9KVxuICB9XG59XG5Qcm9taXNlLm5vZGVpZnkgPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICB2YXIgY2FsbGJhY2sgPSB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSAnZnVuY3Rpb24nID8gYXJncy5wb3AoKSA6IG51bGxcbiAgICB2YXIgY3R4ID0gdGhpc1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKS5ub2RlaWZ5KGNhbGxiYWNrLCBjdHgpXG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChjYWxsYmFjayA9PT0gbnVsbCB8fCB0eXBlb2YgY2FsbGJhY2sgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgcmVqZWN0KGV4KSB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY2FsbGJhY2suY2FsbChjdHgsIGV4KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBjdHgpIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPSAnZnVuY3Rpb24nKSByZXR1cm4gdGhpc1xuXG4gIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNhbGxiYWNrLmNhbGwoY3R4LCBudWxsLCB2YWx1ZSlcbiAgICB9KVxuICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICBjYWxsYmFjay5jYWxsKGN0eCwgZXJyKVxuICAgIH0pXG4gIH0pXG59XG4iLCJcbi8vIFVzZSB0aGUgZmFzdGVzdCBwb3NzaWJsZSBtZWFucyB0byBleGVjdXRlIGEgdGFzayBpbiBhIGZ1dHVyZSB0dXJuXG4vLyBvZiB0aGUgZXZlbnQgbG9vcC5cblxuLy8gbGlua2VkIGxpc3Qgb2YgdGFza3MgKHNpbmdsZSwgd2l0aCBoZWFkIG5vZGUpXG52YXIgaGVhZCA9IHt0YXNrOiB2b2lkIDAsIG5leHQ6IG51bGx9O1xudmFyIHRhaWwgPSBoZWFkO1xudmFyIGZsdXNoaW5nID0gZmFsc2U7XG52YXIgcmVxdWVzdEZsdXNoID0gdm9pZCAwO1xudmFyIGlzTm9kZUpTID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGZsdXNoKCkge1xuICAgIC8qIGpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xuXG4gICAgd2hpbGUgKGhlYWQubmV4dCkge1xuICAgICAgICBoZWFkID0gaGVhZC5uZXh0O1xuICAgICAgICB2YXIgdGFzayA9IGhlYWQudGFzaztcbiAgICAgICAgaGVhZC50YXNrID0gdm9pZCAwO1xuICAgICAgICB2YXIgZG9tYWluID0gaGVhZC5kb21haW47XG5cbiAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgaGVhZC5kb21haW4gPSB2b2lkIDA7XG4gICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0YXNrKCk7XG5cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUpTKSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gbm9kZSwgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgY29uc2lkZXJlZCBmYXRhbCBlcnJvcnMuXG4gICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBzeW5jaHJvbm91c2x5IHRvIGludGVycnVwdCBmbHVzaGluZyFcblxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjb250aW51YXRpb24gaWYgdGhlIHVuY2F1Z2h0IGV4Y2VwdGlvbiBpcyBzdXBwcmVzc2VkXG4gICAgICAgICAgICAgICAgLy8gbGlzdGVuaW5nIFwidW5jYXVnaHRFeGNlcHRpb25cIiBldmVudHMgKGFzIGRvbWFpbnMgZG9lcykuXG4gICAgICAgICAgICAgICAgLy8gQ29udGludWUgaW4gbmV4dCBldmVudCB0byBhdm9pZCB0aWNrIHJlY3Vyc2lvbi5cbiAgICAgICAgICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbWFpbi5leGl0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xuICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluLmVudGVyKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBicm93c2VycywgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgbm90IGZhdGFsLlxuICAgICAgICAgICAgICAgIC8vIFJlLXRocm93IHRoZW0gYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgc2xvdy1kb3ducy5cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICBkb21haW4uZXhpdCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZmx1c2hpbmcgPSBmYWxzZTtcbn1cblxuaWYgKHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmIHByb2Nlc3MubmV4dFRpY2spIHtcbiAgICAvLyBOb2RlLmpzIGJlZm9yZSAwLjkuIE5vdGUgdGhhdCBzb21lIGZha2UtTm9kZSBlbnZpcm9ubWVudHMsIGxpa2UgdGhlXG4gICAgLy8gTW9jaGEgdGVzdCBydW5uZXIsIGludHJvZHVjZSBhIGBwcm9jZXNzYCBnbG9iYWwgd2l0aG91dCBhIGBuZXh0VGlja2AuXG4gICAgaXNOb2RlSlMgPSB0cnVlO1xuXG4gICAgcmVxdWVzdEZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgICB9O1xuXG59IGVsc2UgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIC8vIEluIElFMTAsIE5vZGUuanMgMC45Kywgb3IgaHR0cHM6Ly9naXRodWIuY29tL05vYmxlSlMvc2V0SW1tZWRpYXRlXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgcmVxdWVzdEZsdXNoID0gc2V0SW1tZWRpYXRlLmJpbmQod2luZG93LCBmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdEZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2V0SW1tZWRpYXRlKGZsdXNoKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbn0gZWxzZSBpZiAodHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgLy8gbW9kZXJuIGJyb3dzZXJzXG4gICAgLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcbiAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZmx1c2g7XG4gICAgcmVxdWVzdEZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgIH07XG5cbn0gZWxzZSB7XG4gICAgLy8gb2xkIGJyb3dzZXJzXG4gICAgcmVxdWVzdEZsdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZsdXNoLCAwKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBhc2FwKHRhc2spIHtcbiAgICB0YWlsID0gdGFpbC5uZXh0ID0ge1xuICAgICAgICB0YXNrOiB0YXNrLFxuICAgICAgICBkb21haW46IGlzTm9kZUpTICYmIHByb2Nlc3MuZG9tYWluLFxuICAgICAgICBuZXh0OiBudWxsXG4gICAgfTtcblxuICAgIGlmICghZmx1c2hpbmcpIHtcbiAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xuICAgICAgICByZXF1ZXN0Rmx1c2goKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFzYXA7XG5cbiIsInZhciB3aW5kb3cgPSByZXF1aXJlKFwiZ2xvYmFsL3dpbmRvd1wiKVxudmFyIG9uY2UgPSByZXF1aXJlKFwib25jZVwiKVxudmFyIHBhcnNlSGVhZGVycyA9IHJlcXVpcmUoJ3BhcnNlLWhlYWRlcnMnKVxuXG52YXIgbWVzc2FnZXMgPSB7XG4gICAgXCIwXCI6IFwiSW50ZXJuYWwgWE1MSHR0cFJlcXVlc3QgRXJyb3JcIixcbiAgICBcIjRcIjogXCI0eHggQ2xpZW50IEVycm9yXCIsXG4gICAgXCI1XCI6IFwiNXh4IFNlcnZlciBFcnJvclwiXG59XG5cbnZhciBYSFIgPSB3aW5kb3cuWE1MSHR0cFJlcXVlc3QgfHwgbm9vcFxudmFyIFhEUiA9IFwid2l0aENyZWRlbnRpYWxzXCIgaW4gKG5ldyBYSFIoKSkgPyBYSFIgOiB3aW5kb3cuWERvbWFpblJlcXVlc3RcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVYSFJcblxuZnVuY3Rpb24gY3JlYXRlWEhSKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7IHVyaTogb3B0aW9ucyB9XG4gICAgfVxuXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICBjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2spXG5cbiAgICB2YXIgeGhyID0gb3B0aW9ucy54aHIgfHwgbnVsbFxuXG4gICAgaWYgKCF4aHIpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuY29ycyB8fCBvcHRpb25zLnVzZVhEUikge1xuICAgICAgICAgICAgeGhyID0gbmV3IFhEUigpXG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgeGhyID0gbmV3IFhIUigpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdXJpID0geGhyLnVybCA9IG9wdGlvbnMudXJpIHx8IG9wdGlvbnMudXJsXG4gICAgdmFyIG1ldGhvZCA9IHhoci5tZXRob2QgPSBvcHRpb25zLm1ldGhvZCB8fCBcIkdFVFwiXG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHkgfHwgb3B0aW9ucy5kYXRhXG4gICAgdmFyIGhlYWRlcnMgPSB4aHIuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fVxuICAgIHZhciBzeW5jID0gISFvcHRpb25zLnN5bmNcbiAgICB2YXIgaXNKc29uID0gZmFsc2VcbiAgICB2YXIga2V5XG4gICAgdmFyIGxvYWQgPSBvcHRpb25zLnJlc3BvbnNlID8gbG9hZFJlc3BvbnNlIDogbG9hZFhoclxuXG4gICAgaWYgKFwianNvblwiIGluIG9wdGlvbnMpIHtcbiAgICAgICAgaXNKc29uID0gdHJ1ZVxuICAgICAgICBoZWFkZXJzW1wiQWNjZXB0XCJdID0gXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgICAgaWYgKG1ldGhvZCAhPT0gXCJHRVRcIiAmJiBtZXRob2QgIT09IFwiSEVBRFwiKSB7XG4gICAgICAgICAgICBoZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdID0gXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgICAgICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShvcHRpb25zLmpzb24pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gcmVhZHlzdGF0ZWNoYW5nZVxuICAgIHhoci5vbmxvYWQgPSBsb2FkXG4gICAgeGhyLm9uZXJyb3IgPSBlcnJvclxuICAgIC8vIElFOSBtdXN0IGhhdmUgb25wcm9ncmVzcyBiZSBzZXQgdG8gYSB1bmlxdWUgZnVuY3Rpb24uXG4gICAgeGhyLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIElFIG11c3QgZGllXG4gICAgfVxuICAgIC8vIGhhdGUgSUVcbiAgICB4aHIub250aW1lb3V0ID0gbm9vcFxuICAgIHhoci5vcGVuKG1ldGhvZCwgdXJpLCAhc3luYylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgIGlmIChvcHRpb25zLndpdGhDcmVkZW50aWFscyB8fCAob3B0aW9ucy5jb3JzICYmIG9wdGlvbnMud2l0aENyZWRlbnRpYWxzICE9PSBmYWxzZSkpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICB9XG5cbiAgICAvLyBDYW5ub3Qgc2V0IHRpbWVvdXQgd2l0aCBzeW5jIHJlcXVlc3RcbiAgICBpZiAoIXN5bmMpIHtcbiAgICAgICAgeGhyLnRpbWVvdXQgPSBcInRpbWVvdXRcIiBpbiBvcHRpb25zID8gb3B0aW9ucy50aW1lb3V0IDogNTAwMFxuICAgIH1cblxuICAgIGlmICh4aHIuc2V0UmVxdWVzdEhlYWRlcikge1xuICAgICAgICBmb3Ioa2V5IGluIGhlYWRlcnMpe1xuICAgICAgICAgICAgaWYoaGVhZGVycy5oYXNPd25Qcm9wZXJ0eShrZXkpKXtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIGhlYWRlcnNba2V5XSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkhlYWRlcnMgY2Fubm90IGJlIHNldCBvbiBhbiBYRG9tYWluUmVxdWVzdCBvYmplY3RcIilcbiAgICB9XG5cbiAgICBpZiAoXCJyZXNwb25zZVR5cGVcIiBpbiBvcHRpb25zKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSBvcHRpb25zLnJlc3BvbnNlVHlwZVxuICAgIH1cbiAgICBcbiAgICBpZiAoXCJiZWZvcmVTZW5kXCIgaW4gb3B0aW9ucyAmJiBcbiAgICAgICAgdHlwZW9mIG9wdGlvbnMuYmVmb3JlU2VuZCA9PT0gXCJmdW5jdGlvblwiXG4gICAgKSB7XG4gICAgICAgIG9wdGlvbnMuYmVmb3JlU2VuZCh4aHIpXG4gICAgfVxuXG4gICAgeGhyLnNlbmQoYm9keSlcblxuICAgIHJldHVybiB4aHJcblxuICAgIGZ1bmN0aW9uIHJlYWR5c3RhdGVjaGFuZ2UoKSB7XG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgbG9hZCgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRCb2R5KCkge1xuICAgICAgICAvLyBDaHJvbWUgd2l0aCByZXF1ZXN0VHlwZT1ibG9iIHRocm93cyBlcnJvcnMgYXJyb3VuZCB3aGVuIGV2ZW4gdGVzdGluZyBhY2Nlc3MgdG8gcmVzcG9uc2VUZXh0XG4gICAgICAgIHZhciBib2R5ID0gbnVsbFxuXG4gICAgICAgIGlmICh4aHIucmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGJvZHkgPSB4aHIucmVzcG9uc2VcbiAgICAgICAgfSBlbHNlIGlmICh4aHIucmVzcG9uc2VUeXBlID09PSAndGV4dCcgfHwgIXhoci5yZXNwb25zZVR5cGUpIHtcbiAgICAgICAgICAgIGJvZHkgPSB4aHIucmVzcG9uc2VUZXh0IHx8IHhoci5yZXNwb25zZVhNTFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzSnNvbikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBib2R5ID0gSlNPTi5wYXJzZShib2R5KVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBib2R5XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U3RhdHVzQ29kZSgpIHtcbiAgICAgICAgcmV0dXJuIHhoci5zdGF0dXMgPT09IDEyMjMgPyAyMDQgOiB4aHIuc3RhdHVzXG4gICAgfVxuXG4gICAgLy8gaWYgd2UncmUgZ2V0dGluZyBhIG5vbmUtb2sgc3RhdHVzQ29kZSwgYnVpbGQgJiByZXR1cm4gYW4gZXJyb3JcbiAgICBmdW5jdGlvbiBlcnJvckZyb21TdGF0dXNDb2RlKHN0YXR1cywgYm9keSkge1xuICAgICAgICB2YXIgZXJyb3IgPSBudWxsXG4gICAgICAgIGlmIChzdGF0dXMgPT09IDAgfHwgKHN0YXR1cyA+PSA0MDAgJiYgc3RhdHVzIDwgNjAwKSkge1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSAodHlwZW9mIGJvZHkgPT09IFwic3RyaW5nXCIgPyBib2R5IDogZmFsc2UpIHx8XG4gICAgICAgICAgICAgICAgbWVzc2FnZXNbU3RyaW5nKHN0YXR1cykuY2hhckF0KDApXVxuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSlcbiAgICAgICAgICAgIGVycm9yLnN0YXR1c0NvZGUgPSBzdGF0dXNcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlcnJvclxuICAgIH1cblxuICAgIC8vIHdpbGwgbG9hZCB0aGUgZGF0YSAmIHByb2Nlc3MgdGhlIHJlc3BvbnNlIGluIGEgc3BlY2lhbCByZXNwb25zZSBvYmplY3RcbiAgICBmdW5jdGlvbiBsb2FkUmVzcG9uc2UoKSB7XG4gICAgICAgIHZhciBzdGF0dXMgPSBnZXRTdGF0dXNDb2RlKClcbiAgICAgICAgdmFyIGJvZHkgPSBnZXRCb2R5KClcbiAgICAgICAgdmFyIGVycm9yID0gZXJyb3JGcm9tU3RhdHVzQ29kZShzdGF0dXMsIGJvZHkpXG4gICAgICAgIHZhciByZXNwb25zZSA9IHtcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICBzdGF0dXNDb2RlOiBzdGF0dXMsXG4gICAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICAgIHJhdzogeGhyXG4gICAgICAgIH1cbiAgICAgICAgaWYoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycyl7IC8vcmVtZW1iZXIgeGhyIGNhbiBpbiBmYWN0IGJlIFhEUiBmb3IgQ09SUyBpbiBJRVxuICAgICAgICAgICAgcmVzcG9uc2UuaGVhZGVycyA9IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNwb25zZS5oZWFkZXJzID0ge31cbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCByZXNwb25zZSwgcmVzcG9uc2UuYm9keSlcbiAgICB9XG5cbiAgICAvLyB3aWxsIGxvYWQgdGhlIGRhdGEgYW5kIGFkZCBzb21lIHJlc3BvbnNlIHByb3BlcnRpZXMgdG8gdGhlIHNvdXJjZSB4aHJcbiAgICAvLyBhbmQgdGhlbiByZXNwb25kIHdpdGggdGhhdFxuICAgIGZ1bmN0aW9uIGxvYWRYaHIoKSB7XG4gICAgICAgIHZhciBzdGF0dXMgPSBnZXRTdGF0dXNDb2RlKClcbiAgICAgICAgdmFyIGVycm9yID0gZXJyb3JGcm9tU3RhdHVzQ29kZShzdGF0dXMpXG5cbiAgICAgICAgeGhyLnN0YXR1cyA9IHhoci5zdGF0dXNDb2RlID0gc3RhdHVzXG4gICAgICAgIHhoci5ib2R5ID0gZ2V0Qm9keSgpXG4gICAgICAgIHhoci5oZWFkZXJzID0gcGFyc2VIZWFkZXJzKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSlcblxuICAgICAgICBjYWxsYmFjayhlcnJvciwgeGhyLCB4aHIuYm9keSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlcnJvcihldnQpIHtcbiAgICAgICAgY2FsbGJhY2soZXZ0LCB4aHIpXG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuIiwiaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZ2xvYmFsO1xufSBlbHNlIGlmICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIil7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBzZWxmO1xufSBlbHNlIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHt9O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBvbmNlXG5cbm9uY2UucHJvdG8gPSBvbmNlKGZ1bmN0aW9uICgpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEZ1bmN0aW9uLnByb3RvdHlwZSwgJ29uY2UnLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBvbmNlKHRoaXMpXG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfSlcbn0pXG5cbmZ1bmN0aW9uIG9uY2UgKGZuKSB7XG4gIHZhciBjYWxsZWQgPSBmYWxzZVxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjYWxsZWQpIHJldHVyblxuICAgIGNhbGxlZCA9IHRydWVcbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICB9XG59XG4iLCJ2YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoJ2lzLWZ1bmN0aW9uJylcblxubW9kdWxlLmV4cG9ydHMgPSBmb3JFYWNoXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlcblxuZnVuY3Rpb24gZm9yRWFjaChsaXN0LCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXNGdW5jdGlvbihpdGVyYXRvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaXRlcmF0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uJylcbiAgICB9XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgY29udGV4dCA9IHRoaXNcbiAgICB9XG4gICAgXG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobGlzdCkgPT09ICdbb2JqZWN0IEFycmF5XScpXG4gICAgICAgIGZvckVhY2hBcnJheShsaXN0LCBpdGVyYXRvciwgY29udGV4dClcbiAgICBlbHNlIGlmICh0eXBlb2YgbGlzdCA9PT0gJ3N0cmluZycpXG4gICAgICAgIGZvckVhY2hTdHJpbmcobGlzdCwgaXRlcmF0b3IsIGNvbnRleHQpXG4gICAgZWxzZVxuICAgICAgICBmb3JFYWNoT2JqZWN0KGxpc3QsIGl0ZXJhdG9yLCBjb250ZXh0KVxufVxuXG5mdW5jdGlvbiBmb3JFYWNoQXJyYXkoYXJyYXksIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGFycmF5LCBpKSkge1xuICAgICAgICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBhcnJheVtpXSwgaSwgYXJyYXkpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZvckVhY2hTdHJpbmcoc3RyaW5nLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzdHJpbmcubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgLy8gbm8gc3VjaCB0aGluZyBhcyBhIHNwYXJzZSBzdHJpbmcuXG4gICAgICAgIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgc3RyaW5nLmNoYXJBdChpKSwgaSwgc3RyaW5nKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZm9yRWFjaE9iamVjdChvYmplY3QsIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgayBpbiBvYmplY3QpIHtcbiAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrKSkge1xuICAgICAgICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmplY3Rba10sIGssIG9iamVjdClcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNGdW5jdGlvblxuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24gKGZuKSB7XG4gIHZhciBzdHJpbmcgPSB0b1N0cmluZy5jYWxsKGZuKVxuICByZXR1cm4gc3RyaW5nID09PSAnW29iamVjdCBGdW5jdGlvbl0nIHx8XG4gICAgKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyAmJiBzdHJpbmcgIT09ICdbb2JqZWN0IFJlZ0V4cF0nKSB8fFxuICAgICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAvLyBJRTggYW5kIGJlbG93XG4gICAgIChmbiA9PT0gd2luZG93LnNldFRpbWVvdXQgfHxcbiAgICAgIGZuID09PSB3aW5kb3cuYWxlcnQgfHxcbiAgICAgIGZuID09PSB3aW5kb3cuY29uZmlybSB8fFxuICAgICAgZm4gPT09IHdpbmRvdy5wcm9tcHQpKVxufTtcbiIsIlxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gdHJpbTtcblxuZnVuY3Rpb24gdHJpbShzdHIpe1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMqfFxccyokL2csICcnKTtcbn1cblxuZXhwb3J0cy5sZWZ0ID0gZnVuY3Rpb24oc3RyKXtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzKi8sICcnKTtcbn07XG5cbmV4cG9ydHMucmlnaHQgPSBmdW5jdGlvbihzdHIpe1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1xccyokLywgJycpO1xufTtcbiIsInZhciB0cmltID0gcmVxdWlyZSgndHJpbScpXG4gICwgZm9yRWFjaCA9IHJlcXVpcmUoJ2Zvci1lYWNoJylcbiAgLCBpc0FycmF5ID0gZnVuY3Rpb24oYXJnKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFyZykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChoZWFkZXJzKSB7XG4gIGlmICghaGVhZGVycylcbiAgICByZXR1cm4ge31cblxuICB2YXIgcmVzdWx0ID0ge31cblxuICBmb3JFYWNoKFxuICAgICAgdHJpbShoZWFkZXJzKS5zcGxpdCgnXFxuJylcbiAgICAsIGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gcm93LmluZGV4T2YoJzonKVxuICAgICAgICAgICwga2V5ID0gdHJpbShyb3cuc2xpY2UoMCwgaW5kZXgpKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgLCB2YWx1ZSA9IHRyaW0ocm93LnNsaWNlKGluZGV4ICsgMSkpXG5cbiAgICAgICAgaWYgKHR5cGVvZihyZXN1bHRba2V5XSkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZVxuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkocmVzdWx0W2tleV0pKSB7XG4gICAgICAgICAgcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRba2V5XSA9IFsgcmVzdWx0W2tleV0sIHZhbHVlIF1cbiAgICAgICAgfVxuICAgICAgfVxuICApXG5cbiAgcmV0dXJuIHJlc3VsdFxufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywge1xuXHR2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxuZnVuY3Rpb24gaGFzQ2hpbGRyZW5XaXRoVmVydGljYWxGaWxsKGNoaWxkcmVuKSB7XG5cdHZhciByZXN1bHQgPSBmYWxzZTtcblxuXHRSZWFjdC5DaGlsZHJlbi5mb3JFYWNoKGNoaWxkcmVuLCBmdW5jdGlvbiAoYykge1xuXHRcdGlmIChyZXN1bHQpIHJldHVybjsgLy8gZWFybHktZXhpdFxuXHRcdGlmICghYykgcmV0dXJuO1xuXHRcdGlmICghYy50eXBlKSByZXR1cm47XG5cblx0XHRyZXN1bHQgPSAhIWMudHlwZS5zaG91bGRGaWxsVmVydGljYWxTcGFjZTtcblx0fSk7XG5cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxudmFyIENvbnRhaW5lciA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdDb250YWluZXInLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGFsaWduOiBSZWFjdC5Qcm9wVHlwZXMub25lT2YoWydlbmQnLCAnY2VudGVyJywgJ3N0YXJ0J10pLFxuXHRcdGRpcmVjdGlvbjogUmVhY3QuUHJvcFR5cGVzLm9uZU9mKFsnY29sdW1uJywgJ3JvdyddKSxcblx0XHRqdXN0aWZ5OiBSZWFjdC5Qcm9wVHlwZXMub25lT2ZUeXBlKFtSZWFjdC5Qcm9wVHlwZXMuYm9vbCwgUmVhY3QuUHJvcFR5cGVzLm9uZU9mKFsnZW5kJywgJ2NlbnRlcicsICdzdGFydCddKV0pLFxuXHRcdGdyb3c6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdGZpbGw6IFJlYWN0LlByb3BUeXBlcy5ib29sXG5cdH0sXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRpZiAodGhpcy5wcm9wcy5zY3JvbGxhYmxlICYmIHRoaXMucHJvcHMuc2Nyb2xsYWJsZS5tb3VudCkge1xuXHRcdFx0dGhpcy5wcm9wcy5zY3JvbGxhYmxlLm1vdW50KHRoaXMpO1xuXHRcdH1cblx0fSxcblx0Y29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGlmICh0aGlzLnByb3BzLnNjcm9sbGFibGUgJiYgdGhpcy5wcm9wcy5zY3JvbGxhYmxlLnVubW91bnQpIHtcblx0XHRcdHRoaXMucHJvcHMuc2Nyb2xsYWJsZS51bm1vdW50KHRoaXMpO1xuXHRcdH1cblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGRpcmVjdGlvbiA9IHRoaXMucHJvcHMuZGlyZWN0aW9uO1xuXHRcdGlmICghZGlyZWN0aW9uKSB7XG5cdFx0XHRpZiAoaGFzQ2hpbGRyZW5XaXRoVmVydGljYWxGaWxsKHRoaXMucHJvcHMuY2hpbGRyZW4pKSB7XG5cdFx0XHRcdGRpcmVjdGlvbiA9ICdjb2x1bW4nO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBmaWxsID0gdGhpcy5wcm9wcy5maWxsO1xuXHRcdGlmIChkaXJlY3Rpb24gPT09ICdjb2x1bW4nIHx8IHRoaXMucHJvcHMuc2Nyb2xsYWJsZSkge1xuXHRcdFx0ZmlsbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0dmFyIGFsaWduID0gdGhpcy5wcm9wcy5hbGlnbjtcblx0XHRpZiAoZGlyZWN0aW9uID09PSAnY29sdW1uJyAmJiBhbGlnbiA9PT0gJ3RvcCcpIGFsaWduID0gJ3N0YXJ0Jztcblx0XHRpZiAoZGlyZWN0aW9uID09PSAnY29sdW1uJyAmJiBhbGlnbiA9PT0gJ2JvdHRvbScpIGFsaWduID0gJ2VuZCc7XG5cdFx0aWYgKGRpcmVjdGlvbiA9PT0gJ3JvdycgJiYgYWxpZ24gPT09ICdsZWZ0JykgYWxpZ24gPSAnc3RhcnQnO1xuXHRcdGlmIChkaXJlY3Rpb24gPT09ICdyb3cnICYmIGFsaWduID09PSAncmlnaHQnKSBhbGlnbiA9ICdlbmQnO1xuXG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXModGhpcy5wcm9wcy5jbGFzc05hbWUsIHtcblx0XHRcdCdDb250YWluZXItLWZpbGwnOiBmaWxsLFxuXHRcdFx0J0NvbnRhaW5lci0tZGlyZWN0aW9uLWNvbHVtbic6IGRpcmVjdGlvbiA9PT0gJ2NvbHVtbicsXG5cdFx0XHQnQ29udGFpbmVyLS1kaXJlY3Rpb24tcm93JzogZGlyZWN0aW9uID09PSAncm93Jyxcblx0XHRcdCdDb250YWluZXItLWFsaWduLWNlbnRlcic6IGFsaWduID09PSAnY2VudGVyJyxcblx0XHRcdCdDb250YWluZXItLWFsaWduLXN0YXJ0JzogYWxpZ24gPT09ICdzdGFydCcsXG5cdFx0XHQnQ29udGFpbmVyLS1hbGlnbi1lbmQnOiBhbGlnbiA9PT0gJ2VuZCcsXG5cdFx0XHQnQ29udGFpbmVyLS1qdXN0aWZ5LWNlbnRlcic6IHRoaXMucHJvcHMuanVzdGlmeSA9PT0gJ2NlbnRlcicsXG5cdFx0XHQnQ29udGFpbmVyLS1qdXN0aWZ5LXN0YXJ0JzogdGhpcy5wcm9wcy5qdXN0aWZ5ID09PSAnc3RhcnQnLFxuXHRcdFx0J0NvbnRhaW5lci0tanVzdGlmeS1lbmQnOiB0aGlzLnByb3BzLmp1c3RpZnkgPT09ICdlbmQnLFxuXHRcdFx0J0NvbnRhaW5lci0tanVzdGlmaWVkJzogdGhpcy5wcm9wcy5qdXN0aWZ5ID09PSB0cnVlLFxuXHRcdFx0J0NvbnRhaW5lci0tc2Nyb2xsYWJsZSc6IHRoaXMucHJvcHMuc2Nyb2xsYWJsZVxuXHRcdH0pO1xuXG5cdFx0dmFyIHByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICdjbGFzc05hbWUnLCAnZGlyZWN0aW9uJywgJ2ZpbGwnLCAnanVzdGlmeScsICdzY3JvbGxhYmxlJyk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0X2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBwcm9wcyksXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxufSk7XG5cbmZ1bmN0aW9uIGluaXRTY3JvbGxhYmxlKCkge1xuXHR2YXIgcG9zO1xuXHR2YXIgc2Nyb2xsYWJsZSA9IHtcblx0XHRyZXNldDogZnVuY3Rpb24gcmVzZXQoKSB7XG5cdFx0XHRwb3MgPSB7IGxlZnQ6IDAsIHRvcDogMCB9O1xuXHRcdH0sXG5cdFx0bW91bnQ6IGZ1bmN0aW9uIG1vdW50KGVsZW1lbnQpIHtcblx0XHRcdHZhciBub2RlID0gUmVhY3QuZmluZERPTU5vZGUoZWxlbWVudCk7XG5cdFx0XHRub2RlLnNjcm9sbExlZnQgPSBwb3MubGVmdDtcblx0XHRcdG5vZGUuc2Nyb2xsVG9wID0gcG9zLnRvcDtcblx0XHR9LFxuXHRcdHVubW91bnQ6IGZ1bmN0aW9uIHVubW91bnQoZWxlbWVudCkge1xuXHRcdFx0dmFyIG5vZGUgPSBSZWFjdC5maW5kRE9NTm9kZShlbGVtZW50KTtcblx0XHRcdHBvcy5sZWZ0ID0gbm9kZS5zY3JvbGxMZWZ0O1xuXHRcdFx0cG9zLnRvcCA9IG5vZGUuc2Nyb2xsVG9wO1xuXHRcdH1cblx0fTtcblx0c2Nyb2xsYWJsZS5yZXNldCgpO1xuXHRyZXR1cm4gc2Nyb2xsYWJsZTtcbn1cblxuQ29udGFpbmVyLmluaXRTY3JvbGxhYmxlID0gaW5pdFNjcm9sbGFibGU7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IENvbnRhaW5lcjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYmxhY2tsaXN0IChzcmMpIHtcbiAgdmFyIGNvcHkgPSB7fSwgZmlsdGVyID0gYXJndW1lbnRzWzFdXG5cbiAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgZmlsdGVyID0ge31cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgZmlsdGVyW2FyZ3VtZW50c1tpXV0gPSB0cnVlXG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIga2V5IGluIHNyYykge1xuICAgIC8vIGJsYWNrbGlzdD9cbiAgICBpZiAoZmlsdGVyW2tleV0pIGNvbnRpbnVlXG5cbiAgICBjb3B5W2tleV0gPSBzcmNba2V5XVxuICB9XG5cbiAgcmV0dXJuIGNvcHlcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGxpc3RlbmVycyA9IFtdO1xuXG4gIHJldHVybiB7XG4gICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuICAgICAgbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgIHZhciBlbWl0dGVyID0gbGlzdGVuZXIuZW1pdHRlcjtcbiAgICAgICAgdmFyIGV2ZW50TmFtZSA9IGxpc3RlbmVyLmV2ZW50TmFtZTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gbGlzdGVuZXIuY2FsbGJhY2s7XG5cbiAgICAgICAgdmFyIHJlbW92ZUxpc3RlbmVyID0gZW1pdHRlci5yZW1vdmVMaXN0ZW5lciB8fCBlbWl0dGVyLnJlbW92ZUV2ZW50TGlzdGVuZXI7XG4gICAgICAgIHJlbW92ZUxpc3RlbmVyLmNhbGwoZW1pdHRlciwgZXZlbnROYW1lLCBjYWxsYmFjayk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgd2F0Y2g6IGZ1bmN0aW9uIHdhdGNoKGVtaXR0ZXIsIGV2ZW50TmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIGxpc3RlbmVycy5wdXNoKHtcbiAgICAgICAgZW1pdHRlcjogZW1pdHRlcixcbiAgICAgICAgZXZlbnROYW1lOiBldmVudE5hbWUsXG4gICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBhZGRMaXN0ZW5lciA9IGVtaXR0ZXIuYWRkTGlzdGVuZXIgfHwgZW1pdHRlci5hZGRFdmVudExpc3RlbmVyO1xuICAgICAgYWRkTGlzdGVuZXIuY2FsbChlbWl0dGVyLCBldmVudE5hbWUsIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgdW53YXRjaDogZnVuY3Rpb24gdW53YXRjaChlbWl0dGVyLCBldmVudE5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuZmlsdGVyKGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICByZXR1cm4gbGlzdGVuZXIuZW1pdHRlciA9PT0gZW1pdHRlciAmJiBsaXN0ZW5lci5ldmVudE5hbWUgPT09IGV2ZW50TmFtZSAmJiBsaXN0ZW5lci5jYWxsYmFjayA9PT0gY2FsbGJhY2s7XG4gICAgICB9KTtcblxuICAgICAgdmFyIHJlbW92ZUxpc3RlbmVyID0gZW1pdHRlci5yZW1vdmVMaXN0ZW5lciB8fCBlbWl0dGVyLnJlbW92ZUV2ZW50TGlzdGVuZXI7XG4gICAgICByZW1vdmVMaXN0ZW5lci5jYWxsKGVtaXR0ZXIsIGV2ZW50TmFtZSwgY2FsbGJhY2spO1xuICAgIH1cbiAgfTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG4vLyBFbmFibGUgUmVhY3QgVG91Y2ggRXZlbnRzXG5SZWFjdC5pbml0aWFsaXplVG91Y2hFdmVudHModHJ1ZSk7XG5cbmZ1bmN0aW9uIGdldFRvdWNoUHJvcHModG91Y2gpIHtcblx0aWYgKCF0b3VjaCkgcmV0dXJuIHt9O1xuXHRyZXR1cm4ge1xuXHRcdHBhZ2VYOiB0b3VjaC5wYWdlWCxcblx0XHRwYWdlWTogdG91Y2gucGFnZVksXG5cdFx0Y2xpZW50WDogdG91Y2guY2xpZW50WCxcblx0XHRjbGllbnRZOiB0b3VjaC5jbGllbnRZXG5cdH07XG59XG5cbmZ1bmN0aW9uIGlzRGF0YU9yQXJpYVByb3Aoa2V5KSB7XG5cdHJldHVybiBrZXkuaW5kZXhPZignZGF0YS0nKSA9PT0gMCB8fCBrZXkuaW5kZXhPZignYXJpYS0nKSA9PT0gMDtcbn1cblxuZnVuY3Rpb24gZ2V0UGluY2hQcm9wcyh0b3VjaGVzKSB7XG5cdHJldHVybiB7XG5cdFx0dG91Y2hlczogQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKHRvdWNoZXMsIGZ1bmN0aW9uIGNvcHlUb3VjaCh0b3VjaCkge1xuXHRcdFx0cmV0dXJuIHsgaWRlbnRpZmllcjogdG91Y2guaWRlbnRpZmllciwgcGFnZVg6IHRvdWNoLnBhZ2VYLCBwYWdlWTogdG91Y2gucGFnZVkgfTtcblx0XHR9KSxcblx0XHRjZW50ZXI6IHsgeDogKHRvdWNoZXNbMF0ucGFnZVggKyB0b3VjaGVzWzFdLnBhZ2VYKSAvIDIsIHk6ICh0b3VjaGVzWzBdLnBhZ2VZICsgdG91Y2hlc1sxXS5wYWdlWSkgLyAyIH0sXG5cdFx0YW5nbGU6IE1hdGguYXRhbigpICogKHRvdWNoZXNbMV0ucGFnZVkgLSB0b3VjaGVzWzBdLnBhZ2VZKSAvICh0b3VjaGVzWzFdLnBhZ2VYIC0gdG91Y2hlc1swXS5wYWdlWCkgKiAxODAgLyBNYXRoLlBJLFxuXHRcdGRpc3RhbmNlOiBNYXRoLnNxcnQoTWF0aC5wb3coTWF0aC5hYnModG91Y2hlc1sxXS5wYWdlWCAtIHRvdWNoZXNbMF0ucGFnZVgpLCAyKSArIE1hdGgucG93KE1hdGguYWJzKHRvdWNoZXNbMV0ucGFnZVkgLSB0b3VjaGVzWzBdLnBhZ2VZKSwgMikpXG5cdH07XG59XG5cbi8qKlxuICogVGFwcGFibGUgTWl4aW5cbiAqID09PT09PT09PT09PT09XG4gKi9cblxudmFyIE1peGluID0ge1xuXHRwcm9wVHlwZXM6IHtcblx0XHRtb3ZlVGhyZXNob2xkOiBSZWFjdC5Qcm9wVHlwZXMubnVtYmVyLCAvLyBwaXhlbHMgdG8gbW92ZSBiZWZvcmUgY2FuY2VsbGluZyB0YXBcblx0XHRhY3RpdmVEZWxheTogUmVhY3QuUHJvcFR5cGVzLm51bWJlciwgLy8gbXMgdG8gd2FpdCBiZWZvcmUgYWRkaW5nIHRoZSBgLWFjdGl2ZWAgY2xhc3Ncblx0XHRwcmVzc0RlbGF5OiBSZWFjdC5Qcm9wVHlwZXMubnVtYmVyLCAvLyBtcyB0byB3YWl0IGJlZm9yZSBkZXRlY3RpbmcgYSBwcmVzc1xuXHRcdHByZXNzTW92ZVRocmVzaG9sZDogUmVhY3QuUHJvcFR5cGVzLm51bWJlciwgLy8gcGl4ZWxzIHRvIG1vdmUgYmVmb3JlIGNhbmNlbGxpbmcgcHJlc3Ncblx0XHRwcmV2ZW50RGVmYXVsdDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsIC8vIHdoZXRoZXIgdG8gcHJldmVudERlZmF1bHQgb24gYWxsIGV2ZW50c1xuXHRcdHN0b3BQcm9wYWdhdGlvbjogUmVhY3QuUHJvcFR5cGVzLmJvb2wsIC8vIHdoZXRoZXIgdG8gc3RvcFByb3BhZ2F0aW9uIG9uIGFsbCBldmVudHNcblxuXHRcdG9uVGFwOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gZmlyZXMgd2hlbiBhIHRhcCBpcyBkZXRlY3RlZFxuXHRcdG9uUHJlc3M6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBmaXJlcyB3aGVuIGEgcHJlc3MgaXMgZGV0ZWN0ZWRcblx0XHRvblRvdWNoU3RhcnQ6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBwYXNzLXRocm91Z2ggdG91Y2ggZXZlbnRcblx0XHRvblRvdWNoTW92ZTogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCB0b3VjaCBldmVudFxuXHRcdG9uVG91Y2hFbmQ6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAvLyBwYXNzLXRocm91Z2ggdG91Y2ggZXZlbnRcblx0XHRvbk1vdXNlRG93bjogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCBtb3VzZSBldmVudFxuXHRcdG9uTW91c2VVcDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCBtb3VzZSBldmVudFxuXHRcdG9uTW91c2VNb3ZlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gcGFzcy10aHJvdWdoIG1vdXNlIGV2ZW50XG5cdFx0b25Nb3VzZU91dDogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsIC8vIHBhc3MtdGhyb3VnaCBtb3VzZSBldmVudFxuXG5cdFx0b25QaW5jaFN0YXJ0OiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gZmlyZXMgd2hlbiBhIHBpbmNoIGdlc3R1cmUgaXMgc3RhcnRlZFxuXHRcdG9uUGluY2hNb3ZlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgLy8gZmlyZXMgb24gZXZlcnkgdG91Y2gtbW92ZSB3aGVuIGEgcGluY2ggYWN0aW9uIGlzIGFjdGl2ZVxuXHRcdG9uUGluY2hFbmQ6IFJlYWN0LlByb3BUeXBlcy5mdW5jIC8vIGZpcmVzIHdoZW4gYSBwaW5jaCBhY3Rpb24gZW5kc1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhY3RpdmVEZWxheTogMCxcblx0XHRcdG1vdmVUaHJlc2hvbGQ6IDEwMCxcblx0XHRcdHByZXNzRGVsYXk6IDEwMDAsXG5cdFx0XHRwcmVzc01vdmVUaHJlc2hvbGQ6IDVcblx0XHR9O1xuXHR9LFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRpc0FjdGl2ZTogZmFsc2UsXG5cdFx0XHR0b3VjaEFjdGl2ZTogZmFsc2UsXG5cdFx0XHRwaW5jaEFjdGl2ZTogZmFsc2Vcblx0XHR9O1xuXHR9LFxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR0aGlzLmNsZWFudXBTY3JvbGxEZXRlY3Rpb24oKTtcblx0XHR0aGlzLmNhbmNlbFByZXNzRGV0ZWN0aW9uKCk7XG5cdFx0dGhpcy5jbGVhckFjdGl2ZVRpbWVvdXQoKTtcblx0fSxcblxuXHRwcm9jZXNzRXZlbnQ6IGZ1bmN0aW9uIHByb2Nlc3NFdmVudChldmVudCkge1xuXHRcdGlmICh0aGlzLnByb3BzLnByZXZlbnREZWZhdWx0KSBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdGlmICh0aGlzLnByb3BzLnN0b3BQcm9wYWdhdGlvbikgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdH0sXG5cblx0b25Ub3VjaFN0YXJ0OiBmdW5jdGlvbiBvblRvdWNoU3RhcnQoZXZlbnQpIHtcblx0XHRpZiAodGhpcy5wcm9wcy5vblRvdWNoU3RhcnQgJiYgdGhpcy5wcm9wcy5vblRvdWNoU3RhcnQoZXZlbnQpID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdHRoaXMucHJvY2Vzc0V2ZW50KGV2ZW50KTtcblx0XHR3aW5kb3cuX2Jsb2NrTW91c2VFdmVudHMgPSB0cnVlO1xuXHRcdGlmIChldmVudC50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0dGhpcy5faW5pdGlhbFRvdWNoID0gdGhpcy5fbGFzdFRvdWNoID0gZ2V0VG91Y2hQcm9wcyhldmVudC50b3VjaGVzWzBdKTtcblx0XHRcdHRoaXMuaW5pdFNjcm9sbERldGVjdGlvbigpO1xuXHRcdFx0dGhpcy5pbml0UHJlc3NEZXRlY3Rpb24oZXZlbnQsIHRoaXMuZW5kVG91Y2gpO1xuXHRcdFx0dGhpcy5fYWN0aXZlVGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5tYWtlQWN0aXZlLCB0aGlzLnByb3BzLmFjdGl2ZURlbGF5KTtcblx0XHR9IGVsc2UgaWYgKCh0aGlzLnByb3BzLm9uUGluY2hTdGFydCB8fCB0aGlzLnByb3BzLm9uUGluY2hNb3ZlIHx8IHRoaXMucHJvcHMub25QaW5jaEVuZCkgJiYgZXZlbnQudG91Y2hlcy5sZW5ndGggPT09IDIpIHtcblx0XHRcdHRoaXMub25QaW5jaFN0YXJ0KGV2ZW50KTtcblx0XHR9XG5cdH0sXG5cblx0bWFrZUFjdGl2ZTogZnVuY3Rpb24gbWFrZUFjdGl2ZSgpIHtcblx0XHRpZiAoIXRoaXMuaXNNb3VudGVkKCkpIHJldHVybjtcblx0XHR0aGlzLmNsZWFyQWN0aXZlVGltZW91dCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNBY3RpdmU6IHRydWVcblx0XHR9KTtcblx0fSxcblxuXHRjbGVhckFjdGl2ZVRpbWVvdXQ6IGZ1bmN0aW9uIGNsZWFyQWN0aXZlVGltZW91dCgpIHtcblx0XHRjbGVhclRpbWVvdXQodGhpcy5fYWN0aXZlVGltZW91dCk7XG5cdFx0dGhpcy5fYWN0aXZlVGltZW91dCA9IGZhbHNlO1xuXHR9LFxuXG5cdG9uUGluY2hTdGFydDogZnVuY3Rpb24gb25QaW5jaFN0YXJ0KGV2ZW50KSB7XG5cdFx0Ly8gaW4gY2FzZSB0aGUgdHdvIHRvdWNoZXMgZGlkbid0IHN0YXJ0IGV4YWN0bHkgYXQgdGhlIHNhbWUgdGltZVxuXHRcdGlmICh0aGlzLl9pbml0aWFsVG91Y2gpIHtcblx0XHRcdHRoaXMuZW5kVG91Y2goKTtcblx0XHR9XG5cdFx0dmFyIHRvdWNoZXMgPSBldmVudC50b3VjaGVzO1xuXHRcdHRoaXMuX2luaXRpYWxQaW5jaCA9IGdldFBpbmNoUHJvcHModG91Y2hlcyk7XG5cdFx0dGhpcy5faW5pdGlhbFBpbmNoID0gX2V4dGVuZHModGhpcy5faW5pdGlhbFBpbmNoLCB7XG5cdFx0XHRkaXNwbGFjZW1lbnQ6IHsgeDogMCwgeTogMCB9LFxuXHRcdFx0ZGlzcGxhY2VtZW50VmVsb2NpdHk6IHsgeDogMCwgeTogMCB9LFxuXHRcdFx0cm90YXRpb246IDAsXG5cdFx0XHRyb3RhdGlvblZlbG9jaXR5OiAwLFxuXHRcdFx0em9vbTogMSxcblx0XHRcdHpvb21WZWxvY2l0eTogMCxcblx0XHRcdHRpbWU6IERhdGUubm93KClcblx0XHR9KTtcblx0XHR0aGlzLl9sYXN0UGluY2ggPSB0aGlzLl9pbml0aWFsUGluY2g7XG5cdFx0dGhpcy5wcm9wcy5vblBpbmNoU3RhcnQgJiYgdGhpcy5wcm9wcy5vblBpbmNoU3RhcnQodGhpcy5faW5pdGlhbFBpbmNoLCBldmVudCk7XG5cdH0sXG5cblx0b25QaW5jaE1vdmU6IGZ1bmN0aW9uIG9uUGluY2hNb3ZlKGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMuX2luaXRpYWxUb3VjaCkge1xuXHRcdFx0dGhpcy5lbmRUb3VjaCgpO1xuXHRcdH1cblx0XHR2YXIgdG91Y2hlcyA9IGV2ZW50LnRvdWNoZXM7XG5cdFx0aWYgKHRvdWNoZXMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5vblBpbmNoRW5kKGV2ZW50KSAvLyBiYWlsIG91dCBiZWZvcmUgZGlzYXN0ZXJcblx0XHRcdDtcblx0XHR9XG5cblx0XHR2YXIgY3VycmVudFBpbmNoID0gdG91Y2hlc1swXS5pZGVudGlmaWVyID09PSB0aGlzLl9pbml0aWFsUGluY2gudG91Y2hlc1swXS5pZGVudGlmaWVyICYmIHRvdWNoZXNbMV0uaWRlbnRpZmllciA9PT0gdGhpcy5faW5pdGlhbFBpbmNoLnRvdWNoZXNbMV0uaWRlbnRpZmllciA/IGdldFBpbmNoUHJvcHModG91Y2hlcykgLy8gdGhlIHRvdWNoZXMgYXJlIGluIHRoZSBjb3JyZWN0IG9yZGVyXG5cdFx0OiB0b3VjaGVzWzFdLmlkZW50aWZpZXIgPT09IHRoaXMuX2luaXRpYWxQaW5jaC50b3VjaGVzWzBdLmlkZW50aWZpZXIgJiYgdG91Y2hlc1swXS5pZGVudGlmaWVyID09PSB0aGlzLl9pbml0aWFsUGluY2gudG91Y2hlc1sxXS5pZGVudGlmaWVyID8gZ2V0UGluY2hQcm9wcyh0b3VjaGVzLnJldmVyc2UoKSkgLy8gdGhlIHRvdWNoZXMgaGF2ZSBzb21laG93IGNoYW5nZWQgb3JkZXJcblx0XHQ6IGdldFBpbmNoUHJvcHModG91Y2hlcyk7IC8vIHNvbWV0aGluZyBpcyB3cm9uZywgYnV0IHdlIHN0aWxsIGhhdmUgdHdvIHRvdWNoLXBvaW50cywgc28gd2UgdHJ5IG5vdCB0byBmYWlsXG5cblx0XHRjdXJyZW50UGluY2guZGlzcGxhY2VtZW50ID0ge1xuXHRcdFx0eDogY3VycmVudFBpbmNoLmNlbnRlci54IC0gdGhpcy5faW5pdGlhbFBpbmNoLmNlbnRlci54LFxuXHRcdFx0eTogY3VycmVudFBpbmNoLmNlbnRlci55IC0gdGhpcy5faW5pdGlhbFBpbmNoLmNlbnRlci55XG5cdFx0fTtcblxuXHRcdGN1cnJlbnRQaW5jaC50aW1lID0gRGF0ZS5ub3coKTtcblx0XHR2YXIgdGltZVNpbmNlTGFzdFBpbmNoID0gY3VycmVudFBpbmNoLnRpbWUgLSB0aGlzLl9sYXN0UGluY2gudGltZTtcblxuXHRcdGN1cnJlbnRQaW5jaC5kaXNwbGFjZW1lbnRWZWxvY2l0eSA9IHtcblx0XHRcdHg6IChjdXJyZW50UGluY2guZGlzcGxhY2VtZW50LnggLSB0aGlzLl9sYXN0UGluY2guZGlzcGxhY2VtZW50LngpIC8gdGltZVNpbmNlTGFzdFBpbmNoLFxuXHRcdFx0eTogKGN1cnJlbnRQaW5jaC5kaXNwbGFjZW1lbnQueSAtIHRoaXMuX2xhc3RQaW5jaC5kaXNwbGFjZW1lbnQueSkgLyB0aW1lU2luY2VMYXN0UGluY2hcblx0XHR9O1xuXG5cdFx0Y3VycmVudFBpbmNoLnJvdGF0aW9uID0gY3VycmVudFBpbmNoLmFuZ2xlIC0gdGhpcy5faW5pdGlhbFBpbmNoLmFuZ2xlO1xuXHRcdGN1cnJlbnRQaW5jaC5yb3RhdGlvblZlbG9jaXR5ID0gY3VycmVudFBpbmNoLnJvdGF0aW9uIC0gdGhpcy5fbGFzdFBpbmNoLnJvdGF0aW9uIC8gdGltZVNpbmNlTGFzdFBpbmNoO1xuXG5cdFx0Y3VycmVudFBpbmNoLnpvb20gPSBjdXJyZW50UGluY2guZGlzdGFuY2UgLyB0aGlzLl9pbml0aWFsUGluY2guZGlzdGFuY2U7XG5cdFx0Y3VycmVudFBpbmNoLnpvb21WZWxvY2l0eSA9IChjdXJyZW50UGluY2guem9vbSAtIHRoaXMuX2xhc3RQaW5jaC56b29tKSAvIHRpbWVTaW5jZUxhc3RQaW5jaDtcblxuXHRcdHRoaXMucHJvcHMub25QaW5jaE1vdmUgJiYgdGhpcy5wcm9wcy5vblBpbmNoTW92ZShjdXJyZW50UGluY2gsIGV2ZW50KTtcblxuXHRcdHRoaXMuX2xhc3RQaW5jaCA9IGN1cnJlbnRQaW5jaDtcblx0fSxcblxuXHRvblBpbmNoRW5kOiBmdW5jdGlvbiBvblBpbmNoRW5kKGV2ZW50KSB7XG5cdFx0Ly8gVE9ETyB1c2UgaGVscGVyIHRvIG9yZGVyIHRvdWNoZXMgYnkgaWRlbnRpZmllciBhbmQgdXNlIGFjdHVhbCB2YWx1ZXMgb24gdG91Y2hFbmQuXG5cdFx0dmFyIGN1cnJlbnRQaW5jaCA9IF9leHRlbmRzKHt9LCB0aGlzLl9sYXN0UGluY2gpO1xuXHRcdGN1cnJlbnRQaW5jaC50aW1lID0gRGF0ZS5ub3coKTtcblxuXHRcdGlmIChjdXJyZW50UGluY2gudGltZSAtIHRoaXMuX2xhc3RQaW5jaC50aW1lID4gMTYpIHtcblx0XHRcdGN1cnJlbnRQaW5jaC5kaXNwbGFjZW1lbnRWZWxvY2l0eSA9IDA7XG5cdFx0XHRjdXJyZW50UGluY2gucm90YXRpb25WZWxvY2l0eSA9IDA7XG5cdFx0XHRjdXJyZW50UGluY2guem9vbVZlbG9jaXR5ID0gMDtcblx0XHR9XG5cblx0XHR0aGlzLnByb3BzLm9uUGluY2hFbmQgJiYgdGhpcy5wcm9wcy5vblBpbmNoRW5kKGN1cnJlbnRQaW5jaCwgZXZlbnQpO1xuXG5cdFx0dGhpcy5faW5pdGlhbFBpbmNoID0gdGhpcy5fbGFzdFBpbmNoID0gbnVsbDtcblxuXHRcdC8vIElmIG9uZSBmaW5nZXIgaXMgc3RpbGwgb24gc2NyZWVuLCBpdCBzaG91bGQgc3RhcnQgYSBuZXcgdG91Y2ggZXZlbnQgZm9yIHN3aXBpbmcgZXRjXG5cdFx0Ly8gQnV0IGl0IHNob3VsZCBuZXZlciBmaXJlIGFuIG9uVGFwIG9yIG9uUHJlc3MgZXZlbnQuXG5cdFx0Ly8gU2luY2UgdGhlcmUgaXMgbm8gc3VwcG9ydCBzd2lwZXMgeWV0LCB0aGlzIHNob3VsZCBiZSBkaXNyZWdhcmRlZCBmb3Igbm93XG5cdFx0Ly8gaWYgKGV2ZW50LnRvdWNoZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0Ly8gXHR0aGlzLm9uVG91Y2hTdGFydChldmVudCk7XG5cdFx0Ly8gfVxuXHR9LFxuXG5cdGluaXRTY3JvbGxEZXRlY3Rpb246IGZ1bmN0aW9uIGluaXRTY3JvbGxEZXRlY3Rpb24oKSB7XG5cdFx0dGhpcy5fc2Nyb2xsUG9zID0geyB0b3A6IDAsIGxlZnQ6IDAgfTtcblx0XHR0aGlzLl9zY3JvbGxQYXJlbnRzID0gW107XG5cdFx0dGhpcy5fc2Nyb2xsUGFyZW50UG9zID0gW107XG5cdFx0dmFyIG5vZGUgPSB0aGlzLmdldERPTU5vZGUoKTtcblx0XHR3aGlsZSAobm9kZSkge1xuXHRcdFx0aWYgKG5vZGUuc2Nyb2xsSGVpZ2h0ID4gbm9kZS5vZmZzZXRIZWlnaHQgfHwgbm9kZS5zY3JvbGxXaWR0aCA+IG5vZGUub2Zmc2V0V2lkdGgpIHtcblx0XHRcdFx0dGhpcy5fc2Nyb2xsUGFyZW50cy5wdXNoKG5vZGUpO1xuXHRcdFx0XHR0aGlzLl9zY3JvbGxQYXJlbnRQb3MucHVzaChub2RlLnNjcm9sbFRvcCArIG5vZGUuc2Nyb2xsTGVmdCk7XG5cdFx0XHRcdHRoaXMuX3Njcm9sbFBvcy50b3AgKz0gbm9kZS5zY3JvbGxUb3A7XG5cdFx0XHRcdHRoaXMuX3Njcm9sbFBvcy5sZWZ0ICs9IG5vZGUuc2Nyb2xsTGVmdDtcblx0XHRcdH1cblx0XHRcdG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG5cdFx0fVxuXHR9LFxuXG5cdGNhbGN1bGF0ZU1vdmVtZW50OiBmdW5jdGlvbiBjYWxjdWxhdGVNb3ZlbWVudCh0b3VjaCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR4OiBNYXRoLmFicyh0b3VjaC5jbGllbnRYIC0gdGhpcy5faW5pdGlhbFRvdWNoLmNsaWVudFgpLFxuXHRcdFx0eTogTWF0aC5hYnModG91Y2guY2xpZW50WSAtIHRoaXMuX2luaXRpYWxUb3VjaC5jbGllbnRZKVxuXHRcdH07XG5cdH0sXG5cblx0ZGV0ZWN0U2Nyb2xsOiBmdW5jdGlvbiBkZXRlY3RTY3JvbGwoKSB7XG5cdFx0dmFyIGN1cnJlbnRTY3JvbGxQb3MgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc2Nyb2xsUGFyZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0Y3VycmVudFNjcm9sbFBvcy50b3AgKz0gdGhpcy5fc2Nyb2xsUGFyZW50c1tpXS5zY3JvbGxUb3A7XG5cdFx0XHRjdXJyZW50U2Nyb2xsUG9zLmxlZnQgKz0gdGhpcy5fc2Nyb2xsUGFyZW50c1tpXS5zY3JvbGxMZWZ0O1xuXHRcdH1cblx0XHRyZXR1cm4gIShjdXJyZW50U2Nyb2xsUG9zLnRvcCA9PT0gdGhpcy5fc2Nyb2xsUG9zLnRvcCAmJiBjdXJyZW50U2Nyb2xsUG9zLmxlZnQgPT09IHRoaXMuX3Njcm9sbFBvcy5sZWZ0KTtcblx0fSxcblxuXHRjbGVhbnVwU2Nyb2xsRGV0ZWN0aW9uOiBmdW5jdGlvbiBjbGVhbnVwU2Nyb2xsRGV0ZWN0aW9uKCkge1xuXHRcdHRoaXMuX3Njcm9sbFBhcmVudHMgPSB1bmRlZmluZWQ7XG5cdFx0dGhpcy5fc2Nyb2xsUG9zID0gdW5kZWZpbmVkO1xuXHR9LFxuXG5cdGluaXRQcmVzc0RldGVjdGlvbjogZnVuY3Rpb24gaW5pdFByZXNzRGV0ZWN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuXHRcdGlmICghdGhpcy5wcm9wcy5vblByZXNzKSByZXR1cm47XG5cdFx0dGhpcy5fcHJlc3NUaW1lb3V0ID0gc2V0VGltZW91dCgoZnVuY3Rpb24gKCkge1xuXHRcdFx0dGhpcy5wcm9wcy5vblByZXNzKGV2ZW50KTtcblx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0fSkuYmluZCh0aGlzKSwgdGhpcy5wcm9wcy5wcmVzc0RlbGF5KTtcblx0fSxcblxuXHRjYW5jZWxQcmVzc0RldGVjdGlvbjogZnVuY3Rpb24gY2FuY2VsUHJlc3NEZXRlY3Rpb24oKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMuX3ByZXNzVGltZW91dCk7XG5cdH0sXG5cblx0b25Ub3VjaE1vdmU6IGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMuX2luaXRpYWxUb3VjaCkge1xuXHRcdFx0dGhpcy5wcm9jZXNzRXZlbnQoZXZlbnQpO1xuXG5cdFx0XHRpZiAodGhpcy5kZXRlY3RTY3JvbGwoKSkgcmV0dXJuIHRoaXMuZW5kVG91Y2goZXZlbnQpO1xuXG5cdFx0XHR0aGlzLnByb3BzLm9uVG91Y2hNb3ZlICYmIHRoaXMucHJvcHMub25Ub3VjaE1vdmUoZXZlbnQpO1xuXHRcdFx0dGhpcy5fbGFzdFRvdWNoID0gZ2V0VG91Y2hQcm9wcyhldmVudC50b3VjaGVzWzBdKTtcblx0XHRcdHZhciBtb3ZlbWVudCA9IHRoaXMuY2FsY3VsYXRlTW92ZW1lbnQodGhpcy5fbGFzdFRvdWNoKTtcblx0XHRcdGlmIChtb3ZlbWVudC54ID4gdGhpcy5wcm9wcy5wcmVzc01vdmVUaHJlc2hvbGQgfHwgbW92ZW1lbnQueSA+IHRoaXMucHJvcHMucHJlc3NNb3ZlVGhyZXNob2xkKSB7XG5cdFx0XHRcdHRoaXMuY2FuY2VsUHJlc3NEZXRlY3Rpb24oKTtcblx0XHRcdH1cblx0XHRcdGlmIChtb3ZlbWVudC54ID4gdGhpcy5wcm9wcy5tb3ZlVGhyZXNob2xkIHx8IG1vdmVtZW50LnkgPiB0aGlzLnByb3BzLm1vdmVUaHJlc2hvbGQpIHtcblx0XHRcdFx0aWYgKHRoaXMuc3RhdGUuaXNBY3RpdmUpIHtcblx0XHRcdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0XHRcdGlzQWN0aXZlOiBmYWxzZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMuX2FjdGl2ZVRpbWVvdXQpIHtcblx0XHRcdFx0XHR0aGlzLmNsZWFyQWN0aXZlVGltZW91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAoIXRoaXMuc3RhdGUuaXNBY3RpdmUgJiYgIXRoaXMuX2FjdGl2ZVRpbWVvdXQpIHtcblx0XHRcdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0XHRcdGlzQWN0aXZlOiB0cnVlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKHRoaXMuX2luaXRpYWxQaW5jaCAmJiBldmVudC50b3VjaGVzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0dGhpcy5vblBpbmNoTW92ZShldmVudCk7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblx0fSxcblxuXHRvblRvdWNoRW5kOiBmdW5jdGlvbiBvblRvdWNoRW5kKGV2ZW50KSB7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdGlmICh0aGlzLl9pbml0aWFsVG91Y2gpIHtcblx0XHRcdHRoaXMucHJvY2Vzc0V2ZW50KGV2ZW50KTtcblx0XHRcdHZhciBhZnRlckVuZFRvdWNoO1xuXHRcdFx0dmFyIG1vdmVtZW50ID0gdGhpcy5jYWxjdWxhdGVNb3ZlbWVudCh0aGlzLl9sYXN0VG91Y2gpO1xuXHRcdFx0aWYgKG1vdmVtZW50LnggPD0gdGhpcy5wcm9wcy5tb3ZlVGhyZXNob2xkICYmIG1vdmVtZW50LnkgPD0gdGhpcy5wcm9wcy5tb3ZlVGhyZXNob2xkICYmIHRoaXMucHJvcHMub25UYXApIHtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0YWZ0ZXJFbmRUb3VjaCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR2YXIgZmluYWxQYXJlbnRTY3JvbGxQb3MgPSBfdGhpcy5fc2Nyb2xsUGFyZW50cy5tYXAoZnVuY3Rpb24gKG5vZGUpIHtcblx0XHRcdFx0XHRcdHJldHVybiBub2RlLnNjcm9sbFRvcCArIG5vZGUuc2Nyb2xsTGVmdDtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR2YXIgc3RvcHBlZE1vbWVudHVtU2Nyb2xsID0gX3RoaXMuX3Njcm9sbFBhcmVudFBvcy5zb21lKGZ1bmN0aW9uIChlbmQsIGkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBlbmQgIT09IGZpbmFsUGFyZW50U2Nyb2xsUG9zW2ldO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGlmICghc3RvcHBlZE1vbWVudHVtU2Nyb2xsKSB7XG5cdFx0XHRcdFx0XHRfdGhpcy5wcm9wcy5vblRhcChldmVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5lbmRUb3VjaChldmVudCwgYWZ0ZXJFbmRUb3VjaCk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLl9pbml0aWFsUGluY2ggJiYgZXZlbnQudG91Y2hlcy5sZW5ndGggKyBldmVudC5jaGFuZ2VkVG91Y2hlcy5sZW5ndGggPT09IDIpIHtcblx0XHRcdHRoaXMub25QaW5jaEVuZChldmVudCk7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblx0fSxcblxuXHRlbmRUb3VjaDogZnVuY3Rpb24gZW5kVG91Y2goZXZlbnQsIGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5jYW5jZWxQcmVzc0RldGVjdGlvbigpO1xuXHRcdHRoaXMuY2xlYXJBY3RpdmVUaW1lb3V0KCk7XG5cdFx0aWYgKGV2ZW50ICYmIHRoaXMucHJvcHMub25Ub3VjaEVuZCkge1xuXHRcdFx0dGhpcy5wcm9wcy5vblRvdWNoRW5kKGV2ZW50KTtcblx0XHR9XG5cdFx0dGhpcy5faW5pdGlhbFRvdWNoID0gbnVsbDtcblx0XHR0aGlzLl9sYXN0VG91Y2ggPSBudWxsO1xuXHRcdGlmICh0aGlzLnN0YXRlLmlzQWN0aXZlKSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0aXNBY3RpdmU6IGZhbHNlXG5cdFx0XHR9LCBjYWxsYmFjayk7XG5cdFx0fSBlbHNlIGlmIChjYWxsYmFjaykge1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHR9XG5cdH0sXG5cblx0b25Nb3VzZURvd246IGZ1bmN0aW9uIG9uTW91c2VEb3duKGV2ZW50KSB7XG5cdFx0aWYgKHdpbmRvdy5fYmxvY2tNb3VzZUV2ZW50cykge1xuXHRcdFx0d2luZG93Ll9ibG9ja01vdXNlRXZlbnRzID0gZmFsc2U7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICh0aGlzLnByb3BzLm9uTW91c2VEb3duICYmIHRoaXMucHJvcHMub25Nb3VzZURvd24oZXZlbnQpID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdHRoaXMucHJvY2Vzc0V2ZW50KGV2ZW50KTtcblx0XHR0aGlzLmluaXRQcmVzc0RldGVjdGlvbihldmVudCwgdGhpcy5lbmRNb3VzZUV2ZW50KTtcblx0XHR0aGlzLl9tb3VzZURvd24gPSB0cnVlO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNBY3RpdmU6IHRydWVcblx0XHR9KTtcblx0fSxcblxuXHRvbk1vdXNlTW92ZTogZnVuY3Rpb24gb25Nb3VzZU1vdmUoZXZlbnQpIHtcblx0XHRpZiAod2luZG93Ll9ibG9ja01vdXNlRXZlbnRzIHx8ICF0aGlzLl9tb3VzZURvd24pIHJldHVybjtcblx0XHR0aGlzLnByb2Nlc3NFdmVudChldmVudCk7XG5cdFx0dGhpcy5wcm9wcy5vbk1vdXNlTW92ZSAmJiB0aGlzLnByb3BzLm9uTW91c2VNb3ZlKGV2ZW50KTtcblx0fSxcblxuXHRvbk1vdXNlVXA6IGZ1bmN0aW9uIG9uTW91c2VVcChldmVudCkge1xuXHRcdGlmICh3aW5kb3cuX2Jsb2NrTW91c2VFdmVudHMgfHwgIXRoaXMuX21vdXNlRG93bikgcmV0dXJuO1xuXHRcdHRoaXMucHJvY2Vzc0V2ZW50KGV2ZW50KTtcblx0XHR0aGlzLnByb3BzLm9uTW91c2VVcCAmJiB0aGlzLnByb3BzLm9uTW91c2VVcChldmVudCk7XG5cdFx0dGhpcy5wcm9wcy5vblRhcCAmJiB0aGlzLnByb3BzLm9uVGFwKGV2ZW50KTtcblx0XHR0aGlzLmVuZE1vdXNlRXZlbnQoKTtcblx0fSxcblxuXHRvbk1vdXNlT3V0OiBmdW5jdGlvbiBvbk1vdXNlT3V0KGV2ZW50KSB7XG5cdFx0aWYgKHdpbmRvdy5fYmxvY2tNb3VzZUV2ZW50cyB8fCAhdGhpcy5fbW91c2VEb3duKSByZXR1cm47XG5cdFx0dGhpcy5wcm9jZXNzRXZlbnQoZXZlbnQpO1xuXHRcdHRoaXMucHJvcHMub25Nb3VzZU91dCAmJiB0aGlzLnByb3BzLm9uTW91c2VPdXQoZXZlbnQpO1xuXHRcdHRoaXMuZW5kTW91c2VFdmVudCgpO1xuXHR9LFxuXG5cdGVuZE1vdXNlRXZlbnQ6IGZ1bmN0aW9uIGVuZE1vdXNlRXZlbnQoKSB7XG5cdFx0dGhpcy5jYW5jZWxQcmVzc0RldGVjdGlvbigpO1xuXHRcdHRoaXMuX21vdXNlRG93biA9IGZhbHNlO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNBY3RpdmU6IGZhbHNlXG5cdFx0fSk7XG5cdH0sXG5cblx0dG91Y2hTdHlsZXM6IGZ1bmN0aW9uIHRvdWNoU3R5bGVzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRXZWJraXRUYXBIaWdobGlnaHRDb2xvcjogJ3JnYmEoMCwwLDAsMCknLFxuXHRcdFx0V2Via2l0VG91Y2hDYWxsb3V0OiAnbm9uZScsXG5cdFx0XHRXZWJraXRVc2VyU2VsZWN0OiAnbm9uZScsXG5cdFx0XHRLaHRtbFVzZXJTZWxlY3Q6ICdub25lJyxcblx0XHRcdE1velVzZXJTZWxlY3Q6ICdub25lJyxcblx0XHRcdG1zVXNlclNlbGVjdDogJ25vbmUnLFxuXHRcdFx0dXNlclNlbGVjdDogJ25vbmUnLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9O1xuXHR9LFxuXG5cdGhhbmRsZXJzOiBmdW5jdGlvbiBoYW5kbGVycygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0b25Ub3VjaFN0YXJ0OiB0aGlzLm9uVG91Y2hTdGFydCxcblx0XHRcdG9uVG91Y2hNb3ZlOiB0aGlzLm9uVG91Y2hNb3ZlLFxuXHRcdFx0b25Ub3VjaEVuZDogdGhpcy5vblRvdWNoRW5kLFxuXHRcdFx0b25Nb3VzZURvd246IHRoaXMub25Nb3VzZURvd24sXG5cdFx0XHRvbk1vdXNlVXA6IHRoaXMub25Nb3VzZVVwLFxuXHRcdFx0b25Nb3VzZU1vdmU6IHRoaXMub25Nb3VzZU1vdmUsXG5cdFx0XHRvbk1vdXNlT3V0OiB0aGlzLm9uTW91c2VPdXRcblx0XHR9O1xuXHR9XG59O1xuXG4vKipcbiAqIFRhcHBhYmxlIENvbXBvbmVudFxuICogPT09PT09PT09PT09PT09PT09XG4gKi9cblxudmFyIENvbXBvbmVudCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblxuXHRkaXNwbGF5TmFtZTogJ1RhcHBhYmxlJyxcblxuXHRtaXhpbnM6IFtNaXhpbl0sXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y29tcG9uZW50OiBSZWFjdC5Qcm9wVHlwZXMuYW55LCAvLyBjb21wb25lbnQgdG8gY3JlYXRlXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAvLyBvcHRpb25hbCBjbGFzc05hbWVcblx0XHRjbGFzc0Jhc2U6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsIC8vIGJhc2UgZm9yIGdlbmVyYXRlZCBjbGFzc05hbWVzXG5cdFx0c3R5bGU6IFJlYWN0LlByb3BUeXBlcy5vYmplY3QsIC8vIGFkZGl0aW9uYWwgc3R5bGUgcHJvcGVydGllcyBmb3IgdGhlIGNvbXBvbmVudFxuXHRcdGRpc2FibGVkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCAvLyBvbmx5IGFwcGxpZXMgdG8gYnV0dG9uc1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjb21wb25lbnQ6ICdzcGFuJyxcblx0XHRcdGNsYXNzQmFzZTogJ1RhcHBhYmxlJ1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIHByb3BzID0gdGhpcy5wcm9wcztcblx0XHR2YXIgY2xhc3NOYW1lID0gcHJvcHMuY2xhc3NCYXNlICsgKHRoaXMuc3RhdGUuaXNBY3RpdmUgPyAnLWFjdGl2ZScgOiAnLWluYWN0aXZlJyk7XG5cblx0XHRpZiAocHJvcHMuY2xhc3NOYW1lKSB7XG5cdFx0XHRjbGFzc05hbWUgKz0gJyAnICsgcHJvcHMuY2xhc3NOYW1lO1xuXHRcdH1cblxuXHRcdHZhciBzdHlsZSA9IHt9O1xuXHRcdF9leHRlbmRzKHN0eWxlLCB0aGlzLnRvdWNoU3R5bGVzKCksIHByb3BzLnN0eWxlKTtcblxuXHRcdHZhciBuZXdDb21wb25lbnRQcm9wcyA9IF9leHRlbmRzKHt9LCBwcm9wcywge1xuXHRcdFx0c3R5bGU6IHN0eWxlLFxuXHRcdFx0Y2xhc3NOYW1lOiBjbGFzc05hbWUsXG5cdFx0XHRkaXNhYmxlZDogcHJvcHMuZGlzYWJsZWQsXG5cdFx0XHRoYW5kbGVyczogdGhpcy5oYW5kbGVyc1xuXHRcdH0sIHRoaXMuaGFuZGxlcnMoKSk7XG5cblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMub25UYXA7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLm9uUHJlc3M7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLm9uUGluY2hTdGFydDtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMub25QaW5jaE1vdmU7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLm9uUGluY2hFbmQ7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLm1vdmVUaHJlc2hvbGQ7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLnByZXNzRGVsYXk7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLnByZXNzTW92ZVRocmVzaG9sZDtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMucHJldmVudERlZmF1bHQ7XG5cdFx0ZGVsZXRlIG5ld0NvbXBvbmVudFByb3BzLnN0b3BQcm9wYWdhdGlvbjtcblx0XHRkZWxldGUgbmV3Q29tcG9uZW50UHJvcHMuY29tcG9uZW50O1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQocHJvcHMuY29tcG9uZW50LCBuZXdDb21wb25lbnRQcm9wcywgcHJvcHMuY2hpbGRyZW4pO1xuXHR9XG59KTtcblxuQ29tcG9uZW50Lk1peGluID0gTWl4aW47XG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIFRpbWVycyAoKSB7XG4gIHZhciBpbnRlcnZhbHMgPSBbXVxuICB2YXIgdGltZW91dHMgPSBbXVxuXG4gIHJldHVybiB7XG4gICAgY2xlYXJJbnRlcnZhbHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGludGVydmFscy5mb3JFYWNoKGNsZWFySW50ZXJ2YWwpXG4gICAgfSxcblxuICAgIGNsZWFyVGltZW91dHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRpbWVvdXRzLmZvckVhY2goY2xlYXJUaW1lb3V0KVxuICAgIH0sXG5cbiAgICBjbGVhclRpbWVyczogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5jbGVhckludGVydmFsKClcbiAgICAgIHRoaXMuY2xlYXJUaW1lb3V0cygpXG4gICAgfSxcblxuICAgIGNvbXBvbmVudFdpbGxNb3VudDogZnVuY3Rpb24gKCkge1xuICAgICAgaW50ZXJ2YWxzID0gW11cbiAgICAgIHRpbWVvdXRzID0gW11cbiAgICB9LFxuXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuY2xlYXJJbnRlcnZhbHMoKVxuICAgICAgdGhpcy5jbGVhclRpbWVvdXRzKClcbiAgICB9LFxuXG4gICAgY291bnREb3duOiBmdW5jdGlvbiAoY2FsbGJhY2ssIHRpbWVvdXQsIGludGVydmFsKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgIHZhciBzbGVlcCA9IE1hdGgubWluKHRpbWVvdXQsIGludGVydmFsKVxuXG4gICAgICB0aGlzLnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmVtYWluaW5nID0gdGltZW91dCAtIHNsZWVwXG5cbiAgICAgICAgY2FsbGJhY2socmVtYWluaW5nKVxuICAgICAgICBpZiAocmVtYWluaW5nIDw9IDApIHJldHVyblxuXG4gICAgICAgIHNlbGYuY291bnREb3duKGNhbGxiYWNrLCByZW1haW5pbmcsIGludGVydmFsKVxuICAgICAgfSwgc2xlZXApXG4gICAgfSxcblxuICAgIHNldEludGVydmFsOiBmdW5jdGlvbiAoY2FsbGJhY2ssIGludGVydmFsKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgaW50ZXJ2YWxzLnB1c2goc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXNlbGYuaXNNb3VudGVkKCkpIHJldHVyblxuXG4gICAgICAgIGNhbGxiYWNrLmNhbGwoc2VsZilcbiAgICAgIH0sIGludGVydmFsKSlcbiAgICB9LFxuXG4gICAgc2V0VGltZW91dDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aW1lb3V0KSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgdGltZW91dHMucHVzaChzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFzZWxmLmlzTW91bnRlZCgpKSByZXR1cm5cblxuICAgICAgICBjYWxsYmFjay5jYWxsKHNlbGYpXG4gICAgICB9LCB0aW1lb3V0KSlcbiAgICB9XG4gIH1cbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7XG5cdHZhbHVlOiB0cnVlXG59KTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgQ29udGFpbmVyID0gcmVxdWlyZSgncmVhY3QtY29udGFpbmVyJyk7XG5cbnZhciBFcnJvclZpZXcgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnRXJyb3JWaWV3JyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogUmVhY3QuUHJvcFR5cGVzLm5vZGVcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdENvbnRhaW5lcixcblx0XHRcdHsgZmlsbDogdHJ1ZSwgY2xhc3NOYW1lOiAnVmlldyBFcnJvclZpZXcnIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxufSk7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IEVycm9yVmlldztcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywge1xuXHR2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xudmFyIFRyYW5zaXRpb25zID0gcmVxdWlyZSgnLi4vbWl4aW5zL1RyYW5zaXRpb25zJyk7XG5cbnZhciBMaW5rID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0xpbmsnLFxuXG5cdG1peGluczogW1RyYW5zaXRpb25zXSxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5hbnksXG5cdFx0b3B0aW9uczogUmVhY3QuUHJvcFR5cGVzLm9iamVjdCxcblx0XHR0cmFuc2l0aW9uOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHRvOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHZpZXdQcm9wczogUmVhY3QuUHJvcFR5cGVzLmFueVxuXHR9LFxuXG5cdGRvVHJhbnNpdGlvbjogZnVuY3Rpb24gZG9UcmFuc2l0aW9uKCkge1xuXHRcdHZhciBvcHRpb25zID0gX2V4dGVuZHMoeyB2aWV3UHJvcHM6IHRoaXMucHJvcHMudmlld1Byb3BzLCB0cmFuc2l0aW9uOiB0aGlzLnByb3BzLnRyYW5zaXRpb24gfSwgdGhpcy5wcm9wcy5vcHRpb25zKTtcblx0XHRjb25zb2xlLmluZm8oJ0xpbmsgdG8gXCInICsgdGhpcy5wcm9wcy50byArICdcIiB1c2luZyB0cmFuc2l0aW9uIFwiJyArIHRoaXMucHJvcHMudHJhbnNpdGlvbiArICdcIicgKyAnIHdpdGggcHJvcHMgJywgdGhpcy5wcm9wcy52aWV3UHJvcHMpO1xuXHRcdHRoaXMudHJhbnNpdGlvblRvKHRoaXMucHJvcHMudG8sIG9wdGlvbnMpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciB0YXBwYWJsZVByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICdjaGlsZHJlbicsICdvcHRpb25zJywgJ3RyYW5zaXRpb24nLCAndmlld1Byb3BzJyk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFRhcHBhYmxlLFxuXHRcdFx0X2V4dGVuZHMoeyBvblRhcDogdGhpcy5kb1RyYW5zaXRpb24gfSwgdGFwcGFibGVQcm9wcyksXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxufSk7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IExpbms7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHtcblx0dmFsdWU6IHRydWVcbn0pO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIFZpZXcgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnVmlldycsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y29tcG9uZW50OiBSZWFjdC5Qcm9wVHlwZXMuZnVuYy5pc1JlcXVpcmVkLFxuXHRcdG5hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcuaXNSZXF1aXJlZFxuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ1RvdWNoc3RvbmVKUyA8Vmlldz4gc2hvdWxkIG5vdCBiZSByZW5kZXJlZCBkaXJlY3RseS4nKTtcblx0fVxufSk7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IFZpZXc7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHtcblx0dmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG52YXIgY2xhc3NOYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcbnZhciBFcnJvclZpZXcgPSByZXF1aXJlKCcuL0Vycm9yVmlldycpO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG52YXIgVHJhbnNpdGlvbiA9IFJlYWN0LmFkZG9ucy5DU1NUcmFuc2l0aW9uR3JvdXA7XG5cbmZ1bmN0aW9uIGNyZWF0ZVZpZXdzRnJvbUNoaWxkcmVuKGNoaWxkcmVuKSB7XG5cdHZhciB2aWV3cyA9IHt9O1xuXHRSZWFjdC5DaGlsZHJlbi5mb3JFYWNoKGNoaWxkcmVuLCBmdW5jdGlvbiAodmlldykge1xuXHRcdHZpZXdzW3ZpZXcucHJvcHMubmFtZV0gPSB2aWV3O1xuXHR9KTtcblx0cmV0dXJuIHZpZXdzO1xufVxuXG52YXIgVmlld0NvbnRhaW5lciA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdWaWV3Q29udGFpbmVyJyxcblxuXHRzdGF0aWNzOiB7XG5cdFx0c2hvdWxkRmlsbFZlcnRpY2FsU3BhY2U6IHRydWVcblx0fSxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlXG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBwcm9wcyA9IGJsYWNrbGlzdCh0aGlzLnByb3BzLCAnY2hpbGRyZW4nKTtcblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0cHJvcHMsXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxufSk7XG5cbnZhciBWaWV3TWFuYWdlciA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdWaWV3TWFuYWdlcicsXG5cblx0c3RhdGljczoge1xuXHRcdHNob3VsZEZpbGxWZXJ0aWNhbFNwYWNlOiB0cnVlXG5cdH0sXG5cdGNvbnRleHRUeXBlczoge1xuXHRcdGFwcDogUmVhY3QuUHJvcFR5cGVzLm9iamVjdC5pc1JlcXVpcmVkXG5cdH0sXG5cdHByb3BUeXBlczoge1xuXHRcdG5hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRkZWZhdWx0VmlldzogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRvblZpZXdDaGFuZ2U6IFJlYWN0LlByb3BUeXBlcy5mdW5jXG5cdH0sXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRuYW1lOiAnX19kZWZhdWx0J1xuXHRcdH07XG5cdH0sXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR2aWV3czogY3JlYXRlVmlld3NGcm9tQ2hpbGRyZW4odGhpcy5wcm9wcy5jaGlsZHJlbiksXG5cdFx0XHRjdXJyZW50VmlldzogdGhpcy5wcm9wcy5kZWZhdWx0Vmlldyxcblx0XHRcdG9wdGlvbnM6IHt9XG5cdFx0fTtcblx0fSxcblx0Y29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMuY29udGV4dC5hcHAudmlld01hbmFnZXJzW3RoaXMucHJvcHMubmFtZV0gPSB0aGlzO1xuXHR9LFxuXHRjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0ZGVsZXRlIHRoaXMuY29udGV4dC5hcHAudmlld01hbmFnZXJzW3RoaXMucHJvcHMubmFtZV07XG5cdH0sXG5cdGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMobmV4dFByb3BzKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHR2aWV3czogY3JlYXRlVmlld3NGcm9tQ2hpbGRyZW4odGhpcy5wcm9wcy5jaGlsZHJlbilcblx0XHR9KTtcblx0XHRpZiAobmV4dFByb3BzLm5hbWUgIT09IHRoaXMucHJvcHMubmFtZSkge1xuXHRcdFx0dGhpcy5jb250ZXh0LmFwcC52aWV3TWFuYWdlcnNbbmV4dFByb3BzLm5hbWVdID0gdGhpcztcblx0XHRcdGRlbGV0ZSB0aGlzLmNvbnRleHQuYXBwLnZpZXdNYW5hZ2Vyc1t0aGlzLnByb3BzLm5hbWVdO1xuXHRcdH1cblx0XHRpZiAobmV4dFByb3BzLmN1cnJlbnRWaWV3ICYmIG5leHRQcm9wcy5jdXJyZW50VmlldyAhPT0gdGhpcy5zdGF0ZS5jdXJyZW50Vmlldykge1xuXHRcdFx0dGhpcy50cmFuc2l0aW9uVG8obmV4dFByb3BzLmN1cnJlbnRWaWV3LCB7IHZpZXdQcm9wczogbmV4dFByb3BzLnZpZXdQcm9wcyB9KTtcblx0XHR9XG5cdH0sXG5cdHRyYW5zaXRpb25UbzogZnVuY3Rpb24gdHJhbnNpdGlvblRvKHZpZXdLZXksIG9wdGlvbnMpIHtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0aWYgKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJykge1xuXHRcdFx0b3B0aW9ucyA9IHsgdHJhbnNpdGlvbjogb3B0aW9ucyB9O1xuXHRcdH1cblx0XHRpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcblx0XHR0aGlzLmFjdGl2ZVRyYW5zaXRpb25PcHRpb25zID0gb3B0aW9ucztcblx0XHR0aGlzLmNvbnRleHQuYXBwLnZpZXdNYW5hZ2VySW5UcmFuc2l0aW9uID0gdGhpcztcblx0XHR0aGlzLnByb3BzLm9uVmlld0NoYW5nZSAmJiB0aGlzLnByb3BzLm9uVmlld0NoYW5nZSh2aWV3S2V5KTtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGN1cnJlbnRWaWV3OiB2aWV3S2V5LFxuXHRcdFx0b3B0aW9uczogb3B0aW9uc1xuXHRcdH0sIGZ1bmN0aW9uICgpIHtcblx0XHRcdGRlbGV0ZSBfdGhpcy5hY3RpdmVUcmFuc2l0aW9uT3B0aW9ucztcblx0XHRcdGRlbGV0ZSBfdGhpcy5jb250ZXh0LmFwcC52aWV3TWFuYWdlckluVHJhbnNpdGlvbjtcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyVmlld0NvbnRhaW5lcjogZnVuY3Rpb24gcmVuZGVyVmlld0NvbnRhaW5lcigpIHtcblx0XHR2YXIgdmlld0tleSA9IHRoaXMuc3RhdGUuY3VycmVudFZpZXc7XG5cdFx0aWYgKCF2aWV3S2V5KSB7XG5cdFx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0RXJyb3JWaWV3LFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdCdzcGFuJyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ0Vycm9yVmlld19faGVhZGluZycgfSxcblx0XHRcdFx0XHQnVmlld01hbmFnZXI6ICcsXG5cdFx0XHRcdFx0dGhpcy5wcm9wcy5uYW1lXG5cdFx0XHRcdCksXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J3NwYW4nLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnRXJyb3JWaWV3X190ZXh0JyB9LFxuXHRcdFx0XHRcdCdFcnJvcjogVGhlcmUgaXMgbm8gY3VycmVudCBWaWV3Lidcblx0XHRcdFx0KVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0dmFyIHZpZXcgPSB0aGlzLnN0YXRlLnZpZXdzW3ZpZXdLZXldO1xuXHRcdGlmICghdmlldyB8fCAhdmlldy5wcm9wcy5jb21wb25lbnQpIHtcblx0XHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRFcnJvclZpZXcsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J3NwYW4nLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnRXJyb3JWaWV3X19oZWFkaW5nJyB9LFxuXHRcdFx0XHRcdCdWaWV3TWFuYWdlcjogXCInLFxuXHRcdFx0XHRcdHRoaXMucHJvcHMubmFtZSxcblx0XHRcdFx0XHQnXCInXG5cdFx0XHRcdCksXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J3NwYW4nLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnRXJyb3JWaWV3X190ZXh0JyB9LFxuXHRcdFx0XHRcdCdUaGUgVmlldyBcIicsXG5cdFx0XHRcdFx0dmlld0tleSxcblx0XHRcdFx0XHQnXCIgaXMgaW52YWxpZC4nXG5cdFx0XHRcdClcblx0XHRcdCk7XG5cdFx0fVxuXHRcdHZhciBvcHRpb25zID0gdGhpcy5zdGF0ZS5vcHRpb25zIHx8IHt9O1xuXHRcdHZhciB2aWV3Q2xhc3NOYW1lID0gY2xhc3NOYW1lcygnVmlldyBWaWV3LS0nICsgdmlld0tleSwgdmlldy5wcm9wcy5jbGFzc05hbWUpO1xuXHRcdHZhciBWaWV3Q29tcG9uZW50ID0gdmlldy5wcm9wcy5jb21wb25lbnQ7XG5cdFx0dmFyIHZpZXdQcm9wcyA9IGJsYWNrbGlzdCh2aWV3LnByb3BzLCAnY29tcG9uZW50JywgJ2NsYXNzTmFtZScpO1xuXHRcdF9leHRlbmRzKHZpZXdQcm9wcywgb3B0aW9ucy52aWV3UHJvcHMpO1xuXHRcdHZhciB2aWV3RWxlbWVudCA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQoVmlld0NvbXBvbmVudCwgdmlld1Byb3BzKTtcblxuXHRcdGlmICh0aGlzLl9fbGFzdFJlbmRlcmVkVmlldyAhPT0gdmlld0tleSkge1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ2luaXRpYWxpc2luZyB2aWV3ICcgKyB2aWV3S2V5ICsgJyB3aXRoIG9wdGlvbnMnLCBvcHRpb25zKTtcblx0XHRcdGlmICh2aWV3RWxlbWVudC50eXBlLm5hdmlnYXRpb25CYXIgJiYgdmlld0VsZW1lbnQudHlwZS5nZXROYXZpZ2F0aW9uKSB7XG5cdFx0XHRcdHZhciBhcHAgPSB0aGlzLmNvbnRleHQuYXBwO1xuXHRcdFx0XHR2YXIgdHJhbnNpdGlvbiA9IG9wdGlvbnMudHJhbnNpdGlvbjtcblx0XHRcdFx0aWYgKGFwcC52aWV3TWFuYWdlckluVHJhbnNpdGlvbikge1xuXHRcdFx0XHRcdHRyYW5zaXRpb24gPSBhcHAudmlld01hbmFnZXJJblRyYW5zaXRpb24uYWN0aXZlVHJhbnNpdGlvbk9wdGlvbnMudHJhbnNpdGlvbjtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRhcHAubmF2aWdhdGlvbkJhcnNbdmlld0VsZW1lbnQudHlwZS5uYXZpZ2F0aW9uQmFyXS51cGRhdGVXaXRoVHJhbnNpdGlvbih2aWV3RWxlbWVudC50eXBlLmdldE5hdmlnYXRpb24odmlld1Byb3BzLCBhcHApLCB0cmFuc2l0aW9uKTtcblx0XHRcdFx0fSwgMCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9fbGFzdFJlbmRlcmVkVmlldyA9IHZpZXdLZXk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRWaWV3Q29udGFpbmVyLFxuXHRcdFx0eyBjbGFzc05hbWU6IHZpZXdDbGFzc05hbWUsIGtleTogdmlld0tleSB9LFxuXHRcdFx0dmlld0VsZW1lbnRcblx0XHQpO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NOYW1lcygnVmlld01hbmFnZXInLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHZpZXdDb250YWluZXIgPSB0aGlzLnJlbmRlclZpZXdDb250YWluZXIodGhpcy5zdGF0ZS5jdXJyZW50VmlldywgeyB2aWV3UHJvcHM6IHRoaXMuc3RhdGUuY3VycmVudFZpZXdQcm9wcyB9KTtcblxuXHRcdHZhciB0cmFuc2l0aW9uTmFtZSA9ICd2aWV3LXRyYW5zaXRpb24taW5zdGFudCc7XG5cdFx0aWYgKHRoaXMuc3RhdGUub3B0aW9ucy50cmFuc2l0aW9uKSB7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygnYXBwbHlpbmcgdmlldyB0cmFuc2l0aW9uOiAnICsgdGhpcy5zdGF0ZS5vcHRpb25zLnRyYW5zaXRpb24gKyAnIHRvIHZpZXcgJyArIHRoaXMuc3RhdGUuY3VycmVudFZpZXcpO1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAndmlldy10cmFuc2l0aW9uLScgKyB0aGlzLnN0YXRlLm9wdGlvbnMudHJhbnNpdGlvbjtcblx0XHR9XG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRUcmFuc2l0aW9uLFxuXHRcdFx0eyB0cmFuc2l0aW9uTmFtZTogdHJhbnNpdGlvbk5hbWUsIHRyYW5zaXRpb25FbnRlcjogdHJ1ZSwgdHJhbnNpdGlvbkxlYXZlOiB0cnVlLCBjbGFzc05hbWU6IGNsYXNzTmFtZSwgY29tcG9uZW50OiAnZGl2JyB9LFxuXHRcdFx0dmlld0NvbnRhaW5lclxuXHRcdCk7XG5cdH1cbn0pO1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBWaWV3TWFuYWdlcjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFuaW1hdGlvbiA9IHJlcXVpcmUoJ3R3ZWVuLmpzJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG5mdW5jdGlvbiB1cGRhdGUoKSB7XG5cdGFuaW1hdGlvbi51cGRhdGUoKTtcblx0aWYgKGFuaW1hdGlvbi5nZXRBbGwoKS5sZW5ndGgpIHtcblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc2Nyb2xsVG9Ub3AoZWwsIG9wdGlvbnMpIHtcblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdHZhciBmcm9tID0gZWwuc2Nyb2xsVG9wO1xuXHR2YXIgZHVyYXRpb24gPSBNYXRoLm1pbihNYXRoLm1heCgyMDAsIGZyb20gLyAyKSwgMzUwKTtcblx0aWYgKGZyb20gPiAyMDApIGR1cmF0aW9uID0gMzAwO1xuXHRlbC5zdHlsZS53ZWJraXRPdmVyZmxvd1Njcm9sbGluZyA9ICdhdXRvJztcblx0ZWwuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcblx0dmFyIHR3ZWVuID0gbmV3IGFuaW1hdGlvbi5Ud2Vlbih7IHBvczogZnJvbSB9KS50byh7IHBvczogMCB9LCBkdXJhdGlvbikuZWFzaW5nKGFuaW1hdGlvbi5FYXNpbmcuUXVhZHJhdGljLk91dCkub25VcGRhdGUoZnVuY3Rpb24gKCkge1xuXHRcdGVsLnNjcm9sbFRvcCA9IHRoaXMucG9zO1xuXHRcdGlmIChvcHRpb25zLm9uVXBkYXRlKSB7XG5cdFx0XHRvcHRpb25zLm9uVXBkYXRlKCk7XG5cdFx0fVxuXHR9KS5vbkNvbXBsZXRlKGZ1bmN0aW9uICgpIHtcblx0XHRlbC5zdHlsZS53ZWJraXRPdmVyZmxvd1Njcm9sbGluZyA9ICd0b3VjaCc7XG5cdFx0ZWwuc3R5bGUub3ZlcmZsb3cgPSAnc2Nyb2xsJztcblx0XHRpZiAob3B0aW9ucy5vbkNvbXBsZXRlKSBvcHRpb25zLm9uQ29tcGxldGUoKTtcblx0fSkuc3RhcnQoKTtcblx0dXBkYXRlKCk7XG5cdHJldHVybiB0d2Vlbjtcbn1cblxuZXhwb3J0cy5zY3JvbGxUb1RvcCA9IHNjcm9sbFRvVG9wO1xuXG52YXIgTWl4aW5zID0gZXhwb3J0cy5NaXhpbnMgPSB7fTtcblxuTWl4aW5zLlNjcm9sbENvbnRhaW5lclRvVG9wID0ge1xuXHRjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3N0YXR1c1RhcCcsIHRoaXMuc2Nyb2xsQ29udGFpbmVyVG9Ub3ApO1xuXHR9LFxuXHRjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3N0YXR1c1RhcCcsIHRoaXMuc2Nyb2xsQ29udGFpbmVyVG9Ub3ApO1xuXHRcdGlmICh0aGlzLl9zY3JvbGxDb250YWluZXJBbmltYXRpb24pIHtcblx0XHRcdHRoaXMuX3Njcm9sbENvbnRhaW5lckFuaW1hdGlvbi5zdG9wKCk7XG5cdFx0fVxuXHR9LFxuXHRzY3JvbGxDb250YWluZXJUb1RvcDogZnVuY3Rpb24gc2Nyb2xsQ29udGFpbmVyVG9Ub3AoKSB7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdGlmICghdGhpcy5pc01vdW50ZWQoKSB8fCAhdGhpcy5yZWZzLnNjcm9sbENvbnRhaW5lcikgcmV0dXJuO1xuXHRcdHRoaXMuX3Njcm9sbENvbnRhaW5lckFuaW1hdGlvbiA9IHNjcm9sbFRvVG9wKFJlYWN0LmZpbmRET01Ob2RlKHRoaXMucmVmcy5zY3JvbGxDb250YWluZXIpLCB7XG5cdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbiBvbkNvbXBsZXRlKCkge1xuXHRcdFx0XHRkZWxldGUgX3RoaXMuX3Njcm9sbENvbnRhaW5lckFuaW1hdGlvbjtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHtcblx0dmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGVBcHAgPSBjcmVhdGVBcHA7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgYW5pbWF0aW9uID0gcmVxdWlyZSgnLi9jb3JlL2FuaW1hdGlvbicpO1xuZXhwb3J0cy5hbmltYXRpb24gPSBhbmltYXRpb247XG52YXIgTGluayA9IHJlcXVpcmUoJy4vY29yZS9MaW5rJyk7XG5leHBvcnRzLkxpbmsgPSBMaW5rO1xudmFyIFZpZXcgPSByZXF1aXJlKCcuL2NvcmUvVmlldycpO1xuZXhwb3J0cy5WaWV3ID0gVmlldztcbnZhciBWaWV3TWFuYWdlciA9IHJlcXVpcmUoJy4vY29yZS9WaWV3TWFuYWdlcicpO1xuXG5leHBvcnRzLlZpZXdNYW5hZ2VyID0gVmlld01hbmFnZXI7XG52YXIgQ29udGFpbmVyID0gcmVxdWlyZSgncmVhY3QtY29udGFpbmVyJyk7XG5leHBvcnRzLkNvbnRhaW5lciA9IENvbnRhaW5lcjtcbnZhciBNaXhpbnMgPSByZXF1aXJlKCcuL21peGlucycpO1xuZXhwb3J0cy5NaXhpbnMgPSBNaXhpbnM7XG52YXIgVUkgPSByZXF1aXJlKCcuL3VpJyk7XG5cbmV4cG9ydHMuVUkgPSBVSTtcblxuZnVuY3Rpb24gY3JlYXRlQXBwKCkge1xuXHR2YXIgYXBwID0ge1xuXHRcdG5hdmlnYXRpb25CYXJzOiB7fSxcblx0XHR2aWV3TWFuYWdlcnM6IHt9LFxuXHRcdHZpZXdzOiB7fSxcblx0XHR0cmFuc2l0aW9uVG86IGZ1bmN0aW9uIHRyYW5zaXRpb25Ubyh2aWV3LCBvcHRzKSB7XG5cdFx0XHR2YXIgdm0gPSAnX19kZWZhdWx0Jztcblx0XHRcdHZpZXcgPSB2aWV3LnNwbGl0KCc6Jyk7XG5cdFx0XHRpZiAodmlldy5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdHZtID0gdmlldy5zaGlmdCgpO1xuXHRcdFx0fVxuXHRcdFx0dmlldyA9IHZpZXdbMF07XG5cdFx0XHRhcHAudmlld01hbmFnZXJzW3ZtXS50cmFuc2l0aW9uVG8odmlldywgb3B0cyk7XG5cdFx0fVxuXHR9O1xuXHRyZXR1cm4ge1xuXHRcdGNoaWxkQ29udGV4dFR5cGVzOiB7XG5cdFx0XHRhcHA6IFJlYWN0LlByb3BUeXBlcy5vYmplY3Rcblx0XHR9LFxuXHRcdGdldENoaWxkQ29udGV4dDogZnVuY3Rpb24gZ2V0Q2hpbGRDb250ZXh0KCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0YXBwOiBhcHBcblx0XHRcdH07XG5cdFx0fVxuXHR9O1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywge1xuXHR2YWx1ZTogdHJ1ZVxufSk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgVHJhbnNpdGlvbnMgPSB7XG5cdGNvbnRleHRUeXBlczoge1xuXHRcdGFwcDogUmVhY3QuUHJvcFR5cGVzLm9iamVjdFxuXHR9LFxuXHR0cmFuc2l0aW9uVG86IGZ1bmN0aW9uIHRyYW5zaXRpb25Ubyh2aWV3LCBvcHRzKSB7XG5cdFx0dGhpcy5jb250ZXh0LmFwcC50cmFuc2l0aW9uVG8odmlldywgb3B0cyk7XG5cdH1cbn07XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IFRyYW5zaXRpb25zO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbnZhciBUcmFuc2l0aW9ucyA9IHJlcXVpcmUoJy4vVHJhbnNpdGlvbnMnKTtcbmV4cG9ydHMuVHJhbnNpdGlvbnMgPSBUcmFuc2l0aW9uczsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgVHJhbnNpdGlvbiA9IFJlYWN0LmFkZG9ucy5DU1NUcmFuc2l0aW9uR3JvdXA7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0FsZXJ0YmFyJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHB1bHNlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHR0eXBlOiBSZWFjdC5Qcm9wVHlwZXMub25lT2YoWydkZWZhdWx0JywgJ3ByaW1hcnknLCAnc3VjY2VzcycsICd3YXJuaW5nJywgJ2RhbmdlciddKSxcblx0XHR2aXNpYmxlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbFxuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAnZGVmYXVsdCdcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKCdBbGVydGJhcicsICdBbGVydGJhci0tJyArIHRoaXMucHJvcHMudHlwZSwge1xuXHRcdFx0J0FsZXJ0YmFyLS1wdWxzZSc6IHRoaXMucHJvcHMucHVsc2Vcblx0XHR9LCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cblx0XHR2YXIgaW5uZXIgPSB0aGlzLnByb3BzLnB1bHNlID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdBbGVydGJhcl9faW5uZXInIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KSA6IHRoaXMucHJvcHMuY2hpbGRyZW47XG5cdFx0dmFyIGNvbnRlbnQgPSB0aGlzLnByb3BzLnZpc2libGUgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRpbm5lclxuXHRcdCkgOiBudWxsO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRUcmFuc2l0aW9uLFxuXHRcdFx0eyB0cmFuc2l0aW9uTmFtZTogJ0FsZXJ0YmFyJywgY2xhc3NOYW1lOiAnQWxlcnRiYXJfX3Rlc3R5dGhpbmcnLCBjb21wb25lbnQ6ICdkaXYnIH0sXG5cdFx0XHRjb250ZW50XG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcbnZhciBUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyk7XG5cbnZhciBibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdCdXR0b24nLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogUmVhY3QuUHJvcFR5cGVzLm5vZGUuaXNSZXF1aXJlZCxcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dHlwZTogUmVhY3QuUHJvcFR5cGVzLm9uZU9mKFsnZGVmYXVsdCcsICdpbmZvJywgJ3ByaW1hcnknLCAnc3VjY2VzcycsICd3YXJuaW5nJywgJ2RhbmdlciddKVxuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAnZGVmYXVsdCdcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKCdCdXR0b24nLCAnQnV0dG9uLS0nICsgdGhpcy5wcm9wcy50eXBlLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICd0eXBlJyk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChUYXBwYWJsZSwgX2V4dGVuZHMoe30sIHByb3BzLCB7IGNsYXNzTmFtZTogY2xhc3NOYW1lLCBjb21wb25lbnQ6ICdidXR0b24nIH0pKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdCdXR0b25Hcm91cCcsXG5cdHByb3BUeXBlczoge1xuXHRcdGNoaWxkcmVuOiBSZWFjdC5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnQnV0dG9uR3JvdXAnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sIHByb3BzKSk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnRmllbGRDb250cm9sJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKCdGaWVsZENvbnRyb2wnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sIHByb3BzKSk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnRmllbGRMYWJlbCcsXG5cdHByb3BUeXBlczoge1xuXHRcdGNoaWxkcmVuOiBSZWFjdC5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnRmllbGRMYWJlbCcsIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblx0XHR2YXIgcHJvcHMgPSBibGFja2xpc3QodGhpcy5wcm9wcywgJ2NsYXNzTmFtZScpO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgcHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdHcm91cCcsXG5cdHByb3BUeXBlczoge1xuXHRcdGNoaWxkcmVuOiBSZWFjdC5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnR3JvdXAnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sIHByb3BzKSk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnR3JvdXBCb2R5Jyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKCdHcm91cEJvZHknLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sIHByb3BzKSk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnR3JvdXBGb290ZXInLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogUmVhY3QuUHJvcFR5cGVzLm5vZGUuaXNSZXF1aXJlZCxcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoJ0dyb3VwRm9vdGVyJywgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXHRcdHZhciBwcm9wcyA9IGJsYWNrbGlzdCh0aGlzLnByb3BzLCAnY2xhc3NOYW1lJyk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBwcm9wcykpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0dyb3VwSGVhZGVyJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKCdHcm91cEhlYWRlcicsIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblx0XHR2YXIgcHJvcHMgPSBibGFja2xpc3QodGhpcy5wcm9wcywgJ2NsYXNzTmFtZScpO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgcHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgSXRlbSA9IHJlcXVpcmUoJy4vSXRlbScpO1xudmFyIEl0ZW1Db250ZW50ID0gcmVxdWlyZSgnLi9JdGVtQ29udGVudCcpO1xudmFyIEl0ZW1Jbm5lciA9IHJlcXVpcmUoJy4vSXRlbUlubmVyJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdJbnB1dCcsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGNoaWxkcmVuOiBSZWFjdC5Qcm9wVHlwZXMubm9kZSxcblx0XHRkaXNhYmxlZDogUmVhY3QuUHJvcFR5cGVzLmJvb2xcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgaW5wdXRQcm9wcyA9IGJsYWNrbGlzdCh0aGlzLnByb3BzLCAnY2hpbGRyZW4nLCAnY2xhc3NOYW1lJyk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdEl0ZW0sXG5cdFx0XHR7IGNsYXNzTmFtZTogdGhpcy5wcm9wcy5jbGFzc05hbWUsIHNlbGVjdGFibGU6IHRoaXMucHJvcHMuZGlzYWJsZWQsIGNvbXBvbmVudDogJ2xhYmVsJyB9LFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0SXRlbUlubmVyLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdEl0ZW1Db250ZW50LFxuXHRcdFx0XHRcdHsgY29tcG9uZW50OiAnbGFiZWwnIH0sXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudCgnaW5wdXQnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogJ2ZpZWxkJywgdHlwZTogJ3RleHQnIH0sIGlucHV0UHJvcHMpKVxuXHRcdFx0XHQpLFxuXHRcdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdJdGVtJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogUmVhY3QuUHJvcFR5cGVzLm5vZGUuaXNSZXF1aXJlZCxcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0c2hvd0Rpc2Nsb3N1cmVBcnJvdzogUmVhY3QuUHJvcFR5cGVzLmJvb2xcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnSXRlbScsIHtcblx0XHRcdCdJdGVtLS1oYXMtZGlzY2xvc3VyZS1hcnJvdyc6IHRoaXMucHJvcHMuc2hvd0Rpc2Nsb3N1cmVBcnJvd1xuXHRcdH0sIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7fSwgdGhpcy5wcm9wcywgeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9KSk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSXRlbUNvbnRlbnQnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogUmVhY3QuUHJvcFR5cGVzLm5vZGUuaXNSZXF1aXJlZCxcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoJ0l0ZW1fX2NvbnRlbnQnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sIHByb3BzKSk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG5cbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdJdGVtSW5uZXInLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGNoaWxkcmVuOiBSZWFjdC5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKCdJdGVtX19pbm5lcicsIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sIHRoaXMucHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdJdGVtTWVkaWEnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRhdmF0YXI6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0YXZhdGFySW5pdGlhbHM6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGljb246IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dGh1bWJuYWlsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoe1xuXHRcdFx0J0l0ZW1fX21lZGlhJzogdHJ1ZSxcblx0XHRcdCdJdGVtX19tZWRpYS0taWNvbic6IHRoaXMucHJvcHMuaWNvbixcblx0XHRcdCdJdGVtX19tZWRpYS0tYXZhdGFyJzogdGhpcy5wcm9wcy5hdmF0YXIgfHwgdGhpcy5wcm9wcy5hdmF0YXJJbml0aWFscyxcblx0XHRcdCdJdGVtX19tZWRpYS0tdGh1bWJuYWlsJzogdGhpcy5wcm9wcy50aHVtYm5haWxcblx0XHR9LCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cblx0XHQvLyBtZWRpYSB0eXBlc1xuXHRcdHZhciBpY29uID0gdGhpcy5wcm9wcy5pY29uID8gUmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdJdGVtX19tZWRpYV9faWNvbiAnICsgdGhpcy5wcm9wcy5pY29uIH0pIDogbnVsbDtcblx0XHR2YXIgYXZhdGFyID0gdGhpcy5wcm9wcy5hdmF0YXIgfHwgdGhpcy5wcm9wcy5hdmF0YXJJbml0aWFscyA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnSXRlbV9fbWVkaWFfX2F2YXRhcicgfSxcblx0XHRcdHRoaXMucHJvcHMuYXZhdGFyID8gUmVhY3QuY3JlYXRlRWxlbWVudCgnaW1nJywgeyBzcmM6IHRoaXMucHJvcHMuYXZhdGFyIH0pIDogdGhpcy5wcm9wcy5hdmF0YXJJbml0aWFsc1xuXHRcdCkgOiBudWxsO1xuXHRcdHZhciB0aHVtYm5haWwgPSB0aGlzLnByb3BzLnRodW1ibmFpbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnSXRlbV9fbWVkaWFfX3RodW1ibmFpbCcgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2ltZycsIHsgc3JjOiB0aGlzLnByb3BzLnRodW1ibmFpbCB9KVxuXHRcdCkgOiBudWxsO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdGljb24sXG5cdFx0XHRhdmF0YXIsXG5cdFx0XHR0aHVtYm5haWxcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0l0ZW1Ob3RlJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGljb246IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0bGFiZWw6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dHlwZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ2RlZmF1bHQnXG5cdFx0fTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzbmFtZXMoJ0l0ZW1fX25vdGUnLCAnSXRlbV9fbm90ZS0tJyArIHRoaXMucHJvcHMudHlwZSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXG5cdFx0Ly8gZWxlbWVudHNcblx0XHR2YXIgbGFiZWwgPSB0aGlzLnByb3BzLmxhYmVsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdJdGVtX19ub3RlX19sYWJlbCcgfSxcblx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgaWNvbiA9IHRoaXMucHJvcHMuaWNvbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnSXRlbV9fbm90ZV9faWNvbiAnICsgdGhpcy5wcm9wcy5pY29uIH0pIDogbnVsbDtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRsYWJlbCxcblx0XHRcdGljb25cblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QvYWRkb25zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0l0ZW1TdWJUaXRsZScsXG5cdHByb3BUeXBlczoge1xuXHRcdGNoaWxkcmVuOiBSZWFjdC5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnSXRlbV9fc3VidGl0bGUnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sIHByb3BzKSk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSXRlbVRpdGxlJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKCdJdGVtX190aXRsZScsIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblx0XHR2YXIgcHJvcHMgPSBibGFja2xpc3QodGhpcy5wcm9wcywgJ2NsYXNzTmFtZScpO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgcHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgRmllbGRDb250cm9sID0gcmVxdWlyZSgnLi9GaWVsZENvbnRyb2wnKTtcbnZhciBGaWVsZExhYmVsID0gcmVxdWlyZSgnLi9GaWVsZExhYmVsJyk7XG52YXIgSXRlbSA9IHJlcXVpcmUoJy4vSXRlbScpO1xudmFyIEl0ZW1Jbm5lciA9IHJlcXVpcmUoJy4vSXRlbUlubmVyJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcblxudmFyIGJsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbElucHV0JyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRhbGlnblRvcDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRkaXNhYmxlZDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0bGFiZWw6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0cmVhZE9ubHk6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdHZhbHVlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlYWRPbmx5OiBmYWxzZVxuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGlucHV0UHJvcHMgPSBibGFja2xpc3QodGhpcy5wcm9wcywgJ2FsaWduVG9wJywgJ2NoaWxkcmVuJywgJ2ZpcnN0JywgJ3JlYWRPbmx5Jyk7XG5cdFx0dmFyIHJlbmRlcklucHV0ID0gdGhpcy5wcm9wcy5yZWFkT25seSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnZmllbGQgdS1zZWxlY3RhYmxlJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy52YWx1ZVxuXHRcdCkgOiBSZWFjdC5jcmVhdGVFbGVtZW50KCdpbnB1dCcsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiAnZmllbGQnLCB0eXBlOiAndGV4dCcgfSwgaW5wdXRQcm9wcykpO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRJdGVtLFxuXHRcdFx0eyBhbGlnblRvcDogdGhpcy5wcm9wcy5hbGlnblRvcCwgc2VsZWN0YWJsZTogdGhpcy5wcm9wcy5kaXNhYmxlZCwgY2xhc3NOYW1lOiB0aGlzLnByb3BzLmNsYXNzTmFtZSwgY29tcG9uZW50OiAnbGFiZWwnIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRJdGVtSW5uZXIsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0RmllbGRMYWJlbCxcblx0XHRcdFx0XHRudWxsLFxuXHRcdFx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHRcdFx0KSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRGaWVsZENvbnRyb2wsXG5cdFx0XHRcdFx0bnVsbCxcblx0XHRcdFx0XHRyZW5kZXJJbnB1dCxcblx0XHRcdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0XHRcdClcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBGaWVsZENvbnRyb2wgPSByZXF1aXJlKCcuL0ZpZWxkQ29udHJvbCcpO1xudmFyIEZpZWxkTGFiZWwgPSByZXF1aXJlKCcuL0ZpZWxkTGFiZWwnKTtcbnZhciBJdGVtID0gcmVxdWlyZSgnLi9JdGVtJyk7XG52YXIgSXRlbUlubmVyID0gcmVxdWlyZSgnLi9JdGVtSW5uZXInKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbFNlbGVjdCcsXG5cdHByb3BUeXBlczoge1xuXHRcdGFsaWduVG9wOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0ZGlzYWJsZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdGZpcnN0OiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRsYWJlbDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRvcHRpb25zOiBSZWFjdC5Qcm9wVHlwZXMuYXJyYXksXG5cdFx0dmFsdWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y2xhc3NOYW1lOiAnJ1xuXHRcdH07XG5cdH0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHZhbHVlOiB0aGlzLnByb3BzLnZhbHVlXG5cdFx0fTtcblx0fSxcblxuXHR1cGRhdGVJbnB1dFZhbHVlOiBmdW5jdGlvbiB1cGRhdGVJbnB1dFZhbHVlKGV2ZW50KSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHR2YWx1ZTogZXZlbnQudGFyZ2V0LnZhbHVlXG5cdFx0fSk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0Ly8gTWFwIE9wdGlvbnNcblx0XHR2YXIgb3B0aW9ucyA9IHRoaXMucHJvcHMub3B0aW9ucy5tYXAoZnVuY3Rpb24gKG9wKSB7XG5cdFx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J29wdGlvbicsXG5cdFx0XHRcdHsga2V5OiAnb3B0aW9uLScgKyBvcC52YWx1ZSwgdmFsdWU6IG9wLnZhbHVlIH0sXG5cdFx0XHRcdG9wLmxhYmVsXG5cdFx0XHQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRJdGVtLFxuXHRcdFx0eyBhbGlnblRvcDogdGhpcy5wcm9wcy5hbGlnblRvcCwgc2VsZWN0YWJsZTogdGhpcy5wcm9wcy5kaXNhYmxlZCwgY2xhc3NOYW1lOiB0aGlzLnByb3BzLmNsYXNzTmFtZSwgY29tcG9uZW50OiAnbGFiZWwnIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRJdGVtSW5uZXIsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0RmllbGRMYWJlbCxcblx0XHRcdFx0XHRudWxsLFxuXHRcdFx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHRcdFx0KSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRGaWVsZENvbnRyb2wsXG5cdFx0XHRcdFx0bnVsbCxcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFx0J3NlbGVjdCcsXG5cdFx0XHRcdFx0XHR7IHZhbHVlOiB0aGlzLnN0YXRlLnZhbHVlLCBvbkNoYW5nZTogdGhpcy51cGRhdGVJbnB1dFZhbHVlLCBjbGFzc05hbWU6ICdzZWxlY3QtZmllbGQnIH0sXG5cdFx0XHRcdFx0XHRvcHRpb25zXG5cdFx0XHRcdFx0KSxcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ3NlbGVjdC1maWVsZC1pbmRpY2F0b3InIH0sXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ3NlbGVjdC1maWVsZC1pbmRpY2F0b3ItYXJyb3cnIH0pXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbFRleHRhcmVhJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogUmVhY3QuUHJvcFR5cGVzLm5vZGUsXG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGRpc2FibGVkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRmaXJzdDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0bGFiZWw6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0cmVhZE9ubHk6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdHZhbHVlOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJvd3M6IDNcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKHRoaXMucHJvcHMuY2xhc3NOYW1lLCAnbGlzdC1pdGVtJywgJ2ZpZWxkLWl0ZW0nLCAnYWxpZ24tdG9wJywge1xuXHRcdFx0J2lzLWZpcnN0JzogdGhpcy5wcm9wcy5maXJzdCxcblx0XHRcdCd1LXNlbGVjdGFibGUnOiB0aGlzLnByb3BzLmRpc2FibGVkXG5cdFx0fSk7XG5cblx0XHR2YXIgcHJvcHMgPSBibGFja2xpc3QodGhpcy5wcm9wcywgJ2NoaWxkcmVuJywgJ2NsYXNzTmFtZScsICdkaXNhYmxlZCcsICdmaXJzdCcsICdsYWJlbCcsICdyZWFkT25seScpO1xuXG5cdFx0dmFyIHJlbmRlcklucHV0ID0gdGhpcy5wcm9wcy5yZWFkT25seSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnZmllbGQgdS1zZWxlY3RhYmxlJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy52YWx1ZVxuXHRcdCkgOiBSZWFjdC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScsIF9leHRlbmRzKHt9LCBwcm9wcywgeyBjbGFzc05hbWU6ICdmaWVsZCcgfSkpO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdsYWJlbCcsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1pbm5lcicgfSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2ZpZWxkLWxhYmVsJyB9LFxuXHRcdFx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHRcdFx0KSxcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ2ZpZWxkLWNvbnRyb2wnIH0sXG5cdFx0XHRcdFx0cmVuZGVySW5wdXQsXG5cdFx0XHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG52YXIgY2xhc3NOYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnTGlzdEhlYWRlcicsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHN0aWNreTogUmVhY3QuUHJvcFR5cGVzLmJvb2xcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NOYW1lcygnbGlzdC1oZWFkZXInLCB7XG5cdFx0XHQnc3RpY2t5JzogdGhpcy5wcm9wcy5zdGlja3lcblx0XHR9LCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cblx0XHR2YXIgcHJvcHMgPSBibGFja2xpc3QodGhpcy5wcm9wcywgJ3N0aWNreScpO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgcHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7XG5cdHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIGNsYXNzTmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcbnZhciBUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyk7XG52YXIgVHJhbnNpdGlvbiA9IFJlYWN0LmFkZG9ucy5DU1NUcmFuc2l0aW9uR3JvdXA7XG5cbnZhciBESVJFQ1RJT05TID0ge1xuXHQncmV2ZWFsLWZyb20tcmlnaHQnOiAtMSxcblx0J3Nob3ctZnJvbS1sZWZ0JzogLTEsXG5cdCdzaG93LWZyb20tcmlnaHQnOiAxLFxuXHQncmV2ZWFsLWZyb20tbGVmdCc6IDFcbn07XG5cbnZhciBkZWZhdWx0Q29udHJvbGxlclN0YXRlID0ge1xuXHRkaXJlY3Rpb246IDAsXG5cdGZhZGU6IGZhbHNlLFxuXHRsZWZ0QXJyb3c6IGZhbHNlLFxuXHRsZWZ0QnV0dG9uRGlzYWJsZWQ6IGZhbHNlLFxuXHRsZWZ0SWNvbjogJycsXG5cdGxlZnRMYWJlbDogJycsXG5cdGxlZnRBY3Rpb246IG51bGwsXG5cdHJpZ2h0QXJyb3c6IGZhbHNlLFxuXHRyaWdodEJ1dHRvbkRpc2FibGVkOiBmYWxzZSxcblx0cmlnaHRJY29uOiAnJyxcblx0cmlnaHRMYWJlbDogJycsXG5cdHJpZ2h0QWN0aW9uOiBudWxsLFxuXHR0aXRsZTogJydcbn07XG5cbmZ1bmN0aW9uIG5ld1N0YXRlKGZyb20pIHtcblx0dmFyIG5zID0gX2V4dGVuZHMoe30sIGRlZmF1bHRDb250cm9sbGVyU3RhdGUpO1xuXHRpZiAoZnJvbSkgX2V4dGVuZHMobnMsIGZyb20pO1xuXHRkZWxldGUgbnMubmFtZTsgLy8gbWF5IGxlYWsgZnJvbSBwcm9wc1xuXHRyZXR1cm4gbnM7XG59XG5cbnZhciBOYXZpZ2F0aW9uQmFyID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ05hdmlnYXRpb25CYXInLFxuXG5cdGNvbnRleHRUeXBlczoge1xuXHRcdGFwcDogUmVhY3QuUHJvcFR5cGVzLm9iamVjdFxuXHR9LFxuXG5cdHByb3BUeXBlczoge1xuXHRcdG5hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcblx0XHRyZXR1cm4gbmV3U3RhdGUodGhpcy5wcm9wcyk7XG5cdH0sXG5cblx0Y29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdGlmICh0aGlzLnByb3BzLm5hbWUpIHtcblx0XHRcdHRoaXMuY29udGV4dC5hcHAubmF2aWdhdGlvbkJhcnNbdGhpcy5wcm9wcy5uYW1lXSA9IHRoaXM7XG5cdFx0fVxuXHR9LFxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpZiAodGhpcy5wcm9wcy5uYW1lKSB7XG5cdFx0XHRkZWxldGUgdGhpcy5jb250ZXh0LmFwcC5uYXZpZ2F0aW9uQmFyc1t0aGlzLnByb3BzLm5hbWVdO1xuXHRcdH1cblx0fSxcblxuXHRjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzOiBmdW5jdGlvbiBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKG5leHRQcm9wcykge1xuXHRcdHRoaXMuc2V0U3RhdGUobmV3U3RhdGUobmV4dFByb3BzKSk7XG5cdFx0aWYgKG5leHRQcm9wcy5uYW1lICE9PSB0aGlzLnByb3BzLm5hbWUpIHtcblx0XHRcdGlmIChuZXh0UHJvcHMubmFtZSkge1xuXHRcdFx0XHR0aGlzLmNvbnRleHQuYXBwLm5hdmlnYXRpb25CYXJzW25leHRQcm9wcy5uYW1lXSA9IHRoaXM7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5wcm9wcy5uYW1lKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLmNvbnRleHQuYXBwLm5hdmlnYXRpb25CYXJzW3RoaXMucHJvcHMubmFtZV07XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKHN0YXRlKSB7XG5cdFx0Ly8gRklYTUU6IHdoYXQgaXMgaGFwcGVuaW5nIGhlcmVcblx0XHRzdGF0ZSA9IG5ld1N0YXRlKHN0YXRlKTtcblx0XHR0aGlzLnNldFN0YXRlKG5ld1N0YXRlKHN0YXRlKSk7XG5cdH0sXG5cblx0dXBkYXRlV2l0aFRyYW5zaXRpb246IGZ1bmN0aW9uIHVwZGF0ZVdpdGhUcmFuc2l0aW9uKHN0YXRlLCB0cmFuc2l0aW9uKSB7XG5cdFx0c3RhdGUgPSBuZXdTdGF0ZShzdGF0ZSk7XG5cdFx0c3RhdGUuZGlyZWN0aW9uID0gRElSRUNUSU9OU1t0cmFuc2l0aW9uXSB8fCAwO1xuXG5cdFx0aWYgKHRyYW5zaXRpb24gPT09ICdmYWRlJyB8fCB0cmFuc2l0aW9uID09PSAnZmFkZS1jb250cmFjdCcgfHwgdHJhbnNpdGlvbiA9PT0gJ2ZhZGUtZXhwYW5kJykge1xuXHRcdFx0c3RhdGUuZmFkZSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRTdGF0ZShzdGF0ZSk7XG5cdH0sXG5cblx0cmVuZGVyTGVmdEJ1dHRvbjogZnVuY3Rpb24gcmVuZGVyTGVmdEJ1dHRvbigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NOYW1lcygnTmF2aWdhdGlvbkJhckxlZnRCdXR0b24nLCB7XG5cdFx0XHQnaGFzLWFycm93JzogdGhpcy5zdGF0ZS5sZWZ0QXJyb3dcblx0XHR9KTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IG9uVGFwOiB0aGlzLnN0YXRlLmxlZnRBY3Rpb24sIGNsYXNzTmFtZTogY2xhc3NOYW1lLCBkaXNhYmxlZDogdGhpcy5zdGF0ZS5sZWZ0QnV0dG9uRGlzYWJsZWQsIGNvbXBvbmVudDogJ2J1dHRvbicgfSxcblx0XHRcdHRoaXMucmVuZGVyTGVmdEFycm93KCksXG5cdFx0XHR0aGlzLnJlbmRlckxlZnRMYWJlbCgpXG5cdFx0KTtcblx0fSxcblxuXHRyZW5kZXJMZWZ0QXJyb3c6IGZ1bmN0aW9uIHJlbmRlckxlZnRBcnJvdygpIHtcblx0XHR2YXIgdHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tSW5zdGFudCc7XG5cdFx0aWYgKHRoaXMuc3RhdGUuZmFkZSB8fCB0aGlzLnN0YXRlLmRpcmVjdGlvbikge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tRmFkZSc7XG5cdFx0fVxuXG5cdFx0dmFyIGFycm93ID0gdGhpcy5zdGF0ZS5sZWZ0QXJyb3cgPyBSZWFjdC5jcmVhdGVFbGVtZW50KCdzcGFuJywgeyBjbGFzc05hbWU6ICdOYXZpZ2F0aW9uQmFyTGVmdEFycm93JyB9KSA6IG51bGw7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFRyYW5zaXRpb24sXG5cdFx0XHR7IHRyYW5zaXRpb25OYW1lOiB0cmFuc2l0aW9uTmFtZSB9LFxuXHRcdFx0YXJyb3dcblx0XHQpO1xuXHR9LFxuXG5cdHJlbmRlckxlZnRMYWJlbDogZnVuY3Rpb24gcmVuZGVyTGVmdExhYmVsKCkge1xuXHRcdHZhciB0cmFuc2l0aW9uTmFtZSA9ICdOYXZpZ2F0aW9uQmFyVHJhbnNpdGlvbi1JbnN0YW50Jztcblx0XHRpZiAodGhpcy5zdGF0ZS5mYWRlKSB7XG5cdFx0XHR0cmFuc2l0aW9uTmFtZSA9ICdOYXZpZ2F0aW9uQmFyVHJhbnNpdGlvbi1GYWRlJztcblx0XHR9IGVsc2UgaWYgKHRoaXMuc3RhdGUuZGlyZWN0aW9uID4gMCkge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tRm9yd2FyZHMnO1xuXHRcdH0gZWxzZSBpZiAodGhpcy5zdGF0ZS5kaXJlY3Rpb24gPCAwKSB7XG5cdFx0XHR0cmFuc2l0aW9uTmFtZSA9ICdOYXZpZ2F0aW9uQmFyVHJhbnNpdGlvbi1CYWNrd2FyZHMnO1xuXHRcdH1cblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VHJhbnNpdGlvbixcblx0XHRcdHsgdHJhbnNpdGlvbk5hbWU6IHRyYW5zaXRpb25OYW1lIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnc3BhbicsXG5cdFx0XHRcdHsga2V5OiBEYXRlLm5vdygpLCBjbGFzc05hbWU6ICdOYXZpZ2F0aW9uQmFyTGVmdExhYmVsJyB9LFxuXHRcdFx0XHR0aGlzLnN0YXRlLmxlZnRMYWJlbFxuXHRcdFx0KVxuXHRcdCk7XG5cdH0sXG5cblx0cmVuZGVyVGl0bGU6IGZ1bmN0aW9uIHJlbmRlclRpdGxlKCkge1xuXHRcdHZhciB0aXRsZSA9IHRoaXMuc3RhdGUudGl0bGUgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J3NwYW4nLFxuXHRcdFx0eyBrZXk6IERhdGUubm93KCksIGNsYXNzTmFtZTogJ05hdmlnYXRpb25CYXJUaXRsZScgfSxcblx0XHRcdHRoaXMuc3RhdGUudGl0bGVcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgdHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tSW5zdGFudCc7XG5cdFx0aWYgKHRoaXMuc3RhdGUuZmFkZSkge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tRmFkZSc7XG5cdFx0fSBlbHNlIGlmICh0aGlzLnN0YXRlLmRpcmVjdGlvbiA+IDApIHtcblx0XHRcdHRyYW5zaXRpb25OYW1lID0gJ05hdmlnYXRpb25CYXJUcmFuc2l0aW9uLUZvcndhcmRzJztcblx0XHR9IGVsc2UgaWYgKHRoaXMuc3RhdGUuZGlyZWN0aW9uIDwgMCkge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tQmFja3dhcmRzJztcblx0XHR9XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFRyYW5zaXRpb24sXG5cdFx0XHR7IHRyYW5zaXRpb25OYW1lOiB0cmFuc2l0aW9uTmFtZSB9LFxuXHRcdFx0dGl0bGVcblx0XHQpO1xuXHR9LFxuXG5cdHJlbmRlclJpZ2h0QnV0dG9uOiBmdW5jdGlvbiByZW5kZXJSaWdodEJ1dHRvbigpIHtcblx0XHR2YXIgdHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tSW5zdGFudCc7XG5cdFx0aWYgKHRoaXMuc3RhdGUuZmFkZSB8fCB0aGlzLnN0YXRlLmRpcmVjdGlvbikge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tRmFkZSc7XG5cdFx0fVxuXHRcdHZhciBidXR0b24gPSB0aGlzLnN0YXRlLnJpZ2h0SWNvbiB8fCB0aGlzLnN0YXRlLnJpZ2h0TGFiZWwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IGtleTogRGF0ZS5ub3coKSwgb25UYXA6IHRoaXMuc3RhdGUucmlnaHRBY3Rpb24sIGNsYXNzTmFtZTogJ05hdmlnYXRpb25CYXJSaWdodEJ1dHRvbicsIGRpc2FibGVkOiB0aGlzLnN0YXRlLnJpZ2h0QnV0dG9uRGlzYWJsZWQsIGNvbXBvbmVudDogJ2J1dHRvbicgfSxcblx0XHRcdHRoaXMucmVuZGVyUmlnaHRMYWJlbCgpLFxuXHRcdFx0dGhpcy5yZW5kZXJSaWdodEljb24oKVxuXHRcdCkgOiBudWxsO1xuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VHJhbnNpdGlvbixcblx0XHRcdHsgdHJhbnNpdGlvbk5hbWU6IHRyYW5zaXRpb25OYW1lIH0sXG5cdFx0XHRidXR0b25cblx0XHQpO1xuXHR9LFxuXG5cdHJlbmRlclJpZ2h0SWNvbjogZnVuY3Rpb24gcmVuZGVyUmlnaHRJY29uKCkge1xuXHRcdGlmICghdGhpcy5zdGF0ZS5yaWdodEljb24pIHJldHVybiBudWxsO1xuXG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzTmFtZXMoJ05hdmlnYXRpb25CYXJSaWdodEljb24nLCB0aGlzLnN0YXRlLnJpZ2h0SWNvbik7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudCgnc3BhbicsIHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSk7XG5cdH0sXG5cblx0cmVuZGVyUmlnaHRMYWJlbDogZnVuY3Rpb24gcmVuZGVyUmlnaHRMYWJlbCgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGF0ZS5yaWdodExhYmVsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdzcGFuJyxcblx0XHRcdHsga2V5OiBEYXRlLm5vdygpLCBjbGFzc05hbWU6ICdOYXZpZ2F0aW9uQmFyUmlnaHRMYWJlbCcgfSxcblx0XHRcdHRoaXMuc3RhdGUucmlnaHRMYWJlbFxuXHRcdCkgOiBudWxsO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogJ05hdmlnYXRpb25CYXInIH0sXG5cdFx0XHR0aGlzLnJlbmRlckxlZnRCdXR0b24oKSxcblx0XHRcdHRoaXMucmVuZGVyVGl0bGUoKSxcblx0XHRcdHRoaXMucmVuZGVyUmlnaHRCdXR0b24oKVxuXHRcdCk7XG5cdH1cbn0pO1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBOYXZpZ2F0aW9uQmFyO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzWydkZWZhdWx0J107IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdC9hZGRvbnMnKTtcbnZhciBSZWFjdENTU1RyYW5zaXRpb25Hcm91cCA9IFJlYWN0LmFkZG9ucy5DU1NUcmFuc2l0aW9uR3JvdXA7XG5cbnZhciBjbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdQb3B1cCcsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlLFxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2aXNpYmxlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbFxuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0cmFuc2l0aW9uOiAnbm9uZSdcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlckJhY2tkcm9wOiBmdW5jdGlvbiByZW5kZXJCYWNrZHJvcCgpIHtcblx0XHRpZiAoIXRoaXMucHJvcHMudmlzaWJsZSkgcmV0dXJuIG51bGw7XG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgY2xhc3NOYW1lOiAnUG9wdXAtYmFja2Ryb3AnIH0pO1xuXHR9LFxuXG5cdHJlbmRlckRpYWxvZzogZnVuY3Rpb24gcmVuZGVyRGlhbG9nKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy52aXNpYmxlKSByZXR1cm4gbnVsbDtcblxuXHRcdC8vIFNldCBjbGFzc25hbWVzXG5cdFx0dmFyIGRpYWxvZ0NsYXNzTmFtZSA9IGNsYXNzbmFtZXMoJ1BvcHVwLWRpYWxvZycsIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogZGlhbG9nQ2xhc3NOYW1lIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdQb3B1cCcgfSxcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFJlYWN0Q1NTVHJhbnNpdGlvbkdyb3VwLFxuXHRcdFx0XHR7IHRyYW5zaXRpb25OYW1lOiAnUG9wdXAtZGlhbG9nJywgY29tcG9uZW50OiAnZGl2JyB9LFxuXHRcdFx0XHR0aGlzLnJlbmRlckRpYWxvZygpXG5cdFx0XHQpLFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0UmVhY3RDU1NUcmFuc2l0aW9uR3JvdXAsXG5cdFx0XHRcdHsgdHJhbnNpdGlvbk5hbWU6ICdQb3B1cC1iYWNrZ3JvdW5kJywgY29tcG9uZW50OiAnZGl2JyB9LFxuXHRcdFx0XHR0aGlzLnJlbmRlckJhY2tkcm9wKClcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIGNsYXNzTmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ1BvcHVwSWNvbicsXG5cdHByb3BUeXBlczoge1xuXHRcdG5hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dHlwZTogUmVhY3QuUHJvcFR5cGVzLm9uZU9mKFsnZGVmYXVsdCcsICdtdXRlZCcsICdwcmltYXJ5JywgJ3N1Y2Nlc3MnLCAnd2FybmluZycsICdkYW5nZXInXSksXG5cdFx0c3Bpbm5pbmc6IFJlYWN0LlByb3BUeXBlcy5ib29sXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IGNsYXNzTmFtZXMoJ1BvcHVwSWNvbicsIHtcblx0XHRcdCdpcy1zcGlubmluZyc6IHRoaXMucHJvcHMuc3Bpbm5pbmdcblx0XHR9LCB0aGlzLnByb3BzLm5hbWUsIHRoaXMucHJvcHMudHlwZSk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcbnZhciBJdGVtID0gcmVxdWlyZSgnLi9JdGVtJyk7XG52YXIgSXRlbUlubmVyID0gcmVxdWlyZSgnLi9JdGVtSW5uZXInKTtcbnZhciBJdGVtTm90ZSA9IHJlcXVpcmUoJy4vSXRlbU5vdGUnKTtcbnZhciBJdGVtVGl0bGUgPSByZXF1aXJlKCcuL0l0ZW1UaXRsZScpO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcbnZhciBUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ1JhZGlvTGlzdCcsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0b3B0aW9uczogUmVhY3QuUHJvcFR5cGVzLmFycmF5LFxuXHRcdHZhbHVlOiBSZWFjdC5Qcm9wVHlwZXMub25lT2ZUeXBlKFtSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCBSZWFjdC5Qcm9wVHlwZXMubnVtYmVyXSksXG5cdFx0aWNvbjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHRvbkNoYW5nZTogUmVhY3QuUHJvcFR5cGVzLmZ1bmNcblx0fSxcblxuXHRvbkNoYW5nZTogZnVuY3Rpb24gb25DaGFuZ2UodmFsdWUpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2hhbmdlKHZhbHVlKTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIG9wdGlvbnMgPSB0aGlzLnByb3BzLm9wdGlvbnMubWFwKGZ1bmN0aW9uIChvcCwgaSkge1xuXHRcdFx0dmFyIGljb25DbGFzc25hbWUgPSBjbGFzc25hbWVzKCdpdGVtLWljb24gcHJpbWFyeScsIG9wLmljb24pO1xuXHRcdFx0dmFyIGNoZWNrTWFyayA9IG9wLnZhbHVlID09PSBzZWxmLnByb3BzLnZhbHVlID8gUmVhY3QuY3JlYXRlRWxlbWVudChJdGVtTm90ZSwgeyB0eXBlOiAncHJpbWFyeScsIGljb246ICdpb24tY2hlY2ttYXJrJyB9KSA6IG51bGw7XG5cdFx0XHR2YXIgaWNvbiA9IG9wLmljb24gPyBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLW1lZGlhJyB9LFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCdzcGFuJywgeyBjbGFzc05hbWU6IGljb25DbGFzc25hbWUgfSlcblx0XHRcdCkgOiBudWxsO1xuXG5cdFx0XHRmdW5jdGlvbiBvbkNoYW5nZSgpIHtcblx0XHRcdFx0c2VsZi5vbkNoYW5nZShvcC52YWx1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRUYXBwYWJsZSxcblx0XHRcdFx0eyBrZXk6ICdvcHRpb24tJyArIGksIG9uVGFwOiBvbkNoYW5nZSB9LFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdEl0ZW0sXG5cdFx0XHRcdFx0eyBrZXk6ICdvcHRpb24tJyArIGksIG9uVGFwOiBvbkNoYW5nZSB9LFxuXHRcdFx0XHRcdGljb24sXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdEl0ZW1Jbm5lcixcblx0XHRcdFx0XHRcdG51bGwsXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFx0XHRJdGVtVGl0bGUsXG5cdFx0XHRcdFx0XHRcdG51bGwsXG5cdFx0XHRcdFx0XHRcdG9wLmxhYmVsXG5cdFx0XHRcdFx0XHQpLFxuXHRcdFx0XHRcdFx0Y2hlY2tNYXJrXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHQpXG5cdFx0XHQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdG51bGwsXG5cdFx0XHRvcHRpb25zXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xudmFyIGNsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdTZWdtZW50ZWRDb250cm9sJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0ZXF1YWxXaWR0aFNlZ21lbnRzOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRoYXNHdXR0ZXI6IFJlYWN0LlByb3BUeXBlcy5ib29sLFxuXHRcdG9uQ2hhbmdlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYy5pc1JlcXVpcmVkLFxuXHRcdG9wdGlvbnM6IFJlYWN0LlByb3BUeXBlcy5hcnJheS5pc1JlcXVpcmVkLFxuXHRcdHR5cGU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dmFsdWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ3ByaW1hcnknXG5cdFx0fTtcblx0fSxcblxuXHRvbkNoYW5nZTogZnVuY3Rpb24gb25DaGFuZ2UodmFsdWUpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2hhbmdlKHZhbHVlKTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY29tcG9uZW50Q2xhc3NOYW1lID0gY2xhc3NuYW1lcygnU2VnbWVudGVkQ29udHJvbCcsICdTZWdtZW50ZWRDb250cm9sLS0nICsgdGhpcy5wcm9wcy50eXBlLCB7XG5cdFx0XHQnU2VnbWVudGVkQ29udHJvbC0taGFzLWd1dHRlcic6IHRoaXMucHJvcHMuaGFzR3V0dGVyLFxuXHRcdFx0J1NlZ21lbnRlZENvbnRyb2wtLWVxdWFsLXdpZHRocyc6IHRoaXMucHJvcHMuZXF1YWxXaWR0aFNlZ21lbnRzXG5cdFx0fSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHZhciBvcHRpb25zID0gdGhpcy5wcm9wcy5vcHRpb25zLm1hcChmdW5jdGlvbiAob3ApIHtcblx0XHRcdGZ1bmN0aW9uIG9uQ2hhbmdlKCkge1xuXHRcdFx0XHRzZWxmLm9uQ2hhbmdlKG9wLnZhbHVlKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGl0ZW1DbGFzc05hbWUgPSBjbGFzc25hbWVzKCdTZWdtZW50ZWRDb250cm9sX19pdGVtJywge1xuXHRcdFx0XHQnaXMtc2VsZWN0ZWQnOiBvcC52YWx1ZSA9PT0gc2VsZi5wcm9wcy52YWx1ZVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRUYXBwYWJsZSxcblx0XHRcdFx0eyBrZXk6ICdvcHRpb24tJyArIG9wLnZhbHVlLCBvblRhcDogb25DaGFuZ2UsIGNsYXNzTmFtZTogaXRlbUNsYXNzTmFtZSB9LFxuXHRcdFx0XHRvcC5sYWJlbFxuXHRcdFx0KTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY29tcG9uZW50Q2xhc3NOYW1lIH0sXG5cdFx0XHRvcHRpb25zXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdTd2l0Y2gnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGRpc2FibGVkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCxcblx0XHRvbjogUmVhY3QuUHJvcFR5cGVzLmJvb2wsXG5cdFx0b25UYXA6IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHRcdHR5cGU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ2RlZmF1bHQnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnU3dpdGNoJywgJ1N3aXRjaC0tJyArIHRoaXMucHJvcHMudHlwZSwge1xuXHRcdFx0J2lzLWRpc2FibGVkJzogdGhpcy5wcm9wcy5kaXNhYmxlZCxcblx0XHRcdCdpcy1vbic6IHRoaXMucHJvcHMub25cblx0XHR9KTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0VGFwcGFibGUsXG5cdFx0XHR7IG9uVGFwOiB0aGlzLnByb3BzLm9uVGFwLCBjbGFzc05hbWU6IGNsYXNzTmFtZSwgY29tcG9uZW50OiAnbGFiZWwnIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0eyBjbGFzc05hbWU6ICdTd2l0Y2hfX3RyYWNrJyB9LFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ1N3aXRjaF9faGFuZGxlJyB9KVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywge1xuXHR2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xuXG52YXIgYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG52YXIgY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIE5hdmlnYXRvciA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdOYXZpZ2F0b3InLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSBjbGFzc25hbWVzKCdUYWJzLU5hdmlnYXRvcicsIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblx0XHR2YXIgb3RoZXJQcm9wcyA9IGJsYWNrbGlzdCh0aGlzLnByb3BzLCAnY2xhc3NOYW1lJyk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBvdGhlclByb3BzKSk7XG5cdH1cbn0pO1xuXG5leHBvcnRzLk5hdmlnYXRvciA9IE5hdmlnYXRvcjtcbnZhciBUYWIgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnVGFiJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRzZWxlY3RlZDogUmVhY3QuUHJvcFR5cGVzLmJvb2xcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gY2xhc3NuYW1lcygnVGFicy1UYWInLCB7ICdpcy1zZWxlY3RlZCc6IHRoaXMucHJvcHMuc2VsZWN0ZWQgfSk7XG5cdFx0dmFyIG90aGVyUHJvcHMgPSBibGFja2xpc3QodGhpcy5wcm9wcywgJ3NlbGVjdGVkJyk7XG5cblx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChUYXBwYWJsZSwgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBvdGhlclByb3BzKSk7XG5cdH1cbn0pO1xuXG5leHBvcnRzLlRhYiA9IFRhYjtcbnZhciBMYWJlbCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbCcsXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiAnVGFicy1MYWJlbCcgfSwgdGhpcy5wcm9wcykpO1xuXHR9XG59KTtcbmV4cG9ydHMuTGFiZWwgPSBMYWJlbDsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xuXG52YXIgSXRlbSA9IHJlcXVpcmUoJy4vSXRlbScpO1xudmFyIEl0ZW1Db250ZW50ID0gcmVxdWlyZSgnLi9JdGVtQ29udGVudCcpO1xudmFyIEl0ZW1Jbm5lciA9IHJlcXVpcmUoJy4vSXRlbUlubmVyJyk7XG5cbnZhciBibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSW5wdXQnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0Y2hpbGRyZW46IFJlYWN0LlByb3BUeXBlcy5ub2RlLFxuXHRcdGRpc2FibGVkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbFxuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBpbnB1dFByb3BzID0gYmxhY2tsaXN0KHRoaXMucHJvcHMsICdjaGlsZHJlbicsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0SXRlbSxcblx0XHRcdHsgc2VsZWN0YWJsZTogdGhpcy5wcm9wcy5kaXNhYmxlZCwgY2xhc3NOYW1lOiB0aGlzLnByb3BzLmNsYXNzTmFtZSwgY29tcG9uZW50OiAnbGFiZWwnIH0sXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRJdGVtSW5uZXIsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0SXRlbUNvbnRlbnQsXG5cdFx0XHRcdFx0eyBjb21wb25lbnQ6ICdsYWJlbCcgfSxcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiAnZmllbGQnLCByb3dzOiAzIH0sIGlucHV0UHJvcHMpKVxuXHRcdFx0XHQpLFxuXHRcdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbnZhciBBbGVydGJhciA9IHJlcXVpcmUoJy4vQWxlcnRiYXInKTtcbmV4cG9ydHMuQWxlcnRiYXIgPSBBbGVydGJhcjtcbnZhciBCdXR0b24gPSByZXF1aXJlKCcuL0J1dHRvbicpO1xuZXhwb3J0cy5CdXR0b24gPSBCdXR0b247XG52YXIgQnV0dG9uR3JvdXAgPSByZXF1aXJlKCcuL0J1dHRvbkdyb3VwJyk7XG5leHBvcnRzLkJ1dHRvbkdyb3VwID0gQnV0dG9uR3JvdXA7XG52YXIgRmllbGRDb250cm9sID0gcmVxdWlyZSgnLi9GaWVsZENvbnRyb2wnKTtcbmV4cG9ydHMuRmllbGRDb250cm9sID0gRmllbGRDb250cm9sO1xudmFyIEZpZWxkTGFiZWwgPSByZXF1aXJlKCcuL0ZpZWxkTGFiZWwnKTtcbmV4cG9ydHMuRmllbGRMYWJlbCA9IEZpZWxkTGFiZWw7XG52YXIgR3JvdXAgPSByZXF1aXJlKCcuL0dyb3VwJyk7XG5leHBvcnRzLkdyb3VwID0gR3JvdXA7XG52YXIgR3JvdXBCb2R5ID0gcmVxdWlyZSgnLi9Hcm91cEJvZHknKTtcbmV4cG9ydHMuR3JvdXBCb2R5ID0gR3JvdXBCb2R5O1xudmFyIEdyb3VwRm9vdGVyID0gcmVxdWlyZSgnLi9Hcm91cEZvb3RlcicpO1xuZXhwb3J0cy5Hcm91cEZvb3RlciA9IEdyb3VwRm9vdGVyO1xudmFyIEdyb3VwSGVhZGVyID0gcmVxdWlyZSgnLi9Hcm91cEhlYWRlcicpO1xuZXhwb3J0cy5Hcm91cEhlYWRlciA9IEdyb3VwSGVhZGVyO1xudmFyIEl0ZW0gPSByZXF1aXJlKCcuL0l0ZW0nKTtcbmV4cG9ydHMuSXRlbSA9IEl0ZW07XG52YXIgSXRlbUNvbnRlbnQgPSByZXF1aXJlKCcuL0l0ZW1Db250ZW50Jyk7XG5leHBvcnRzLkl0ZW1Db250ZW50ID0gSXRlbUNvbnRlbnQ7XG52YXIgSXRlbUlubmVyID0gcmVxdWlyZSgnLi9JdGVtSW5uZXInKTtcbmV4cG9ydHMuSXRlbUlubmVyID0gSXRlbUlubmVyO1xudmFyIEl0ZW1NZWRpYSA9IHJlcXVpcmUoJy4vSXRlbU1lZGlhJyk7XG5leHBvcnRzLkl0ZW1NZWRpYSA9IEl0ZW1NZWRpYTtcbnZhciBJdGVtTm90ZSA9IHJlcXVpcmUoJy4vSXRlbU5vdGUnKTtcbmV4cG9ydHMuSXRlbU5vdGUgPSBJdGVtTm90ZTtcbnZhciBJdGVtU3ViVGl0bGUgPSByZXF1aXJlKCcuL0l0ZW1TdWJUaXRsZScpO1xuZXhwb3J0cy5JdGVtU3ViVGl0bGUgPSBJdGVtU3ViVGl0bGU7XG52YXIgSXRlbVRpdGxlID0gcmVxdWlyZSgnLi9JdGVtVGl0bGUnKTtcbmV4cG9ydHMuSXRlbVRpdGxlID0gSXRlbVRpdGxlO1xudmFyIExhYmVsSW5wdXQgPSByZXF1aXJlKCcuL0xhYmVsSW5wdXQnKTtcbmV4cG9ydHMuTGFiZWxJbnB1dCA9IExhYmVsSW5wdXQ7XG52YXIgTGFiZWxTZWxlY3QgPSByZXF1aXJlKCcuL0xhYmVsU2VsZWN0Jyk7XG5leHBvcnRzLkxhYmVsU2VsZWN0ID0gTGFiZWxTZWxlY3Q7XG52YXIgTGFiZWxUZXh0YXJlYSA9IHJlcXVpcmUoJy4vTGFiZWxUZXh0YXJlYScpO1xuZXhwb3J0cy5MYWJlbFRleHRhcmVhID0gTGFiZWxUZXh0YXJlYTtcbnZhciBMaXN0SGVhZGVyID0gcmVxdWlyZSgnLi9MaXN0SGVhZGVyJyk7XG5leHBvcnRzLkxpc3RIZWFkZXIgPSBMaXN0SGVhZGVyO1xudmFyIE5hdmlnYXRpb25CYXIgPSByZXF1aXJlKCcuL05hdmlnYXRpb25CYXInKTtcbmV4cG9ydHMuTmF2aWdhdGlvbkJhciA9IE5hdmlnYXRpb25CYXI7XG52YXIgUG9wdXAgPSByZXF1aXJlKCcuL1BvcHVwJyk7XG5leHBvcnRzLlBvcHVwID0gUG9wdXA7XG52YXIgUG9wdXBJY29uID0gcmVxdWlyZSgnLi9Qb3B1cEljb24nKTtcbmV4cG9ydHMuUG9wdXBJY29uID0gUG9wdXBJY29uO1xudmFyIFJhZGlvTGlzdCA9IHJlcXVpcmUoJy4vUmFkaW9MaXN0Jyk7XG5leHBvcnRzLlJhZGlvTGlzdCA9IFJhZGlvTGlzdDtcbnZhciBTZWdtZW50ZWRDb250cm9sID0gcmVxdWlyZSgnLi9TZWdtZW50ZWRDb250cm9sJyk7XG5leHBvcnRzLlNlZ21lbnRlZENvbnRyb2wgPSBTZWdtZW50ZWRDb250cm9sO1xudmFyIFN3aXRjaCA9IHJlcXVpcmUoJy4vU3dpdGNoJyk7XG5leHBvcnRzLlN3aXRjaCA9IFN3aXRjaDtcbnZhciBUYWJzID0gcmVxdWlyZSgnLi9UYWJzJyk7XG5leHBvcnRzLlRhYnMgPSBUYWJzO1xudmFyIFRleHRhcmVhID0gcmVxdWlyZSgnLi9UZXh0YXJlYScpO1xuXG5leHBvcnRzLlRleHRhcmVhID0gVGV4dGFyZWE7XG4vLyBkZXBlbmRzIG9uIGFib3ZlXG52YXIgSW5wdXQgPSByZXF1aXJlKCcuL0lucHV0Jyk7XG5leHBvcnRzLklucHV0ID0gSW5wdXQ7IiwiLyoqXG4gKiBUd2Vlbi5qcyAtIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9naXRodWIuY29tL3NvbGUvdHdlZW4uanNcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL3NvbGUvdHdlZW4uanMvZ3JhcGhzL2NvbnRyaWJ1dG9ycyBmb3IgdGhlIGZ1bGwgbGlzdCBvZiBjb250cmlidXRvcnMuXG4gKiBUaGFuayB5b3UgYWxsLCB5b3UncmUgYXdlc29tZSFcbiAqL1xuXG4vLyBEYXRlLm5vdyBzaGltIGZvciAoYWhlbSkgSW50ZXJuZXQgRXhwbG8oZHxyKWVyXG5pZiAoIERhdGUubm93ID09PSB1bmRlZmluZWQgKSB7XG5cblx0RGF0ZS5ub3cgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gbmV3IERhdGUoKS52YWx1ZU9mKCk7XG5cblx0fTtcblxufVxuXG52YXIgVFdFRU4gPSBUV0VFTiB8fCAoIGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgX3R3ZWVucyA9IFtdO1xuXG5cdHJldHVybiB7XG5cblx0XHRSRVZJU0lPTjogJzE0JyxcblxuXHRcdGdldEFsbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRyZXR1cm4gX3R3ZWVucztcblxuXHRcdH0sXG5cblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0X3R3ZWVucyA9IFtdO1xuXG5cdFx0fSxcblxuXHRcdGFkZDogZnVuY3Rpb24gKCB0d2VlbiApIHtcblxuXHRcdFx0X3R3ZWVucy5wdXNoKCB0d2VlbiApO1xuXG5cdFx0fSxcblxuXHRcdHJlbW92ZTogZnVuY3Rpb24gKCB0d2VlbiApIHtcblxuXHRcdFx0dmFyIGkgPSBfdHdlZW5zLmluZGV4T2YoIHR3ZWVuICk7XG5cblx0XHRcdGlmICggaSAhPT0gLTEgKSB7XG5cblx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoIGksIDEgKTtcblxuXHRcdFx0fVxuXG5cdFx0fSxcblxuXHRcdHVwZGF0ZTogZnVuY3Rpb24gKCB0aW1lICkge1xuXG5cdFx0XHRpZiAoIF90d2VlbnMubGVuZ3RoID09PSAwICkgcmV0dXJuIGZhbHNlO1xuXG5cdFx0XHR2YXIgaSA9IDA7XG5cblx0XHRcdHRpbWUgPSB0aW1lICE9PSB1bmRlZmluZWQgPyB0aW1lIDogKCB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCAmJiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ICE9PSB1bmRlZmluZWQgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBEYXRlLm5vdygpICk7XG5cblx0XHRcdHdoaWxlICggaSA8IF90d2VlbnMubGVuZ3RoICkge1xuXG5cdFx0XHRcdGlmICggX3R3ZWVuc1sgaSBdLnVwZGF0ZSggdGltZSApICkge1xuXG5cdFx0XHRcdFx0aSsrO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0XHRfdHdlZW5zLnNwbGljZSggaSwgMSApO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdH1cblx0fTtcblxufSApKCk7XG5cblRXRUVOLlR3ZWVuID0gZnVuY3Rpb24gKCBvYmplY3QgKSB7XG5cblx0dmFyIF9vYmplY3QgPSBvYmplY3Q7XG5cdHZhciBfdmFsdWVzU3RhcnQgPSB7fTtcblx0dmFyIF92YWx1ZXNFbmQgPSB7fTtcblx0dmFyIF92YWx1ZXNTdGFydFJlcGVhdCA9IHt9O1xuXHR2YXIgX2R1cmF0aW9uID0gMTAwMDtcblx0dmFyIF9yZXBlYXQgPSAwO1xuXHR2YXIgX3lveW8gPSBmYWxzZTtcblx0dmFyIF9pc1BsYXlpbmcgPSBmYWxzZTtcblx0dmFyIF9yZXZlcnNlZCA9IGZhbHNlO1xuXHR2YXIgX2RlbGF5VGltZSA9IDA7XG5cdHZhciBfc3RhcnRUaW1lID0gbnVsbDtcblx0dmFyIF9lYXNpbmdGdW5jdGlvbiA9IFRXRUVOLkVhc2luZy5MaW5lYXIuTm9uZTtcblx0dmFyIF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLkxpbmVhcjtcblx0dmFyIF9jaGFpbmVkVHdlZW5zID0gW107XG5cdHZhciBfb25TdGFydENhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXHR2YXIgX29uVXBkYXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uQ29tcGxldGVDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdG9wQ2FsbGJhY2sgPSBudWxsO1xuXG5cdC8vIFNldCBhbGwgc3RhcnRpbmcgdmFsdWVzIHByZXNlbnQgb24gdGhlIHRhcmdldCBvYmplY3Rcblx0Zm9yICggdmFyIGZpZWxkIGluIG9iamVjdCApIHtcblxuXHRcdF92YWx1ZXNTdGFydFsgZmllbGQgXSA9IHBhcnNlRmxvYXQob2JqZWN0W2ZpZWxkXSwgMTApO1xuXG5cdH1cblxuXHR0aGlzLnRvID0gZnVuY3Rpb24gKCBwcm9wZXJ0aWVzLCBkdXJhdGlvbiApIHtcblxuXHRcdGlmICggZHVyYXRpb24gIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0X2R1cmF0aW9uID0gZHVyYXRpb247XG5cblx0XHR9XG5cblx0XHRfdmFsdWVzRW5kID0gcHJvcGVydGllcztcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdGFydCA9IGZ1bmN0aW9uICggdGltZSApIHtcblxuXHRcdFRXRUVOLmFkZCggdGhpcyApO1xuXG5cdFx0X2lzUGxheWluZyA9IHRydWU7XG5cblx0XHRfb25TdGFydENhbGxiYWNrRmlyZWQgPSBmYWxzZTtcblxuXHRcdF9zdGFydFRpbWUgPSB0aW1lICE9PSB1bmRlZmluZWQgPyB0aW1lIDogKCB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCAmJiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ICE9PSB1bmRlZmluZWQgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBEYXRlLm5vdygpICk7XG5cdFx0X3N0YXJ0VGltZSArPSBfZGVsYXlUaW1lO1xuXG5cdFx0Zm9yICggdmFyIHByb3BlcnR5IGluIF92YWx1ZXNFbmQgKSB7XG5cblx0XHRcdC8vIGNoZWNrIGlmIGFuIEFycmF5IHdhcyBwcm92aWRlZCBhcyBwcm9wZXJ0eSB2YWx1ZVxuXHRcdFx0aWYgKCBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdIGluc3RhbmNlb2YgQXJyYXkgKSB7XG5cblx0XHRcdFx0aWYgKCBfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdLmxlbmd0aCA9PT0gMCApIHtcblxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBjcmVhdGUgYSBsb2NhbCBjb3B5IG9mIHRoZSBBcnJheSB3aXRoIHRoZSBzdGFydCB2YWx1ZSBhdCB0aGUgZnJvbnRcblx0XHRcdFx0X3ZhbHVlc0VuZFsgcHJvcGVydHkgXSA9IFsgX29iamVjdFsgcHJvcGVydHkgXSBdLmNvbmNhdCggX3ZhbHVlc0VuZFsgcHJvcGVydHkgXSApO1xuXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSA9IF9vYmplY3RbIHByb3BlcnR5IF07XG5cblx0XHRcdGlmKCAoIF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSBpbnN0YW5jZW9mIEFycmF5ICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRfdmFsdWVzU3RhcnRbIHByb3BlcnR5IF0gKj0gMS4wOyAvLyBFbnN1cmVzIHdlJ3JlIHVzaW5nIG51bWJlcnMsIG5vdCBzdHJpbmdzXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSA9IF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSB8fCAwO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRpZiAoICFfaXNQbGF5aW5nICkge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0VFdFRU4ucmVtb3ZlKCB0aGlzICk7XG5cdFx0X2lzUGxheWluZyA9IGZhbHNlO1xuXG5cdFx0aWYgKCBfb25TdG9wQ2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdF9vblN0b3BDYWxsYmFjay5jYWxsKCBfb2JqZWN0ICk7XG5cblx0XHR9XG5cblx0XHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0Zm9yICggdmFyIGkgPSAwLCBudW1DaGFpbmVkVHdlZW5zID0gX2NoYWluZWRUd2VlbnMubGVuZ3RoOyBpIDwgbnVtQ2hhaW5lZFR3ZWVuczsgaSsrICkge1xuXG5cdFx0XHRfY2hhaW5lZFR3ZWVuc1sgaSBdLnN0b3AoKTtcblxuXHRcdH1cblxuXHR9O1xuXG5cdHRoaXMuZGVsYXkgPSBmdW5jdGlvbiAoIGFtb3VudCApIHtcblxuXHRcdF9kZWxheVRpbWUgPSBhbW91bnQ7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnJlcGVhdCA9IGZ1bmN0aW9uICggdGltZXMgKSB7XG5cblx0XHRfcmVwZWF0ID0gdGltZXM7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnlveW8gPSBmdW5jdGlvbiggeW95byApIHtcblxuXHRcdF95b3lvID0geW95bztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cblx0dGhpcy5lYXNpbmcgPSBmdW5jdGlvbiAoIGVhc2luZyApIHtcblxuXHRcdF9lYXNpbmdGdW5jdGlvbiA9IGVhc2luZztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuaW50ZXJwb2xhdGlvbiA9IGZ1bmN0aW9uICggaW50ZXJwb2xhdGlvbiApIHtcblxuXHRcdF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBpbnRlcnBvbGF0aW9uO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5jaGFpbiA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdF9jaGFpbmVkVHdlZW5zID0gYXJndW1lbnRzO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0YXJ0ID0gZnVuY3Rpb24gKCBjYWxsYmFjayApIHtcblxuXHRcdF9vblN0YXJ0Q2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25VcGRhdGUgPSBmdW5jdGlvbiAoIGNhbGxiYWNrICkge1xuXG5cdFx0X29uVXBkYXRlQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25Db21wbGV0ZSA9IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHRfb25Db21wbGV0ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uU3RvcCA9IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHRfb25TdG9wQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKCB0aW1lICkge1xuXG5cdFx0dmFyIHByb3BlcnR5O1xuXG5cdFx0aWYgKCB0aW1lIDwgX3N0YXJ0VGltZSApIHtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHR9XG5cblx0XHRpZiAoIF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9PT0gZmFsc2UgKSB7XG5cblx0XHRcdGlmICggX29uU3RhcnRDYWxsYmFjayAhPT0gbnVsbCApIHtcblxuXHRcdFx0XHRfb25TdGFydENhbGxiYWNrLmNhbGwoIF9vYmplY3QgKTtcblxuXHRcdFx0fVxuXG5cdFx0XHRfb25TdGFydENhbGxiYWNrRmlyZWQgPSB0cnVlO1xuXG5cdFx0fVxuXG5cdFx0dmFyIGVsYXBzZWQgPSAoIHRpbWUgLSBfc3RhcnRUaW1lICkgLyBfZHVyYXRpb247XG5cdFx0ZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cblx0XHR2YXIgdmFsdWUgPSBfZWFzaW5nRnVuY3Rpb24oIGVsYXBzZWQgKTtcblxuXHRcdGZvciAoIHByb3BlcnR5IGluIF92YWx1ZXNFbmQgKSB7XG5cblx0XHRcdHZhciBzdGFydCA9IF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSB8fCAwO1xuXHRcdFx0dmFyIGVuZCA9IF92YWx1ZXNFbmRbIHByb3BlcnR5IF07XG5cblx0XHRcdGlmICggZW5kIGluc3RhbmNlb2YgQXJyYXkgKSB7XG5cblx0XHRcdFx0X29iamVjdFsgcHJvcGVydHkgXSA9IF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24oIGVuZCwgdmFsdWUgKTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHQvLyBQYXJzZXMgcmVsYXRpdmUgZW5kIHZhbHVlcyB3aXRoIHN0YXJ0IGFzIGJhc2UgKGUuZy46ICsxMCwgLTMpXG5cdFx0XHRcdGlmICggdHlwZW9mKGVuZCkgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdFx0ZW5kID0gc3RhcnQgKyBwYXJzZUZsb2F0KGVuZCwgMTApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gcHJvdGVjdCBhZ2FpbnN0IG5vbiBudW1lcmljIHByb3BlcnRpZXMuXG5cdFx0XHRcdGlmICggdHlwZW9mKGVuZCkgPT09IFwibnVtYmVyXCIgKSB7XG5cdFx0XHRcdFx0X29iamVjdFsgcHJvcGVydHkgXSA9IHN0YXJ0ICsgKCBlbmQgLSBzdGFydCApICogdmFsdWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0aWYgKCBfb25VcGRhdGVDYWxsYmFjayAhPT0gbnVsbCApIHtcblxuXHRcdFx0X29uVXBkYXRlQ2FsbGJhY2suY2FsbCggX29iamVjdCwgdmFsdWUgKTtcblxuXHRcdH1cblxuXHRcdGlmICggZWxhcHNlZCA9PSAxICkge1xuXG5cdFx0XHRpZiAoIF9yZXBlYXQgPiAwICkge1xuXG5cdFx0XHRcdGlmKCBpc0Zpbml0ZSggX3JlcGVhdCApICkge1xuXHRcdFx0XHRcdF9yZXBlYXQtLTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHJlYXNzaWduIHN0YXJ0aW5nIHZhbHVlcywgcmVzdGFydCBieSBtYWtpbmcgc3RhcnRUaW1lID0gbm93XG5cdFx0XHRcdGZvciggcHJvcGVydHkgaW4gX3ZhbHVlc1N0YXJ0UmVwZWF0ICkge1xuXG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YoIF92YWx1ZXNFbmRbIHByb3BlcnR5IF0gKSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSA9IF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSArIHBhcnNlRmxvYXQoX3ZhbHVlc0VuZFsgcHJvcGVydHkgXSwgMTApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChfeW95bykge1xuXHRcdFx0XHRcdFx0dmFyIHRtcCA9IF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXTtcblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXSA9IF92YWx1ZXNFbmRbIHByb3BlcnR5IF07XG5cdFx0XHRcdFx0XHRfdmFsdWVzRW5kWyBwcm9wZXJ0eSBdID0gdG1wO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdF92YWx1ZXNTdGFydFsgcHJvcGVydHkgXSA9IF92YWx1ZXNTdGFydFJlcGVhdFsgcHJvcGVydHkgXTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF95b3lvKSB7XG5cdFx0XHRcdFx0X3JldmVyc2VkID0gIV9yZXZlcnNlZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdF9zdGFydFRpbWUgPSB0aW1lICsgX2RlbGF5VGltZTtcblxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAoIF9vbkNvbXBsZXRlQ2FsbGJhY2sgIT09IG51bGwgKSB7XG5cblx0XHRcdFx0XHRfb25Db21wbGV0ZUNhbGxiYWNrLmNhbGwoIF9vYmplY3QgKTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICggdmFyIGkgPSAwLCBudW1DaGFpbmVkVHdlZW5zID0gX2NoYWluZWRUd2VlbnMubGVuZ3RoOyBpIDwgbnVtQ2hhaW5lZFR3ZWVuczsgaSsrICkge1xuXG5cdFx0XHRcdFx0X2NoYWluZWRUd2VlbnNbIGkgXS5zdGFydCggdGltZSApO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXG5cdH07XG5cbn07XG5cblxuVFdFRU4uRWFzaW5nID0ge1xuXG5cdExpbmVhcjoge1xuXG5cdFx0Tm9uZTogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gaztcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1YWRyYXRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqICggMiAtIGsgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIGsgKiBrO1xuXHRcdFx0cmV0dXJuIC0gMC41ICogKCAtLWsgKiAoIGsgLSAyICkgLSAxICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRDdWJpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiBrICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIGsgKiBrICogaztcblx0XHRcdHJldHVybiAwLjUgKiAoICggayAtPSAyICkgKiBrICogayArIDIgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1YXJ0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtICggLS1rICogayAqIGsgKiBrICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSkgcmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGs7XG5cdFx0XHRyZXR1cm4gLSAwLjUgKiAoICggayAtPSAyICkgKiBrICogayAqIGsgLSAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWludGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogayAqIGsgKiBrICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggKCBrIC09IDIgKSAqIGsgKiBrICogayAqIGsgKyAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRTaW51c29pZGFsOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguY29zKCBrICogTWF0aC5QSSAvIDIgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc2luKCBrICogTWF0aC5QSSAvIDIgKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gMC41ICogKCAxIC0gTWF0aC5jb3MoIE1hdGguUEkgKiBrICkgKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEV4cG9uZW50aWFsOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMCA/IDAgOiBNYXRoLnBvdyggMTAyNCwgayAtIDEgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIGsgPT09IDEgPyAxIDogMSAtIE1hdGgucG93KCAyLCAtIDEwICogayApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIDAuNSAqIE1hdGgucG93KCAxMDI0LCBrIC0gMSApO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggLSBNYXRoLnBvdyggMiwgLSAxMCAqICggayAtIDEgKSApICsgMiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Q2lyY3VsYXI6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAxIC0gTWF0aC5zcXJ0KCAxIC0gayAqIGsgKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc3FydCggMSAtICggLS1rICogayApICk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uICggayApIHtcblxuXHRcdFx0aWYgKCAoIGsgKj0gMiApIDwgMSkgcmV0dXJuIC0gMC41ICogKCBNYXRoLnNxcnQoIDEgLSBrICogaykgLSAxKTtcblx0XHRcdHJldHVybiAwLjUgKiAoIE1hdGguc3FydCggMSAtICggayAtPSAyKSAqIGspICsgMSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRFbGFzdGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcywgYSA9IDAuMSwgcCA9IDAuNDtcblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICFhIHx8IGEgPCAxICkgeyBhID0gMTsgcyA9IHAgLyA0OyB9XG5cdFx0XHRlbHNlIHMgPSBwICogTWF0aC5hc2luKCAxIC8gYSApIC8gKCAyICogTWF0aC5QSSApO1xuXHRcdFx0cmV0dXJuIC0gKCBhICogTWF0aC5wb3coIDIsIDEwICogKCBrIC09IDEgKSApICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSApO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcywgYSA9IDAuMSwgcCA9IDAuNDtcblx0XHRcdGlmICggayA9PT0gMCApIHJldHVybiAwO1xuXHRcdFx0aWYgKCBrID09PSAxICkgcmV0dXJuIDE7XG5cdFx0XHRpZiAoICFhIHx8IGEgPCAxICkgeyBhID0gMTsgcyA9IHAgLyA0OyB9XG5cdFx0XHRlbHNlIHMgPSBwICogTWF0aC5hc2luKCAxIC8gYSApIC8gKCAyICogTWF0aC5QSSApO1xuXHRcdFx0cmV0dXJuICggYSAqIE1hdGgucG93KCAyLCAtIDEwICogaykgKiBNYXRoLnNpbiggKCBrIC0gcyApICogKCAyICogTWF0aC5QSSApIC8gcCApICsgMSApO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzLCBhID0gMC4xLCBwID0gMC40O1xuXHRcdFx0aWYgKCBrID09PSAwICkgcmV0dXJuIDA7XG5cdFx0XHRpZiAoIGsgPT09IDEgKSByZXR1cm4gMTtcblx0XHRcdGlmICggIWEgfHwgYSA8IDEgKSB7IGEgPSAxOyBzID0gcCAvIDQ7IH1cblx0XHRcdGVsc2UgcyA9IHAgKiBNYXRoLmFzaW4oIDEgLyBhICkgLyAoIDIgKiBNYXRoLlBJICk7XG5cdFx0XHRpZiAoICggayAqPSAyICkgPCAxICkgcmV0dXJuIC0gMC41ICogKCBhICogTWF0aC5wb3coIDIsIDEwICogKCBrIC09IDEgKSApICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSApO1xuXHRcdFx0cmV0dXJuIGEgKiBNYXRoLnBvdyggMiwgLTEwICogKCBrIC09IDEgKSApICogTWF0aC5zaW4oICggayAtIHMgKSAqICggMiAqIE1hdGguUEkgKSAvIHAgKSAqIDAuNSArIDE7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCYWNrOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XG5cdFx0XHRyZXR1cm4gayAqIGsgKiAoICggcyArIDEgKSAqIGsgLSBzICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1ODtcblx0XHRcdHJldHVybiAtLWsgKiBrICogKCAoIHMgKyAxICkgKiBrICsgcyApICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKCBrICkge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTggKiAxLjUyNTtcblx0XHRcdGlmICggKCBrICo9IDIgKSA8IDEgKSByZXR1cm4gMC41ICogKCBrICogayAqICggKCBzICsgMSApICogayAtIHMgKSApO1xuXHRcdFx0cmV0dXJuIDAuNSAqICggKCBrIC09IDIgKSAqIGsgKiAoICggcyArIDEgKSAqIGsgKyBzICkgKyAyICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCb3VuY2U6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdHJldHVybiAxIC0gVFdFRU4uRWFzaW5nLkJvdW5jZS5PdXQoIDEgLSBrICk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggayA8ICggMSAvIDIuNzUgKSApIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogayAqIGs7XG5cblx0XHRcdH0gZWxzZSBpZiAoIGsgPCAoIDIgLyAyLjc1ICkgKSB7XG5cblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqICggayAtPSAoIDEuNSAvIDIuNzUgKSApICogayArIDAuNzU7XG5cblx0XHRcdH0gZWxzZSBpZiAoIGsgPCAoIDIuNSAvIDIuNzUgKSApIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKCBrIC09ICggMi4yNSAvIDIuNzUgKSApICogayArIDAuOTM3NTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKCBrIC09ICggMi42MjUgLyAyLjc1ICkgKSAqIGsgKyAwLjk4NDM3NTtcblxuXHRcdFx0fVxuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoIGsgKSB7XG5cblx0XHRcdGlmICggayA8IDAuNSApIHJldHVybiBUV0VFTi5FYXNpbmcuQm91bmNlLkluKCBrICogMiApICogMC41O1xuXHRcdFx0cmV0dXJuIFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KCBrICogMiAtIDEgKSAqIDAuNSArIDAuNTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cblRXRUVOLkludGVycG9sYXRpb24gPSB7XG5cblx0TGluZWFyOiBmdW5jdGlvbiAoIHYsIGsgKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMSwgZiA9IG0gKiBrLCBpID0gTWF0aC5mbG9vciggZiApLCBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuTGluZWFyO1xuXG5cdFx0aWYgKCBrIDwgMCApIHJldHVybiBmbiggdlsgMCBdLCB2WyAxIF0sIGYgKTtcblx0XHRpZiAoIGsgPiAxICkgcmV0dXJuIGZuKCB2WyBtIF0sIHZbIG0gLSAxIF0sIG0gLSBmICk7XG5cblx0XHRyZXR1cm4gZm4oIHZbIGkgXSwgdlsgaSArIDEgPiBtID8gbSA6IGkgKyAxIF0sIGYgLSBpICk7XG5cblx0fSxcblxuXHRCZXppZXI6IGZ1bmN0aW9uICggdiwgayApIHtcblxuXHRcdHZhciBiID0gMCwgbiA9IHYubGVuZ3RoIC0gMSwgcHcgPSBNYXRoLnBvdywgYm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkJlcm5zdGVpbiwgaTtcblxuXHRcdGZvciAoIGkgPSAwOyBpIDw9IG47IGkrKyApIHtcblx0XHRcdGIgKz0gcHcoIDEgLSBrLCBuIC0gaSApICogcHcoIGssIGkgKSAqIHZbIGkgXSAqIGJuKCBuLCBpICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGI7XG5cblx0fSxcblxuXHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAoIHYsIGsgKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMSwgZiA9IG0gKiBrLCBpID0gTWF0aC5mbG9vciggZiApLCBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuQ2F0bXVsbFJvbTtcblxuXHRcdGlmICggdlsgMCBdID09PSB2WyBtIF0gKSB7XG5cblx0XHRcdGlmICggayA8IDAgKSBpID0gTWF0aC5mbG9vciggZiA9IG0gKiAoIDEgKyBrICkgKTtcblxuXHRcdFx0cmV0dXJuIGZuKCB2WyAoIGkgLSAxICsgbSApICUgbSBdLCB2WyBpIF0sIHZbICggaSArIDEgKSAlIG0gXSwgdlsgKCBpICsgMiApICUgbSBdLCBmIC0gaSApO1xuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0aWYgKCBrIDwgMCApIHJldHVybiB2WyAwIF0gLSAoIGZuKCB2WyAwIF0sIHZbIDAgXSwgdlsgMSBdLCB2WyAxIF0sIC1mICkgLSB2WyAwIF0gKTtcblx0XHRcdGlmICggayA+IDEgKSByZXR1cm4gdlsgbSBdIC0gKCBmbiggdlsgbSBdLCB2WyBtIF0sIHZbIG0gLSAxIF0sIHZbIG0gLSAxIF0sIGYgLSBtICkgLSB2WyBtIF0gKTtcblxuXHRcdFx0cmV0dXJuIGZuKCB2WyBpID8gaSAtIDEgOiAwIF0sIHZbIGkgXSwgdlsgbSA8IGkgKyAxID8gbSA6IGkgKyAxIF0sIHZbIG0gPCBpICsgMiA/IG0gOiBpICsgMiBdLCBmIC0gaSApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0VXRpbHM6IHtcblxuXHRcdExpbmVhcjogZnVuY3Rpb24gKCBwMCwgcDEsIHQgKSB7XG5cblx0XHRcdHJldHVybiAoIHAxIC0gcDAgKSAqIHQgKyBwMDtcblxuXHRcdH0sXG5cblx0XHRCZXJuc3RlaW46IGZ1bmN0aW9uICggbiAsIGkgKSB7XG5cblx0XHRcdHZhciBmYyA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuRmFjdG9yaWFsO1xuXHRcdFx0cmV0dXJuIGZjKCBuICkgLyBmYyggaSApIC8gZmMoIG4gLSBpICk7XG5cblx0XHR9LFxuXG5cdFx0RmFjdG9yaWFsOiAoIGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0dmFyIGEgPSBbIDEgXTtcblxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uICggbiApIHtcblxuXHRcdFx0XHR2YXIgcyA9IDEsIGk7XG5cdFx0XHRcdGlmICggYVsgbiBdICkgcmV0dXJuIGFbIG4gXTtcblx0XHRcdFx0Zm9yICggaSA9IG47IGkgPiAxOyBpLS0gKSBzICo9IGk7XG5cdFx0XHRcdHJldHVybiBhWyBuIF0gPSBzO1xuXG5cdFx0XHR9O1xuXG5cdFx0fSApKCksXG5cblx0XHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAoIHAwLCBwMSwgcDIsIHAzLCB0ICkge1xuXG5cdFx0XHR2YXIgdjAgPSAoIHAyIC0gcDAgKSAqIDAuNSwgdjEgPSAoIHAzIC0gcDEgKSAqIDAuNSwgdDIgPSB0ICogdCwgdDMgPSB0ICogdDI7XG5cdFx0XHRyZXR1cm4gKCAyICogcDEgLSAyICogcDIgKyB2MCArIHYxICkgKiB0MyArICggLSAzICogcDEgKyAzICogcDIgLSAyICogdjAgLSB2MSApICogdDIgKyB2MCAqIHQgKyBwMTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzPVRXRUVOOyIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0L2FkZG9ucycpO1xudmFyIHtcblx0Q29udGFpbmVyLFxuXHRjcmVhdGVBcHAsXG5cdFVJLFxuXHRWaWV3LFxuXHRWaWV3TWFuYWdlclxufSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpO1xuXG4vLyBBcHAgQ29uZmlnXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxudmFyIFBlb3BsZVN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZXMvcGVvcGxlJylcbnZhciBwZW9wbGVTdG9yZSA9IG5ldyBQZW9wbGVTdG9yZSgpXG5cbnZhciBBcHAgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW2NyZWF0ZUFwcCgpXSxcblxuXHRjaGlsZENvbnRleHRUeXBlczoge1xuXHRcdHBlb3BsZVN0b3JlOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0XG5cdH0sXG5cblx0Z2V0Q2hpbGRDb250ZXh0ICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGVvcGxlU3RvcmU6IHBlb3BsZVN0b3JlXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXIgKCkge1xuXHRcdHZhciBhcHBXcmFwcGVyQ2xhc3NOYW1lID0gJ2FwcC13cmFwcGVyIGRldmljZS0tJyArICh3aW5kb3cuZGV2aWNlIHx8IHt9KS5wbGF0Zm9ybVxuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPXthcHBXcmFwcGVyQ2xhc3NOYW1lfT5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJkZXZpY2Utc2lsaG91ZXR0ZVwiPlxuXHRcdFx0XHRcdDxWaWV3TWFuYWdlciBuYW1lPVwiYXBwXCIgZGVmYXVsdFZpZXc9XCJtYWluXCI+XG5cdFx0XHRcdFx0XHQ8VmlldyBuYW1lPVwibWFpblwiIGNvbXBvbmVudD17TWFpblZpZXdDb250cm9sbGVyfSAvPlxuXHRcdFx0XHRcdFx0PFZpZXcgbmFtZT1cInRyYW5zaXRpb25zLXRhcmdldC1vdmVyXCIgY29tcG9uZW50PXtyZXF1aXJlKCcuL3ZpZXdzL3RyYW5zaXRpb25zLXRhcmdldC1vdmVyJyl9IC8+XG5cdFx0XHRcdFx0PC9WaWV3TWFuYWdlcj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59KTtcblxuLy8gTWFpbiBDb250cm9sbGVyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxudmFyIE1haW5WaWV3Q29udHJvbGxlciA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0cmVuZGVyICgpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lcj5cblx0XHRcdFx0PFVJLk5hdmlnYXRpb25CYXIgbmFtZT1cIm1haW5cIiAvPlxuXHRcdFx0XHQ8Vmlld01hbmFnZXIgbmFtZT1cIm1haW5cIiBkZWZhdWx0Vmlldz1cInRhYnNcIj5cblx0XHRcdFx0XHQ8VmlldyBuYW1lPVwidGFic1wiIGNvbXBvbmVudD17VGFiVmlld0NvbnRyb2xsZXJ9IC8+XG5cdFx0XHRcdDwvVmlld01hbmFnZXI+XG5cdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHQpO1xuXHR9XG59KTtcblxuLy8gVGFiIENvbnRyb2xsZXJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG52YXIgbGFzdFNlbGVjdGVkVGFiID0gJ2xpc3RzJ1xudmFyIFRhYlZpZXdDb250cm9sbGVyID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRnZXRJbml0aWFsU3RhdGUgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzZWxlY3RlZFRhYjogbGFzdFNlbGVjdGVkVGFiXG5cdFx0fTtcblx0fSxcblxuXHRvblZpZXdDaGFuZ2UgKG5leHRWaWV3KSB7XG5cdFx0bGFzdFNlbGVjdGVkVGFiID0gbmV4dFZpZXdcblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0c2VsZWN0ZWRUYWI6IG5leHRWaWV3XG5cdFx0fSk7XG5cdH0sXG5cblx0c2VsZWN0VGFiICh2YWx1ZSkge1xuXHRcdHZhciB2aWV3UHJvcHM7XG5cblx0XHR0aGlzLnJlZnMudm0udHJhbnNpdGlvblRvKHZhbHVlLCB7XG5cdFx0XHR0cmFuc2l0aW9uOiAnaW5zdGFudCcsXG5cdFx0XHR2aWV3UHJvcHM6IHZpZXdQcm9wc1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRzZWxlY3RlZFRhYjogdmFsdWVcblx0XHR9KVxuXHR9LFxuXG5cdHJlbmRlciAoKSB7XG5cdFx0dmFyIHNlbGVjdGVkVGFiID0gdGhpcy5zdGF0ZS5zZWxlY3RlZFRhYlxuXHRcdHZhciBzZWxlY3RlZFRhYlNwYW4gPSBzZWxlY3RlZFRhYlxuXG5cdFx0aWYgKHNlbGVjdGVkVGFiID09PSAnbGlzdHMnIHx8IHNlbGVjdGVkVGFiID09PSAnbGlzdC1zaW1wbGUnIHx8IHNlbGVjdGVkVGFiID09PSAnbGlzdC1jb21wbGV4JyB8fCBzZWxlY3RlZFRhYiA9PT0gJ2xpc3QtZGV0YWlscycpIHtcblx0XHRcdHNlbGVjdGVkVGFiU3BhbiA9ICdsaXN0cyc7XG5cdFx0fVxuXG5cdFx0aWYgKHNlbGVjdGVkVGFiID09PSAndHJhbnNpdGlvbnMnIHx8IHNlbGVjdGVkVGFiID09PSAndHJhbnNpdGlvbnMtdGFyZ2V0Jykge1xuXHRcdFx0c2VsZWN0ZWRUYWJTcGFuID0gJ3RyYW5zaXRpb25zJztcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lcj5cblx0XHRcdFx0PFZpZXdNYW5hZ2VyIHJlZj1cInZtXCIgbmFtZT1cInRhYnNcIiBkZWZhdWx0Vmlldz17c2VsZWN0ZWRUYWJ9IG9uVmlld0NoYW5nZT17dGhpcy5vblZpZXdDaGFuZ2V9PlxuXHRcdFx0XHRcdDxWaWV3IG5hbWU9XCJsaXN0c1wiIGNvbXBvbmVudD17cmVxdWlyZSgnLi92aWV3cy9saXN0cycpfSAvPlxuXHRcdFx0XHRcdDxWaWV3IG5hbWU9XCJsaXN0LXNpbXBsZVwiIGNvbXBvbmVudD17cmVxdWlyZSgnLi92aWV3cy9saXN0LXNpbXBsZScpfSAvPlxuXHRcdFx0XHRcdDxWaWV3IG5hbWU9XCJsaXN0LWNvbXBsZXhcIiBjb21wb25lbnQ9e3JlcXVpcmUoJy4vdmlld3MvbGlzdC1jb21wbGV4Jyl9IC8+XG5cdFx0XHRcdFx0PFZpZXcgbmFtZT1cImxpc3QtZGV0YWlsc1wiIGNvbXBvbmVudD17cmVxdWlyZSgnLi92aWV3cy9saXN0LWRldGFpbHMnKX0gLz5cblx0XHRcdFx0XHQ8VmlldyBuYW1lPVwiZm9ybVwiIGNvbXBvbmVudD17cmVxdWlyZSgnLi92aWV3cy9mb3JtJyl9IC8+XG5cdFx0XHRcdFx0PFZpZXcgbmFtZT1cImNvbnRyb2xzXCIgY29tcG9uZW50PXtyZXF1aXJlKCcuL3ZpZXdzL2NvbnRyb2xzJyl9IC8+XG5cdFx0XHRcdFx0PFZpZXcgbmFtZT1cInRyYW5zaXRpb25zXCIgY29tcG9uZW50PXtyZXF1aXJlKCcuL3ZpZXdzL3RyYW5zaXRpb25zJyl9IC8+XG5cdFx0XHRcdFx0PFZpZXcgbmFtZT1cInRyYW5zaXRpb25zLXRhcmdldFwiIGNvbXBvbmVudD17cmVxdWlyZSgnLi92aWV3cy90cmFuc2l0aW9ucy10YXJnZXQnKX0gLz5cblx0XHRcdFx0PC9WaWV3TWFuYWdlcj5cblx0XHRcdFx0PFVJLlRhYnMuTmF2aWdhdG9yPlxuXHRcdFx0XHRcdDxVSS5UYWJzLlRhYiBvblRhcD17dGhpcy5zZWxlY3RUYWIuYmluZCh0aGlzLCAnbGlzdHMnKX0gc2VsZWN0ZWQ9e3NlbGVjdGVkVGFiU3BhbiA9PT0gJ2xpc3RzJ30+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9XCJUYWJzLUljb24gVGFicy1JY29uLS1saXN0c1wiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuVGFicy5MYWJlbD5MaXN0czwvVUkuVGFicy5MYWJlbD5cblx0XHRcdFx0XHQ8L1VJLlRhYnMuVGFiPlxuXHRcdFx0XHRcdDxVSS5UYWJzLlRhYiBvblRhcD17dGhpcy5zZWxlY3RUYWIuYmluZCh0aGlzLCAnZm9ybScpfSBzZWxlY3RlZD17c2VsZWN0ZWRUYWJTcGFuID09PSAnZm9ybSd9PlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiVGFicy1JY29uIFRhYnMtSWNvbi0tZm9ybXNcIiAvPlxuXHRcdFx0XHRcdFx0PFVJLlRhYnMuTGFiZWw+Rm9ybXM8L1VJLlRhYnMuTGFiZWw+XG5cdFx0XHRcdFx0PC9VSS5UYWJzLlRhYj5cblx0XHRcdFx0XHQ8VUkuVGFicy5UYWIgb25UYXA9e3RoaXMuc2VsZWN0VGFiLmJpbmQodGhpcywgJ2NvbnRyb2xzJyl9IHNlbGVjdGVkPXtzZWxlY3RlZFRhYlNwYW4gPT09ICdjb250cm9scyd9PlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiVGFicy1JY29uIFRhYnMtSWNvbi0tY29udHJvbHNcIiAvPlxuXHRcdFx0XHRcdFx0PFVJLlRhYnMuTGFiZWw+Q29udHJvbHM8L1VJLlRhYnMuTGFiZWw+XG5cdFx0XHRcdFx0PC9VSS5UYWJzLlRhYj5cblx0XHRcdFx0XHQ8VUkuVGFicy5UYWIgb25UYXA9e3RoaXMuc2VsZWN0VGFiLmJpbmQodGhpcywgJ3RyYW5zaXRpb25zJyl9IHNlbGVjdGVkPXtzZWxlY3RlZFRhYlNwYW4gPT09ICd0cmFuc2l0aW9ucyd9PlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiVGFicy1JY29uIFRhYnMtSWNvbi0tdHJhbnNpdGlvbnNcIiAvPlxuXHRcdFx0XHRcdFx0PFVJLlRhYnMuTGFiZWw+VHJhbnNpdGlvbnM8L1VJLlRhYnMuTGFiZWw+XG5cdFx0XHRcdFx0PC9VSS5UYWJzLlRhYj5cblx0XHRcdFx0PC9VSS5UYWJzLk5hdmlnYXRvcj5cblx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdCk7XG5cdH1cbn0pO1xuXG5mdW5jdGlvbiBzdGFydEFwcCAoKSB7XG5cdGlmICh3aW5kb3cuU3RhdHVzQmFyKSB7XG5cdFx0d2luZG93LlN0YXR1c0Jhci5zdHlsZURlZmF1bHQoKTtcblx0fVxuXG5cdFJlYWN0LnJlbmRlcig8QXBwIC8+LCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJykpO1xufVxuXG5pZiAoIXdpbmRvdy5jb3Jkb3ZhKSB7XG5cdHN0YXJ0QXBwKCk7XG5cbn0gZWxzZSB7XG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5Jywgc3RhcnRBcHAsIGZhbHNlKTtcbn1cbiIsInZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcblxudmFyIGFzeW5jID0gcmVxdWlyZSgnYXN5bmMnKVxudmFyIGh0dHBpZnkgPSByZXF1aXJlKCdodHRwaWZ5JylcblxuZnVuY3Rpb24gUGVvcGxlU3RvcmUgKCkge1xuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKVxuXG5cdC8vIGluaXRpYWxpemUgaW50ZXJuYWwgY2FjaGVcblx0dmFyIHN0b3JhZ2UgPSB0aGlzLmNhY2hlID0ge1xuXHRcdHBlb3BsZTogW11cblx0fVxuXHR2YXIgc2VsZiA9IHRoaXNcblxuXHQvLyBEaXNwYXRjaGVyc1xuXHR0aGlzLnN0YXJRdWV1ZSA9IGFzeW5jLnF1ZXVlKChkYXRhLCBjYWxsYmFjaykgPT4ge1xuXHRcdHZhciB7IGlkLCBzdGFycmVkIH0gPSBkYXRhXG5cblx0XHQvLyB1cGRhdGUgaW50ZXJuYWwgZGF0YVxuXHRcdHNlbGYuY2FjaGUucGVvcGxlXG5cdFx0XHQuZmlsdGVyKHBlcnNvbiA9PiBwZXJzb24uaWQgPT09IGlkKVxuXHRcdFx0LmZvckVhY2gocGVyc29uID0+IHBlcnNvbi5pc1N0YXJyZWQgPSBzdGFycmVkKVxuXG5cdFx0Ly8gZW1pdCBldmVudHNcblx0XHRzZWxmLmVtaXQoJ3Blb3BsZS11cGRhdGVkJywgc3RvcmFnZS5wZW9wbGUpXG5cblx0XHRjYWxsYmFjaygpXG5cdH0sIDEpXG5cblx0dGhpcy5yZWZyZXNoUXVldWUgPSBhc3luYy5xdWV1ZSgoXywgY2FsbGJhY2spID0+IHtcblx0XHQvLyB1cGRhdGVcblx0XHRodHRwaWZ5KHtcblx0XHRcdG1ldGhvZDogJ0dFVCcsXG5cdFx0XHR0eXBlOiAnanNvbnAnLFxuXHRcdFx0Ly91cmw6ICdodHRwczovL3JhbmRvbXVzZXIubWUvYXBpP25hdD1hdSZyZXN1bHRzPTEwJ1xuXHRcdFx0Ly91cmw6ICdodHRwczovL3d3dy5nb29nbGUuY29tL3NlYXJjaD9obD1qYSZudW09MTAwJnE9YWJjJ1xuXHRcdFx0Ly91cmw6ICdodHRwczovL3RoZWNhdGFwaS5jb20vYXBpL2ltYWdlcy9nZXQ/YXBpX2tleT1Namd5TmpjJmZvcm1hdD1zcmMmdHlwZT1naWYnXG5cdFx0XHR1cmw6ICdodHRwczovL2l0dW5lcy5hcHBsZS5jb20vc2VhcmNoP2NhbGxiYWNrPWFuZ3VsYXIuY2FsbGJhY2tzLl8xJmVudGl0eT0mdGVybT1BbGljaWErS2V5cydcblx0XHRcdC8vdXJsOiAnaHR0cDovL3RoZWNhdGFwaS5jb20vYXBpL2ltYWdlcy9nZXQ/YXBpX2tleT1Namd5TmpjJnN1Yl9pZD0xMjM0NSdcblx0XHR9LCBmdW5jdGlvbiAoZXJyLCByZXMpIHtcblx0XHRcdGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpXG5cblx0XHRcdHN0b3JhZ2UucGVvcGxlID0gcmVzLmJvZHkucmVzdWx0cy5tYXAocCA9PiBwLnVzZXIpXG5cdFx0XHRcblx0XHRcdC8vIHBvc3QgcHJvY2VzcyBuZXcgZGF0YVxuXHRcdFx0c3RvcmFnZS5wZW9wbGUuZm9yRWFjaCgocGVyc29uLCBpKSA9PiB7XG5cdFx0XHRcdHBlcnNvbi5pZCA9IGlcblx0XHRcdFx0cGVyc29uLm5hbWUuZmlyc3QgPSBwZXJzb24ubmFtZS5maXJzdFswXS50b1VwcGVyQ2FzZSgpICsgcGVyc29uLm5hbWUuZmlyc3Quc2xpY2UoMSlcblx0XHRcdFx0cGVyc29uLm5hbWUubGFzdCA9IHBlcnNvbi5uYW1lLmxhc3RbMF0udG9VcHBlckNhc2UoKSArIHBlcnNvbi5uYW1lLmxhc3Quc2xpY2UoMSlcblx0XHRcdFx0cGVyc29uLm5hbWUuaW5pdGlhbHMgPSBwZXJzb24ubmFtZS5maXJzdFswXSArIHBlcnNvbi5uYW1lLmxhc3RbMF1cblx0XHRcdFx0cGVyc29uLm5hbWUuZnVsbCA9IHBlcnNvbi5uYW1lLmZpcnN0ICsgJyAnICsgcGVyc29uLm5hbWUubGFzdFxuXHRcdFx0XHRwZXJzb24uY2F0ZWdvcnkgPSBNYXRoLnJhbmRvbSgpID4gMC41ID8gJ0EnIDogJ0InXG5cdFx0XHRcdHBlcnNvbi5naXRodWIgPSBwZXJzb24ubmFtZS5maXJzdC50b0xvd2VyQ2FzZSgpICsgcGVyc29uLm5hbWUubGFzdC50b0xvd2VyQ2FzZSgpXG5cdFx0XHRcdHBlcnNvbi5waWN0dXJlID0gcGVyc29uLnBpY3R1cmUubWVkaXVtXG5cdFx0XHRcdHBlcnNvbi50d2l0dGVyID0gJ0AnICsgcGVyc29uLm5hbWUuZmlyc3QudG9Mb3dlckNhc2UoKSArIChNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKS5zbGljZSgyLCA1KSlcblx0XHRcdH0pXG5cblx0XHRcdC8vIGVtaXQgZXZlbnRzXG5cdFx0XHRzZWxmLmVtaXQoJ3Blb3BsZS11cGRhdGVkJywgc3RvcmFnZS5wZW9wbGUpXG5cdFx0XHRzZWxmLmVtaXQoJ3JlZnJlc2gnKVxuXG5cdFx0XHRjYWxsYmFjayhudWxsLCBzdG9yYWdlLnBlb3BsZSlcblx0XHR9KVxuXHR9LCAxKVxuXG5cdC8vIHJlZnJlc2ggaW1tZWRpYXRlbHlcblx0dGhpcy5yZWZyZXNoKClcbn1cblxuT2JqZWN0LmFzc2lnbihQZW9wbGVTdG9yZS5wcm90b3R5cGUsIEV2ZW50RW1pdHRlci5wcm90b3R5cGUpXG5cbi8vIEludGVudHNcblBlb3BsZVN0b3JlLnByb3RvdHlwZS5yZWZyZXNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cdHRoaXMucmVmcmVzaFF1ZXVlLnB1c2gobnVsbCwgY2FsbGJhY2spXG59XG5cblBlb3BsZVN0b3JlLnByb3RvdHlwZS5zdGFyID0gZnVuY3Rpb24gKHsgaWQgfSwgc3RhcnJlZCwgY2FsbGJhY2spIHtcblx0dGhpcy5zdGFyUXVldWUucHVzaCh7IGlkLCBzdGFycmVkIH0sIGNhbGxiYWNrKVxufVxuXG4vLyBHZXR0ZXJzXG5QZW9wbGVTdG9yZS5wcm90b3R5cGUuZ2V0UGVvcGxlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5jYWNoZS5wZW9wbGUgfVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBlb3BsZVN0b3JlXG4iLCJ2YXIgQ29udGFpbmVyID0gcmVxdWlyZSgncmVhY3QtY29udGFpbmVyJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xudmFyIFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcbnZhciBUaW1lcnMgPSByZXF1aXJlKCdyZWFjdC10aW1lcnMnKTtcbnZhciB7IExpbmssIFVJIH0gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW1RpbWVycygpXSxcblx0c3RhdGljczoge1xuXHRcdG5hdmlnYXRpb25CYXI6ICdtYWluJyxcblx0XHRnZXROYXZpZ2F0aW9uICgpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHRpdGxlOiAnQ29udHJvbHMnXG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHRnZXRJbml0aWFsU3RhdGUgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhbGVydGJhcjoge1xuXHRcdFx0XHR2aXNpYmxlOiBmYWxzZSxcblx0XHRcdFx0dHlwZTogJycsXG5cdFx0XHRcdHRleHQ6ICcnXG5cdFx0XHR9LFxuXHRcdFx0cG9wdXA6IHtcblx0XHRcdFx0dmlzaWJsZTogZmFsc2Vcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdHNob3dMb2FkaW5nUG9wdXAgKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0cG9wdXA6IHtcblx0XHRcdFx0dmlzaWJsZTogdHJ1ZSxcblx0XHRcdFx0bG9hZGluZzogdHJ1ZSxcblx0XHRcdFx0aGVhZGVyOiAnTG9hZGluZycsXG5cdFx0XHRcdGljb25OYW1lOiAnaW9uLWxvYWQtYycsXG5cdFx0XHRcdGljb25UeXBlOiAnZGVmYXVsdCdcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHRoaXMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLnNldFN0YXRlKHtcblx0XHRcdFx0cG9wdXA6IHtcblx0XHRcdFx0XHR2aXNpYmxlOiB0cnVlLFxuXHRcdFx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdGhlYWRlcjogJ0RvbmUhJyxcblx0XHRcdFx0XHRpY29uTmFtZTogJ2lvbi1pb3MtY2hlY2ttYXJrJyxcblx0XHRcdFx0XHRpY29uVHlwZTogJ3N1Y2Nlc3MnXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIDIwMDApO1xuXG5cdFx0dGhpcy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdHNlbGYuc2V0U3RhdGUoe1xuXHRcdFx0XHRwb3B1cDoge1xuXHRcdFx0XHRcdHZpc2libGU6IGZhbHNlXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIDMwMDApO1xuXHR9LFxuXHRzaG93QWxlcnRiYXIgKHR5cGUsIHRleHQpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGFsZXJ0YmFyOiB7XG5cdFx0XHRcdHZpc2libGU6IHRydWUsXG5cdFx0XHRcdHR5cGU6IHR5cGUsXG5cdFx0XHRcdHRleHQ6IHRleHRcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLnNldFN0YXRlKHtcblx0XHRcdFx0YWxlcnRiYXI6IHtcblx0XHRcdFx0XHR2aXNpYmxlOiBmYWxzZVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAyMDAwKTtcblx0fSxcblx0aGFuZGxlTW9kZUNoYW5nZSAobmV3TW9kZSkge1xuXHRcdHZhciBzZWxlY3RlZEl0ZW0gPSBuZXdNb2RlO1xuXG5cdFx0aWYgKHRoaXMuc3RhdGUuc2VsZWN0ZWRNb2RlID09PSBuZXdNb2RlKSB7XG5cdFx0XHRzZWxlY3RlZEl0ZW0gPSBudWxsO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0c2VsZWN0ZWRNb2RlOiBzZWxlY3RlZEl0ZW1cblx0XHR9KTtcblxuXHR9LFxuXHRyZW5kZXIgKCkge1xuXHRcdHZhciB7IGFsZXJ0YmFyIH0gPSB0aGlzLnN0YXRlO1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8Q29udGFpbmVyIHNjcm9sbGFibGU+XG5cdFx0XHRcdDxVSS5BbGVydGJhciB0eXBlPXthbGVydGJhci50eXBlfSB2aXNpYmxlPXthbGVydGJhci52aXNpYmxlfT57YWxlcnRiYXIudGV4dH08L1VJLkFsZXJ0YmFyPlxuXHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+U2VnbWVudGVkIENvbnRyb2w8L1VJLkdyb3VwSGVhZGVyPlxuXHRcdFx0XHQ8VUkuU2VnbWVudGVkQ29udHJvbCB2YWx1ZT17dGhpcy5zdGF0ZS5zZWxlY3RlZE1vZGV9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZU1vZGVDaGFuZ2V9IGhhc0d1dHRlciBvcHRpb25zPXtbXG5cdFx0XHRcdFx0eyBsYWJlbDogJ09uZScsIHZhbHVlOiAnb25lJyB9LFxuXHRcdFx0XHRcdHsgbGFiZWw6ICdUd28nLCB2YWx1ZTogJ3R3bycgfSxcblx0XHRcdFx0XHR7IGxhYmVsOiAnVGhyZWUnLCB2YWx1ZTogJ3RocmVlJyB9LFxuXHRcdFx0XHRcdHsgbGFiZWw6ICdGb3VyJywgdmFsdWU6ICdmb3VyJyB9XG5cdFx0XHRcdF19IC8+XG5cblx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPkFsZXJ0IEJhcjwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdDxVSS5CdXR0b25Hcm91cD5cblx0XHRcdFx0XHQ8VUkuQnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgb25UYXA9e3RoaXMuc2hvd0FsZXJ0YmFyLmJpbmQodGhpcywgJ2RhbmdlcicsICdObyBJbnRlcm5ldCBDb25uZWN0aW9uJyl9IGRpc2FibGVkPXt0aGlzLnN0YXRlLmFsZXJ0YmFyLnZpc2libGV9PlxuXHRcdFx0XHRcdFx0RGFuZ2VyXG5cdFx0XHRcdFx0PC9VSS5CdXR0b24+XG5cdFx0XHRcdFx0PFVJLkJ1dHRvbiB0eXBlPVwicHJpbWFyeVwiIG9uVGFwPXt0aGlzLnNob3dBbGVydGJhci5iaW5kKHRoaXMsICd3YXJuaW5nJywgJ0Nvbm5lY3RpbmcuLi4nKX0gZGlzYWJsZWQ9e3RoaXMuc3RhdGUuYWxlcnRiYXIudmlzaWJsZX0+XG5cdFx0XHRcdFx0XHRXYXJuaW5nXG5cdFx0XHRcdFx0PC9VSS5CdXR0b24+XG5cdFx0XHRcdFx0PFVJLkJ1dHRvbiB0eXBlPVwicHJpbWFyeVwiIG9uVGFwPXt0aGlzLnNob3dBbGVydGJhci5iaW5kKHRoaXMsICdzdWNjZXNzJywgJ0Nvbm5lY3RlZCcpfSBkaXNhYmxlZD17dGhpcy5zdGF0ZS5hbGVydGJhci52aXNpYmxlfT5cblx0XHRcdFx0XHRcdFN1Y2Nlc3Ncblx0XHRcdFx0XHQ8L1VJLkJ1dHRvbj5cblx0XHRcdFx0PC9VSS5CdXR0b25Hcm91cD5cblx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPlBvcHVwPC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0PFVJLkJ1dHRvbiB0eXBlPVwicHJpbWFyeVwiIG9uVGFwPXt0aGlzLnNob3dMb2FkaW5nUG9wdXB9IGRpc2FibGVkPXt0aGlzLnN0YXRlLnBvcHVwLnZpc2libGV9PlxuXHRcdFx0XHRcdFNob3cgUG9wdXBcblx0XHRcdFx0PC9VSS5CdXR0b24+XG5cdFx0XHRcdDxVSS5Hcm91cEhlYWRlcj5BcHBsaWNhdGlvbiBTdGF0ZTwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdDxVSS5Hcm91cD5cblx0XHRcdFx0XHQ8TGluayBsaW5rVG89XCJ0YWJzOm5vbi1leGlzdGVudFwiIHRyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIj5cblx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+SW52YWxpZCBWaWV3PC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXG5cdFx0XHRcdDxVSS5Qb3B1cCB2aXNpYmxlPXt0aGlzLnN0YXRlLnBvcHVwLnZpc2libGV9PlxuXHRcdFx0XHRcdDxVSS5Qb3B1cEljb24gbmFtZT17dGhpcy5zdGF0ZS5wb3B1cC5pY29uTmFtZX0gdHlwZT17dGhpcy5zdGF0ZS5wb3B1cC5pY29uVHlwZX0gc3Bpbm5pbmc9e3RoaXMuc3RhdGUucG9wdXAubG9hZGluZ30gLz5cdFx0XG5cdFx0XHRcdFx0PGRpdj48c3Ryb25nPnt0aGlzLnN0YXRlLnBvcHVwLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5cblx0XHRcdFx0PC9VSS5Qb3B1cD5cblx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwidmFyIENvbnRhaW5lciA9IHJlcXVpcmUoJ3JlYWN0LWNvbnRhaW5lcicpO1xudmFyIGRpYWxvZ3MgPSByZXF1aXJlKCdjb3Jkb3ZhLWRpYWxvZ3MnKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xudmFyIHsgVUkgfSA9IHJlcXVpcmUoJ3RvdWNoc3RvbmVqcycpO1xuXG5jb25zdCBzY3JvbGxhYmxlID0gQ29udGFpbmVyLmluaXRTY3JvbGxhYmxlKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRzdGF0aWNzOiB7XG5cdFx0bmF2aWdhdGlvbkJhcjogJ21haW4nLFxuXHRcdGdldE5hdmlnYXRpb24gKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dGl0bGU6ICdGb3Jtcydcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdGdldEluaXRpYWxTdGF0ZSAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGZsYXZvdXI6ICdjaG9jb2xhdGUnLFxuXHRcdFx0c3dpdGNoVmFsdWU6IHRydWVcblx0XHR9XG5cdH0sXG5cdGhhbmRsZUZsYXZvdXJDaGFuZ2UgKG5ld0ZsYXZvdXIpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGZsYXZvdXI6IG5ld0ZsYXZvdXJcblx0XHR9KTtcblx0fSxcblx0aGFuZGxlU3dpdGNoIChrZXksIGV2ZW50KSB7XG5cdFx0dmFyIG5ld1N0YXRlID0ge307XG5cdFx0bmV3U3RhdGVba2V5XSA9ICF0aGlzLnN0YXRlW2tleV07XG5cblx0XHR0aGlzLnNldFN0YXRlKG5ld1N0YXRlKTtcblx0fSxcblx0YWxlcnQgKG1lc3NhZ2UpIHtcblx0XHRkaWFsb2dzLmFsZXJ0KG1lc3NhZ2UsIGZ1bmN0aW9uKCkge30sIG51bGwpXG5cdH0sXG5cdHJlbmRlciAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lciBzY3JvbGxhYmxlPXtzY3JvbGxhYmxlfT5cblx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPkNoZWNrYm94PC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdDxVSS5JdGVtPlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdFx0PFVJLkZpZWxkTGFiZWw+U3dpdGNoPC9VSS5GaWVsZExhYmVsPlxuXHRcdFx0XHRcdFx0XHQ8VUkuU3dpdGNoIG9uVGFwPXt0aGlzLmhhbmRsZVN3aXRjaC5iaW5kKHRoaXMsICdzd2l0Y2hWYWx1ZScpfSBvbj17dGhpcy5zdGF0ZS5zd2l0Y2hWYWx1ZX0gLz5cblx0XHRcdFx0XHRcdDwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHQ8VUkuSXRlbT5cblx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHRcdDxVSS5GaWVsZExhYmVsPkRpc2FibGVkPC9VSS5GaWVsZExhYmVsPlxuXHRcdFx0XHRcdFx0XHQ8VUkuU3dpdGNoIGRpc2FibGVkIC8+XG5cdFx0XHRcdFx0XHQ8L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdDwvVUkuR3JvdXA+XG5cdFx0XHRcdDxVSS5Hcm91cEhlYWRlcj5SYWRpbzwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdDxVSS5Hcm91cD5cblx0XHRcdFx0XHQ8VUkuUmFkaW9MaXN0IHZhbHVlPXt0aGlzLnN0YXRlLmZsYXZvdXJ9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUZsYXZvdXJDaGFuZ2V9IG9wdGlvbnM9e1tcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdWYW5pbGxhJywgICAgdmFsdWU6ICd2YW5pbGxhJyB9LFxuXHRcdFx0XHRcdFx0eyBsYWJlbDogJ0Nob2NvbGF0ZScsICB2YWx1ZTogJ2Nob2NvbGF0ZScgfSxcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdDYXJhbWVsJywgICAgdmFsdWU6ICdjYXJhbWVsJyB9LFxuXHRcdFx0XHRcdFx0eyBsYWJlbDogJ1N0cmF3YmVycnknLCB2YWx1ZTogJ3N0cmF3YmVycnknIH1cblx0XHRcdFx0XHRdfSAvPlxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+SW5wdXRzPC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdDxVSS5JbnB1dCBwbGFjZWhvbGRlcj1cIkRlZmF1bHRcIiAvPlxuXHRcdFx0XHRcdDxVSS5JbnB1dCBkZWZhdWx0VmFsdWU9XCJXaXRoIFZhbHVlXCIgcGxhY2Vob2xkZXI9XCJQbGFjZWhvbGRlclwiIC8+XG5cdFx0XHRcdFx0PFVJLlRleHRhcmVhIGRlZmF1bHRWYWx1ZT1cIkxvbmd0ZXh0IGlzIGdvb2QgZm9yIGJpb3MgZXRjLlwiIHBsYWNlaG9sZGVyPVwiTG9uZ3RleHRcIiAvPlxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+TGFiZWxsZWQgSW5wdXRzPC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdDxVSS5MYWJlbElucHV0IHR5cGU9XCJlbWFpbFwiIGxhYmVsPVwiRW1haWxcIiAgIHBsYWNlaG9sZGVyPVwieW91ci5uYW1lQGV4YW1wbGUuY29tXCIgLz5cblx0XHRcdFx0XHQ8VUkuTGFiZWxJbnB1dCB0eXBlPVwidXJsXCIgICBsYWJlbD1cIlVSTFwiICAgICBwbGFjZWhvbGRlcj1cImh0dHA6Ly93d3cueW91cndlYnNpdGUuY29tXCIgLz5cblx0XHRcdFx0XHQ8VUkuTGFiZWxJbnB1dCBub2VkaXQgICAgICAgbGFiZWw9XCJObyBFZGl0XCIgZGVmYXVsdFZhbHVlPVwiVW4tZWRpdGFibGUsIHNjcm9sbGFibGUsIHNlbGVjdGFibGUgY29udGVudFwiIC8+XG5cdFx0XHRcdFx0PFVJLkxhYmVsU2VsZWN0IGxhYmVsPVwiRmxhdm91clwiIHZhbHVlPXt0aGlzLnN0YXRlLmZsYXZvdXJ9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUZsYXZvdXJDaGFuZ2V9IG9wdGlvbnM9e1tcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdWYW5pbGxhJywgICAgdmFsdWU6ICd2YW5pbGxhJyB9LFxuXHRcdFx0XHRcdFx0eyBsYWJlbDogJ0Nob2NvbGF0ZScsICB2YWx1ZTogJ2Nob2NvbGF0ZScgfSxcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICdDYXJhbWVsJywgICAgdmFsdWU6ICdjYXJhbWVsJyB9LFxuXHRcdFx0XHRcdFx0eyBsYWJlbDogJ1N0cmF3YmVycnknLCB2YWx1ZTogJ3N0cmF3YmVycnknIH0sXG5cdFx0XHRcdFx0XHR7IGxhYmVsOiAnQmFuYW5hJywgICAgIHZhbHVlOiAnYmFuYW5hJyB9LFxuXHRcdFx0XHRcdFx0eyBsYWJlbDogJ0xlbW9uJywgICAgICB2YWx1ZTogJ2xlbW9uJyB9LFxuXHRcdFx0XHRcdFx0eyBsYWJlbDogJ1Bhc3RhY2NpbycsICB2YWx1ZTogJ3Bhc3RhY2NpbycgfVxuXHRcdFx0XHRcdF19IC8+XG5cdFx0XHRcdDwvVUkuR3JvdXA+XG5cdFx0XHRcdDxVSS5CdXR0b24gdHlwZT1cInByaW1hcnlcIiBvblRhcD17dGhpcy5hbGVydC5iaW5kKHRoaXMsICdZb3UgY2xpY2tlZCB0aGUgUHJpbWFyeSBCdXR0b24nKX0+XG5cdFx0XHRcdFx0UHJpbWFyeSBCdXR0b25cblx0XHRcdFx0PC9VSS5CdXR0b24+XG5cdFx0XHRcdDxVSS5CdXR0b24gb25UYXA9e3RoaXMuYWxlcnQuYmluZCh0aGlzLCAnWW91IGNsaWNrZWQgdGhlIERlZmF1bHQgQnV0dG9uJyl9PlxuXHRcdFx0XHRcdERlZmF1bHQgQnV0dG9uXG5cdFx0XHRcdDwvVUkuQnV0dG9uPlxuXHRcdFx0XHQ8VUkuQnV0dG9uIHR5cGU9XCJkYW5nZXJcIiBvblRhcD17dGhpcy5hbGVydC5iaW5kKHRoaXMsICdZb3UgY2xpY2tlZCB0aGUgRGFuZ2VyIEJ1dHRvbicpfT5cblx0XHRcdFx0XHREYW5nZXIgQnV0dG9uXG5cdFx0XHRcdDwvVUkuQnV0dG9uPlxuXHRcdFx0XHQ8VUkuQnV0dG9uIHR5cGU9XCJkYW5nZXJcIiBvblRhcD17dGhpcy5hbGVydC5iaW5kKHRoaXMsICdZb3UgY2xpY2tlZCB0aGUgRGFuZ2VyIEJ1dHRvbicpfSBkaXNhYmxlZD5cblx0XHRcdFx0XHREaXNhYmxlZCBCdXR0b25cblx0XHRcdFx0PC9VSS5CdXR0b24+XG5cdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBDb250YWluZXIgPSByZXF1aXJlKCdyZWFjdC1jb250YWluZXInKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xudmFyIFNlbnRyeSA9IHJlcXVpcmUoJ3JlYWN0LXNlbnRyeScpO1xuXG52YXIgeyBMaW5rLCBVSSB9ID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJyk7XG5cbmNvbnN0IHNjcm9sbGFibGUgPSBDb250YWluZXIuaW5pdFNjcm9sbGFibGUoKTtcblxudmFyIENvbXBsZXhMaW5rSXRlbSA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0Y29udGV4dFR5cGVzOiB7IHBlb3BsZVN0b3JlOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LmlzUmVxdWlyZWQgfSxcblxuXHR0b2dnbGVTdGFyICgpIHtcblx0XHR2YXIgcGVyc29uID0gdGhpcy5wcm9wcy5wZXJzb25cblxuXHRcdHRoaXMuY29udGV4dC5wZW9wbGVTdG9yZS5zdGFyKHBlcnNvbiwgIXBlcnNvbi5pc1N0YXJyZWQpXG5cdH0sXG5cblx0cmVuZGVyICgpIHtcblx0XHR2YXIgcGVyc29uID0gdGhpcy5wcm9wcy5wZXJzb247XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PExpbmsgdG89XCJ0YWJzOmxpc3QtZGV0YWlsc1wiIHRyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIiB2aWV3UHJvcHM9e3sgcGVyc29uOiBwZXJzb24sIHByZXZWaWV3OiAnbGlzdC1jb21wbGV4JyB9fT5cblx0XHRcdFx0PFVJLkl0ZW0+XG5cdFx0XHRcdFx0PFVJLkl0ZW1NZWRpYSBhdmF0YXI9e3BlcnNvbi5waWN0dXJlfSBhdmF0YXJJbml0aWFscz17cGVyc29uLmluaXRpYWxzfSAvPlxuXHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHQ8VUkuSXRlbUNvbnRlbnQ+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtVGl0bGU+e3BlcnNvbi5uYW1lLmZ1bGx9PC9VSS5JdGVtVGl0bGU+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtU3ViVGl0bGU+e3BlcnNvbi5iaW99PC9VSS5JdGVtU3ViVGl0bGU+XG5cdFx0XHRcdFx0XHQ8L1VJLkl0ZW1Db250ZW50PlxuXHRcdFx0XHRcdFx0PFRhcHBhYmxlIG9uVGFwPXt0aGlzLnRvZ2dsZVN0YXJ9IHN0b3BQcm9wYWdhdGlvbj5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Ob3RlIGljb249e3BlcnNvbi5pc1N0YXJyZWQgPyAnaW9uLWlvcy1zdGFyJyA6ICdpb24taW9zLXN0YXItb3V0bGluZSd9IHR5cGU9e3BlcnNvbi5pc1N0YXJyZWQgPyAnd2FybmluZycgOiAnZGVmYXVsdCd9IGNsYXNzTmFtZT1cImlvbi1sZ1wiIC8+XG5cdFx0XHRcdFx0XHQ8L1RhcHBhYmxlPlxuXHRcdFx0XHRcdDwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHQ8L0xpbms+XG5cdFx0KTtcblx0fVxufSk7XG5cbi8vIEZJWE1FOiB0aGlzIGJpdCBpcyBnbG9iYWwgYW5kIGhhY2t5LCBleHBlY3QgaXQgdG8gY2hhbmdlXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIGVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbmZ1bmN0aW9uIGdldE5hdmlnYXRpb24gKHByb3BzLCBhcHAsIGZpbHRlclN0YXJyZWQpIHtcblx0cmV0dXJuIHtcblx0XHRsZWZ0TGFiZWw6ICdMaXN0cycsXG5cdFx0bGVmdEFycm93OiB0cnVlLFxuXHRcdGxlZnRBY3Rpb246ICgpID0+IHsgYXBwLnRyYW5zaXRpb25UbygndGFiczpsaXN0cycsIHsgdHJhbnNpdGlvbjogJ3JldmVhbC1mcm9tLXJpZ2h0JyB9KSB9LFxuXHRcdHJpZ2h0TGFiZWw6IGZpbHRlclN0YXJyZWQgPyAnQWxsJyA6ICdTdGFycmVkJyxcblx0XHRyaWdodEFjdGlvbjogZW1pdHRlci5lbWl0LmJpbmQoZW1pdHRlciwgJ25hdmlnYXRpb25CYXJSaWdodEFjdGlvbicpLFxuXHRcdHRpdGxlOiAnQ29tcGxleCdcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGNvbnRleHRUeXBlczoge1xuXHRcdGFwcDogUmVhY3QuUHJvcFR5cGVzLm9iamVjdCxcblx0XHRwZW9wbGVTdG9yZTogUmVhY3QuUHJvcFR5cGVzLm9iamVjdC5pc1JlcXVpcmVkXG5cdH0sXG5cdG1peGluczogW1NlbnRyeSgpXSxcblxuXHRzdGF0aWNzOiB7XG5cdFx0bmF2aWdhdGlvbkJhcjogJ21haW4nLFxuXHRcdGdldE5hdmlnYXRpb246IGdldE5hdmlnYXRpb25cblx0fSxcblxuXHRnZXRJbml0aWFsU3RhdGUgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRmaWx0ZXJTdGFycmVkOiBmYWxzZSxcblx0XHRcdHBlb3BsZTogdGhpcy5jb250ZXh0LnBlb3BsZVN0b3JlLmdldFBlb3BsZSgpXG5cdFx0fVxuXHR9LFxuXG5cdGNvbXBvbmVudERpZE1vdW50ICgpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXNcblxuXHRcdHRoaXMud2F0Y2godGhpcy5jb250ZXh0LnBlb3BsZVN0b3JlLCAncGVvcGxlLXVwZGF0ZWQnLCBwZW9wbGUgPT4ge1xuXHRcdFx0c2VsZi5zZXRTdGF0ZSh7IHBlb3BsZSB9KVxuXHRcdH0pXG5cblx0XHR0aGlzLndhdGNoKGVtaXR0ZXIsICduYXZpZ2F0aW9uQmFyUmlnaHRBY3Rpb24nLCB0aGlzLnRvZ2dsZVN0YXJyZWQpO1xuXHR9LFxuXG5cdHRvZ2dsZVN0YXJyZWQgKCkge1xuXHRcdHZhciBmaWx0ZXJTdGFycmVkID0gIXRoaXMuc3RhdGUuZmlsdGVyU3RhcnJlZDtcblx0XHR0aGlzLnNldFN0YXRlKHsgZmlsdGVyU3RhcnJlZCB9KTtcblx0XHR0aGlzLmNvbnRleHQuYXBwLm5hdmlnYXRpb25CYXJzLm1haW4udXBkYXRlKGdldE5hdmlnYXRpb24oe30sIHRoaXMuY29udGV4dC5hcHAsIGZpbHRlclN0YXJyZWQpKTtcblx0fSxcblxuXHRoYW5kbGVNb2RlQ2hhbmdlIChuZXdNb2RlKSB7XG5cdFx0dmFyIHNlbGVjdGVkTW9kZSA9IG5ld01vZGU7XG5cblx0XHRpZiAodGhpcy5zdGF0ZS5zZWxlY3RlZE1vZGUgPT09IG5ld01vZGUpIHtcblx0XHRcdHNlbGVjdGVkTW9kZSA9IG51bGw7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHNlbGVjdGVkTW9kZSB9KVxuXHR9LFxuXG5cdHJlbmRlciAoKSB7XG5cdFx0dmFyIHsgcGVvcGxlLCBmaWx0ZXJTdGFycmVkLCBzZWxlY3RlZE1vZGUgfSA9IHRoaXMuc3RhdGVcblxuXHRcdGlmIChmaWx0ZXJTdGFycmVkKSB7XG5cdFx0XHRwZW9wbGUgPSBwZW9wbGUuZmlsdGVyKHBlcnNvbiA9PiBwZXJzb24uaXNTdGFycmVkKVxuXHRcdH1cblxuXHRcdGlmIChzZWxlY3RlZE1vZGUgPT09ICdBJyB8fCBzZWxlY3RlZE1vZGUgPT09ICdCJykge1xuXHRcdFx0cGVvcGxlID0gcGVvcGxlLmZpbHRlcihwZXJzb24gPT4gcGVyc29uLmNhdGVnb3J5ID09PSBzZWxlY3RlZE1vZGUpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc29ydEJ5TmFtZSAoYSwgYikgeyByZXR1cm4gYS5uYW1lLmZ1bGwubG9jYWxlQ29tcGFyZShiLm5hbWUuZnVsbCkgfVxuXG5cdFx0dmFyIHNvcnRlZFBlb3BsZSA9IHBlb3BsZS5zb3J0KHNvcnRCeU5hbWUpXG5cdFx0dmFyIHJlc3VsdHNcblxuXHRcdGlmIChzb3J0ZWRQZW9wbGUubGVuZ3RoKSB7XG5cdFx0XHR2YXIgYVBlb3BsZSA9IHNvcnRlZFBlb3BsZVxuXHRcdFx0XHQuZmlsdGVyKHBlcnNvbiA9PiBwZXJzb24uY2F0ZWdvcnkgPT09ICdBJylcblx0XHRcdFx0Lm1hcCgocGVyc29uLCBpKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIDxDb21wbGV4TGlua0l0ZW0ga2V5PXsncGVyc29uYScgKyBpfSBwZXJzb249e3BlcnNvbn0gLz5cblx0XHRcdFx0fSlcblxuXHRcdFx0dmFyIGJQZW9wbGUgPSBzb3J0ZWRQZW9wbGVcblx0XHRcdFx0LmZpbHRlcihwZXJzb24gPT4gcGVyc29uLmNhdGVnb3J5ID09PSAnQicpXG5cdFx0XHRcdC5tYXAoKHBlcnNvbiwgaSkgPT4ge1xuXHRcdFx0XHRcdHJldHVybiA8Q29tcGxleExpbmtJdGVtIGtleT17J3BlcnNvbmInICsgaX0gcGVyc29uPXtwZXJzb259IC8+XG5cdFx0XHRcdH0pXG5cblx0XHRcdHJlc3VsdHMgPSAoXG5cdFx0XHRcdDxVSS5Hcm91cD5cblx0XHRcdFx0XHR7YVBlb3BsZS5sZW5ndGggPiAwID8gPFVJLkxpc3RIZWFkZXIgc3RpY2t5PkNhdGVnb3J5IEE8L1VJLkxpc3RIZWFkZXI+IDogJyd9XG5cdFx0XHRcdFx0e2FQZW9wbGV9XG5cdFx0XHRcdFx0e2JQZW9wbGUubGVuZ3RoID4gMCA/IDxVSS5MaXN0SGVhZGVyIHN0aWNreT5DYXRlZ29yeSBCPC9VSS5MaXN0SGVhZGVyPiA6ICcnfVxuXHRcdFx0XHRcdHtiUGVvcGxlfVxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXHRcdFx0KVxuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdHMgPSAoXG5cdFx0XHRcdDxDb250YWluZXIgZGlyZWN0aW9uPVwiY29sdW1uXCIgYWxpZ249XCJjZW50ZXJcIiBqdXN0aWZ5PVwiY2VudGVyXCIgY2xhc3NOYW1lPVwibm8tcmVzdWx0c1wiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwibm8tcmVzdWx0c19faWNvbiBpb24taW9zLXN0YXJcIiAvPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwibm8tcmVzdWx0c19fdGV4dFwiPkdvIHN0YXIgc29tZSBwZW9wbGUhPC9kaXY+XG5cdFx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdFx0KVxuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8Q29udGFpbmVyIHNjcm9sbGFibGU9e3Njcm9sbGFibGV9PlxuXHRcdFx0XHQ8VUkuU2VnbWVudGVkQ29udHJvbCB2YWx1ZT17dGhpcy5zdGF0ZS5zZWxlY3RlZE1vZGV9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZU1vZGVDaGFuZ2V9IGhhc0d1dHRlciBlcXVhbFdpZHRoU2VnbWVudHMgb3B0aW9ucz17W1xuXHRcdFx0XHRcdHsgbGFiZWw6ICdBJywgdmFsdWU6ICdBJyB9LFxuXHRcdFx0XHRcdHsgbGFiZWw6ICdCJywgdmFsdWU6ICdCJyB9XG5cdFx0XHRcdF19IC8+XG5cdFx0XHRcdHtyZXN1bHRzfVxuXHRcdFx0PC9Db250YWluZXI+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgQ29udGFpbmVyID0gcmVxdWlyZSgncmVhY3QtY29udGFpbmVyJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0c3RhdGljczoge1xuXHRcdG5hdmlnYXRpb25CYXI6ICdtYWluJyxcblx0XHRnZXROYXZpZ2F0aW9uIChwcm9wcywgYXBwKSB7XG5cdFx0XHR2YXIgbGVmdExhYmVsID0gcHJvcHMucHJldlZpZXcgPT09ICdsaXN0LXNpbXBsZScgPyAnU2ltcGxlJyA6ICdDb21wbGV4Jztcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGxlZnRBcnJvdzogdHJ1ZSxcblx0XHRcdFx0bGVmdExhYmVsOiBsZWZ0TGFiZWwsXG5cdFx0XHRcdGxlZnRBY3Rpb246ICgpID0+IHsgYXBwLnRyYW5zaXRpb25UbygndGFiczonICsgcHJvcHMucHJldlZpZXcsIHsgdHJhbnNpdGlvbjogJ3JldmVhbC1mcm9tLXJpZ2h0JyB9KSB9LFxuXHRcdFx0XHR0aXRsZTogJ1BlcnNvbidcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdGdldERlZmF1bHRQcm9wcyAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHByZXZWaWV3OiAnaG9tZSdcblx0XHR9XG5cdH0sXG5cdHJlbmRlciAoKSB7XG5cdFx0dmFyIHsgcGVyc29uIH0gPSB0aGlzLnByb3BzO1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxDb250YWluZXIgZGlyZWN0aW9uPVwiY29sdW1uXCI+XG5cdFx0XHRcdDxDb250YWluZXIgZmlsbCBzY3JvbGxhYmxlIHJlZj1cInNjcm9sbENvbnRhaW5lclwiIGNsYXNzTmFtZT1cIlBlcnNvbkRldGFpbHNcIj5cblx0XHRcdFx0XHQ8aW1nIHNyYz17cGVyc29uLnBpY3R1cmV9IGNsYXNzTmFtZT1cIlBlcnNvbkRldGFpbHNfX2F2YXRhclwiIC8+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJQZXJzb25EZXRhaWxzX19oZWFkaW5nXCI+e3BlcnNvbi5uYW1lLmZ1bGx9PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJQZXJzb25EZXRhaWxzX190ZXh0IHRleHQtYmxvY2tcIj57cGVyc29uLmJpb308L2Rpdj5cblx0XHRcdFx0XHR7KHBlcnNvbi50d2l0dGVyIHx8IHBlcnNvbi5naXRodWIpICYmIDxkaXYgY2xhc3NOYW1lPVwiUGVyc29uRGV0YWlsc19fcHJvZmlsZXNcIj5cblx0XHRcdFx0XHRcdHtwZXJzb24udHdpdHRlciAmJiA8ZGl2IGNsYXNzTmFtZT1cIlBlcnNvbkRldGFpbHNfX3Byb2ZpbGVcIj5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiUGVyc29uRGV0YWlsc19fcHJvZmlsZV9faWNvbiBpb24tc29jaWFsLXR3aXR0ZXJcIiAvPlxuXHRcdFx0XHRcdFx0XHR7cGVyc29uLnR3aXR0ZXJ9XG5cdFx0XHRcdFx0XHQ8L2Rpdj59XG5cdFx0XHRcdFx0XHR7cGVyc29uLmdpdGh1YiAmJiA8ZGl2IGNsYXNzTmFtZT1cIlBlcnNvbkRldGFpbHNfX3Byb2ZpbGVcIj5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiUGVyc29uRGV0YWlsc19fcHJvZmlsZV9faWNvbiBpb24tc29jaWFsLWdpdGh1YlwiIC8+XG5cdFx0XHRcdFx0XHRcdHtwZXJzb24uZ2l0aHVifVxuXHRcdFx0XHRcdFx0PC9kaXY+fVxuXHRcdFx0XHRcdDwvZGl2Pn1cblx0XHRcdFx0PC9Db250YWluZXI+XG5cdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBDb250YWluZXIgPSByZXF1aXJlKCdyZWFjdC1jb250YWluZXInKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgVGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xudmFyIFNlbnRyeSA9IHJlcXVpcmUoJ3JlYWN0LXNlbnRyeScpO1xuXG52YXIgeyBMaW5rLCBVSSB9ID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJyk7XG5cbnZhciBTZWFyY2ggPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnU2VhcmNoJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0c2VhcmNoU3RyaW5nOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdG9uQ2hhbmdlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYy5pc1JlcXVpcmVkXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c2VhcmNoU3RyaW5nOiAnJ1xuXHRcdH1cblx0fSxcblxuXHRoYW5kbGVDaGFuZ2UgKGV2ZW50KSB7XG5cdFx0dGhpcy5wcm9wcy5vbkNoYW5nZShldmVudC50YXJnZXQudmFsdWUpO1xuXHR9LFxuXG5cdHJlc2V0ICgpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2hhbmdlKCcnKTtcblx0fSxcblxuXHRyZW5kZXIgKCkge1xuXHRcdHZhciBjbGVhckljb247XG5cblx0XHRpZiAodGhpcy5wcm9wcy5zZWFyY2hTdHJpbmcubGVuZ3RoID4gMCkge1xuXHRcdFx0Y2xlYXJJY29uID0gPFRhcHBhYmxlIGNsYXNzTmFtZT1cIlNlYXJjaEZpZWxkX19pY29uIFNlYXJjaEZpZWxkX19pY29uLS1jbGVhclwiIG9uVGFwPXt0aGlzLnJlc2V0fSAvPjtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9XCJTZWFyY2hGaWVsZFwiPlxuXHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9XCJTZWFyY2hGaWVsZF9faWNvbiBTZWFyY2hGaWVsZF9faWNvbi0tc2VhcmNoXCIgLz5cblx0XHRcdFx0PGlucHV0IHJlZj1cImlucHV0XCIgdmFsdWU9e3RoaXMucHJvcHMuc2VhcmNoU3RyaW5nfSBvbkNoYW5nZT17dGhpcy5oYW5kbGVDaGFuZ2V9IGNsYXNzTmFtZT1cIlNlYXJjaEZpZWxkX19pbnB1dFwiIHBsYWNlaG9sZGVyPSdTZWFyY2guLi4nIC8+XG5cdFx0XHRcdHtjbGVhckljb259XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59KTtcblxudmFyIFNpbXBsZUxpbmtJdGVtID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRwcm9wVHlwZXM6IHtcblx0XHRwZXJzb246IFJlYWN0LlByb3BUeXBlcy5vYmplY3QuaXNSZXF1aXJlZFxuXHR9LFxuXG5cdHJlbmRlciAoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxMaW5rIHRvPVwidGFiczpsaXN0LWRldGFpbHNcIiB0cmFuc2l0aW9uPVwic2hvdy1mcm9tLXJpZ2h0XCIgdmlld1Byb3BzPXt7IHBlcnNvbjogdGhpcy5wcm9wcy5wZXJzb24sIHByZXZWaWV3OiAnbGlzdC1zaW1wbGUnIH19PlxuXHRcdFx0XHQ8VUkuSXRlbSBzaG93RGlzY2xvc3VyZUFycm93PlxuXHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHQ8VUkuSXRlbVRpdGxlPnt0aGlzLnByb3BzLnBlcnNvbi5uYW1lLmZ1bGx9PC9VSS5JdGVtVGl0bGU+XG5cdFx0XHRcdFx0PC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdDwvTGluaz5cblx0XHQpO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW1NlbnRyeSgpXSxcblx0Y29udGV4dFR5cGVzOiB7IHBlb3BsZVN0b3JlOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LmlzUmVxdWlyZWQgfSxcblxuXHRzdGF0aWNzOiB7XG5cdFx0bmF2aWdhdGlvbkJhcjogJ21haW4nLFxuXHRcdGdldE5hdmlnYXRpb24gKHByb3BzLCBhcHApIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGxlZnRBcnJvdzogdHJ1ZSxcblx0XHRcdFx0bGVmdExhYmVsOiAnTGlzdHMnLFxuXHRcdFx0XHRsZWZ0QWN0aW9uOiAoKSA9PiB7IGFwcC50cmFuc2l0aW9uVG8oJ3RhYnM6bGlzdHMnLCB7IHRyYW5zaXRpb246ICdyZXZlYWwtZnJvbS1yaWdodCcgfSkgfSxcblx0XHRcdFx0dGl0bGU6ICdTaW1wbGUnXG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdGNvbXBvbmVudERpZE1vdW50ICgpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXNcblxuXHRcdHRoaXMud2F0Y2godGhpcy5jb250ZXh0LnBlb3BsZVN0b3JlLCAncGVvcGxlLXVwZGF0ZWQnLCBwZW9wbGUgPT4ge1xuXHRcdFx0c2VsZi5zZXRTdGF0ZSh7IHBlb3BsZSB9KVxuXHRcdH0pXG5cdH0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c2VhcmNoU3RyaW5nOiAnJyxcblx0XHRcdHBlb3BsZTogdGhpcy5jb250ZXh0LnBlb3BsZVN0b3JlLmdldFBlb3BsZSgpXG5cdFx0fVxuXHR9LFxuXG5cdHVwZGF0ZVNlYXJjaCAoc3RyKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHNlYXJjaFN0cmluZzogc3RyIH0pO1xuXHR9LFxuXG5cdHJlbmRlciAoKSB7XG5cdFx0dmFyIHsgc2VhcmNoU3RyaW5nIH0gPSB0aGlzLnN0YXRlXG5cdFx0dmFyIHNlYXJjaFJlZ2V4ID0gbmV3IFJlZ0V4cChzZWFyY2hTdHJpbmcpXG5cblx0XHRmdW5jdGlvbiBzZWFyY2hGaWx0ZXIgKHBlcnNvbikgeyByZXR1cm4gc2VhcmNoUmVnZXgudGVzdChwZXJzb24ubmFtZS5mdWxsKSB9XG5cdFx0ZnVuY3Rpb24gc29ydEJ5TmFtZSAoYSwgYikgeyByZXR1cm4gYS5uYW1lLmZ1bGwubG9jYWxlQ29tcGFyZShiLm5hbWUuZnVsbCkgfVxuXG5cdFx0dmFyIHsgcGVvcGxlIH0gPSB0aGlzLnN0YXRlXG5cdFx0dmFyIGZpbHRlcmVkUGVvcGxlID0gcGVvcGxlLmZpbHRlcihzZWFyY2hGaWx0ZXIpXG5cdFx0XHQuc29ydChzb3J0QnlOYW1lKVxuXG5cdFx0dmFyIHJlc3VsdHNcblxuXHRcdGlmIChzZWFyY2hTdHJpbmcgJiYgIWZpbHRlcmVkUGVvcGxlLmxlbmd0aCkge1xuXHRcdFx0cmVzdWx0cyA9IChcblx0XHRcdFx0PENvbnRhaW5lciBkaXJlY3Rpb249XCJjb2x1bW5cIiBhbGlnbj1cImNlbnRlclwiIGp1c3RpZnk9XCJjZW50ZXJcIiBjbGFzc05hbWU9XCJuby1yZXN1bHRzXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJuby1yZXN1bHRzX19pY29uIGlvbi1pb3Mtc2VhcmNoLXN0cm9uZ1wiIC8+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJuby1yZXN1bHRzX190ZXh0XCI+eydObyByZXN1bHRzIGZvciBcIicgKyBzZWFyY2hTdHJpbmcgKyAnXCInfTwvZGl2PlxuXHRcdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHRcdCk7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGFQZW9wbGUgPSBmaWx0ZXJlZFBlb3BsZVxuXHRcdFx0XHQuZmlsdGVyKHBlcnNvbiA9PiBwZXJzb24uY2F0ZWdvcnkgPT09ICdBJylcblx0XHRcdFx0Lm1hcCgocGVyc29uLCBpKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIDxTaW1wbGVMaW5rSXRlbSBrZXk9eydwZXJzb25hJyArIGl9IHBlcnNvbj17cGVyc29ufSAvPlxuXHRcdFx0XHR9KVxuXG5cdFx0XHR2YXIgYlBlb3BsZSA9IGZpbHRlcmVkUGVvcGxlXG5cdFx0XHRcdC5maWx0ZXIocGVyc29uID0+IHBlcnNvbi5jYXRlZ29yeSA9PT0gJ0InKVxuXHRcdFx0XHQubWFwKChwZXJzb24sIGkpID0+IHtcblx0XHRcdFx0XHRyZXR1cm4gPFNpbXBsZUxpbmtJdGVtIGtleT17J3BlcnNvbmInICsgaX0gcGVyc29uPXtwZXJzb259IC8+XG5cdFx0XHRcdH0pXG5cblx0XHRcdHJlc3VsdHMgPSAoXG5cdFx0XHRcdDxVSS5Hcm91cD5cblx0XHRcdFx0XHR7YVBlb3BsZS5sZW5ndGggPiAwID8gPFVJLkxpc3RIZWFkZXIgc3RpY2t5PkNhdGVnb3J5IEE8L1VJLkxpc3RIZWFkZXI+IDogJyd9XG5cdFx0XHRcdFx0e2FQZW9wbGV9XG5cdFx0XHRcdFx0e2JQZW9wbGUubGVuZ3RoID4gMCA/IDxVSS5MaXN0SGVhZGVyIHN0aWNreT5DYXRlZ29yeSBCPC9VSS5MaXN0SGVhZGVyPiA6ICcnfVxuXHRcdFx0XHRcdHtiUGVvcGxlfVxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXHRcdFx0KVxuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8Q29udGFpbmVyIHNjcm9sbGFibGU+XG5cdFx0XHRcdDxTZWFyY2ggc2VhcmNoU3RyaW5nPXt0aGlzLnN0YXRlLnNlYXJjaFN0cmluZ30gb25DaGFuZ2U9e3RoaXMudXBkYXRlU2VhcmNofSAvPlxuXHRcdFx0XHR7cmVzdWx0c31cblx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwidmFyIENvbnRhaW5lciA9IHJlcXVpcmUoJ3JlYWN0LWNvbnRhaW5lcicpO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcbnZhciB7IExpbmssIFVJIH0gPSByZXF1aXJlKCd0b3VjaHN0b25lanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdHN0YXRpY3M6IHtcblx0XHRuYXZpZ2F0aW9uQmFyOiAnbWFpbicsXG5cdFx0Z2V0TmF2aWdhdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR0aXRsZTogJ0xpc3RzJ1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lciBzY3JvbGxhYmxlPlxuXHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+TGlzdHM8L1VJLkdyb3VwSGVhZGVyPlxuXHRcdFx0XHQ8VUkuR3JvdXA+XG5cdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOmxpc3Qtc2ltcGxlXCIgdHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiPlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdFx0XHRTaW1wbGUgTGlzdFxuXHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOmxpc3QtY29tcGxleFwiIHRyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIj5cblx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHRcdFx0Q29tcGxleCBMaXN0XG5cdFx0XHRcdFx0XHRcdDwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPkdyb3VwSGVhZGVyPC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdDxVSS5Hcm91cEJvZHk+VXNlIGdyb3VwcyB0byBjb250YWluIGNvbnRlbnQgb3IgbGlzdHMuIFdoZXJlIGFwcHJvcHJpYXRlIGEgR3JvdXAgc2hvdWxkIGJlIGFjY29tcGFuaWVkIGJ5IGEgR3JvdXBIZWFkaW5nIGFuZCBvcHRpb25hbGx5IGEgR3JvdXBGb290ZXIuPC9VSS5Hcm91cEJvZHk+XG5cdFx0XHRcdFx0PFVJLkdyb3VwQm9keT5Zb3UgY2FuIHVzZSBHcm91cEJvZHkgZm9yIGNvbnRlbnQgaW5zaWRlIGdyb3Vwcy4gU3Vic2VxdWVudCBHcm91cEJvZHkgY29tcG9uZW50cyB3aWxsIGJlIHNlcGFyYXRlZC48L1VJLkdyb3VwQm9keT5cblx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0PFVJLkdyb3VwRm9vdGVyPkdyb3VwRm9vdGVyOiB1c2VmdWwgZm9yIGEgZGV0YWlsZWQgZXhwbGFpbmF0aW9uIHRvIGV4cHJlc3MgdGhlIGludGVudGlvbnMgb2YgdGhlIEdyb3VwLiBUcnkgdG8gYmUgY29uY2lzZSAtIHJlbWVtYmVyIHRoYXQgdXNlcnMgYXJlIGxpa2VseSB0byByZWFkIHRoZSB0ZXh0IGluIHlvdXIgVUkgbWFueSB0aW1lcy48L1VJLkdyb3VwRm9vdGVyPlxuXHRcdFx0PC9Db250YWluZXI+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJ2YXIgQ29udGFpbmVyID0gcmVxdWlyZSgncmVhY3QtY29udGFpbmVyJyk7XG52YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xudmFyIFRpbWVycyA9IHJlcXVpcmUoJ3JlYWN0LXRpbWVycycpO1xudmFyIHsgTWl4aW5zLCBVSSB9ID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtNaXhpbnMuVHJhbnNpdGlvbnMsIFRpbWVycygpXSxcblx0Y29tcG9uZW50RGlkTW91bnQgKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR0aGlzLnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0c2VsZi50cmFuc2l0aW9uVG8oJ2FwcDptYWluJywgeyB0cmFuc2l0aW9uOiAnZmFkZScgfSk7XG5cdFx0fSwgMTAwMCk7XG5cdH0sXG5cdHJlbmRlciAoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxDb250YWluZXIgZGlyZWN0aW9uPVwiY29sdW1uXCI+XG5cdFx0XHRcdDxVSS5OYXZpZ2F0aW9uQmFyIG5hbWU9XCJvdmVyXCIgdGl0bGU9e3RoaXMucHJvcHMubmF2YmFyVGl0bGV9IC8+XG5cdFx0XHRcdDxDb250YWluZXIgZGlyZWN0aW9uPVwiY29sdW1uXCIgYWxpZ249XCJjZW50ZXJcIiBqdXN0aWZ5PVwiY2VudGVyXCIgY2xhc3NOYW1lPVwibm8tcmVzdWx0c1wiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwibm8tcmVzdWx0c19faWNvbiBpb24taW9zLXBob3Rvc1wiIC8+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJuby1yZXN1bHRzX190ZXh0XCI+SG9sZCBvbiBhIHNlYy4uLjwvZGl2PlxuXHRcdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwidmFyIENvbnRhaW5lciA9IHJlcXVpcmUoJ3JlYWN0LWNvbnRhaW5lcicpO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcbnZhciBUaW1lcnMgPSByZXF1aXJlKCdyZWFjdC10aW1lcnMnKTtcbnZhciB7IE1peGlucyB9ID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtNaXhpbnMuVHJhbnNpdGlvbnMsIFRpbWVycygpXSxcblx0c3RhdGljczoge1xuXHRcdG5hdmlnYXRpb25CYXI6ICdtYWluJyxcblx0XHRnZXROYXZpZ2F0aW9uIChwcm9wcykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dGl0bGU6IHByb3BzLm5hdmJhclRpdGxlXG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHRjb21wb25lbnREaWRNb3VudCAoKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dGhpcy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdHNlbGYudHJhbnNpdGlvblRvKCd0YWJzOnRyYW5zaXRpb25zJywgeyB0cmFuc2l0aW9uOiAnZmFkZScgfSk7XG5cdFx0fSwgMTAwMCk7XG5cdH0sXG5cdHJlbmRlciAoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxDb250YWluZXIgZGlyZWN0aW9uPVwiY29sdW1uXCIgYWxpZ249XCJjZW50ZXJcIiBqdXN0aWZ5PVwiY2VudGVyXCIgY2xhc3NOYW1lPVwibm8tcmVzdWx0c1wiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIm5vLXJlc3VsdHNfX2ljb24gaW9uLWlvcy1waG90b3NcIiAvPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIm5vLXJlc3VsdHNfX3RleHRcIj5Ib2xkIG9uIGEgc2VjLi4uPC9kaXY+XG5cdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHQpO1xuXHR9XG59KTtcbiIsInZhciBDb250YWluZXIgPSByZXF1aXJlKCdyZWFjdC1jb250YWluZXInKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgeyBMaW5rLCBVSSB9ID0gcmVxdWlyZSgndG91Y2hzdG9uZWpzJyk7XG5cbmNvbnN0IHNjcm9sbGFibGUgPSBDb250YWluZXIuaW5pdFNjcm9sbGFibGUoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdHN0YXRpY3M6IHtcblx0XHRuYXZpZ2F0aW9uQmFyOiAnbWFpbicsXG5cdFx0Z2V0TmF2aWdhdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR0aXRsZTogJ1RyYW5zaXRpb25zJ1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0cmVuZGVyICgpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lciBzY3JvbGxhYmxlPXtzY3JvbGxhYmxlfT5cblx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPkRlZmF1bHQ8L1VJLkdyb3VwSGVhZGVyPlxuXHRcdFx0XHQ8VUkuR3JvdXA+XG5cdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOnRyYW5zaXRpb25zLXRhcmdldFwiIHZpZXdQcm9wcz17eyBuYXZiYXJUaXRsZTogJ0luc3RhbnQnIH19PlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj5JbnN0YW50PC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+RmFkZTwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdDxVSS5Hcm91cD5cblx0XHRcdFx0XHQ8TGluayB0bz1cInRhYnM6dHJhbnNpdGlvbnMtdGFyZ2V0XCIgdHJhbnNpdGlvbj1cImZhZGVcIiB2aWV3UHJvcHM9e3sgbmF2YmFyVGl0bGU6ICdGYWRlJyB9fT5cblx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+RmFkZTwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0XHQ8TGluayB0bz1cInRhYnM6dHJhbnNpdGlvbnMtdGFyZ2V0XCIgdHJhbnNpdGlvbj1cImZhZGUtZXhwYW5kXCIgdmlld1Byb3BzPXt7IG5hdmJhclRpdGxlOiAnRmFkZSBFeHBhbmQnIH19PlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj48c3Bhbj5GYWRlIEV4cGFuZCA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LW11dGVkXCI+KG5vbi1zdGFuZGFyZCk8L3NwYW4+PC9zcGFuPjwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0XHQ8TGluayB0bz1cInRhYnM6dHJhbnNpdGlvbnMtdGFyZ2V0XCIgdHJhbnNpdGlvbj1cImZhZGUtY29udHJhY3RcIiB2aWV3UHJvcHM9e3sgbmF2YmFyVGl0bGU6ICdGYWRlIENvbnRyYWN0JyB9fT5cblx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+PHNwYW4+RmFkZSBDb250cmFjdCA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LW11dGVkXCI+KG5vbi1zdGFuZGFyZCk8L3NwYW4+PC9zcGFuPjwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPlNob3c8L1VJLkdyb3VwSGVhZGVyPlxuXHRcdFx0XHQ8VUkuR3JvdXA+XG5cdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOnRyYW5zaXRpb25zLXRhcmdldFwiIHRyYW5zaXRpb249XCJzaG93LWZyb20tbGVmdFwiIHZpZXdQcm9wcz17eyBuYXZiYXJUaXRsZTogJ1Nob3cgZnJvbSBMZWZ0JyB9fT5cblx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+PHNwYW4+U2hvdyBmcm9tIExlZnQgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1tdXRlZFwiPihub24tc3RhbmRhcmQpPC9zcGFuPjwvc3Bhbj48L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOnRyYW5zaXRpb25zLXRhcmdldFwiIHRyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIiB2aWV3UHJvcHM9e3sgbmF2YmFyVGl0bGU6ICdTaG93IGZyb20gUmlnaHQnIH19PlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj5TaG93IGZyb20gUmlnaHQ8L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0PExpbmsgdG89XCJhcHA6dHJhbnNpdGlvbnMtdGFyZ2V0LW92ZXJcIiB0cmFuc2l0aW9uPVwic2hvdy1mcm9tLXRvcFwiIHZpZXdQcm9wcz17eyBuYXZiYXJUaXRsZTogJ1Nob3cgZnJvbSBUb3AnIH19PlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj48c3Bhbj5TaG93IGZyb20gVG9wIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtbXV0ZWRcIj4obm9uLXN0YW5kYXJkKTwvc3Bhbj48L3NwYW4+PC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdDxMaW5rIHRvPVwiYXBwOnRyYW5zaXRpb25zLXRhcmdldC1vdmVyXCIgdHJhbnNpdGlvbj1cInNob3ctZnJvbS1ib3R0b21cIiB2aWV3UHJvcHM9e3sgbmF2YmFyVGl0bGU6ICdTaG93IGZyb20gQm90dG9tJyB9fT5cblx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+U2hvdyBmcm9tIEJvdHRvbTwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPlJldmVhbDwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdDxVSS5Hcm91cD5cblx0XHRcdFx0XHQ8TGluayB0bz1cInRhYnM6dHJhbnNpdGlvbnMtdGFyZ2V0XCIgdHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLWxlZnRcIiB2aWV3UHJvcHM9e3sgbmF2YmFyVGl0bGU6ICdSZXZlYWwgZnJvbSBMZWZ0JyB9fT5cblx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+PHNwYW4+UmV2ZWFsIGZyb20gTGVmdCA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LW11dGVkXCI+KG5vbi1zdGFuZGFyZCk8L3NwYW4+PC9zcGFuPjwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0XHQ8TGluayB0bz1cInRhYnM6dHJhbnNpdGlvbnMtdGFyZ2V0XCIgdHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgdmlld1Byb3BzPXt7IG5hdmJhclRpdGxlOiAnUmV2ZWFsIGZyb20gUmlnaHQnIH19PlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj5SZXZlYWwgZnJvbSBSaWdodDwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0XHQ8TGluayB0bz1cImFwcDp0cmFuc2l0aW9ucy10YXJnZXQtb3ZlclwiIHRyYW5zaXRpb249XCJyZXZlYWwtZnJvbS10b3BcIiB2aWV3UHJvcHM9e3sgbmF2YmFyVGl0bGU6ICdSZXZlYWwgZnJvbSBUb3AnIH19PlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj48c3Bhbj5SZXZlYWwgZnJvbSBUb3AgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1tdXRlZFwiPihub24tc3RhbmRhcmQpPC9zcGFuPjwvc3Bhbj48L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0PExpbmsgdG89XCJhcHA6dHJhbnNpdGlvbnMtdGFyZ2V0LW92ZXJcIiB0cmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tYm90dG9tXCIgdmlld1Byb3BzPXt7IG5hdmJhclRpdGxlOiAnUmV2ZWFsIGZyb20gQm90dG9tJyB9fT5cblx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+UmV2ZWFsIGZyb20gQm90dG9tPC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXHRcdFx0PC9Db250YWluZXI+XG5cdFx0KTtcblx0fVxufSk7XG4iXX0=
