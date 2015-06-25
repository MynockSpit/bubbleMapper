window.addEventListener("load", function load_bubbleMapper() {
    window.removeEventListener("load", load_bubbleMapper, false);
    bubbleMapper.initialize();
},false);

var eventGlobal, // A global version of the last event fired (except mousemove events)
    clickNumber = 0,
    historyData = [], // History data is an array of objects
    currentMap = {
        "bubbleData": {}, 
        "pathData": {}
    }, // An in-memory object copy of all the bubbles and paths in the map 
    fileName, // The saved-as fileName
    selectedObjects = {}, // An objects where selected elements are listed as properties by name
    bubbleBeingEdited = null,
    bubbleResizer = {}, // Object that stores the mode and coordinates of resizing
    bubbleNumber = 1;

/* Get input -- Optimized for object-based multi-select */

function getKeyDown(event) {
    eventGlobal = event || window.event;

    // Keys repeat while pressed down... so if I want 'X' to happen on first keydown,
    // then something else to happen on the next keydown, I'm going to need to add a
    // timer of some sort to make it work.

    // Checks for return and enter
    if (eventGlobal.keyCode == 13) {
        // Checks for Save and Reload dialog boxes
        if (document.getElementById("reloadConfirmationBox").style.display == "block") loadLocalStorage();
        if (document.getElementById("saveDialogBox").style.display == "block") confirmSave();

        // Close color picker (and save color (not yet implimented))
        if (document.getElementById("colorPicker").style.display == "block") closeColorPicker();

        // Save bubble if one is open
        if (bubbleBeingEdited) {
            eventGlobal.preventDefault()
            saveBubble(); 
        }

        // Edit bubble if one is selected
        else if (Object.getOwnPropertyNames(selectedObjects).length > 0) {
            eventGlobal.preventDefault();
            editObject();
        }
    }

    // Checks for escape
    else if (eventGlobal.keyCode == 27) {
        // Checks for Save and Reload dialog boxes
        if (document.getElementById("saveDialogBox").style.display == "block") cancelSave();
        if (document.getElementById("reloadConfirmationBox").style.display == "block") discardLocalStorage();

        // Close color picker (and discard color (not yet implimented))
        if (document.getElementById("colorPicker").style.display == "block") closeColorPicker(); 

        // Cancel bubble if one is open
        if (bubbleBeingEdited) cancelBubble();

        // Deselect bubble if one is selected
        else if (Object.getOwnPropertyNames(selectedObjects).length > 0) deselectObject();
    }

    // Checks for delete and backspace
    else if (eventGlobal.keyCode == 8 || eventGlobal.keyCode == 46) {
        // Prevent deletion of bubbles while colorPicker, reloadConfirmation or saveDialog is open
        if (document.getElementById("colorPicker").style.display != "block" &&
            document.getElementById("reloadConfirmationBox").style.display != "block" &&
            document.getElementById("saveDialogBox").style.display != "block") {

            // If there is a selection...
            if (Object.getOwnPropertyNames(selectedObjects).length != 0) {

                // If that selection is not a tempBubble
                if (!bubbleBeingEdited) deleteObject();
            }
        }
    }

    // Checks for Control + Z and Command + Z
    else if (eventGlobal.keyCode == 90 && (eventGlobal.ctrlKey == true || eventGlobal.metaKey == true)) {
        eventGlobal.preventDefault();

        // Prevent undoing while colorPicker, reloadConfirmation or saveDialog is open
        if (document.getElementById("colorPicker").style.display != "block" &&
            document.getElementById("reloadConfirmationBox").style.display != "block" &&
            document.getElementById("saveDialogBox").style.display != "block" &&
            document.getElementById("warningANDinstructions").style.display == "none") {

            undoAction();
        }
    }

    // Checks for Control + S and Command + S
    else if (eventGlobal.keyCode == 83 && (eventGlobal.ctrlKey == true || eventGlobal.metaKey == true)) {
        eventGlobal.preventDefault();

        // Prevent saving while the reload confirmation or the tutorial is open
        if (document.getElementById("reloadConfirmationBox").style.display != "block" &&
            document.getElementById("warningANDinstructions").style.display == "none" &&
            (Object.getOwnPropertyNames(currentMap.bubbleData).length > 0 ||
             Object.getOwnPropertyNames(currentMap.pathData).length > 0)) {
            if (Object.getOwnPropertyNames(selectedObjects).length > 0) deselectObject(); // Deselect any saved objects (Why? Looks better)
            if (bubbleBeingEdited) saveBubble(); // If a bubble is being created or edited, cancel changes
            saveFile();
        }

        //Add if that triggers the "Save" button if this command is triggered when the save dialog is already open
    }

    // Checks for Control + L, Command + L, Control + O and Command + O (only Control + L works in Safari on Mac) 
    else if ((eventGlobal.keyCode == 76 || eventGlobal.keyCode == 79) && (eventGlobal.ctrlKey == true || eventGlobal.metaKey == true)) {
        event.preventDefault();

        if (document.getElementById("reloadConfirmationBox").style.display != "block" &&
            document.getElementById("saveDialogBox").style.display != "block") {

            triggerFileInput(eventGlobal);
        }}

    // Checks for Control + A and Command + A
    else if ((eventGlobal.keyCode == 65) && (eventGlobal.ctrlKey == true || eventGlobal.metaKey == true)) {
        event.preventDefault();

        selectObject("",{clearSelection: true, toolbarMode: "object"});
    }
}

