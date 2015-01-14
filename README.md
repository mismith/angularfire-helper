# AngularFire Helper

Helper service to simplify and improve common AngularFire tasks

# Setup

1. Include Firebase and AngularFire dependencies, then this library

        <script src="//cdn.firebase.com/js/client/2.0.6/firebase.js"></script>
        <script src="//cdn.firebase.com/libs/angularfire/0.9.0/angularfire.min.js"></script>
        <script src="//rawgit.com/mismith/angularfire-helper/1.0.0/angularfire-helper.min.js"></script>

2. Include this library in your angular application (instead of `firebase`)

        angular.module('my-app', ['firebaseHelper'])

3. Set your Firebase namespace

        .config(function($firebaseHelperProvider){
        	$firebaseHelperProvider.namespace('my-app');
        })

4. Include the `$firebaseHelper` factory in place of `$firebase`, e.g.

        .controller('AppCtrl', function($scope, $firebaseHelper){
	        // '$rootScope.myObject = $firebase(fbRef.child('myObject')).$asObject();' becomes:
        	$rootScope.myObject = $firebaseHelper.object('myObject');
        })
