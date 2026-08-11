// src/errors/url-error.ts
var URLError = class extends Error {
  status;
  constructor() {
    super();
    this.name = "urlError";
    this.message = "URL not found";
    this.status = 404;
  }
};

// src/client/moodle-endpoint.ts
var MoodleEndpoint = class _MoodleEndpoint {
  root;
  token;
  /**
   * @param rootURL the site's base URL, with or without a trailing slash
   * @param token a Moodle web service token
   */
  constructor(rootURL, token) {
    this.root = _MoodleEndpoint.trimTrailingSlashes(rootURL);
    this.token = token;
  }
  /**
   * Build the URL for a call to one web service function.
   *
   * Values go through `URLSearchParams`, so a token or function name
   * carrying a reserved character is escaped instead of corrupting the
   * query string.
   * @param webServiceFunction the Moodle function to call
   * @returns the endpoint with its query parameters
   * @throws {URLError} when the site URL is not a valid absolute URL
   */
  urlFor(webServiceFunction) {
    let url;
    try {
      url = new URL(`${this.root}/webservice/rest/server.php`);
    } catch {
      throw new URLError();
    }
    url.searchParams.set("wstoken", this.token);
    url.searchParams.set("wsfunction", webServiceFunction);
    url.searchParams.set("moodlewsrestformat", "json");
    return url;
  }
  /**
   * Scanning backwards rather than replacing with `/\/+$/`: that pattern
   * backtracks from every position on a string of many slashes, which is a
   * polynomial ReDoS on caller input.
   */
  static trimTrailingSlashes(value) {
    let end = value.length;
    while (end > 0 && value[end - 1] === "/") end--;
    return value.slice(0, end);
  }
};

// src/errors/access-exception-error.ts
var AccessException = class extends Error {
  status;
  debugInfo;
  constructor(debugInfo) {
    super();
    this.name = "accessException";
    this.message = "The service does not have access to use that web services function";
    this.status = 403;
    if (debugInfo) this.debugInfo = debugInfo;
  }
};

// src/errors/bad-request-error.ts
var BadRequestError = class extends Error {
  status;
  debugInfo;
  constructor(debugInfo) {
    super();
    this.name = "badRequest";
    this.message = "Bad request";
    this.status = 400;
    if (debugInfo) this.debugInfo = debugInfo;
  }
};

// src/errors/invalid-parameter-error.ts
var InvalidParameter = class extends Error {
  status;
  debugInfo;
  constructor(debugInfo) {
    super();
    this.name = "invalidParameter";
    this.message = "Invalid parameter value";
    this.status = 400;
    if (debugInfo) this.debugInfo = debugInfo;
  }
};

// src/errors/invalid-record-error.ts
var InvalidRecord = class extends Error {
  status;
  debugInfo;
  constructor(debugInfo) {
    super();
    this.name = "invalidRecord";
    this.message = "No record of that function found in moodle database";
    this.status = 404;
    if (debugInfo) this.debugInfo = debugInfo;
  }
};

// src/errors/invalid-token-error.ts
var InvalidToken = class extends Error {
  status;
  debugInfo;
  constructor(debugInfo) {
    super();
    this.name = "invalidToken";
    this.message = "Invalid token - token not found";
    this.status = 401;
    if (debugInfo) this.debugInfo = debugInfo;
  }
};

// src/errors/moodle-exception-error.ts
var MoodleException = class extends Error {
  status;
  debugInfo;
  constructor(status, message, debugInfo) {
    super();
    this.name = "moodleException";
    this.message = message;
    this.status = status;
    if (debugInfo) this.debugInfo = debugInfo;
  }
};

