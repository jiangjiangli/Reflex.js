//reflex交互环境
class Reflex$InteractiveContext extends Object
{
  constructor(element)
  {
    super();
    this.element = element;
  }

//如果没指定pageName,则根据meta设定
  init(bidingSelf, pageName)
  {
    this.createBinding(bidingSelf);
    if(!pageName || pageName.trim().length() <= 0)
    {
      pageName  = this.getPageName();
    }
    if(!pageName)
    {
      return;
    }
    this.interactivePage(pageName);
  }

  createBinding(includeSelf)
  {
    this.bindingContext = new Reflex$BindingContext(this.element, includeSelf);
  }

  //获取page name,添加recept和router，使之可交互
  getPageName()
  {
    let metas = this.element.getElementsByTagName("meta");
    let length = metas.length;
    for (var i = 0; i < length; i++)
    {
      var name = metas[i].getAttribute("name");
      if ( name != "page" ) {
        continue;
      }
      var pageName = metas[i].getAttribute("content");
      if(pageName)
      {
        return pageName;
      }
    }
    return "";
  }

//根据page name获取recpet, router定义
  interactivePage(pageName)
  {
    let receptName = "reflex$" + pageName + "_recept";
    let receptContent = window[receptName];
    if(receptContent)
    {
      this.createReceptor(receptContent);
    }
    let routerName = "reflex$" + pageName + "_router";
    let routerContent = window[routerName];
    if(routerContent)
    {
      this.createRouter(routerContent);
    }
  }

  //创建感受器
  createReceptor(str)
  {
    var reg = /([^\{\}]+\{[^\{\}]+\})/g;
    var myArray =str.match(reg);
    for(let item of myArray)
    {
      this.createOneReceptor(item);
    }
  }

  createOneReceptor(item)
  {
     item = item.trim();
     let index = item.indexOf("{");
     if(index <= 0)
     {
       return;
     }
  	let name = item.substring(0, index);
    let define = item.substring(index+1);
    index = define.lastIndexOf("}");
    if(index > 0)
    {
      define = define.substring(0, index);
    }
    define = define.trim();
    let names = name.split(",");
    for(let idName of names)
    {
      let receptor = new Reflex$Receptor(this.element, idName, define);
    }
  }

  //创建router
  createRouter(str)
  {

  }
}
