'use strict';

import * as chromeApi from './generated-google-u2f-api'


// Feature detection (yes really)
const isBrowser =
	( typeof navigator !== 'undefined' ) && !!navigator.userAgent;
const isSafari = isBrowser && navigator.userAgent.match( /Safari\// )
	&& !navigator.userAgent.match( /Chrome\// );
const isEDGE = isBrowser && navigator.userAgent.match( /Edge\/1[2345]/ );

interface API
{
	u2f: any;
}

export declare type NotYetTyped = { [ key: string ]: any; };
export declare type RegisterRequest = NotYetTyped;
export declare type SignRequest = NotYetTyped;
export declare type RegisterResponse = NotYetTyped;
export declare type SignResponse = NotYetTyped;

var _backend: Promise< API > = null;
function getBackend( )
{
	if ( _backend )
		return _backend

	const supportChecker = new Promise< API >( function( resolve, reject )
	{
		function notSupported( )
		{
			resolve( { u2f: null } );
		}

		if ( !isBrowser )
			return notSupported( );

		if ( isSafari )
			// Safari doesn't support U2F, and the Safari-FIDO-U2F
			// extension lacks full support (Multi-facet apps), so we
			// block it until proper support.
			return notSupported( );

		const hasNativeSupport =
			( typeof ( < any >window ).u2f !== 'undefined' ) &&
			( typeof ( < any >window ).u2f.sign === 'function' );

		if ( hasNativeSupport )
			return resolve( { u2f: ( < any >window ).u2f } );

		if ( isEDGE )
			// We don't want to check for Google's extension hack on EDGE
			// as it'll cause trouble (popups, etc)
			return notSupported( );

		if ( location.protocol === 'http:' )
			// U2F isn't supported over http, only https
			return notSupported( );

		if ( typeof MessageChannel === 'undefined' )
			// Unsupported browser, the chrome hack would throw
			return notSupported( );

		// Test for google extension support
		chromeApi.isSupported( function( ok )
		{
			if ( ok )
				resolve( { u2f: chromeApi } );
			else
				notSupported( );
		} );
	} ).then( function ( response )
		{
			_backend = response.u2f ? supportChecker : null
			return response
		} );

	return supportChecker;
}

export const ErrorCodes = {
	OK: 0,
	OTHER_ERROR: 1,
	BAD_REQUEST: 2,
	CONFIGURATION_UNSUPPORTED: 3,
	DEVICE_INELIGIBLE: 4,
	TIMEOUT: 5
};

export const ErrorNames = {
	"0": "OK",
	"1": "OTHER_ERROR",
	"2": "BAD_REQUEST",
	"3": "CONFIGURATION_UNSUPPORTED",
	"4": "DEVICE_INELIGIBLE",
	"5": "TIMEOUT"
};

function makeError( msg, err )
{
	const code = err != null ? err.errorCode : 1; // Default to OTHER_ERROR
	const type = ErrorNames[ '' + code ];
	const error = new Error( msg );
	( < any >error ).metaData = { type, code };
	return error;
}

export function isSupported( )
{
	return getBackend( )
	.then( backend => !!backend.u2f );
}

function _ensureSupport( backend )
{
	if ( !backend.u2f )
	{
		if ( location.protocol === 'http:' )
			throw new Error( "U2F isn't supported over http, only https" );
		throw new Error( "U2F not supported" );
	}
}

export function ensureSupport( )
{
	return getBackend( )
	.then( _ensureSupport );
}

export function register(
	registerRequests: RegisterRequest | ReadonlyArray< RegisterRequest >,
	signRequests: SignRequest | ReadonlyArray< SignRequest >,
	timeout?: number
): Promise< RegisterResponse >;
export function register(
	registerRequests: RegisterRequest | ReadonlyArray< RegisterRequest >,
	timeout?: number
): Promise< RegisterResponse >;
export function register(
	registerRequests: RegisterRequest | ReadonlyArray< RegisterRequest >,
	signRequests?: SignRequest | ReadonlyArray< SignRequest > | number,
	timeout?: number
)
: Promise< RegisterResponse >
{
	if ( !Array.isArray( registerRequests ) )
		registerRequests = [ registerRequests ];

	if ( typeof signRequests === 'number' && typeof timeout === 'undefined' )
	{
		timeout = signRequests;
		signRequests = null;
	}

	if ( !signRequests )
		signRequests = [ ];

	return getBackend( )
	.then( function( backend )
	{
		_ensureSupport( backend );

		const { u2f } = backend;

		return new Promise< RegisterResponse >( function( resolve, reject )
		{
			function callback( response )
			{
				if ( response.errorCode )
					reject( makeError( "Registration failed", response ) );
				else
				{
					delete response.errorCode;
					resolve( response );
				}
			}

			const appId = registerRequests[ 0 ].appId;

			u2f.register(
				appId, registerRequests, signRequests, callback, timeout );
		} );
	} );
}

export function sign(
	signRequests: SignRequest | ReadonlyArray< SignRequest >,
	timeout?: number
)
: Promise< SignResponse >
{
	if ( !Array.isArray( signRequests ) )
		signRequests = [ signRequests ];

	return getBackend( )
	.then( function( backend )
	{
		_ensureSupport( backend );

		const { u2f } = backend;

		return new Promise< SignResponse >( function( resolve, reject )
		{
			function callback( response )
			{
				if ( response.errorCode )
					reject( makeError( "Sign failed", response ) );
				else
				{
					delete response.errorCode;
					resolve( response );
				}
			}

			const appId = signRequests[ 0 ].appId;
			const challenge = signRequests[ 0 ].challenge;

			u2f.sign( appId, challenge, signRequests, callback, timeout );
		} );
	} );
}
