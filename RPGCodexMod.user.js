// ==UserScript==
// @name		RPGCodex Mod
// @match		https://rpgcodex.net/*
// @version		2.0.1
// @license     MIT
// @author		Bester
// @description	Quality of Life and CSS improvements for RPGCodex.net
// @grant       GM_getValue
// @grant       GM_setValue
// @run-at		document-start
// @updateURL   https://github.com/BesterCode/CodexMod/raw/main/RPGCodexMod.user.js
// @downloadURL https://github.com/BesterCode/CodexMod/raw/main/RPGCodexMod.user.js
// ==/UserScript==

let ignoredUsers = new Map(); // map <id, name>
let ignoredUserNames = new Set();
let openedCards = new Set(); // ids of member cards that we already opened on this page
let optionRemoveRatings = false;
let optionImproveCss = false; // option to improve articles css on the main page
let optionRemoveButtons = false;
let optionWhichButtons = '';
let savedTexts = new Map(); // map <id, text>
let userColors = new Map(); // map <id, color>

init();

// fires at document-start
async function init() {
  // will fire initContentLoaded once the content has been loaded
  document.addEventListener("DOMContentLoaded", initContentLoaded);

  // load persistent data from greasemonkey database
  loadPersistentData();

  // wait for document.head to become part of the document
  await new Promise(waitForHead);

  if (window.location.pathname.startsWith('/forums')) {
    // forum mods that modify CSS go here
    applyRetroModCss();

    applyIgnoreModCss();
    //applyAvatarModCss();
    //if (optionRemoveRatings) applyRatingsModCss();
    //applyMemcardModCss();
    //addMyTxtCss();
    //addColorPickerCss();
  }
  else {
    // main site mods that modify CSS go here
    //if (optionImproveCss) applyImproveModCss();
  }
}

// fires when the DOM content is loaded
function initContentLoaded() {
  if (window.location.pathname.startsWith('/forums')) {
    applyRetroDom();
    // forum mods that modify DOM content go here
    //applyIgnoreModDom();
    //if (!optionRemoveRatings && optionRemoveButtons && optionWhichButtons.length > 0) applyRemoveButtonsModDom();
    //detectOpenMemberCard();
    //detectOpenAlertsPopup();
    //if (userColors.size > 0) applyUserColorsModDom();
  }
  else {
    // main site mods that modify DOM content go here
    //applyArticleModDom();
  }
  applyOptionsModDom();
}

// @run-at document-start fires when there's just <html> tags, but no head yet, so we wait for it before injecting css
function waitForHead(resolve) {
  if (document.head) {
    resolve();
  }
  else {
    setTimeout(waitForHead.bind(this, resolve), 16);
  }
}

function savePersistentData() {
  let persistentData = {
    ignoredUserIds: Array.from(ignoredUsers.keys()),
    ignoredUserNames: Array.from(ignoredUsers.values()),
    savedTxtIds: Array.from(savedTexts.keys()),
    savedTxtTexts: Array.from(savedTexts.values()),
    userColorIds: Array.from(userColors.keys()),
    userColorValues: Array.from(userColors.values()),
    optionRemoveRatings: optionRemoveRatings,
    optionImproveCss: optionImproveCss,
    optionRemoveButtons: optionRemoveButtons,
    optionWhichButtons: optionWhichButtons,
  };
  try {
  	GM_setValue('codex_data', JSON.stringify(persistentData));
  } catch (e) {
    console.log('Error saving data: ' + e);
  }
  //console.log(persistentData);
}

function loadPersistentData() {
  let persistentData = {};
  try {
    persistentData = JSON.parse(GM_getValue('codex_data', '{}') || '{}');
  } catch (e) {
    console.log('Error loading data: ' + e);
    return;
  }
  ignoredUsers.clear();
  // if we're launching for the first time, these vars will be undefined
  if (persistentData.ignoredUserIds && persistentData.ignoredUserNames) {
    for (let i = 0; i < persistentData.ignoredUserIds.length; i++) {
      ignoredUsers.set(persistentData.ignoredUserIds[i], persistentData.ignoredUserNames[i]);
    }
    reloadTempSet();
  }
  savedTexts.clear();
  if (persistentData.savedTxtIds && persistentData.savedTxtTexts) {
    for (let i = 0; i < persistentData.savedTxtIds.length; i++) {
      savedTexts.set(persistentData.savedTxtIds[i], persistentData.savedTxtTexts[i]);
    }
  }
  userColors.clear();
  if (persistentData.userColorIds && persistentData.userColorValues) {
    for (let i = 0; i < persistentData.userColorIds.length; i++) {
      userColors.set(persistentData.userColorIds[i], persistentData.userColorValues[i]);
    }
  }
  if (typeof persistentData.optionRemoveRatings !== 'undefined') {
    optionRemoveRatings = persistentData.optionRemoveRatings;
  }
  if (typeof persistentData.optionImproveCss !== 'undefined') {
    optionImproveCss = persistentData.optionImproveCss;
  }
  if (typeof persistentData.optionRemoveButtons !== 'undefined') {
    optionRemoveButtons = persistentData.optionRemoveButtons;
  }
  if (typeof persistentData.optionWhichButtons !== 'undefined') {
    optionWhichButtons = persistentData.optionWhichButtons;
  }
}

// reconstructs the temporary set of ignored names - called from loadPersistentData(), toggleIgnore() and unignoreUser()
function reloadTempSet() {
  ignoredUserNames.clear();
  for (let [ignoredId, ignoredName] of ignoredUsers) {
    ignoredUserNames.add(ignoredName);
  }
}

