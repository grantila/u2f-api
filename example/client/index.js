
function msg( ...args )
{
	document.querySelector( "#message" ).innerHTML = args.join( "<br/>" );
}

async function doTest( )
{
	const supported = await window.u2fApi.isSupported( );

	msg( "Is supported: " + supported );
}

async function doRegister( )
{
	const responseBegin = await fetch( "/u2f-begin-register" );
	const request = await responseBegin.json( );

	msg( "Accept with your u2f device..." );

	const registerData = await window.u2fApi.register( request );

	const responseEnd = await fetch(
		"/u2f-end-register",
		{ method: "POST", body: JSON.stringify( { request, registerData } ) }
	);

	const data = await responseEnd.json( );
	msg( JSON.stringify( data, null, 4 ) );
}

async function doSign( )
{
	const responseBegin = await fetch( "/u2f-begin-sign" );
	const request = await responseBegin.json( );

	msg( "Accept with your u2f device..." );

	const signData = await window.u2fApi.sign( request );

	const responseEnd = await fetch(
		"/u2f-end-sign",
		{ method: "POST", body: JSON.stringify( { request, signData } ) }
	);

	const data = await responseEnd.json( );
	msg( JSON.stringify( data, null, 4 ) );
}

function handlePromise( promise )
{
	promise.catch( err => msg( "Error", err.message, err.stack ) );
}
