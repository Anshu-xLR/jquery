define([
	"../core",
	"../var/support",
	"../ajax"
], function( jQuery, support ) {

jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrId = 0,
	xhrCallbacks = {},
	xhrSuccessStatus = {
		// file protocol always yields status code 0, assume 200
		0: 200,
		// Support: IE9
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

// Support: IE9
// Open requests must be manually aborted on unload (#5280)
// See https://support.microsoft.com/kb/2856746 for more info
if ( window.attachEvent ) {
	window.attachEvent( "onunload", function() {
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]();
		}
	});
}

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport(function( options ) {
	var callback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr(),
					id = ++xhrId,
					xhrUsername = "",
					xhrPassword = "";

				// Use the default way to authenticate if not using Authorization header
				if ( options.authByHeader !== true ) {
					xhrUsername = options.username;
					xhrPassword = options.password;
				}
				xhr.open(
					options.type,
					options.url,
					options.async,
					xhrUsername,
					xhrPassword
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers["X-Requested-With"] ) {
					headers["X-Requested-With"] = "XMLHttpRequest";
				}

				// Function to make required corrections for UTF-8 compliant text
				function utf8Encode ( text ) {
					var utftext = "", n, c;
					text = text.replace( /\r\n/g, "\n" );
					for ( n = 0; n < text.length; n++ ) {
						c = text.charCodeAt(n);
						if (c < 128) {
							utftext += String.fromCharCode(c);
						} else if ( ( c > 127 ) && ( c < 2048 ) ) {
							utftext += String.fromCharCode ( ( c >> 6 ) | 192 );
							utftext += String.fromCharCode ( ( c & 63 ) | 128 );
						} else {
							utftext += String.fromCharCode ( ( c >> 12 ) | 224 );
							utftext += String.fromCharCode ( ( ( c >> 6 ) & 63 ) | 128 );
							utftext += String.fromCharCode ( ( c & 63 ) | 128 );
						}
					}
					return utftext;
				}

				// Function to generate Base 64 encoded data of the input text
				function generateBase64 ( text ) {
					// Ensuring UTF-8 encoded text
					text = utf8Encode ( text );
					// UTF-8 Base 64 encoding characters
					var encoder =
						"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

						// Character and Encoded variables for loop
						c1, c2, c3, e1, e2, e3, e4,
						i = 0,
						encoded = "";

					while ( i < text.length ) {
						c1 = text.charCodeAt ( i++ );
						c2 = text.charCodeAt ( i++ );
						c3 = text.charCodeAt ( i++ );
						e1 = c1 >> 2;
						e2 = (c1 & 3) << 4 | c2 >> 4;
						e3 = (c2 & 15) << 2 | c3 >> 6;
						e4 = c3 & 63;
						if ( isNaN( c2 ) ) {
							e3 = e4 = 64;
						} else if ( isNaN( c3 ) ) {
							e4 = 64;
						}
						encoded += encoder[e1] + encoder[e2] + encoder[e3] + encoder[e4];
					}
					return encoded;
				}

				// Set if user requires jQuery to set Authorization header
				if ( options.authByHeader === true && typeof options.username !== "undefined" ) {
					headers.Authorization =
						"Basic " + generateBase64( options.username + ":" + options.password );
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							delete xhrCallbacks[ id ];
							callback = xhr.onload = xhr.onerror = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {
								complete(
									// file: protocol always yields status 0; see #8605, #14207
									xhr.status,
									xhr.statusText
								);
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,
									// Support: IE9
									// Accessing binary-data responseText throws an exception
									// (#11426)
									typeof xhr.responseText === "string" ? {
										text: xhr.responseText
									} : undefined,
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				xhr.onerror = callback("error");

				// Create the abort callback
				callback = xhrCallbacks[ id ] = callback("abort");

				try {
					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {
					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});

});
