'use strict';
const config = require('config');
const escapeHTML = require('escape-html');
const md = require('../../util/md');
const urlUtils = require('../../util/url-utils');


let forms = {

  parseSubmission(req, options) {
    options = Object.assign({
      // A form schema that tells us what to do with specific fields
      formDef: undefined,
      // A globally unique key for this form that we can use to trigger
      // certain configured actions, like adding a CAPTCHA to some forms
      formKey: undefined,
      // The language of content that is being processed. Currently we expect
      // that a submission has exactly one language (i.e. not multiple
      // languages being edited at the sam etime)
      language: undefined,
      // An array of field names that scan be skipped entirely. This is useful
      // when a required field has been provided from a source outsied the form.
      skipRequiredCheck: []
    }, options);


    // Do not manipulate original form definition
    let formDef = Object.assign([], options.formDef);
    let formKey = options.formKey;

    let hasRequiredFields = true;
    let hasUnknownFields = false;
    let hasCorrectCaptcha = null;
    let formValues = {};
    let processedKeys = Object.keys(req.body);

    // Any form submission requires a CSRF token
    formDef.push({
      name: '_csrf',
      required: true,
      skipValue: true
    });

    // Process simple captcha if enabled for this form
    if (config.questionCaptcha.forms[formKey]) {
      formDef.push({
        name: 'captcha-id',
        required: true
      }, {
        name: 'captcha-answer',
        required: true
      });

      hasCorrectCaptcha = forms.processCaptchaAnswer(req);
    }

    for (let field of formDef) {

      // We keep track of body keys we've processed so we can flag
      // unknown data later
      let k = processedKeys.indexOf(field.name);
      if (k !== -1)
        processedKeys.splice(k, 1);

      // We can map form keys to object keys if desired, using the 'key'
      // option in the form definition.
      let key = field.key || field.name;

      // We can exempt fields from the check, e.g., because we already have
      // the data for that field from another source than the form
      if (!options.skipRequiredCheck || options.skipRequiredCheck.indexOf(field.name) == -1) {

        if (!req.body[field.name] && field.required) {
          req.flash('pageErrors', req.__(`need ${field.name}`));
          hasRequiredFields = false;
          continue;
        }
      }

      // No further processing on fields that have the "skipValue" option, or that
      // bypass checks for other reasons. These won't be in the formValues object.
      if (field.skipValue || options.skipRequiredCheck.indexOf(field.name) != -1)
        continue;

      switch (field.type) {

        case 'number':
          formValues[key] = Number(req.body[field.name].trim());
          break;

        case 'url':
          formValues[key] = urlUtils.normalize(req.body[field.name].trim());
          formValues[key] = encodeURI(formValues[key]);
          break;

        // Multilingual text that needs to be trimmed and escaped
        case 'text':
          formValues[key] = {
            [options.language]: escapeHTML(req.body[field.name].trim())
          };
          break;

        // Multilingual markdown, we preserve both the escaped text and the
        // rendered markdown
        case 'markdown':
          if (!field.flat)
            formValues[key] = {
              text: {
                [options.language]: escapeHTML(req.body[field.name].trim())
              },
              html: {
                [options.language]: md.render(req.body[field.name].trim(), {language: req.locale})
              }
            };

          // For schemas with a single text field, we support a flat structure
          else {
            formValues[key] = {
              [options.language]: escapeHTML(req.body[field.name].trim())
            };

            formValues[field.htmlKey] = {
              [options.language]: md.render(req.body[field.name].trim(), {language: req.locale})
            };
          }
          break;

        case 'boolean':
          formValues[key] = Boolean(req.body[field.name]);
          break;

        default:
          formValues[key] = req.body[field.name];

      }

    }

    if (processedKeys.length) {
      hasUnknownFields = true;
      req.flash('pageErrors', req.__('unexpected form data'));
    }

    return {
      hasRequiredFields,
      hasUnknownFields,
      hasCorrectCaptcha,
      formValues
    };
  },

  getQuestionCaptcha(formKey) {
    let id;
    if (config.questionCaptcha.forms[formKey]) {
      id = Math.floor(Math.random() * config.questionCaptcha.captchas.length);
      return {
        id,
        captcha: config.questionCaptcha.captchas[id]
      };
    } else
      return undefined;
  },

  processCaptchaAnswer(req) {

    let id = req.body['captcha-id'];
    let answerText = req.body['captcha-answer'];

    if (!answerText) //  no need to flash - missing field error message will kick in
      return false;

    if (!config.questionCaptcha.captchas[id]) {
      req.flash('pageErrors', req.__('unknown captcha'));
      return false;
    }

    if (answerText.trim().toUpperCase() !== req.__(config.questionCaptcha.captchas[id].answerKey).toUpperCase()) {
      req.flash('pageErrors', req.__('incorrect captcha answer'));
      return false;
    } else
      return true;
  }

};

module.exports = forms;
