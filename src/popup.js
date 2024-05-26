import { getFaviconUrl } from './utils/favicon.js';
import { createElement } from './utils/element.js';
import { debounce } from './utils/debounce.js';
import { pinyin } from './libs/pinyin-pro.js';
import Fuse from './libs/fuse.js';

const bookmarksBox = document.querySelector('.bookmarks-box');
const searchResultBox = document.querySelector('.search-result-box');
const searchInput = document.querySelector('.search-input');
const bookmarksTitle = document.querySelector('#bookmarks-title');
const searchResultTitle = document.querySelector('#search-result-title');

let searchResultElements = [];
let preFocusedIndex = 0;
let curFocusedIndex = 0;
let fuse;

window.onload = async function () {
  chrome.bookmarks.getTree((tree) => {
    const bookmarkBarTree = tree[0].children[0].children; // 书签栏
    listBookmarks(bookmarksBox, bookmarkBarTree);

    const flattedNodes = flatTreeNodes(tree);
    fuse = new Fuse(flattedNodes, { keys: ['title', 'url', 'pinyin'] });
  });
};

// on search input value change
searchInput.oninput = debounce(async function onSearch() {
  if (!searchInput.value) {
    showBookmarksBox(true);
    showSearchResultsBox(false);
    return;
  }

  showBookmarksBox(false);
  showSearchResultsBox(true);

  // resultBookmarks 类型：{ item: BookmarkNode, refIndex: number }[]
  const resultBookmarks = fuse.search(searchInput.value);

  if (resultBookmarks.length > 0) {
    const items = [];
    for (const [index, bookmark] of resultBookmarks.entries()) {
      const path = await getPath(bookmark.item);
      const item = generateItem({ bookmarkNode: bookmark.item, level: 0, isSearch: true, path, index });
      items.push(item);
    }

    removeAllChildrenEl(searchResultBox);
    searchResultBox.append(...items);

    curFocusedIndex = 0;
    searchResultElements = items;
    setSearchItemFocus();
  } else {
    const noDataBox = createElement('div', 'search-no-data', '未找到任何搜索结果');
    searchResultBox.append(noDataBox);
  }
});

document.addEventListener('keydown', (e) => {
  if (isExistContextmenu()) {
    showContextmenu(false);
  }

  if (e.key === 'ArrowUp') {
    if (curFocusedIndex === 0) {
      curFocusedIndex = searchResultElements.length - 1;
    } else {
      curFocusedIndex--;
    }
    setSearchItemFocus();
  }

  if (e.key === 'ArrowDown') {
    if (curFocusedIndex === searchResultElements.length - 1) {
      curFocusedIndex = 0;
    } else {
      curFocusedIndex++;
    }
    setSearchItemFocus();
  }

  if (e.key === 'Enter') {
    searchResultElements[curFocusedIndex].click();
  }
});

document.addEventListener('click', () => {
  if (isExistContextmenu()) {
    showContextmenu(false);
  }
});

bookmarksBox.addEventListener('scroll', () => {
  if (isExistContextmenu()) {
    showContextmenu(false);
  }
});

searchResultBox.addEventListener('scroll', () => {
  if (isExistContextmenu()) {
    showContextmenu(false);
  }
});

const bookmarkManagementBtn = document.querySelector('.bookmark-management-btn');
const bookmarkManagementUrl = 'chrome://bookmarks/';

bookmarkManagementBtn.addEventListener('click', () => {
  openNewTab(bookmarkManagementUrl);
});

function showSearchResultsBox(show) {
  if (show) {
    searchResultBox.classList.remove('hidden');
    searchResultTitle.classList.remove('hidden');
  } else {
    searchResultBox.classList.add('hidden');
    searchResultTitle.classList.add('hidden');
  }
}

function showBookmarksBox(show) {
  if (show) {
    bookmarksBox.classList.remove('hidden');
    bookmarksTitle.classList.remove('hidden');
  } else {
    bookmarksBox.classList.add('hidden');
    bookmarksTitle.classList.add('hidden');
  }
}

async function getPath(node) {
  if (node.parentId === '0') {
    return node.title;
  }
  const parentNode = (await chrome.bookmarks.get(node.parentId))[0];
  return `${await getPath(parentNode)} / ${node.title}`;
}