// src/client/moodle-response.ts
var MoodleResponse = class _MoodleResponse {
  data;
  status;
  statusText;
  ok;
  headers;
  constructor(init) {
    this.data = init.data;
    this.status = init.status;
    this.statusText = init.statusText;
    this.ok = init.ok;
    this.headers = init.headers;
  }
  /**
   * Read a `fetch` response into one of these.
   *
   * Moodle answers with JSON whenever it gets that far, but a misconfigured
   * site or a proxy in front of it can return an HTML error page instead —
   * so whatever came back is kept as text rather than throwing a parse
   * error over it.
   */
  static async from(res) {
    const raw = await res.text();
    let body = raw;
    if (raw.length > 0) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
    return new _MoodleResponse({
      data: body,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: res.headers
    });
  }
  /** Whether Moodle put one of its own error codes in the body. */
  get isMoodleError() {
    return _MoodleResponse.isErrorBody(this.data);
  }
  /**
   * Raise whatever Moodle reported, or hand this response back untouched.
   * @returns this response, so it can be returned in one expression
   * @throws the error matching Moodle's `errorcode`, or {@link URLError}
   */
  throwOnMoodleError() {
    const body = this.data;
    if (_MoodleResponse.isErrorBody(body)) {
      switch (body.errorcode) {
        case "invalidparameter":
          throw new InvalidParameter(body.debuginfo);
        case "accessexception":
          throw new AccessException(body.debuginfo);
        case "invalidtoken":
          throw new InvalidToken(body.debuginfo);
        case "invalidrecord":
          throw new InvalidRecord(body.debuginfo);
        default:
          throw body.exception === "moodle_exception" ? new MoodleException(this.status, body.message ?? "", body.debuginfo) : new BadRequestError();
      }
    }
    if (!this.ok) throw new URLError();
    return this;
  }
  static isErrorBody(body) {
    return typeof body === "object" && body !== null && "errorcode" in body;
  }
};

// src/client/request-content.ts
var RequestContent = class _RequestContent {
  source;
  /**
   * @param source a plain object, nested as deeply as you like
   */
  constructor(source = {}) {
    this.source = source;
  }
  /**
   * The flat key/value pairs this content becomes.
   *
   * `{options: {ids: [1, 2]}}` flattens to `options[ids][0]`,
   * `options[ids][1]`. `null` and `undefined` are dropped: Moodle has no
   * representation for either.
   */
  toObject() {
    const out = {};
    _RequestContent.flatten(this.source, "", out);
    return out;
  }
  /** The same pairs, ready to be sent as a urlencoded body. */
  toSearchParams() {
    return new URLSearchParams(this.toObject());
  }
  /**
   * Append the pairs onto a URL's query string, for the methods that
   * cannot carry a body.
   * @param url modified in place
   */
  appendTo(url) {
    for (const [key, value] of this.toSearchParams()) {
      url.searchParams.append(key, value);
    }
  }
  /** Whether there is anything at all to send. */
  get isEmpty() {
    return Object.keys(this.toObject()).length === 0;
  }
  static flatten(source, prefix, out) {
    for (const [key, value] of Object.entries(source)) {
      if (value === null || value === void 0) continue;
      const path = prefix ? `${prefix}[${key}]` : key;
      if (typeof value === "object") {
        _RequestContent.flatten(value, path, out);
        continue;
      }
      out[path] = String(value);
    }
  }
};

// src/client/moodle-client.ts
var BODYLESS_METHODS = /* @__PURE__ */ new Set(["GET", "HEAD"]);
var MoodleClient = class {
  endpoint;
  defaultMethod;
  constructor(options) {
    this.endpoint = new MoodleEndpoint(options.rootURL, options.token);
    this.defaultMethod = options.method ?? "POST";
  }
  /**
   * Call a Moodle web service function.
   * @param webServiceFunction e.g. `core_course_get_courses`
   * @param content the parameters, nested as deeply as the function needs
   * @param method overrides the default chosen at construction
   * @returns the site's answer, already checked for Moodle errors
   * @throws {URLError} when the site cannot be reached
   * @throws {MoodleException} and friends when Moodle reports an error
   */
  async call(webServiceFunction, content = {}, method) {
    const verb = (method ?? this.defaultMethod).toUpperCase();
    const url = this.endpoint.urlFor(webServiceFunction);
    const params = new RequestContent(content);
    const isBodyless = BODYLESS_METHODS.has(verb);
    if (isBodyless) params.appendTo(url);
    let res;
    try {
      res = await fetch(url, {
        method: verb,
        body: isBodyless ? void 0 : params.toSearchParams(),
        headers: { accept: "application/json" }
      });
    } catch {
      throw new URLError();
    }
    const response = await MoodleResponse.from(res);
    return response.throwOnMoodleError();
  }
};
var moodleClient = (data) => {
  const client = new MoodleClient({
    rootURL: data.urlRequest.rootURL,
    token: data.urlRequest.token
  });
  return client.call(data.urlRequest.webServiceFunction, data.content, data.method);
};
export {
  AccessException,
  BadRequestError,
  InvalidParameter,
  InvalidRecord,
  InvalidToken,
  MoodleClient,
  MoodleException,
  MoodleResponse,
  URLError,
  moodleClient
};
