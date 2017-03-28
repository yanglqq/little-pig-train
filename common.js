var HTTP = {};
HTTP._factories = [
    function() { return new XMLHttpRequest(); },
    function() { return new ActiveXObject("Msxml2.XMLHTTP"); },
    function() { return new ActiveXObject("Microsoft.XMLHTTP"); }
];
HTTP._factory = null;
HTTP.newRequest = function() {
    if (HTTP._factory != null) return HTTP._factory();
    for(var i = 0; i < HTTP._factories.length; i++) {
        try {
            var factory = HTTP._factories[i];
            var request = factory();
            if (request != null) {
                HTTP._factory = factory;
                return request;
            }
        }
        catch(e) {
            continue;
        }
    }
    HTTP._factory = function() {
        throw new Error("XMLHttpRequest not supported");
    }
    HTTP._factory();
}

HTTP.getText = function(url, callback, errback, heads) {
    var request = HTTP.newRequest();
    request.onreadystatechange = function() {
    		if(request.readyState !== 4) return;
    		if(request.status >= 500){
    				if(errback) errback("发生错误 " + request.status + "，稍候重试: " + url);
    				setTimeout(function(){
    					if(errback) errback("恢复， 请稍候...");
    					HTTP.getText(url, callback, heads);
    				}, 10000);
    				return;
    		}
        if(request.status == 200)
            callback(HTTP._getResponse(request));
    };
    request.open("GET", url, true);
    if(heads){
	    for(var name in heads){
	    	request.setRequestHeader(name, heads[name]);
	    }
	  }
    request.setRequestHeader("If-Modified-Since", "0");
    request.send(null);
};



HTTP.encodeFormData = function(data) {
    var pairs = [];
    var regexp = /%20/g; // A regular expression to match an encoded space

    for(var name in data) {
        var value = data[name].toString();
        // Create a name/value pair, but encode name and value first
        // The global function encodeURIComponent does almost what we want,
        // but it encodes spaces as %20 instead of as "+". We have to
        // fix that with String.replace()
        var pair = encodeURIComponent(name).replace(regexp,"+") + '=' +
            encodeURIComponent(value).replace(regexp,"+");
        pairs.push(pair);
    }

    // Concatenate all the name/value pairs, separating them with &
    return pairs.join('&');
};

HTTP._getResponse = function(request) {
    // Check the content type returned by the server
    switch(request.getResponseHeader("Content-Type")) {
    case "text/xml":
        // If it is an XML document, use the parsed Document object.
        return request.responseXML;
		case "image/jpeg":
				return null;
//    case "text/json":
//    case "text/javascript":
//    case "application/javascript":
//    case "application/x-javascript":
//        // If the response is JavaScript code, or a JSON-encoded value,
//        // call eval() on the text to "parse" it to a JavaScript value.
//        // Note: only do this if the JavaScript code is from a trusted server!
//        return eval(request.responseText);

    default:
        // Otherwise, treat the response as plain text and return as a string.
        return request.responseText;
    }
};

HTTP.post = function(url, values, callback, errorHandler, heads) {
    var request = HTTP.newRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200) {
                callback(HTTP._getResponse(request));
            }else	if(request.status >= 500){
	    				if(errback) errback("发生错误 " + request.status + "，稍候重试: " + url);
	    				setTimeout(function(){
	    					if(errback) errback("恢复， 请稍候...");
	    					HTTP.post(url, callback, heads);
	    				}, 10000);
    				}else {
                if (errorHandler) errorHandler("发生错误 " + request.status + ", " + request.statusText);
                else callback(null);
            }
        }
    }

    request.open("POST", url);
    if(heads){
	    for(var name in heads){
	    	request.setRequestHeader(name, heads[name]);
	    }
	  }
    // This header tells the server how to interpret the body of the request.
    request.setRequestHeader("Content-Type",
                             "application/x-www-form-urlencoded");
    // Encode the properties of the values object and send them as
    // the body of the request.
    request.send(HTTP.encodeFormData(values));
};

