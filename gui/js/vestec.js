class Vestec {
  /**
   * Possible incident types
   * @type {string[]}
   */
  incidentTypes = [
    'pending',
    'active',
    'completed',
    'cancelled',
    'error',
    'archived',
  ]

  /**
   * The vestec server to connect to
   * @type {string}
   */
  _server

  /**
   * The bearer token from login
   */
  _token

  /**
   * Flag if user is logged in and authorized
   * @type {boolean}
   */
  _authorized = false

  /**
   * Id of the checkStatus interval
   * @see {enableAuthIntervalChecks}
   */
  _authCheckIntervalId

  /**
   * Base Header object
   * The Authorization header gets appended upon login
   *
   * @type {Headers}
   * @private
   */
  _headers

  /**
   * Creates a new Vestec object
   *
   * @param serverUrl {string|undefined} The vestec server base url
   */
  constructor(serverUrl = undefined) {
    if (typeof serverUrl !== 'undefined') {
      this.server = serverUrl;
    }

    this._headers = new Headers({
      'Content-Type': 'application/json',
    });
  }

  /**
   * @param url {string}
   * @throws {TypeError} If url string is invalid
   */
  set server(url) {
    /* Hacky way to ensure valid urls */
    new URL('/', url);

    this._server = url;
  }

  /**
   * @see {_server}
   * @returns {string}
   */
  get server() {
    return this._server;
  }

  /**
   * @see {_token}
   * @returns {string}
   */
  get token() {
    return this._token;
  }

  /**
   * Not accessible. Throws on access.
   *
   * @param token {string}
   * @throws {Error}
   */
  set token(token) {
    throw new Error('Setting the access token is not permitted');
  }

  /**
   *
   * @returns {boolean}
   */
  isAuthorized() {
    return this._authorized === true;
  }

  /**
   * This call enables a user to login with the VESTEC system and returns a session token
   * which is then used for subsequent calls to uniquely identify this user within that session.
   * Calls /flask/login
   *
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Response>}
   */
  async login(username, password) {
    const response = await fetch(
      this._buildRequest('login', {
        username,
        password,
      }),
    );

    if (!response.ok) {
      return response;
    }

    /** @type {{status:number, access_token: string}} */
    const data = await response.json();

    if (data.status === 200) {
      this._authorized = true;
      this._token = data.access_token;
      this._headers.append('Authorization', `Bearer ${data.access_token}`);
    }

    return this._buildResponse(data);
  }

  /**
   * This call logs out a user, deleting the current session for that user
   * so subsequent API calls with the token will be unauthorised
   *
   * @returns {Promise<Response>}
   */
  async logout() {
    const response = await fetch(
      this._buildRequest('logout', undefined, 'DELETE'),
    );

    if (!response.ok) {
      return response;
    }

    this.disableAuthIntervalChecks();
    delete this._token;
    this._authorized = false;

    return this._buildResponse(await response.json());
  }

  /**
   * Check if user is still logged in and authorized
   * E.g. is the current session associated with this deemed as active or has it expired.
   * The authorization status can be accessed through CosmoScout.vestec.authorized
   * Calls /flask/authorised
   *
   * @returns {Promise<Response>}
   */
  async authorized() {
    const response = await fetch(
      this._buildRequest('authorised'),
    );

    if (!response.ok) {
      return response;
    }

    const data = await response.json();
    this._authorized = data.status === 200;

    return this._buildResponse(data);
  }

  /**
   * Retrieves the type of logged in user
   * type user 0 (a normal user) or administrator 1 (a sysop.)
   *
   * @returns {Promise<Response>}
   */
  async userType() {
    const response = await fetch(
      this._buildRequest('user_type'),
    );

    return this._buildResponse(response);
  }

  /**
   * Enables a potential user to signup to the VESTEC system and create a user account.
   * Note that all user accounts are created disabled and it requires an administrator
   * to explicitly enable these so that the user can login to the VESTEC system.
   *
   * @param username {string} The username
   * @param name {string} The persons name
   * @param email {string} Contact email address
   * @param password {string} A strong password
   * @returns {Promise<Response>}
   */
  async signUp(username, name, email, password) {
    const response = await fetch(
      this._buildRequest('signup', {
        username,
        name,
        email,
        password,
      }),
    );

    return this._buildResponse(response);
  }

  /**
   * Retrieves a summary list of completed incidents
   *
   * @param types {string|string[]} List of incident filters
   * @see {incidentTypes}
   * @returns {Promise<Response>}
   *
   * Response has an incident key which holds an array of incidents in the form of
   * {
   * uuid: string,
   * kind: string,
   * name: string,
   * status: string,
   * comment: string,
   * creator: string,
   * date_started: string,
   * date_completed: string,
   * upper_left_latlong: string,
   * lower_right_latlong: string,
   * duration: string,
   * incident_date: string
   * }
   */
  async getIncidents(...types) {
    types.forEach((type) => {
      if (typeof this.incidentTypes[type] === 'undefined') {
        throw new Error(`Incident type '${type}' not in [${this.incidentTypes.concat(', ')}].`);
      }
    });

    const response = await fetch(
      this._buildRequest('getincidents', {
        uriParams: types.reduce((obj, cur) => ({ ...obj, [cur]: true }), {}),
      }),
    );

    return this._buildResponse(response);
  }

  /**
   * This call enables a user to create a new incident and will return the incident unique identifier.
   * Note that incidents are created in a pending state, and need to be explicitly activated
   * by the corresponding API call.
   * Incidents will be associated with the user who created them.
   *
   * @param name {string}
   * @param kind {string}
   * @param upperLeftLatlong {string|undefined} Optional
   * @param lowerRightLatlong {string|undefined} Optional
   * @param duration {string|undefined} Optional
   * @returns {Promise<Response>}
   */
  async createIncident(name, kind, upperLeftLatlong = undefined, lowerRightLatlong = undefined, duration = undefined) {
    const response = await fetch(
      this._buildRequest('createincident', {
        name,
        kind,
        upperLeftLatlong,
        lowerRightLatlong,
        duration,
      }),
    );

    return this._buildResponse(response);
  }

  /**
   * Returns the available workflows for the current user
   * Requires a logged in user
   *
   * @returns {Promise<Response>}
   */
  async getWorkflows() {
    const response = await fetch(
      this._buildRequest('getmyworkflows'),
    );

    return this._buildResponse(response);
  }

  /**
   * Enable checking if the user is authorized each interval seconds
   *
   * @param interval {number} Interval in seconds
   */
  enableAuthIntervalChecks(interval = 60) {
    if (typeof this._authCheckIntervalId !== 'undefined') {
      this._authCheckIntervalId = setInterval(this.authorized().bind(this), interval * 1000);
    }
  }

  /**
   * Disable the auth check
   */
  disableAuthIntervalChecks() {
    if (typeof this._authCheckIntervalId !== 'undefined') {
      clearInterval(this._authCheckIntervalId);
    }
  }

  /**
   * Creates a response object from a vestec response or fetch response
   *
   * @param data {Response|{status: Number, msg: string|undefined, any:any}}
   * @returns {Response}
   * @private
   */
  async _buildResponse(data) {
    if (data instanceof Response) {
      if (!data.ok) {
        return data;
      }

      data = await data.json();
    }

    const init = {
      status: data.status,
      statusText: typeof data.msg !== 'undefined' ? data.msg : '',
    };

    delete data.status;
    delete data.msg;

    const body = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    return new Response(body, init);
  }

  /**
   * Builds the request object
   *
   * @param uri {string} The uri part to access e.g. 'login'
   * @param data {Object|undefined} Request body data, gets converted to json automatically
   * @param method {string} ['GET']
   * @returns {Request}
   * @private
   * @throws {Error} If server is not set
   */
  _buildRequest(uri, data = undefined, method = 'GET') {
    const init = {
      method,
      mode: 'cors',
    };

    if (typeof this._server === 'undefined') {
      throw new Error('Vestec server is undefined.');
    }

    const url = new URL(`flask/${uri}`, this.server);

    if (typeof data === 'object') {
      // Append search params to the url in the form of url?key=value
      if (typeof data.uriParams !== 'undefined') {
        Object.keys(data.uriParams).forEach((key) => {
          url.searchParams.append(key, init[key] ?? true);

          delete data.uriParams;
        });
      }

      // Add all remaining data json encoded to the request body
      if (Object.keys(data).length > 0) {
        // Set the method to post if data is present
        if (method === 'GET') {
          init.method = 'POST';
        }

        init.body = JSON.stringify(data, (_key, value) => {
          if (value !== null && String(value).length > 0) {
            return value;
          }

          return undefined;
        });
      }
    }

    init.headers = new Headers(this._headers);

    return new Request(
      url.toString(),
      init,
    );
  }
}
