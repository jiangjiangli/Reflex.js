
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
		reflex$Log("reflex-include construct")
	}
	
	connectedCallback() 
	{
		reflex$Log("reflex-include connectd")
		if(!this.hasAttribute("src"))
		{
			reflex$Log("Failed to get src attribute, it's no defined");
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
				reflex$Log(error);
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
				if(reflex$JsLoaded(item.src))
				{
					continue;
				}
				script.src = item.src;
				recordJsLoadedByName(item.src);
			}
			script.innerHTML = item.innerHTML;
			this.root.appendChild(script);	
		}
		this.bindingContext = new Reflex$BindingContext(this.root);
	}
}


//用来计算表达式，和绑定数据到视图
class ExpressionBinding extends Object
{
	constructor(expression)
	{
		super();
		this.expression = expression;
		this.targets = [];
	}
	
	add(element, attr)
	{
		this.targets.push({element:element, attr: attr});
	}
	
	apply(context)
	{
		var result = reflex$EvalOnContext(context,[], this.expression);
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


//数据绑定
class Reflex$BindingContext extends Object
{
	constructor(element)
	{
		super();
		this.viewmodel = {};
		this.bindings = new Map();
		this.element = element;
		this.createBindingAndDescent(element);
		this.fireDatasChanged(this.viewmodel, Object.keys(this.viewmodel));
	}
	
	
	createBindingAndDescent(element)
	{
		this.createBindingSingle(element);
		var children = element.childNodes;
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			this.createBindingAndDescent(child);
		}
	}
	
	
	createBindingSingle(element)
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
			this.createBindingAttrSingle(element, attrs[i]);
		}
		if(element.nodeType == Node.TEXT_NODE)
		{
			let innerText = element.textContent.trim();
			if(this.isDynamicText(innerText))
			{
				this.bind(element, "text", innerText)
			}
		}
	}
	
	
	createBindingAttrSingle(element, attr)
	{
		let value = attr.nodeValue;
		if(this.isDynamicText(value))
		{
			this.bind(element, attr.nodeName, value);
		}
		else if(element.nodeName.toLowerCase() == "data")
		{
			this.viewmodel[attr.nodeName] = attr.nodeValue; 
		}
	}
	
	isDynamicText(text)
	{
		text = text.trim();
		return (text.length > 0 && text.startsWith("{") && text.endsWith("}"))
	}
	
	
	bind(element, attr, value)
	{
		reflex$Log("bind : " + attr + " to: " + value);
		value = value.trim();
		value = value.substring(1, value.length -1);
		let binding = this.bindings.get(value);
		if(!binding)
		{
			this.bindings.set(value, new ExpressionBinding(value));
		}
		binding = this.bindings.get(value);
		binding.add(element, attr);
	}
	

	//通知数据发生了变化
	fireDataChanged(context, dataName)
	{
		for (var [key, value] of this.bindings) {
			if(key.indexOf(dataName) >= 0)
			{
				value.apply(context);
			}
		}
	}

	//通知数据发生了变化
	fireDatasChanged(context, dataNames)
	{
		for (var [key, value] of this.bindings) {
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

}

//读取context上的值来计算表达式的值。如果考虑性能问题，可以指定props的值，否则把context上所有的属性都声明一遍。
function reflex$EvalOnContext(context, props, expression)
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

function sleep(delay) {
  var start = (new Date()).getTime();
  while ((new Date()).getTime() - start < delay) {
    continue;
  }
}

function reflex$recordJsLoaded()
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

function reflex$recordJsLoadedByName(name)
{
	name = name.substring(name.lastIndexOf('/')+1);
	if(reflex$jsloaded.indexOf(name) >= 0)
	{
		return;
	}
	reflex$jsloaded.push(name);
}

function reflex$JsLoaded(name)
{
	name = name.substring(name.lastIndexOf('/')+1);
	return reflex$jsloaded.indexOf(name) >= 0;
}

function reflex$Log(msg)
{
	let date = new Date();
	console.log(date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + " " + date.getMilliseconds() + "> " +  msg);
}

customElements.define("rf-include", ReflexInclude);

var reflex$jsloaded = ["reflex.js"];
var reflex$BindingContext;
reflex$recordJsLoaded();
reflex$Log("reflex begin to run");

window.onload = (e) => 
{
  reflex$Log("loaded");
  reflex$recordJsLoaded();
  reflex$BindingContext = new Reflex$BindingContext(document.documentElement);
};




