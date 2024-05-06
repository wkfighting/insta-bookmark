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
let curFocusIndex = 0;
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
    displayBookmarksBox(true);
    displaySearchResultsBox(false);
    return;
  }

  displayBookmarksBox(false);
  displaySearchResultsBox(true);

  // resultBookmarks 类型：{ item: BookmarkNode, refIndex: number }[]
  const resultBookmarks = fuse.search(searchInput.value);

  if (resultBookmarks.length > 0) {
    const items = [];
    for (const bookmark of resultBookmarks) {
      const path = await getPath(bookmark.item);
      const item = generateItem({ bookmarkNode: bookmark.item, level: 0, isSearch: true, path });
      items.push(item);
    }

    removeAllChildrenEl(searchResultBox);
    searchResultBox.append(...items);

    curFocusIndex = 0;
    searchResultElements = items;
    setFocus(curFocusIndex);
  } else {
    const noDataBox = createElement('div', 'search-no-data', '未找到任何搜索结果');
    searchResultBox.append(noDataBox);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    if (curFocusIndex > 0) {
      setFocus(curFocusIndex - 1);
    }
  }

  if (e.key === 'ArrowDown') {
    if (curFocusIndex < searchResultElements.length - 1) {
      setFocus(curFocusIndex + 1);
    }
  }

  if (e.key === 'Enter') {
    searchResultElements[curFocusIndex].focus();
  }
});

const bookmarkManagementBtn = document.querySelector('.bookmark-management-btn');
const bookmarkManagementUrl = 'chrome://bookmarks/';

bookmarkManagementBtn.addEventListener('click', () => {
  openNewTab(bookmarkManagementUrl);
});

function displaySearchResultsBox(show) {
  if (show) {
    searchResultBox.classList.remove('hidden');
    searchResultTitle.classList.remove('hidden');
  } else {
    searchResultBox.classList.add('hidden');
    searchResultTitle.classList.add('hidden');
  }
}

function displayBookmarksBox(show) {
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
      }); // 标题生产对应的拼音

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

const contextmenuContainer = document.querySelector('#contextmenu-container');
const contextmenuBookmarksManagement = document.querySelector('#contextmenu-bookmarks-management');

contextmenuContainer.addEventListener('contextmenu', (event) => event.preventDefault());

function handleContextmenu(event, bookmarkNode) {
  contextmenuContainer.style.left = `${event.pageX}px`;
  contextmenuContainer.style.top = `${event.pageY}px`;
  handleContextmenuEvent(bookmarkNode);
}

function handleContextmenuEvent(bookmarkNode) {
  const isFolder = bookmarkNode.children;
  const query = isFolder ? `id=${bookmarkNode.id}` : `q=${bookmarkNode.title}`;
  contextmenuBookmarksManagement.addEventListener('click', () => openNewTab(`${bookmarkManagementUrl}?${query}`));
}

function generateItem({ bookmarkNode, level, isSearch = false, path = '' }) {
  const item = createElement('div', 'item');
  const children = [];
  item.setAttribute('level', level);
  item.setAttribute('title', isSearch ? path : bookmarkNode.title);

  item.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    handleContextmenu(event, bookmarkNode);
  });

  if (isSearch) {
    // 搜索结果回车触发
    item.setAttribute('tabindex', '-1');
    item.onfocus = () => openNewTab(bookmarkNode.url);
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

    item.addEventListener('click', (e) => {
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

  item.append(...children);

  return item;
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

function setFocus(index) {
  searchResultElements[curFocusIndex].classList.remove('focused');
  searchResultElements[index].classList.add('focused');
  curFocusIndex = index;
}
