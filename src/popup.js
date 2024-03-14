import { getFaviconUrl } from './utils/favicon.js';
import { createElement } from './utils/element.js';
import { debounce } from './utils/debounce.js';
import { pinyin } from './libs/pinyin-pro.js';
import Fuse from './libs/fuse.js';

const bookmarksBox = document.querySelector('.bookmarks-box');
const searchResultBox = document.querySelector('.search-result-box');
const searchInput = document.querySelector('.search-input');

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

// on search input value change
searchInput.oninput = debounce(function onSearch() {
  if (!searchInput.value) {
    searchResultBox.classList.add('hidden');
    bookmarksBox.classList.remove('hidden');
    return;
  }

  bookmarksBox.classList.add('hidden');
  searchResultBox.classList.remove('hidden');
  removeAllChildrenEl(searchResultBox);

  const resultBookmarks = fuse.search(searchInput.value);
  if (resultBookmarks.length > 0) {
    resultBookmarks.forEach((bookmark) => {
      const item = generateItem(bookmark.item, 0, true);
      searchResultBox.append(item);
    });

    curFocusIndex = 0;
    searchResultElements = searchResultBox.children;
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
    const item = generateItem(node, level);
    container.append(item);
  });
}

function generateItem(bookmarkNode, level, focusable = false) {
  const item = createElement('div', 'item');
  const children = [];
  item.setAttribute('level', level);

  // 搜索结果回车触发
  if (focusable) {
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
    children.push(toggleIcon);
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
  }

  const title = createElement('div', 'title', bookmarkNode.title);
  children.push(title);

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
