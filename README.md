# u2f-api

U2F API for browsers

## API

### Loading the library

The library is promisified and will use the built-in native promises of the browser, unless another promise library is injected.

The following are valid ways to load the library:

```js
var u2fApi = require( 'u2f-api' ); // Will use the native Promise
// ... or
var u2fApi = require( 'u2f-api' )( require( 'bluebird' ) ); // Will use bluebird for promises
```

### Registering a passkey

```js
var u2fApi = require( 'u2f-api' )/* ( ... ) */;

// registerRequest can be 1 request, or an array.
u2fApi.register( registerRequests, signRequests = null, timeout = native default )
.then( ... )
.catch( ... );
```

### Signing a passkey

```js
var u2fApi = require( 'u2f-api' )/* ( ... ) */;

u2fApi.sign( signRequests, timeout = native default )
.then( ... )
.catch( ... );
```

### Canceling

The returned promises from `register()` and `sign()` have a method `cancel()` which will cancel the request. This is nothing more than a helper function.
