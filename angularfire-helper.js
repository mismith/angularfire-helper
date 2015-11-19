!(function(){
	angular.module('firebaseHelper', ['firebase'])
	
	.config(function($provide) {
		// add $update convenience method to $firebaseObject
		$provide.decorator('$firebaseObject', function($delegate) {
			$delegate.prototype.$update = function (data) {
				angular.forEach(data, function (v, k) {
					if (/^[a-zA-Z0-9-_]*$/.test(k)) this[k] = v;
				}, this);
				return this.$save();
			};
			return $delegate;
		});
	})
	
	.factory('$firebaseJoin', function($firebaseUtils, $firebaseArray, $firebaseObject, $q, $log){
		var cache = {};
		
		return function(ref, srcRef){
			srcRef = srcRef || ref; // allows for syntax like: `$firebaseJoin(ref)` to product $firebaseArray of $firebaseObjects (as opposed to a $firebaseArray of JS objects if $firebaseJoin wasn't used)
			
			var _proto          = $firebaseArray.prototype,
				_loaded         = $firebaseUtils.defer(),
				_loadedPromises = [];
			
			var firebaseJoin = $firebaseArray.$extend({
				$add: function(data){
					this._assertNotDestroyed('$add');
					var def = $firebaseUtils.defer();
					
					// add to srcRef first
					var objectRef = srcRef.push($firebaseUtils.toJSON(data), $firebaseUtils.makeNodeResolver(def)),
						key       = objectRef.key();
					
					if(key !== null){
						return def.promise.then(function(){
							// then add to local keys
							return $firebaseUtils.doSet(ref.child(key), key).then(function(){
								return objectRef;
							});
						});
					}else{
						return $firebaseUtils.reject('Error adding new record; could not determine new key for '+data);
					}
				},
				$save: function(indexOrItem){
					this._assertNotDestroyed('$save');
					var self = this;
					var item = self._resolveItem(indexOrItem);
					var key = self.$keyAt(item);
					if(key !== null){
						// save to srcRef instead of locally
						var objectRef = srcRef.child(key);
						return $firebaseUtils.doSet(objectRef, $firebaseUtils.toJSON(item)).then(function(){
							self.$$notify('child_changed', key);
							return objectRef;
						});
					}else{
						return $firebaseUtils.reject('Invalid record; could determine key for '+indexOrItem);
					}
				},
				$remove: function(indexOrItem){
					this._assertNotDestroyed('$remove');
					var key = this.$keyAt(indexOrItem);
					if(key !== null){
						// remove from srcRef first
						return $firebaseUtils.doRemove(srcRef.child(key)).then(function(){
							// then remove local key
							return $firebaseUtils.doRemove(ref.child(key));
						});
					}else{
						return $firebaseUtils.reject('Invalid record; could not determine key for '+indexOrItem);
					}
				},
				
				$link: function(key){
					// leave srcRef untouched, but add local key
					return $firebaseUtils.doSet(ref.child(key), key);
				},
				$unlink: function(indexOrItem){
					// keep srcRef intact, but remove local key
					return _proto.$remove.apply(this, arguments);
				},
				
				$$added: function(snap){
					var self = this;
					
					// fetch src-joined object instead of local key value
					var ref    = srcRef.child(snap.key()),
						path   = 'object' + ref.path.toString(),
						object = cache[path] || (cache[path] = $firebaseObject(ref));
					
					// queue for $loaded()
					_loadedPromises.push(object.$loaded());
					
					// @TODO: warn if loaded object doesn't exist / is null
					
					return object;
				},
				
				$loaded: function(resolve, reject){
					var self = this,
						promise = _loaded.promise;
					
					if(arguments.length){
						// allow this method to be called just like .then
						// by passing any arguments on to .then
						promise = promise.then.call(promise, resolve, reject);
					}
					
					// call the default/parent $loaded() first to make sure the `keys` are all loaded (without params because we don't want our real promise to be ready until all `values` object have loaded)
					_proto.$loaded.call(this)
						.then(function(){
							// keys are loaded, so now let's wait for all the values to load
							$q.all(_loadedPromises)
								.then(function(){
									// values all loaded
									_loaded.resolve(self.$list);
								})
								.catch(function(){
									// one or many values failed to load
									_loaded.reject('Could not load all value objects.');
								})
						})
						.catch(function(err){
							// keys didn't load for some reason
							_loaded.reject(err);
						})
					
					return promise;
				},
			});
			
			var path = 'join' + ref.path.toString() + '+' + srcRef.path.toString();
			return cache[path] || (cache[path] = new firebaseJoin(ref));
		};
	})
	
	.provider('$firebaseHelper', function(){
		var namespace = '',
			root      = '',
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
		
		// get or set root reference path
		this.root = function(set){
			if(set !== undefined) root = set;
			return root;
		};
		
		// private methods
		var url = this.url = function(){
			if( ! namespace) throw new Error("Firebase namespace not set, configure $firebaseHelperProvider.namespace('my-app') before using $firebaseHelper.");
			return 'https://' + namespace + '.firebaseio' + (demo ? '-demo' : '') + '.com/' + (root ? root + '/' : '');
		};
		var trim = function(path){
			return path.replace(/^\/+/, '');
		};
		
		// factory
		this.$get = ['$firebaseAuth', '$firebaseArray', '$firebaseObject', '$firebaseJoin', '$q', function($firebaseAuth, $firebaseArray, $firebaseObject, $firebaseJoin, $q){
			var self = this;
			
			// auto-detects input and turns any supported special object or string path [chunks] into a specified type
			var get = self.get = function(input, as){
				var ref,
					path = as || 'ref';
				
				// first let's get everything to a Firebase Instance since we can get the others from there
				if(angular.isString(input)){ // it's a string path
					ref = new Firebase(url() + trim(input));
				}else if(angular.isObject(input)){
					if(angular.isFunction(input.$ref)){ // it's a Firebase Object or Array
						ref = input.$ref();
					}else if(angular.isFunction(input.child)){ // it's a Firebase Reference
						ref = input;
					}else if(angular.isArray(input)){ // it's an array
						if(input.length){
							if(angular.isString(input[0])){ // of string path chunks
								ref = new Firebase(url() + trim(input.join('/')));
							}else{ // first item is a special object itself
								// so let's recurse to get the first item as a Firebase Reference
								var parent    = get(input.shift()),
									childPath = trim(input.join('/'));
								
								// then join the remaining arguments as a path to its child
								ref = childPath ? parent.child(childPath) : parent;
							}
						}
					}
				} 
				if( ! ref){ // it's undefined or undetectable, so just use the root path
					ref = new Firebase(url());
				}
				
				// let's check if we have it cached already, and return that if so
				path += ref.path.toString();
				if(cache[path]) return cache[path];
				
				// otherwise let's cache it and return it
				switch(as){
					default:
					case 'ref':
						return cache[path] = ref;
					case 'object':
						return cache[path] = $firebaseObject(ref);
					case 'array':
						return cache[path] = $firebaseArray(ref);
					case 'join':
						return cache[path] = $firebaseJoin(ref);
				}
			};
			
			// $firebaseAuth wrapper
			self.auth = function(){
				return $firebaseAuth(get(Array.prototype.slice.call(arguments)));
			};
			
			// get string path
			self.path = function(item){
				return get(item).path.toString(); // @TODO: is .path dependable?
			};
			
			// returns: Reference
			self.ref = function(){
				return get(Array.prototype.slice.call(arguments));
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
				
				return get(args, type);
			};
			self.array = function(){
				var args = Array.prototype.slice.call(arguments);
				args.push(true); // append true as last argument
				
				return self.object.apply(this, args);
			};
			
			// returns: Array of Objects
			self.join = function(keys, values){
				return $firebaseJoin(get(keys), values !== undefined ? get(values) : undefined);
			};
			
			// returns: promise for Object [or Array]
			self.load = function(){
				return self.object.apply(this, arguments).$loaded();
			};
			
			return self;
		}];
	});
})();