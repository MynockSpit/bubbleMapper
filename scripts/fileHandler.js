function localStorageExists() {
    var test = 'test';
    try {
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
}

// Reload Map Dialog Box
// Opens the reloadConfirmationBox if an old map is detected
function checkForOldMap() {
    if (localStorageExists() === true) {
        
        var reloadMap;
        
        if (!localStorage.getItem("currentBubbles")) {
            localStorage.setItem("currentBubbles",JSON.stringify("[]"));
        } else {
            reloadMap = true;
        }
        
        if (!localStorage.getItem("currentPaths")) {
            localStorage.setItem("currentPaths",JSON.stringify("[]"));
        } else {
            reloadMap = true;
        }

        if (reloadMap === true) {
            bubbleMappperTutorial("close");
            document.getElementById("reloadConfirmationBox").style.display = "block";
        }
    }
    else {
        alert("Your browser is not compatible with LocalStorage.");
    }
}

// Loads local storage if "Reload" is clicked
function loadLocalStorage() {
    document.getElementById("reloadConfirmationBox").style.display = "none";

    var bubblesInJSON = JSON.parse(localStorage.getItem("currentBubbles"));
    var pathsInJSON = JSON.parse(localStorage.getItem("currentPaths"));

    for (var i = 0; i < bubblesInJSON.length; i++) {
        var bubbleInsert = document.createElement("div");

        bubbleInsert.setAttribute("id",bubblesInJSON[i].id + "F");
        bubbleInsert.setAttribute("class","bubble");
        bubbleInsert.style.top = (bubblesInJSON[i].top);
        bubbleInsert.style.left = (bubblesInJSON[i].left);

        if (bubblesInJSON[i].maxWidth) {
            bubbleInsert.style.width = (bubblesInJSON[i].width);
            bubbleInsert.style.maxWidth = (bubblesInJSON[i].maxWidth);
            bubbleInsert.style.minHeight = (bubblesInJSON[i].minHeight);
        }

        bubbleInsert.style.backgroundColor = (bubblesInJSON[i].backgroundColor);
        bubbleInsert.style.color = (bubblesInJSON[i].fontColor);
        bubbleInsert.innerHTML = (bubblesInJSON[i].content);

        document.getElementById("bubbleCanvas").appendChild(bubbleInsert);
    }

    for (var i = 0; i < pathsInJSON.length; i++) {
        var pathInsert = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathInsert.setAttribute("id","F" + pathsInJSON[i].id + "F");
        pathInsert.setAttribute("class","path");
        pathInsert.style.stroke = (pathsInJSON[i].strokeColor);
        pathInsert.setAttribute("d",pathsInJSON[i].d);

        document.getElementById("pathCanvas").appendChild(pathInsert);        
    }

    for (var i = 1; document.getElementById("bubbleCanvas").innerHTML.match(/\bbubble\d+F\b/g); i++) {
        if (document.getElementById("bubble"+i+"F")) {
            document.getElementById("bubble"+i+"F").id = "bubble" + bubbleNumber;
            if (newPathIDs = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp("\\bFbubble" + i + "TObubble\\d+F*\\b","g"))) {
                for (n = 0; newPathIDs[n]; n++) {
                    document.getElementById(newPathIDs[n]).id = newPathIDs[n].replace("Fbubble" + i,"bubble" + bubbleNumber);
                }
            }
            if (newPathIDs = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp("\\bF*bubble\\d+TObubble" + i + "F\\b","g"))) {
                for (n = 0; newPathIDs[n]; n++) {
                    document.getElementById(newPathIDs[n]).id = newPathIDs[n].replace("TObubble" + i + "F","TObubble" + bubbleNumber);
                }
            }
            bubbleNumber++;
        }
    }

    storeData();
}

// Clears local storage if the "Discard" is clicked
function discardLocalStorage() {
    document.getElementById("reloadConfirmationBox").style.display = "none";
    bubbleMappperTutorial("open");

    if (localStorageExists() === true) {
        localStorage.removeItem("currentBubbles");
        localStorage.removeItem("currentPaths");
    }
}

