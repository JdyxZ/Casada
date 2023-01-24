var MYCHAT =
{
	input: null,
	chat_search_bar: null,

	init:function()
	{
		// Search a chat
		chat_search_bar = MYCHAT.Q(".search-bar");
		chat_search_bar.addEventListener("keydown", MYCHAT.filterChats)

		//Send a message
        input = MYCHAT.Q(".input-box");
		input.addEventListener("keydown", MYCHAT.onKeyPressed);
	},

	onKeyPressed: function(event)
	{
		if(event.code == "Enter")
        {
            MYCHAT.sendMessage();
        } 
	},

	sendMessage: function()
	{
		// Get input box text
		var input = MYCHAT.Q(".input-box");

		// Check input is not empty
		if (input.value == '') return;

		// Fetch template
		var message_template = MYCHAT.Q("#message-template")

		// Clone template
		var message_box = message_template.cloneNode(true);

		// Set input box text value to template
		message_box.querySelector(".message").innerText = input.value;

		// Add template to the DOM
		MYCHAT.Q("#current-chat").appendChild(message_box);

		// Show new message
		message_box.style.display = ''

		//Update scrollbar focus
		message_box.scrollIntoView();

		// Clean input box
		input.value = ''
	},

	filterChats:function()
	{
		var query = chat_search_bar.value;
		console.log(query);
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
		var template = MYCHAT.Q("#template .msg")
		var msg = template.cloneNode(true);
		msg.querySelector("username").innerText="Javi";
		msg.querySelector(".content").innerText="lalala";
		MYCHAT.Q(".logcontent").appendChild(msg);

	},

	Q: function(selector)
	{
		return document.querySelector(selector) || document.createElement("div");
	}
}