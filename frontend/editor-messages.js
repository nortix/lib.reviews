'use strict';
const msgArr = [
  'accesskey',
  'insert image',
  'insert image help',
  'insert image dialog title',
  'insert',
  'insert horizontal rule',
  'insert horizontal rule help',
  'insert help',
  'image url',
  'image alt text',
  'add or remove link',
  'add link dialog title',
  'web address',
  'toggle bold',
  'toggle italic',
  'toggle code',
  'format block',
  'format block help',
  'format as bullet list',
  'format as numbered list',
  'format as quote',
  'format as paragraph help',
  'format as paragraph',
  'format as code block',
  'format as code block help',
  'format as heading',
  'format as level heading help',
  'format as level heading',
  'format as spoiler',
  'format as spoiler help',
  'format as nsfw',
  'format as nsfw help',
  'format as custom warning',
  'format as custom warning help',
  'format as custom warning dialog title',
  'custom warning text',
  'undo',
  'redo',
  'join with item above',
  'decrease item indentation',
  'required field',
  'ok',
  'cancel',
  'remember rte preference',
  'forget rte preference',
  'full screen mode',
  'spoiler warning',
  'nsfw warning'
];
const getMessages = require('../util/get-messages');

module.exports.getEditorMessageKeys = function() {
  return msgArr.slice();
};

module.exports.getEditorMessages = function(locale) {
  return getMessages(locale, msgArr.slice());
};