function escapeString(/*String*/str){
	return ('"' + str.replace(/(["\\])/g, '\\$1') + '"').
		replace(/[\f]/g, "\\f").replace(/[\b]/g, "\\b").replace(/[\n]/g, "\\n").
		replace(/[\t]/g, "\\t").replace(/[\r]/g, "\\r"); // string
}

function toJson(value, replacer, spacer){
	var undef;
	if(typeof replacer == "string"){
		spacer = replacer;
		replacer = null;
	}
	function stringify(it, indent, key){
		if(replacer){
			it = replacer(key, it);
		}
		var val, objtype = typeof it;
		if(objtype == "number"){
			return isFinite(it) ? it + "" : "null";
		}
		if(objtype == "boolean"){
			return it + "";
		}
		if(it === null){
			return "null";
		}
		if(typeof it == "string"){
			return escapeString(it);
		}
		if(objtype == "function" || objtype == "undefined"){
			return undef; // undefined
		}
		// short-circuit for objects that support "json" serialization
		// if they return "self" then just pass-through...
		if(typeof it.toJSON == "function"){
			return stringify(it.toJSON(key), indent, key);
		}
		if(it instanceof Date){
			return '"{FullYear}-{Month+}-{Date}T{Hours}:{Minutes}:{Seconds}Z"'.replace(/\{(\w+)(\+)?\}/g, function(t, prop, plus){
				var num = it["getUTC" + prop]() + (plus ? 1 : 0);
				return num < 10 ? "0" + num : num;
			});
		}
		if(it.valueOf() !== it){
			// primitive wrapper, try again unwrapped:
			return stringify(it.valueOf(), indent, key);
		}
		var nextIndent= spacer ? (indent + spacer) : "";
		/* we used to test for DOM nodes and throw, but FF serializes them as {}, so cross-browser consistency is probably not efficiently attainable */

		var sep = spacer ? " " : "";
		var newLine = spacer ? "\n" : "";

		// array
		if(it instanceof Array){
			var itl = it.length, res = [];
			for(key = 0; key < itl; key++){
				var obj = it[key];
				val = stringify(obj, nextIndent, key);
				if(typeof val != "string"){
					val = "null";
				}
				res.push(newLine + nextIndent + val);
			}
			return "[" + res.join(",") + newLine + indent + "]";
		}
		// generic object code path
		var output = [];
		for(key in it){
			var keyStr;
			if(typeof key == "number"){
				keyStr = '"' + key + '"';
			}else if(typeof key == "string"){
				keyStr = escapeString(key);
			}else{
				// skip non-string or number keys
				continue;
			}
			val = stringify(it[key], nextIndent, key);
			if(typeof val != "string"){
				// skip non-serializable values
				continue;
			}
			// At this point, the most non-IE browsers don't get in this branch
			// (they have native JSON), so push is definitely the way to
			output.push(newLine + nextIndent + keyStr + ":" + sep + val);
		}
		return "{" + output.join(",") + newLine + indent + "}"; // String
	}
	return stringify(value, "", "");
}

var CSSClass = {};  // Create our namespace object
// Return true if element e is a member of the class c; false otherwise
CSSClass.is = function(e, c) {
    if (typeof e == "string") e = document.getElementById(e); // element id

    // Before doing a regexp search, optimize for a couple of common cases.
    var classes = e.className;
    if (!classes) return false;    // Not a member of any classes
    if (classes == c) return true; // Member of just this one class

    // Otherwise, use a regular expression to search for c as a word by itself
    // \b in a regular expression requires a match at a word boundary.
    return e.className.search("\\b" + c + "\\b") != -1;
};

// Add class c to the className of element e if it is not already there.
CSSClass.add = function(e, c) {
    if (typeof e == "string") e = document.getElementById(e); // element id
    if (CSSClass.is(e, c)) return; // If already a member, do nothing
    if (e.className) c = " " + c;  // Whitespace separator, if needed
    e.className += c;              // Append the new class to the end
};

// Remove all occurrences (if any) of class c from the className of element e
CSSClass.remove = function(e, c) {
    if (typeof e == "string") e = document.getElementById(e); // element id
    // Search the className for all occurrences of c and replace with "".
    // \s* matches any number of whitespace characters.
    // "g" makes the regular expression match any number of occurrences
    e.className = e.className.replace(new RegExp("\\b"+ c+"\\b\\s*", "g"), "");
};


function time2minute(time){
	var pos = time.indexOf(":");
	var h = time.substring(0, pos);
	var m = time.substring(pos + 1, time.length);
	if(h.charAt(0) == "0") h = h.charAt(1);
	if(m.charAt(0) == "0") m = m.charAt(1);
	return parseInt(h) * 60 + parseInt(m);
}

function timeDifference(d1,time1,d2,time2){
	return time2minute(time1) + (d1 - d2) * 1440 - time2minute(time2);
}

function time2zh(time){
	function toInt(f){
		f = f + "";
		var pos = f.indexOf(".");
		if(pos != -1) f = f.substring(0, pos);
		return parseInt(f);
	}
	var zh = "";
	var n = toInt(time / 1440);
	if(n > 0){
		zh += n + "天";
		time -= n * 1440;
	}
	n = toInt(time / 60);
	if(n > 0){
		zh += n + "小时";
		time -= n * 60;
	}
	zh += time + "分";
	return zh;
}