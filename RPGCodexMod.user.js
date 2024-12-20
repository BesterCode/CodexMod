// ==UserScript==
// @name		RPGCodex Mod
// @match		https://rpgcodex.net/*
// @version		2.0.7
// @license     MIT
// @author		Bester
// @description	Quality of Life and CSS improvements for RPGCodex.net
// @grant       GM_getValue
// @grant       GM_setValue
// @run-at		document-start
// @updateURL   https://github.com/BesterCode/CodexMod/raw/main/RPGCodexMod.user.js
// @downloadURL https://github.com/BesterCode/CodexMod/raw/main/RPGCodexMod.user.js
// ==/UserScript==

// Reminder to self:
// To dit the script in https://vscode.dev/?connectTo=tampermonkey
// 1. Go to chrome://flags/ and enable Mutation events
// 2. Install this extension: https://chromewebstore.google.com/detail/tampermonkey-editors/lieodnapokbjkkdkhdljlllmgkmdokcm

let ignoredUsers = new Map(); // map <id, name>
let ignoredUserNames = new Set();
let openedCards = new Set(); // ids of member cards that we already opened on this page
let optionRemoveRatings = false;
let optionRetroMod = false;
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

    if (optionRetroMod) applyRetroModCss();
    applyIgnoreModCss();
    if (optionRemoveRatings) applyRatingsModCss();
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
  // forum mods that modify DOM content go here
  if (window.location.pathname.startsWith('/forums')) {
    if (!optionRemoveRatings && optionRemoveButtons && optionWhichButtons.length > 0) {
        applyRemoveButtonsModDom();
    }
    detectOpenMemberCard(); // detects a user's card being open to inject it with "ignore by mod" button, color picker and custom text info
    //detectOpenAlertsPopup();
    if (userColors.size > 0) applyUserColorsModDom();

    // display my notes button
    displayMyNotesButton();
    // display my notes
    if (window.location.pathname.startsWith('/forums/mynotes/')) {
      displayMyNotes();
    }
  }
  else {
    // main site mods that modify DOM content go here

    if (optionImproveCss) applyArticleModDom();
  }
  applyOptionsModDom();
  applySortVotesDom();
}

