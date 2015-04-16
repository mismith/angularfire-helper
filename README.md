# AngularFire Helper

Simplifies common AngularFire interactions by enhancing the flexibility and portability of the `$firebase` service.

[![GitHub version](https://badge.fury.io/gh/mismith%2Fangularfire-helper.svg)](http://badge.fury.io/gh/mismith%2Fangularfire-helper)

## Setup

1. Include Firebase (2.2.3+) and AngularFire (1.0.0+) dependencies, then this library (replace `X.X.X` with latest version)

        <script src="//cdn.firebase.com/js/client/2.2.3/firebase.js"></script>
        <script src="//cdn.firebase.com/libs/angularfire/1.0.0/angularfire.min.js"></script>
        <script src="//cdn.rawgit.com/mismith/angularfire-helper/X.X.X/angularfire-helper.min.js"></script>

2. Include this library as a module dependency in your angular application (can replace `firebase`)

        angular.module('my-app', ['firebaseHelper'])

3. Set your Firebase namespace

        .config(function($firebaseHelperProvider){
        	$firebaseHelperProvider.namespace('my-app');

        	// if you want to test something on a `firebaseio-demo.com` domain, enable it like so:
        	$firebaseHelperProvider.demo(true);
        })

4. Include the `$firebaseHelper` service in place of `$firebase[Object|Array]`

        .controller('AppCtrl', function($scope, $firebaseHelper){
            // old
            $scope.myObject = $firebaseObject(new Firebase('https://my-app.firebaseio.com/myObject'));

            // new
        	$scope.myObject = $firebaseHelper.object('myObject');
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
* a `$firebaseObject`, or
* a `$firebaseArray`,

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


* <code>object([[arguments…](#arguments)][, asArray])</code>

    **Returns**: a `$firebaseObject`, or, if the last parameter === `true`, then a `$firebaseArray`.

    **Replaces**: `$firebaseObject()` and `$firebaseArray()`, respectively.


* <code>array([[arguments…](#arguments)])</code>

    **Returns**: a `$firebaseArray`.

    **Replaces**: shortcut for <code>$firebaseHelper.object([[arguments…](#arguments)], true)</code>.


* <code>load([[arguments…](#arguments)][, asArray])</code>

    **Returns**: a promise that resolves when the required resource is ready. The first param of the callback will be that loaded resource.

    **Replaces**: shortcut for <code>$firebaseHelper.object([[arguments…](#arguments)][, asArray]).$loaded()</code>.


* <code>join([keys…](#arguments), [values…](#arguments))</code>

    **Returns**: a special `$firebaseArray` of `$firebaseObject`s, whereupon methods affecting the relationships between keys and values will be automatically taken into account. Both `keys…` and `values…` params work like <code>[arguments…](#arguments)</code> in that they can be strings, or special Firebase objects, or arrays thereof.

    **Replaces**: wrapper for custom `$firebaseJoin` service (which extends the native `$firebaseArray`).