/* Selection -- Optimized for object-based multi-select *//*

function selectObject(elementInput,options) {
    // Default options are to clear selection, and not open object toolbar

    // Clear selection by default, if set to false, don't clear
    if (options.clearSelection === true) deselectObject();

    // If there is no elementInput, select everything
    if (!elementInput) {
        var bubbles = document.getElementsByClassName("bubble");
        var paths = document.getElementsByClassName("path");

        for (var i = (bubbles.length - 1); bubbles[i] != undefined; i--) {
            selectObject(bubbles[i],{clearSelection: false});
        }

        for (var i = (paths.length - 1); paths[i] != undefined; i--) {
            selectObject(paths[i],{clearSelection: false});
        }
    }

    // If the elementInput isn't already selected
    else if (!selectedObjects[elementInput.id]) {

        if (elementInput.id.match(/^bubble\d+$/g)) {
            var obj = {
                kind: "bubble",
                element: elementInput
            };

            elementInput.style.border = "2px solid rgba(0,0,0,.48)"; // Adds styling to bubble
            elementInput.style.padding = "3px 8px";
            elementInput.style.boxShadow = "0px 3px 6px rgba(0,0,0,.48)";
        }

        else if (elementInput.id.match(/^bubble\d+TObubble\d+$/g)) {
            var obj = {
                kind: "path",
                element: elementInput
            };

            elementInput.style.strokeWidth = "8px"; 
        }

        selectedObjects[elementInput.id] = obj;

        displaySelection();
    }

    // If not told to hide toolbars...
    if (options.toolbarMode && checkSelection() == true) {   
        // Open selection toolbars
        openObjectToolbar(options.toolbarMode);
    }
}

function deselectObject(elementInput) {

    if (!elementInput) {

        // Go through selection and clear visual indication of selection
        for (var objects in selectedObjects) {
            deselectObject(selectedObjects[objects].element);
        }

        // Clear selectedObjects just in case something funky happened
        selectedObjects = {};
    }

    else if (elementInput) {

        if (elementInput.id.match(/^bubble\d+$/g) || elementInput.id == "temporaryBubble") {
            elementInput.style.border = "";
            elementInput.style.padding = "";
            elementInput.style.boxShadow = "";
        } 

        else if (elementInput.id.match(/^bubble\d+TObubble\d+$/g)) {
            elementInput.style.strokeWidth = "";
        }

        delete selectedObjects[elementInput.id]; // Not my favorite way of removing object, but it works.

        closeObjectToolbar();

        displaySelection();
    }
}

*/

