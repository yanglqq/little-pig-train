(function(){
if(!window["Node"]) {
    window.Node = {};
    Node.ELEMENT_NODE = 1;
    Node.ATTRIBUTE_NODE = 2;
    Node.TEXT_NODE = 3;
    Node.CDATA_SECTION_NODE = 4;
    Node.ENTITY_REFERENCE_NODE = 5;
    Node.ENTITY_NODE = 6;
    Node.PROCESSING_INSTRUCTION_NODE = 7;
    Node.COMMENT_NODE = 8;
    Node.DOCUMENT_NODE = 9;
    Node.DOCUMENT_TYPE_NODE = 10;
    Node.DOCUMENT_FRAGMENT_NODE = 11;
    Node.NOTATION_NODE = 12;
}

XML = function(){};

XML.getAttributeValue = function (node,attrName) {
	var map = node.attributes;
	if(map != null){
		var count = map.length;
		var i = 0;
		for(; i < count; i++){
			var attr = map.item(i);
			if(attr.nodeName == attrName){
				return attr.nodeValue;
			}
		}
	}
};

XML.setAttributeValue = function(node, attrName, value){
	var map = node.attributes;
	if(map != null){
		var count = map.length;
		var i = 0;
		for(; i < count; i++){
			var attr = map.item(i);
			if(attr.nodeName == attrName){
				attr.nodeValue = value;
				return;
			}
		}
	}
	var attr = node.ownerDocument.createAttribute(attrName);
	attr.nodeValue = value;		
	node.setAttributeNode(attr);
};

XML.getNode = function(root, nodeName){
	if(nodeName == root.nodeName){
		return root;
	}
	var child = root.firstChild;
	while(child != null){
		if(child.nodeType == Node.ELEMENT_NODE){
		    if(nodeName == child.nodeName){
		    	return child;
		    }
		    var child_ = this.getNode(child, nodeName);
		    if(child_ != null){
		    	return child_;
		    }
		}
		child = child.nextSibling;
	}
	return null;
};

XML.getTextValue = function(node){
	var child = node.firstChild;
	var value = null;
	while(child != null) {
		if(child.nodeType == Node.TEXT_NODE || child.nodeType == Node.CDATA_SECTION_NODE){
			value = (value || "") + child.nodeValue;
		}
		child = child.nextSibling;
	}
	return value;	
};

XML.setTextValue = function(node, value){		
	var child = node.firstChild;
	while(child != null) {
		if(child.nodeType == Node.TEXT_NODE || child.nodeType == Node.CDATA_SECTION_NODE){
			child.nodeValue = value;
			return;
		}
		child = child.nextSibling;
	}
	node.appendChild(node.ownerDocument.createTextNode(value));
};

XML.getFirstChild = function(node){
	var child = node.firstChild;
	while(child != null) {
		if(child.nodeType == Node.ELEMENT_NODE){
			return child;
		}
		child = child.nextSibling;
	}
	return null;
};

XML.getNextSibling = function(node){
	var sibling = node.nextSibling;
	while(sibling != null){
		if(sibling.nodeType == Node.ELEMENT_NODE){
			return sibling;
		}
		sibling = sibling.nextSibling;
	}
	return null;
};

XML.getPreviousSibling = function(node){
	var sibling = node.previousSibling;
	while(sibling != null){
		if(sibling.nodeType == Node.ELEMENT_NODE){
			return sibling;
		}
		sibling = sibling.previousSibling;
	}
	return null;	
};

XML.isLeaf = function(node){
	return XML.getFirstChild(node) == null;
};

XML.removeChildren = function(node){
	var child = node.firstChild;
	while(child){
		var child1 = child.nextSibling;
		node.removeChild(child);
		child = child1;
	}
};

XML.serialize = function(node){
	var xml = "";
    if(typeof XMLSerializer != "undefined"){
        xml = (new XMLSerializer( )).serializeToString(node);
    }else if(node.xml){
    	xml = node.xml;
    }else if(node.outerHTML){
    	xml = node.outerHTML;
    }else if(node.documentElement){
    	xml = XML.serialize(node.documentElement);
    }else{
    	throw "XML.serialize is not supported or can't serialize " + node;
    }    
    return xml.replace(/utf-16/i, "UTF-8");
};

XML.deserialize = function(xml) {
    if(window.DOMParser){
    	parser = new DOMParser();
    	return parser.parseFromString(xml, "text/xml");
    }else{
		var xmldoc = null;		
	    if(document.implementation && document.implementation.createDocument){
	        xmldoc = document.implementation.createDocument("", "", null);
	    }else{
		    var aVersions = ["MSXML2.DOMDocument.5.0","MSXML2.DOMDocument.4.0","MSXML2.DOMDocument.3.0","MSXML2.DOMDocument","Microsoft.XmlDom"];
			for(var i = 0; i < aVersions.length; i++){
				try {
					xmldoc = new ActiveXObject(aVersions[i]);
					break;
				} catch (oError) {}
			}
			if(!xmldoc){
				throw new Error("MSXML is not installed.");
			}
		}		
		xmldoc.async = "false";
		xmldoc.loadXML(xml);
		return xmldoc;
    }	
};

XML.transform = function(node, stylesheet, parameters){
	if(typeof node == "string") node = XML.deserialize(node);
    if(typeof XSLTProcessor != "undefined"){
    	if(typeof stylesheet == "string") stylesheet = XML.deserialize(stylesheet);
        var processor = new XSLTProcessor( );
        processor.importStylesheet(stylesheet);
        if(parameters){
        	for(var name in parameters)
        		processor.setParameter(null, name, parameters[name]);
        }
        return XML.serialize(processor.transformToDocument(node));
    }else if("transformNode" in node){
    	if(typeof stylesheet != "string") stylesheet = XML.serialize(stylesheet);
    	var xsltdoc = new ActiveXObject("Msxml2.FreeThreadedDOMDocument");
    	xsltdoc.async = false;
    	xsltdoc.loadXML(stylesheet);    	
    	var compiler = new ActiveXObject("MSXML2.XSLTemplate");
    	compiler.stylesheet = xsltdoc;
    	var processor = compiler.createProcessor();
    	if(parameters){
    		for(var name in parameters)
    			processor.addParameter(name, parameters[name]);
    	}
    	processor.input = node;
    	processor.transform(); 	
    	return processor.output;
    }else{
    	throw "XSLT is not supported in this browser";
    }
};

XML.cloneNode = function(node){
	switch(node.nodeType){
	case Node.ELEMENT_NODE:
		var newNode = node.cloneNode(false);
		newNode.nodeId = 0;
		var child = node.firstChild;
		while (child){
			newNode.appendChild(XML.cloneNode(child));
			child = child.nextSibling;
		}
		if(node.nodeName == "SCRIPT"){
			newNode.text = node.innerHTML;
		}
		return newNode;
    case Node.ATTRIBUTE_NODE:
    	var newNode = node.ownerDocument.createAttribute(node.nodeName);
    	newNode.nodeValue = node.nodeValue;
    	return newNode;
    case Node.TEXT_NODE:
    	var newNode = node.ownerDocument.createTextNode(node.nodeValue);
    	return newNode;
    case Node.CDATA_SECTION_NODE:
    	var newNode = node.ownerDocument.createCDATASection(node.nodeValue);
    	return newNode;
    case Node.COMMENT_NODE:
    	var newNode = node.ownerDocument.createComment(node.nodeValue);
    	return newNode;
    case Node.ENTITY_REFERENCE_NODE:
    case Node.ENTITY_NODE:
    case Node.PROCESSING_INSTRUCTION_NODE:
    case Node.DOCUMENT_NODE:
    case Node.DOCUMENT_TYPE_NODE:
    case Node.DOCUMENT_FRAGMENT_NODE:
    case Node.NOTATION_NODE:
    	return null;
	}	
};

XML.WALK_STOP = 1;
XML.WALK_IGNORE_SUBTREE = 2;
XML.WALK_IGNORE_SUBTREE_AND_SIBLINGS = 3;

XML.preorder = function(node, visit){
	var p1 = node.firstChild, p2, p3, p4;
	while(p1){
		for(p2 = p1; !(p4 = p2.nextSibling) && (p2 = p2.parentNode) && (p2 != node););
		if(p2 = p1.firstChild){
			p3 = p2;
		}else{
			p3 = p4;
		}
		if(p1.nodeType == Node.ELEMENT_NODE){
			p1 = visit(p1);
			if(p1 === XML.WALK_STOP){
				break;
			}else if(p1 === XML.WALK_IGNORE_SUBTREE){
				p1 = p4;
				continue;
			}else if(p1 === XML.WALK_IGNORE_SUBTREE_AND_SIBLINGS){
				p2 = p1;
				do{	
					p2 = p2.parentNode;
					if(!p2 || p2 == node) return;
					p1 = p2.nextSibling;
				}while(!p1);
				continue;
			}else if(p1){
				continue;
			}		
		}
		p1 = p3;		
	}
};

XML.postorder = function(node, visit){
	var p1 = node, p2, p3;
	do{
		if(p3 != p1){
			while(p2 = p1.firstChild){
				p1 = p2;
			}
		}
		p3 = p1.parentNode;
		p2 = p1.nextSibling || p3;
		if(p1.nodeType == Node.ELEMENT_NODE){
			p1 = visit(p1);
			if(p1 === XML.WALK_STOP){
				break;
			}else if(p1){
				continue;
			}
		}
		p1 = p2;
	}while(node != p1 && p1);
};
})();