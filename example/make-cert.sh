#!/bin/sh

mkdir -p certs || true

if [[ -f certs/cert.pem ]]; then
	exit 0
fi

echo "Creating self-signed certificate..."

openssl req \
	-nodes \
	-x509 \
	-newkey rsa:4096 \
	-keyout certs/key.pem \
	-out certs/cert.pem \
	-days 365 \
	-subj "/C=SE/ST=Stockholm/L=Stockholm/O=Foobar inc./OU=Test unit/CN=localhost"

if [[ "$OSTYPE" == "darwin"* ]]; then
	echo "Adding to system keychain..."
	sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/cert.pem
fi