function applyRetroModCss() {
    let retroStyle = document.createElement('style');
    retroStyle.type = 'text/css';
    retroStyle.innerHTML = `
    body {
      font-family: Tahoma, Verdana, Arial, Helvetica, sans-serif;
    }
    .message-body {
      font-size: 13px !important;
    }
    .p-body-inner {
      max-width: 100%;
      padding-left: 40px;
      padding-right: 40px;
    }
    div.p-body {
      background: url(data:image/jpeg;base64,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) repeat-y;
      background-color: #3F3F3F;
    }
    header.p-header {
      height: 90px;
      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEUAAABGCAIAAAAVe87QAAAAB3RJTUUH2gMFBwM27tfP1AAAAAlwSFlzAAALEgAACxIB0t1+/AAAAARnQU1BAACxjwv8YQUAAAeRSURBVHja1VsLVuMwDJQhwMG4/4Wg1KtGyXQysp2EBZb14/U5rS3r/3Mor6+vDw8Pj4+PpRQzq7XaPJ6envwbf7xer/7oa+IxPmPw3CHwdkx8uy97e3t7fn72yeVyccgBs8wjFge0AGit8fHxwet5exx9nccEhIBHzGO/z30Se+LRJ5UGtggQ4BH0xGGY+GACGL9AMY8enc6g+GmhRzaAVdYZTewD1wxK9g7AfnoIW6eHeUCOMfHPEEgoRuibD948OIAXBJzHefAEAmH5DCBn6cXjNE2Bv+uRTxZ6fDCssh1Gypo5LaoPMxszNZSeSYo5OCgjkM72A+SD3RNjzMSwugvqvJhRFyGzHX7MA1wMmxT5xDeB3HgwiwEqbHIK7c9Qstzj4GDDEbUW9ZMJm5zoxS7wjBUmUxAD6IAIBx2r5VEIFpvhSWyElYpus4M+TgkfDZHG9kkYA6BBIXwXMMaXdTtg5YKZ64Mv9l8Djk9CQ6zjAPGrjFBUtiIOiQb78QNkHfSSH1kTeCXH1iYe7BWZkXAAto2nA5kgCgvHAeQWf97f39llG/nBgRrw4sDG4Qz0O07NouY14/yAOS4aDtd1k4+PUEGhh9MZZoZ1QsTLy8uAtZKhiEjhQsfyYX8IHJDHLPJpQmGPwYcJPSzoI9bcDGJg3C5JrOSZWXf/lgMi8oPsbY1cE0P0jHNXPhwVRO9FgAN9E/nImCLtFd0FULhyRqUZfx3OKX0T8eLoXjwV+xRZ4XHiPJzZFvghgDLBjNyuHTcdYFYY+K5dfyB8Zz980zdbQ5KsQ4QRT41kAumC9S0+drnqujaG4/HtXv+EUxV0x/rGxACxuq27bvmonI11ORmxMyF8oHt/CWEAc8nfslPvmd13YHOW4Ca77+ZnpOL5Z/71B4g5OAZqsp+c/+YhaefNERiZmiVfbK387Z9jPyBpEtRrq2KTBd+N9NmVvEW9ZFM+p4754SHKteQ7kQRI8I5Iyr2yKGYQOspaC0Vx0jzPF1wuF5sbSxHlPPhEfiQx+pRKQ00cGvpvN3/t0c1a3YbAO6chHNc4EB9EBcsivPKJNtRnqfMAx/Hf0MN5hGQ9DB3xO+jkTGdMT9m2b6AYrMZH6h9uochPaBXd6gVoWjOLG/sTSeF2JcPLOGFjenr9KkGJ4UChlvyguRmZaK4BjTxhWXtawaTj9HCSEjRIIdQDYqT8DGSpf9CME58Wpg9GgrZKHRL2GT08ssyN+j6WaqqenGE/soAbRlqfinUO5C6MGe/idFjElVE86+LEmLv2Y63w2nREBzHo5ey4bjhFTObm/X6hpC4rajhOQ7FMfPcYlTCtqH9sjkLuYdHEYHrGfhIqCs5iDot4kGrMSJsloe6VD8dT757jGS/Ii5ulAPbe6x8p6USgTREzL8/mddk1jZ2bHMrr+fOH5NNb8FXywfi/6588uvm1hIL8jZ0pjQbZ0O4aWSC5kuyaSgo+mYxMw3GMx3G2pv7RmPLMd3GMbflk/AbyOcLas3I7Kx/AmbjPxvJBPsKXHLamsbaNsIM80uaYgwW4bMRZHpf8p6iRMhycG/3n0mlBA+AU98O5Ghvg12Qq7lfywNmcs+V6BgnhKQFykVai35vd/1n9Kf17NWYNa0Ezl8tOiIGwzfBG/mZqxpC6NnLxKPyWwwYhSIA3vQ4j94m0kDGc8D6C7EefmwNzJhufPX1jekTfmlRJZGfCcg5R6XpqoSf8QX5FRFARK8wYD+rKpnyaC+r2+iwTltmq9ETbRbDkNPYgPeGgBiTZ1n6QCpftraYQk4HwPC/b3G8b2UbYd5MMYZjR+yt5MLp8CjuJpnZZy0RFOFljp0yMiMi2bsTtRM6W10sGRa7gwSrQtOHMGqDB8EO/wiDP5aOfzgO+b5zOr38hDYNxSD5ZE3ZrlcH4m727o5ukNLPP78Pjq8aJl82+irZv5csOPYPK6XeOLj1Hqs5fOJb7+ow6v/9mrbYtd73y/c+RKJQz5XgdhSFgyEttHMo4NE/cjGbomZ5CNx88kfusnDo105Nm8tLsg4N9fFWTU6SIp42X3KTLIZXJkc6TdfIXllvttEJ7lOfGBssNgppYjgwrvkQVhfev8Q3eU4psBfXCWD58Sq7tuD7N9UsvNUN3eulf11bzX/gk/Kjbyzlm3hExVmrzZ4Kb9IB9ZdvTYXO41du5XmBNy/YDEDgA/5vQ1D3WdSlpsojkaGFEpasn/Opyi3+piAsr/X+MsndfIPUjtud6Llt8E9EB8JxkyaFG/mC5L+H3/YVDuXRh1SppCFrM6Ww/dVsU9zwE6zn0rVcL3/TN6AVQdoV8CW50fS/Vjog3F7ADXLPyjCVWUvPNUjSbMo+zceeJiMgOZEMixrrt9NYDl+Qs3gxz8QfOJl8wv5hUcijzg3zBOo/HSvOYXNe/G2IOPLnKazDKTwmEZ+zr+qVhwQytJ6hrILniUAHej55J8s81P2i+7zLQN6hQWe/ruQ3Qi62ilrXVAxsoHoc+gYP55Ksc9/sf1sXjDCYYUaPT7Z+M6Py9z4zgKjFAPc6K7/kFddh3X+XueK64L9KZv18QO9s/aHL94K+9oNTkwqcx+QOxHR78unS/igAAAABJRU5ErkJggg==);
    }
    div.p-header-inner {
      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAccAAABGCAYAAAC5Z197AAAAB3RJTUUH2gMFBwUAdzf9ywAAAAlwSFlzAAALEwAACxMBAJqcGAAAAARnQU1BAACxjwv8YQUAAAOiSURBVHja7d1RdtsgEAXQdiXZ/7KykjbtV5LjyMAMA1j3/kZ4AMk2r1Lxr18AAAAAAAAAAAAAAAAAAADAFn4/O+DPh3CRDy3HVdbKqh+pt0L1GEfPaU/NU8Y02p+reiPtTrtmAQDYQEly/F+oYbVaWSuz9ikr8RVjrKgpOfa1O+V6BQBgI6E0l73aray1ot0KK8aYfe6z+pp13iRHAABuR3IsbLeC5NiWHKvmJup77dZ+7nZdAgBwGMmxsN0KkuM+7TL01JYcAQBIIzkOtDvJijFKjjUicwYAAF0kx4F2J5Ec92mXTXIEAKDMVvudVu+tuksCmElyrG3XKmPuJUcAAMpsleaqV+SSo+SY3a6V5AgAwFHSnlbNWMVWp5zR3Uai46wkOe7TLkPW/rAAANAlPc1FfkNOcswnOe7TLsPVfql3uIcOAMAiL7FDzqgTk8MJY5Qc5+n5pQ2/ygEAQBrJsWhsq0iObU9U7/z/Y0fv40fu/wMAwBeSY9HYVpEca5PjqJHxSY4AAJS5dXJsrX3lpFV4JPGMjrOiZvW5kxwBALgdybGx/sp+nTzGilQnOea2AwAAAAAAAAAAgFRNT629v79/eert7e0t5Wm3z6+b9Zp3NescvZLvc/TZrvPlvL6eE6/DFWO9atvzOgBAkq5v3OxVrOSYR8Loc8p8ndJPxtzp/PaOVXIEgM0MfePOWAH89BrP2l7Vjv7bfm/tyDh/ep2Mfva8Vq/R8zPz3Iy0j1zDs1au0fMaee9k9Pfq/fGodsa1FKnZ27ZizlratLaPjnWn91xvbQAgwfR7hitWdVcrlJbVy+iKMWsVOlK/+t5FZFU9a7U+OsdXx0evpajRGisSUSQ5rkp/j/7+KLHskBxnfq7N/DwdOfbR8T+RHAGgSPgbd9ZqMdL29OQ44lWSY1WfJMf8Pp+eHGfMSXTOWo+VHAGA6dLuOf5TcT+g92/PZD7teqfkODpHGXOR8VTwaHKM1BwhOdbfc6wUSV5XTvg8lRwB4DDT/5/jDsmx6r7WHZNj7xxF52LGE8FXx6+eV8lRchw59ln7FZ+nkiMAHG763qqSY9tYM/s1q0bGHEXnSXKUHDPHeqfk+Og1vmt5oldyBICbKtl95bS9VUf7u3qfxsiYM+u01Jv9O28je3eOtq1YuUafCq7s94z9dp/1d8Z7dpaZe+bO3FFrxjV41V5yBIDN+MYFplp935YzSY4AsBnfuMAUEiMAAAAAAAAAd/UXnfTgdg88O+8AAAAASUVORK5CYII=) no-repeat;
      height: 90px;
      margin-left: 145px;
      margin-top: 10px;
    }
    div.p-header-logo.p-header-logo--image {
      top: 0px !important;
      left: 0px !important;
    }
    div.p-nav-inner,.p-sectionLinks-inner.hScroller {
      max-width: 100%;
      margin-left: 145px;
    }
    div.p-navSticky.p-navSticky--primary {
      border: 3px solid;
      border-left: 0;
      border-right: 0;
      border-bottom: 0;
      border-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAYAAADgkQYQAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADNJREFUeNpiVFXT+c9AALAoqRoyEFR07/Z5gooY//8naBsDEwMRgChFLGrqunT0HUCAAQCy1wwHaAojDgAAAABJRU5ErkJggg==) 3 round;
    }
    span.node-icon {
      background-image: url(data:image/gif;base64,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);
      background-repeat: no-repeat;
      position: relative;
      left: 10px;
      top: 14px;
      width: 29px;
    }
    .node--read>.node-body>.node-icon {
      background-image: url(data:image/gif;base64,R0lGODlhFQAjAID/AMDAwLzEzSH5BAEAAAAALAAAAAAVACMAQAJDhI+py+0Po5y02ouz3rz7rwViIgZOSY4NirAMCqvvGJutWgOuweY+TguacjphcWg8Kn825hKIjD6bRuf02qtqqVJnAQA7ACH5BAEAABMALAAAAAAVACMAAAWq4CSOZGmeaKqmSFu2yCqjSl3WyqyTR1/2h53QQJwQDcaiUEdoTpqEp5MEXZoE2AlWoM2SttbSYzwZP8pkM/ocHhUSick7XqjL7fBCezToT/oDf34DDAwTDH57ExKMi42MEo6RkIoTDpeWmJcOmZyblRGhE6ERo6KkpqWKDawTrA2ura+xsIoQtxO3ELm4ury7igHCE8IBxAELx8YLw4oAzxPPyc8A0dDUiiEAOw==);
    }
    span.node-icon i {
      display: none !important;
    }
    .subNodeLink.subNodeLink--category:before {
      content: none !important;
    }
    a.subNodeLink.subNodeLink--forum i.fa-comments {
      width: 0px;
    }
    a.subNodeLink.subNodeLink--forum i.fa-comments:before {
      display: none;
    }
    .p-header-logo--image {
      visibility: visible !important;
      display: block !important;
    }
    .block--category>.block-container>.block-body>.node>.node-body>.node-extra {
      max-width: 350px;
    }
    div.node-main {
      min-width: 300px;
    }
    .has-js:not(.has-touchevents) .node-description.node-description--tooltip {
      display: block !important;
      color: white;
    }
    ul.p-breadcrumbs {
      z-index: 1002;
    }
    .message-cell.message-cell--user {
      border-right: 1px solid #3F3F3F !important;
    }
    .message-attribution {
      border-bottom: 1px solid #353F55 !important;
    }
    header.message-attribution.message-attribution--split,.actionBar-set.actionBar-set--external,.message-userExtras,.message-userTitle{
      font-size: 11px;
      color: white;
    }
    .message-userTitle {
      text-align: left;
    }
    h4.message-name {
      font-size: 13px;
      text-align: left;
    }
    dl.pairs dt{
      color: white;
    }
    div.message-cell.message-cell--main {
      padding: 5px;
    }
    div.message-cell.message-cell--user {
      padding: 6px;
    }
    div.message-avatar {      
      text-align: left;
    }
    div.message-cell.message-cell--user {
      flex: 0 0 150px !important;
    }
    div.block-container.lbContainer {
      border: 2px solid #3F3F3F;
    }
    div.message-userExtras {
      line-height: 17px;
    }
    article.message-body {
      margin-top: 6.5px;
    }
    .bbCodeBlock-title {
      font-size: 11px;
      font-weight: normal !important;
    }
    blockquote.bbCodeBlock {
      border: 1px solid #3F3F3F;
      border-left: 1px solid #3F3F3F;
      background-color: #353F55 !important;
    }
    article.message.message--post:nth-child(even) {
      background-color: #596170 !important;
    }
    article.message.message--post:nth-child(odd) {
      background-color: #48505F !important;
    }
    div.fr-wrapper{
      background-color: #44484F !important;
    }
    div.structItem-title a {
      color: #B3B3B3;
      font-size: 12px;
    }
    div.structItem-minor a {
      color: white;
      font-size: 11px;
    }
    .structItem--thread>.structItem-cell>.structItem-minor>.structItem-pageJump a {
      color: white !important;
      font-size: 9px;
      padding: 0 3px;
      border-radius: 3px;
      background-color: transparent;
      border: 1px solid #fff;
      opacity: 1 !important;
    }
    .structItem--thread>.structItem-cell>.structItem-minor>.structItem-pageJump a:hover {
      color: rgb(146, 159, 182) !important;
      border: 1px solid rgb(146, 159, 182);
    }
    div.structItem-cell {
      font-size: 12px;
    }
    .structItem-minor {
      color: white;
    }
    div.structItem {
      border-bottom: 1px solid #3F3F3F;
      border-top: 0;
    }
    .structItem-cell {
      padding-top: 6px;
      padding-bottom: 6px;
    }
    div.p-description {
      color: white;
      font-size: 11px;
    }
    h2.block-header {
      font-size: 18px;
      padding: 8px 10px;
    }
    .node-main {
      padding: 8px 12px;
    }
    .node-title {
      font-size: 13px;
    }
    .node-subNodesFlat {
      font-size: 12px;
    }
    .node-description {
      font-size: 11px;
    }
    dl.pairs.pairs--rows dd {
      font-size: 12px;
    }
    article.message.message--post {
      margin-top: 0px !important;
    }
    section.message-user {
      display: flex;
      flex-flow: column;
    }
    div.message-avatar {
      order: 2;
      margin-top: 8px;
    }
    div.message-userDetails {
      order: 1;
    }
    div.message-userExtras {
      order: 3;
    }
    span.message-avatar-online {
      display: none;
    }
    `;
    document.head.appendChild(retroStyle);
}

