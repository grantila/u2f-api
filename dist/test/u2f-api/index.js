'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var already_1 = require("already");
var jsdom = require("jsdom");
var ErrorCodesEnum = {
    CANCELLED: -1,
    OK: 0,
    OTHER_ERROR: 1,
    BAD_REQUEST: 2,
    CONFIGURATION_UNSUPPORTED: 3,
    DEVICE_INELIGIBLE: 4,
    TIMEOUT: 5,
};
var JSDOM = jsdom.JSDOM;
var appId = "https://example.org/";
var MonkeyPatcher = /** @class */ (function () {
    function MonkeyPatcher(obj) {
        this._object = obj;
        this.clear();
    }
    MonkeyPatcher.prototype.patch = function (obj, overwrite) {
        var _this = this;
        if (overwrite === void 0) { overwrite = false; }
        Object.keys(obj).forEach(function (key) {
            var ownProp = _this._object.hasOwnProperty(key);
            if (!ownProp || overwrite) {
                var value = obj[key];
                if (!ownProp)
                    _this._values.push(key);
                else
                    _this._overwrittenValues.push({ key: key, value: _this._object[key] });
                _this._object[key] = value;
            }
        });
    };
    MonkeyPatcher.prototype.restore = function () {
        var _this = this;
        this._values.forEach(function (key) {
            delete _this._object[key];
        });
        this._overwrittenValues.forEach(function (_a) {
            var key = _a.key, value = _a.value;
            _this._object[key] = value;
        });
        this.clear();
    };
    MonkeyPatcher.prototype.clear = function () {
        this._values = [];
        this._overwrittenValues = [];
    };
    return MonkeyPatcher;
}());
var GlobalMonkeyPatcher = /** @class */ (function (_super) {
    __extends(GlobalMonkeyPatcher, _super);
    function GlobalMonkeyPatcher() {
        return _super.call(this, global) || this;
    }
    return GlobalMonkeyPatcher;
}(MonkeyPatcher));
function deleteModule(moduleName) {
    try {
        var solvedName = require.resolve(moduleName);
        var nodeModule = require.cache[solvedName];
        if (nodeModule) {
            for (var i = 0; i < nodeModule.children.length; ++i) {
                var child = nodeModule.children[i];
                deleteModule(child.filename);
            }
            delete require.cache[solvedName];
        }
    }
    catch (err) { }
}
function getNewU2FApi() {
    deleteModule('../../');
    return require('../../');
}
function handleTimeout(props, timeout, fn) {
    var timeoutPromise = timeout
        ? already_1.delay(timeout).then(function () {
            return ({ errorCode: ErrorCodesEnum.TIMEOUT });
        })
        : null;
    var flowPromise = already_1.delay(props.delay || 0).then(fn);
    return Promise.race([
        timeoutPromise,
        flowPromise,
    ]
        .filter(function (exists) { return exists; }));
}
function u2fMock(props) {
    if (props === void 0) { props = {}; }
    var store = [];
    return {
        sign: function (appId, challenge, signRequests, cbNative, timeout) {
            return handleTimeout(props, timeout, function () {
                if (props.appId && props.appId !== appId)
                    return { errorCode: ErrorCodesEnum.BAD_REQUEST };
                var found = signRequests.some(function (req) {
                    return store.some(function (storeReq) {
                        return storeReq.request === req.request
                            &&
                                storeReq.appId === req.appId;
                    });
                });
                if (!found)
                    return { errorCode: ErrorCodesEnum.BAD_REQUEST };
            })
                .then(function (value) { return value || {}; })
                .then(cbNative);
        },
        register: function (appId, registerRequests, signRequests, cbNative, timeout) {
            return handleTimeout(props, timeout, function () {
                if (props.appId && props.appId !== appId)
                    return { errorCode: ErrorCodesEnum.BAD_REQUEST };
                registerRequests.forEach(function (req) {
                    store.push(req);
                });
            })
                .then(function (value) { return value || {}; })
                .then(cbNative);
        },
    };
}
function wrappedTest(props, fn) {
    var _this = this;
    return function () { return __awaiter(_this, void 0, void 0, function () {
        var dom, mock, gmp, api, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dom = new JSDOM("", Object.assign({
                        url: appId,
                        userAgent: "FakeBrowser/1",
                    }, props));
                    if (!props || !props.mock || !props.mock.disable) {
                        mock = (props || {}).mock || {};
                        dom.window.u2f = u2fMock();
                    }
                    gmp = new GlobalMonkeyPatcher();
                    gmp.patch(dom.window);
                    api = getNewU2FApi();
                    return [4 /*yield*/, (_a = already_1.Try(function () { return fn(api); })).then.apply(_a, already_1.Finally(function () {
                            gmp.restore();
                        }))];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); };
}
describe('general', function () {
    it('isSupported should be false for unsupported browsers', wrappedTest({ mock: { disable: true } }, function (api) { return __awaiter(_this, void 0, void 0, function () {
        var supported;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api.isSupported()];
                case 1:
                    supported = _a.sent();
                    chai_1.expect(supported).to.be.false;
                    return [2 /*return*/];
            }
        });
    }); }));
    it('isSupported should be false for Safari', wrappedTest({ userAgent: "Safari/10" }, function (api) { return __awaiter(_this, void 0, void 0, function () {
        var supported;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api.isSupported()];
                case 1:
                    supported = _a.sent();
                    chai_1.expect(supported).to.be.false;
                    return [2 /*return*/];
            }
        });
    }); }));
    it('isSupported should be true with fake window.u2f', wrappedTest({}, function (api) { return __awaiter(_this, void 0, void 0, function () {
        var supported;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api.isSupported()];
                case 1:
                    supported = _a.sent();
                    chai_1.expect(supported).to.be.true;
                    return [2 /*return*/];
            }
        });
    }); }));
    it('the flow of register + sign should run through', wrappedTest({}, function (api) { return __awaiter(_this, void 0, void 0, function () {
        var request;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api.ensureSupport()];
                case 1:
                    _a.sent();
                    request = "req";
                    return [4 /*yield*/, api.register({ appId: appId, request: request })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, api.sign({ appId: appId, request: request })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }));
});
//# sourceMappingURL=index.js.map