function checkSelection(elementInput) {
    // If there isn't an elementInput, check if anything is selected

    if (!elementInput) {    
        for (var objects in selectedObjects) {
            if(selectedObjects.hasOwnProperty(objects)) return true;
        }

        return false;
    }

    // Else, check if the object specified is selected

    else {
        for (var objects in selectedObjects) {
            if (objects == elementInput.id) return true;
        }
        return false;
    }
}

/* Movement (Bubbles) -- Optimized for object-based multi-select *//*

function moveBubbleStart() {
    document.addEventListener("mousemove", moveBubblePrep, false);
    document.addEventListener("mouseup", moveBubbleClear, false);    

    function moveBubblePrep() {
        document.removeEventListener("mousemove", moveBubblePrep, false);
        document.removeEventListener("mouseup", moveBubbleClear, false);  

        document.addEventListener("mousemove", moveBubble, false);
        document.addEventListener("mouseup", moveBubbleStop, false);    
    }

    function moveBubbleClear() {
        document.removeEventListener("mousemove", moveBubblePrep, false);
        document.removeEventListener("mouseup", moveBubbleClear, false);  
    }
}

function moveBubble(event) {

    if (document.getElementById("objectToolbarSelect").style.display == "block" ||
        document.getElementById("objectToolbarEdit").style.display == "block") closeObjectToolbar();

    var bubbleTopRelative = event.clientY - eventGlobal.clientY;
    var bubbleLeftRelative = event.clientX - eventGlobal.clientX;

    // These need to be based of some previous (static) data.

    for (var objects in selectedObjects) {
        if (selectedObjects[objects].kind == "bubble") {
            var element = document.getElementById(objects);
            var origin = currentMap.bubbleData[objects];

            element.style.top = parseInt(origin.top) + event.clientY - eventGlobal.clientY + "px";
            element.style.left = parseInt(origin.left) + event.clientX - eventGlobal.clientX + "px";

            drawPath(element);   
        }
    }

    // Move resizers
    if (document.getElementById("resizerCanvas").innerHTML != "") {
        document.getElementById("resizerCanvas").style.display = "none";
    }    
}

function moveBubbleStop() {
    document.removeEventListener("mousemove", moveBubble, false);
    document.removeEventListener("mouseup", moveBubbleStop, false);

    for (var objects in selectedObjects) {
        if (selectedObjects[objects].kind == "bubble") {
            var element = document.getElementById(objects);

            addHistory(element,"move");
        }
    }

    if (document.getElementById("resizerCanvas").innerHTML != "") {
        document.getElementById("resizerCanvas").style.display = "block";

        var resizerArray = document.getElementById("resizerCanvas").innerHTML.match(/\bbubble\d+resizer\b/g);

        for (var i = 0; resizerArray != null && resizerArray[i] != undefined; i++) {
            resizeBorder(null,resizerArray[i].match(/^bubble\d+(?=r)/));
        }

        openObjectToolbar("edit");
    }

    else openObjectToolbar();

    storeData(); //moveBubbleStop
}

*/

/* Resizer -- /* Broken, need to fix it. Should only work under two circumstances
-- Figure out how to make one box scale all bubbles, or
-- Only one bubble is selected
*/

