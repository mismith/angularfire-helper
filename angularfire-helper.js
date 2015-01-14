angular.module('firebaseHelper', ['firebase'])

	.provider('$firebaseHelper', function(){
		var namespace = '',
			cached    = {};
			
		// get or set namespace/Firebase reference domain
		this.namespace = function(set){
			if(set !== undefined) namespace = set;
			return namespace;
		};
		
		this.$get = ['$firebase', '$firebaseAuth', '$q', function($firebase, $firebaseAuth, $q){
			var self = this;
			
			// $firebaseAuth wrapper
			self.auth = function(ref){
				if(ref === undefined) ref = self.ref(); // empty, use root by default
				else if(angular.isString(ref)) ref = self.ref(ref); // string/path
				else if(angular.isFunction(ref.$ref)) ref = ref.$ref; // Instance
				
				return $firebaseAuth(ref);
			};
			
			// returns: Reference
			self.ref = function(){
				var args = Array.prototype.slice.call(arguments);
				
				var path = 'Ref/' + args.join('/');
				if(cached[path]) return cached[path];
				
				var $ref = new Firebase('https://' + namespace + '.firebaseio.com/' + (args.join('/') || ''));
				cached[path] = $ref;
				
				return $ref;
			};
			
			// returns: Instance
			self.inst = function(){
				if(arguments.length == 1 && arguments[0] instanceof Firebase){
					// accept/handle firebase $ref as argument too, not just string(s)
					var ref  = arguments[0],
						path = 'Inst' + ref.path;
					
					if(cached[path]) return cached[path];
					
					var $inst = $firebase(ref);
					cached[path] = $inst;
				
					return $inst;
				}else{
					// handle string(s)
					var args = Array.prototype.slice.call(arguments),
						path = 'Inst/' + args.join('/');
					if(cached[path]) return cached[path];
					
					var $inst = $firebase(self.ref.apply(this, args));
					cached[path] = $inst;
				
					return $inst;
				}
			};
			
			// returns: Object [or Array]
			// N.B. if last argument === true, return Array instead of Object
			self.object = function(){
				var args = Array.prototype.slice.call(arguments),
					type = 'Object';
				
				if(args[args.length - 1] === true){
					type = 'Array';
					args.pop();
				}
				
				// retrieve cached item, if possible
				var path = type + '/' + args.join('/');
				if(cached[path]) return cached[path];
				
				// retrieve from remote, then cache it for later
				var $get = self.inst.apply(this, args)['$as'+type]();
				cached[path] = $get;
				
				return $get;
			};
			self.array = function(){
				var args = Array.prototype.slice.call(arguments);
				args.push(true); // append true as last argument
				
				return self.object.apply(this, args);
			};
			
			// returns: promise for Object or Array
			self.load = function(){
				return self.get.apply(this, arguments).$loaded();
			};
			
			// returns: Instance
			self.child = function(){
				var args = Array.prototype.slice.call(arguments),
					parent = args.shift();
				
				if(angular.isFunction(parent.$inst)){ // it's a Firebase Object or Array
					parent = parent.$inst();
				}
				if(angular.isFunction(parent.$ref)){ // it's a Firebase Instance
					parent = parent.$ref();
				}
				if(angular.isFunction(parent.child)){ // it's a Firebase Reference
					return self.inst(parent.child(args.join('/')));
				}
				return parent; // fallback to parent
			};
			
			// populate a list of keys with the model values they reference
			self.populate = function(keys, values, cbAdded){
				var array   = [],
					keysRef = self.ref(keys);
				
				// fire callback even if no keys found
				keysRef.once('value', function(snapshot){
					if( ! angular.isObject(snapshot.val())){
						if(angular.isFunction(cbAdded)) cbAdded();
					}
				});
				
				// watch for additions/deletions at keysRef
				keysRef.on('child_added', function(snapshot){
					var $item = self.get(values, snapshot.key());
					
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
				if( ! Firebase.util) throw new Error('$firebaseHelper.intersect requires Firebase.util external library. See: https://github.com/firebase/firebase-util');
				
				// @TODO: cache somehow
				
				var keysObj   = {ref: self.ref(keysPath)},
					valuesObj = {ref: self.ref(valuesPath)};
				
				if(keysMap)   keysObj.keyMap   = keysMap;
				if(valuesMap) valuesObj.keyMap = valuesMap;
				
				return $firebase(Firebase.util.intersection(keysObj, valuesObj)).$asArray();
			};
			
			return self;
		}];
	});