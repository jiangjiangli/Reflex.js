# reflex.js
 
 ui职责：
 在什么时候，什么地方，显示什么东西，显示成什么样子。
 
 
 1)什么时候：
  1，时间
  2，事件
  
  事件来自于业务逻辑，可以通过数据来驱动。
  时间可以是相对的，可以得到某个条件变为true时候的时间
  
  最后都可以认为是条件。
  (```)
  <condition conditionname1="{state=='up'}" />
  <condition conditionname2="{$time == $conditionname1 + 1000}" />
  (```)
  2)什么地方，显示什么东西，显示成什么样子。都是数据驱动的，和条件结合，就是在不同条件下，改变数据。
  (```)
	<data text.conditionname1="hello state up"  text.conditionname2="up after 1000 ms"/>
  (```)
	
	
  
 效应器：
   数据绑定。
   
   数据来源：
      同一个name的数据改变了。
	  
	  
	  
	  
	  
   