function openResizer() {
    for (var objects in selectedObjects) {
        if (objects.match(/^bubble\d+$/)) {

            var resizeBox = document.createElement("div"); resizeBox.id = objects + "resizer"; resizeBox.className = "resizer"

            document.getElementById("resizerCanvas").appendChild(resizeBox);

            var arrowTL = document.createElement("div"); arrowTL.id = objects + "TL"; arrowTL.className = "arrow arrowTL";
            var arrowT = document.createElement("div"); arrowT.id = objects + "T"; arrowT.className = "arrow arrowT";
            var arrowTR = document.createElement("div"); arrowTR.id = objects + "TR"; arrowTR.className = "arrow arrowTR";

            var arrowL = document.createElement("div"); arrowL.id = objects + "L"; arrowL.className = "arrow arrowL";
            var arrowR = document.createElement("div"); arrowR.id = objects + "R"; arrowR.className = "arrow arrowR";

            var arrowBL = document.createElement("div"); arrowBL.id = objects + "BL"; arrowBL.className = "arrow arrowBL";
            var arrowB = document.createElement("div"); arrowB.id = objects + "B"; arrowB.className = "arrow arrowB";
            var arrowBR = document.createElement("div"); arrowBR.id = objects + "BR"; arrowBR.className = "arrow arrowBR";

            resizeBox.appendChild(arrowTL).appendChild(document.createElement("div"));
            resizeBox.appendChild(arrowT).appendChild(document.createElement("div"));
            resizeBox.appendChild(arrowTR).appendChild(document.createElement("div"));

            resizeBox.appendChild(arrowL).appendChild(document.createElement("div"));
            resizeBox.appendChild(arrowR).appendChild(document.createElement("div"));

            resizeBox.appendChild(arrowBL).appendChild(document.createElement("div"));
            resizeBox.appendChild(arrowB).appendChild(document.createElement("div"));
            resizeBox.appendChild(arrowBR).appendChild(document.createElement("div"));

            document.getElementById(objects).addEventListener("keyup", resizeBorder, false);

            document.getElementById(objects + "TL").addEventListener("mousedown", resizeBubbleStart, false);
            document.getElementById(objects + "T").addEventListener("mousedown", resizeBubbleStart, false);
            document.getElementById(objects + "TR").addEventListener("mousedown", resizeBubbleStart, false);

            document.getElementById(objects + "L").addEventListener("mousedown", resizeBubbleStart, false);
            document.getElementById(objects + "R").addEventListener("mousedown", resizeBubbleStart, false);

            document.getElementById(objects + "BL").addEventListener("mousedown", resizeBubbleStart, false);
            document.getElementById(objects + "B").addEventListener("mousedown", resizeBubbleStart, false);
            document.getElementById(objects + "BR").addEventListener("mousedown", resizeBubbleStart, false);

            resizeBorder(null,objects);
        }
    }
}

function resizeBorder(event,idInput) {

    if (!idInput) {
        event = event || window.event;
        idInput = event.target.id;
    }

    var resizer = document.getElementById(idInput + "resizer"),
        bubble = document.getElementById(idInput),
        outerOffset = 7;

    // offsetTop and offsetLeft are off by 1 pixel frequently, so the additional 1 is to correct that
    resizer.style.top = (bubble.offsetTop - 1 - outerOffset) + "px";
    resizer.style.left = (bubble.offsetLeft - 1 - outerOffset) + "px";
    resizer.style.bottom = (window.innerHeight - (bubble.offsetTop + bubble.offsetHeight) - 1 - outerOffset) + "px";
    resizer.style.right = (window.innerWidth - (bubble.offsetLeft + bubble.offsetWidth) - 1 - outerOffset) + "px";

    // Move edit toolbar
    openObjectToolbar("edit");
}

function resizeBubbleStart(event) {
    var element = document.getElementById(this.id.match(/^bubble\d+(?=[T|B|L|R])/));

    document.addEventListener("mousemove", resizeBubble, false);
    document.addEventListener("mouseup", resizeBubbleStop, false);

    bubbleResizer.bubbleID = element.id;
    bubbleResizer.resizeMode = this.id;
    bubbleResizer.resizeBottom = element.offsetHeight + element.offsetTop + 6;
    bubbleResizer.resizeRight = element.offsetWidth + element.offsetLeft + 10;
}

