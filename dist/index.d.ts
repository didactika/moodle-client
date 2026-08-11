/**
 * HTTP methods accepted by the client.
 *
 * Moodle's REST server only really honours GET and POST, but the previous
 * axios-based signature accepted any method, so the surface is kept open.
 */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
/**
 * @interface IMoodleClientOptions
 * @description What a {@link MoodleClient} is built with: everything that
 * stays the same across the calls it makes.
 * @param {string} rootURL - The site's base URL
 * @param {string} token - A Moodle web service token
 * @param {HttpMethod} method - Default method for every call, POST when omitted
 */
interface IMoodleClientOptions {
    rootURL: string;
    token: string;
    method?: HttpMethod;
}
/**
 * @interface IURLRequest
 * @description Interface for the request object
 * @param {string} rootURL - The root URL
 * @param {string} token - The token
 * @param {string} webServiceFunction - The web service function
 */
interface IURLRequest {
    rootURL: string;
    token: string;
    webServiceFunction: string;
}
/**
 * @interface IDataRequest
 * @description Interface for the data request object
 * @param {IURLRequest} urlRequest - The request object
 * @param {object} content - The content object
 * @param {HttpMethod} method - The HTTP method, POST when omitted
 */
interface IDataRequest {
    urlRequest: IURLRequest;
    content: object;
    method?: HttpMethod;
}
/**
 * @interface IMoodleResponse
 * @description What a successful call resolves to.
 *
 * The shape mirrors the part of the old axios response consumers actually
 * touched, so `response.data` keeps working. `data` defaults to `any`
 * because that is what axios typed it as; pass a type argument to
 * `moodleClient<T>()` to get a checked body instead.
 */
interface IMoodleResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    ok: boolean;
    headers: Headers;
}
/**
 * @interface IMoodleErrorBody
 * @description The JSON body Moodle returns when a web service call fails.
 */
interface IMoodleErrorBody {
    errorcode: string;
    exception?: string;
    message?: string;
    debuginfo?: string;
}

/**
 * What a Moodle site answered, and what that answer means.
 *
 * Moodle reports web service failures inside a 200 response body rather than
 * through the status code, so deciding whether a call succeeded is a
 * judgement about the body — which is why it lives on the response object
 * itself instead of in a free function somewhere else.
 */
declare class MoodleResponse<T = any> implements IMoodleResponse<T> {
    readonly data: T;
    readonly status: number;
    readonly statusText: string;
    readonly ok: boolean;
    readonly headers: Headers;
    constructor(init: IMoodleResponse<T>);
    /**
     * Read a `fetch` response into one of these.
     *
     * Moodle answers with JSON whenever it gets that far, but a misconfigured
     * site or a proxy in front of it can return an HTML error page instead —
     * so whatever came back is kept as text rather than throwing a parse
     * error over it.
     */
    static from<T = any>(res: Response): Promise<MoodleResponse<T>>;
    /** Whether Moodle put one of its own error codes in the body. */
    get isMoodleError(): boolean;
    /**
     * Raise whatever Moodle reported, or hand this response back untouched.
     * @returns this response, so it can be returned in one expression
     * @throws the error matching Moodle's `errorcode`, or {@link URLError}
     */
    throwOnMoodleError(): this;
    private static isErrorBody;
}

/**
 * A client for one Moodle site.
 *
 * ```ts
 * const moodle = new MoodleClient({
 *   rootURL: "https://moodle.example.org",
 *   token: "aeb315e6dd3affc18352fe46124cdd48",
 * });
 *
 * const { data } = await moodle.call("core_course_get_courses", {
 *   options: { ids: [1, 2, 3] },
 * });
 * ```
 *
 * Build it once and reuse it: the site, the token and the default method are
 * settled at construction, so each call only names the function it wants.
 */
