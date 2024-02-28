"use strict";

var typeClip = ProjectItemType.CLIP;
var typeFile = ProjectItemType.FILE;
var sep = Folder.fs == "Macintosh" ? "/" : "\\";
var colors = {
  GREEN: 0,
  RED: 1,
  PURPLE: 2,
  ORANGE: 3,
  YELLOW: 4,
  WHITE: 5,
  BLUE: 6,
  CYAN: 7,
};
var folderToChatFiles = {};

$._M_ = {
  main: function (project, projectItems, numProjectItems) {
    var clip, folderPath, itemType, markers, name;
    for (var i = 0; i < numProjectItems; i++) {
      clip = projectItems[i];
      name = clip.name;
      itemType = clip.type;
      $._M_.updateEventPanel("[Checking Project Item #" + (i + 1) + "]");
      $._M_.updateEventPanel("Name: " + name);
      if (clip.isSequence()) $._M_.updateEventPanel("Skipping Sequence.");
      else {
        if (itemType != typeClip && itemType != typeFile)
          $._M_.updateEventPanel(
            "Skipping. Can only add markers to footage items."
          );
        else {
          folderPath = $._M_.getFolderName(clip);
          if (folderPath) {
            $._M_.updateEventPanel("Media Path: " + folderPath);
            markers = clip.getMarkers();
            if (markers.numMarkers)
              $._M_.updateEventPanel("Skipping. Clip already has markers.");
            else {
              var chatFiles_1 = folderToChatFiles[folderPath];
              if (chatFiles_1 === undefined)
                chatFiles_1 = folderToChatFiles[folderPath] = new Folder(
                  folderPath
                ).getFiles("*.chat");
              var chatFileCount = chatFiles_1.length;
              if (!chatFileCount)
                $._M_.updateEventPanel(
                  "Skipping. No *.chat file(s) found in media path."
                );
              else {
                $._M_.updateEventPanel("Adding markers.");
                for (var j = 0; j < chatFileCount; j++) {
                  var chatFile = chatFiles_1[j];
                  if (chatFile instanceof File && chatFile.exists)
                    $._M_.createClipMarkersFromChatFile(markers, chatFile);
                }
              }
            }
          } else
            $._M_.updateWithError("Unable to determine media path of clip.");
        }
      }
    }
  },
  createClipMarkersFromChatFile: function (markers, chatFile) {
    var message = null,
      timeInSec,
      user;
    $._M_.readTextFile(chatFile, function (line) {
      var parts = line.split("\t");
      var time = parts[0].trim();
      var thisTimeInSec = $._M_.convertTimecodeToSeconds(time);
      if (parts.length === 3 && thisTimeInSec) {
        if (message) $._M_.createMarker(markers, timeInSec, user, message);
        timeInSec = thisTimeInSec;
        user = parts[1].trim().slice(0, -1);
        message = parts[2].trim();
      } else message += "\n" + line;
    });
    if (message) $._M_.createMarker(markers, timeInSec, user, message);
  },
  createMarker: function (markers, timeInSec, user, message) {
    var marker = markers.createMarker(timeInSec);
    var words = message.toLowerCase().split(" ");
    marker.name = user;
    marker.comments = message;
    var markerColor = colors.GREEN;
    var word;
    for (var i = 0; i < words.length; i++) {
      word = words[i];
      if (word === "cut" || word === "edit") markerColor = colors.RED;
      else if (word === "fix" || word === "replace")
        markerColor = colors.ORANGE;
      else if (word === "audio" || word === "sound")
        markerColor = colors.YELLOW;
      else if (word == "reacted") markerColor = colors.PURPLE;
    }
    marker.setColorByIndex(markerColor);
  },
  exitErr: function (msg) {
    alert(msg);
    $._M_.exit(-1);
  },
  updateEventPanel: function (message) {
    app.setSDKEventMessage(message, "info");
  },
  updateWithError: function (message) {
    app.setSDKEventMessage(message, "error");
  },
  addStringMethods: function () {
    if (typeof String.prototype.trim === "undefined") {
      String.prototype.trim = function () {
        return String(this).replace(/^\s+|\s+$/g, "");
      };
    }
  },
  getFolderName: function (pItem) {
    if (!pItem) return null;
    var fullPath = pItem.getMediaPath();
    var lastSep = fullPath.lastIndexOf(sep);
    return lastSep > -1 ? fullPath.slice(0, lastSep) : fullPath;
  },
  convertTimecodeToSeconds: function (timecode) {
    var myT = timecode.split(":");
    if (myT.length !== 3) return 0;
    var hours = parseInt(myT[0]) * 3600;
    var minutes = parseInt(myT[1]) * 60;
    var seconds = parseInt(myT[2]);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;
    var totalInSeconds = hours + minutes + seconds;
    return totalInSeconds;
  },
  readTextFile: function (fileOrPath, callback) {
    var file = fileOrPath instanceof File ? fileOrPath : new File(fileOrPath);
    if (file.exists) {
      if (!file.open("r"))
        $._M_.exitErr("Unable to open file " + decodeURI(file.name));
      if (!file.encoding) file.encoding = "UTF-8";
      var text = file.read();
      file.close();
      var lines = text.split("\n");
      if (typeof callback == "function") {
        for (var i = 0; i < lines.length; i++) {
          callback(lines[i], i);
        }
      }
      return text;
    } else return false;
  },
};

$._M_.addStringMethods();
