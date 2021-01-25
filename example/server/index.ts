import { IncomingMessage, ServerResponse } from "http"
import { createServer } from "https"
import { readFileSync, createReadStream } from "fs"
import * as path from "path"

// @ts-ignore
import { request, checkRegistration, checkSignature } from "u2f"
import * as getStream from "get-stream"


const port = parseInt( process.argv[ 2 ], 10 ) || 12345;

const rootFile = ( filename: string ) =>
	path.join( __dirname, "..", "..", filename );

const certFile = ( filename: string ) =>
	path.join( __dirname, "..", "certs", filename );

const clientFile = ( filename: string ) =>
	path.join( __dirname, "..", "client", filename );

interface Registration
{
	publicKey: any;
	keyHandle: any;
}

const database: { registrations: Array< Registration > } = {
	registrations: [ ],
};

async function handler( req: IncomingMessage, res: ServerResponse )
{
	if ( req.url === '/' )
	createReadStream( clientFile( "index.html" ) ).pipe( res );
	else if ( req.url === '/index.js' )
		createReadStream( clientFile( "index.js" ) ).pipe( res );
	else if ( req.url === '/bundle.js' )
		createReadStream( rootFile( "bundle.js" ) ).pipe( res );
	else if ( req.url === '/u2f-begin-register' )
	{
		res.setHeader( "content-type", "application/json" );
		res.end( JSON.stringify( request( `https://localhost:${port}` ) ) );
	}
	else if ( req.url === '/u2f-end-register' )
	{
		const data = JSON.parse( await getStream( req, { encoding: "utf8" } ) );

		const result = checkRegistration( data.request, data.registerData );

		res.setHeader( "content-type", "application/json" );
		if ( result.successful )
		{
			database.registrations.push( {
				publicKey: result.publicKey,
				keyHandle: result.keyHandle,
			} );

			res.end( JSON.stringify( { ok: true } ) );
		}
		else
			res.end( JSON.stringify( { ok: false, result } ) );
	}
	else if ( req.url === '/u2f-begin-sign' )
	{
		res.setHeader( "content-type", "application/json" );
		const keyHandle =
			database.registrations
			.map( ( { keyHandle } ) => keyHandle );

		const requestData = request( `https://localhost:${port}`, keyHandle );

		res.end( JSON.stringify( requestData ) );
	}
	else if ( req.url === '/u2f-end-sign' )
	{
		const data = JSON.parse( await getStream( req, { encoding: "utf8" } ) );

		const keyHandle = data.signData.keyHandle;

		// Lookup the public key for this key handle
		const entry = < Registration >database.registrations
			.find( registration => registration.keyHandle === keyHandle );
		const publicKey = entry.publicKey;

		const result = checkSignature( data.request, data.signData, publicKey );

		res.setHeader( "content-type", "application/json" );
		if ( result.successful )
		{
			res.end( JSON.stringify( { ok: true } ) );
		}
		else
			res.end( JSON.stringify( { ok: false, result } ) );
	}
	else
		res.end( );
}

const server = createServer(
	{
		cert: readFileSync( certFile( "cert.pem" ) ),
		key: readFileSync( certFile( "key.pem" ) ),
	},
	async ( req, res ) =>
	{
		try
		{
			await handler( req, res );
		} catch ( err )
		{
			console.error( `Error in handler for ${req.url}:` );
			console.error( err.stack );
		}
	}
);

server.listen( port, 'localhost', ( ) => {
	console.log( `Listening on port ${port}` );
} );
