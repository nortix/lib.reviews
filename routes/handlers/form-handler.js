'use strict';
const render = require('../helpers/render');

// This is a generic class to provide middleware handlers for create/edit/delete
// forms. It comes with some useful pre-flight checks but needs to be extended
// to do useful work. By default, all operations require being logged in.
class FormHandler {

  constructor(req, res, next, options) {

    if (!req || !res || !next)
      throw new Error('Form needs at least req, res, and next functions from middleware.');

    this.actions = {
      create: {
        // Function to call for GET requests
        GET: this.create_GET,
        // Function to call for POST requests
        POST: this.create_POST,
        // Checks to perform before either of above functions are called.
        // If checks fail, they are not called (checks have to handle
        // the request).
        preFlightChecks: [this.userIsSignedIn],
        // Title for all "create" actions
        titleKey: undefined
      },
      edit: {
        GET: this.edit_GET,
        POST: this.edit_POST,
        preFlightChecks: [this.userIsSignedIn],
        // Function to call to load data and pass it to GET/POST function
        loadData: this.loadData,
        // Function to call to validate that user can perform this action,
        // once we have a resource to check against.
        resourcePermissionCheck: this.userCanEdit,
        titleKey: undefined
      },
      delete: {
        GET: this.delete_GET,
        POST: this.delete_POST,
        preFlightChecks: [this.userIsSignedIn],
        loadData: this.loadData,
        resourcePermissionCheck: this.userCanDelete,
        titleKey: undefined
      }
    };

    // Middleware functions
    this.req = req;
    this.res = res;
    this.next = next;

    this.documentNotFoundTemplate = '404';
    this.documentNotFoundTitleKey = 'page not found title';

    // Defaults
    options = Object.assign({
      action: 'create',
      method: 'GET',
      id: undefined // only for edit/delete operations
    }, options);

    Object.assign(this, options);

  }

  execute() {

    let actions = Object.keys(this.actions);
    if (actions.indexOf(this.action) == -1)
      throw new Error('Did not recognize form action: ' + this.type);

    if (typeof this.actions[this.action][this.method] != 'function')
      throw new Error('No defined handler for this method.');


    // Perform pre-flight checks (e.g., permission checks). Pre-flight checks
    // are responsible for rendering failure/result messages, so no
    // additional rendering will take place if any checks fail.
    let mayProceed = true;

    for (let check of this.actions[this.action].preFlightChecks) {
      let result = check.call(this);
      if (!result)
        mayProceed = false;
    }

    if (!mayProceed)
      return;

    if (!this.actions[this.action].loadData)
      this.actions[this.action][this.method].call(this); // Call appropriate handler
    else {
      // Asynchronously load data and show 404 if not found
      this
        .loadData()
        .then(data => {

          if (data._revDeleted)
            throw new Error('deleted');

          // If we have a permission check, only proceeds if it succeeds.
          // If we don't have a permission check, proceed.
          if (!this.actions[this.action].resourcePermissionCheck ||
            this.actions[this.action].resourcePermissionCheck.call(this, data))

            this.actions[this.action][this.method].call(this, data);

        })
        .catch(error => {
          if (error.name == 'DocumentNotFoundError' || error.message == 'deleted') {
            this.res.status(404);
            render.template(this.req, this.res, this.documentNotFoundTemplate, {
              titleKey: this.documentNotFoundTitleKey,
              id: this.id
            });
          } else
            this.next(error);
        });
    }

  }


  userIsSignedIn() {
    if (!this.req.user) {
      render.signinRequired(this.req, this.res, {
        titleKey: this.actions[this.action].titleKey
      });
      return false;
    } else
      return true;
  }

  userIsTrusted() {
    if (!this.req.user || !this.req.user.isTrusted) {
      render.permissionError(this.req, this.res, {
        titleKey: this.actions[this.action].titleKey,
        detailsKey: "must be trusted",
      });
      return false;
    } else
      return true;
  }

  userCan(action, data) {
    data.populateUserInfo(this.req.user);
    if (action == 'edit' && data.userCanEdit)
      return true;
    else if (action == 'delete' && data.userCanDelete)
      return true;
    else {
      render.permissionError(this.req, this.res, {
        titleKey: this.actions[this.action].titleKey
      });
      return false;
    }
  }

  userCanEdit(data) {
    return this.userCan('edit', data);
  }

  userCanDelete(data) {
    return this.userCan('delete', data);
  }

  // Adds a pre-flight check to all actions
  addPreFlightCheck(check) {
    for (let action in this.actions)
      this.actions[action].preFlightChecks.push(check);
  }

}

module.exports = FormHandler;
