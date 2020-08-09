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
  const elementItems = element.children.filter(
    el => el.type === 'element'
  );

  // to support the order property
  elementItems.sort((a, b) => (a.order || 0) - (b.order || 0));

  const style = elementStyle; // ??

  ['width', 'height'].forEach(size => {
    if (style[size] === 'auto' || style[size] === '') {
      // 把空的变为 null，方便后续代码中进行判断
      style[size] = null;
    }
  })

  // set default value 设置 flex 相关属性的默认值，确保不空
  if (!style.flexDirection || style.flexDirection === 'auto') {
    style.flexDirection = 'row';
  }
  if (!style.alignItems || style.alignItems === 'auto') {
    style.alignItems = 'stretch';
  }
  if (!style.justifyContent || style.justifyContent === 'auto') {
    style.justifyContent = 'flex-start';
  }
  if (!style.flexWrap || style.flexWrap === 'auto') {
    style.flexWrap = 'nowrap';
  }
  if (!style.alignContent || style.alignContent === 'auto') {
    style.alignContent = 'stretch';
  }

  let mainSize,
    mainStart,
    mainEnd,
    mainSign,
    mainBase,
    crossSize,
    crossStart,
    crossEnd,
    crossSign,
    crossBase;

  if (style.flexDirection === 'row') {
    mainSize = 'width';
    mainStart = 'left';
    mainEnd = 'right';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  } else if (style.flexDirection === 'row-reverse') {
    mainSize = 'width';
    mainStart = 'right';
    mainEnd = 'left';
    mainSign = -1;
    mainBase = style.width;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  } else if (style.flexDirection === 'column') {
    mainSize = 'height';
    mainStart = 'top';
    mainEnd = 'bottom';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  } else if (style.flexDirection === 'column-reverse') {
    mainSize = 'height';
    mainStart = 'bottom';
    mainEnd = 'top';
    mainSign = -1;
    mainBase = style.height;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }

  if (style.flexWrap === 'wrap-reverse') {
    const [crossEnd, crossStart] = [crossStart, crossEnd];
    crossSign = -1;
  } else {
    crossBase = 0;
    crossSign = +1;
  }

  // 如果父元素没有设置主轴尺寸，即由子元素把父元素撑开。此处称该模式为 auto main size
  let isAutoMainSize = false;
  if (!style[mainSize]) {
    // auto sizing
    elementStyle[mainSize] = 0;
    for (let i = 0; i < elementItems.length; i++) {
      // const item = elementItems[i];
      if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== (void 0)) {
        elementStyle[mainSize] = elementStyle[mainSize] + itemStyle[mainSize];
      }
    }
    isAutoMainSize = true;
  }

  // 把元素放进行里
  let flexLine = [];
  const flexLines = [flexLine];

  // mainSpace 是剩余空间, 将其设为父元素的 mainsize ？？？？
  let mainSpace = elementStyle[mainSize];
  let crossSpace = 0;

  // 循环所有的 flex items
  for (let i = 0; i < elementItems.length; i++) {
    const itemStyle = getStyle(elementItems[i]);
    // 为单个元素的 空的 主轴尺寸 设置默认值 0 
    if (itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0;
    }
    // 单行 与 换行 的逻辑
    // 若有属性 flex (不是 display: flex)，说明该元素可伸缩，即一定可以放进 flexLine 里
    if (itemStyle.flex) {
      flexLine.push(item);
    } else if (style.flexWrap === 'nowrap' && isAutoMainSize) {
      mainSpace -= itemStyle[mainSize];
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
        // e.g. 算行高(当flex direction 为 row时)
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      // 因为 nowrap
      flexLine.push(item);
    } else { // 开始换行的逻辑
      // 若有元素主轴尺寸比父元素还大，则压缩到跟父元素一样大。(举例思考容易理解，如宽度)
      if (itemStyle[mainSize] > style[mainSize]) {
        itemStyle[mainSize] = style[mainSize];
      }
      // 若主轴内剩下的空间不足以容纳每一个元素 ?? 则换行
      if (mainSpace < itemStyle[mainSize]) {
        flexLine.mainSpace = mainSpace // 存储主轴剩余的空间，之后要用
        flexLine.crossSpace = crossSpace; // 存储交叉轴剩余空间
        // 前两行都是处理旧的 flexline  得出该行实际剩余的尺寸，和实际占的尺寸 ？
        // 接下来创建新行。当前的 item 已经放不进旧的行了。
        flexLine = [item]; // 创建一个新的 flex line
        flexLines.push(flexLine);
        // 重置两个属性
        mainSpace = style[mainSize];
        crossSpace = 0;
      } else { // 如果主轴内还能方向该元素
        flexLine.push(item);
      }
      // 接下来 还是算主轴和交叉轴的尺寸
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      mainSpace -= itemStyle[mainSize];
    }
  }
  // set mainSpace and crossSpace
  flexLine.mainSpace = mainSpace;
  if (style.flexWrap === "nowrap" || isAutoMainSize) {
    flexLine.crossSpace = (style[crossSize] !== undefined)
      ? style[crossSize]
      : crossSpace;
  } else {
    flexLine.crossSpace = crossSpace;
  }

  if (mainSpace < 0) {
    // overflow (happens only if container is single line), scale every item 
    // 只会发生在单行，算特情
    // 等比压缩
    let scale = style[mainSize] / (style[mainSize] - mainSpace) // style[mainSize] 是容器的主轴尺寸，它减去 mainSpace 是期望的尺寸
    let currentMain = mainBase;

    // 循环每一个元素，找出样式
    for (let i = 0; i < elementItems.length; i++) {
      const itemStyle = getStyle(elementItems[i]);
      if (itemStyle.flex) {
        // flex 元素不参与等比压缩，故而尺寸设为 0
        itemStyle[mainSize] = 0;
      }

      itemStyle[mainSize] = itemStyle[mainSize] * scale;

      // 以 row 的情况为例，计算压缩之后的 left 和 right。
      itemStyle[mainStart] = currentMain; // currentMain 当前排到哪儿了
      itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]; // left（start） 加上宽度，就是 right（end） 的值
      currentMain = itemStyle[mainEnd];
    }
  } else {
    // 多行
    // process each flex line
    flexLines.forEach(flexLine => {
      const mainSpace = flexLine.mainSpace;
      let flexTotal = 0;
      for (let i = 0; i < flexLine.length; i++) {
        let itemStyle = getStyle(flexLine[i]);
        // 在循环中找出 flex 元素，把 flex 加到 flexTotal 上去
        if ((itemStyle.flex !== null) && (itemStyle.flex !== (void 0))) {
          flexTotal += itemStyle.flex;
          continue;
        }
      }

      // 如果flex 元素存在，就把 mianSpace 均匀地分布给每一个 flex 元素 (如果有 flex 元素，永远是占满整个行，justifyContent 属性用不上)
      if (flexTotal > 0) {
        let currentMain = mainBase;
        for (let i = 0; i < flexLine.length; i++) {
          const itemStyle = getStyle(flexLine[i]);
          // 如果是 flex 元素，根据收集元素进行的时候计算得出的 mainSpace（每行的主轴方向的剩余空间），按比例（除以总值，乘以自己的flex）划分，得出这些 flex 元素各自的主轴尺寸
          if (itemStyle.flex) {
            itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
          }
          // 跟前面如出一辙，先给一个 currentMain，它一开始等于 mainBase，每排一个元素，currentMain 就加一个（主轴方向的正负符号*主轴方向的尺寸），算得 mainEnd
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd];
        }
      } else {
        // 如果没有 flex 元素，就把主轴方向的剩余空间，根据 justifyContent的规则分配
        let currentMain, gap;
        if (style.justifyContent === 'flex-start') {
          currentMain = mainBase; // 以 row 为例，从左向右排。currentMain 就是 mainBase
          gap = 0; // 每个元素之间没有间隔
        }
        if (style.justifyContent === 'flex-end') {
          currentMain = mainBase + mainSpace * mainSign; // 以 row 为例，从右向左排。currentMain 是 mainBase + mainSpace 剩余空间
          gap = 0; // 每个元素之间没有间隔
        }
        if (style.justifyContent === 'center') {
          currentMain = mainBase + mainSpace / 2 * mainSign;
          gap = 0; // 每个元素之间没有间隔
        }
        if (style.justifyContent === 'space-between') {
          currentMain = mainBase;
          gap = mainSpace / (items.length - 1) * mainSign; // 每个元素直接有间隔，总共有 items.length - 1 个间隔
        }
        if (style.justifyContent === 'space-around') {
          currentMain = gap / 2 + mainBase;
          gap = mainSpace / items.length * mainSign; // 每个元素直接有间隔，总共有 items.length 个间隔
        }
        if (style.justifyContent === 'space-evenly') {
          gap = mainSpace / (items.length + 1) * mainSign
          currentMain = gap + mainBase
        }
        // 所有的元素都是 根据 mainstart 和  mainsize 算 mainend
        for (let i = 0; i < flexLine.length; i++) {
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd] + gap;
        }
        // 至此，计算出所有的主轴尺寸。以 row 为例，是 宽width  左left  右right
      }
    })
  }

}

module.exports = layout;