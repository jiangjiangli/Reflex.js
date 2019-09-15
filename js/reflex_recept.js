//reflex感受器
class Reflex$Receptor extends Object
{
	constructor(root, name, receptor)
	{
		super();
		this.root  = root;
		this.name = name.trim();
		this.receptor = receptor;
		this.stimulations = [];
		//得到element
		this.element = $(this.name);
		//解析receptor
		let result = reflex$ConsiderGroupSplit(receptor, ',');
		for(let item of result)
		{
			this.createStimulation(this.element, item);
		}
	}

	createStimulation(element, value)
	{
		let one = new Reflex$Stimulation(this.root, element, value);
		one.addStimulationListener(this);
		this.stimulations.push(one);
	}
}

class Reflex$Stimulation extends Object
{
	constructor(root, element, stimulation)
	{
		super();
		this.root  = root;
		this.element = element;
		this.stimulation = stimulation;
		let index = stimulation.lastIndexOf(":");
		this.name = stimulation.substring(index+1);
		let conditions = stimulation.substring(0, index);
		//获取所有的状态.
		var reg = /(\w+)/g;
		var states =conditions.match(reg);
		reg = /(['"]\w+['"])/g;
	  var values =conditions.match(reg);
		let length = values.length;
		for(let i = 0; i < length; i++)
		{
			let item = values[i];
			values[i] =item.substring(1, item.length -1);
		}
		states = states.filter(function(item) { return !reflex$ArrayContains(values,item ) && Number.isNaN(parseFloat(item)); });
		//get state objects
	}


	addStimulationListener(listener)
	{
		this.listener = listener;
	}
}
