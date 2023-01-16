var MYCHAT =
{
	init:function()
	{
        var input = document.querySelector(".input-box");
		input.addEventListener("keydown", MYCHAT.onKeyPressed);
	},

	onKeyPressed: function(event)
	{
		if(event.code == "Enter")
        {
            sendMessage()
        } 
	},

	sendMessage: function()
	{
		var input = document.querySelector(".input-box");
        var template_message_box = document.querySelector("#template-message-box")
		var message_box = template_message_box.cloneNode(true);
		message_box.querySelector("p").innerText=input.value;
		document.querySelector("#current_chat").appendChild(msg);
	},

	changeRoom:function()
	{
		//TODO
	},

	onUserJoins:function()
	{

	},

	showMessage:function()
	{
		var template = document.querySelector("#templates .msg")
		var msg = template.cloneNode(true);
		msg.querySelector("username").innerText="Javi";
		msg.querySelector(".content").innerText="lalala";
		document.querySelector(".logcontent").appendChild(msg);

	}
}