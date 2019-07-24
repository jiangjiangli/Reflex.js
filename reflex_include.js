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

customElements.define("rf-include", ReflexInclude);