declare class MoodleClient {
    private readonly endpoint;
    private readonly defaultMethod;
    constructor(options: IMoodleClientOptions);
    /**
     * Call a Moodle web service function.
     * @param webServiceFunction e.g. `core_course_get_courses`
     * @param content the parameters, nested as deeply as the function needs
     * @param method overrides the default chosen at construction
     * @returns the site's answer, already checked for Moodle errors
     * @throws {URLError} when the site cannot be reached
     * @throws {MoodleException} and friends when Moodle reports an error
     */
    call<T = any>(webServiceFunction: string, content?: object, method?: HttpMethod): Promise<MoodleResponse<T>>;
}
/**
 * Make a single call without keeping a client around.
 *
 * ```ts
 * const response = await moodleClient({
 *   urlRequest: {
 *     rootURL: "https://moodle.example.org",
 *     token: "aeb315e6dd3affc18352fe46124cdd48",
 *     webServiceFunction: "core_course_get_courses",
 *   },
 *   content: { options: { ids: [1, 2, 3] } },
 * });
 * ```
 *
 * This is the shape the package has always had and it is not going away.
 * Reach for {@link MoodleClient} when more than one call goes to the same
 * site, so the site and token are stated once instead of per call.
 */
declare const moodleClient: <T = any>(data: IDataRequest) => Promise<MoodleResponse<T>>;

/**
 * Access Exception Error
 * @description This error is thrown when the service does not have access to use that web services function
 * @param debugInfo Debug info
 * @returns Returns an error with the debug info
 * @example
 * ```typescript
 * throw new AccessException("The service does not have access to use that web services function");
 * ```
 */
declare class AccessException extends Error {
    readonly status: number;
    readonly debugInfo?: string;
    constructor(debugInfo?: string);
}

/**
 * Bad request error
 * @description This error is thrown when the request is bad
 * @param debugInfo Debug info
 * @returns Returns an error with the debug info
 * @example
 * ```typescript
 * throw new BadRequestError("The request is bad");
 * ```
 */
declare class BadRequestError extends Error {
    readonly status: number;
    debugInfo?: string;
    constructor(debugInfo?: string);
}

/**
 * Error thrown when a parameter is invalid
 * @param debugInfo Debug info
 * @returns Returns an error with the debug info
 * @example
 * ```typescript
 * throw new InvalidParameter("The parameter is invalid");
 * ```
 */
declare class InvalidParameter extends Error {
    readonly status: number;
    readonly debugInfo?: string;
    constructor(debugInfo?: string);
}

/**
 * Error thrown when a record is not found in the database
 * @param debugInfo Debug info
 * @returns Returns an error with the debug info
 * @example
 * ```typescript
 * throw new InvalidRecord("No record of that function found in moodle database");
 * ```
 */
declare class InvalidRecord extends Error {
    readonly status: number;
    readonly debugInfo?: string;
    constructor(debugInfo?: string);
}

/**
 * Error thrown when a token is invalid
 * @param debugInfo Debug info
 * @returns Returns an error with the debug info
 * @example
 * ```typescript
 * throw new InvalidToken("The token is invalid");
 * ```
 */
declare class InvalidToken extends Error {
    readonly status: number;
    readonly debugInfo?: string;
    constructor(debugInfo?: string);
}

/**
 * MoodleExceptionError
 * @description
 * This error is thrown when there is an error in the Moodle server
 * @param status Status code
 * @param message Error message
 * @param debugInfo Debug info
 * @returns Returns an error with the debug info
 * @example
 * ```typescript
 * throw new MoodleException(500, "There is an error in the Moodle server");
 * ```
 */
declare class MoodleException extends Error {
    readonly status: number;
    readonly debugInfo: string | undefined;
    constructor(status: number, message: string, debugInfo?: string);
}

/**
 * Error thrown when a URL is not found
 * @param debugInfo Debug info
 * @returns Returns an error with the debug info
 * @example
 * ```typescript
 * throw new URLError("The URL is invalid");
 * ```
 */
declare class URLError extends Error {
    readonly status: number;
    constructor();
}

export { AccessException, BadRequestError, type HttpMethod, type IDataRequest, type IMoodleClientOptions, type IMoodleErrorBody, type IMoodleResponse, type IURLRequest, InvalidParameter, InvalidRecord, InvalidToken, MoodleClient, MoodleException, MoodleResponse, URLError, moodleClient };
