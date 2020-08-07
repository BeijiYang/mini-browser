const css = require("css"); // it's a css parser, 通过词法分析 语法分析，把 CSS => CSS AST

// 词法分析 tokenization 状态机; 语法分析 用栈匹配的过程
let currentToken = null;
let currentTextNode = null;
let currentAttribute = null;

const EOF = Symbol('EOF'); // end of file token
const stack = [{ type: 'document', children: [] }]; // a stack with the root node
const rules = []; // to save CSS rules

// gather all the CSS rules
function addCSSRules(text) {
  const ast = css.parse(text);
  console.log(JSON.stringify(ast, null, 4));
  rules.push(...ast.stylesheet.rules);
}

module.exports.parseHTML = function (html) {
  let state = data; // initial state             HTML 标准里把初始状态称为 data

  for (const char of html) {
    // console.log(char, state.name)
    state = state(char);
  }
  state = state(EOF);
  return stack[0];
}

// There three kinds of HTML tags: opening tag <div>, closing tag </div>, self-colsing tag <div/>
// initial state             HTML 标准里把初始状态称为 data
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

// when the state is tagOpen, we don't know what kind of tag it is. 
// <
function tagOpen(char) {
  if (char === '/') {
    // </    </div>
    return endTagOpen;
  } else if (char.match(/^[a-zA-Z]$/)) {
    // the char is a letter, the tag could be a opening tag or a self-closing tag
    // <d      <div> or </div>
    currentToken = {
      type: 'startTag',
      tagName: '',
    }
    return tagName(char); // reconsume
  } else {
    // Parse error
    return;
  }
}
// /
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
    // tagname start from a '<', end with a ' '
    // <div prop
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

// 已经 <div/ 了，后面只有跟 > 是有效的，其他的都报错。
function selfClosingStartTag(char) {
  console.log('🥛')
  if (char === ">") {
    currentToken.isSelfClosing = true;
    console.log('🥛' + currentToken.isSelfClosing)
    emit(currentToken) // 补?
    return data;
  } else if (char === EOF) {

  } else {

  }
}

function beforeAttributeName(char) {
  if (char.match(/^[\t\n\f ]$/)) { // 当标签结束
    return beforeAttributeName;
  } else if (char === "/" || char === ">" || char === EOF) {
    // 属性结束
    return afterAttributeName(char);
  } else if (char === "=") {
    // 属性开始的时候，不会直接就是等号，报错
    // return
  } else {
    // 遇到字符，创建新的属性
    currentAttribute = {
      name: "",
      value: ""
    }
    return attributeName(char);
  }
}

function attributeName(char) {
  if (char.match(/^[\t\n\f ]$/) || char === "/" || char === EOF) { // 一个完整的属性结束 "<div class='abc' "
    return afterAttributeName(char);
  } else if (char === "=") { // class= 可以进入获取value的状态
    return beforeAttributeValue;
  } else if (char === "\u0000") { // null

  } else if (char === "\"" || char === "'" || char === "<") { // 双引号 单引号 <

  } else {
    currentAttribute.name += char;
    return attributeName;
  }
}


function attributeName(char) {
  if (char.match(/^[\t\n\f ]$/) || char === "/" || char === EOF) { // 一个完整的属性结束 "<div class='abc' "
    return afterAttributeName(char);
  } else if (char === "=") { // class= 可以进入获取value的状态
    return beforeAttributeValue;
  } else if (char === "\u0000") { // null

  } else if (char === "\"" || char === "'" || char === "<") { // 双引号 单引号 <

  } else {
    currentAttribute.name += char;
    return attributeName;
  }
}

function beforeAttributeValue(char) {
  if (char.match(/^[\t\n\f ]$/) || char === "/" || char === ">" || char === EOF) {
    return beforeAttributeValue; //?
  } else if (char === "\"") {
    return doubleQuotedAttributeValue; // <html attribute="
  } else if (char === "\'") {
    return singleQuotedAttributeValue; // <html attribute='
  } else if (char === ">") {
    // return data
  } else {
    return UnquotedAttributeValue(char); // <html attribute=
  }
}

function doubleQuotedAttributeValue(char) {
  if (char === "\"") { // 第二个双引号，结束
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

// 所有的 属性结束时，把其 Attribute name、value 写到 current token，即当前的标签上
function UnquotedAttributeValue(char) {
  if (char.match(/^[\t\n\f ]$/)) { // Unquoted Attribute value 以空白符结束
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return beforeAttributeName; // 因为空白符是结束的标志， “<html maaa=a ” 把相关值挂到token上后，接下的状态可能又是一个新的 attribute name
  } else if (char === "/") {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return selfClosingStartTag; // 同上，自封闭标签的结束
  } else if (char === ">") {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    emit(currentToken); // 结束
    return data;
  } else if (char === "\u0000") {

  } else if (char === "\"" || char === "'" || char === "<" || char === "=" || char === "`") {

  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return UnquotedAttributeValue;
  }
}

// afterQuotedAttributeValue 状态只能在 double quoted 和 single quoted 之后进入。
// 不能直接接收一个字符 如： "<div id='a'"" 这之后至少得有一个空格才可以，紧挨着如 "<div id='a'class=""" 是不合法的 "<div id='a' class=""" 才行
function afterQuotedAttributeValue(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (char === "/") {
    return selfClosingStartTag;
  } else if (char === ">") { // 标签结束，emit token
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return doubleQuotedAttributeValue;
  }
}

// 已经 <div/ 了，后面只有跟 > 是有效的，其他的都报错。
function selfClosingStartTag(char) {
  if (char === ">") {
    currentToken.isSelfClosing = true;
    emit(currentToken) // 补?
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

//............
// the emit function takes the token generated from the state machine
function emit(token) {
  // console.log(token);
  let top = stack[stack.length - 1];

  if (token.type === 'startTag') {
    // element is what you can see on the page
    let element = {
      type: 'element',
      children: [],
      attributes: [],
      tagName: token.tagName
    }
    // console.log(token)
    for (const prop in token) {
      if (prop !== "type" && prop !== "tagName") {
        element.attributes.push({
          name: prop,
          value: token[prop],
        })
      }
    }

    top.children.push(element);
    // element.parent = top;

    if (!token.isSelfClosing) {
      stack.push(element);
    }

    currentTextNode = null;
  } else if (token.type === 'endTag') {
    if (top.tagName !== token.tagName) {
      // 真实浏览器会做容错操作，此处省略
      throw new Error('Tag does not match');
    } else {
      // CSS: 遇到 style 标签，执行添加 CSS 规则的操作。HTML 解析遇到 style 标签的结束标签时，就已经可以拿到 style 标签的文本子节点了。
      if (top.tagName === 'style') {
        // console.log('🍅')
        // console.log(top)
        addCSSRules(top.children[0].content); // 栈顶元素 top 的 children 是当前 element
      }
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

