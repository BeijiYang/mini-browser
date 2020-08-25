const css = require("css");
const layout = require("./layout.js");

const EOF = Symbol('EOF');
const stack = [{ type: 'document', children: [] }];
const rules = [];

let currentToken = null;
let currentTextNode = null;
let currentAttribute = null;

module.exports.parse = function (html) {
  let state = data;

  for (const char of html) {
    state = state(char);
  }
  state = state(EOF);
  return stack[0];
}

// gather all the CSS rules
function addCSSRules(text) {
  const ast = css.parse(text);
  rules.push(...ast.stylesheet.rules);
}

function computeCSS(element) {
  const elements = stack.slice().reverse();

  if (!element.computedStyle) {
    element.computedStyle = {};
  }

  for (const rule of rules) {
    const selectors = rule.selectors[0].split(' ').reverse();

    if (!match(element, selectors[0])) continue;

    let matched = false;

    let selectorIndex = 1;
    for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
      if (match(elements[elementIndex], selectors[selectorIndex])) {
        selectorIndex++;
      }
    }
    if (selectorIndex >= selectors.length) {
      // all selectors are matched
      matched = true;
    }
    // add the CSS rules to the matched element
    if (matched) {
      const { computedStyle } = element;
      const specificity = getSpecificity(rule.selectors[0]);

      for (const declaration of rule.declarations) {
        const { property, value } = declaration;
        if (!computedStyle[property]) {
          computedStyle[property] = {};
        }
        // CSS specificity
        if (!computedStyle[property].specificity) {
          computedStyle[property] = {
            value,
            specificity,
            ...computedStyle[property],
          }
        } else if (compareSpecificity(computedStyle[property].specificity, specificity) < 0) {
          // current CSS selector have higher specificity than the previous, cover the previous rules
          computedStyle[property] = {
            value,
            specificity,
            ...computedStyle[property],
          }
        }
      }
    }
  }
}

// assuming selector is a simple selector (.class #id tagname)
function match(element, selector) {
  if (!selector || !element.attributes) return false;

  if (selector.charAt(0) === '#') { // id selector
    const attr = element.attributes.filter(
      ({ name }) => (name === 'id')
    )[0];
    if (attr && attr.value === selector.replace('#', '')) {
      return true;
    }
  } else if (selector.charAt(0) === '.') { // class selector
    const attr = element.attributes.filter(
      ({ name }) => (name === 'class')
    )[0];
    if (attr && attr.value === selector.replace(".", "")) {
      return true;
    }
  } else { // type selector
    if (element.tagName === selector) return true;
  }
}

function getSpecificity(selector) {
  const specificity = [0, 0, 0, 0];
  // similarly, assuming that selector is composed of simple selectors.
  const selectors = selector.split(' ');

  for (const item of selectors) {
    if (item.charAt(0) === '#') {
      specificity[1] += 1;
    } else if (item.charAt(0) === '.') {
      specificity[2] += 1;
    } else {
      specificity[3] += 1;
    }
  }
  return specificity;
}

function compareSpecificity(sp1, sp2) {
  if (sp1[0] - sp2[0]) {
    return sp1[0] - sp2[0];
  }
  if (sp1[1] - sp2[1]) {
    return sp1[1] - sp2[1];
  }
  if (sp1[2] - sp2[2]) {
    return sp1[2] - sp2[2];
  }
  return sp1[3] - sp2[3];
}

// the emit function takes the token generated from the state machine
function emit(token) {
  let top = stack[stack.length - 1];

  if (token.type === 'startTag') {
    let element = {
      type: 'element',
      children: [],
      attributes: [],
      tagName: token.tagName
    }

    for (const prop in token) {
      if (prop !== "type" && prop !== "tagName") {
        element.attributes.push({
          name: prop,
          value: token[prop],
        })
      }
    }

    // CSS computing happens during the DOM tree construction 
    computeCSS(element);

    top.children.push(element);
    // element.parent = top;

    if (!token.isSelfClosing) {
      stack.push(element);
    }

    currentTextNode = null;
  } else if (token.type === 'endTag') {
    if (top.tagName !== token.tagName) {
      throw new Error('Tag does not match');
    } else {
      if (top.tagName === 'style') {
        addCSSRules(top.children[0].content);
      }
      layout(top);
      stack.pop();
    }
    currentTextNode = null;
  } else if (token.type === 'text') {
    if (currentTextNode === null) {
      currentTextNode = {
        type: "text",
        content: "",
      }
      top.children.push(currentTextNode);
    }
    currentTextNode.content += token.content;
  }
}

