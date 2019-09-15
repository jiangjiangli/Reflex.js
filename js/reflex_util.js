
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

//搜索script，把它们记录在案,以防止重复加载
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

var reflex$ConstructingContext;


//设置当前的interactive context
function reflex$SetConstructingContext(context)
{
	reflex$ConstructingContext = context;
}

//注册str到当前html交互环境
function reflex$CreateReceptor(str)
{
	reflex$ConstructingContext.createReceptor(str);
}


//注册router到当前html交互环境
function reflex$CreateRouter(router)
{
	reflex$ConstructingContext.createRouter(router);
}

//在group外面，使用split
function reflex$ConsiderGroupSplit(value, seperator)
{
	let length  = value.length;
	let groupCount = 0;
	let indexLast = 0;
	let result = new Array();
	for(let i = 0; i < length; i++)
	{
		let charOne = value.charAt(i);
		switch(charOne)
		{
			case '{':
			case '(':
				groupCount++;
				break;
			case '}':
			case ')':
				groupCount--;
				break;
			case seperator:
				if(groupCount == 0)
				{
					result.push(value.substring(indexLast, i));
					indexLast = i+1;
				}
				break;
			default:
				break;
		}
	}
	if(length > indexLast)
	{
			result.push(value.substring(indexLast, length));
	}
	return result;
}

function reflex$ArrayContains(arr, value)
{
    var i = arr.length;
    while (i--) {
        if (arr[i] === value) {
            return true;
        }
    }
    return false;
}

//输出log,带有时间
function reflex$Log(msg)
{
	let date = new Date();
	console.log(date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + " " + date.getMilliseconds() + "> " +  msg);
}
