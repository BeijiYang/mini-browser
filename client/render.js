const images = require("images");

function render(viewport, element) {
  if (element.style) { // 检测元素是否有样式
    let img = images(element.style.width, element.style.height); // 根据其宽高创建新的 img 对象
    // 简化，只处理背景色
    if (element.style["background-color"]) {
      let color = element.style["background-color"] || "rgb(0, 0, 0)";
      color.match(/rgb\((\d+),(\d+),(\d+)\)/);
      img.fill(Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3), ) // 又尼玛不全
      viewport.draw(
        img,
        element.style.left || 0,
        element.style.top || 0
      );
    }
  }
}

module.exports = render;