function applySortVotesDom() {
    // Locate the list of votes
    const ul = document.querySelector('.listPlain');
    if (!ul) return;

    // Convert NodeList to Array and sort it
    const sortedItems = Array.from(ul.children).sort((a, b) => {
        // Extract number from 'a'
        const numA = parseInt(a.querySelector('.u-muted').nextSibling.nodeValue.trim(), 10);

        // Extract number from 'b'
        const numB = parseInt(b.querySelector('.u-muted').nextSibling.nodeValue.trim(), 10);

        // Sort in descending order
        return numB - numA;
    });

    // Append sorted items back to the ul
    sortedItems.forEach(item => ul.appendChild(item));
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
    optionRetroMod: optionRetroMod,
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
  if (typeof persistentData.optionRetroMod !== 'undefined') {
    optionRetroMod = persistentData.optionRetroMod;
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
    .samCodeUnit {
      display: none;
    }
    .message-body {
      font-size: 14px !important;
      letter-spacing: 0.15px;
    }
    .p-body-inner {
      max-width: 100%;
      padding-left: 40px;
      padding-right: 40px;
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
    .message-cell.message-cell--user {
      border-right: 1px solid #3F3F3F !important;
    }
    .message-attribution {
      border-bottom: 1px solid #353F55 !important;
    }
    dl.pairs dt{
      color: white;
    }
    div.message-cell.message-cell--user {
      flex: 0 0 150px !important;
    }
    div.block-container.lbContainer {
      border: 2px solid #3F3F3F;
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
    .u-concealed, .u-concealed a {
      color: white !important;
    }
    .message-body a {
      color: #B3B3B3 !important;
      text-decoration: none;
    }
    .message-body a:hover {
      text-decoration: underline;
    }
    a.bbCodeBlock-sourceJump {
      color: white !important;
    }
    .message-attribution-opposite a {
      color: white;
    }
    a.u-concealed:hover, .u-concealed a:hover {
      color: rgba(255,255,255,0.8) !important;
    }
    div.structItem-title a {
      color: #B3B3B3;
      font-size: 13px !important;
      letter-spacing: 0.15px;
    }
    div.structItem-minor a {
      color: white;
      font-size: 12px;
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
    }
    h2.block-header {
      font-size: 18px;
      padding: 8px 10px;
    }
    .node-icon {
      width: 30px;
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
    .sv-rating-type-icon {
      max-height: 24px !important;
    }
    `;
    document.head.appendChild(retroStyle);
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
    z-index: 2000;
  }
  .codex_larger_menu {
    max-height: 293px;
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
    margin-top: 10px;
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
        <span class="inputspan"><label><input type="checkbox" id="chbox_retromod"> Semi-Retro CSS</label></span><br/>
        <span class="inputspan"><label><input type="checkbox" id="chbox_remove_ratings"> Remove Ratings</label></span>
        <span class="inputspan"><label><input type="checkbox" id="chbox_improve_css"> Improve Article CSS</label></span>
      </div>
      <div id="ignored_members_container">
        Ignored members: ${ignoredUsers.size}
        <div class="ignoredFlex">
        </div>
      </div>
      <div class="div_remove_buttons">
        <label><input type="checkbox" id="chbox_remove_buttons"> Remove ratings from your posts:</label><br>
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

  let retroModCheckbox = document.getElementById('chbox_retromod');
  retroModCheckbox.checked = optionRetroMod;
  retroModCheckbox.onchange = function(event){
    optionRetroMod = event.target.checked;
    savePersistentData();
  };

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
      if (addedNode.tagName === 'DIV' && addedNode.className === "tooltip tooltip--member") {
        // Because cards don't immediately have the fields with the nickname and get populated later (thanks Xenforo),
        // we have to observe this added node (user card) and wait until it becomes visible (display: block)
        const target = addedNode;

        // Callback function to execute when changes are observed
        const callback = function(mutationsList, observer) {          
          // Check all mutations for changes
          for(const mutation of mutationsList) {
            if (mutation.type === 'attributes') {
              const style = window.getComputedStyle(target);
              const display = style.getPropertyValue('display');
              if(display === 'block') {
                // Add custom info to the card when the card becomes visible
                addCustomInfoToCard(addedNode);                      

                // Stop observing once we've seen the display change to block
                observer.disconnect();
                break;
              }
            }
          }
        };

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        // Start observing the target element with the configured parameters
        observer.observe(target, { attributes: true, attributeFilter: ["style"] });
      }
    });
  });
}

// add custom fields, but only if we're opening this user's card for the first time
function addCustomInfoToCard(cardDomElement) {
  let spanNicknameNode = cardDomElement.querySelector('span.memberTooltip-nameWrapper');
  let userNameNode = spanNicknameNode.querySelector('a');
  // admin usernames are wrapped into an additional span
  let adminUserNameNode = userNameNode.querySelector('span');
  // find out the name and the id on the card
  let userName = adminUserNameNode ? adminUserNameNode.innerHTML : userNameNode.innerHTML;
  let myString = userNameNode.pathname.replace('/forums/members/',''); // now href is something like 'keighnmcdeath.22781/'
  let myRegexp = /.*\.(\d+)\//; // (.*) (dot) (digits) (ends with slash)
  let match = myRegexp.exec(myString);
  let userId = match[1];

  console.log("User id: " + userId + " User name: " + userName);

  // if it hasn't been opened yet, populate it with custom fields
  if (!openedCards.has(userId)) {
    openedCards.add(userId);
  	addIgnoreButtonToCard(cardDomElement, userName, userId);
    addMyTxtToCard(cardDomElement, userId);
    addColorPickerToCard(userNameNode, userId);
  }
}

function addIgnoreButtonToCard(cardDomElement, userName, userId) {
  let userButtons = cardDomElement.querySelector('div.buttonGroup');
  let newButton = document.createElement("a");
  
  newButton.classList.add("button--link");
  newButton.classList.add("button");
  newButton.id = "ignore"+userId;

  let newText = document.createElement("span");
  newText.textContent = isUserIgnoredId(userId) ? "Unignore by Mod" : "Ignore by Mod";
  newText.classList.add("button-text");
  newText.onclick = function(){toggleIgnore(newText, userName, userId)};

  let indexToInsert = 1;

  if (userButtons.children.length >= indexToInsert) {
      // Insert the newElement before the child at the given index
      userButtons.insertBefore(newButton, userButtons.children[indexToInsert]);
  } else {
      // If there are fewer children than the target index, just append the newElement at the end
      userButtons.appendChild(newButton);
  }
  newButton.appendChild(newText);
}

// adds css for the custom textarea field on the member's card
function addMyTxtCss() {
  let myTxtCss = document.createElement('style');
  myTxtCss.type = 'text/css';
  myTxtCss.innerHTML = `
  .my_txt {
    margin: 0 0 0 10px;
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
  let contentDom = cardDomElement.querySelector("div.tooltip-content")
  console.log("adding my txt to card");
  let newDiv = `
  <div class="my_txt">
    <textarea id="my_txt_${userId}" placeholder="Update my .txt on this user..." class="textarea_my_txt"></textarea>
  </div>
  <div style="text-align: right; margin: 0 10px 5px 0;">
    <button id="save_txt_${userId}" class="btn_blue save_btn">Save Info</button>
  </div>
  `;
  contentDom.insertAdjacentHTML('beforeend', newDiv);

  let textNode = contentDom.querySelector(`textarea#my_txt_${userId}`);
  let buttonNode = contentDom.querySelector(`button#save_txt_${userId}`);
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

function addColorPickerToCard(userNameNode, userId) {
  // the span will act as the input of type color, while the real input is hidden (because it can't be stylized properly)
  let newSpan = `
  <span class="color_picker_span" id="color_picker_span_${userId}"></span><input type="color" id="color_input_${userId}" value="#e66465">
  `;

  let parentNode = userNameNode.parentNode;
  // append elements to the body or any other parent element  
  userNameNode.parentNode.insertAdjacentHTML('beforeend', newSpan);

  let colorInputNode = parentNode.querySelector(`input#color_input_${userId}`);
  let colorPickerSpan = parentNode.querySelector(`span#color_picker_span_${userId}`);

  // if the user already has a custom color, colorize the span
  if (userColors.has(userId)) {
    colorPickerSpan.style = `background-color: ${userColors.get(userId)};`;
    let uncoloredNickname = userNameNode;
    uncoloredNickname.style = `color: ${userColors.get(userId)};`;
    colorInputNode.value = `${userColors.get(userId)}`;
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
  div.bbWrapper {
    margin-bottom: 15px;
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

function applyRatingsModCss() {
  let style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.sv-rating-bar { display: none !important; }';
	document.head.appendChild(style);
}

// modify the DOM of main page articles
// remove "Click here to disable the ads!" block
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

// removes buttons that the user specified in the options from under YOUR posts
function applyRemoveButtonsModDom() {
  // first, find what's your nickname so that we may find your posts
  let yourNameDiv = document.querySelector('span.p-navgroup-linkText');
  let yourNickname = yourNameDiv.innerHTML;
  console.log("Your name is: " + yourNickname);
  
  // then we'll find your post ids, which will be useful when displaying a popup with "who reacted..."
  let allPosts = document.querySelectorAll('article.message, article.message--post, article.js-post, article.js-inlineModContainer');
  console.log("Posts on this page: " + allPosts.length);
  let myPosts = [];
  let myPostIds = new Set();
  for (let i = 0; i < allPosts.length; i++) {
    let postAuthor = allPosts[i].getAttribute("data-author");
    if (postAuthor == yourNickname) {
      let dataContent = allPosts[i].getAttribute("data-content");
      var postId = dataContent.split("-")[1];
      myPostIds.add(postId);
      myPosts.push(allPosts[i]);
    }
  }
  console.log("Your posts: " + myPosts.length);

  // get the ratings we want to remove
  const buttonsSet = new Set(optionWhichButtons.replaceAll(',, ',',,').toLowerCase().split(',,'));
  
  // go over your every post and remove undesired buttons
  for (let myPost of myPosts) {
    // Get UL with ratings
    let ulReactions = myPost.querySelector('ul.sv-rating-bar__ratings');
    if (ulReactions === null) continue; // skip posts without reactions
    
    // Get all LI elements
    let liElements = ulReactions.querySelectorAll('li.sv-rating');

    for (let i = liElements.length - 1; i >= 0; i--) {
      let li = liElements[i];
      let aElement = li.querySelector('a'); // Get the child a element
      let title = aElement.getAttribute('title').toLowerCase(); // Get the title attribute
      if (buttonsSet.has(title)) {        
        ulReactions.removeChild(li); // If title is in the set, remove the li element
      }
    }    
  }

  // Create a mutation observer
  let observer = new MutationObserver((mutations) => {
    // For each mutation
    for(let mutation of mutations) {
      // If the mutation type is childList and nodes have been added
      if(mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // For each added node
        for(let node of mutation.addedNodes) {
          // If the node is the div you're looking for
          if(node.classList !== undefined && node.classList.contains('overlay-container') && node.classList.contains('is-active')) {
            // Get the child div
            let childDiv = node.querySelector('.overlay');
            if(childDiv) {
              // Extract the post id from the data-url attribute
              let dataUrl = childDiv.getAttribute('data-url');
              let postId = dataUrl.split('/posts/')[1].split('/')[0];
              console.log("Post id: " + postId);

              // if this is my post
              if (myPostIds.has(postId)) {

                // 1. remove tabs with the offending reaction
                let tabParent = childDiv.querySelector('span.hScroller-scroll');
                let tabChildren = tabParent.querySelectorAll('a.tabs-tab');
                for (let i = tabChildren.length - 1; i >= 0; i--) {
                  let reactImg = tabChildren[i].querySelector('img');
                  if (reactImg !== null) {
                    let tabName = reactImg.getAttribute('alt');
                    if (buttonsSet.has(tabName.toLowerCase())) {
                      tabParent.removeChild(tabChildren[i]);
                    }
                  }
                }

                // 2. remove offending reactions from the All tab
                let allReactsParent = childDiv.querySelector('ol.js-reactionList-0');
                let allReactsChildren = allReactsParent.querySelectorAll('li');
                for (let i = allReactsChildren.length - 1; i >= 0; i--) {
                  let reactDiv = allReactsChildren[i].querySelector('div.sv-rating-type__icon');
                  if (reactDiv === null) continue;
                  let reactImg = reactDiv.querySelector('img');
                  if (reactImg !== null) {
                    let tabName = reactImg.getAttribute('alt');
                    if (buttonsSet.has(tabName.toLowerCase())) {
                      allReactsParent.removeChild(allReactsChildren[i]);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  // Start observing the body for added nodes
  observer.observe(document.body, { childList: true, subtree: true });
}

// adds a "My Notes" button in the top menu
function displayMyNotesButton()
{
  // Find the <ul> element with the class "p-nav-list js-offCanvasNavSource"
  const navList = document.querySelector('ul.p-nav-list.js-offCanvasNavSource');

  if (navList) {
    // Find the first <li> element inside the <ul>
    const firstListItem = navList.querySelector('li');

    if (firstListItem) {
      // Clone the first <li> element
      const clonedListItem = firstListItem.cloneNode(true);

      // Find the <a> element inside the cloned <li>
      const linkElement = clonedListItem.querySelector('a');

      if (linkElement) {
        // Change the href attribute of the <a> element
        linkElement.href = 'https://rpgcodex.net/forums/mynotes/';
        linkElement.textContent = 'My Notes';
      }

      // Insert the cloned <li> element at index 2
      navList.insertBefore(clonedListItem, navList.children[2]);
    }
  }
}
// When we go to 'forums/mynotes/'
// 1. Remove 'Oops! We ran into some problems.' and 'The requested page could not be found.'
// 2. Display our members notes
function displayMyNotes() {
  document.title = "My Notes.txt";

  // Find the <h1> element with the class "p-title-value"
  const titleElement = document.querySelector('h1.p-title-value');

  // Change its text to "foo"
  if (titleElement) {
    titleElement.textContent = 'My notes.txt';
  }

  let contentDiv = null;

  const pageContent = document.querySelector('div.p-body-pageContent');
  if (pageContent) {
    // Find the <div> element with the class "blockMessage"
    const blockMessage = pageContent.querySelector('div.blockMessage');

    if (blockMessage) {      
      // Clone the <div> element without content
      contentDiv = blockMessage.cloneNode(false);

      // Hide the original <div> element
      blockMessage.style.display = 'none';

      // Insert the cloned <div> element after the original <div>
      blockMessage.parentNode.insertBefore(contentDiv, blockMessage.nextSibling);
    }
  }

  // this would center the block, but unfortunately it makes it impossible to use color picker, which always appears in upper left corner
  // so we comment this out, ugh
  //contentDiv.style.display = 'flex';
  //contentDiv.style.justifyContent = 'center';
  //contentDiv.style.alignItems = 'center';

  let notesParentDivDefinition = `
  <div id="notesParent" 
    style="
      width: 700px; 
      padding: 0px 5px 0px 5px;
      background-color: #373e55;
      "
    >
  </div>
  `;
  contentDiv.insertAdjacentHTML('beforeend', notesParentDivDefinition);
  let notesParentDiv = document.getElementById('notesParent');

  savedTexts.forEach((text, id) => {
    let avatarSection = Math.floor(parseInt(id) / 1000);
    let userColor = '#fff';
    if (userColors.has(id)) {
      userColor = userColors.get(id);
    }

    var linkHTML = `
      <div style="display: flex; padding: 5px 0px 5px 0px; align-items: center;">
        <div style="padding-right: 5px;">
          <a href="/forums/members/.${id}/" data-user-id="${id}" data-xf-init="member-tooltip" id="js-XFUniqueId3" style="display: block; width: 48px; height: 48px;">
            <img src="/forums/data/avatars/s/${avatarSection}/${id}.jpg?1389017595" 
            srcset="/forums/data/avatars/m/${avatarSection}/${id}.jpg?1389017595 2x"
            onerror="this.src='../data/assets/default_avatars/avatar_male_l.png';this.srcset='../data/assets/default_avatars/avatar_male_l.png 2x'"
            style="width: 48px; height: 48px;" >
          </a>
        </div>

        <div style="color: ${userColor}">
        ${text.replace(/\n/g, "<br>")}
        </div>
        
      </div>
    `;

    notesParentDiv.insertAdjacentHTML('beforeend', linkHTML);

  })


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
