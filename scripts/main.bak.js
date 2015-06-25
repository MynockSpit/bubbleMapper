/* 

Known Bugs:

Holding & Releasing on the canvas after having selected a bubble creates a new bubble with the object toolbar
 - it opens on mouse up
Clicking a path doesn't open the objecttoolbar

*/

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

/* Testing & Output Functions */

function test1(theContent) {
    document.getElementById("testAreaDivBox").innerHTML = theContent;
}

function test2(theContent) {
    document.getElementById("testAreaDivBox2").innerHTML = theContent;
}

function displaySelection() {
    // Select test function, not needed for anything, really.
    
    var objects;

    // Display currently selected objects
    document.getElementById("currentMap").innerHTML = "";
    for (objects in selectedObjects) {
        document.getElementById("currentMap").innerHTML += selectedObjects[objects].kind + " " + objects + " " + selectedObjects[objects].element.id + "<br>";
    }
}

/* Run on open... */

window.onload = function() {
    document.addEventListener("keydown", getKeyDown, false);
    document.addEventListener("mousedown", getMouseDown, false);

    if (localStorageExists() === true) {
        if (localStorage.getItem("currentBubbles") != null || 
            localStorage.getItem("currentPaths") != null > 2) {
            bubbleMappperTutorial("close");
            document.getElementById("reloadConfirmationBox").style.display = "block";
        }
    }
    else {
        alert("Your browser is not compatible with LocalStorage. Click here to find out what this means.");
    }
}

