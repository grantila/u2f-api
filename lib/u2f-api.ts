'use strict';

import * as chromeApi from './generated-google-u2f-api'


// Feature detection (yes really)
// For IE and Edge detection, see https://stackoverflow.com/questions/31757852#31757969
// and https://stackoverflow.com/questions/56360225#56361977
const isBrowser =
	( typeof navigator !== 'undefined' ) && !!navigator.userAgent;
const isSafari = isBrowser && navigator.userAgent.match( /Safari\// )
	&& !navigator.userAgent.match( /Chrome\// );
const isEDGE = isBrowser && /(Edge\/)|(edg\/)/i.test(navigator.userAgent);
const isIE = isBrowser && /(MSIE 9|MSIE 10|rv:11.0)/i.test(navigator.userAgent);

interface API
{
	u2f: any;
}

export interface RegisterRequest {
	version: string;
	appId: string;
	challenge: string;
}

export interface SignRequest extends RegisterRequest {
	keyHandle: string;
}

export interface RegisterResponse {
	clientData: string;
	registrationData: string;
	version: string;
}

export interface SignResponse {
	clientData: string;
	keyHandle: string;
	signatureData: string;
}

export type Transport = 'bt' | 'ble' | 'nfc' | 'usb';
export type Transports = Array< Transport >;

export interface RegisteredKey {
	version: string;
	keyHandle: string;
	transports: Transports;
	appId: string;
}

var _backend: Promise< API > = null;
function getBackend( )
{
	if ( _backend )
		return _backend;

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

		if ( isEDGE || isIE )
			// We don't want to check for Google's extension hack on EDGE & IE
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
	} )
	.then( function ( response )
	{
		_backend = response.u2f ? supportChecker : null;
		return response;
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

function arrayify< T >(
	value:
			T | Array< T > | Readonly< T > | ReadonlyArray< T > | undefined | null
)
: Array< T >
{
	if ( value != null && Array.isArray( value ) )
		return value;

	return value == null
		? [ ]
		: Array.isArray( value )
		? [ ...value ]
		: [ < T >value ];
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
	const _registerRequests = arrayify( registerRequests );

	if ( typeof signRequests === 'number' && typeof timeout === 'undefined' )
	{
		timeout = signRequests;
		signRequests = null;
	}

	const _signRequests = arrayify(
		< SignRequest | ReadonlyArray< SignRequest > >signRequests
	);

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

			const appId = _registerRequests[ 0 ].appId;

			u2f.register(
				appId, _registerRequests, _signRequests, callback, timeout );
		} );
	} );
}

export function sign(
	signRequests: SignRequest | ReadonlyArray< SignRequest >,
	timeout?: number
)
: Promise< SignResponse >
{
	const _signRequests = arrayify( signRequests );

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

			const appId = _signRequests[ 0 ].appId;
			const challenge = _signRequests[ 0 ].challenge;
			const registeredKeys = _signRequests
				.map( ( { version, keyHandle, appId } ) =>
					( { version, keyHandle, appId } as RegisteredKey )
				);

			u2f.sign( appId, challenge, registeredKeys, callback, timeout );
		} );
	} ).catch(function(error){
		throw error;
	});
}