function applyRetroDom() {
    let divs = document.getElementsByClassName('p-header-logo p-header-logo--image');
    if (divs.length == 0) return;
    let codexTroll = divs[0].getElementsByTagName("img")[0];
    console.log(codexTroll);
    codexTroll.removeAttribute("width");
    codexTroll.removeAttribute("height");
}

function applyOptionsModDom() {
  let codexOptionsStyle = document.createElement('style');
  codexOptionsStyle.type = 'text/css';
  codexOptionsStyle.innerHTML = `
  .codex_positioner {
    position: absolute;
    width: 0px;
    height: 0px;
    right: 0px;
  }
  .codex_small_menu {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: 0px;
    text-align: center;
    right: 0px;
    padding: 0px 4px 5px 4px !important;
    font-size: 12px;
  }
  .codex_large_menu {
    font-size: 13px;
    position: absolute;
    width: 300px;
    max-height: 143px;
    bottom: 0px;
    text-align: center;
    right: 20px;
    z-index: 100;
  }
  .codex_larger_menu {
    max-height: 273px;
  }
  .codex_options_style {
    background-color: #3c4042;
    border-radius: 5px 5px 0 0;
    border: solid 1px;
    border-bottom: 0;
    border-color: #7693a6;
    padding: 7px;
  }
  .mod_toggler {
    cursor: pointer;
  }
  .codex_options_separator {
    width: 100%;
    height: 1px;
    background-color: #7693a6;
    margin: 2px 0 7px 0;
  }
  .inputspan {
    margin: 0 5px 0 5px;
  }
  .div_remove_buttons {
    text-align: left;
    margin-top: 5px;
  }
  .save_btn {
    height: 24px;
    width: 100px;
    margin-top: 5px;
    border-radius: 3px;
    border: 3px solid transparent;
    color: #fff;
    cursor: pointer;
    background-color: #272931;
    font-family: Tahoma, Verdana, Arial, Helvetica, sans-serif;
  }
  .save_btn:hover {
    background-color: #1a9ed2;
  }
  .save_btn:active {
    background-color: #1682b7;
  }
  input[type="checkbox"] {
    cursor: pointer;
  }
  label {
    cursor: pointer;
  }
  div#ignored_members_container {
    text-align: left;
    margin-top: 5px;
    max-height: 100px;
  }
  .ignoredFlex {
    width: 100%;
    max-height: 85px;
    overflow-x: auto;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: flex-start;
    margin-top: 3px;
  }
  .ignored_block {
    background-color: #171615;
    margin-right: 5px;
    margin-bottom: 3px;
    padding: 0px 3px 0px 0px;
  }
  .btn_unignore {
    font-family: Consolas;
    margin: 1px 3px 1px 3px;
    padding: 2px 3px 2px 3px;
    font-size: 12px;
    background-color: #373737;
    border: none;
    color: #fff;
    line-height: 135%;
    width: 15px;
  }
  .btn_unignore:hover{
    background-color: #ff3c41;
  }
  .btn_unignore:active{
    background-color: #000;
  }
  `;
  document.head.appendChild(codexOptionsStyle);

  let newDiv = `
  <div class="codex_positioner">
    <div class="codex_small_menu codex_options_style mod_toggler" onclick="toggleModMenu(false);">M</div>
    <div class="codex_large_menu codex_options_style" style="display: none;">
      <div><span class="mod_toggler" onclick="toggleModMenu(true);">Mod Settings</span></div>
      <div class="codex_options_separator"></div>
      <div>
        <span class="inputspan"><label><input type="checkbox" id="chbox_remove_ratings">Remove Ratings</label></span>
        <span class="inputspan"><label><input type="checkbox" id="chbox_improve_css">Improve Article CSS</label></span>
      </div>
      <div id="ignored_members_container">
        Ignored members:
        <div class="ignoredFlex">
        </div>
      </div>
      <div class="div_remove_buttons">
        <label><input type="checkbox" id="chbox_remove_buttons">Remove Buttons:</label><br>
        <textarea id="text_which_buttons" spellcheck="false" rows="2" style="width: 99%; resize: none; overflow-x: hidden; height: 50px; outline: 0; border: 0;
        border-radius: 3px; padding: 2px 0 0 2px; background: #f0f0f0; color: #2c303a; margin-top: 3px;"
        placeholder="Type in button names separated by a comma..."></textarea>
      </div>
      <div>
        <button id="btn_save_which_buttons" class="save_btn">Save buttons</button>
      </div>
    </div>
  </div>
  `;
  document.body.insertAdjacentHTML('beforeend', newDiv);

  let inlineScript = document.createElement('script');
  inlineScript.innerHTML = `
  function toggleModMenu(val) {
    if (!val) {
      document.body.querySelector('div.codex_small_menu').style="display: none;";
      document.body.querySelector('div.codex_large_menu').style="display: block;";
    }
    else {
      document.body.querySelector('div.codex_small_menu').style="display: block;";
      document.body.querySelector('div.codex_large_menu').style="display: none;";
    }
  }
  `;
  document.head.appendChild(inlineScript);

  let removeRatingsCheckbox = document.getElementById('chbox_remove_ratings');
  removeRatingsCheckbox.checked = optionRemoveRatings;
  removeRatingsCheckbox.onchange = function(event){
    optionRemoveRatings = event.target.checked;
    savePersistentData();
  };

  let improveCssCheckbox = document.getElementById('chbox_improve_css');
  improveCssCheckbox.checked = optionImproveCss;
  improveCssCheckbox.onchange = function(event){
    optionImproveCss = event.target.checked;
    savePersistentData();
  };

  let removeButtonsCheckbox = document.getElementById('chbox_remove_buttons');
  removeButtonsCheckbox.checked = optionRemoveButtons;
  removeButtonsCheckbox.onchange = function(event){
    optionRemoveButtons = event.target.checked;
    savePersistentData();
  };

  let textWhichButtons = document.getElementById('text_which_buttons');
  textWhichButtons.value = optionWhichButtons;
  let buttonSaveWhichButtons = document.getElementById('btn_save_which_buttons');
  buttonSaveWhichButtons.onclick = function() {
    optionWhichButtons = document.getElementById('text_which_buttons').value;
    savePersistentData();
  };

  repopulateIgnoredUsers();
}

