'use strict';

var coreApi = require( './google-u2f-api' );

module.exports = API;

function API( Promise )
{
	return {
		isSupported   : isSupported.bind( Promise ),
		ensureSupport : ensureSupport.bind( Promise ),
		register      : register.bind( Promise ),
		sign          : sign.bind( Promise ),
		ErrorCodes    : API.ErrorCodes
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
		try
		{
			fun && fun( resolve, reject );
		}
		catch ( err )
		{
			reject( err );
		}
	} );
	ret.promise.cancel = function( msg )
	{
		ret.reject( makeError( msg, { errorCode: -1 } ) )
	}
	return ret;
}

function isSupported( )
{
	var Promise = this;

	var isSafari = navigator.userAgent.match( /Safari\// )
		&& !navigator.userAgent.match( /Chrome\// );

	var isEDGE = navigator.userAgent.match( /Edge\/12/ );

	if ( isSafari || isEDGE )
		return Promise.resolve( false );

	return defer( Promise, coreApi.isSupported ).promise;
}

function ensureSupport( )
{
	var Promise = this;

	return defer( Promise, coreApi.isSupported ).promise
	.then( function( value ) {
		if ( !value )
			throw new Error( "U2F not supported" );
	} );
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
		function cb( err, response ) {
			if ( err )
				reject( err );
			else if ( response.errorCode )
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
		function cb( err, response ) {
			if ( err )
				reject( err );
			else if ( response.errorCode )
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
makeDefault( 'isSupported' );
makeDefault( 'ensureSupport' );
makeDefault( 'register' );
makeDefault( 'sign' );
