import { getFaviconUrl } from "./utils/favicon.js";
import { createElement } from "./utils/element.js";

window.onload = async function () {
  const bookmarksBox = document.querySelector(".bookmarks-box");
  const bookmarkBarTree = await chrome.bookmarks.getSubTree("1"); // 书签栏
  const subTree = bookmarkBarTree[0].children;
  listBookmarks(bookmarksBox, subTree);
};

function listBookmarks(container, bookmarks) {
  if (bookmarks.length === 0) {
    const noDataBox = createElement("div", "no-data", "暂无数据");
    container.append(noDataBox);
    return;
  }

  bookmarks.forEach((node) => {
    const item = generateItem(node);
    container.append(item);
  });
}

function generateItem(bookmarkNode) {
  const item = createElement("div", "item");

  const isFolder = bookmarkNode.children;
  if (isFolder) {
    const icon = generateIcon();
    item.append(icon);
  } else {
    const favicon = createElement("img", "favicon");
    favicon.src = getFaviconUrl(bookmarkNode.url);
    item.append(favicon);
  }

  const titleSpan = createElement("span", "title", bookmarkNode.title);
  item.append(titleSpan);

  item.addEventListener("click", async () => {
    if (isFolder) {
      const icon = item.firstElementChild;
      icon.classList.toggle("expand");

      if (item.nextElementSibling?.classList.contains("left-padding")) {
        // already rendered item's children
        item.nextElementSibling.classList.toggle("hidden");
      } else {
        const childrenContainer = createElement("div", "left-padding");
        item.after(childrenContainer);
        listBookmarks(childrenContainer, bookmarkNode.children);
      }
    } else {
      // open a new tab
      chrome.tabs.create({ url: bookmarkNode.url });
    }
  });

  return item;
}

function generateIcon() {
  const icon = createElement("span", "icon");
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