function flatTreeNodes(treeNodes) {
  const flattedNodes = [];
  treeNodes.forEach((node) => {
    if (node.children) {
      flattedNodes.push(...flatTreeNodes(node.children));
    } else {
      const pinyinOfTitle = pinyin(node.title, {
        toneType: 'none',
        separator: '',
      }); // 标题生成对应的拼音

      node.pinyin = pinyinOfTitle;
      flattedNodes.push(node);
    }
  });

  return flattedNodes;
}

function listBookmarks(container, bookmarks, level = 0) {
  if (bookmarks.length === 0) {
    const noDataBox = createElement('div', 'no-data');
    // 添加缩进
    for (let i = 0; i < level; i++) {
      const itemTab = generateItemTab();
      noDataBox.append(itemTab);
    }
    noDataBox.append(createElement('div', 'no-data-text', '请添加书签'));
    container.append(noDataBox);
    return;
  }

  bookmarks.forEach((node) => {
    const item = generateItem({ bookmarkNode: node, level });
    container.append(item);
  });
}

let contextmenuTargetItemEl = null;
let focusedBookmark = null;
const contextmenuContainer = document.querySelector('#contextmenu-container');
const contextmenuBookmarksManagement = document.querySelector('#contextmenu-bookmarks-management');
const contextmenuCopyBtn = document.querySelector('#contextmenu-copy-btn');
const contextmenuNewWindow = document.querySelector('#contextmenu-new-window');
const contextmenuPrivateWindow = document.querySelector('#contextmenu-private-window');
const contextDividerLines = document.querySelectorAll('.contextmenu-divider-line');

contextmenuContainer.addEventListener('contextmenu', (event) => event.preventDefault());

function setContextmenuTargetItemFocus(isFocus) {
  if (!contextmenuTargetItemEl) return;

  if (isFocus) {
    contextmenuTargetItemEl.classList.add('focused');
  } else {
    contextmenuTargetItemEl.classList.remove('focused');
  }
}

function isExistContextmenu() {
  return !contextmenuContainer.classList.contains('hidden');
}

function showContextmenu(show) {
  if (show) {
    contextmenuContainer.classList.remove('hidden');
    setContextmenuTargetItemFocus(true);
  } else {
    contextmenuContainer.classList.add('hidden');
    setContextmenuTargetItemFocus(false);
  }
}

function handleContextmenu(event, bookmarkNode) {
  focusedBookmark = bookmarkNode;

  const isFolder = bookmarkNode.children;
  if (isFolder) {
    contextmenuCopyBtn.classList.add('hidden');
    contextmenuNewWindow.classList.add('hidden');
    contextmenuPrivateWindow.classList.add('hidden');
    contextDividerLines.forEach((divider) => divider.classList.add('hidden'));
  } else {
    contextmenuCopyBtn.classList.remove('hidden');
    contextmenuNewWindow.classList.remove('hidden');
    contextmenuPrivateWindow.classList.remove('hidden');
    contextDividerLines.forEach((divider) => divider.classList.remove('hidden'));
  }

  showContextmenu(true);
  setContextmenuPosition(event);
  handleContextmenuEvent();
}

function setContextmenuPosition(event) {
  const pageX = event.pageX;
  const pageY = event.pageY;
  const pageWidth = document.documentElement.clientWidth;
  const pageHeight = document.documentElement.clientHeight;
  const containerWidth = contextmenuContainer.clientWidth;
  const containerHeight = contextmenuContainer.clientHeight;
  let x = pageX;
  let y = pageY;

  if (pageX + containerWidth > pageWidth) {
    x = Math.max(0, pageX - containerWidth);
  }

  if (pageY + containerHeight > pageHeight) {
    y = Math.max(0, pageY - containerHeight);
  }

  contextmenuContainer.style.left = `${x}px`;
  contextmenuContainer.style.top = `${y}px`;
}

function toBookmarksManagement() {
  const isFolder = focusedBookmark.children;
  const query = isFolder ? `id=${focusedBookmark.id}` : `q=${focusedBookmark.title}`;
  openNewTab(`${bookmarkManagementUrl}?${query}`);
}

function copyBookmarkUrl() {
  setClipboard(focusedBookmark.url);
}

function openInNewWindow() {
  openNewWindow(focusedBookmark.url);
}

function openInNewPrivateWindow() {
  openNewWindow(focusedBookmark.url, true);
}

