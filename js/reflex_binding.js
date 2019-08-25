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
			if(element.type == "condition")
			{
				return element.context.onCondtionValue(attr,element, value);
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


//遍历当下的dom，建立数据绑定环境，不包括rf-include.rf-include加载后，创建自己的binding context
class Reflex$BindingContext extends Object
{
	constructor(element, includeSelf)
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
		//{condition0:[element,]},{}]};
		this.conditionShowMap = new Map();
		this.createBindingAndDescent(element,includeSelf);
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
	//conditionObject格式： {name: name, value:false, context: this, type: "condition", }
	//返回: 是否需要删除该condition的监听
	onCondtionValue(name, conditionObject,value)
	{
		let index = this.timeConditions.indexOf(name);
		let first = false;
		let oldValue = conditionObject.value;
		let changed = oldValue != value;
		if(!changed)
		{
			return false;
		}
		conditionObject.value = value;
		if(value)
		{
			if(index >= 0)
			{
				first = true;
				reflex$Log(name + " meet!");
				this.viewmodel["$" + name] = this.viewmodel["$time"];
			}
		}
		let shouldDelete  = false;
		if(index >= 0)
		{
			shouldDelete=  this.timeConditionShoudleDeleted(conditionObject, oldValue);
			if(shouldDelete)
			{
				this.timeConditions.splice(index,1);
			}
		}
		if(this.timeConditions.length == 0)
		{
			clearInterval(this.intervalId);
			reflex$Log(" clear timer!");
		}
		//更改显示设置
		this.showOrHideByConditionChanged(name);
		if(!value)
		{
			return shouldDelete;
		}
		//如果条件为true,则检查condition data，使得生效
		this.makeConditionDataApplied(name);
		//update time condition value
		if(index>=0)
		{
			this.fireDatasChanged(this.viewmodel, "$" + name);
		}
		return shouldDelete;
	}

	timeConditionShoudleDeleted(conditionObject, oldValue)
	{
		if(oldValue== undefined)
		{
			return false;
		}
		return oldValue != conditionObject.value;
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

	showOrHideByConditionChanged(condition)
	{
		//{condition0:[element,]},{}]};
		if(!this.conditionShowMap.has(condition))
		{
			return;
		}
		let array = this.conditionShowMap.get(condition);
		for(let element of array)
		{
			this.showOrHideOneElement(element);
		}
	}

	//默认可见
	showOrHideOneElement(element)
	{
		let showValue = element.getAttribute("show");
		let visible = true;
		if(showValue && showValue.length > 0)
		{
			  visible = false;
				//只有一个conditon满足，就可见
				let conditions = showValue.split(",");
				for(let condition of conditions)
				{
					if(this.isConditionValueTrue(condition))
					{
						visible = true;
						break;
					}
				}
		}
		if(!visible)
		{
			 this.applysHowOnElement(element,visible);
			return;
		}
		let hideValue = element.getAttribute("hide");
		if(!hideValue)
		{
		  this.applysHowOnElement(element,visible);
			return;
		}
		//只有一个conditon满足，就可见
		let conditions = hideValue.split(",");
		for(let condition of conditions)
		{
			if(this.isConditionValueTrue(condition))
			{
				visible = false;
				break;
			}
		}
		 this.applysHowOnElement(element,visible);
	}

	applysHowOnElement(element, show)
	{
			if(show)
			{
				$(element).show();
				return;
			}
			$(element).hide();
	}

	createBindingAndDescent(element,includeSelf)
	{
		if(includeSelf)
		{
				this.createBindingSingle(element);
		}
		var children = element.childNodes;
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			this.createBindingAndDescent(child,true);
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
			let attr = attrs[i];
			if(attr.nodeName == "include")
			{
				if(element.getAttribute("loaded"))
				{
						continue;
				}
				new ReflexInclude(element, attr.nodeValue);
				continue;
			}
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
			return;
		}
		let nodeName = attr.nodeName;
		if(nodeName == "show" || nodeName == "hide")
		{
			this.addToShowMap(element, value);
		}
	}

	addToShowMap(element, nodeValue)
	{
		 let conditions = nodeValue.split(",");
		 for(let condition of conditions)
		 {
			 let array;
			 if(!this.conditionShowMap.has(condition))
			 {
				 array = [];
				 this.conditionShowMap.set(condition, array);
			 }
			 else {
			 	array = this.conditionShowMap.get(condition);
			 }
			 if(array.indexOf(element) >= 0)
			 {
				 continue;
			 }
			 array.push(element);
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
		let conditionOne = {name: name, value:undefined, context: this, type: "condition"};
		this.conditions.set(name, conditionOne);
		if(!this.isDynamicText(value))
		{
			let result = value.toLowerCase() == "true";
			conditionOne.value = result;
			this.onCondtionValue(name, conditionOne,result);
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

	isConditionValueTrue(name)
	{
		 if(!this.conditions.has(name))
		 {
			 return false;
		 }
		 return this.conditions.get(name).value;
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
