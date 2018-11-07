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
export declare const ErrorCodes: {
    OK: number;
    OTHER_ERROR: number;
    BAD_REQUEST: number;
    CONFIGURATION_UNSUPPORTED: number;
    DEVICE_INELIGIBLE: number;
    TIMEOUT: number;
};
export declare const ErrorNames: {
    "0": string;
    "1": string;
    "2": string;
    "3": string;
    "4": string;
    "5": string;
};
export declare function isSupported(): Promise<boolean>;
export declare function ensureSupport(): Promise<void>;
export declare function register(registerRequests: RegisterRequest | ReadonlyArray<RegisterRequest>, signRequests: SignRequest | ReadonlyArray<SignRequest>, timeout?: number): Promise<RegisterResponse>;
export declare function register(registerRequests: RegisterRequest | ReadonlyArray<RegisterRequest>, timeout?: number): Promise<RegisterResponse>;
export declare function sign(signRequests: SignRequest | ReadonlyArray<SignRequest>, timeout?: number): Promise<SignResponse>;