// repopulated mod options block with ignored users
// called when: ignore/unignore happens (from the memcard or mod options) and from applyOptionsModDom() at the start
function repopulateIgnoredUsers() {
  let ignoredUsersDiv = document.getElementById('ignored_members_container');
  if (ignoredUsers.size === 0) {
    ignoredUsersDiv.style = "display: none;";
    document.body.querySelector('div.codex_large_menu').classList.remove('codex_larger_menu');

  } else {
    ignoredUsersDiv.style = "display: block;";
    document.body.querySelector('div.codex_large_menu').classList.add('codex_larger_menu');
    let ignoredUsersContainer = ignoredUsersDiv.querySelector('div');
    ignoredUsersContainer.innerHTML = "";
    for (let [ignoredId, ignoredName] of ignoredUsers) {
      let newDiv = document.createElement("div");
      newDiv.classList.add('ignored_block');
      let btnNode = document.createElement("button");
      btnNode.classList.add('btn_unignore');
      btnNode.onclick = function() {unignoreUser(ignoredId)};
      btnNode.innerHTML = "X";
      newDiv.appendChild(btnNode);
      let textNode = document.createTextNode(ignoredName);
      newDiv.appendChild(textNode);
      ignoredUsersContainer.appendChild(newDiv);
    }
  }
}

