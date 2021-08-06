// ==UserScript==
// @name		RPGCodex Mod
// @match		https://rpgcodex.net/*
// @version		1.0
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
    applyIgnoreModCss();
    applyAvatarModCss();
    if (optionRemoveRatings) applyRatingsModCss();
    applyMemcardModCss();
    addMyTxtCss();
    addColorPickerCss();
  }
  else {
    // main site mods that modify CSS go here
    if (optionImproveCss) applyImproveModCss();
  }
}

// fires when the DOM content is loaded
function initContentLoaded() {
  if (window.location.pathname.startsWith('/forums')) {
    // forum mods that modify DOM content go here
    applyIgnoreModDom();
    if (!optionRemoveRatings && optionRemoveButtons && optionWhichButtons.length > 0) applyRemoveButtonsModDom();
    detectOpenMemberCard();
    detectOpenAlertsPopup();
    if (userColors.size > 0) applyUserColorsModDom();
  }
  else {
    // main site mods that modify DOM content go here
    applyArticleModDom();
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
    height: 12px;
    bottom: 0px;
    text-align: center;
    right: 0px;
    padding: 0px 4px 5px 4px !important;
  }
  .codex_large_menu {
    position: absolute;
    width: 300px;
    max-height: 143px;
    bottom: 0px;
    text-align: center;
    right: 20px;
    z-index: 100;
  }
  .codex_larger_menu {
    max-height: 248px;
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
    width: 90px;
    margin-top: 5px;
    border-radius: 3px;
    border: 3px solid transparent;
    color: #fff;
    cursor: pointer;
    background-color: #272931;
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
    ignoreStyles.innerHTML = 'li[data-author="'+ignoredName+'"] { display: none !important; }';
    // hide quotes
    ignoreStyles.innerHTML += 'div[data-author="'+ignoredName+'"] { display: none !important; }';
    // hide shoutbox messages
    ignoreStyles.innerHTML += 'li[data-userid="'+ignoredId+'"] { display: none !important; }';
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