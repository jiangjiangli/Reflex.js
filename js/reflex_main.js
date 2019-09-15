

//本页面已经加载的js
var reflex$jsloaded = ["reflex.js"];


reflex$recordJsLoaded();
reflex$Log("reflex begin to run");

document.addEventListener("DOMContentLoaded", function(event)
{
  reflex$Log("document loaded");
  reflex$recordJsLoaded();
  //当前正在构建的context
  var context = new Reflex$InteractiveContext(document.documentElement);
  reflex$SetConstructingContext(context);
  context.init(true, "");
});