// will detect user opening his alert popup and will go through each alert in order to force-enable alerts by ignored members
// so we don't lose subscriptions to threads
// we also apply colored nickname mod to alerts
function detectOpenAlertsPopup() {
  let alertsMenuNode = document.querySelector('div#AlertsMenu');
  let alertsContainerNode = alertsMenuNode.querySelector('div.listPlaceholder');
  // observe alertsContainerNode for content being added to it
  observeDOM(alertsContainerNode, function(m){
    let addedNodes = [];
    m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))
    addedNodes.forEach(addedNode => {
      // for some reason, we catch the date of the alert, so we have to go back up the hierarchy a few times
      // it's hacky, but oh well...
      if (addedNode.nodeName === '#text') {
        if (addedNode.parentNode && addedNode.parentNode.parentNode && addedNode.parentNode.parentNode.parentNode) {
          forceDisplayAlertInPopup(addedNode.parentNode.parentNode.parentNode);
        }
      }
    });
    if (addedNodes.length > 0) {
      applyUserColorsInAlerts(alertsContainerNode);
    }
  });
}

// will force-display an alert from the popup if all conditions are met:
// 1. it hasn't been force-displayed yet
// 2. it's coming from an ignored user
// 3. the message of the alert starts with "replied to"
function forceDisplayAlertInPopup(domNode) {
  if (domNode.style.startsWith === 'display:block') return;
  if (!isUserIgnoredName(domNode.attributes['data-author'].nodeValue)) return;

  let h3Node = domNode.querySelector('h3');
  if (!h3Node) return;
  let aNode = h3Node.querySelector('a');
  if (!aNode) return;
  let textNode = aNode.nextSibling;
  if (!textNode || !textNode.textContent.startsWith(' replied to the thread')) return; // or we could also watch for ' started a thread' in case we still want their threads

  // force display it, then set its avatar to generic and change its name to Ignored Member
  domNode.setAttribute('style', 'display:block !important');
  // get the avatar node
  let avatarNode = domNode.firstElementChild;
  // remove onclick function of displaying the member's card
  avatarNode.removeAttribute("href");
  // change avatar to generic
  avatarNode.firstChild.src = 'styles/default/xenforo/avatars/avatar_male_s.png';
  // change name to Ignored Member and remove href
  let foundNameNode = domNode.querySelector('a.username.subject');
  foundNameNode.innerHTML = "Ignored Member";
  foundNameNode.removeAttribute("href");
}

