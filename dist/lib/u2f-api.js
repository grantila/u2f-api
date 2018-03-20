'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const chromeApi = require("./generated-google-u2f-api");
// Feature detection (yes really)
const isBrowser = (typeof navigator !== 'undefined') && !!navigator.userAgent;
const isSafari = isBrowser && navigator.userAgent.match(/Safari\//)
    && !navigator.userAgent.match(/Chrome\//);
const isEDGE = isBrowser && navigator.userAgent.match(/Edge\/1[2345]/);
var _backend = null;
function getBackend() {
    if (!_backend)
        _backend = new Promise(function (resolve, reject) {
            function notSupported() {
                resolve({ u2f: null });
            }
            if (!isBrowser)
                return notSupported();
            if (isSafari)
                // Safari doesn't support U2F, and the Safari-FIDO-U2F
                // extension lacks full support (Multi-facet apps), so we
                // block it until proper support.
                return notSupported();
            const hasNativeSupport = (typeof window.u2f !== 'undefined') &&
                (typeof window.u2f.sign === 'function');
            if (hasNativeSupport)
                return resolve({ u2f: window.u2f });
            if (isEDGE)
                // We don't want to check for Google's extension hack on EDGE
                // as it'll cause trouble (popups, etc)
                return notSupported();
            if (location.protocol === 'http:')
                // U2F isn't supported over http, only https
                return notSupported();
            if (typeof MessageChannel === 'undefined')
                // Unsupported browser, the chrome hack would throw
                return notSupported();
            // Test for google extension support
            chromeApi.isSupported(function (ok) {
                if (ok)
                    resolve({ u2f: chromeApi });
                else
                    notSupported();
            });
        });
    return _backend;
}
exports.ErrorCodes = {
    OK: 0,
    OTHER_ERROR: 1,
    BAD_REQUEST: 2,
    CONFIGURATION_UNSUPPORTED: 3,
    DEVICE_INELIGIBLE: 4,
    TIMEOUT: 5
};
exports.ErrorNames = {
    "0": "OK",
    "1": "OTHER_ERROR",
    "2": "BAD_REQUEST",
    "3": "CONFIGURATION_UNSUPPORTED",
    "4": "DEVICE_INELIGIBLE",
    "5": "TIMEOUT"
};
function makeError(msg, err) {
    const code = err != null ? err.errorCode : 1; // Default to OTHER_ERROR
    const type = exports.ErrorNames['' + code];
    const error = new Error(msg);
    error.metaData = { type, code };
    return error;
}
function isSupported() {
    return getBackend()
        .then(backend => !!backend.u2f);
}
exports.isSupported = isSupported;
function _ensureSupport(backend) {
    if (!backend.u2f) {
        if (location.protocol === 'http:')
            throw new Error("U2F isn't supported over http, only https");
        throw new Error("U2F not supported");
    }
}
function ensureSupport() {
    return getBackend()
        .then(_ensureSupport);
}
exports.ensureSupport = ensureSupport;
function register(registerRequests, signRequests, timeout) {
    if (!Array.isArray(registerRequests))
        registerRequests = [registerRequests];
    if (typeof signRequests === 'number' && typeof timeout === 'undefined') {
        timeout = signRequests;
        signRequests = null;
    }
    if (!signRequests)
        signRequests = [];
    return getBackend()
        .then(function (backend) {
        _ensureSupport(backend);
        const { u2f } = backend;
        return new Promise(function (resolve, reject) {
            function callback(response) {
                if (response.errorCode)
                    reject(makeError("Registration failed", response));
                else {
                    delete response.errorCode;
                    resolve(response);
                }
            }
            const appId = registerRequests[0].appId;
            u2f.register(appId, registerRequests, signRequests, callback, timeout);
        });
    });
}
exports.register = register;
function sign(signRequests, timeout) {
    if (!Array.isArray(signRequests))
        signRequests = [signRequests];
    return getBackend()
        .then(function (backend) {
        _ensureSupport(backend);
        const { u2f } = backend;
        return new Promise(function (resolve, reject) {
            function callback(response) {
                if (response.errorCode)
                    reject(makeError("Sign failed", response));
                else {
                    delete response.errorCode;
                    resolve(response);
                }
            }
            const appId = signRequests[0].appId;
            const challenge = signRequests[0].challenge;
            u2f.sign(appId, challenge, signRequests, callback, timeout);
        });
    });
}
exports.sign = sign;
//# sourceMappingURL=u2f-api.js.map