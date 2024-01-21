console.log("extension start");

import { getTree } from "./mock-data.js";

window.onload = async function () {
  // const bookmarkTree = await chrome.bookmarks.getTree();
  const bookmarkTree = getTree();
  console.log("tree: ", bookmarkTree);
};

const item = document.querySelector(".item");
item.addEventListener("click", () => {
  console.log("click", item.firstElementChild);
  const icon = item.firstElementChild;
  icon.style.transform = "rotate(90deg)";
});
