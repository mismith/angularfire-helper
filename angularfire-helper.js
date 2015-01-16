angular.module('firebaseHelper', ['firebase'])

	.provider('$firebaseHelper', function(){
		var namespace = '',
			demo      = false,
			cache     = {};

		// get or set namespace/Firebase reference domain
		this.namespace = function(set){
			if(set !== undefined) namespace = set;
			return namespace;
		};

		// is this a demo url?
		this.demo = function(set){
			if(set !== undefined) demo = set;
			return demo;
		};

		var url = this.url = function(){
			if( ! namespace) throw new Error('Firebase namespace not set, configure $firebaseHelperProvider.namespace(\'my-app\') before using $firebaseHelper.');
			return 'https://' + namespace + '.firebaseio' + (demo ? '-demo' : '') + '.com/';
		};
		var trim = function(path){
			return path.replace(/^\/+/, '');
		};

		this.$get = ['$firebase', '$firebaseAuth', '$q', function($firebase, $firebaseAuth, $q){
			var self = this;

			// auto-detects input and turns any supported special object or string path [chunks] into a specified type
			var $get = self.$get = function(input, as){
				var $inst,
					path = as;

				// first let's get everything to a Firebase Instance since we can get the others from there
				if(angular.isString(input)){ // it's a string path
					$inst = $firebase(new Firebase(url() + trim(input)));
				}else if(angular.isArray(input)){ // it's an array
					if(input.length){
						if(angular.isString(input[0])){ // of string path chunks
							$inst = $firebase(new Firebase(url() + trim(input.join('/'))));
						}else{ // first item is a special object itself
							// so let's recurse to get the first item as a Firebase Reference
							var parent = input.shift(),
								ref    = $get(parent, 'ref');

							// then join the remaining arguments as a path to it's child
							ref = ref.child(trim(input.join('/')));

							// then wrap it for further processing
							$inst = $firebase(ref);
						}
					}
				}else if(angular.isObject(input)){
					if(angular.isFunction(input.$inst)){ // it's a Firebase Object or Array
						$inst = input.$inst();
					}else if(angular.isFunction(input.$ref)){ // it's a Firebase Instance
						$inst = input;
					}else if(angular.isFunction(input.child)){ // it's a Firebase Reference
						$inst = $firebase(input);
					}
				}
				if( ! $inst){ // it's undefined or undetectable, so just use the root path
					$inst = $firebase(new Firebase(url()));
				}

				// let's check if we have it cached already, and return that if so
				path += $inst.$ref().path.toString();
				if(cache[path]) return cache[path];

				// otherwise let's cache it and return it
				switch(as){
					case 'ref':
						return cache[path] = $inst.$ref();
					default:
					case 'inst':
						return cache[path] = $inst;
					case 'object':
						return cache[path] = $inst.$asObject();
					case 'array':
						return cache[path] = $inst.$asArray();
				}
			};



			// $firebaseAuth wrapper
			self.auth = function(){
				return $firebaseAuth($get(Array.prototype.slice.call(arguments), 'ref'));
			};


			// returns: Reference
			self.ref = function(){
				return $get(Array.prototype.slice.call(arguments), 'ref');
			};

			// returns: Instance
			self.inst = function(){
				return $get(Array.prototype.slice.call(arguments), 'inst');
			};

			// returns: Object [or Array]
			// N.B. if last argument === true, return Array instead of Object
			self.object = function(){
				var args = Array.prototype.slice.call(arguments),
					type = 'object';

				if(args[args.length - 1] === true){
					type = 'array';
					args.pop();
				}

				return $get(args, type);
			};
			self.array = function(){
				var args = Array.prototype.slice.call(arguments);
				args.push(true); // append true as last argument

				return self.object.apply(this, args);
			};



			// returns: promise for Object [or Array]
			self.load = function(){
				return self.object.apply(this, arguments).$loaded();
			};

			// populate a list of keys with the values they reference
			self.populate = function(keys, values, cbAdded){
				var array   = [],
					keysRef = $get(keys, 'ref');

				// fire callback even if no keys found
				keysRef.once('value', function(snapshot){
					if( ! angular.isObject(snapshot.val())){
						if(angular.isFunction(cbAdded)) cbAdded();
					}
				});

				// watch for additions/deletions at keysRef
				keysRef.on('child_added', function(snapshot){
					var $item = $get([values, snapshot.key()], 'object');

					$item.$loaded().then(function(){
						var deferreds = [];
						if(angular.isFunction(cbAdded)) deferreds.push(cbAdded($item));

						$q.all(deferreds).then(function(){
							array.push($item);
						});
					});
				});
				keysRef.on('child_removed', function(snapshot){
					var i = -1,
						$id = snapshot.key();

					angular.forEach(array, function(item, j){
						if(i >= 0) return;
						if(item.$id == $id) i = j;
					});
					if(i >= 0) array.splice(i, 1);
				});
				return array;
			};

			// @requires: external Firebase.util library: https://github.com/firebase/firebase-util
			self.intersect = function(keysPath, valuesPath, keysMap, valuesMap){
				if( ! Firebase.util) throw new Error('$firebaseHelper.intersect() requires the `Firebase.util` external library. See: https://github.com/firebase/firebase-util');

				// @TODO: cache somehow

				var keysObj   = {ref: self.ref(keysPath)},
					valuesObj = {ref: self.ref(valuesPath)};

				if(keysMap)   keysObj.keyMap   = keysMap;
				if(valuesMap) valuesObj.keyMap = valuesMap;

				return $firebase(Firebase.util.intersection(keysObj, valuesObj)).$asArray();
			};
			//*/

			return self;
		}];
	});