function handleContextmenuEvent() {
  // 先移除事件，避免触发多次
  contextmenuBookmarksManagement.removeEventListener('click', toBookmarksManagement);
  contextmenuCopyBtn.removeEventListener('click', copyBookmarkUrl);
  contextmenuNewWindow.removeEventListener('click', openInNewWindow);
  contextmenuPrivateWindow.removeEventListener('click', openInNewPrivateWindow);

  contextmenuBookmarksManagement.addEventListener('click', toBookmarksManagement);
  contextmenuCopyBtn.addEventListener('click', copyBookmarkUrl);
  contextmenuNewWindow.addEventListener('click', openInNewWindow);
  contextmenuPrivateWindow.addEventListener('click', openInNewPrivateWindow);
}

function generateItem({ bookmarkNode, level, isSearch = false, path = '', index = -1 }) {
  const item = createElement('div', 'item');
  const children = [];
  item.setAttribute('level', level);
  item.setAttribute('title', isSearch ? path : bookmarkNode.title);

  item.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (contextmenuTargetItemEl) {
      setContextmenuTargetItemFocus(false);
    }
    if (isSearch) {
      curFocusedIndex = index;
      setSearchItemFocus();
    }
    contextmenuTargetItemEl = item;
    handleContextmenu(event, bookmarkNode);
  });

  if (isSearch) {
    // 搜索结果回车触发
    item.setAttribute('tabindex', '-1');
  }

  // 添加缩进
  for (let i = 0; i < level; i++) {
    const itemTab = generateItemTab();
    children.push(itemTab);
  }

  const isFolder = bookmarkNode.children;
  if (isFolder) {
    const toggleIcon = generateToggleIcon();
    const title = createElement('div', 'title', bookmarkNode.title);
    const childrenNum = createElement('div', 'children-num', `(${bookmarkNode.children.length})`);
    children.push(toggleIcon, title, childrenNum);

    item.addEventListener('click', () => {
      toggleIcon.classList.toggle('expand');
      if (item.nextElementSibling?.classList.contains('next-level-container')) {
        // 已经渲染过下一级
        item.nextElementSibling.classList.toggle('hidden');
      } else {
        const childrenContainer = createElement('div', 'next-level-container');
        item.after(childrenContainer);
        listBookmarks(childrenContainer, bookmarkNode.children, level + 1);
      }
    });
  } else {
    const favicon = createElement('img', 'favicon');
    const faviconContainer = createElement('div', 'favicon-container');
    favicon.src = getFaviconUrl(bookmarkNode.url);
    faviconContainer.append(favicon);
    children.push(faviconContainer);
    item.addEventListener('click', () => openNewTab(bookmarkNode.url));
    const title = createElement('div', 'title', bookmarkNode.title);
    children.push(title);
  }

  const spacer = createElement('div', 'spacer'); // 用于讲更多按钮置于尾部
  const moreBtn = generateMoreBtn(bookmarkNode);
  item.append(...children, spacer, moreBtn);

  return item;
}

function generateMoreBtn(bookmarkNode) {
  const moreBtn = createElement('div', 'more-btn');
  const icon = createElement('img', 'more-btn-icon');
  icon.src = './images/more_btn.svg';
  moreBtn.append(icon);

  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleContextmenu(e, bookmarkNode);
  });

  return moreBtn;
}

function generateItemTab() {
  const itemTab = createElement('div', 'item-tab');
  const itemTabLine = createElement('div', 'item-tab-line');
  itemTab.append(itemTabLine);

  return itemTab;
}

function openNewTab(url) {
  chrome.tabs.create({ url });
}

/**
 *
 * @param {string} url
 * @param {boolean} incognito 隐身
 */
function openNewWindow(url, incognito = false) {
  chrome.windows.create({ url, incognito });
}

function generateToggleIcon() {
  const toggleIcon = createElement('img', 'toggle-icon');
  toggleIcon.src = './images/toggle-icon.svg';

  return toggleIcon;
}

function removeAllChildrenEl(parent) {
  while (parent.firstElementChild) {
    parent.firstElementChild.remove();
  }
}

function setSearchItemFocus() {
  searchResultElements[preFocusedIndex].classList.remove('focused');
  searchResultElements[curFocusedIndex].classList.add('focused');
  searchResultElements[curFocusedIndex].scrollIntoView(false);
  preFocusedIndex = curFocusedIndex;
}

function setClipboard(text) {
  const type = 'text/plain';
  const blob = new Blob([text], { type });
  const data = [new ClipboardItem({ [type]: blob })];
  navigator.clipboard.write(data);
}
