window.userInputs = window.userInputs || {};

document.getElementById('psshButton').addEventListener("click", () => {
    if (!window.psshs || window.psshs.length === 0) {
        alert("暂未抓取到 PSSH 数据");
        return;
    }
    drawList(window.psshs, 'pssh');
});

document.getElementById('licenseButton').addEventListener("click", () => {
    if (!window.requests || window.requests.length === 0) {
        alert("暂未抓取到 License 数据");
        return;
    }
    drawList(window.requests.map(r => r['url']), 'license');
});

function writeListElement(items, outputVar, searchStr) {
    document.getElementById("items").innerHTML = '';

    items.forEach((item, index) => {
        if (!searchStr || item.includes(searchStr)) {
            const li = document.createElement('li');
            li.textContent = item;
            li.addEventListener('click', () => itemSelected(index, item, outputVar));
            document.getElementById("items").appendChild(li);
        }
    });
}

function drawList(items, outputVar) {
    document.getElementById('home').style.display = 'none';
    document.getElementById('chooserContainer').style.display = 'grid';
    document.getElementById('toggleHistory').style.display = 'none';

    writeListElement(items, outputVar, null);
    document.getElementById("chooserSearch").addEventListener('input', event => {
        const searchStr = event.target.value.toLowerCase();
        writeListElement(items, outputVar, searchStr);
    });
}

function itemSelected(index, item, outputVar){
    window.userInputs[outputVar] = index;
    document.getElementById(outputVar).value = item;
    document.getElementById('chooserContainer').style.display = 'none';
    document.getElementById('home').style.display = 'grid';
    document.getElementById('toggleHistory').style.display = 'grid';
    document.getElementById("chooserSearch").value = "";
}
