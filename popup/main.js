window.psshs = [];
window.requests = [];
window.pageURL = "";
window.targetIds = [];
window.clearkey = "";
window.isBlock = false;
window.userInputs = { license: 0, pssh: 0 }; 

// [关键修复] 伪造 getBackgroundPage 对象给 Python 引擎用
if (!chrome.extension) chrome.extension = {};
chrome.extension.getBackgroundPage = () => window;

chrome.runtime.sendMessage({type: "GET_STATE"}, (state) => {
    if (!state) return;
    
    window.psshs = state.psshs || [];
    window.requests = state.requests || [];
    window.pageURL = state.pageURL || "";
    window.targetIds = state.targetIds || [];
    window.clearkey = state.clearkey || "";

    if (window.clearkey) {
        document.getElementById('noEME').style.display = 'none';
        document.getElementById('ckHome').style.display = 'grid';
        document.getElementById('ckResult').value = window.clearkey;
        document.getElementById('ckResult').addEventListener("click", copyResult);
    } else if (window.psshs.length) {
        document.getElementById('noEME').style.display = 'none';
        document.getElementById('home').style.display = 'grid';
        document.getElementById('guess').addEventListener("click", guess);
        document.getElementById('result').addEventListener("click", copyResult);
        autoSelect();
    }
});

async function guess(){
    document.body.style.cursor = "wait";
    document.getElementById("guess").disabled = true;

    try {
        // Init Pyodide
        let pyodide = await loadPyodide();
        await pyodide.loadPackage(["certifi-2024.2.2-py3-none-any.whl","charset_normalizer-3.3.2-py3-none-any.whl","construct-2.8.8-py2.py3-none-any.whl","idna-3.6-py3-none-any.whl","packaging-23.2-py3-none-any.whl","protobuf-4.24.4-cp312-cp312-emscripten_3_1_52_wasm32.whl","pycryptodome-3.20.0-cp35-abi3-emscripten_3_1_52_wasm32.whl","pymp4-1.4.0-py3-none-any.whl","pyodide_http-0.2.1-py3-none-any.whl","pywidevine-1.8.0-py3-none-any.whl","requests-2.31.0-py3-none-any.whl","urllib3-2.2.1-py3-none-any.whl"].map(e=>"/libs/wheels/"+e));

        // Configure Guesser
        pyodide.globals.set("pssh", document.getElementById('pssh').value);
        pyodide.globals.set("licUrl", window.requests[window.userInputs['license']]['url']);
        pyodide.globals.set("licHeaders", window.requests[window.userInputs['license']]['headers']);
        pyodide.globals.set("licBody", window.requests[window.userInputs['license']]['body']);
        let pre = await fetch('/python/pre.py').then(res=>res.text());
        let after = await fetch('/python/after.py').then(res=>res.text());
        let scheme = document.getElementById("schemeCode").value;

        // Get result
        let result = await pyodide.runPythonAsync([pre, scheme, after].join("\n"));
        document.getElementById('result').value = result;

        // Save history
        let historyData={
            PSSH: document.getElementById('pssh').value,
            KEYS: result.split("\n").slice(0,-1)
        };
        chrome.storage.local.set({[window.pageURL]: historyData}, null);

    } catch (e) {
        console.error(e);
        alert("解密失败！可能是选错了 License URL，或者请求被服务器拒绝。\n错误信息: " + e.message.substring(0, 150) + "...");
    } finally {
        document.body.style.cursor = "auto";
        document.getElementById("guess").disabled = false;
    }
}

function copyResult(){
    this.select();
    navigator.clipboard.writeText(this.value);
}

window.corsFetch = (u, m, h, b) => {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(window.targetIds[0], {type:"FETCH", u:u, m:m, h:h, b:b}, {frameId:window.targetIds[1]}, res => {
            resolve(res);
        });
    });
}

async function autoSelect(){
    window.userInputs["license"] = 0;
    if(window.requests.length > 0) {
        document.getElementById("license").value = window.requests[0]['url'];
    }
    if(window.psshs.length > 0) {
        document.getElementById('pssh').value = window.psshs[0];
    }
    
    let selectRules = await fetch("/selectRules.conf").then((r)=>r.text());
    selectRules = selectRules.replace(/\n^\s*$|\s*\/\/.*|\s*$/gm, "");
    selectRules = selectRules.split("\n").map(row => row.split("$$"));
    for(var item of selectRules){
        let search = window.requests.map(r => r['url']).findIndex(e => e.includes(item[0]));
        if(search >= 0){
            if(item[1]) document.getElementById("schemeSelect").value = item[1];
            window.userInputs["license"] = search;
            document.getElementById("license").value = window.requests[search]['url'];
            break;
        }
    }

    document.getElementById("schemeSelect").dispatchEvent(new Event("input"));
}
