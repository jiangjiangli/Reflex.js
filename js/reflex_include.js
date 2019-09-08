//用来加载html
class ReflexInclude extends Object
{

	constructor(element, src)
	{
		super();
		this.root =element;
		this.src = src;
		this.load(src);
		element.setAttribute("loaded",true);
		reflex$Log("reflex-include construct");
	}

	load(src)
	{
		var parent = this;
		let htmlJsName = "reflex$" + src.replace(/\./, "_");
		let content = window[htmlJsName];
		if(content)
		{
				parent.loadHtml(content);
				return;
		}
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

		this.childNodes = nodes;
		this.constructingIndex = 0;
		this.constructChildNext();
	}

	constructChildNext()
	{
		let nodes = this.childNodes;
		this.constructingIndex += 1;
		var context = this;
		for( let i=this.constructingIndex; i< nodes.length; i++)
		{
			var item = nodes[i];
			if(item.nodeName != "script" && item.nodeName != "SCRIPT")
			{
				this.root.appendChild(item.cloneNode(true) );
				continue;
			}
			var script = document.createElement('script');
			script.type = item.type || 'text/javascript';
			if(!item.hasAttribute('src') )
			{
				script.innerHTML = item.innerHTML;
				this.root.appendChild(script);
				continue;
			}
			if(reflex$JsLoaded(item.src))
			{
				continue;
			}
			this.constructingIndex = i;
			//script顺序加载
			script.onload = function(){ context.onScriptLoaded(context, item.src);};
			script.onerror = function(){ context.onScriptLoaded(context, item.src);};
			script.src = item.src;
		  this.root.appendChild(script);
			return;
		}
		this.bindingContext = new Reflex$BindingContext(this.root,false);
	}

	onScriptLoaded(context, name)
	{
		reflex$recordJsLoadedByName(name);
		context.constructChildNext();
	}
}
