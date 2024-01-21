import { getTree, getChildren } from "./mock-data.js";

const bookmarksBox = document.querySelector(".bookmarks-box");

window.onload = async function () {
  // const bookmarkTree = await chrome.bookmarks.getTree();
  const bookmarkTree = getTree();
  console.log("tree: ", bookmarkTree);

  listBookmarks(bookmarksBox, bookmarkTree);
};

function generateItem(node) {
  const item = document.createElement("div");
  item.classList.add("item");

  const isFolder = node.children;
  if (isFolder) {
    const icon = generateIcon();
    item.append(icon);
  }

  const titleSpan = document.createElement("span");
  titleSpan.classList.add("text");
  titleSpan.textContent = node.title;
  item.append(titleSpan);

  item.addEventListener("click", () => {
    if (isFolder) {
      const icon = item.firstElementChild;
      icon.classList.toggle("expand");

      const childrenContainer = document.createElement("div");
      childrenContainer.classList.add("left-padding");
      item.after(childrenContainer);
      listBookmarks(childrenContainer, node.children);
    } else {
      // TODO: open a new tab
    }
  });

  return item;
}

function generateIcon() {
  const icon = document.createElement("span");
  icon.classList.add("icon");
  icon.innerHTML = `<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M10.75 8.75L14.25 12L10.75 15.25"
                      />
                    </svg>`;

  return icon;
}

function listBookmarks(container, bookmarks) {
  bookmarks.forEach((node) => {
    const item = generateItem(node);
    container.append(item);
  });
}

async function getBookmarkChildren(id) {
  const children = await chrome.bookmarks.getChildren(id);
  return children;
}

async function getBookmarkTree() {
  const bookmarkTree = await chrome.bookmarks.getTree();
  return bookmarkTree;
}