// will detect a member card being opened and will add "Ignore by Mod" button
function detectOpenMemberCard() {
  let body = document.querySelector('body');
  // observe a specific DOM element (body) for added nodes
  observeDOM(body, function(m){
    let addedNodes = [];
    m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))

    addedNodes.forEach(addedNode => {
      if (addedNode.tagName === 'DIV' && addedNode.className === "xenOverlay memberCard") {
        addCustomInfoToCard(addedNode);
      }
    });
  });
}

// add custom fields, but only if we're opening this user's card for the first time
function addCustomInfoToCard(cardDomElement) {
  // find out the name and the id on the card
  let aNode = cardDomElement.querySelector('a.username.NoOverlay');
  let userName = aNode.innerHTML;
  let myString = aNode.pathname.replace('/forums/members/',''); // now href is something like 'keighnmcdeath.22781/'
  let myRegexp = /.*\.(\d+)\//; // (.*) (dot) (digits) (ends with slash)
  let match = myRegexp.exec(myString);
  let userId = match[1];

  // if it hasn't been opened yet, populate it with custom fields
  if (!openedCards.has(userId)) {
    openedCards.add(userId);
  	addNewLineToUserStats(cardDomElement);
  	addIgnoreButtonToCard(cardDomElement, userName, userId);
    addMyTxtToCard(cardDomElement, userId);
    addColorPickerToCard(cardDomElement, userId);
  }
}

function addIgnoreButtonToCard(cardDomElement, userName, userId) {
  let userLinksNode = cardDomElement.querySelector('div.userLinks');
  let newText = document.createElement("span");
  newText.textContent = isUserIgnoredId(userId) ? "Unignore by Mod" : "Ignore by Mod";
  newText.classList.add("url_style");
  newText.id = "ignore"+userId;
  newText.onclick = function(){toggleIgnore(newText, userName, userId)};
  userLinksNode.appendChild(newText);
}

// adds a new line to user stats after "brofists received", otherwise the line is sometimes ugly
function addNewLineToUserStats(cardDomElement) {
  let statsNode = cardDomElement.querySelector('dl.userStats');
  let newNode = document.createElement("br");
  statsNode.insertBefore(newNode, statsNode.children[6]);
}

// adds css for the custom textarea field on the member's card
function addMyTxtCss() {
  let myTxtCss = document.createElement('style');
  myTxtCss.type = 'text/css';
  myTxtCss.innerHTML = `
  .my_txt {
    margin-left: 205px;
    margin-top: 10px;
    height: 70px;
  }
  textarea.textarea_my_txt {
    width: 98%;
    height: 60px;
    resize: none;
    overflow-x: hidden;
    outline: 0;
    border: 0;
    border-radius: 3px;
    padding: 2px 4px 2px 4px;
    background: #f0f0f0;
    color: #2c303a;
  }
  .btn_blue {
    background-color: #1a9ed2 !important;
    margin-top: 0px !important;
  }
  .btn_blue:hover {
    background-color: #1580aa !important;
  }
  .btn_blue:active {
    background-color: #0c506a !important;
  }
  `;
  document.head.appendChild(myTxtCss);
}

// adds a custom textarea to a card, fills it with saved notes
// also adds a button to save the note
function addMyTxtToCard(cardDomElement, userId) {
  let newDiv = `
  <div class="my_txt">
    <textarea id="my_txt_${userId}" placeholder="Update my .txt on this user..." class="textarea_my_txt"></textarea>
  </div>
  <div style="text-align: right; margin-left: 205px;">
    <button id="save_txt_${userId}" class="btn_blue save_btn">Save Info</button>
  </div>
  `;
  cardDomElement.insertAdjacentHTML('beforeend', newDiv);

  let textNode = cardDomElement.querySelector(`textarea#my_txt_${userId}`);
  let buttonNode = cardDomElement.querySelector(`button#save_txt_${userId}`);
  if (savedTexts.has(userId)) {
    textNode.value = savedTexts.get(userId);
  }
  buttonNode.onclick = function() { saveMyTxt(textNode, userId) };
}

function addColorPickerCss() {
  let colorPickerCss = document.createElement('style');
  colorPickerCss.type = 'text/css';
  colorPickerCss.innerHTML = `
  .color_picker_span {
    border-radius: 50%;
    width: 15px;
    height: 15px;
    background-color: #fff;
    display:inline-block;
  }
  input[type=color] {
    display: none;
  }
  `;
  document.head.appendChild(colorPickerCss);
}

function addColorPickerToCard(cardDomElement, userId) {
  let h3UserName = cardDomElement.querySelector('h3.username');
  // the span will act as the input of type color, while the real input is hidden (because it can't be stylized properly)
  let newSpan = `
  <span class="color_picker_span" id="color_picker_span_${userId}"></span><input type="color" id="color_input_${userId}" value="#e66465">
  `;
  h3UserName.insertAdjacentHTML('beforeend', newSpan);

  let colorInputNode = h3UserName.querySelector(`input#color_input_${userId}`);
  let colorPickerSpan = h3UserName.querySelector(`span#color_picker_span_${userId}`);
  // if the user already has a custom color, colorize the span
  if (userColors.has(userId)) {
    colorPickerSpan.style = `background-color: ${userColors.get(userId)};`;
    let uncoloredNickname = h3UserName.querySelector('a.username');
    uncoloredNickname.style = `color: ${userColors.get(userId)};`;
  }
  // make the round looking span act like the hidden input color
  colorPickerSpan.onclick = function() { colorInputNode.click() };
  // this.value is the new color
  colorInputNode.onchange = function() {
    if (this.value === '#ffffff' || this.value === '#fff') {
      userColors.delete(userId);
    } else {
      userColors.set(userId, this.value);
    }
    colorPickerSpan.style = `background-color: ${this.value};`;
    changedNicknameColor(this.value, userId);
    savePersistentData();
  };
}

