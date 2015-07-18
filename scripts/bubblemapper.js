window.addEventListener("load", function load_bubbleMapper() {
    window.removeEventListener("load", load_bubbleMapper, false);
    bubbleMapper.initialize();
},false);

var bubbleMapper = {
    /*

    This is a very complex and overlapping script. I've tried to keep each part as discrete as possible, but some things you just can't help.

    getKeyDown, getMouseDown, and getTouchEvent start most generic functions

    Bubbles (specifically creating, editing and moving them) are triggered by getMouseDown.

    Selection is triggered by getMouseDown and getKeyDown (and bubble.create)

    */

    initialize: function() {
        // Set up key command handler
        document.addEventListener("keydown", bubbleMapper.getKeyDown, false);

        // Set up mouse event handler
        document.addEventListener("mousedown", bubbleMapper.getMouseDown, false);

        // Set up tutorial
        bubbleMapper.tutorial.start();

        // Check for workingFile
        bubbleMapper.workingFile.check();
    },

    event: null,

    clickInfo: {
        time: new Date(),
        click: 0,
    },

    // Test functions -- return true or false based on things.
    targetType: function(target) {

        var target_tag = (typeof(target.tagName) != "object") ? target.tagName.toLowerCase() : null,
            target_class = (typeof(target.className) != "object") ? target.className : null,
            target_id = (typeof(target.id) != "object") ? target.id : null;

        if (target_tag) {
            if (target_tag == "svg") return "canvas";
            if (target_tag == "path" && !target_class) return "path"; // For connecting paths 'cause they don't have 
        }

        if (target_class) {
            if (target_class.match(/bubble/)) return "bubble";
            else if (target_class.match(/path/)) return "path";

            else if (target_class.match(/toolbar_item/)) return "toolbar";
            else if (target_class.match(/menubar_item/)) return "menubar";

            else if (target_class.match(/dialog_header/)) return "dialog_header";
            else if (target_class.match(/dialog_option/)) return "dialog_option";
        }

        if (target_id) return target_id;
    },

    exclusiveDialogs: function() {
        var dialogs = document.getElementsByClassName("dialog");

        for (var i = 0; dialogs && dialogs[i]; i++) {
            if (dialogs[i].style.display == "block") {
                if (dialogs[i].getAttribute("data-exclusive") == "true") {
                    return true;   
                }
            }
        }

        return false;
    },
    localStorage: function() {
        var test = 'test';
        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        }
        catch (error) {
            return false;
        }
    },

    getKeyDown: function(event) {},
    getMouseDown: function(event) {

        var event = event;

        bubbleMapper.event = event || window.event; // Store the current event (replaces eventGlobal)

        var time = new Date(),
            click = bubbleMapper.clickInfo.click,
            target = event.target;

        // Set Target
        var targetType = bubbleMapper.targetType(target);

        // Increment click count IF
        //      - less than 250 ms have passed AND
        //      - the mouse has not moved AND
        //      - the mouse has not been clicked more than 3 time

        click = (((time - bubbleMapper.clickInfo.time) < 250) &&
                 (event.clientX == bubbleMapper.clickInfo.xCoord || 
                  event.clientY == bubbleMapper.clickInfo.yCoord) &&
                 (click < 4)) ? (click + 1) : 1;

        // Now that clicking is out of the way, actually do stuff.
        if (event.button == 0) {
            if (click == 1) {
                // If possible, connect path...

                var bubbleBeingEdited = bubbleMapper.bubble.editee;

                if (bubbleBeingEdited != null && bubbleBeingEdited.id != target.id) 
                    bubbleMapper.bubble.save();

                if (bubbleMapper.bubble.editee == null && targetType == "bubble") 
                    bubbleMapper.bubble.move.prep(event);

                if (bubbleMapper.exclusiveDialogs() == false) {
                    // Selection controls
                    if (targetType == "bubble" || targetType == "path") {
                        if (event.shiftKey == 1) {
                            if (bubbleMapper.select.selected[target.id]) {
                                bubbleMapper.select.remove(target);
                            } else {
                                bubbleMapper.select.add(target);
                            }
                        }

                        else {
                            if (!bubbleMapper.select.selected[target.id]) {
                                if (JSON.stringify(bubbleMapper.select.selected).length > 2) {
                                    bubbleMapper.select.none();
                                }
                                bubbleMapper.select.add(target);
                            }
                        }
                    } 
                    else if (targetType == "canvas") {
                        if (event.shiftKey != 1) {
                            if (JSON.stringify(bubbleMapper.select.selected).length > 2) {
                                bubbleMapper.select.none(); 
                            }
                        }
                        bubbleMapper.select.box(event);
                    }
                }

                // Toolbar controls
                if (targetType == "toolbar") {
                    // Object toolbar
                    if (target.id == "edit_toolbarItem") {

                        var count = "";

                        for (var object in bubbleMapper.select.selected) {
                            var element = bubbleMapper.select.selected[object];
                            var type = bubbleMapper.targetType(element);

                            if (type == "bubble") count += "B";
                            else if (type == "path") count += "P";
                        }

                        if (count == "B") bubbleMapper.bubble.edit(element);
                    }
                    else if (target.id == "connect_toolbarItem") bubbleMapper.path.connecter.open(event);
                    else if (target.id == "style_toolbarItem") bubbleMapper.toolbar.display.generic("style");
                    else if (target.id == "delete_toolbarItem") bubbleMapper.delete.selected();

                    // Style toolbar
                    else if (target.id == "color_toolbarItem") bubbleMapper.toolbar.display.generic("color");
                    else if (target.id == "font_toolbarItem") bubbleMapper.toolbar.display.generic("font");
                    else if (target.id == "shape_toolbarItem") bubbleMapper.toolbar.display.generic("shape");
                }

                // Dialog controls
                if (targetType == "dialog_header" || targetType == "dialog_option") {

                    var dialog = target;
                    while (dialog.className != "dialog") {dialog = dialog.parentElement;}

                    // Move dialog function
                    if (targetType == "dialog_header") {}

                    // Reload Map dialog
                    else if (target.id == "discard_reloadDialog") bubbleMapper.dialog.reload.discard(); // Discard old map
                    else if (target.id == "reload_reloadDialog") bubbleMapper.dialog.reload.reload();
                }
            }

            else if (click == 2) {

                if (bubbleMapper.exclusiveDialogs() == false) {
                    // Double click is almost exclusively bubble creation or editing, so it's safe to preventDefault here.
                    event.preventDefault();

                    // If double-clicking the target, create a new bubble
                    if (targetType == "canvas") bubbleMapper.bubble.create();

                    // If double-clicking a bubble that isn't already being edited
                    else if (targetType == "bubble" && !target.getAttribute("contenteditable"))
                        bubbleMapper.bubble.edit(target);
                }
            }
        }

        // Store this click's click info for next time.
        bubbleMapper.clickInfo = {time: time, click: click, xCoord: event.clientX, yCoord: event.clientY};
    },
    getTouchEvent: function() {},

    select: {
        selected: {},

        add: function(element) {

            var type = bubbleMapper.targetType(element);

            if (type == "bubble") {
                element.style.border = "2px solid rgba(0,0,0,.48)"; // Adds styling to bubble
                element.style.padding = "3px 8px";
                element.style.boxShadow = "0px 3px 6px rgba(0,0,0,.48)";
            }

            else if (type == "path") {
                element.style.strokeWidth = "8px"; 
            }

            bubbleMapper.select.selected[element.id] = element;
            bubbleMapper.toolbar.display.object();

            bubbleMapper.select.display(); /* TESTING */
        },
        remove: function(element) {
            var type = bubbleMapper.targetType(element);

            if (type == "bubble") {
                element.style.border = ""; // Adds styling to bubble
                element.style.padding = "";
                element.style.boxShadow = "";
            }

            else if (type == "path") {
                element.style.strokeWidth = ""; 
            }

            delete bubbleMapper.select.selected[element.id];

            // This is a little confusing. The display.object function will check to if there's anything to display, and if not, it clears the display of everything.
            bubbleMapper.toolbar.display.object();

            bubbleMapper.select.display(); /* TESTING */
        },

        all: function() {
            var bubbles = document.getElementsByClassName("bubble");
            for (var i = 0; bubbles && bubbles[i]; i++) {
                bubbleMapper.select.add(bubbles[i]);
            }

            var paths = document.getElementsByClassName("path");
            for (var i = 0; paths && paths[i]; i++) {
                bubbleMapper.select.add(paths[i]);
            }
        },
        none: function() {
            var bubbles = document.getElementsByClassName("bubble");
            for (var i = 0; bubbles && bubbles[i]; i++) {
                bubbleMapper.select.remove(bubbles[i]);
            }

            var paths = document.getElementsByClassName("path");
            for (var i = 0; paths && paths[i]; i++) {
                bubbleMapper.select.remove(paths[i]);
            }
        },

        // Box and Shift don't quite work together.

        boxed: {},
        box: function(event) {

            var event = event || bubbleMapper.event;

            // Start box selection
            if (event.type == "mousedown") {
                var selectionBox = document.getElementById("boxSelectionBox");

                selectionBox.style.display = "block";

                selectionBox.style.top = event.clientY + "px";
                selectionBox.style.bottom = (window.innerHeight - event.clientY) + "px";
                selectionBox.style.left = event.clientX + "px";
                selectionBox.style.right = (window.innerWidth - event.clientX) + "px";

                document.addEventListener("mousemove", bubbleMapper.select.box, false);
                document.addEventListener("mouseup", bubbleMapper.select.box, false);
            }

            // Do the whole "selection" part of box selection
            else if (event.type == "mousemove") {

                var selectionBox = document.getElementById("boxSelectionBox");

                if (event.clientX > bubbleMapper.event.clientX) {
                    selectionBox.style.left = bubbleMapper.event.clientX + "px";
                    selectionBox.style.right = (window.innerWidth - event.clientX) + "px";
                } else {
                    selectionBox.style.left = event.clientX + "px";
                    selectionBox.style.right = (window.innerWidth - bubbleMapper.event.clientX) + "px";
                }

                if (event.clientY > bubbleMapper.event.clientY) {
                    selectionBox.style.top = bubbleMapper.event.clientY + "px";
                    selectionBox.style.bottom = (window.innerHeight - event.clientY) + "px";
                } else {
                    selectionBox.style.top = event.clientY + "px";
                    selectionBox.style.bottom = (window.innerHeight - bubbleMapper.event.clientY) + "px";
                }

                var selectionTop = parseInt(selectionBox.style.top),
                    selectionBottom = window.innerHeight - parseInt(selectionBox.style.bottom),
                    selectionLeft = parseInt(selectionBox.style.left),
                    selectionRight = window.innerWidth - parseInt(selectionBox.style.right);

                // Gets a list of all bubbles in on the map and checks to see if they're positioned inside the box.
                var bubbles = document.getElementsByClassName("bubble");    
                for (var i = (bubbles.length - 1); bubbles[i] != undefined; i--) {
                    // bubble is the name of the each of the bubble properties

                    var bubble = bubbles[i];

                    var bubbleTop = parseInt(bubble.offsetTop),
                        bubbleBottom = parseInt(bubble.offsetTop) + parseInt(bubble.offsetHeight),
                        bubbleLeft = parseInt(bubble.offsetLeft),
                        bubbleRight = parseInt(bubble.offsetLeft) + parseInt(bubble.offsetWidth);

                    var selectable = ((bubbleBottom >= selectionTop && bubbleTop <= selectionBottom) && 
                                      (bubbleRight >= selectionLeft && bubbleLeft <= selectionRight)) ? true : false;

                    // If can be selected, and 
                    if (selectable == true && !bubbleMapper.select.boxed[bubble.id]) {
                        bubbleMapper.select.add(bubble);
                        bubbleMapper.select.boxed[bubble.id] = true;
                    } 

                    else if (selectable == false && bubbleMapper.select.boxed[bubble.id]) {
                        bubbleMapper.select.remove(bubble);
                        delete bubbleMapper.select.boxed[bubble.id];
                    }
                }

                var paths = document.getElementsByClassName("path");
                for (var i = (paths.length - 1); paths[i] != undefined; i--) {
                    // path is the name of the each of the bubble properties

                    var path = paths[i];
                    var numbers = path.getAttribute("d").match(/\d+(\.\d+)?/g);

                    // If there are four numbers, it's a straight line
                    if (numbers.length == 4) {
                        var x1 = parseFloat(numbers[0],10),
                            y1 = parseFloat(numbers[1],10),
                            x2 = parseFloat(numbers[2],10),
                            y2 = parseFloat(numbers[3],10);
                    }

                    var pathTop = (y1 < y2) ? y1 : y2,
                        pathBottom = (y1 > y2) ? y1 : y2,
                        pathLeft = (x1 < x2) ? x1 : x2,
                        pathRight = (x1 > x2) ? x1 : x2;

                    var selectable = ((pathBottom >= selectionTop && pathTop <= selectionBottom) && 
                                      (pathRight >= selectionLeft && pathLeft <= selectionRight)) ? true : false;

                    if (selectable == true && !bubbleMapper.select.boxed[path.id]) {
                        bubbleMapper.select.add(path);
                        bubbleMapper.select.boxed[path.id] = true;
                    } else if (selectable == false && bubbleMapper.select.boxed[path.id]) {
                        bubbleMapper.select.remove(path);
                        delete bubbleMapper.select.boxed[path.id];
                    }
                }

            }

            // End box selection
            else if (event.type == "mouseup") {
                document.getElementById("boxSelectionBox").style.display = "none";

                document.removeEventListener("mousemove", bubbleMapper.select.box, false);
                document.removeEventListener("mouseup", bubbleMapper.select.box, false);
            }
        },

        display: function() {

            var objects = bubbleMapper.select.selected;

            // Display currently selected objects
            document.getElementById("currentMap").innerHTML = "";

            for (var object in objects) {
                document.getElementById("currentMap").innerHTML += objects[object].id + " " + objects[object] + "<br>";
            }


        }
    },

    bubble: {
        number: 1,
        editee: null,

        create: function() {
            // Create temporary bubble
            var bubble = document.createElement("div");

            // Set attributes of bubble
            bubble.id = "bubble" + bubbleMapper.bubble.number;

            bubble.className = "bubble";
            bubble.setAttribute("class","bubble");

            // Make bubble editable (only works for most recent bubble currently)
            bubble.setAttribute("contenteditable", "true");
            bubble.innerHTML = "";

            // Append bubble to canvas
            document.getElementById("bubbleCanvas").appendChild(bubble);

            bubbleMapper.bubble.editee = {
                "id": bubble.id,
                "note": "create"
            }

            // Set after-the-fact attributes    
            bubble.style.top = bubbleMapper.event.clientY - (bubble.offsetHeight/2) + "px";
            bubble.style.left = bubbleMapper.event.clientX - (bubble.offsetWidth/2) + "px";

            // Select new bubble
            bubbleMapper.select.none();
            bubbleMapper.select.add(bubble);

            bubble.focus();
        },
        edit: function(bubble) {
            // Edit the targeted bubble
            if (bubble) {

                // Set a bubble being edited
                bubbleMapper.bubble.editee = {
                    "id": bubble.id,
                    "note": "edit",
                    "content": bubble.innerHTML
                }

                // Make bubble editable
                bubble.setAttribute("contenteditable", "true");

                setTimeout(function() {
                    bubble.focus();
                }, 10);
            }
        },

        save: function(bubble) {

            // Take potential input of a bubble element.
            if (!bubble) var bubble = document.getElementById(bubbleMapper.bubble.editee.id);

            // Save bubble if not blank
            if (bubble.innerHTML != "") {

                // Save Bubble Content
                var theContent = ((bubble.innerHTML).replace(/<div>/g,"<br>")).replace(/<\/div>/g,"");

                // Increment bubble number if the bubble was created
                if (bubbleMapper.bubble.editee.note == "create") bubbleMapper.bubble.number++;

                bubble.innerHTML = theContent;
                bubble.removeAttribute("contenteditable");

                // Clear editing selection
                bubbleMapper.bubble.editee = null;
            }

            else bubbleMapper.bubble.cancel();
        },
        cancel: function() {

            var bubbleBeingEdited = bubbleMapper.bubble.editee;
            var bubble = document.getElementById(bubbleBeingEdited.id);

            // Deselect canceled bubble
            bubbleMapper.select.remove(bubble);

            // For New or Old Bubble
            if (bubbleBeingEdited.note == "create") {
                // Remove bubble
                document.getElementById("bubbleCanvas").removeChild(bubble);
            }
            else {
                // Replace with old content
                bubble.innerHTML = bubbleBeingEdited.content;
                bubble.setAttribute("contenteditable", "false");
            }

            // Clear editing selection
            bubbleMapper.bubble.editee = null;
        },

        move: {
            baseX: null,
            baseY: null,

            prep: function(event) {
                // Mousedown happens only once -- when the bubble is first clicked.
                // It sets up the next possible events, which are mutually exclusive.
                if (event.type == "mousedown") {
                    document.addEventListener("mousemove", bubbleMapper.bubble.move.prep, false);
                    document.addEventListener("mouseup", bubbleMapper.bubble.move.prep, false); 
                }

                // Mousemove make prep clear itself, and sets up drag and the base x,y coordinates
                else if (event.type == "mousemove") {
                    document.removeEventListener("mousemove", bubbleMapper.bubble.move.prep, false);
                    document.removeEventListener("mouseup", bubbleMapper.bubble.move.prep, false);

                    document.addEventListener("mousemove", bubbleMapper.bubble.move.drag, false);
                    document.addEventListener("mouseup", bubbleMapper.bubble.move.drag, false); 

                    bubbleMapper.bubble.move.baseX = event.clientX;
                    bubbleMapper.bubble.move.baseY = event.clientY;

                    bubbleMapper.toolbar.hide();
                }

                // Mouseup clears prep without doing anything else
                else if (event.type == "mouseup") {
                    document.removeEventListener("mousemove", bubbleMapper.bubble.move.prep, false);
                    document.removeEventListener("mouseup", bubbleMapper.bubble.move.prep, false); 
                }
            },
            drag: function(event) {
                // Mousemove is what makes the bubbles move.
                if (event.type == "mousemove") {
                    // if (document.getElementById("objectToolbarSelect").style.display == "block" ||
                    //     document.getElementById("objectToolbarEdit").style.display == "block") closeObjectToolbar();

                    var objects = bubbleMapper.select.selected;

                    for (var object in objects) {
                        var element = objects[object];
                        var type = bubbleMapper.targetType(element);

                        if (type == "bubble") {

                            // This runs through each bubble and move them syncronously

                            element.style.top = 
                                parseInt(element.style.top) - (bubbleMapper.bubble.move.baseY - event.clientY) + "px";
                            element.style.left = 
                                parseInt(element.style.left) - (bubbleMapper.bubble.move.baseX - event.clientX) + "px";

                            bubbleMapper.path.draw(element);   
                        }
                    }

                    bubbleMapper.bubble.move.baseX = event.clientX;
                    bubbleMapper.bubble.move.baseY = event.clientY;
                }

                // Mouseup clears drag after all is said and done
                else if (event.type == "mouseup") {
                    document.removeEventListener("mousemove", bubbleMapper.bubble.move.drag, false);
                    document.removeEventListener("mouseup", bubbleMapper.bubble.move.drag, false);

                    bubbleMapper.toolbar.show();

                    /*

                // History stuff.

                for (var objects in selectedObjects) {
                    if (selectedObjects[objects].kind == "bubble") {
                        var element = document.getElementById(objects);

                        addHistory(element,"move");
                    }
                }

                */

                    //storeData();
                }
            }
        }
    },
    path: {
        create: function(to,from) {

            var fromTo = document.getElementById(from + "TO" + to);
            var toFrom = document.getElementById(to + "TO" + from);

            // Checks to see if this link already exists.
            if (!fromTo && !toFrom) {

                // Create new path node
                var addPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

                addPath.id = from + "TO" + to;

                addPath.className = "path";
                addPath.setAttribute("class","path");

                // Calculate path coordinates
                bubbleMapper.path.draw(addPath);

                // Add path to the canvas
                document.getElementById("pathCanvas").appendChild(addPath);

                // Store Path Data
                // storeData(); // createPath

                // Add history item
                // addHistory(addPath,"connect");
            }
        },

        draw: function(element) {

            var type = bubbleMapper.targetType(element);

            // If element is a path, draw it
            if (type == "path") {
                var pathTo = document.getElementById(element.id.split("TO")[0]),
                    toPath = document.getElementById(element.id.split("TO")[1]);

                var pathPoint1y = toPath.offsetTop + (toPath.offsetHeight/2),
                    pathPoint1x = toPath.offsetLeft + (toPath.offsetWidth/2),
                    pathPoint2y = pathTo.offsetTop + (pathTo.offsetHeight/2),
                    pathPoint2x = pathTo.offsetLeft + (pathTo.offsetWidth/2);

                element.setAttributeNS(null,"d","M" + pathPoint1x + "," + pathPoint1y + " L" + pathPoint2x + "," + pathPoint2y);

            } 

            // If element is a bubble, get all possible attached paths, and then draw them
            else if (type == "bubble") {

                var pathHTML = document.getElementById("pathCanvasShell").innerHTML;

                var bubbleTo = pathHTML.match(new RegExp(element.id + "TObubble\\d+","g"));
                for (var i = 0; bubbleTo && bubbleTo[i]; i++) {
                    bubbleMapper.path.draw(document.getElementById(bubbleTo[i]));
                }

                var toBubble = pathHTML.match(new RegExp("bubble\\d+TO" + element.id + "\\b","g"));
                for (var i = 0; toBubble && toBubble[i]; i++) {
                    bubbleMapper.path.draw(document.getElementById(toBubble[i]));
                }     
            }

        },

        connecter: {
            open: function(event) {

                if (event.type == "mousedown") {

                    var addPath;

                    for (var object in bubbleMapper.select.selected) {
                        if (object.match(/^bubble\d+$/)) {

                            addPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                            addPath.id = object + "connecter";

                            addPath.setAttribute("class","connecter");

                            document.getElementById("pathCanvas").appendChild(addPath);

                            document.addEventListener("mouseup", bubbleMapper.path.connecter.open, false);
                            document.addEventListener("mousemove", bubbleMapper.path.connecter.open, false);

                            document.addEventListener("mousemove", bubbleMapper.path.connecter.draw, false);
                        }
                    }

                    // Hide toolbars
                    bubbleMapper.toolbar.hide();

                    // Draw path connecter after all paths have been crated
                    bubbleMapper.path.connecter.draw(event);
                }

                // Triggered ONLY AFTER a mousedown triggers this function, and then the user lifted the mouse before moving it
                else if (event.type == "mouseup") {

                    // Remove old event listeners
                    document.removeEventListener("mouseup", bubbleMapper.path.connecter.open, false);
                    document.removeEventListener("mousemove", bubbleMapper.path.connecter.open, false);

                    document.addEventListener("mousedown", bubbleMapper.path.connecter.close, false);
                }

                // Triggered ONLY AFTER a mousedown triggers this function, and then the user moved the mouse before lifting it
                else if (event.type == "mousemove") {

                    // Remove old event listeners
                    document.removeEventListener("mouseup", bubbleMapper.path.connecter.open, false);
                    document.removeEventListener("mousemove", bubbleMapper.path.connecter.open, false);

                    document.addEventListener("mouseup", bubbleMapper.path.connecter.close, false);
                }
            },
            close: function(event) {

                // Remove old event listeners
                document.removeEventListener("mousemove", bubbleMapper.path.connecter.draw, false);

                document.removeEventListener("mouseup", bubbleMapper.path.connecter.close, false);
                document.removeEventListener("mousedown", bubbleMapper.path.connecter.close, false);

                // Show toolbars
                bubbleMapper.toolbar.show();

                var connecters = document.getElementsByClassName("connecter"),
                    pathCanvas = document.getElementById("pathCanvas");

                var target = (event.target && event.target.id && event.target.id.match(/^bubble\d+$/g)) ? event.target.id : null;

                // Goes backwards because going forwards skips half the paths
                for (var i = (connecters.length - 1); connecters && i >= 0; i--) {
                    if (connecters[i]) {

                        if (target) bubbleMapper.path.create(target, connecters[i].id.match(/^bubble\d+/g));

                        pathCanvas.removeChild(connecters[i]);
                    }
                }
            },

            draw: function(event) {
                for (var object in bubbleMapper.select.selected) {
                    if (object.match(/^bubble\d+$/)) {

                        var element = bubbleMapper.select.selected[object],
                            connecter = document.getElementById(object + "connecter");

                        var x = element.offsetLeft + (element.offsetWidth/2),
                            y = element.offsetTop + (element.offsetHeight/2);

                        connecter.setAttributeNS(null,"d","M" + x + "," + y + " L" + event.clientX + "," + event.clientY);
                    }
                }
            },   
        }
    },

    delete: {
        this: function(element) {
            /*

            if (historyOptions == "addon") addHistory(elementInput,"delete","addon");
            else if (historyOptions != "ignore") addHistory(elementInput,"delete");

            */

            bubbleMapper.select.remove(element);

            var type = bubbleMapper.targetType(element);

            // The following is only triggered if the element is a bubble.
            if (type == "bubble") {
                var pathCanvasShell = document.getElementById("pathCanvasShell").innerHTML,
                    elementToBubble = pathCanvasShell.match(new RegExp(element.id + "TObubble\\d+","g")),
                    bubbleToElement = pathCanvasShell.match(new RegExp("bubble\\d+TO" + element.id + "\\b","g"));

                for (var i = 0; elementToBubble && elementToBubble[i]; i++) {
                    bubbleMapper.delete.this(document.getElementById(elementToBubble[i]));
                }

                for (var i = 0; bubbleToElement && bubbleToElement[i]; i++) {
                    bubbleMapper.delete.this(document.getElementById(bubbleToElement[i]));
                }    
            }

            element.parentElement.removeChild(element);

            //storeData(); //deleteObject
        },
        selected: function() {
            var selected = bubbleMapper.select.selected;

            for (var object in selected) {
                bubbleMapper.delete.this(selected[object]);
            }
        }
    },

    toolbar: {
        number: 0,

        /*

        A couple of notes here:

        - The CSS style display is used in three different ways here. If the CSS style -doesn't- exist, the toolbar is closed. If the CSS style is set to "block" the toolbar is open, and if the CSS style is set to "none" the toolbar is hidden. These tags are used in this way to determine quickly which toolbars to reopen between moving bubbles.

        - The base toolbar, object, is controlled by selecting / deselecting a bubble or path. All other toolbars are also controlled by selecting / deselecting a bubble or path (specifically, closing them) AND by clicking on their buttons in the object toolbar. This is one function that has feelers everywhere.

        */

        // Displays a toolbar (e.g. display.object displays the Object Toolbar
        display: {
            object: function() {
                // Check selection, if there's no selection, hide toolbar, otherwise, show toolbar.

                /* BUG /*

                For some reason Opera won't stringify the "selected" object.

                */

                var hasSelection = (JSON.stringify(bubbleMapper.select.selected).length > 2);

                if (hasSelection) {

                    var toolbar = document.getElementById("objectToolbar");
                    var bounds = bubbleMapper.toolbar.getBounds();

                    // Hide triangle and the edit button if there's more than one object

                    var triangle = document.getElementById("objectToolbar_triangle");
                    var editButton = document.getElementById("edit_toolbarItem");

                    if (bounds.selection.length > 1) {
                        triangle.style.display = "none";
                        editButton.style.display = "none";
                    } else {
                        if (bounds.selection == "B") {
                            triangle.style.display = "block";
                            editButton.style.display = "inline";
                        } else {
                            triangle.style.display = "none";
                            editButton.style.display = "none";
                        }
                    }

                    // Now display the toolbar, and move it to the right place.

                    toolbar.style.display = "block";

                    toolbar.style.top = bounds.top - (toolbar.offsetHeight + 6) + "px"; // 6 is the height of the triangle
                    toolbar.style.left = bounds.left + ((bounds.right - bounds.left)/2) - (toolbar.offsetWidth/2) + "px";

                } else {
                    bubbleMapper.toolbar.close();
                }
            },
            generic: function(toolbar_item) {

                var toolbar = 
                    (toolbar_item == "style") ? document.getElementById("styleToolbar") : 
                (toolbar_item == "color") ? document.getElementById("colorToolbar") :
                (toolbar_item == "font") ? document.getElementById("fontToolbar") :
                (toolbar_item == "shape") ? document.getElementById("shapeToolbar") :
                null;

                if (toolbar) {
                    if (toolbar.style.display == "block") {
                        toolbar.style.display = "";
                    }

                    else {
                        toolbar.style.display = "block";

                        var parentMiddle = toolbar.parentElement.offsetLeft + toolbar.parentElement.firstElementChild.offsetWidth/2;
                        var toolbarMiddle = toolbar.offsetWidth/2;

                        toolbar.style.left = parentMiddle - toolbarMiddle + "px";
                    }

                    // Additional tool actions
                    if (bubbleMapper.toolbar[toolbar_item]) bubbleMapper.toolbar[toolbar_item].display();
                }
            },

            // The following displays are tools, not toolbars, and as such, they trigger other events 
        },

        color: {
            display: function() {
                document.getElementById("color_input_red").value = 195;
                document.getElementById("color_input_green").value = 195;
                document.getElementById("color_input_blue").value = 195;

                document.getElementById("color_slider_red").value = 195;
                document.getElementById("color_slider_green").value = 195;
                document.getElementById("color_slider_blue").value = 195;

                document.getElementById("preview").style.background = "rgb(195,195,195)";

                var recents = document.getElementById("recents").getElementsByTagName("div"),
                    colors = bubbleMapper.toolbar.color.recents.colors;

                for (var i = 0; recents && recents[i]; i++) {
                    if (colors[i]) {
                        recents[i].style.backgroundColor = colors[i].style;
                        recents[i].setAttribute("data-red",colors[i].red);
                        recents[i].setAttribute("data-green",colors[i].green);
                        recents[i].setAttribute("data-blue",colors[i].blue);
                    }
                }

                document.getElementById("recents").addEventListener("mousedown", bubbleMapper.toolbar.color.recents.apply, false);
                document.getElementById("sliders").addEventListener("mousedown", bubbleMapper.toolbar.color.range, false);
                document.getElementById("sliders").addEventListener("keydown", bubbleMapper.toolbar.color.input, false);
                document.getElementById("sliders").addEventListener("keyup", bubbleMapper.toolbar.color.input, false);

                /*

                document.getElementById("colorRedBox").addEventListener("keydown", calculateColors, false);
                document.getElementById("colorGreenBox").addEventListener("keydown", calculateColors, false);
                document.getElementById("colorBlueBox").addEventListener("keydown", calculateColors, false);

                document.getElementById("colorRedBox").addEventListener("keyup", calculateColors, false);
                document.getElementById("colorGreenBox").addEventListener("keyup", calculateColors, false);
                document.getElementById("colorBlueBox").addEventListener("keyup", calculateColors, false);

                */

                //if ((selectedObjects[numberOfObjects-1].element)) addHistory((selectedObjects[numberOfObjects-1].element),"color");
            },

            // Using ranges is flawed. Rebuild them to get more accurate results.
            range: function(event) {
                if (event.target.getAttribute("type") == "range") {
                    if (event.type == "mousedown") {
                        document.addEventListener("mousemove", bubbleMapper.toolbar.color.range, false);
                        document.addEventListener("mouseup", bubbleMapper.toolbar.color.range, false);
                    }

                    if (event.type == "mousemove" || event.type == "mousedown") {

                        // Get the changed color
                        var changedColor = parseInt(event.target.value,10);

                        // Determine which color was changed, and change the text input number to match

                        var red = (event.target.getAttribute("data-color") == "red") ? 
                            changedColor : document.getElementById("color_slider_red").value;

                        var green = (event.target.getAttribute("data-color") == "green") ? 
                            changedColor : document.getElementById("color_slider_green").value;

                        var blue = (event.target.getAttribute("data-color") == "blue") ? 
                            changedColor : document.getElementById("color_slider_blue").value;

                        // Change the color of all selected bubbles
                        bubbleMapper.toolbar.color.colorize(red,green,blue);

                    }

                    else if (event.type == "mouseup") {
                        document.removeEventListener("mousemove", bubbleMapper.toolbar.color.range, false);
                        document.removeEventListener("mouseup", bubbleMapper.toolbar.color.range, false);
                    }
                }
            },
            input: function(event) {
                var changedColor = parseInt(event.target.value,10);

                if (event.keyCode == 38 && event.type == "keydown") {
                    event.preventDefault();
                    changedColor++;
                }

                else if (event.keyCode == 40 && event.type == "keydown") {
                    event.preventDefault(); 
                    changedColor--;
                }

                if (changedColor > 255) changedColor = 255; // Prevent numbers higher than 255

                else if (changedColor <= 0) changedColor = 0; // Prevent numbers lower than 0

                // The odd +1 at the end of this compensates for slider bullshit.

                // Set colors
                var red = parseInt(((event.target.getAttribute("data-color") == "red") ? 
                                    changedColor : document.getElementById("color_input_red").value),10) + 1;

                var green = parseInt(((event.target.getAttribute("data-color") == "green") ? 
                                      changedColor : document.getElementById("color_input_green").value),10) + 1;

                var blue = parseInt(((event.target.getAttribute("data-color") == "blue") ? 
                                     changedColor : document.getElementById("color_input_blue").value),10) + 1;

                // Change the color of all selected bubbles
                bubbleMapper.toolbar.color.colorize(red,green,blue);

            },

            colorize: function(red,green,blue) {

                var red = parseInt(red,10),
                    green = parseInt(green,10),
                    blue = parseInt(blue,10);

                // Double check we have each color
                if (red && green && blue) {

                    document.getElementById("color_slider_red").value = red;
                    document.getElementById("color_slider_green").value = green;
                    document.getElementById("color_slider_blue").value = blue;

                    // The odd -1 and decrement below it compensates for slider bullshit.
                    document.getElementById("color_input_red").value = red - 1;
                    document.getElementById("color_input_green").value = green - 1;
                    document.getElementById("color_input_blue").value = blue - 1;

                    red--; green--; blue--;

                    document.getElementById("preview").style.background = "rgb(" + red + "," + green + "," + blue + ")";

                    // Change all colors 
                    for (var object in bubbleMapper.select.selected) {

                        var element = bubbleMapper.select.selected[object];
                        var type = bubbleMapper.targetType(element);

                        if (type == "bubble") {
                            element.style.background = "rgb(" + red + "," + green + "," + blue + ")";
                            element.style.color = ((red + green + blue) < 385) ? "white" : "black";
                        } 

                        else if (type == "path") {
                            element.style.stroke = "rgb(" + red + "," + green + "," + blue + ")";
                        }
                    }
                }
            },

            recents: {
                colors: [],

                save: function() {
                    var red = parseInt(document.getElementById("color_input_red").value,10);
                    var green = parseInt(document.getElementById("color_input_green").value,10);
                    var blue = parseInt(document.getElementById("color_input_blue").value,10);

                    var colors = (bubbleMapper.toolbar.color.recents.colors);

                    var color = {
                        style: "rgb(" + (red + 1) + "," + (green + 1) + "," + (blue + 1) + ")",
                        red: (red + 1),
                        green: (green + 1),
                        blue: (blue + 1)
                    };

                    var replaceEntry = null;

                    for (var i = 0; colors && colors[i]; i++) {
                        if (colors[i].style == color.style) replaceEntry = i;
                    }

                    if (replaceEntry != null) colors.splice(replaceEntry, 1); // Remove the old version of this color
                    
                    colors.splice(0, 0, color); // Add this color to the beginning of the array
                
                    // Limits the number of colors to 12
                    if (colors.length > 12) colors = colors.slice(0, 11);

                    bubbleMapper.toolbar.color.recents.colors = colors;
                },
                apply: function(event) {

                    var red = parseInt(event.target.getAttribute("data-red"),10),
                        green = parseInt(event.target.getAttribute("data-green"),10),
                        blue = parseInt(event.target.getAttribute("data-blue"),10);

                    if (red && green && blue) {
                        document.getElementById("preview").style.background = "rgb(" + red + "," + green + "," + blue + ")";

                        document.getElementById("color_input_red").value = red;
                        document.getElementById("color_input_green").value = green;
                        document.getElementById("color_input_blue").value = blue;

                        document.getElementById("color_slider_red").value = red;
                        document.getElementById("color_slider_green").value = green;
                        document.getElementById("color_slider_blue").value = blue;

                        bubbleMapper.toolbar.color.colorize(red, green, blue);
                    }
                },
            },
        },

        font: {},

        shape: function() {},

        // This looks like a main function, but is actually only ever called by display.object when there's no selection.
        // If you add a new toolbar, remember to add a new close section to this function.
        close: function() {
            var objectToolbar = document.getElementById("objectToolbar").style.display = "";
            var styleToolbar = document.getElementById("styleToolbar").style.display = "";
            var colorToolbar = document.getElementById("colorToolbar");

            // If "Color" toolbar is open, end its functions
            if (colorToolbar.style.display == "block" || colorToolbar.style.display == "none") {

                // Close the toolbar
                colorToolbar.style.display = "";

                // Remove the event listener on the sliders
                document.getElementById("sliders").removeEventListener("mousedown", bubbleMapper.toolbar.color.range, false);
                document.getElementById("recents").removeEventListener("mousedown", bubbleMapper.toolbar.color.recents.apply, false);
                document.getElementById("sliders").removeEventListener("keydown", bubbleMapper.toolbar.color.input, false);
                document.getElementById("sliders").removeEventListener("keyup", bubbleMapper.toolbar.color.input, false);

                // Save the last color chosen to recent colors
                bubbleMapper.toolbar.color.recents.save();

                /*

                document.getElementById("colorRedBox").removeEventListener("keydown", calculateColors, false);
                document.getElementById("colorGreenBox").removeEventListener("keydown", calculateColors, false);
                document.getElementById("colorBlueBox").removeEventListener("keydown", calculateColors, false);

                document.getElementById("colorRedBox").removeEventListener("keyup", calculateColors, false);
                document.getElementById("colorGreenBox").removeEventListener("keyup", calculateColors, false);
                document.getElementById("colorBlueBox").removeEventListener("keyup", calculateColors, false);

                */

                //storeData(); //closeColorPicker -- Commented so that it doesn't save twice.
            }
        },

        getBounds: function() {
            // This function returns the top, left, bottom and right values of the selection.
            // Note that bottom and right indicated as number of pixels from the top and left respectively.

            // Set the bounds to the outer limits
            var top = window.innerHeight,
                left = window.innerWidth,
                bottom = 0,
                right = 0;

            var objectTop,
                objectLeft,
                objectBottom,
                objectRight;

            var objects = bubbleMapper.select.selected;
            var selection = "";

            for (var object in objects) {
                var element = objects[object];
                var type = bubbleMapper.targetType(element);

                if (type == "bubble") {

                    objectTop = element.offsetTop;
                    objectLeft = element.offsetLeft;

                    objectBottom = (element.offsetTop + element.offsetHeight);
                    objectRight = (element.offsetLeft + element.offsetWidth);

                    selection += "B";
                }

                else if (type == "path") {

                    var numbers = element.getAttribute("d").match(/\d+(\.\d+)?/g);

                    // If there are four numbers, it's a straight line
                    if (numbers.length == 4) {
                        var x1 = parseInt(numbers[0],10),
                            y1 = parseInt(numbers[1],10),
                            x2 = parseInt(numbers[2],10),
                            y2 = parseInt(numbers[3],10);
                    }

                    objectTop = (y1 < y2) ? y1 : y2;
                    objectLeft = (x1 < x2) ? x1 : x2;

                    objectBottom = (y1 > y2) ? y1 : y2;
                    objectRight = (x1 > x2) ? x1 : x2;

                    selection += "P";
                }

                if (objectTop < top) top = objectTop;
                if (objectBottom > bottom) bottom = objectBottom;

                if (objectLeft < left) left = objectLeft;
                if (objectRight > right) right = objectRight;
            }

            return {
                top: top, 
                left: left, 
                bottom: bottom, 
                right: right, 

                width: right - left, 
                height: bottom - top, 

                selection: selection
            };
        },

        // Show and hide are used to temporarily hide any toolbar currently displayed
        show: function() {
            var toolbars = document.getElementsByClassName("toolbar");

            for (var i = 0; toolbars && toolbars[i]; i++) {
                if (toolbars[i].style.display == "none") {
                    if (toolbars[i].id == "objectToolbar") bubbleMapper.toolbar.display.object();
                    if (toolbars[i].id == "styleToolbar") bubbleMapper.toolbar.display.generic("style");
                    if (toolbars[i].id == "colorToolbar") bubbleMapper.toolbar.display.generic("color");
                }
            }
        },
        hide: function() {
            var toolbars = document.getElementsByClassName("toolbar");

            for (var i = 0; toolbars && toolbars[i]; i++) {
                if (toolbars[i].style.display == "block") {
                    toolbars[i].style.display = "none";   
                }
            }
        }
    },

    dialog: {
        drag: function(event) {
            var type = event.type;

            if (type == "mousemove") {
                var dialog = scriptAV.dialog.element;

                dialog.style.top = event.clientY + scriptAV.dialog.y + "px";
                dialog.style.left = event.clientX + scriptAV.dialog.x + "px";
            } 

            else if (type == "mousedown") {
                event.preventDefault();

                var dialog = event.target;

                do {
                    dialog = dialog.parentElement;
                } while (dialog.className != "dialog");

                // Store the dialog in question and it's xy coordinates for the moment.
                scriptAV.dialog.element = dialog; 
                scriptAV.dialog.x = dialog.offsetLeft;
                scriptAV.dialog.y = dialog.offsetTop;

                dialog.style.margin = "0px";
                dialog.style.left = "auto";
                dialog.style.right = "auto";

                dialog.style.top = event.clientY + "px";
                dialog.style.left = event.clientX + "px";

                //infoOutputTest.test1(dialog.offsetLeft + " " + scriptAV.dialog.x);

                scriptAV.dialog.x = scriptAV.dialog.x - dialog.offsetLeft;
                scriptAV.dialog.y = scriptAV.dialog.y - dialog.offsetTop;

                dialog.style.top = event.clientY + scriptAV.dialog.y + "px";
                dialog.style.left = event.clientX + scriptAV.dialog.x + "px";

                document.addEventListener("mousemove", scriptAV.dialog.drag, false);
                document.addEventListener("mouseup", scriptAV.dialog.drag, false);
            }

            else if (type == "mouseup") {
                document.removeEventListener("mousemove", scriptAV.dialog.drag, false);
                document.removeEventListener("mouseup", scriptAV.dialog.drag, false);
            }
        },

        reload: {
            open: function() {
                document.getElementById("reload").style.display = "block";
            },

            reload: function() {
                bubbleMapper.map.load(localStorage.getItem("workingFile"));
                document.getElementById("reload").removeAttribute("style");
                bubbleMapper.workingFile.initiateAutosave();
            },

            discard: function() {
                localStorage.removeItem("workingFile");
                document.getElementById("reload").removeAttribute("style");
                bubbleMapper.workingFile.initiateAutosave();
            }
        }
    },

    tutorial: {
        start: function() {
            bubbleMapper.tutorial.step1();
        },

        step1: function() {
            var step1 = document.createElement("div");
            step1.id = "tutorial_step1";

            step1.innerHTML = "\
Hey there! Double click anywhere to create a bubble!\
<br>\
<br>\
<div style=\"font-size: 12px; line-height: 12px;\">\
WARNING: This website has only been thoroughly tested in Safari, Chrome &amp; Firefox. Opera and any other flavour of browser may have serious bugs.\
</div>";
        },
        step2: function() {
            // Close the bubble mapper tutorial pane
            document.getElementById("tutorial_step1").style.display = "none";

            var step2 = document.createElement("div");
            step2.id = "tutorial_step2";

            step2.innerHTML = "\
You made a bubble! Click on it, and start typing!\
";
        },      
        step3: function() {
            // Close the bubble mapper tutorial pane
            document.getElementById("tutorial_step2").style.display = "none";

            var step3 = document.createElement("div");
            step3.id = "tutorial_step3";

            step3.innerHTML = "\
You made a bubble! Click on it, and start typing!\
";
        }
    },


    workingFile: {
        autosaveTimer: null,
        interval: {minutes: 2, seconds: 0},

        check: function() {
            if (bubbleMapper.localStorage()) {

                var workingFile = localStorage.getItem("workingFile");

                if (workingFile) {
                    bubbleMapper.dialog.reload.open();  
                } else {
                    bubbleMapper.workingFile.initiateAutosave();
                }
            }
        },
        initiateAutosave: function() {

            var time = (bubbleMapper.workingFile.interval.minutes + (bubbleMapper.workingFile.interval.seconds/60)) * (60 * 1000);

            if (bubbleMapper.localStorage()) {
                bubbleMapper.workingFile.autosaveTimer = setInterval(function() {

                    localStorage.setItem("workingFile",JSON.stringify(bubbleMapper.map.save()));
                    console.log("Saving current file at " + new Date());
                }, time);
            }
        },
    },

    map: {
        save: function() {
            // Stores all current paths from scratch
            var map = {
                bubbles: [],
                paths: []
            }

            for (var i = 0, bubbles = document.getElementsByClassName("bubble"); bubbles && bubbles[i]; i++) {

                var obj = {
                    id: bubbles[i].id,
                    left: bubbles[i].style.left,
                    top: bubbles[i].style.top,
                    width: bubbles[i].offsetWidth + "px",
                    maxWidth: bubbles[i].style.maxWidth,
                    height: bubbles[i].offsetHeight + "px",
                    minHeight: bubbles[i].style.minHeight,
                    backgroundColor: bubbles[i].style.backgroundColor,
                    fontColor: bubbles[i].style.color,
                    content: bubbles[i].innerHTML.replace(/\n/g,"")
                };

                map.bubbles.push(obj);
            }

            for (var i = 0, paths = document.getElementsByClassName("path"); paths && paths[i]; i++) {

                var obj = {
                    id: paths[i].id,
                    strokeColor: paths[i].style.stroke,
                    d: paths[i].getAttribute("d")
                };

                map.paths.push(obj);
            }

            return map;
        },
        load: function(map) {

            if (typeof(map) == "string") {
                map = JSON.parse(map);
            }

            var bubbles = map.bubbles;
            var paths = map.paths;


            // Rebuild all bubbles
            for (var i = 0; i < bubbles.length; i++) {
                var bubble = document.createElement("div");

                bubble.setAttribute("id", bubbles[i].id);
                bubble.setAttribute("class", "new bubble");
                bubble.style.top = (bubbles[i].top);
                bubble.style.left = (bubbles[i].left);
                bubble.style.backgroundColor = (bubbles[i].backgroundColor);
                bubble.style.color = (bubbles[i].fontColor);
                bubble.innerHTML = (bubbles[i].content);

                document.getElementById("bubbleCanvas").appendChild(bubble);
            }

            // Rebuild all paths
            for (var i = 0; i < paths.length; i++) {
                var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("id", paths[i].id);
                path.setAttribute("class", "new path");
                path.style.stroke = (paths[i].strokeColor);
                path.setAttribute("d", paths[i].d);

                document.getElementById("pathCanvas").appendChild(path);        
            }

            // Reincrement IDs.
            var elements = document.getElementsByClassName("new bubble");
            var association = [];

            for (var i = 0; elements && elements[i]; i++) {
                var numbers = elements[i].id.match(/\d+/);

                association[parseInt(numbers,10)] = bubbleMapper.bubble.number;
                bubbleMapper.bubble.number++;
            }

            var elements = document.getElementsByClassName("new");

            while (elements.length > 0) {
                var numbers = elements[0].id.match(/\d+/g);

                //alert(JSON.stringify(exec) + "");

                if (numbers.length == 1) {
                    elements[0].id = elements[0].id.replace(numbers[0],association[numbers[0]]);
                }

                else if (numbers.length == 2) {
                    elements[0].id = 
                        ((elements[0].id.replace(numbers[0], association[numbers[0]])).split("TO")[0])
                        + "TO" +
                        ((elements[0].id.replace(numbers[1], association[numbers[1]])).split("TO")[1]);
                }

                try {elements[0].classList.remove("new");}
                catch (error) {elements[0].className = elements[0].className.replace(/new /,"");}
            }
        },
    },

    fileHandler: {},
}