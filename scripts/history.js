function addHistory(elementInput,command,options) {
    // Adds to the history based on commands sent
    // Commands: create, move, connect, color, delete
    
    /* historyData is an array of objects that contain arrays of objects
    
    historyData --> Array
    historyData[0] --> First item in historyData (an object)
    historyData[0].history --> the history(s) contained in the object (an array)
    historyData[0].history[0] --> the first history item in the array (an object)
    historyData[0].history[0].id --> the id of the object changed in the first history item
    
    */
    if (command == "create") { // Create makes a bubble
        var obj = {
            note: "",
            history: [{
                note: "bubble created",
                id: elementInput.id
                //left: elementInput.style.left,
                //top: elementInput.style.top,
                //backgroundColor: elementInput.style.backgroundColor,
                //fontColor: elementInput.style.color,
                //content: elementInput.innerHTML.replace(/\n/g,"")
            }]
        };
        historyData.push(obj);
    }
    
    if (command == "connect") { // Connect makes a path
        var obj = {
            note: "",
            history: [{
                note: "path created",
                id: elementInput.id
                //strokeColor: elementInput.style.stroke,
                //d: elementInput.getAttribute("d")
            }]
        };
        historyData.push(obj);
    }
    
    /*
    
    if (command == "move") { // Move shifts the position of a bubble and it's connecting paths
        var objectMoved = true; // The variable that checks for 
        
        // Bubble moving

        // Scrolls backwards through arrays -- the for loop cycles through every entry in the 
        // array. The (second) if checks if the arrays id matches the moved bubble (and that
        // the entry has left and top position entries). The next if checks to see if the 
        // bubble has moved since the last position data was saved. If that's the case, it then
        // checks if it can remove the entry and replace it (based on if the script encountered
        // an entry with a note that wasn't "moved.") Regardless of the last if, it then inserts
        // a new entry at the end, and finally breaks the loop, preventing it from finishing 
        // the cycles (since they're now unnecessary.)
        
        // Yup... some complex bullshit. Blah.
        
        for (var a = (historyData.length - 1); historyData[a] != undefined; a--) { // Recurse through array
            if (historyData[a].historyNote != "moved") objectMoved = false;
            if (historyData[a].id == elementInput.id && historyData[a].left && historyData[a].top) {
                if (historyData[a].left != elementInput.style.left || historyData[a].top != elementInput.style.top) {
                    if (objectMoved == true) historyData.splice(a,1);
                    var obj = {
                        historyNote: "moved",
                        historyObject: "bubble",
                        id: elementInput.id,
                        left: elementInput.style.left,
                        top: elementInput.style.top
                    };
        
                    historyData.push(obj);
                }
                break;
            }
        }
    
        // Path moving 
        
        // The path entry script is basically the same as the bubble one, except it's all 
        // stuffed inside two for loops that check for every possible path that could've moved.
        
        for (var t = 1; t < 3; t++) {
            if (t == 1) bubbleTobubbleArray = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp("\\b" + elementInput.id + "TObubble\\d+\\b","g"));
            if (t == 2) bubbleTobubbleArray = document.getElementById("pathCanvasShell").innerHTML.match(new RegExp("\\bbubble\\d+TO" + elementInput.id + "\\b","g"));
            for (var i = 0; bubbleTobubbleArray != null && bubbleTobubbleArray[i] != undefined; i++) {
                objectMoved = true;
                for (var a = (historyData.length - 1); historyData[a] != undefined; a--) { // Recurse through array
                    if (historyData[a].historyNote != "moved") objectMoved = false;
                    if (historyData[a].id == bubbleTobubbleArray[i] && historyData[a].d) {
                        if (historyData[a].d != document.getElementById(bubbleTobubbleArray[i]).getAttribute("d")) {
                            if (objectMoved == true) historyData.splice(a,1);
                            var obj = {
                                historyNote: "moved",
                                historyObject: "path",
                                id: bubbleTobubbleArray[i],
                                d: document.getElementById(bubbleTobubbleArray[i]).getAttribute("d")
                            };
                            historyData.push(obj);
                        }
                        break;
                    }
                }
            }
        }
    }
    */

    /*if (command == "edit") { // Edit changes the internal text of a bubble
        var obj = {
            note: "",
            history: [{
                note: "bubble deleted",
                id: elementInput.id,
                content: elementInput.innerHTML.replace(/\n/g,"")
            }]
        };
        historyData.push(obj);
    }*/
    
    /*
    
    Must add detection for color change
    
    if (command == "color") { // Color changes the 
        if (elementInput.id.match(/^bubble\d$/) != null) {
            var obj = {
                historyNote: "colored",
                historyObject: "bubble",
                id: elementInput.id,
                backgroundColor: elementInput.style.backgroundColor,
                fontColor: elementInput.style.color
            };
            historyData.push(obj);
        } else {
            var obj = {
                historyNote: "colored",
                historyObject: "path",
                id: elementInput.id,
                strokeColor: elementInput.style.stroke
            };
            historyData.push(obj);
        }
    }
    
    */
    
    if (command == "delete") {
        if (elementInput.id.match(/^bubble\d$/) != null) {
            var obj = {
                note: "",
                history: [{
                    note: "bubble deleted",
                    id: elementInput.id,
                    left: elementInput.style.left,
                    top: elementInput.style.top,
                    backgroundColor: elementInput.style.backgroundColor,
                    fontColor: elementInput.style.color,
                    content: elementInput.innerHTML.replace(/\n/g,"")
                }]
            };
        } else {
            var obj = {
                note: "",
                history: [{
                    note: "path deleted",
                    id: elementInput.id,
                    strokeColor: elementInput.style.stroke,
                    d: elementInput.getAttribute("d")
                }]
            };
            
        }
        
        if (options == "addon") {
            historyData[historyData.length - 1].history.push(obj.history[0]);
        } else {
            historyData.push(obj);
        }
    }
    
    document.getElementById("history").innerHTML = JSON.stringify(historyData);
}

