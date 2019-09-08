# reflex.js

灵感来自于人的反射弧，把一个html页面看成5部分： 视图、感受器、业务逻辑、 数据模型、效应器。

 **视图：**

 在什么时候，什么地方，显示什么东西，显示成什么样子。


 1)什么时候：

  1，时间

  2，事件

  事件来自于业务逻辑，可以通过数据来驱动。

  时间可以是相对的，可以得到某个条件变为true时候的时间

  最后都可以认为是条件。

  ```
  <condition conditionname1="{state=='up'}" />

  <condition conditionname2="{$time == $conditionname1 + 1000}" />
  ```
  2)显示什么东西
  一个UI控件是否显示可通过show,hide属性来指定，属性值就是上面定义的条件，可以多个，如果是show，意味着任何一个条件满足，就要显示该UI；如果是hide,则任何一个条件满足，就会隐藏该UI。如果设置show,hide，则默认一直显示。
  ```
    <nav include="editor.html" show="conditionname2"></nav>
  ```
  3)什么地方，显示什么东西，显示成什么样子。都是数据驱动的，和条件结合，就是在不同条件下，改变数据。

  ```
	<data text.conditionname1="hello state up"  text.conditionname2="up after 1000 ms"/>
  ```

 **感受器: **

 感受外部刺激，也就是用户的输入。



 **效应器：**

   数据绑定。

   数据来源：
      同一个name的数据改变了。
