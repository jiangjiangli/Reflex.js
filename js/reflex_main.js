

//本页面已经加载的js
var reflex$jsloaded = ["reflex.js"];
//当前正在构建的context
var context = new Reflex$InteractiveContext();
reflex$SetConstructingContext(context);

reflex$recordJsLoaded();
reflex$Log("reflex begin to run");

document.addEventListener("DOMContentLoaded", function(event)
{
  reflex$Log("document loaded");
  reflex$recordJsLoaded();
  context.createBinding(document.documentElement,true);
  context.interactive(document.documentElement);
});
