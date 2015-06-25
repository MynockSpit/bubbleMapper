<?php
$fileName = __DIR__ . "/../userFiles/" . $_GET['fileName'] . ".bubblemap";

if ($_GET['mapName'] != "" && $_GET['mapName']) {
    $mapName = $_GET['mapName'] . ".bubblemap";
} else {
    $mapName = "My Fancy Bubblemap.bubblemap";
}

if($_GET['fileName'] == "") {
    //echo "File name is blank";
    header("Location: http://" . $_SERVER['HTTP_HOST']. rtrim(dirname($_SERVER['PHP_SELF']),"php/"));
    exit();
} elseif (!file_exists($fileName)) {
    //echo "File doesn't exist";
    header("Location: http://" . $_SERVER['HTTP_HOST']. rtrim(dirname($_SERVER['PHP_SELF']),"php/"));
    exit();
} else {
    if (ini_get('zlib.output_compression')) ini_set('zlib.output_compression', 'Off'); // Required for IE, otherwise Content-disposition is ignored
    if (ob_get_level()) ob_end_clean(); // Don't remember why I have this here...

    header("Pragma: public"); // required
    header("Expires: 0");
    header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
    header("Cache-Control: private",false); // required for certain browsers 
    header("Content-Type: octet/stream");
    header("Content-Disposition: attachment; filename=\"" . $mapName . "\";" );
    header("Content-Transfer-Encoding: binary");
    header("Content-Length: ".filesize($fileName));
    readfile($fileName);
    header("Location: http://" . $_SERVER['HTTP_HOST']. rtrim(dirname($_SERVER['PHP_SELF']),"php/"));
    exit();
}
?>