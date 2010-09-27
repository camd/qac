/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Mozilla Community QA Extension
 *
 * The Initial Developer of the Original Code is the Mozilla Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Zach Lipton <zach@zachlipton.com>
 *  Ben Hsieh <ben.hsieh@gmail.com>
 *  Aaron Train <atrain@mozilla.com>
 *
 *  Portions taken from David Hamp-Gonsalves' Buggybar (buggybar@gmail.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var qaTools = {
  // load a JSON doc into a menulist/menupopup
  // takes the url to load, the menulist to populate, the name of the method
  // to use to get the name from the JSON doc, and the name of the method to
  // use to get the value from the JSON doc, plus an optional callback
  loadJsonMenu : function(url, menulist, nameMethod, valueMethod, callback) {
    this.getJSON(url, function(json) {
      let newitem;
      if (json instanceof Array) {
       for (var i=0; i<json.length; i++) {
         let item = json[i];
         if (item)
           newitem = menulist.appendItem(item[nameMethod], item[valueMethod]);
         }
      } else {
        newitem = menulist.appendItem(json[nameMethod], json[valueMethod]);
      }
      // stash the JSON object in the userData attribute for
      // later use (e.g. when filtering the list).
      newitem.userData = item;
      if (callback)
        callback();
    });
  },
  fetchFeed : function(url, callback) {
    function FeedResultListener() {}
    FeedResultListener.prototype = {
      handleResult : function(result) {
        var feed = result.doc;
        feed.QueryInterface(Components.interfaces.nsIFeed);
        callback(feed);
      }
    };

    function infoReceived(data) {
      var ioService = Components.classes['@mozilla.org/network/io-service;1']
                      .getService(Components.interfaces.nsIIOService);
      var uri = ioService.newURI(url, null, null);
      if (data.length) {
        var processor = Components.classes["@mozilla.org/feed-processor;1"]
                       .createInstance(Components.interfaces.nsIFeedProcessor);
        try {
          processor.listener = new FeedResultListener;
          processor.parseFromString(data, uri);
        } catch(e) {
          alert("Error parsing feed: " + e);
        }
      }
    }
    this.getText(url, infoReceived);
  },
  httpPostRequest : function (url, data, callback, errback) {
    var req = new XMLHttpRequest();
    req.open("POST", url, true);
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("Content-length", data.length);
    req.setRequestHeader("Connection", "close");
    req.onreadystatechange = function (event) {
      if (req.readyState == 4) {
        if(req.status == 200)
          callback(req);
        else if(errback)
          errback();
      } 
    };
    req.send(data);
  },
  httpGetRequest : function(url, callback, errback) {
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.onreadystatechange = function (event) {
      if (req.readyState == 4) {
        if(req.status == 200)
          callback(req);
        else if(errback)
          errback(req);
      } 
    };
    req.send(null);
  },
  getText : function(url, callback, errback) {
    this.httpGetRequest(url, function(req) { callback(req.responseText); }, errback);
  },
  getJSON : function(url, callback, errback) {
    var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
                     .createInstance(Components.interfaces.nsIJSON);
    this.httpGetRequest(url, function(req) { callback(nativeJSON.decode(req.responseText)); }, errback);
  },
  getXML : function(url, callback, errback) {
    this.httpGetRequest(url, function(req) { callback(req.responseXML); }, errback);
  },
  showHideLoadingMessage : function(box, bool) {
    if (bool == true) { // show
      var loading = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
      loading.textContent = qaMain.bundle.getString("qa.extension.loading");
      loading.setAttributeNS("http://www.w3.org/1999/xhtml",
                             "class", "loading_message");
      box.appendChild(loading);
    } else { // hide
      var elements = box.childNodes;
      for (var i=0; i<elements.length; i++) {
        if (elements[i] && elements[i].getAttributeNS &&
          elements[i].getAttributeNS(
          "http://www.w3.org/1999/xhtml", "class") == "loading_message") {
          box.removeChild(elements[i]);
          break;
        }
      }
    }
  },
  arrayify : function(obj) {
    if (obj instanceof Array) {
      return obj;
    }
    var newArray = new Array();
    newArray[0] = obj;
    return newArray;
  },
  writeSafeHTML : function(elementID, htmlstr) {
    document.getElementById(elementID).innerHTML = "";  //clear it.
    var gUnescapeHTML = Components.classes["@mozilla.org/feed-unescapehtml;1"]
                        .getService(Components.interfaces.nsIScriptableUnescapeHTML);
    var context = document.getElementById(elementID);
    var fragment = gUnescapeHTML.parseFragment(htmlstr, false, null, context);
    context.appendChild(fragment);
  },
  assignLinkHandlers : function(node) {
    var children = node.getElementsByTagName('a');
    for (var i = 0; i < children.length; i++)
      children[i].addEventListener("click", qaTools.handleLink, false);
  },
  assignLinkHandler : function(link) {
    link.addEventListener("click", qaTools.handleLink, false);
  },
  handleLink : function(event) {
    var url = this.href;
    var type = qaPref.getPref("browser.link.open_newwindow", "int");
    var where = "tab";
    if (type == 2) where = "window";
    openUILinkIn(url, where);
    event.preventDefault(); // prevent it from simply following the href
  },
  makeUniqueArray : function(array) {
    var RV = new Array();
    for( var i = 0; i < array.length; i++ ) {
        if( RV.indexOf(array[i]) < 0 ) { RV.push( array[i] ); }
    }
    return RV;
  },
  getString : function(aStringName, aParams) {
    let stringBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                                 .getService(Components.interfaces.nsIStringBundleService);
    let props = stringBundle.createBundle("chrome://qa/locale/qa.properties");
    if (aParams && aParams.length) {
      return props.formatStringFromName(aStringName, aParams, aParams.length);
    } else {
      return props.GetStringFromName(aStringName);
    }
  },
  showErrorMessage : function(error) {
    let promptService= Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                       .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.getString("qa.error.title"), error);
  },
  getCleanText : function(inputText) {
    inputText = inputText.replace(/&#64;/g,"@");
    inputText = inputText.replace(/&quot;/g,"\"");
    inputText = inputText.replace(/&lt;/g, "<");
    inputText = inputText.replace(/&gt;/g, ">");
    inputText = inputText.replace(/&amp;/g, "&");
    inputText = inputText.replace(/<[^>]*>/g, "");
    inputText = inputText.replace(/\s+/g, " ");
    inputText = inputText.replace(/\n*/g, "");

    return inputText;
  },
  urlEncode : function(params) {
    var url = [];
    for(let param in params)
      url.push(encodeURIComponent(param) + "=" + encodeURIComponent(params[param]));
    return url.join("&");
  },
  statusBarOpenWindow : function(aUrl){
    window.open(aUrl);	
  }
};