function localStorageExists(){
    var test = 'test';
    try {
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
}

/* Get input -- Optimized for object-based multi-select */

function getMouseDown(event) {
    var doubleClickTimer,
        clickAndHoldTimer;
        
    // If a dialog box is open, prevent clicks of any variety
    if (document.getElementById("reloadConfirmationBox").style.display != "block" &&
        document.getElementById("saveDialogBox").style.display != "block") {

        eventGlobal = event || window.event;

        // If left-clicking...
        if (eventGlobal.button == 0) {
            
            // Increments the click number on each click
            clickNumber++;

            // If this is the first click...
            if (clickNumber == 1) {
                
                // Set up double-click timer and fail options
                doubleClickTimer = setTimeout(clearDoubleClick,275);
                
                document.addEventListener("mousemove", clearDoubleClick, false);

                // Set up click-and-hold timer and fail options
                clickAndHoldTimer = setTimeout(
                    function() {
                        startBoxSelection(); // Box select was started on first click -- kill it
                        clearClickAndHold();
                        doubleClick();
                    },500);
                
                document.addEventListener("mousemove", clearClickAndHold, false);
                document.addEventListener("mouseup", clearClickAndHold, false);
                
                // Fire single-click action
                singleClick();
            }

            // If this is the second click...
            else if (clickNumber == 2) {
                // Clear the click data
                clearDoubleClick();
                
                // Fire double click action
                doubleClick();
            }
            
            // Functions used for clearing double-click and click-and-hold data
            function clearDoubleClick() {
                clickNumber = 0;
                clearTimeout(doubleClickTimer);
                document.removeEventListener("mousemove", clearDoubleClick, false);
            }

            function clearClickAndHold() {
                clearTimeout(clickAndHoldTimer);

                document.removeEventListener("mousemove", clearClickAndHold, false);
                document.removeEventListener("mouseup", clearClickAndHold, false);
            }
        }
    }
}

function singleClick() {

    // Checks for a click on the canvas
    if (eventGlobal.target.tagName == "svg") {
        
        // If you're not trying to connect bubbles, deselect any selected bubbles or paths
        if (!document.getElementById("pathCanvasShell").innerHTML.match(/bubble\d+connecter/) &&
            eventGlobal.shiftKey === false) deselectObject();

        // Close the bubbleResizer if mass resizing (Don't like how this is implimented)
        if (document.getElementById("resizerCanvas").innerHTML != "") closeResizer();

        // If a bubble is being edited, save and select it
        if (bubbleBeingEdited) saveBubble();
        
        // Start the start of box selection (if warningANDinstructions isn't up)
        if (document.getElementById("warningANDinstructions").style.display == "none") startBoxSelection();
    }

    // Checks for a click on a bubble
    else if (eventGlobal.target.id.match(/^bubble\d+$/g)) {
        
        test2(eventGlobal.shiftKey === true);

        // Close the path connecter if it's open        
        if (document.getElementById("pathCanvasShell").innerHTML.match(/bubble\d+connecter/)) closePathConnecter(eventGlobal);

        // Check that current object is not already selected
        if (checkSelection() == false) {

            // If shift isn't clicked, select just this object
            if (eventGlobal.shiftKey === false) selectObject(eventGlobal.target); 

            // If shift is pressed, add this object to selection
            else if (eventGlobal.shiftKey === true) selectObject(eventGlobal.target,false);
        }

        // If there is no bubble being edited, go ahead and move it
        if (!bubbleBeingEdited) moveBubbleStart();

        // If there's a bubble being edited, but it's not the target of the click, save it and move the new one
        else if (bubbleBeingEdited.id != eventGlobal.target.id) {
            saveBubble();
            moveBubbleStart();
        }
    } 

    // Checks for a click on a path
    else if (eventGlobal.target.id.match(/^bubble\d+TObubble\d+$/g)) {

        // Check that current object is not already selected
        if (checkSelection() == false) {
            
            // If shift isn't clicked, select just this object
            if (eventGlobal.shiftKey == false) selectObject(eventGlobal.target); 

            // If shift is pressed, add this object to selection
            else if (eventGlobal.shiftKey == true) selectObject(eventGlobal.target,false);
        }
    }

    else if (eventGlobal.target.id == "pathConnecter") {

        // Open the path connecter
        openPathConnecter();

        // Set up the click-and-hold timer for the connecter
        clickAndHoldTimer = setTimeout(
            function(){
                document.removeEventListener("mouseup", togglePathConnectionMode, false);
                document.addEventListener("mouseup", closePathConnecter, false);
            },100);

        document.addEventListener("mouseup", togglePathConnectionMode, false);
    }

    // Begin menu item detection

    else if (eventGlobal.target.id == "loadFile_menuItem") {
        triggerFileInput(eventGlobal);
    }

    else if (eventGlobal.target.id == "saveFile_menuItem") {
        saveFile();
    }    
}

function doubleClick() {
    
    // Close the bubble mapper tutorial pane
    if (document.getElementById("warningANDinstructions")) bubbleMappperTutorial("close");

    test1(!eventGlobal.target.id.match(/^bubble\d+$/g));
    
    // Create or edit a bubble (if clicking on the canvas or on a bubble being edited)
    if (eventGlobal.target.tagName == "svg") createBubble();
    else if (eventGlobal.target.id.match(/^bubble\d+$/g)) editObject();
}

function getKeyDown(event) {
    eventGlobal = event || window.event;

    // Keys repeat while pressed down... so if I want 'X' to happen on first keydown,
    // then something else to happen on the next keydown, I'm going to need to add a
    // timer of some sort to make it work.

    // Checks for return or enter
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

    // Checks for delete or backspace
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

    // Checks for Control + Z or Command + Z
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

    // Checks for Control + S or Command + S
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

    // Checks for Control or Command + L or O (only Control + L works in Safari on Mac) 
    else if ((eventGlobal.keyCode == 76 || eventGlobal.keyCode == 79) && 
             (eventGlobal.ctrlKey == true || eventGlobal.metaKey == true)) {
        event.preventDefault();

        if (document.getElementById("reloadConfirmationBox").style.display != "block" &&
            document.getElementById("saveDialogBox").style.display != "block") {

            triggerFileInput(eventGlobal);
        }
    }
    
    else if ((eventGlobal.keyCode == 65) && 
             (eventGlobal.ctrlKey == true || eventGlobal.metaKey == true)) {
        event.preventDefault();
        
        selectObject(,,false);

    }
}

/* Selection -- Optimized for object-based multi-select */

function selectObject(elementInput,clearSelection,toolbarMode) {    
    // Clear selection by default, if set to false, don't clear
    if (clearSelection !== false) deselectObject();

    // If there is no elementInput, select everything
    if (!elementInput) {
        var bubbles = document.getElementsByClassName("bubble");
        var paths = document.getElementsByClassName("path");

        for (var i = (bubbles.length - 1); bubbles[i] != undefined; i--) {
            // bubble is the name of the each of the bubble properties

            bubble = bubbles[i];

            selectObject(bubble,false,"none");
        }

        for (var i = (paths.length - 1); paths[i] != undefined; i--) {
            // path is the name of the each of the bubble properties

            path = paths[i];

            selectObject(path,false,"none");
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
    if (toolbarMode && toolbarMode != "none") {   
        // Open selection toolbars
        openObjectToolbar(toolbarMode);
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

function checkSelection(elementInput) {
    if (!elementInput) elementInput = eventGlobal.target;

    for (var objects in selectedObjects) {
        if (objects == elementInput.id) return true;
    }

    return false;
}

/* Box Selection -- Optimized for object-based multi-select */

function startBoxSelection() {
    var selectionBox = document.getElementById("boxSelectionBox");

    selectionBox.style.display = "block";

    selectionBox.style.top = eventGlobal.clientY + "px";
    selectionBox.style.bottom = (window.innerHeight - eventGlobal.clientY) + "px";
    selectionBox.style.left = eventGlobal.clientX + "px";
    selectionBox.style.right = (window.innerWidth - eventGlobal.clientX) + "px";

    document.addEventListener("mousemove", drawBoxSelection, false);
    document.addEventListener("mouseup", stopBoxSelection, false);
}

function drawBoxSelection(event) {
    var selectionBox = document.getElementById("boxSelectionBox");

    if (event.clientX > eventGlobal.clientX) {
        selectionBox.style.left = eventGlobal.clientX + "px";
        selectionBox.style.right = (window.innerWidth - event.clientX) + "px";
    } else {
        selectionBox.style.left = event.clientX + "px";
        selectionBox.style.right = (window.innerWidth - eventGlobal.clientX) + "px";
    }

    if (event.clientY > eventGlobal.clientY) {
        selectionBox.style.top = eventGlobal.clientY + "px";
        selectionBox.style.bottom = (window.innerHeight - event.clientY) + "px";
    } else {
        selectionBox.style.top = event.clientY + "px";
        selectionBox.style.bottom = (window.innerHeight - eventGlobal.clientY) + "px";
    }

    var selectionTop = parseInt(selectionBox.style.top),
        selectionBottom = window.innerHeight - parseInt(selectionBox.style.bottom),
        selectionLeft = parseInt(selectionBox.style.left),
        selectionRight = window.innerWidth - parseInt(selectionBox.style.right);


    var bubbles = document.getElementsByClassName("bubble");    
    for (var i = (bubbles.length - 1); bubbles[i] != undefined; i--) {
        // bubble is the name of the each of the bubble properties

        bubble = bubbles[i];

        var bubbleTop = parseInt(bubble.offsetTop),
            bubbleBottom = parseInt(bubble.offsetTop) + parseInt(bubble.offsetHeight),
            bubbleLeft = parseInt(bubble.offsetLeft),
            bubbleRight = parseInt(bubble.offsetLeft) + parseInt(bubble.offsetWidth);

        if ((bubbleBottom >= selectionTop && bubbleTop <= selectionBottom) && 
            (bubbleRight >= selectionLeft && bubbleLeft <= selectionRight)){
            selectObject(bubble,false,"none");
        } else {
            deselectObject(bubble);
        }
    }

    var paths = document.getElementsByClassName("path");
    for (var i = (paths.length - 1); paths[i] != undefined; i--) {
        // path is the name of the each of the bubble properties

        path = paths[i];

        var pathSplit = path.getAttribute("d").split(" ");

        var x1 = pathSplit[0].replace("M","").split(",")[0],
            y1 = pathSplit[0].replace("M","").split(",")[1],
            x2 = pathSplit[3].split(",")[0],
            y2 = pathSplit[3].split(",")[1];

        var pathTop = (y1 < y2) ? y1 : y2,
            pathBottom = (y1 > y2) ? y1 : y2,
            pathLeft = (x1 < x2) ? x1 : x2,
            pathRight = (x1 > x2) ? x1 : x2;

        if ((pathBottom >= selectionTop && pathTop <= selectionBottom) && 
            (pathRight >= selectionLeft && pathLeft <= selectionRight)){
            selectObject(path,false,"none");
        } else {
            deselectObject(path);
        }
    }
} 

function stopBoxSelection() {
    document.getElementById("boxSelectionBox").style.display = "none";

    document.removeEventListener("mousemove", drawBoxSelection, false);
    document.removeEventListener("mouseup", stopBoxSelection, false);

    openObjectToolbar();
}

/* Object Toolbar */

function openObjectToolbar(toolbarMode) {
    var top = window.innerHeight,
        left = window.innerWidth,
        bottom = 0,
        right = 0;

    var bubble = 0,
        path = 0;

    for (var objects in selectedObjects) {
        if (selectedObjects[objects].kind == "bubble") {
            bubble++;
            var element = selectedObjects[objects].element;

            // Sets outer bounds of elements selected
            if (element.offsetTop < top) top = element.offsetTop;
            if (element.offsetLeft < left) left = element.offsetLeft;
            if ((element.offsetTop + element.offsetHeight) > bottom) bottom = (element.offsetTop + element.offsetHeight);
            if ((element.offsetLeft + element.offsetWidth) > right) right = (element.offsetLeft + element.offsetWidth);
        }

        else if (selectedObjects[objects].kind == "path") {
            path++;
            var element = selectedObjects[objects].element.getAttribute("d").split(" ");

            var x1 = parseInt(element[0].replace("M","").split(",")[0]),
                y1 = parseInt(element[0].replace("M","").split(",")[1]),
                x2 = parseInt(element[3].split(",")[0]),
                y2 = parseInt(element[3].split(",")[1]);

            var pathTop = (y1 < y2) ? y1 : y2,
                pathBottom = (y1 > y2) ? y1 : y2,
                pathLeft = (x1 < x2) ? x1 : x2,
                pathRight = (x1 > x2) ? x1 : x2;            

            // Sets outer bounds of elements selected
            if (pathTop < top) top = pathTop;
            if (pathLeft < left) left = pathLeft;
            if (pathBottom > bottom) bottom = pathBottom;
            if (pathRight > right) right = pathRight;
        }
    }

    // If it's a single bubble
    // - Tri

    var vertical = ((bottom - top) / 2) + top;
    var horizontal = ((right - left) / 2) + left;

    if (bubble == 1 && path == 0) {
        document.getElementById("toolbarTriangle").style.display = "block";

        if (toolbarMode == "edit") {
            vertical = top - 47;
            document.getElementById("objectToolbarEdit").style.display = "block";
        } else {
            vertical = top - 37;
            document.getElementById("objectToolbarSelect").style.display = "block";
        }
    } else if (bubble >= 1 ||path >= 1) {
        vertical = vertical - 15;

        if (toolbarMode == "edit") {
            document.getElementById("objectToolbarEdit").style.display = "block";
        } else {
            document.getElementById("objectToolbarSelect").style.display = "block";
        }
    }

    var objectToolbars = document.getElementById("objectToolbarBox");

    objectToolbars.style.top = vertical + "px";            
    objectToolbars.style.left = horizontal - (objectToolbars.offsetWidth/2) + "px";

    // Move color picker if it's open too
    if (document.getElementById("colorPicker").style.display == "block") openColorPicker();
} // WIP, expect errors (this shit's a mess... but it works. Fix it?)

function closeObjectToolbar() {
    document.getElementById("objectToolbarEdit").style.display = "none";
    document.getElementById("objectToolbarSelect").style.display = "none";
    document.getElementById("toolbarTriangle").style.display = "none";

    closeColorPicker();
}


/* Bubbles -- Optimized for object-based multi-select */

function createBubble() {

    // Create temporary bubble
    var theBubbleInput = document.createElement("div");

    // Set attributes of bubble
    theBubbleInput.id = "bubble" + bubbleNumber;

    theBubbleInput.className = "bubble";
    theBubbleInput.setAttribute("class","bubble");

    // Make bubble editable (only works for most recent bubble currently)
    theBubbleInput.setAttribute("contenteditable", "true");
    theBubbleInput.innerHTML = "";

    // Append bubble to canvas
    document.getElementById("bubbleCanvas").appendChild(theBubbleInput);

    bubbleBeingEdited = {
        "id": theBubbleInput.id,
        "note": "create"
    }

    // Set after-the-fact attributes    
    theBubbleInput.style.top = eventGlobal.clientY - (theBubbleInput.offsetHeight/2) + "px";
    theBubbleInput.style.left = eventGlobal.clientX - (theBubbleInput.offsetWidth/2) + "px";

    // Select temporary bubble
    selectObject(theBubbleInput,true,"edit");

    // Open Editing Tools
    openResizer();
}

function editObject() {

    var theBubbleInput;    

    // Edit the bubble BUT ONLY IF only one bubble is selected
    if (Object.getOwnPropertyNames(selectedObjects).length == 1 &&
        Object.getOwnPropertyNames(selectedObjects)[0].match(/\bbubble\d+\b/)) {

        // Create temporary bubble
        bubbleBeingEdited = {
            "id": Object.getOwnPropertyNames(selectedObjects)[0],
            "note": "edit"
        }

        theBubbleInput = document.getElementById(bubbleBeingEdited.id);

        bubbleBeingEdited.content = theBubbleInput.innerHTML;

        // Make bubble editable
        theBubbleInput.setAttribute("contenteditable", "true");
    }

    closeObjectToolbar();

    // Open Editing Tools
    openObjectToolbar("edit");

    openResizer();

    displaySelection();
}

function saveBubble() {
    // Saves or cancels a bubble based on the emptiness of the bubble

    var theID = bubbleBeingEdited.id, 
        theNote = bubbleBeingEdited.note,
        element = document.getElementById(theID);

    // Save bubble if not blank
    if (element.innerHTML != "") {
        // Close Editing Tools
        closeObjectToolbar();
        closeResizer();

        // Save Bubble Content
        var theContent = ((element.innerHTML).replace(/<div>/g,"<br>")).replace(/<\/div>/g,"");

        // Increment bubbleNumber if the bubble was created
        if (bubbleBeingEdited.note == "create") bubbleNumber++;

        // Clear selection
        deselectObject();

        element.innerHTML = theContent;
        element.setAttribute("contenteditable", "false");

        // Select temporary bubble
        selectObject(element,true,"none");

        // Draw Paths
        drawPath(element);

        // Open object toolbar
        openObjectToolbar();

        // Store Current Data
        storeData(); //saveBubble()

        // Save History
        addHistory(element,theNote);

        // Clear editing selection
        bubbleBeingEdited = null;
    }

    else cancelBubble();

    displaySelection();
}

function cancelBubble() {
    // Cancel Bubble is a near copy of saveBubble with one exception --
    // it replaces new content with the old content

    var theID = bubbleBeingEdited.id, 
        theNote = bubbleBeingEdited.note,
        element = document.getElementById(theID);

    // Close Editing Tools
    closeObjectToolbar();
    closeResizer();

    // For New or Old Bubble
    if (theNote == "create") {
        // Remove bubble
        document.getElementById("bubbleCanvas").removeChild(element);

        // Clear selection
        deselectObject();
    }
    else {
        // Replace with old content
        element.innerHTML = bubbleBeingEdited.content;
        element.setAttribute("contenteditable", "false");

        // Select saved bubble
        selectedObjects(element);

        // Draw Paths
        drawPath(element);

        // Open object toolbar
        openObjectToolbar();
    }

    // Clear editing selection
    bubbleBeingEdited = null;

    displaySelection();
}

/* Paths -- Optimized for object-based multi-select */

function openPathConnecter() {

    var addPath;

    // Hide the object toolbar
    closeObjectToolbar();

    for (var objects in selectedObjects) {
        if (selectedObjects[objects].kind == "bubble") {

            addPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            addPath.id = objects + "connecter";

            addPath.className = "connecterPath"; // Doesn't work in some browsers (but only on SVG)
            addPath.setAttribute("class","connecterPath");

            document.getElementById("pathCanvas").appendChild(addPath);

            document.addEventListener("mousemove", drawPathConnecter, false);            
        }
    }

    // Draw path connecter after all paths have been crated
    drawPathConnecter();
}

function togglePathConnectionMode() {
    clearTimeout(clickAndHoldTimer);

    document.removeEventListener("mouseup", togglePathConnectionMode, false);        
}

function drawPathConnecter(event) {
    eventGlobal = (event || window.event) ? event || window.event : eventGlobal;

    for (var objects in selectedObjects) {
        if (selectedObjects[objects].kind == "bubble") {

            var element = document.getElementById(objects),
                connecterPath = document.getElementById(objects + "connecter");

            var pathPoint1x = element.offsetLeft + (element.offsetWidth/2),
                pathPoint1y = element.offsetTop + (element.offsetHeight/2);

            connecterPath.setAttributeNS(null,"d","M" + pathPoint1x + "," + pathPoint1y + " L" + eventGlobal.clientX + "," + eventGlobal.clientY);

            var elementUnderCursor = document.elementFromPoint(eventGlobal.clientX, eventGlobal.clientY);

            if (elementUnderCursor && elementUnderCursor.id.match(/^bubble\d+$/g)) {
                // Checks to make sure object isn't selected
                if (!selectedObjects[elementUnderCursor.id]) {        

                    // Adds styling to bubble
                    elementUnderCursor.style.border = "2px solid rgba(0,0,0,.24)"; // Adds styling to bubble
                    elementUnderCursor.style.padding = "3px 8px";
                    elementUnderCursor.style.boxShadow = "0px 2px 4px rgba(0,0,0,.36)";

                    // Adds event listener for mouseout state
                    elementUnderCursor.addEventListener("mouseout", clearMouseOver, false);
                }
            }
        }
    }
}

function clearMouseOver(event) {

    // Checks to make sure object isn't selected
    if (!selectedObjects[event.target.id]) {

        // Removes styling from bubble
        event.target.style.border = "";
        event.target.style.padding = "";
        event.target.style.boxShadow = "";

        // Removes event listener
        event.target.removeEventListener("mouseout", clearMouseOver, false);
    }
}

function closePathConnecter(event) {
    document.removeEventListener("mousemove", drawPathConnecter, false);
    document.removeEventListener("mouseup", closePathConnecter, false);

    var elementUnderCursor = document.elementFromPoint(eventGlobal.clientX, eventGlobal.clientY);
    if (elementUnderCursor && elementUnderCursor.id.match(/^bubble\d+$/g)) createPath(elementUnderCursor.id);
    else openObjectToolbar();

    var connecterPaths;
    if (connecterPaths = document.getElementById("pathCanvasShell").innerHTML.match(/\bbubble\d+connecter\b/g)) {
        for (var n = 0; connecterPaths[n]; n++) {
            document.getElementById("pathCanvas").removeChild(document.getElementById(connecterPaths[n]));
        }
    }
}

function createPath(bubbleTo,bubbleFrom) {
    if (!bubbleFrom) 
        for (var objects in selectedObjects) {
            if (selectedObjects[objects].kind == "bubble") 
                createPath(bubbleTo,objects);
        }

    else {
        var pathText = document.getElementById("pathCanvasShell").innerHTML;

        // Checks to see if this link already exists.
        if ((pathText.indexOf("\"" + bubbleFrom + "TO" + bubbleTo + "\"") == -1) && 
            (pathText.indexOf("\"" + bubbleTo + "TO" + bubbleFrom + "\"") == -1)) {

            // Create new path node
            var addPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

            addPath.id = bubbleFrom + "TO" + bubbleTo;

            addPath.className = "path";
            addPath.setAttribute("class","path");

            // Calculate path coordinates
            drawPath(addPath);

            // Add path to the canvas
            document.getElementById("pathCanvas").appendChild(addPath);

            // Store Path Data
            storeData(); //createPath()

            // Add history item
            addHistory(addPath,"connect");
        }
    }
}

function drawPath(elementInput) {
    // This just got a lot more complex (and simpler). Basically, this function checks for a
    // bubble or a path. If the elementInput is a path, it draws it, if it's a bubble, it gets
    // the paths connected to the bubble and then calls itself again. Since it's now sending
    // itself a path, it draws it. Clever, if I may say so myself. :D

    if (elementInput.id.match(/^bubble\d+TObubble\d+$/g)) {
        var pathTo = document.getElementById(elementInput.id.split("TO")[0]),
            toPath = document.getElementById(elementInput.id.split("TO")[1]);

        // Path (SVG Curve) Coordinates
        // Example: Mx,y Cx,y x,y x,y
        // M(starting point) C(first anchor) (second anchor) (end point)

        var pathPoint1y = toPath.offsetTop + (toPath.offsetHeight/2),
            pathPoint1x = toPath.offsetLeft + (toPath.offsetWidth/2),
            pathPoint2y = pathTo.offsetTop + (pathTo.offsetHeight/2),
            pathPoint2x = pathTo.offsetLeft + (pathTo.offsetWidth/2);

        elementInput.setAttributeNS(null,"d","M" + pathPoint1x + "," + pathPoint1y + " C" + pathPoint2x + "," + pathPoint1y + " " + pathPoint1x + "," + pathPoint2y + " " + pathPoint2x + "," + pathPoint2y);
    } 

    else if (elementInput.id.match(/^bubble\d+$/g)) {
        // The outer "for" loop runs the inner code twice, (t == 1 and t == 2 representing
        // code to do on the first time and second times. The inner for loop checks for path ids
        // by matching internal html of the pathCanvasShell with the pattern paths.

        // If the RegExp doesn't match anything, it returns null, and therefore the array has data, 
        // albeit null data thus, if the array isn't null, continue on.

        for (var t = 1; t < 3; t++) {
            if (t == 1) bubbleTobubbleArray = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp(elementInput.id + "TObubble\\d+","g"));
            if (t == 2) bubbleTobubbleArray = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp("bubble\\d+TO" + elementInput.id + "\\b","g"));
            for (var i = 0; bubbleTobubbleArray != null && bubbleTobubbleArray[i] != undefined; i++) {
                drawPath(document.getElementById(bubbleTobubbleArray[i]));
            }
        }        
    }
}

/* Bubbles & Paths -- Optimized for object-based multi-select */

function deleteObject(elementInput,historyOptions) {

    // If an element isn't specified...
    if (!elementInput) // Test for selection...
        for (var objects in selectedObjects) {
            deleteObject(selectedObjects[objects].element,historyOptions);
        }

    else if (elementInput) {
        // First, deselect the object
        deselectObject(elementInput);

        // Add the

        if (historyOptions == "addon") addHistory(elementInput,"delete","addon");
        else if (historyOptions != "ignore") addHistory(elementInput,"delete");

        elementInput.parentElement.removeChild(elementInput);

        if (elementInput.id.match(/bubble\d+/)) {
            var bubbleTobubbleArray;

            /* Get and delete the bubble's connections (less easy)

            // The outer "for" loop runs the inner code twice, with t == 1 and t == 2 representing
            // code to do on the first time and second times. The inner for loop checks for path ids
            // by matching internal html of the pathCanvasShell with the pattern paths.

            // The code then deletes the matched elements */

            for (var t = 1; t < 3; t++) {            
                if (t == 1) bubbleTobubbleArray = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp(elementInput.id + "TObubble\\d+","g"));
                if (t == 2) bubbleTobubbleArray = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp("bubble\\d+TO" + elementInput.id + "\\b","g"));
                for (var i = 0; bubbleTobubbleArray != null && bubbleTobubbleArray[i] != undefined; i++) {
                    deleteObject(document.getElementById(bubbleTobubbleArray[i]),"addon");
                }
            }
        }

        // Store Current Data
        storeData(); //deleteObject()
    }
}

/* Movement (Bubbles) -- Optimized for object-based multi-select */

function moveBubbleStart() {
    document.addEventListener("mousemove", moveBubble, false);
    document.addEventListener("mouseup", moveBubbleStop, false);    
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

    storeData(); //moveBubbleStop()
}

/* Selection Border */

function openResizer() {
    for (var objects in selectedObjects) {
        if (objects.match(/^bubble\d+$/)) {
            createResizer(objects);

            resizeBorder(null,objects);
        }
    }
}

function createResizer(idInput) {
    var resizeBox = document.createElement("div"); resizeBox.id = idInput + "resizer"; resizeBox.className = "resizer"

    document.getElementById("resizerCanvas").appendChild(resizeBox);

    var arrowTL = document.createElement("div"); arrowTL.id = idInput + "TL"; arrowTL.className = "arrow arrowTL";
    var arrowT = document.createElement("div"); arrowT.id = idInput + "T"; arrowT.className = "arrow arrowT";
    var arrowTR = document.createElement("div"); arrowTR.id = idInput + "TR"; arrowTR.className = "arrow arrowTR";

    var arrowL = document.createElement("div"); arrowL.id = idInput + "L"; arrowL.className = "arrow arrowL";
    var arrowR = document.createElement("div"); arrowR.id = idInput + "R"; arrowR.className = "arrow arrowR";

    var arrowBL = document.createElement("div"); arrowBL.id = idInput + "BL"; arrowBL.className = "arrow arrowBL";
    var arrowB = document.createElement("div"); arrowB.id = idInput + "B"; arrowB.className = "arrow arrowB";
    var arrowBR = document.createElement("div"); arrowBR.id = idInput + "BR"; arrowBR.className = "arrow arrowBR";

    resizeBox.appendChild(arrowTL).appendChild(document.createElement("div"));
    resizeBox.appendChild(arrowT).appendChild(document.createElement("div"));
    resizeBox.appendChild(arrowTR).appendChild(document.createElement("div"));

    resizeBox.appendChild(arrowL).appendChild(document.createElement("div"));
    resizeBox.appendChild(arrowR).appendChild(document.createElement("div"));

    resizeBox.appendChild(arrowBL).appendChild(document.createElement("div"));
    resizeBox.appendChild(arrowB).appendChild(document.createElement("div"));
    resizeBox.appendChild(arrowBR).appendChild(document.createElement("div"));

    document.getElementById(idInput).addEventListener("keyup", resizeBorder, false);

    document.getElementById(idInput + "TL").addEventListener("mousedown", resizeBubbleStart, false);
    document.getElementById(idInput + "T").addEventListener("mousedown", resizeBubbleStart, false);
    document.getElementById(idInput + "TR").addEventListener("mousedown", resizeBubbleStart, false);

    document.getElementById(idInput + "L").addEventListener("mousedown", resizeBubbleStart, false);
    document.getElementById(idInput + "R").addEventListener("mousedown", resizeBubbleStart, false);

    document.getElementById(idInput + "BL").addEventListener("mousedown", resizeBubbleStart, false);
    document.getElementById(idInput + "B").addEventListener("mousedown", resizeBubbleStart, false);
    document.getElementById(idInput + "BR").addEventListener("mousedown", resizeBubbleStart, false);
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

    storeData(); //closeResizer()
}

/* Color Picker -- Optimized for objcet-based multi-select (mostly) */

function toggleColorPicker() {
    if (document.getElementById("colorPicker").style.display != "block") {
        openColorPicker();
    } else {
        closeColorPicker();
    }
}

function openColorPicker() {
    var element = document.getElementById("objectToolbarBox"),
        top = (element.offsetTop + (element.offsetHeight/2) - (88 + 21)),
        left = (element.offsetLeft + (element.offsetWidth/2) - 133);

    document.getElementById("colorPicker").style.display = "block";
    document.getElementById("colorPicker").style.top = top + "px";
    document.getElementById("colorPicker").style.left = left + "px";

    document.getElementById("colorRedBox").value = 127;
    document.getElementById("colorRedSlider").value = 127;

    document.getElementById("colorGreenBox").value = 127;
    document.getElementById("colorGreenSlider").value = 127;

    document.getElementById("colorBlueBox").value = 127;
    document.getElementById("colorBlueSlider").value = 127;

    document.getElementById("colorPreview").style.background = "rgb(" + 
        document.getElementById("colorRedBox").value + "," + 
        document.getElementById("colorGreenBox").value + "," + 
        document.getElementById("colorBlueBox").value + ")";

    document.getElementById("colorRedSlider").addEventListener("change", calculateColors, false);
    document.getElementById("colorGreenSlider").addEventListener("change", calculateColors, false);
    document.getElementById("colorBlueSlider").addEventListener("change", calculateColors, false);

    document.getElementById("colorRedBox").addEventListener("keydown", calculateColors, false);
    document.getElementById("colorGreenBox").addEventListener("keydown", calculateColors, false);
    document.getElementById("colorBlueBox").addEventListener("keydown", calculateColors, false);

    document.getElementById("colorRedBox").addEventListener("keyup", calculateColors, false);
    document.getElementById("colorGreenBox").addEventListener("keyup", calculateColors, false);
    document.getElementById("colorBlueBox").addEventListener("keyup", calculateColors, false);
    // Set history? Odd.
    //if ((selectedObjects[numberOfObjects-1].element)) addHistory((selectedObjects[numberOfObjects-1].element),"color");
}

function calculateColors() {
    for (var objects in selectedObjects) {

        var selectedElement = selectedObjects[objects],
            inputColor = this.value.replace(/\D/g,"");

        if (inputColor > 255) inputColor = 255;
        else if (inputColor < 0) inputColor = 0;
        else if (event.keyCode == 38) inputColor++;
        else if (event.keyCode == 40) inputColor--;

        if (this.id.match(/\wRed\w/g)) {
            document.getElementById("colorRedBox").value = inputColor;
            document.getElementById("colorRedSlider").value = inputColor;
        } else if (this.id.match(/\wGreen\w/g)) {
            document.getElementById("colorGreenBox").value = inputColor;
            document.getElementById("colorGreenSlider").value = inputColor;
        } else if (this.id.match(/\wBlue\w/g)) {
            document.getElementById("colorBlueBox").value = inputColor;
            document.getElementById("colorBlueSlider").value = inputColor;
        }

        var rgbRed = document.getElementById("colorRedBox").value, 
            rgbGreen = document.getElementById("colorGreenBox").value,
            rgbBlue = document.getElementById("colorBlueBox").value;

        if (selectedElement.kind == "bubble") {
            selectedElement.element.style.background = "rgb(" + rgbRed + "," + rgbGreen + "," + rgbBlue + ")";
            selectedElement.element.style.color = (((rgbRed + rgbGreen + rgbBlue) / 3) >= 127) ? "black" : "white";
        } 

        else if (selectedElement.kind == "path") {
            selectedElement.element.style.stroke = "rgb(" + rgbRed + "," + rgbGreen + "," + rgbBlue + ")";
        }

        document.getElementById("colorPreview").style.background = "rgb(" + rgbRed + "," + rgbGreen + "," + rgbBlue + ")";
    }
}

function closeColorPicker() {
    document.getElementById("colorPicker").style.display = "none";

    document.getElementById("colorRedSlider").removeEventListener("change", calculateColors, false);
    document.getElementById("colorGreenSlider").removeEventListener("change", calculateColors, false);
    document.getElementById("colorBlueSlider").removeEventListener("change", calculateColors, false);

    document.getElementById("colorRedBox").removeEventListener("keydown", calculateColors, false);
    document.getElementById("colorGreenBox").removeEventListener("keydown", calculateColors, false);
    document.getElementById("colorBlueBox").removeEventListener("keydown", calculateColors, false);

    document.getElementById("colorRedBox").removeEventListener("keyup", calculateColors, false);
    document.getElementById("colorGreenBox").removeEventListener("keyup", calculateColors, false);
    document.getElementById("colorBlueBox").removeEventListener("keyup", calculateColors, false);

    storeData(); //closeColorPicker()
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