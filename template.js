var listRowP = /<!--\s*ui-list-row-/g;
var beginP = /^begin\s*/g;
var attrP = /^(attr\s+([^\-]+?)\s*)?-->/g;
var endP = /^end\s*-->/g;
var visibleBeginP = /<!--\s*visible\(([^\)]+)\)\s*-->/g;
var visibleEndP = /<!--\s*visible-end\s*-->/g;
var placeholder = /\$\{([^}]+)\}/g;
var attributeAccessP = /([^\.]+)\.(.+)/;
var indexAccessP = /([^\[]+)\[([^\]]+)\]/;

function buildTemplateStructure(str, index, parent){
	var node = [];
	node.type = 2;
	if(parent != null){
		attrP.lastIndex = 0;
		var testStr = str.substr(index);
		var result = attrP.exec(testStr);
		if(result){
			node.attr = result[2];
			index += attrP.lastIndex;
		}else throw new Error("/^(attr\\s*([^\\-]+))?-->/ is not matched!");
		parent.push(node);
	}
	while(true){
		listRowP.lastIndex = index;
		var listRowPResult = listRowP.exec(str);
		if(!listRowPResult) break;
		var testStr = str.substr(listRowP.lastIndex);
		endP.lastIndex = 0;
		if(!endP.test(testStr)){
			beginP.lastIndex = 0;
			if(beginP.test(testStr)){
				node.push({type: 1, str: str.substring(index, listRowPResult.index)});
				buildTemplateStructure(str, listRowP.lastIndex + beginP.lastIndex, node);
				index = endP.lastIndex;
			}else throw new Error("/^begin\s*/g is not matched");
		}else{
			node.push({type: 1, str: str.substring(index, listRowPResult.index)});
			endP.lastIndex += listRowP.lastIndex;
			break;
		}
	}
	if(!parent) node.push({type: 1, str: str.substring(index, str.length)});
	return node;
}

function buildString(node, context){
	var str = "";
	for(var i = 0; i < node.length; i++){
		var content = node[i];
		switch(content.type){
			case 1:
				var rs = content.str.replace(placeholder, function(matched, p1){
					var result = attributeAccessP.exec(p1);
					if(result){
						return context[result[1]][result[2]];
					}
					result = indexAccessP.exec(p1);
					if(result){
						return context[result[1]][result[2]];
					}
					return context[p1];
				});
				var result = visibleBeginP.exec(rs);
				if(result != null){
					var exp = result[1];
					if(eval("(" + exp + ")") !== true){
						var s1 = result.index;
						visibleEndP.lastIndex = visibleBeginP.lastIndex;
						result = visibleEndP.exec(rs);
						if(result != null){
							rs = rs.substring(0, s1) + rs.substring(visibleEndP.lastIndex, rs.length);
						}
					}
				}
				str += rs;
				break;
			case 2:
				var obj = content.attr ? context[content.attr] : context;
				if(typeof obj == "object" && typeof obj.length == "number"){
					for(var j = 0; j < obj.length; j++){
						str += buildString(content, obj[j]);
					}
				}else throw new Error("the context must be an array for the row");
				break;
		}
	}
	return str;
}