function undoAction() {
    for (var a = (historyData.length - 1); historyData[a] != undefined; a--) {
        if (historyData[a].note != "undone") {
            for (var b = 0; historyData[a].history[b] != undefined; b++) {
                var note = historyData[a].history[b].note;
                if (note == "bubble created") { 
                    var element = document.getElementById(historyData[a].history[b].id);
                    deleteBubble(element,"ignore");
                    historyData[a].note = "undone";
                } 
            
                else if (note == "path created") { 
                    var element = historyData[a].history[b].id;
                    deletePath(element,"ignore");
                    historyData[a].note = "undone";
                } 
            
                else if (note == "bubble deleted") {
                    var theBubble = document.createElement("div");
                    
                    theBubble.id = historyData[a].history[b].id;
                    theBubble.style.top = historyData[a].history[b].top;
                    theBubble.style.left = historyData[a].history[b].left;
                    theBubble.style.backgroundColor = historyData[a].history[b].backgroundColor;
                    theBubble.style.fontColor = historyData[a].history[b].fontColor;
                    
                    theBubble.innerHTML = historyData[a].history[b].content;

                    theBubble.className = "bubble";
                    theBubble.setAttribute("class","bubble");

                    document.getElementById("bubbleCanvas").appendChild(theBubble);
                
                    historyData[a].note = "undone";
                }
                
                else if (note == "path deleted") {
                    var addPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

                    addPath.id = historyData[a].history[b].id;
                    addPath.style.strokeColor = historyData[a].history[b].strokeColor;
                    addPath.setAttribute("d",historyData[a].history[b].d);

                    addPath.className = "path";
                    addPath.setAttribute("class","path");

                    document.getElementById("pathCanvas").appendChild(addPath);
                
                    historyData[a].note = "undone";
                }
            }
            break;
        }
    }
}