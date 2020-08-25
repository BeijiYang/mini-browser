// pre - processing
function getStyle(element) {
  if (!element.style) element.style = {};

  const { computedStyle, style } = element;

  for (const prop in computedStyle) {
    if (style[prop]) continue;

    element.style[prop] = computedStyle[prop].value;

    if (element.style[prop].toString().match(/px$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
    if (element.style[prop].toString().match(/^[0-9\.]+$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
  }
  return element.style;
}

function layout(element) {
  if (!element.computedStyle) return;

  const elementStyle = getStyle(element);

  if (elementStyle.display !== 'flex') return;

  const elementItems = element.children.filter(
    el => el.type === 'element'
  );

  // to support the order property
  elementItems.sort((a, b) => (a.order || 0) - (b.order || 0));

  const style = elementStyle;

  ['width', 'height'].forEach(size => {
    if (style[size] === 'auto' || style[size] === '') {
      style[size] = null;
    }
  })

  if (!style['flex-direction'] || style['flex-direction'] === 'auto') {
    style['flex-direction'] = 'row';
  }
  if (!style['align-items'] || style['align-items'] === 'auto') {
    style['align-items'] = 'stretch';
  }
  if (!style['justify-content'] || style['justify-content'] === 'auto') {
    style['justify-content'] = 'flex-start';
  }
  if (!style['flex-wrap'] || style['flex-wrap'] === 'auto') {
    style['flex-wrap'] = 'nowrap';
  }
  if (!style['align-content'] || style['align-content'] === 'auto') {
    style['align-content'] = 'stretch';
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

  if (style['flex-direction'] === 'row') {
    mainSize = 'width';
    mainStart = 'left';
    mainEnd = 'right';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  } else if (style['flex-direction'] === 'row-reverse') {
    mainSize = 'width';
    mainStart = 'right';
    mainEnd = 'left';
    mainSign = -1;
    mainBase = style.width;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  } else if (style['flex-direction'] === 'column') {
    mainSize = 'height';
    mainStart = 'top';
    mainEnd = 'bottom';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  } else if (style['flex-direction'] === 'column-reverse') {
    mainSize = 'height';
    mainStart = 'bottom';
    mainEnd = 'top';
    mainSign = -1;
    mainBase = style.height;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }

  if (style['flex-wrap'] === 'wrap-reverse') {
    const [crossEnd, crossStart] = [crossStart, crossEnd];
    crossSign = -1;
  } else {
    crossBase = 0;
    crossSign = +1;
  }

  let isAutoMainSize = false;
  if (!style[mainSize]) {
    // auto sizing
    elementStyle[mainSize] = 0;
    for (let i = 0; i < elementItems.length; i++) {
      const itemStyle = getStyle(elementItems[i]);
      if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== (void 0)) {
        elementStyle[mainSize] = elementStyle[mainSize] + itemStyle[mainSize];
      }
    }
    isAutoMainSize = true;
  }

  let flexLine = [];
  const flexLines = [flexLine];

  let mainSpace = elementStyle[mainSize];
  let crossSpace = 0;

  for (let i = 0; i < elementItems.length; i++) {
    const item = elementItems[i];
    const itemStyle = getStyle(item);

    if (itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0;
    }

    if (itemStyle.flex) {
      flexLine.push(item);
    } else if (style['flex-wrap'] === 'nowrap' && isAutoMainSize) {
      mainSpace -= itemStyle[mainSize];
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      flexLine.push(item);
    } else {
      if (itemStyle[mainSize] > style[mainSize]) {
        itemStyle[mainSize] = style[mainSize];
      }

      if (mainSpace < itemStyle[mainSize]) {
        flexLine.mainSpace = mainSpace;
        flexLine.crossSpace = crossSpace;
        // create a new line
        flexLine = [item];
        flexLines.push(flexLine);

        mainSpace = style[mainSize];
        crossSpace = 0;
      } else {
        flexLine.push(item);
      }

      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      mainSpace -= itemStyle[mainSize];
    }
  }
  flexLine.mainSpace = mainSpace;
  if (style['flex-wrap'] === "nowrap" || isAutoMainSize) {
    flexLine.crossSpace = (style[crossSize] !== undefined)
      ? style[crossSize]
      : crossSpace;
  } else {
    flexLine.crossSpace = crossSpace;
  }

  if (mainSpace < 0) {
    // overflow (happens only if container is single line), scale every item 
    let scale = style[mainSize] / (style[mainSize] - mainSpace);
    let currentMain = mainBase;

    for (let i = 0; i < elementItems.length; i++) {
      const itemStyle = getStyle(elementItems[i]);
      if (itemStyle.flex) {
        itemStyle[mainSize] = 0;
      }

      itemStyle[mainSize] = itemStyle[mainSize] * scale;

      itemStyle[mainStart] = currentMain;
      itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
      currentMain = itemStyle[mainEnd];
    }
  } else {
    flexLines.forEach(flexLine => {
      const mainSpace = flexLine.mainSpace;
      let itemStyle;
      let flexTotal = 0;
      for (let i = 0; i < flexLine.length; i++) {
        itemStyle = getStyle(flexLine[i]);
        if ((itemStyle.flex !== null) && (itemStyle.flex !== (void 0))) {
          flexTotal += itemStyle.flex;
          continue;
        }
      }

      if (flexTotal > 0) {
        let currentMain = mainBase;
        for (let i = 0; i < flexLine.length; i++) {
          itemStyle = getStyle(flexLine[i]);

          if (itemStyle.flex) {
            itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
          }
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd];
        }
      } else {
        let currentMain, gap;
        if (style['justify-content'] === 'flex-start') {
          currentMain = mainBase;
          gap = 0;
        }
        if (style['justify-content'] === 'flex-end') {
          currentMain = mainBase + mainSpace * mainSign;
          gap = 0;
        }
        if (style['justify-content'] === 'center') {
          currentMain = mainBase + mainSpace / 2 * mainSign;
          gap = 0;
        }
        if (style['justify-content'] === 'space-between') {
          currentMain = mainBase;
          gap = mainSpace / (elementItems.length - 1) * mainSign;
        }
        if (style['justify-content'] === 'space-around') {
          currentMain = gap / 2 + mainBase;
          gap = mainSpace / elementItems.length * mainSign;
        }
        if (style['justify-content'] === 'space-evenly') {
          gap = mainSpace / (elementItems.length + 1) * mainSign
          currentMain = gap + mainBase
        }
        for (let i = 0; i < flexLine.length; i++) {
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd] + gap;
        }
      }
    })
  }

  if (!style[crossSize]) {
    crossSpace = 0;
    elementStyle[crossSize] = 0;

    for (let i = 0; i < flexLines.length; i++) {
      elementStyle[crossSize] = elementStyle[crossSize] + flexLines[i].crossSpace;
    }
  } else {
    crossSpace = style[crossSize];
    for (let i = 0; i < flexLines.length; i++) {
      crossSpace -= flexLines[i].crossSpace;
    }
  }

  if (style['flex-wrap'] === 'wrap-reverse') {
    crossBase = style[crossSize];
  } else {
    crossBase = 0;
  }

  let lineSize = style[crossSize] / flexLines.length;
  let gap;

  if (style['align-content'] === 'flex-start') {
    crossBase += 0;
    gap = 0;
  }
  if (style['align-content'] === 'flex-end') {
    crossBase += crossSpace * crossSign;
    gap = 0;
  }
  if (style['align-content'] === 'center') {
    crossBase += crossSpace * crossSign / 2;
    gap = 0;
  }
  if (style['align-content'] === 'space-between') {
    crossBase += 0;
    gap = crossSpace / (flexLines.length - 1);
  }
  if (style['align-content'] === 'space-around') {
    crossBase += crossSign * gap / 2;
    gap = crossSpace / (flexLines.length);
  }
  if (style['align-content'] === 'stretch') {
    crossBase += 0;
    gap = 0;
  }

  flexLines.forEach(flexLine => {
    let lineCrossSize = style['align-content'] === 'stretch'
      ? flexLine.crossSpace + crossSpace / flexLines.length
      : flexLine.crossSpace;

    for (let i = 0; i < flexLine.length; i++) {
      let itemStyle = getStyle(flexLine[i]);
      let align = itemStyle['align-self'] || style['align-items'];

      if (itemStyle[crossSize] === null) {
        itemStyle[crossSize] = align === 'stretch'
          ? lineCrossSize
          : 0;
      }

      if (align === 'flex-start') {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      }
      if (align === 'flex-end') {
        itemStyle[crossStart] = crossBase + crossSign * lineCrossSize;
        itemStyle[crossEnd] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize];
      }
      if (align === 'center') {
        itemStyle[crossStart] = crossBase + crossSign * lineCrossSize[crossSize] / 2;
        itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      }
      if (align === 'stretch') {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] = crossBase + crossSign * ((itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) ? itemStyle[crossSize] : lineCrossSize);
        itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart]);
      }
    }
    crossBase += crossSign * (lineCrossSize + gap);
  })
}

module.exports = layout;
