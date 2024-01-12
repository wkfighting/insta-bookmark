console.log("extension start");

window.onload = async function () {
  const bookmarkTree = await chrome.bookmarks.getTree();
  console.log("tree: ", bookmarkTree);
};

const item = document.querySelector(".item");
item.addEventListener("click", () => {
  console.log("click", item.firstElementChild);
  const icon = item.firstElementChild;
  icon.style.transform = "rotate(90deg)";
});
