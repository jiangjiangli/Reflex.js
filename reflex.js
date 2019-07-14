//用来加载html
class ReflexInclude extends HTMLElement
{
	 // Specify observed attributes so that attributeChangedCallback will work
	static get observedAttributes() {
		return ['src'];
	}
  
	constructor()
	{
		super();
		this.root = this.attachShadow({mode: 'open'});
		log("reflex-include construct")
	}
	
	connectedCallback() 
	{
		log("reflex-include connectd")
		if(!this.hasAttribute("src"))
		{
			log("Failed to get src attribute, it's no defined");
			return;
		}
		var src = this.getAttribute("src");
		var parent = this;
		axios.get(src).then(function (resp)
		{
			parent.loadHtml(resp.data);
		}).catch(function(error)
		{		
			if(error.response && error.response.status == 0)
			{
				parent.loadHtml(error.response.data);
			}else{
				log(error);
			}
		});
	}
	
	loadHtml(html)
	{
		let container = document.createElement('div');
		container.innerHTML = html;
		// get all child elements and clone them in the target element
		let nodes = container.childNodes;
		for( let i=0; i< nodes.length; i++)
		{
			var item = nodes[i];
			if(item.nodeName != "script" && item.nodeName != "SCRIPT")
			{
				this.root.appendChild(item.cloneNode(true) );
				continue;
			}
			var script = document.createElement('script');
			script.type = item.type || 'text/javascript';
			if(item.hasAttribute('src') ) 
			{
				if(jsLoaded(item.src))
				{
					continue;
				}
				script.src = item.src;
				recordJsLoadedByName(item.src);
			}
			script.innerHTML = item.innerHTML;
			this.root.appendChild(script);	
		}			
	}
}
customElements.define("rf-include", ReflexInclude);

//用来计算表达式，和绑定数据到视图
class ExpressionBinding extends Object
{
	constructor(expression)
	{
		super();
		this.expression = expression;
		this.targets = [];
		this.text="hell0 ";
	}
	
	add(element, attr)
	{
		this.targets.push({element:element, attr: attr});
	}
	
	apply(context)
	{
		var result = evalOnContext(context,[], this.expression);
		let count = this.targets.length;
		for(let i = 0; i < count; i++)
		{
			let item = this.targets[i];
			this.applyOn(item.element, item.attr,result);
		}
	}
	
	applyOn(element, attr, value)
	{
		if(element.nodeType == Node.TEXT_NODE)
		{
			element.textContent = value;
		}
		else if(element.hasAttribute(attr))
		{
			element.setAttribute(attr, value);
		}
	}
}

var reflex$jsloaded = ["reflex.js"];
var reflex$bindings = new Map();
var reflex$viewmodel ={};

recordJsLoaded();
log("reflex begin to run");

window.onload = (e) => 
{
  log("loaded");
  recordJsLoaded();
  createBindinds();
  reflex$AttachViewmodel();
};

function sleep(delay) {
  var start = (new Date()).getTime();
  while ((new Date()).getTime() - start < delay) {
    continue;
  }
}

function recordJsLoaded()
{
	let scripts = document.querySelectorAll('script');
	for(let item of scripts)
	{
		if(!item.hasAttribute("src"))
		{
			continue;
		}
		let name = item.src;
		name = name.substring(name.lastIndexOf('/')+1);
		if(reflex$jsloaded.indexOf(name) >= 0)
		{
			continue;
		}
		reflex$jsloaded.push(name);
	}
}

function recordJsLoadedByName(name)
{
	name = name.substring(name.lastIndexOf('/')+1);
	if(reflex$jsloaded.indexOf(name) >= 0)
	{
		return;
	}
	reflex$jsloaded.push(name);
}

function jsLoaded(name)
{
	name = name.substring(name.lastIndexOf('/')+1);
	return reflex$jsloaded.indexOf(name) >= 0;
}

function log(msg)
{
	let date = new Date();
	console.log(date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + " " + date.getMilliseconds() + "> " +  msg);
}

function addReflexLoadTask()
{
	
}

function createBindinds()
{
	createBindingAndDescent(document.documentElement);
}

function reflex$AttachViewmodel()
{
	reflex$FireDatasChanged(reflex$viewmodel, Object.keys(reflex$viewmodel));
}

function createBindingAndDescent(element)
{
	createBindingSingle(element);
	var children = element.childNodes;
	for (var i = 0; i < children.length; i++) {
	    var child = children[i];
		createBindingAndDescent(child);
	}
}

function createBindingSingle(element)
{
	let attrs = element.attributes;
	let attrsLength = 0;
	if(attrs)
	{
		attrsLength = attrs.length;
	}
	//log("create binding for:" + element.nodeName + " attrs: " + attrsLength);
	for(let i = 0; i < attrsLength; i++)
	{
		createBindingAttrSingle(element, attrs[i]);
	}
	if(element.nodeType == Node.TEXT_NODE)
	{
		let innerText = element.textContent.trim();
		if(isDynamicText(innerText))
		{
			bind(element, "text", innerText)
		}
	}
}

function createBindingAttrSingle(element, attr)
{
	let value = attr.nodeValue;
	if(isDynamicText(value))
	{
		bind(element, attr.nodeName, value);
	}
	else if(element.nodeName.toLowerCase() == "data")
	{
		reflex$viewmodel[attr.nodeName] = attr.nodeValue; 
	}
}

function bind(element, attr, value)
{
	log("bind : " + attr + " to: " + value);
	value = value.trim();
	value = value.substring(1, value.length -1);
	let binding = reflex$bindings.get(value);
	if(!binding)
	{
		reflex$bindings.set(value, new ExpressionBinding(value));
	}
	binding = reflex$bindings.get(value);
	binding.add(element, attr);
}

//通知数据发生了变化
function reflex$FireDataChanged(context, dataName)
{
	for (var [key, value] of reflex$bindings) {
		if(key.indexOf(dataName) >= 0)
		{
			value.apply(context);
		}
	}
}

//通知数据发生了变化
function reflex$FireDatasChanged(context, dataNames)
{
	for (var [key, value] of reflex$bindings) {
		for(var dataName of dataNames)
		{
			if(key.indexOf(dataName) >= 0)
			{
				value.apply(context);
				continue;
			}
		}
	}
}


//读取context上的值来计算表达式的值。如果考虑性能问题，可以指定props的值，否则把context上所有的属性都声明一遍。
function evalOnContext(context, props, expression)
{
	if(props.length == 0)
	{
		props = Object.keys(context);
	}
	if (props.length) 
	{
		var i, len;
		var code = "(function() {\n";
		for (i = 0, len = props.length; i < len; i++) 
		{
		  code += 'var ' + props[i] + ' = context.' + props[i] + ';\n';
		}
		code += 'return eval(\"' + expression+ '\");\n})()';
		return eval(code);
	}
}

function isDynamicText(text)
{
	text = text.trim();
	return (text.length > 0 && text.startsWith("{") && text.endsWith("}"))
}