console.log("extension start");

window.onload = async function () {
  const bookmarkTree = await chrome.bookmarks.getTree();
  console.log("tree: ", bookmarkTree);
};
