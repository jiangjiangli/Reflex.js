﻿//感受器

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
	
	//添加目标对象和目标属性
	add(element, attr)
	{
		this.targets.push({element:element, attr: attr});
	}
	
	//返回是否还存在数据绑定
	apply(context)
	{
		var result = reflex$EvalOnContext(context,[], this.expression);
		let count = this.targets.length;
		for(let i = 0; i < count; i++)
		{
			let item = this.targets[i];
			//需要删除
			if(this.applyOn(item.element, item.attr,result))
			{
				this.targets.splice(i, 1);
				i--;
				count--;
			}
		}
		return this.targets.length > 0;
	}
	
	//返回true表示不需要再计算该值了。
	applyOn(element, attr, value)
	{
		if(element.nodeType == Node.TEXT_NODE)
		{
			element.textContent = value;
		}
		else if(element.hasAttribute && element.hasAttribute(attr))
		{
			element.setAttribute(attr, value);
		}
		else if(element.context)
		{
			//condition
			if(element.type == "condition" && value)
			{
				element.context.onCondtiionTrue(attr,element);
				return true;
			}
			else if(element.type == "data")
			{
				element.context.changeViewModelData(attr, value);
			}
			else if(element.type == "conditionData")
			{
				element.context.onConditionDataChanged(element, attr, value);
			}
		}
		return false;
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
		//{condition0:[{context:context, type:'conditionData',condition:'',dataName:'', dataValue:''},{}]};
		this.conditionDatas = new Map();
		this.conditions = new Map();
		this.usingData2ConditionDataMap = new Map();
		this.timeConditions = [];
		this.element = element;
		this.createBindingAndDescent(element);
		//要启动时间,一直到所有的时间条件都满足了
		if(this.timeConditions.length > 0)
		{
			this.intervalCount = 0;
			this.intervalId = setInterval(this.updateTime, 100, this);
			this.updateTime(this);
		}
		this.fireDatasChanged(this.viewmodel, Object.keys(this.viewmodel));
	}
	
	//更新时间，每100ms更新一次
	updateTime(context)
	{
		context.viewmodel["$time"] = 100 * context.intervalCount;
		++context.intervalCount;	
		context.fireDatasChanged(context.viewmodel, ["$time"]);
	}
	
	//条件为true,每个条件只能满足一次，满足后，就会被删除。
	//conditionObject格式： {name: name, value:false, context: this, type: "condition"}
	onCondtiionTrue(name, conditionObject)
	{
		let index = this.timeConditions.indexOf(name);
		let first = false;
		if(index >= 0)
		{
			first = true;
			reflex$Log(name + " meet!");
			this.viewmodel["$" + name] = this.viewmodel["$time"];
			this.timeConditions.splice(index,1);
		}
		if(first && this.timeConditions.length == 0)
		{
			clearInterval(this.intervalId);
			reflex$Log(" clear timer!");
		}
		conditionObject.value = true;
		//如果条件为true,则检查condition data，使得生效
		this.makeConditionDataApplied(name);
		if(first)
		{	
			this.fireDatasChanged(this.viewmodel, "$" + name);
		}
	}
	
	//在当前condition下，使data.condition 生效
	makeConditionDataApplied(name)
	{
		let list = this.conditionDatas.get(name);
		if(!list)
		{
			return;
		}
		//{context:context, type:'conditionData',condition:'',dataName:'', dataValue:''}
		let names = [];
		for(let item of list)
		{
			this.viewmodel[item.dataName] = item.dataValue;
			names.push(item.dataName);
			this.usingData2ConditionDataMap.set(item.dataName, item.dataName + "." + name);
		}
	    this.fireDatasChanged(this.viewmodel, names);
	}
	
	//target的格式{context:context, type:'conditionData',condition:'',dataName:'', dataValue:''}
	onConditionDataChanged(target, nameWithCondition, newValue)
	{
		target.dataValue = newValue;
		let conditionDataName = this.usingData2ConditionDataMap.get(target.dataName);
		if(conditionDataName == nameWithCondition)
		{
			this.changeViewModelData(target.dataName, newValue);
		}
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
		if(element.nodeName.toLowerCase() == "condition")
		{
			for(let i = 0; i < attrsLength; i++)
			{
				this.createConditionAttrSingle(element, attrs[i]);
			}
			return;
		}
		if(element.nodeName.toLowerCase() == "data")
		{
			for(let i = 0; i < attrsLength; i++)
			{
				this.createDataAttrSingle(element, attrs[i]);
			}
			return;
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
	
	//解析html上的binding
	createBindingAttrSingle(element, attr)
	{
		let value = attr.nodeValue;
		if(this.isDynamicText(value))
		{
			this.bind(element, attr.nodeName, value);
		}
	}
	
	//解析data
	createDataAttrSingle(element, attr)
	{
		let value = attr.nodeValue;
		value = value.trim();
		let isDynamic = this.isDynamicText(value);
		let name = attr.nodeName;
		let index = name.indexOf(".");
		//条件数据
		if(index > 0)
		{
			let condition = name.substr(index+1);
			name = name.substring(0, index);
			
			let datas = this.conditionDatas.get(condition);
			if(!datas)
			{
				datas = [];
				this.conditionDatas.set(condition, datas);
			}
			//{context:context, type:'conditionData',condition:'',dataName:'', dataValue:''}
			let dataOne = {context:this,type:"conditionData", condition:condition, dataName: name};
			datas.push(dataOne);
			if(isDynamic)
			{
				this.bind(dataOne, attr.nodeName, value);
			}
			else{
				dataOne.dataValue = value;
			}
		}//正常数据
		else
		{
			if(isDynamic)
			{
				this.bind( {context:this, type:"data"}, name, value);
			}
			else{
				this.changeViewModelData(name, value);
			}	
		}
	}
	
	//解析condition
	createConditionAttrSingle(element, attr)
	{
		let value = attr.nodeValue;
		let name = attr.nodeName;
		value = value.trim();
		let conditionOne = {name: name, value:false, context: this, type: "condition"};
		this.conditions.set(name, conditionOne);
		if(!this.isDynamicText(value))
		{
			let result = value.toLowerCase() == "true";
			conditionOne.value = result;
			if(result)
			{
				this.onCondtiionTrue(name, conditionOne);
			}
			return;
		}
		value = value.substring(1, value.length -1);
		let binding = this.bindings.get(value);
		if(!binding)
		{
			this.bindings.set(value, new ExpressionBinding(value));
		}
		if(value.indexOf("$time") >= 0)
		{
			this.timeConditions.push(name);
		}
		binding = this.bindings.get(value);
		binding.add(conditionOne, name);
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
	
	
	changeViewModelData(name, value)
	{
		this.viewmodel[name] = value;
		this.fireDataChanged(this.viewmodel, name);
	}

	//通知数据发生了变化
	fireDataChanged(context, dataName)
	{
		let names = [];
		for (var [key, value] of this.bindings) {
			if(key.indexOf(dataName) >= 0)
			{
				if(!value.apply(context))
				{
					names.push(key);
				}
			}
		}
		for(let name of names)
		{
			this.bindings.delete(name);
		}
	}

	//通知数据发生了变化
	fireDatasChanged(context, dataNames)
	{
		let names = [];
		for (var [key, value] of this.bindings) {
			for(var dataName of dataNames)
			{
				if(key.indexOf(dataName) >= 0)
				{
					if(!value.apply(context))
					{
						names.push(key);
					}
					continue;
				}
			}
		}
		for(let name of names)
		{
			this.bindings.delete(name);
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
		try{
			return  eval(code);
		}
		catch(err)
		{
			return undefined;
		}
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



