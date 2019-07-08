//”√¿¥º”‘ÿhtml
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

var reflex$jsloaded = ["reflex.js"];
recordJsLoaded();
log("reflex begin to run");
window.onload = (e) => 
{
  log("loaded");
  recordJsLoaded();
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

function parse()
{
	
}