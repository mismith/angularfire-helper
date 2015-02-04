# AngularFire Helper

Simplifies common AngularFire interactions by enhancing the flexibility and portability of the `$firebase` service.

[![GitHub version](https://badge.fury.io/gh/mismith%2Fangularfire-helper.svg)](http://badge.fury.io/gh/mismith%2Fangularfire-helper)

## Setup

1. Include Firebase and AngularFire dependencies, then this library (replace `X.X.X` with proper version)

        <script src="//cdn.firebase.com/js/client/2.0.6/firebase.js"></script>
        <script src="//cdn.firebase.com/libs/angularfire/0.9.0/angularfire.min.js"></script>
        <script src="//rawgit.com/mismith/angularfire-helper/X.X.X/angularfire-helper.min.js"></script>

2. Include this library as a module dependency in your angular application (instead of `firebase`)

        angular.module('my-app', ['firebaseHelper'])

3. Set your Firebase namespace

        .config(function($firebaseHelperProvider){
        	$firebaseHelperProvider.namespace('my-app');

        	// if you want to test something on a `firebaseio-demo.com` domain, enable it like so:
        	$firebaseHelperProvider.demo(true);
        })

4. Include the `$firebaseHelper` service in place of the usual `$firebase` one

        .controller('AppCtrl', function($scope, $firebaseHelper){
            // old
            var ref = new Firebase('https://my-app.firebaseio.com/');
            $rootScope.myObject = $firebase(ref.child('myObject')).$asObject();

            // new
        	$rootScope.myObject = $firebaseHelper.object('myObject');
        })



## API

### $firebaseHelperProvider

* `namespace([name])`

    Gets or sets the name of your Firebase app, i.e. the subdomain part of a URL like: `https://<name>.firebaseio.com/`. You must configure this before calling any `$firebaseHelper` methods.

* `demo([enable])`

    Use a `firebaseio-demo.com` URL by passing boolean `true`.



### $firebaseHelper

<a name="arguments"></a>
#### `arguments…`

If the first parameter in any of the respective functions below is one of the following:

* a `Firebase` reference,
* a `$firebase` instance,
* a `$FirebaseObject`, or
* a `$FirebaseArray`,

Then it will be detected as so, and the subsequent arguments will be treated as strings to be joined as a child path. The resulting node will therefore be a child of the first node. For example:

    var ref  = $firebaseHelper.ref('parent'),
    	obj1 = $firebaseHelper.object(ref, 'child1/child2', 'child3'),
    	obj2 = $firebaseHelper.object('parent/child1/child2/child3');

    // obj1 == obj2


#### Authentication

* <code>auth([[arguments…](#arguments)])</code>

    **Returns**: an Angular-augmented authentication object.

    **Replaces**: `$firebaseAuth(ref)`.


#### Data Types

* <code>ref([[arguments…](#arguments)])</code>

    **Returns**: a `Firebase` reference at the API level, i.e. with no angular enhancements.

    **Replaces**: `new Firebase(path)`.


* <code>inst([[arguments…](#arguments)])</code>

    **Returns**: a `$firebase` instance.

    **Replaces**: `$firebase(ref)`.

        // without $firebaseHelper
        $firebase(new Firebase(baseUrl + '/' + path + '/' + subpath1 + '/' + subpath2));
        $firebase(ref);

        // with $firebaseHelper
        $firebaseHelper.inst(path, subpath1, subpath2);
        $firebaseHelper.inst(ref);


* <code>object([[arguments…](#arguments)][, asArray])</code>

    **Returns**: a `$FirebaseObject`, or, if the last parameter === `true`, then a `$FirebaseArray`.

    **Replaces**: `$firebase().$asObject()` and `$firebase().$asArray()`, respectively.


* <code>array([[arguments…](#arguments)])</code>

    **Returns**: a `$FirebaseArray`.

    **Replaces**: shortcut for <code>$firebaseHelper.object([[arguments…](#arguments)], true)</code>.


* <code>load([[arguments…](#arguments)][, asArray])</code>

    **Returns**: a promise that resolves when the required resource is ready. The first param of the callback will be that loaded resource.

    **Replaces**: shortcut for <code>$firebaseHelper.object([[arguments…](#arguments)][, asArray]).$loaded()</code>.


#### Utility

* `populate(keys, values, cbAdded, cbAll)`

    **Returns**: an array of `$FirebaseObject`s. Both `keys` and `values` params work like <code>[arguments…](#arguments)</code> in that they can be strings or special Firebase objects, or arrays thereof.

    `cbAdded` is a callback function that will be called every time a `values`-linked `$FirebaseObject` is loaded (the object itself being passed as a callback param). If the callback returns a promise, the `$FirebaseObject` won't be added to the populated array until that promise is resolved. e.g.

        var delayedCount = 0;
        $scope.populated = $firebaseHelper.populate('keys', 'values', function(loadedValueObject){
            var deferred = $q.defer();

            $timeout(function(){
                delayedCount++;
                deferred.resolve(); // `$scope.populated` now contains `loadedValueObject`
            }, 2000);

            return deferred.promise;
        });

    `cbAll` is a callback function that will be called once (more accurately, each time) the values array's length matches the keys array's length. In essence, this can be used as a quasi-`loaded` callback, useful for iterating/transforming/chaining the resultant array once all its children are loaded/ready.

* `intersect(keysPath, valuesPath[, keysMap[, valuesMap]])`

    Call `Firebase.util`s more thorough (but significantly slower) populating/intersecting algorithm.

    **Requires**: external `Firebase.util` library, see: [https://github.com/firebase/firebase-util](https://github.com/firebase/firebase-util)
