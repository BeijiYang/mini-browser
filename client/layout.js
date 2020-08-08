// pre-processing
function getStyle(element) {
  if (!element.styleToUse) element.styleToUse = {};

  const { computedStyle } = element;

  for (const prop in computedStyle) {
    element.computedStyle[prop] = computedStyle[prop].value;

    // 把 px 单位的转为数字
    if (element.computedStyle[prop].toString().match(/px$/)) {
      element.computedStyle[prop] = parseInt(element.styleToUse[prop]);
    }
    // 把数字字符串转换为数字类型
    if (element.computedStyle[prop].toString().match(/^[0-9\.]+$/)) {
      element.computedStyle[prop] = parseInt(element.styleToUse[prop]);
    }
  }
  return element.computedStyle;
}

function layout(element) {
  if (!element.computedStyle) return;

  const elementStyle = getStyle(element);
  // console.log("🔥", elementStyle)
  // 仅以 flex 布局为例实现
  if (elementStyle.display !== 'flex') return;

  // 过滤文本节点等
  const items = element.children.filter(
    el => el.type === 'element'
  );
}

module.exports = layout;