// Opens a load file window if "Load From File" is clicked
function triggerFileInput(event) {
    var clickInput;

    if (!eventGlobal) eventGlobal = event;

    if (eventGlobal.initEvent) {
        clickInput = document.createEvent("MouseEvent");
        clickInput.initMouseEvent("click", true, true, window, 0, eventGlobal.screenX, eventGlobal.screenY, 
                                  eventGlobal.clientX, eventGlobal.clientY, false, false, 
                                  false, false, 0, null);
        document.getElementById("fileLoad").dispatchEvent(clickInput);
    } 

    else if (clickInput = document.createEventObject(eventGlobal)) {   // IE before version 9
        clickInput.button = 1;  // left button is down
        document.getElementById("fileLoad").fireEvent("onmousedown", clickInput);
    }

    if (document.getElementById("reloadConfirmationBox")) document.getElementById("reloadConfirmationBox").style.display = "none";
} // Triggers the 

// The code that actually loads a file
function loadXMLFile() {
    if (document.getElementById("warningANDinstructions")) bubbleMappperTutorial("close");
    if (document.getElementById("fileLoad").value) {
        var xml, loadedFile = event.target.files[0];
        var parseXML; // Looks like a variable, is a function

        // Sets up the parseXML function. Tries two different ways, and if
        // those fail, cancels the function.

        // parseXML takes the contents of a real xml file and parses it into 
        // memory for the file loader to run.

        if (window.DOMParser) {
            parseXML = function(xmlStr) {
                return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
            };
        } else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
            parseXML = function(xmlStr) {
                var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = "false";
                xmlDoc.loadXML(xmlStr);
                return xmlDoc;
            };
        } else {
            parseXML = function() { return null; }
        }

        // Checks if file actually exists, loads it, and reads it when loaded.

        // It may look like it's written backwards, and that's because it's
        // asynchronous, and won't wait for the file to be loaded to move on.
        // (That's a good thing.)

        if (loadedFile) { // Check for file...
            var reader = new FileReader(); // Set up the FileReader
            reader.onload = function() { // Defines what to do when the file is loaded
                if (xml = parseXML(event.target.result)) {
                    var bubblesInXML = xml.getElementsByTagName("bubble");
                    var pathsInXML = xml.getElementsByTagName("path");

                    var bubbleInsert, pathInsert, i;

                    for (i = 0; i < bubblesInXML.length; i++) {
                        bubbleInsert = document.createElement("div");

                        bubbleInsert.setAttribute("id",bubblesInXML[i].getAttribute("id") + "F");
                        bubbleInsert.setAttribute("class","bubble");
                        bubbleInsert.style.top = (bubblesInXML[i].getAttribute("top"));
                        bubbleInsert.style.left = (bubblesInXML[i].getAttribute("left"));

                        if ((bubblesInXML[i].getAttribute("maxWidth"))) {
                            bubbleInsert.style.width = (bubblesInXML[i].getAttribute("width"));
                            bubbleInsert.style.maxWidth = (bubblesInXML[i].getAttribute("maxWidth"));
                            bubbleInsert.style.minHeight = (bubblesInXML[i].getAttribute("minHeight"));
                        }

                        bubbleInsert.style.backgroundColor = (bubblesInXML[i].getAttribute("backgroundColor"));
                        bubbleInsert.style.color = (bubblesInXML[i].getAttribute("fontColor"));
                        bubbleInsert.innerHTML = (bubblesInXML[i].firstChild.nodeValue);

                        document.getElementById("bubbleCanvas").appendChild(bubbleInsert);
                    }

                    for (i = 0; i < pathsInXML.length; i++) {
                        pathInsert = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        pathInsert.setAttribute("id","F" + pathsInXML[i].getAttribute("id") + "F");
                        pathInsert.setAttribute("class","path");
                        pathInsert.style.stroke = (pathsInXML[i].getAttribute("strokeColor"));
                        pathInsert.setAttribute("d",pathsInXML[i].getAttribute("d"));

                        document.getElementById("pathCanvas").appendChild(pathInsert);        
                    }

                    for (i = 1; document.getElementById("bubbleCanvas").innerHTML.match(/\bbubble\d+F\b/g); i++) {
                        if (document.getElementById("bubble"+i+"F")) {
                            document.getElementById("bubble"+i+"F").id = "bubble" + bubbleNumber;
                            if (newPathIDs = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp("\\bFbubble" + i + "TObubble\\d+F*\\b","g"))) {
                                for (n = 0; newPathIDs[n]; n++) {
                                    document.getElementById(newPathIDs[n]).id = newPathIDs[n].replace("Fbubble" + i,"bubble" + bubbleNumber);
                                }
                            }
                            if (newPathIDs = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp("\\bF*bubble\\d+TObubble" + i + "F\\b","g"))) {
                                for (n = 0; newPathIDs[n]; n++) {
                                    document.getElementById(newPathIDs[n]).id = newPathIDs[n].replace("TObubble" + i + "F","TObubble" + bubbleNumber);
                                }
                            }
                            bubbleNumber++;
                        }
                    }

                    document.getElementById("fileLoad").value = '';
                }
            }
            reader.readAsText(loadedFile); // Loads the file
        } else { 
            alert("Failed to load file");
        }
    }
}