// changes nickname colors on the entire website, except for things that load after dom, like alerts and the shoutbox
// (alerts are taken care of elsewhere through changeNicknameColorsInDom)
function changedNicknameColor(newColor, userId) {
  let allNicknames = document.body.querySelectorAll('a.username');
  for (let nicknameNode of allNicknames) {
    if (nicknameNode.href.endsWith('.'+userId+'/')) {
      nicknameNode.style = `color: ${newColor};`;
    }
  }
}

// called when the number of alerts changes
// it will not colorize ignored by mod members nicknames, because they have their href stripped
function applyUserColorsInAlerts(alertDomElement) {
  if (userColors.size === 0) return;
  let allNicknames = alertDomElement.querySelectorAll('a.username');
  for (let nicknameNode of allNicknames) {
    let myRegexp = /.*\.(\d+)\//; // (.*) (dot) (digits) (ends with slash)
    let match = myRegexp.exec(nicknameNode.href);
    let userId = match[1];
    if (userColors.has(userId)) {
        nicknameNode.style = `color: ${userColors.get(userId)};`;
    }
  }
}

function applyUserColorsModDom() {
  for (let [userId, colorValue] of userColors) {
    changedNicknameColor(colorValue, userId);
  }
}

function saveMyTxt(textNode, userId) {
  if (textNode.value.length === 0) {
    savedTexts.delete(userId);
  } else {
    savedTexts.set(userId, textNode.value);
  }
  savePersistentData();
}

// called from the member's card "Ignore by Mod" or "Unignore by mod" button
function toggleIgnore(node, userName, userId) {
  if (ignoredUsers.has(userId)) {
    ignoredUsers.delete(userId);
    node.innerHTML = node.innerHTML.replace('Unignore', 'Ignore');
  } else {
    ignoredUsers.set(userId, userName);
    node.innerHTML = node.innerHTML.replace('Ignore', 'Unignore');
  }
  reloadTempSet();
  repopulateIgnoredUsers();
  savePersistentData();
}

// called from mod options list of ignored users
function unignoreUser(userId) {
  ignoredUsers.delete(userId);
  reloadTempSet();
  repopulateIgnoredUsers();
  savePersistentData();

  // if we have previously opened the user's card, it currently has "Unignore by Mod", which we have to change to "Ignore by Mod"
  let memberCard = document.body.querySelector('div.xenOverlay.memberCard');
  if (memberCard) {
    for (let cardNode of memberCard.children) {
      if (cardNode.id === 'memberCard'+userId) {
        let spanNode = cardNode.querySelector('span#ignore'+userId);
        spanNode.innerText = "Ignore by Mod";
      }
    }
  }
}

function isUserIgnoredId(userId) {
  return ignoredUsers.has(userId);
}

function isUserIgnoredName(userName) {
  return ignoredUserNames.has(userName);
}

function applyIgnoreModCss() {
  // hide posts, threads, alerts, profile posts by ignored member (such as when they create a new thread)
  // note that we need to overwrite this behavior for alerts, since they need to be shown with "Ignored member" name - it's done in applyIgnoreModDom
  for (let [ignoredId, ignoredName] of ignoredUsers) {
    let ignoreStyles = document.createElement('style');
    ignoreStyles.type = 'text/css';
    // hide posts
    ignoreStyles.innerHTML = 'article[data-author="'+ignoredName+'"] { display: none !important; }';
    // hide quotes
    ignoreStyles.innerHTML += 'blockquote[data-quote="'+ignoredName+'"] { display: none !important; }';
    // hide shoutbox messages
    ignoreStyles.innerHTML += 'li[data-user-id="'+ignoredId+'"] { display: none !important; }';
    document.head.appendChild(ignoreStyles);
  }
}

