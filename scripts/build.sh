#!/bin/bash

patch google/google-u2f-api.js google/this.patch -o lib/generated-google-u2f-api.js

node_modules/.bin/rimraf dist

node_modules/.bin/tsc -p .

find test lib -name '*.js' | cpio -pdm dist/
