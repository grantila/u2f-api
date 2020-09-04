
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

export interface BackendError {
	errorCode: keyof typeof ErrorCodes;
}

export type OrError< T > = T & BackendError;

export type Transport = 'bt' | 'ble' | 'nfc' | 'usb';
export type Transports = Array< Transport >;

export interface RegisteredKey {
	version: string;
	keyHandle: string;
	transports: Transports;
	appId: string;
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

export function makeError( msg: string, err: BackendError )
{
	const code = err != null ? err.errorCode : 1; // Default to OTHER_ERROR
	const type = ErrorNames[ < keyof typeof ErrorNames >( '' + code ) ];
	const error = new Error( msg );
	( < any >error ).metaData = { type, code };
	return error;
}
