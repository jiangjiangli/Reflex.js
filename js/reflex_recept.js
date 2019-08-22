class InputStateChangeListener extends Object
{
	
}

//感受器-状态
class Reflex$InputStateBase extends Object
{
	constructor()
	{
		super();
	}
	
	connect(element)
	{
		this.element = element;
	}
	
	disConnect()
	{
		this.element = undefined;
	}
	
	addInputStateChangeListener(listener)
	{
		this.listener = listener;
	}
	
	fireStateChanged(value)
	{
		
	}
}