function data(char) {
  if (char === '<') {
    return tagOpen;
  } else if (char === EOF) {
    emit({ type: 'EOF' });
    return;
  } else {
    emit({
      type: 'text',
      content: char,
    });
    return data;
  }
}

function tagOpen(char) {
  if (char === '/') {
    return endTagOpen;
  } else if (char.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'startTag',
      tagName: '',
    }
    return tagName(char); // reconsume the char
  } else {
    // Parse error
    return;
  }
}

function endTagOpen(char) {
  if (char.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'endTag',
      tagName: ''
    }
    return tagName(char);
  } else if (char === '>') {
    // error  />  It's html, not JSX
    // Parse error
  } else if (char === EOF) {
    // Parse error
  } else {
    // Parse error
  }
}

function tagName(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (char === '/') {
    return selfClosingStartTag;
  } else if (char.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += char;
    return tagName;
  } else if (char === '>') {
    // the current tag is over, go back to the initial state to parse the next tag
    emit(currentToken);
    return data;
  } else {
    return tagName;
  }
}

function selfClosingStartTag(char) {
  if (char === ">") {
    currentToken.isSelfClosing = true;
    emit(currentToken);
    return data;
  } else if (char === EOF) {

  } else {

  }
}

function beforeAttributeName(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (char === "/" || char === ">" || char === EOF) {

    return afterAttributeName(char);
  } else if (char === "=") {

  } else {
    currentAttribute = {
      name: "",
      value: ""
    }
    return attributeName(char);
  }
}

function attributeName(char) {
  if (char.match(/^[\t\n\f ]$/) || char === "/" || char === EOF) {
    return afterAttributeName(char);
  } else if (char === "=") {
    return beforeAttributeValue;
  } else if (char === "\u0000") { // null

  } else if (char === "\"" || char === "'" || char === "<") {

  } else {
    currentAttribute.name += char;
    return attributeName;
  }
}

function beforeAttributeValue(char) {
  if (char.match(/^[\t\n\f ]$/) || char === "/" || char === ">" || char === EOF) {
    return beforeAttributeValue;
  } else if (char === "\"") {
    return doubleQuotedAttributeValue; // <html attribute="
  } else if (char === "\'") {
    return singleQuotedAttributeValue; // <html attribute='
  } else if (char === ">") {

  } else {
    return UnquotedAttributeValue(char); // <html attribute=
  }
}

function doubleQuotedAttributeValue(char) {
  if (char === "\"") {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return afterQuotedAttributeValue;
  } else if (char === "\u0000") {

  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return doubleQuotedAttributeValue;
  }
}

function singleQuotedAttributeValue(char) {
  if (char === "\'") {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return afterQuotedAttributeValue;
  } else if (char === "\u0000") {

  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return singleQuotedAttributeValue;
  }
}

function UnquotedAttributeValue(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return beforeAttributeName;
  } else if (char === "/") {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return selfClosingStartTag;
  } else if (char === ">") {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    emit(currentToken);
    return data;
  } else if (char === "\u0000") {

  } else if (char === "\"" || char === "'" || char === "<" || char === "=" || char === "`") {

  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return UnquotedAttributeValue;
  }
}

function afterQuotedAttributeValue(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (char === "/") {
    return selfClosingStartTag;
  } else if (char === ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return doubleQuotedAttributeValue;
  }
}

function selfClosingStartTag(char) {
  if (char === ">") {
    currentToken.isSelfClosing = true;
    emit(currentToken);
    return data;
  } else if (char === EOF) {

  } else {

  }
}

function afterAttributeName(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    return afterAttributeName;
  } else if (char === "/") {
    return selfClosingStartTag;
  } else if (char === "=") {
    return beforeAttributeValue;
  } else if (char === ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (char === EOF) {

  } else {
    currentToken[currentAttribute.name] = currentAttribute.value;
    currentAttribute = {
      name: "",
      value: ""
    }
    return attributeName(char);
  }
}
