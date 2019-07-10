# reflex.js
 
 .ui职责：
 在什么时候，什么地方，显示什么东西，显示成什么样子。
 
 
 什么时候：
  1，时间
  2，事件
  
  可以归结为条件。
 
  
  最后数据和条件结合，可以用来重新定义数据。为什么不把这些直接写到代码里？而是写在ui里，因为ui有一部分自己的显示逻辑。
   data.condition1=value1
   data.condition2 = value2
   
   
   condition1,condition2是互斥的。
   
   当一个条件满足了，data就使用对应的value，一直到有其他条件满足。
   
   条件的定义：
     条件支持:或
	 <condition condition1="{time=100}"/>
  
  
 效应器：
   数据绑定。
   
   数据来源：
      同一个name的数据改变了。
	  
	  
	  
	  
	  
   
