'use strict';

module.exports = API;

var hasNativeSupport =
	( typeof window.u2f !== 'undefined' ) &&
	( typeof window.u2f.sign === 'function' );
var _u2f = hasNativeSupport ? window.u2f : null;
var chromeApi = hasNativeSupport ? null : require( './google-u2f-api' );

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

var backendErrorCodes = hasNativeSupport ? _u2f : chromeApi.ErrorCodes;
(
	hasNativeSupport
	? [
		'BAD_REQUEST',
		'CONFIGURATION_UNSUPPORTED',
		'DEVICE_INELIGIBLE',
		'OK',
		'OTHER_ERROR',
		'TIMEOUT',
	]
	: Object.keys( chromeApi.ErrorCodes )
)
.forEach( function( key ) {
	API.ErrorCodes[ key ] = backendErrorCodes[ key ];
	errorMap[ '' + backendErrorCodes[ key ] ] = key;
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
	/**
	 * Reject request promise and disconnect port if 'disconnect' flag is true
	 * @param {string} msg
	 * @param {boolean} disconnect
	 */
	ret.promise.cancel = function( msg, disconnect )
	{
		if ( disconnect && !hasNativeSupport )
			chromeApi.disconnect( );

		ret.reject( makeError( msg, { errorCode: -1 } ) );
	};
	return ret;
}

function isSupported( ignorePreconditions /* = false */ )
{
	var Promise = this;

	if ( hasNativeSupport )
		return Promise.resolve( true );

	var isSafari = navigator.userAgent.match( /Safari\// )
		&& !navigator.userAgent.match( /Chrome\// );

	var isEDGE = navigator.userAgent.match( /Edge\/12/ );

	if ( isSafari || isEDGE )
		return Promise.resolve( false );

	if ( !ignorePreconditions )
	{
		if ( location.protocol === 'http:' )
			// U2F isn't supported over http, only https
			return Promise.resolve( false );
	}

	return defer( Promise, chromeApi.isSupported ).promise;
}

function ensureSupport( )
{
	var Promise = this;

	return isSupported.call( Promise )
	.then( function( value ) {
		if ( !value )
		{
			if ( location.protocol === 'http:' )
				throw new Error( "U2F isn't supported over http, only https" );
			throw new Error( "U2F not supported" );
		}
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

	return defer( Promise, function( resolve, reject )
	{
		if ( hasNativeSupport )
		{
			function cb( response )
			{
				if ( response.errorCode )
					reject( makeError( "Registration failed", response ) );
				else
				{
					delete response.errorCode;
					resolve( response );
				}
			}

			const { appId } = registerRequests[ 0 ];

			_u2f.register( appId, registerRequests, signRequests, cb, timeout );
		}
		else
		{
			function cb( err, response )
			{
				if ( err )
					reject( err );
				else if ( response.errorCode )
					reject( makeError( "Registration failed", response ) );
				else
					resolve( response );
			}
			chromeApi.register( registerRequests, signRequests, cb, timeout );
		}
	} ).promise;
}

function sign( signRequests, timeout )
{
	var Promise = this;

	if ( !Array.isArray( signRequests ) )
		signRequests = [ signRequests ];

	return defer( Promise, function( resolve, reject )
	{
		if ( hasNativeSupport )
		{
			function cb( response )
			{
				if ( response.errorCode )
					reject( makeError( "Sign failed", response ) );
				else
				{
					delete response.errorCode;
					resolve( response );
				}
			}

			const { appId, challenge } = signRequests[ 0 ];

			_u2f.sign( appId, challenge, signRequests, cb, timeout );
		}
		else
		{
			function cb( err, response )
			{
				if ( err )
					reject( err );
				else if ( response.errorCode )
					reject( makeError( "Sign failed", response ) );
				else
					resolve( response );
			}

			chromeApi.sign( signRequests, cb, timeout );
		}
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
