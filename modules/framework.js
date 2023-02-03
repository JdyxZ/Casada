
/***************** FRAMEWORK *****************/

Document.prototype.get = function(selector)	{
	const html_element = this.querySelector(selector);
	if(html_element == null)
	{
		console.log(`WARNING: Selector '${selector}' has not been found in the DOM. Returning empty div`);
		return this.createElement("div");
	}
	else
	{
		return html_element;
	}
};

Document.prototype.getAll = function(selector)
{
	const html_elements = this.querySelectorAll(selector);
	if(html_elements == null)
	{
		console.log(`WARNING: Selector '${selector}' has not been found in the DOM. Returning empty div`);
		return this.createElement("div");
	}
	else
	{
		return html_elements;
	}
};

Document.prototype.when = function(event, callback)	{
	document.addEventListener(event, callback);
};

Number.prototype.clamp = function(min, max) 
{
	return Math.min(Math.max(this.valueOf(), min), max);
};

Date.prototype.getTime = function() 
{
	return this.getHours().toString().padStart(2,"0") + ":" + this.getMinutes().toString().padStart(2, "0")
};

HTMLElement.prototype.getParents = function()
{
	let parents = new Array();
	let current_element = this;
	
	while (current_element.parentNode != null)
	{
		let parent = current_element.parentNode;
		parents.push(parent);
		current_element = parent;
	}

	return parents;    
};

HTMLElement.prototype.get = function(selector)	{
	const html_element = this.querySelector(selector);
	if(html_element == null)
	{
		console.log(`WARNING: Selector '${selector}' has not been found in the DOM. Returning empty div`);
		return this.createElement("div");
	}
	else
	{
		return html_element;
	}
};

HTMLElement.prototype.getAll = function(selector)	{
	const html_elements = this.querySelectorAll(selector);
	if(html_elements == null)
	{
		console.log(`WARNING: Selector '${selector}' has not been found in the DOM. Returning empty div`);
		return this.createElement("div");
	}
	else
	{
		return html_elements;
	}
};

HTMLElement.prototype.when = function(event, callback)	{
	this.addEventListener(event, callback);
};

HTMLElement.prototype.show = function()
{
	this.style.display = "";
};

HTMLElement.prototype.hide = function()
{
	this.style.display = "none";
};