function applyImproveModCss() {
  if (!window.location.pathname.startsWith('/content.php') && !window.location.pathname.startsWith('/article.php')) {
      return;
  }
  let style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
  .content-inside {
    background: #596170 !important;
  }
  .content-light {
	width: 870px !important;
	margin-left: auto !important;
	margin-right: auto !important;
	font-family: charter, Georgia, Cambria, "Times New Roman", Times, serif !important;
	font-size: 19px !important;
	letter-spacing: -0.003em !important;
	line-height: 27px !important;
  }
  `;
  document.head.appendChild(style);
}


// alerts on the ALERTS page should get their name changed to "ignored member" and their avatar hidden, but it's important to keep alerts displayed,
// otherwise we'd lose subscriptions to threads by not opening them
function applyIgnoreModDom() {
  if (window.location.pathname === '/forums/account/alerts') {
    // find alerts container, there may be multiple on the page.
    let alertLists = document.getElementsByClassName("alertGroup");
    Array.from(alertLists).forEach(alertLi => {
      let olFound = alertLi.querySelector('ol');
      for (let i = 0; i < olFound.children.length; i++) {
        let alertContainer = olFound.children[i];
        if (isUserIgnoredName(alertContainer.attributes['data-author'].nodeValue)) {
          // check that the message of the alert is about a thread reply
          let h3Node = alertContainer.querySelector('div.alertText').querySelector('h3');
          if (!h3Node) return;
          let aNode = h3Node.querySelector('a');
          if (!aNode) return;
          let textNode = aNode.nextSibling;
          if (!textNode || !textNode.textContent.startsWith(' replied to the thread')) return;// or we could also watch for ' started a thread' in case we still want their threads

          // override "display none" here
          alertContainer.setAttribute('style', 'display:block !important');
          // get the avatar node
          let avatarNode = alertContainer.firstElementChild;
          // remove onclick function of displaying the member's card
          avatarNode.removeAttribute("href");
          // change avatar to generic
          avatarNode.firstChild.src = 'styles/default/xenforo/avatars/avatar_male_s.png';
          // change name to Ignored Member and remove href
          let foundNameNode = alertContainer.querySelector('a.username.subject');
          foundNameNode.innerHTML = "Ignored Member";
          foundNameNode.removeAttribute("href");
        }
      }
    });
    return;
  }

  // find "last post by" ignored member and replace their name with "Ignored member" in THREAD LIST
  let lastPosts = document.querySelectorAll("dl.lastPostInfo");
  for (let lastPost of lastPosts) {
    let urlNameNode = lastPost.querySelector('a.username');
    if (urlNameNode && isUserIgnoredName(urlNameNode.innerHTML)) {
      let parentDt = urlNameNode.parentNode;
      parentDt.removeChild(urlNameNode);
      let newText = document.createElement("span");
      newText.textContent = "Ignored Member";
      parentDt.appendChild(newText);
    }
  }

  // find "last post by" ignored member and replace their name with "Ignored member" in FORUMS LIST
  let nodesLastPost = document.querySelectorAll("div.nodeLastPost");
  for (let nodeLastPost of nodesLastPost) {
    let urlNode = nodeLastPost.querySelector('span.lastThreadMeta').querySelector('span.lastThreadUser').firstChild;
    if (isUserIgnoredName(urlNode.innerText)) {
      urlNode.parentNode.innerHTML = "Ignored Member,";
    }
  }

  // find member in "Staff Online Now" if they're admins
  if (window.location.pathname === '/forums/') {
    let listOfAdmins = document.body.querySelector('div.section.staffOnline.avatarList');
    if (listOfAdmins) {
      listOfAdmins = listOfAdmins.querySelector('div').querySelector('ul');
      for (let i = listOfAdmins.children.length-1; i >= 0; i--)
      {
        let adminNode = listOfAdmins.children[i];
        let adminUrl = adminNode.querySelector('a');
        for (let [ignoredId, ignoredName] of ignoredUsers) {
          if (adminUrl.href.includes('.'+ignoredId)) {
            adminNode.parentNode.removeChild(adminNode);
          }
        }
      }
    }
  }
}

function applyAvatarModCss() {
  if (!window.location.pathname.startsWith('/forums/account/personal-details')) {
      return;
  }
  let style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = `
	.xenOverlay.avatarEditor {
		top: 0px !important;
		left: 0px !important;
		height: 100% !important;
		position: fixed !important;
		width: 100% !important;
		max-width: none !important;
	}
	#AvatarPanes {
	max-height: 68vh !important;
	}
	.avatarGallery .tabs li {
	width: 15% !important;
	}`;
	document.head.appendChild(style);
}

function applyRatingsModCss() {
  let style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.dark_postrating { display: none !important; }';
	document.head.appendChild(style);
}

// make membercard wider
// add url_style for "Ignore by Mod" button
function applyMemcardModCss() {
  let style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
  .xenOverlay.memberCard {
	max-width: 630px !important;
  }
  span.url_style{
	cursor: pointer;
  }
  span.url_style:hover {
    text-decoration: underline;
  }
  `;
  document.head.appendChild(style);
}

// modify the DOM of main page articles
// - remove "visit our sponsors" block
// - @TODO: insert space on the left and right of article text
function applyArticleModDom() {
  // remove the "Visit our sponsors!" block
  let firstArticle = document.querySelector('div.content-inside');
	// the first article with the ad can be either in div.content-light or div.content-dark, whichever comes first
  let contentDiv = firstArticle.querySelector('div.content-light, div.content-dark');
  // find the floating div inside, it's the ad
  let adDiv = null;
  for (let i = 0; i < contentDiv.children.length; i++) {
    let curNode = contentDiv.children[i];
    if (curNode.tagName === 'DIV' && curNode.outerHTML.startsWith('<div style=\"float:')){
      adDiv = curNode;
      break;
    }
  }
  adDiv.parentNode.removeChild(adDiv);
}

// removes buttons that the user specified in the options
function applyRemoveButtonsModDom() {
  const buttonsSet = new Set(optionWhichButtons.replaceAll(',, ',',,').toLowerCase().split(',,'));
  let buttonContainers = document.body.querySelectorAll('ul.dark_postrating_inputlist');
  for (let buttonContainer of buttonContainers) {
    // print all buttons:
    // let str = '';
    // for (let i = 0; i < buttonContainer.children.length; i++) {
    //   let liNode = buttonContainer.children[i];
    //   let imgNode = liNode.firstChild.firstChild;
    //   str += imgNode.alt+',,';
    // }
    // console.log(str);
    removeButtonsFromContainer(buttonsSet, buttonContainer);
  }

  let divsToWatch = document.querySelectorAll('div.dark_postrating.likesSummary.secondaryContent')
  for (let divToWatch of divsToWatch) {
    // if a user undoes a rating, the container will get repopulated with all the buttons by the forum engine
    // so we need to watch for changes in it and remove the buttons again if necessary
    observeDOM(divToWatch, function(m){
      console.clear();
      let addedNodes = [];
      m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))
      addedNodes.forEach(addedNode => {
        if (addedNodes.length > 0 && addedNodes[0].children.length === 3
            && addedNodes[0].children[2].classList.length > 0
            && addedNodes[0].children[2].classList[0] === 'dark_postrating_inputlist') {
          removeButtonsFromContainer(buttonsSet, addedNodes[0].children[2]);
        }
      });
    });
  }
}

function removeButtonsFromContainer(buttonsSet, buttonContainer) {
      for (let i = buttonContainer.children.length-1; i >= 0; i--) {
      let liNode = buttonContainer.children[i];
      let imgNode = liNode.firstChild.firstChild;
      if (imgNode.alt && buttonsSet.has(imgNode.alt.toLowerCase())) {
        liNode.parentNode.removeChild(liNode);
      }
    }
}

/// utility functions below ///

let observeDOM = (function(){
  let MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

  return function( obj, callback ){
    if( !obj || obj.nodeType !== 1 ) return;

    if( MutationObserver ){
      // define a new observer
      let mutationObserver = new MutationObserver(callback)

      // have the observer observe foo for changes in children
      mutationObserver.observe( obj, { childList:true, subtree:true })
      return mutationObserver
    }

    // browser support fallback
    else if( window.addEventListener ){
      obj.addEventListener('DOMNodeInserted', callback, false)
      obj.addEventListener('DOMNodeRemoved', callback, false)
    }
  }
})()
