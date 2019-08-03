

//本页面已经加载的js
var reflex$jsloaded = ["reflex.js"];
//当前正在构建的context
var context = new Reflex$InteractiveContext();
reflex$SetConstructingContext(context);

//本页面最顶层的binding context
var reflex$BindingContext;
reflex$recordJsLoaded();
reflex$Log("reflex begin to run");

window.onload = (e) =>
{
  reflex$Log("window  loaded");
  reflex$recordJsLoaded();
  reflex$BindingContext = new Reflex$BindingContext(document.documentElement);
	//问题：怎么加载当前页面的感受器、router和业务逻辑代码。
	//加载本页面的感受器和router.怎么知道本页面?
};
