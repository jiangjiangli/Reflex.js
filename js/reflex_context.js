//reflex交互环境
class Reflex$InteractiveContext extends Object
{
  constructor()
  {
    super();
  }

  createBinding(element, includeSelf)
  {
    this.bindingContext = new Reflex$BindingContext(element, includeSelf);
  }

  //获取page name
  interactive(element)
  {
    let metas = element.getElementsByTagName("meta");
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
        this.interactivePage(pageName);
        break;
      }
    }
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

  }

  //创建router
  createRouter(str)
  {

  }
}