// Saving Bubblemap Functions
// Saves to localStorage
function storeData() {
    
    // Stores all current paths from scratch
    var allBubbles, 
        allPaths, 
        bubbleData = [], 
        pathData = [];
    
    currentMap.bubbleData = {};
    currentMap.pathData = {};

    if (allBubbles = document.getElementById("bubbleCanvas").innerHTML.match(/\bbubble\d+\b/g)) {
        for (var i = 0; allBubbles[i]; i++) {
            var thisBubble = document.getElementById(allBubbles[i]);
            var obj = {
                id: thisBubble.id,
                left: thisBubble.style.left,
                top: thisBubble.style.top,
                width: thisBubble.offsetWidth + "px",
                maxWidth: thisBubble.style.maxWidth,
                height: thisBubble.offsetHeight + "px",
                minHeight: thisBubble.style.minHeight,
                backgroundColor: thisBubble.style.backgroundColor,
                fontColor: thisBubble.style.color,
                content: thisBubble.innerHTML.replace(/\n/g,"")
            };
            bubbleData.push(obj);
            currentMap.bubbleData[thisBubble.id] = obj;
        }
    }
    
    if (allPaths = document.getElementById("pathCanvasShell").innerHTML.match(/\bbubble\d+TObubble\d+\b/g)) {
        for (var i = 0; allPaths[i]; i++) {
            var thisPath = document.getElementById(allPaths[i]);
            var obj = {
                id: thisPath.id,
                strokeColor: thisPath.style.stroke,
                d: thisPath.getAttribute("d")
            };
            pathData.push(obj);
            currentMap.pathData[thisPath.id] = obj;
        }
    }
        
    if (localStorageExists() === true) {
        localStorage.setItem("currentBubbles",JSON.stringify(bubbleData));
        localStorage.setItem("currentPaths",JSON.stringify(pathData));
    }
}

// Save File Dialog Box
// Prints a file to the server and opens the Save File dialog box
function saveFile() {

    // fileName is currently generated by this Javascript
    fileName = String(Math.floor(Math.random()*100000000) + "" + (new Date()).getTime());
    test1("Saving... "); // Saving confirmation
        
    var xmlhttp;
    if (window.XMLHttpRequest) { // code for IE7+, Firefox, Chrome, Opera, Safari
        xmlhttp=new XMLHttpRequest();
    } else { // code for IE6, IE5
        xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    }
    
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            test1("Saved. "); // Save confirmation
            document.getElementById("saveDialogBox").style.display = "block";
        }
    }
        
    xmlhttp.open("POST","php/generateXML.php",true);
    xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xmlhttp.send("&fileName=" + fileName + "&bubbleData=" + JSON.stringify(currentMap.bubbleData) + "&pathData=" + JSON.stringify(currentMap.pathData) + "&historyData=" + JSON.stringify(historyData));
}

// Saves and downloads file if "Save" is clicked
function confirmSave() {
    document.getElementById("saveDialogBox").style.display = "none";
    document.location = "php/downloadXML.php?fileName=" + fileName + "&mapName=" + String(document.getElementById("bubbleMapName").value);
    fileName = "";
}

// Cancels and closes the dialog box if "Cancel" is clicked
function cancelSave() {
    document.getElementById("saveDialogBox").style.display = "none";
    fileName = "";
}

/*

function doClick() {
      var el = document.getElementById("fileElem");
      if (el) {
        el.click();
      }
    }
    function handleFiles(files) {
      var d = document.getElementById("fileList");
      if (!files.length) {
        d.innerHTML = "<p>No files selected!</p>";
      } else {
        var list = document.createElement("ul");
        d.appendChild(list);
        for (var i=0; i < files.length; i++) {
          var li = document.createElement("li");
          list.appendChild(li);
          
          var img = document.createElement("img");
          img.src = window.URL.createObjectURL(files[i]);;
          img.height = 60;
          img.onload = function() {
            window.URL.revokeObjectURL(this.src);
          }
          li.appendChild(img);
          
          var info = document.createElement("span");
          info.innerHTML = files[i].name + ": " + files[i].size + " bytes";
          li.appendChild(info);
        }
      }
    }

*/