function resizeBubble(event) {

    var resizer = document.getElementById(bubbleResizer.bubbleID + "resizer"),
        element = document.getElementById(bubbleResizer.bubbleID);

    if (/T/.test(bubbleResizer.resizeMode)) {
        if (event.clientY < (window.innerHeight - parseInt(resizer.style.bottom))) {
            resizer.style.top = event.clientY + "px";
        } else {
            resizer.style.top = (window.innerHeight - parseInt(resizer.style.bottom)) + "px";
        }
    }

    if (/L/.test(bubbleResizer.resizeMode)) {
        if (event.clientX < (window.innerWidth - parseInt(resizer.style.right))) {
            resizer.style.left = event.clientX + "px";
        } else {
            resizer.style.left = (window.innerWidth - parseInt(resizer.style.right)) + "px";
        }
    }

    if (/B/.test(bubbleResizer.resizeMode)) {
        if (event.clientY > (parseInt(resizer.style.top))) {
            resizer.style.bottom = (window.innerHeight - event.clientY) + "px";
        } else {
            resizer.style.bottom = (window.innerHeight - parseInt(resizer.style.top)) + "px";
        }
    }

    if (/R/.test(bubbleResizer.resizeMode)) {
        if (event.clientX > (parseInt(resizer.style.left))) {
            resizer.style.right = (window.innerWidth - event.clientX) + "px";
        } else {
            resizer.style.right = (window.innerWidth - parseInt(resizer.style.left)) + "px";
        }
    }

    element.style.left = resizer.offsetLeft + 8 + "px";
    element.style.top = resizer.offsetTop + 8 + "px";

    element.style.width = resizer.offsetWidth - 36 + "px";
    element.style.maxWidth = resizer.offsetWidth - 36 + "px";
    element.style.minHeight = resizer.offsetHeight - 26 + "px";

    drawPath(element);

    // Move edit toolbar
    openObjectToolbar("edit");
}

function resizeBubbleStop() {
    document.removeEventListener("mousemove", resizeBubble, false);
    document.removeEventListener("mouseup", resizeBubbleStop, false);

    resizeBorder(null,bubbleResizer.bubbleID);
}

function closeResizer() {
    var elementID,
        resizerArray = document.getElementById("resizerCanvas").innerHTML.match(/\bbubble\d+resizer\b/g);

    for (var i = 0; resizerArray != null && resizerArray[i] != undefined; i++) {

        elementID = resizerArray[i].match(/^bubble\d+(?=r)/);

        // Remove Event Listenters    
        document.getElementById(elementID).addEventListener("keyup", resizeBorder, false);

        document.getElementById(elementID + "TL").removeEventListener("mousedown", resizeBubbleStart, false);
        document.getElementById(elementID + "T").removeEventListener("mousedown", resizeBubbleStart, false);
        document.getElementById(elementID + "TR").removeEventListener("mousedown", resizeBubbleStart, false);

        document.getElementById(elementID + "L").removeEventListener("mousedown", resizeBubbleStart, false);
        document.getElementById(elementID + "R").removeEventListener("mousedown", resizeBubbleStart, false);

        document.getElementById(elementID + "BL").removeEventListener("mousedown", resizeBubbleStart, false);
        document.getElementById(elementID + "B").removeEventListener("mousedown", resizeBubbleStart, false);
        document.getElementById(elementID + "BR").removeEventListener("mousedown", resizeBubbleStart, false);

        document.getElementById("resizerCanvas").removeChild(document.getElementById(resizerArray[i]));
    }
}

// Misc

function bubbleMappperTutorial(command) {
    if (command == "close") {
        //document.body.removeChild(document.getElementById("warningANDinstructions"));
        document.getElementById("warningANDinstructions").style.display = "none";
    }
    if (command == "open") {
        document.getElementById("warningANDinstructions").style.display = "block";
    }
}