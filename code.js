var MYCHAT =
{
	input: null,
	root: document.documentElement,
	emoji_picker: new EmojiKeyboard,
	chat_search_bar: null,

	init:function()
	{
		//Input box
		input = MYCHAT.Q(".input-box");

		// CSS variables
		document.documentElement.style.setProperty('--screen_width', window.screen.width + "px");
		document.documentElement.style.setProperty('--screen_height', window.screen.height + "px");

		// Search a chat
		chat_search_bar = MYCHAT.Q(".search-bar");
		chat_search_bar.addEventListener("keydown", MYCHAT.filterChats)

		//Emoji picker
		MYCHAT.emoji_picker.resizable = true;
		MYCHAT.emoji_picker.default_placeholder = "Search an emoji...";
		MYCHAT.emoji_picker.instantiate(MYCHAT.Q("#emoji-picker"));

        MYCHAT.emoji_picker.callback = (emoji, closed) => {
            input.value += emoji.emoji;
        };

		MYCHAT.Q(".grid-user-profile").addEventListener("click", MYCHAT.hideEmojiPicker);
		MYCHAT.Q(".grid-chat-profile").addEventListener("click", MYCHAT.hideEmojiPicker);
		MYCHAT.Q(".grid-chats").addEventListener("click", MYCHAT.hideEmojiPicker);
		MYCHAT.Q(".grid-current-chat").addEventListener("click", MYCHAT.hideEmojiPicker);
		MYCHAT.Q("#grid-layout").addEventListener("click", MYCHAT.hideEmojiPicker);
		document.addEventListener("keydown", MYCHAT.onKeyPressed);

		//Send a message
        input = MYCHAT.Q(".input-box");
		input.addEventListener("keydown", MYCHAT.onKeyPressed);
	},

	onKeyPressed: function(event)
	{
		//console.log(event.code);

		if(event.code == "Enter")
        {
            MYCHAT.sendMessage();
        } 
		else if(event.code == "Escape")
		{
			MYCHAT.hideEmojiPicker();
		}
	},

	sendMessage: function()
	{
		// Check input is not empty
		if (input.value == '') return;

		// Fetch template
		var message_template = MYCHAT.Q("#message-template")

		// Clone template
		var message_box = message_template.cloneNode(true);

		// Set input box text value to template
		message_box.querySelector(".message-content").innerText = input.value;

		// Set current time to template
		const date = new Date();
		message_box.querySelector(".message-time").innerText = date.getHours().toString().padStart(2,"0") + ":" + date.getMinutes().toString().padStart(2, "0");

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

	hideEmojiPicker:function(event)
	{
		let emoji_main_div = document.getElementById("emojikb-maindiv");

		if(!emoji_main_div.classList.contains("emojikb-hidden"))
		{
			MYCHAT.emoji_picker.toggle_window();
		}
	},

	Q: function(selector)
	{
		return document.querySelector(selector) || document.createElement("div");
	}

}