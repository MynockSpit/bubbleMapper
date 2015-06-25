<?php
if ($_POST["fileName"] == "") {
    //echo "File name is blank";
    header("Location: http://" . $_SERVER['HTTP_HOST']. rtrim(dirname($_SERVER['PHP_SELF']),"php/"));
    exit();
} else {
    $fileName = $_POST["fileName"];

    $dom = new DOMDocument;

    $root = $dom->createElement("bubbleMapperDocument");
    $dom->appendChild($root);

    $currentMap = $dom->createElement("currentMap");
    $root->appendChild($currentMap);

    $bubbles = $dom->createElement("bubbles");
    $currentMap->appendChild($bubbles);

    $paths = $dom->createElement("paths");
    $currentMap->appendChild($paths);

    $history = $dom->createElement("history");
    $root->appendChild($history);

    // These are still separate... I can't think of a good reason not to have them as separate
    // lists -- it's easier to decode the data without the JS actually sending data saying "this
    // tag is a bubble" or whatever. Seems simpler too. Also, it allows for selection of multiple
    // bubbles in the future.

    $bubbleData = json_decode($_POST["bubbleData"], true);
    $pathData = json_decode($_POST["pathData"], true);
    $historyData = json_decode($_POST["historyData"], true);

    // Create or modify current list

    // Basically check to see if the bubble or path isn't being deleted, and if it isn't, edit it 
    // (or if it hasn't been created, make it). 

    foreach ($bubbleData as $data) {
        $bubble = $dom->createElement("bubble");
        $bubbles->appendChild($bubble);
        
        if ($data["id"]) $bubble->setAttribute("id",$data["id"]);
        if ($data["left"]) $bubble->setAttribute("left",$data["left"]);
        if ($data["top"]) $bubble->setAttribute("top",$data["top"]);
        if ($data["content"]) $bubble->nodeValue = $data["content"];
        if ($data["backgroundColor"]) $bubble->setAttribute("backgroundColor",$data["backgroundColor"]);
        if ($data["fontColor"]) $bubble->setAttribute("fontColor",$data["fontColor"]);
    }
    
    foreach ($pathData as $data) {
        $path = $dom->createElement("path");
        $paths->appendChild($path);
        
        if ($data["id"]) $path->setAttribute("id",$data["id"]);
        if ($data["strokeColor"]) $path->setAttribute("strokeColor",$data["strokeColor"]);
        if ($data["d"]) $path->setAttribute("d",$data["d"]);
    }
    
    /*
    foreach ($historyData as $data) {
        $path = $dom->createElement("path");
        $history->appendChild($path);
        
        if ($data["id"]) $path->setAttribute("id",$data["id"]);
        if ($data["strokeColor"]) $path->setAttribute("strokeColor",$data["strokeColor"]);
        if ($data["d"]) $path->setAttribute("d",$data["d"]);
    }*/
    
    // Formats the xml and removes the doctype by saving it out to an xml string, then reloading it
    // back into the DOM. Kinda goofy, but it works and makes neatly formed XML.
    
    $formatXML = $dom->saveXML();
    $dom = new DOMDocument(); 
    $dom->preserveWhiteSpace = false; 
    $dom->formatOutput = true; 
    $dom->loadXML($formatXML);
    
    // Save as a file with a unique name that was given by the client
    $dom->save(__DIR__ . "/../userFiles/" . $fileName . ".bubblemap");
    echo $fileName . ".bubblemap";
}
?>