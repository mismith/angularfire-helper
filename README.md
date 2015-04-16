# AngularFire Helper

[![GitHub version](https://badge.fury.io/gh/mismith%2Fangularfire-helper.svg)](http://badge.fury.io/gh/mismith%2Fangularfire-helper)

Simplifies common [AngularFire](https://github.com/firebase/angularfire) interactions by enhancing the flexibility and portability of the `firebase` module. Primary advantages:

- **cleaner code**; no need to maintain a `BASE_URL` or repeat `new Firebase(BASE_URL + path)`
- **simpler dependencies**; inject only one service instead of three (`$firebaseObject`+`$firebaseArray`+`$firebaseAuth` &rarr; `$firebaseHelper`)
- **improved performance**; caches all three Firebase data types (reference, object, array)
- **augmented 'joins'**; access normalized data via key-object-association

# Setup

1. Include [AngularJS](http://angularjs.org/) (1.3.4+), [Firebase](http://www.firebase.com/?utm_medium=web&utm_source=angularfire-helper) (2.2.3+), and [AngularFire](https://www.firebase.com/docs/web/libraries/angular/?utm_medium=web&utm_source=angularfire-heler) (1.0.0+) dependencies, then this library (replace `X.X.X` with latest version)

        <script src="//ajax.googleapis.com/ajax/libs/angularjs/1.3.4/angular.min.js"></script>
        <script src="//cdn.firebase.com/js/client/2.2.3/firebase.js"></script>
        <script src="//cdn.firebase.com/libs/angularfire/1.0.0/angularfire.min.js"></script>
        <script src="//cdn.rawgit.com/mismith/angularfire-helper/X.X.X/angularfire-helper.min.js"></script>

2. Include this library as a module dependency in your angular app (instead of `firebase`)

        angular.module('my-app', ['firebaseHelper'])

3. Set your Firebase namespace

        .config(function($firebaseHelperProvider){
            $firebaseHelperProvider.namespace('my-app');
        })

4. Include the `$firebaseHelper` service (in place of `$firebaseObject`, `$firebaseArray`, and `$firebaseAuth`)

        .controller('AppCtrl', function($scope, $firebaseHelper){
            $scope.myObject = $firebaseHelper.object('myObject');
        })



# API

## $firebaseHelperProvider

* `namespace(name)`

    Gets or sets the name of your Firebase app, i.e. the subdomain part of a URL like: `https://<name>.firebaseio.com/`. You must configure this before calling any `$firebaseHelper` methods.

    **Example**:

        .config(function($firebaseHelperProvider){
          $firebaseHelperProvider.namespace('my-app');
        })

* `demo(enable)`

    Use a `firebaseio-demo.com` URL by passing boolean `true`. (Uses the default `firebaseio.com` otherwise.)

    **Example**:

        .config(function($firebaseHelperProvider){
          $firebaseHelperProvider.demo(true);
        })


## $firebaseHelper

<a name="arguments"></a>
### Arguments…

If the first parameter in any functions below is one of the following:

* a `Firebase` reference,
* a `$firebaseObject`, or
* a `$firebaseArray`

Then it will be detected as so, and the subsequent arguments will be treated as strings to be joined as a child path. The resulting node will therefore be a child of the first node.

**Example**:

    var ref  = $firebaseHelper.ref('parent'),
        obj1 = $firebaseHelper.object(ref, 'child1/child2', 'child3'),
        obj2 = $firebaseHelper.object('parent/child1/child2/child3');

    // obj1 === obj2


### Authentication

* <code>auth([[arguments…](#arguments)])</code>

    **Returns**: an Angular-augmented authentication object.

    **Replaces**: `$firebaseAuth(ref)`.

    **Example**:

        var old = $firebaseAuth(new Firebase(BASE_URL + 'parent/child1'));
        var new = $firebaseHelper.auth('parent/child1');

        // old === new


### Data Types

* <code>ref([[arguments…](#arguments)])</code>

    **Returns**: a `Firebase` reference at the API level, _i.e._ with no angular enhancements.

    **Replaces**: `new Firebase(BASE_URL + path)`.

    **Example**:

        var old = new Firebase(BASE_URL + 'parent/child1');
        var new = $firebaseHelper.ref('parent/child1');

        // old === new


* <code>object([[arguments…](#arguments)][, asArray])</code>

    **Returns**: a `$firebaseObject`, or, if the last parameter === `true`, then a `$firebaseArray`.

    **Replaces**: `$firebaseObject()` and `$firebaseArray()`, respectively.

    **Example**:

        var old = $firebaseObject(new Firebase(BASE_URL + 'parent/child1'));
        var new = $firebaseHelper.object('parent/child1');

        // old === new

    and

        var old = $firebaseArray(new Firebase(BASE_URL + 'parent/child1'));
        var new = $firebaseHelper.object('parent/child1', true);

        // old === new


* <code>array([[arguments…](#arguments)])</code>

    **Returns**: a `$firebaseArray`.

    **Replaces**: shortcut for <code>$firebaseHelper.object([[arguments…](#arguments)], true)</code>.

    **Example**:

        var old = $firebaseArray(new Firebase(BASE_URL + 'parent/child1'));
        var new = $firebaseHelper.array('parent/child1');

        // old === new


### Utility

* <code>load([[arguments…](#arguments)][, asArray])</code>

    **Returns**: a promise that resolves when the required resource is ready. The first param of the callback will be that loaded resource.

    **Replaces**: shortcut for <code>$firebaseHelper.object([[arguments…](#arguments)][, asArray]).$loaded()</code>.

    **Example**:

        var old, new;

        $firebaseArray(new Firebase(BASE_URL + 'parent/child1')).$loaded().then(function(child1){
          old = child1;
        });
        $firebaseHelper.load('parent/child1', true).then(function(child1){
          new = child1;
        });

        // once both loaded: old === new


* <code>join([keys…](#arguments), [values…](#arguments))</code>

    **Returns**: a `$firebaseJoin` array of key-value-associated objects. Both `keys…` and `values…` params work like <code>[arguments…](#arguments)</code> in that they can be strings, special Firebase data types, or arrays thereof.

    **Replaces**: wrapper for custom `$firebaseJoin` service ([see below](#firebasejoin)).

    **Example**:

        var keys     = $firebaseHelper.ref('keys'),
            myObject = $firebaseHelper.object('parent'),
            joined   = $firebaseHelper.join(keys, [myObject, 'child1']);

      `joined` contains all children of `/parent/child1` whose `$id` is present in `/keys`


<a name="firebasejoin"></a>
## $firebaseJoin

Allows access to an filtered array of data objects as if it were a normal `$firebaseArray`, where key-value-associations are automatically taken into account.

_i.e._ Given a Firebase data structure like this:

    {
      keys: {
        value1: 'value1',
        value3: 'value3'
      },
      parent: {
        child1: {
          value1: 1,
          value2: 2,
          value3: 3,
          value4: 4
        }
      }
    }

<p></p>

    $firebaseJoin('keys', 'parent/child1').$loaded(function(data){
      // data == {value1: 1, value3: 3};
    })

### Manipulation

All `$firebaseArray`-like methods are provided, including new and augmented functionality:

* `$add(data)`

  Create a new object in `values` then create a key in `keys` to link it.

  **Example**:

      $firebaseJoin('keys', 'parent/child1').$add({name: 'Name'})

  <table>
    <tr>
      <td valign="top"><pre>
  {
    keys: {
      value1: 'value1',
      value3: 'value3'
    },
    parent: {
      child1: {
        value1: 1,
        value2: 2,
        value3: 3,
        value4: 4
      }
    }
  }</pre></td>
      <td>&rarr;</td>
      <td><pre>
  {
    keys: {
      value1: 'value1',
      value3: 'value3',
      '-JABCDE12345fghi0000': '-JABCDE12345fghi0000'
    },
    parent: {
      child1: {
        value1: 1,
        value2: 2,
        value3: 3,
        value4: 4,
        '-JABCDE12345fghi0000': {
          name: 'Name'
        }
      }
    }
  }</pre></td>
    </tr>
  </table>

* `$save(indexOrItem)`

  Update an existing value object in `values` (without affecting `keys`).

  **Example**:

      var joined = $firebaseJoin('keys', 'parent/child1'),
          value3 = joined.$getRecord('value3');

      value3.$value += 2;
      joined.$save('value3');

  <table>
    <tr>
      <td><pre>
  {
    keys: {
      value1: 'value1',
      value3: 'value3'
    },
    parent: {
      child1: {
        value1: 1,
        value2: 2,
        value3: 3,
        value4: 4
      }
    }
  }</pre></td>
      <td>&rarr;</td>
      <td valign="top"><pre>
  {
    keys: {
      value1: 'value1',
      value3: 'value3'
    },
    parent: {
      child1: {
        value1: 1,
        value2: 2,
        value3: 5,
        value4: 4
      }
    }
  }</pre></td>
    </tr>
  </table>

* `$remove(indexOrItem)`

  Delete an existing value object from `values` then delete its key from `keys`.

  **Example**:

      $firebaseJoin('keys', 'parent/child1').$remove('value3')

  <table>
    <tr>
      <td><pre>
  {
    keys: {
      value1: 'value1',
      value3: 'value3'
    },
    parent: {
      child1: {
        value1: 1,
        value2: 2,
        value3: 3,
        value4: 4
      }
    }
  }</pre></td>
      <td>&rarr;</td>
      <td valign="top"><pre>
  {
    keys: {
      value1: 'value1'
    },
    parent: {
      child1: {
        value1: 1,
        value2: 2,
        value4: 4
      }
    }
  }</pre></td>
    </tr>
  </table>

* `$unjoin(indexOrItem)`

  Delete an existing key from `keys` but leave its value object intact in `values`.

  **Example**:

      $firebaseJoin('keys', 'parent/child1').$unjoin('value3')

  <table>
    <tr>
      <td><pre>
  {
    keys: {
      value1: 'value1',
      value3: 'value3'
    },
    parent: {
      child1: {
        value1: 1,
        value2: 2,
        value3: 3,
        value4: 4
      }
    }
  }</pre></td>
      <td>&rarr;</td>
      <td valign="top"><pre>
  {
    keys: {
      value1: 'value1'
    },
    parent: {
      child1: {
        value1: 1,
        value2: 2,
        value3: 3,
        value4: 4
      }
    }
  }</pre></td>
    </tr>
  </table>


### Utility

* `$loaded([resolve[, reject]])`

  Wait for all filtered value objects to load.