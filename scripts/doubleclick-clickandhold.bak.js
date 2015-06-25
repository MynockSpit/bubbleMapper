 var doubleClickTimer,
                        clickAndHoldTimer;

                    // Increments the click number on each click
                    clickNumber++;

                    function doubleClick() {
                        // Close the bubble mapper tutorial pane
                        if (document.getElementById("warningANDinstructions")) bubbleMappperTutorial("close");

                        // Create or edit a bubble (if clicking on the canvas or on a bubble being edited)
                        if (eventGlobal.target.tagName == "svg") createBubble();
                        else if (eventGlobal.target.id.match(/^bubble\d+$/g) || eventGlobal.target.id.match(/^bubble\d+TObubble\d+$/g)) editObject();
                    }

                    function clickAndHold() {
                        stopBoxSelection(); // Box select was started on first click -- kill it
                        clearClickAndHold();
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

                    // If this is the first click...
                    if (clickNumber == 1) {

                        // Set up double-click timer and fail options
                        doubleClickTimer = setTimeout(clearDoubleClick,275);

                        document.addEventListener("mousemove", clearDoubleClick, false);

                        // Set up click-and-hold timer and fail options
                        clickAndHoldTimer = setTimeout(clickAndHold,500);

                        document.addEventListener("mousemove", clearClickAndHold, false);
                        document.addEventListener("mouseup", clearClickAndHold, false);

                        // Fire single-click action
                        // Checks for a click on the canvas
                        if (eventGlobal.target.tagName == "svg") {
                            if (document.getElementById("pathCanvasShell").innerHTML.match(/bubble\d+connecter/))
                                closePathConnecter(eventGlobal);

                            if (document.getElementById("warningANDinstructions").style.display == "none") {

                                if (checkSelection() == true && !bubbleBeingEdited) deselectObject();
                                else if (checkSelection() == true && bubbleBeingEdited) saveBubble();

                                startBoxSelection();
                            }
                        }

                        // Checks for a click on a bubble
                        else if (eventGlobal.target.id.match(/^bubble\d+$/g)) {

                            if (document.getElementById("pathCanvasShell").innerHTML.match(/bubble\d+connecter/))
                                closePathConnecter(eventGlobal);

                            if (checkSelection(eventGlobal.target) == false) {
                                if (eventGlobal.shiftKey === false) // If shift isn't pressed, select just this object
                                    selectObject(eventGlobal.target,{clearSelection: true, toolbarMode: "object"});
                                else if (eventGlobal.shiftKey === true) // If shift is pressed, add this object to selection
                                    selectObject(eventGlobal.target,{clearSelection: false, toolbarMode: "object"});
                            }

                            // If bubble is being edited & the bubble being edited is NOT the same bubble as the one clicked
                            // This prevents saving bubbles if you click on the one you're editing.
                            if (bubbleBeingEdited && bubbleBeingEdited.id != eventGlobal.target.id) {
                                saveBubble();
                            }

                            // If bubble is being edited & the bubble being edited is the same bubble as the one clicked
                            if (!(bubbleBeingEdited && bubbleBeingEdited.id == eventGlobal.target.id)) {
                                moveBubbleStart();
                            }
                        } 

                        // Checks for a click on a path
                        else if (eventGlobal.target.id.match(/^bubble\d+TObubble\d+$/g)) {
                            if (document.getElementById("pathCanvasShell").innerHTML.match(/bubble\d+connecter/))
                                closePathConnecter(eventGlobal);

                            // Check that current object is not already selected
                            if (checkSelection(eventGlobal.target) == false) {

                                // If shift isn't clicked, select just this object
                                if (eventGlobal.shiftKey == false) selectObject(eventGlobal.target,{clearSelection: true, toolbarMode: "object"}); 

                                // If shift is pressed, add this object to selection
                                else if (eventGlobal.shiftKey == true) selectObject(eventGlobal.target,{clearSelection: false, toolbarMode: "object"});
                            }
                        }
                    }

                    // If this is the second click...
                    else if (clickNumber == 2) {
                        // Clear the click data
                        clearDoubleClick();

                        // Fire double click action
                        doubleClick();
                    }