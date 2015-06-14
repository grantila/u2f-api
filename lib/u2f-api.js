'use strict';

var coreApi = require( './google-u2f-api' );

module.exports = API;

function API( Promise )
{
	return {
		register   : register.bind( Promise ),
		sign       : sign.bind( Promise ),
		ErrorCodes : API.ErrorCodes
	};
}

API.ErrorCodes = {
	CANCELED: -1
};
var errorMap = {
	'-1': 'CANCELED'
};

Object.keys( coreApi.ErrorCodes ).forEach( function( key ) {
	API.ErrorCodes[ key ] = coreApi.ErrorCodes[ key ];
	errorMap[ '' + coreApi.ErrorCodes[ key ] ] = key;
} );

function makeError( msg, err )
{
	var code = err != null ? err.errorCode : 1; // Default to OTHER_ERROR
	var type = errorMap[ '' + code ];
	var error = new Error( msg );
	error.metaData = {
		type: type,
		code: code
	}
	return error;
}

function defer( Promise, fun )
{
	var ret = { };
	ret.promise = new Promise( function( resolve, reject ) {
		ret.resolve = resolve;
		ret.reject = reject;
		fun && fun( resolve, reject );
	} );
	ret.promise.cancel = function( msg )
	{
		ret.reject( makeError( msg, { errorCode: -1 } ) )
	}
	return ret;
}

function register( registerRequests, signRequests /* = null */, timeout )
{
	var Promise = this;

	if ( !Array.isArray( registerRequests ) )
		registerRequests = [ registerRequests ];

	if ( typeof signRequests === 'number' && typeof timeout === 'undefined' )
	{
		timeout = signRequests;
		signRequests = null;
	}

	if ( !signRequests )
		signRequests = [ ];

	return defer( Promise, function( resolve, reject ) {
		function cb( response ) {
			if ( response.errorCode )
				reject( makeError( "Registration failed", response ) );
			else
				resolve( response );
		}
		coreApi.register( registerRequests, signRequests, cb, timeout );
	} ).promise;
}

function sign( signRequests, timeout )
{
	var Promise = this;

	if ( !Array.isArray( signRequests ) )
		signRequests = [ signRequests ];

	return defer( Promise, function( resolve, reject ) {
		function cb( response ) {
			if ( response.errorCode )
				reject( makeError( "Sign failed", response ) );
			else
				resolve( response );
		}
		coreApi.sign( signRequests, cb, timeout );
	} ).promise;
}

function makeDefault( func )
{
	API[ func ] = function( )
	{
		if ( !global.Promise )
			// This is very unlikely to ever happen, since browsers
			// supporting U2F will most likely support Promises.
			throw new Error( "The platform doesn't natively support promises" );

		var args = [ ].slice.call( arguments );
		return API( global.Promise )[ func ].apply( null, args );
	};
}

// Provide default functions using the built-in Promise if available.
makeDefault( 'register' );
makeDefault( 'sign' );
