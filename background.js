// 移除 window 前缀，使用全局变量声明
let psshs = [];
let requests = [];
let bodys = [];
let targetIds = [];
let pageURL = "";
let clearkey = "";
let isBlock = false;
let blockRules = [];

chrome.storage.local.get("isBlock", (value) => {
    isBlock = value.isBlock || false;
});

function convertHeaders(obj){
    return JSON.stringify(Object.fromEntries(obj.map(header => [header.name, header.value])));
}

// 异步获取并解析规则
fetch("blockRules.conf").then((r)=>r.text()).then(text => {
    blockRules = text.replace(/\n^\s*$|\s*\/\/.*|\s*$/gm, "").split("\n");
});

function testBlock(url) {
    return isBlock && blockRules.some(e => url.includes(e));
}

// Get URL and headers from POST requests
chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        if (details.method === "POST") {
            // 查找对应的 body
            let matchingBody = bodys.find((b) => b.id == details.requestId);
            requests.push({
                url: details.url,
                headers: convertHeaders(details.requestHeaders),
                body: matchingBody ? matchingBody.body : ""
            });
            
            // 注意：MV3 中直接 return {cancel: true} 可能无效，
            // 除非是企业强制安装的扩展。完全拦截需要迁移到 declarativeNetRequest API。
            if(testBlock(details.url)){
                console.log("Blocked:", details.url);
                // return {cancel:true}; // MV3 默认不支持 webRequest 阻塞
            }
        }
    },
    {urls: ["<all_urls>"]},
    ["requestHeaders", "extraHeaders"] 
);

// Get requestBody from POST requests
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        if (details.method === "POST" && details.requestBody && details.requestBody.raw) {
            bodys.push({
                body: btoa(String.fromCharCode(...new Uint8Array(details.requestBody.raw[0]['bytes']))),
                id: details.requestId
            });
        }
    },
    {urls: ["<all_urls>"]},
    ["requestBody"]
);

// Receive PSSH from content.js
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch(request.type){
            case "GET_STATE":  // <--- 新增这段分支用于把数据传给弹窗
                sendResponse({
                    psshs: psshs,
                    requests: requests,
                    pageURL: pageURL,
                    targetIds: targetIds,
                    clearkey: clearkey
                });
                break;
            case "RESET":
                psshs = [];
                requests = [];
                bodys = [];
                clearkey = "";
                break;
            case "PSSH":
                psshs.push(request.text);
                pageURL = sender.tab ? sender.tab.url : "";
                targetIds = sender.tab ? [sender.tab.id, sender.frameId] : [];
                break;
            case "CLEARKEY":
                clearkey = request.text;
                break;
        }
        return true; // 异步发送响应需要返回 true
    }
);

// browserAction 改为 action
chrome.action.onClicked.addListener(tab => {
    if(chrome.windows){
        chrome.windows.create({
            url: "popup/main.html",
            type: "popup",
            width: 820,
            height: 600
        });
    } else {
        chrome.tabs.create({url: 'popup/main.html'})
    }
});

function createMenu(){
    chrome.storage.local.set({'isBlock': false}, null);
    chrome.contextMenus.create({
        id: "toggleBlocking",
        title: "Enable License Blocking"
    });
}

chrome.runtime.onInstalled.addListener(createMenu);
chrome.runtime.onStartup.addListener(createMenu);

chrome.contextMenus.onClicked.addListener(item => {
    if(item.menuItemId == "toggleBlocking"){
        chrome.storage.local.get("isBlock", (value) => {
            if(value.isBlock){
                chrome.storage.local.set({'isBlock': false}, null);
                chrome.contextMenus.update("toggleBlocking",{title: "Enable License Blocking"});
                isBlock = false;
            } else {
                chrome.storage.local.set({'isBlock': true}, null);
                chrome.contextMenus.update("toggleBlocking",{title: "Disable License Blocking"});
                isBlock = true;
            }
        });
    }
});
