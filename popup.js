import { getFaviconUrl } from "./utils/favicon.js";
import { createElement } from "./utils/element.js";

const bookmarksBox = document.querySelector(".bookmarks-box");
const searchResultBox = document.querySelector(".search-result-box");
const searchInput = document.querySelector(".search-input");

let searchResultElements = [];
let curFocusIndex = 0;

// on search input value change
searchInput.oninput = async () => {
  if (!searchInput.value) {
    searchResultBox.classList.add("hidden");
    bookmarksBox.classList.remove("hidden");
    return;
  }

  bookmarksBox.classList.add("hidden");
  searchResultBox.classList.remove("hidden");
  removeAllChildrenEl(searchResultBox);

  const resultBookmarks = await chrome.bookmarks.search(searchInput.value);
  if (resultBookmarks.length > 0) {
    resultBookmarks.forEach((bookmark) => {
      const item = generateItem(bookmark, true);
      searchResultBox.append(item);
    });

    curFocusIndex = 0;
    searchResultElements = searchResultBox.children;
    setFocus(curFocusIndex);
  } else {
    const noData = createElement("div", "no-data", "未找到任何搜索结果");
    searchResultBox.append(noData);
  }
};

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") {
    if (curFocusIndex > 0) {
      setFocus(curFocusIndex - 1);
    }
  }

  if (e.key === "ArrowDown") {
    if (curFocusIndex < searchResultElements.length - 1) {
      setFocus(curFocusIndex + 1);
    }
  }

  if (e.key === "Enter") {
    searchResultElements[curFocusIndex].focus();
  }
});

window.onload = async function () {
  const bookmarkBarTree = await chrome.bookmarks.getSubTree("1"); // 书签栏
  const subTree = bookmarkBarTree[0].children;
  listBookmarks(bookmarksBox, subTree);
};

function listBookmarks(container, bookmarks) {
  if (bookmarks.length === 0) {
    const noDataBox = createElement("div", "no-data", "请添加书签");
    container.append(noDataBox);
    return;
  }

  bookmarks.forEach((node) => {
    const item = generateItem(node);
    container.append(item);
  });
}

function generateItem(bookmarkNode, focusable = false) {
  const item = createElement("div", "item");
  if (focusable) {
    item.setAttribute("tabindex", "-1");
    item.onfocus = () => openNewTab(bookmarkNode.url);
  }

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
      openNewTab(bookmarkNode.url);
    }
  });

  return item;
}

function openNewTab(url) {
  chrome.tabs.create({ url });
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

function removeAllChildrenEl(parent) {
  while (parent.firstElementChild) {
    parent.firstElementChild.remove();
  }
}

function setFocus(index) {
  searchResultElements[curFocusIndex].classList.remove("focused");
  searchResultElements[index].classList.add("focused");
  curFocusIndex = index;
}
