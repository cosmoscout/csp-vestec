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
    // eslint-disable-next-line no-new
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
   * Manually set an access token
   *
   * @param token {string}
   */
  set token(token) {
    this._token = token;
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
   * // Success
   * Status: 200
   * Body: {
   *   access_token: Session based access token used to authorise all API calls
   * }
   *
   * // Failure
   * Status: 400
   * StatusText: Message explaining reason for failure
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

      if (this._headers.has('Authorization')) {
        this._headers.delete('Authorization');
      }

      this._headers.append('Authorization', `Bearer ${data.access_token}`);
    }

    return Vestec.buildResponse(data);
  }

  /**
   * This call logs out a user, deleting the current session for that user
   * so subsequent API calls with the token will be unauthorised
   *
   * // Success - Always
   * Status: 200
   *
   * @returns {Promise<Response>}
   */
  async logout() {
    const response = await fetch(
      this._buildRequest('logout', undefined, 'DELETE'),
    );

    delete this._token;
    this._authorized = false;
    this._headers.delete('Authorization');

    return response;
  }

  /**
   * Check if user is still logged in and authorized
   * E.g. is the current session associated with this deemed as active or has it expired.
   * The authorization status can be accessed through CosmoScout.vestec.authorized
   * Calls /flask/authorised
   *
   * // Success
   * Status: 200
   * StatusText: User authorised
   *
   * // Failure
   * Status: 403
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

    return Vestec.buildResponse(data);
  }

  /**
   * Retrieves the type of logged in user
   * type user 0 (a normal user) or administrator 1 (a sysop.)
   *
   * // Success
   * Status: 200
   * Body: {
   *   access_level: Access level (0 is user, 1 is administrator)
   * }
   *
   * // Failure
   * Status: 403
   *
   * @returns {Promise<Response>}
   */
  async userType() {
    const response = await fetch(
      this._buildRequest('user_type'),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Enables a potential user to signup to the VESTEC system and create a user account.
   * Note that all user accounts are created disabled and it requires an administrator
   * to explicitly enable these so that the user can login to the VESTEC system.
   *
   * // Success
   * Status: 200
   * StatusText: User successfully created. Log in.
   *
   * // Failure
   * Status: varying - User already exists: 409 | JSON data incorrectly formatted: 400
   * StatusText: Associated error message
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

    return Vestec.buildResponse(response);
  }

  /**
   * Retrieves a summary list of completed incidents
   *
   * // Success
   * Status: 200
   * Body: {
   *   incidents: [{
   *    uuid: Incident unique identifier,
   *    kind: Incident type kind,
   *    name: This incident name,
   *    status: Status of the incident (e.g. pending, active, completed etc),
   *    comment: Optional incident comment,
   *    creator: User who created the incident,
   *    date_started: Date that the incident was started if incident has started,
   *    date_completed: Date that the incident was completed if incident has completed,
   *    upper_left_latlong: Lat/long of the upper right corner of the area of interest,
   *    lower_right_latlong: Lat/long of the lower left corner of the area of interest,
   *    duration: Duration of the simulation,
   *    incident_date: Date incident was created,
   *  }]
   * }
   *
   * // Failure
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#get-incidents
   *
   * @param types {string|string[]} List of incident filters
   * @see {incidentTypes}
   * @returns {Promise<Response>}
   */
  async getIncidents(...types) {
    types.forEach((type) => {
      if (!this.incidentTypes.includes(type)) {
        throw new Error(`Incident type '${type}' not in [${this.incidentTypes.concat(', ')}].`);
      }
    });

    const response = await fetch(
      this._buildRequest('getincidents', {
        uriParams: types.reduce((obj, cur) => ({ ...obj, [cur]: true }), {}),
      }),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * This call enables a user to create a new incident and will return the incident unique identifier.
   * Note that incidents are created in a pending state, and need to be explicitly activated
   * by the corresponding API call.
   * Incidents will be associated with the user who created them.
   *
   * // Success
   * Status: 200
   * StatusText: Incident successfully created
   * Body: {
   *   incidentid: Unique identifier of the incident
   * }
   *
   * // Failure
   * Status: 400
   * StatusText: Incident name or type is missing
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#create-incident
   *
   * @param name {string}
   * @param kind {string}
   * @param upperLeftLatlong {string|undefined} Optional
   * @param lowerRightLatlong {string|undefined} Optional
   * @param duration {string|undefined} Optional
   * @returns {Promise<Response>}
   */
  async createIncident(
    name,
    kind,
    upperLeftLatlong = undefined,
    lowerRightLatlong = undefined,
    duration = undefined,
  ) {
    const response = await fetch(
      this._buildRequest('createincident', {
        name,
        kind,
        upperLeftLatlong,
        lowerRightLatlong,
        duration,
      }),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Retrieves detailed information about a specific incident that the current user has access to.
   *
   * // Success
   * Status: 200
   * Body: {
   *   incident: {
   *    uuid: Incident unique identifier,
   *    kind: Incident type kind,
   *    name: This incident name,
   *    status: Status of the incident (e.g. pending, active, completed etc),
   *    comment: Optional incident comment,
   *    creator: User who created the incident,
   *    date_started: Date that the incident was started if incident has started,
   *    date_completed: Date that the incident was completed if incident has completed,
   *    upper_left_latlong: Lat/long of the upper right corner of the area of interest,
   *    lower_right_latlong: Lat/long of the lower left corner of the area of interest,
   *    duration: Duration of the simulation,
   *    incident_date: Date incident was created,
   *    digraph: Digraph of workflow execution status,
   *    data_queue_name: The name of the EDI endpoint to use when adding data manually, empty means that the incident does not support this feature,
   *    data_sets: {
   *      uuid: UUID of the data-set,
   *      name: Name of this specific data-set,
   *      type: The type or kind of data-set (note this is NOT the file-type, but instead the provided type/kind of the data),
   *      comments: Any comments associated with the data-set,
   *      date_created: Timestamp when the data-set was created,
   *    },
   *    simulations: {
   *      uuid: UUID of the data-set,
   *      jobID: Machine assigned job ID (e.g. from the queue system),
   *      status: Status of the incident (PENDING, QUEUED, RUNNING, COMPLETED, CANCELLED, ERROR),
   *      status_updated: Timestamp when the job status was last updated,
   *      status_message: Any message associated with the status (e.g. a failure message in the event of error),
   *      created: Timestamp when the simulation was created,
   *      walltime: Execution walltime (either entire walltime if completed, or walltime to date if running),
   *      kind: The kind of simulation (a brief description),
   *      num_nodes: Number of nodes requested,
   *      requested_walltime: The requested walltime,
   *      machine: Name of the machine running this simulation,
   *    },
   *  }
   * }
   *
   * // Failure
   * Status: 401
   * StatusText: Error retrieving incident
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#retrieve-incident
   *
   * @param uuid {string} Incident unique identifier
   * @returns {Promise<Response>}
   */
  async getIncident(uuid) {
    const response = await fetch(
      this._buildRequest(`incident/${uuid}`),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Deletes and incident and cancels execution of the workflow
   *
   * // Success
   * Status: 200
   * StatusText: Incident cancelled
   *
   * // Failure
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#delete-incident
   *
   * @param uuid {string} Incident unique identifier
   * @returns {Promise<Response>}
   */
  async deleteIncident(uuid) {
    const response = await fetch(
      this._buildRequest(`incident/${uuid}`, undefined, 'DELETE'),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Archives an incident, which currently updates the status
   * but in the future will also archive associated data
   *
   * // Success
   * Status: 200
   * StatusText: Incident archived
   *
   * // Failure
   * Status: 401
   * StatusText: Error archiving incident
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#archive-incident
   *
   * @param uuid {string} Incident unique identifier
   * @returns {Promise<Response>}
   */
  async archiveIncident(uuid) {
    const response = await fetch(
      this._buildRequest(`archiveincident/${uuid}`),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Activates an incident, calling into the appropriate workflow initialisation stage
   * which will set up things like listeners in the EDI
   *
   * // Success
   * Status: 200
   * StatusText: Incident activated
   *
   * // Failure
   * Status: 401
   * StatusText: Error retrieving incident
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#activating-an-incident
   *
   * @param uuid {string} Incident unique identifier
   * @returns {Promise<Response>}
   */
  async activateIncident(uuid) {
    const response = await fetch(
      this._buildRequest(`activateincident/${uuid}`),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * This retrieves the meta-data of incident's data-sets which match a specific type
   *
   * // Success
   * Status: 200
   * Body: {
   *   [
   *     //TODO
   *     {
   *      uuid: UUID of the data-set,
   *      name: Name of this specific data-set,
   *      type: The type or kind of data-set (note this is NOT the file-type, but instead the provided type/kind of the data)
   *      comment: Any comments associated with the data-set,
   *      date_created: Timestamp when the data-set was created,
   *     }
   *   ]
   * }
   *
   * // Failure
   * Status: 401
   * StatusText: Error can not find matching incident dataset.
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#retrieving-meta-data-for-an-incident-based-on-matching-type
   *
   * @param type {string} Incident Type, e.g. 'Sensors'
   * @param uuid {string} Incident unique identifier
   * @returns {Promise<Response>}
   */
  async getDatasetsMetadata(type, uuid) {
    const response = await fetch(
      this._buildRequest('datasets', {
        uriParams: {
          type,
          incident_uuid: uuid,
        },
      }),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Retrieves the meta-data associated with an incident data-set
   *
   * // Success
   * Status: 200
   * Body: {
   *   [
   *     //TODO
   *     {
   *      uuid: UUID of the data-set,
   *      name: Name of this specific data-set,
   *      type: The type or kind of data-set (note this is NOT the file-type, but instead the provided type/kind of the data)
   *      comment: Any comments associated with the data-set,
   *      date_created: Timestamp when the data-set was created,
   *     }
   *   ]
   * }
   *
   * // Failure
   * Status: 401
   * StatusText: Error can not find matching incident dataset.
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#retrieving-meta-data-associated-with-an-incidents-data-set
   *
   * @param dataId {string} Dataset unique identifier
   * @param incidentId {string} Incident unique identifier
   * @returns {Promise<Response>}
   */
  async getIncidentDatasetMetadata(dataId, incidentId) {
    const response = await fetch(
      this._buildRequest('metadata', {
        uriParams: {
          data_uuid: dataId,
          incident_uuid: incidentId,
        },
      }),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Updates the meta-data associated with an incident data-set
   *
   * // Success
   * Status: 200
   * StatusText: Metadata updated
   *
   * // Failure
   * Status: 401
   * StatusText: Metadata update failed, no incident data-set that you can edit
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#updating-meta-data-associated-with-an-incidents-data-set
   *
   * @param dataId {string} Dataset unique identifier
   * @param incidentId {string} Incident unique identifier
   * @param type {string} User provided type/kind of the data-set
   * @param comments {string} Comments associated with the data-set
   * @returns {Promise<Response>}
   */
  async updateIncidentDatasetMetadata(
    dataId,
    incidentId,
    type,
    comments,
  ) {
    const response = await fetch(
      this._buildRequest('metadata', {
        data_uuid: dataId,
        incident_uuid: incidentId,
        type,
        comments,
      }),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Deletes and incident and cancels execution of the workflow
   *
   * // Success
   * Status: 200
   * StatusText: Data deleted
   *
   * // Failure
   * Status: 401
   * StatusText: Data deletion failed, no incident data set that you can edit
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#deleting-an-incident-data-set
   *
   * @param dataId {string} Dataset unique identifier
   * @param incidentId {string} Incident unique identifier
   * @returns {Promise<Response>}
   */
  async deleteIncidentDataset(dataId, incidentId) {
    const response = await fetch(
      this._buildRequest('incident', {
        uriParams: {
          data_uuid: dataId,
          incident_uuid: incidentId,
        },
      }, 'DELETE'),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Downloads the data-set, with filename and filetype preserved accordingly
   * to the underlying file representation
   *
   * // Success
   * Status: 200
   * Body: Binary data
   *
   * // Failure
   * Status: 400
   * StatusText: Only datasets stored on VESTEC server currently supported
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#downloading-a-data-set
   *
   * @param dataId {string} Dataset unique identifier
   * @returns {Promise<Response>}
   */
  async downloadDataset(dataId) {
    const response = await fetch(
      this._buildRequest(`data/${dataId}`),
    );

    if (!response.ok) {
      return Vestec.buildResponse(response);
    }

    return response;
  }

  /**
   * Refreshes the state of a simulation
   * by default all simulation statuses are refreshed around every 15 minutes.
   * By calling this it will update the state of the simulation immediately
   *
   * // Success
   * Status: 200
   * Body: {
   *     simulation: {
   *      uuid: UUID of the data-set,
   *      jobID: Machine assigned job ID (e.g. from the queue system),
   *      status: Status of the incident (PENDING, QUEUED, RUNNING, COMPLETED, CANCELLED, ERROR),
   *      status_updated: Timestamp when the job status was last updated,
   *      status_message: Any message associated with the status (e.g. a failure message in the event of error),
   *      created: Timestamp when the simulation was created,
   *      walltime: Execution walltime (either entire walltime if completed, or walltime to date if running),
   *      kind: The kind of simulation (a brief description),
   *      num_nodes: Number of nodes requested,
   *      requested_walltime: The requested walltime,
   *      machine: Name of the machine running this simulation,
   *     }
   * }
   *
   * // Failure
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#refreshing-the-state-of-a-simulation
   *
   * @param simulationId {string} The UUID of the simulation to refresh
   * @returns {Promise<Response>}
   */
  async refreshSimulation(simulationId) {
    const response = await fetch(
      this._buildRequest('refreshsimulation', {
        sim_uuid: simulationId,
      }, 'POST'),
    );

    return Vestec.buildResponse(response);
  }

  /**
   * Deletes/cancels a simulation
   *
   * // Success
   * Status: 200
   *
   * // Failure
   *
   * See: https://github.com/EPCCed/vestec-wp5/wiki/Incident-Management-API#deleting-cancelling-a-simulation
   *
   * @param simulationId {string} The UUID of the simulation to refresh
   * @returns {Promise<Response>}
   */
  async deleteSimulation(simulationId) {
    const response = await fetch(
      this._buildRequest('simulation', {
        uriParams: {
          sim_uuid: simulationId,
        },
      }, 'DELETE'),
    );

    return Vestec.buildResponse(response);
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

    return Vestec.buildResponse(response);
  }

  /**
   * Creates a response object from a vestec response or fetch response
   *
   * @param data {Response|{status: Number, msg: string|undefined, any:any}}
   * @returns {Response}
   * @private
   */
  static async buildResponse(data) {
    if (data instanceof Response) {
      if (!data.ok) {
        return data;
      }

      const statusCode = data.status;

      data = await data.json();

      // Use original response status if vestec status is missing
      if (typeof data.status === 'undefined') {
        data.status = statusCode;
      }
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
   * URL Search params can be appended by setting an 'uriParams' key in the 'data' object
   * Null values or empty strings will be removed from the data object
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
