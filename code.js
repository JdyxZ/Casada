var MYCHAT =
{
	input: null,
	root: document.documentElement,
	emoji_picker: new EmojiKeyboard,
	chat_search_bar: null,
	chats: null,

	init:function()
	{
		//Input box
		input = MYCHAT.Q("#chat-input");

		// CSS variables
		document.documentElement.style.setProperty('--screen_width', window.screen.availWidth + "px");
		document.documentElement.style.setProperty('--screen_height', window.screen.availHeight + "px");

		// Search a chat
		chat_search_bar = MYCHAT.Q("#chat-search-bar");
		chat_search_bar.addEventListener("keyup", MYCHAT.onKeyUp);

		//Select a chat
		chats = MYCHAT.Q("#chats");
		chats.addEventListener("click", MYCHAT.selectChat);

		//Emoji picker
		MYCHAT.emojiPickerInit();
		
		//Send a message
		input.addEventListener("keydown", MYCHAT.onKeyDown);
	},

	onKeyDown: function(event)
	{
		//console.log(event.key);
		
		if(this.id == "chat-input")
		{
			if(event.code == "Enter")
			{
				MYCHAT.sendMessage();
			}
		}
		
		if(event.code == "Escape")
		{
			MYCHAT.hideEmojiPicker();
		}
		 
		
	},

	onKeyUp: function(event)
	{
		if(this.id == "chat-search-bar")
		{
			MYCHAT.filterChats();
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
		const query = chat_search_bar.value;
		const regex = new RegExp(query, "i");
		const chats = document.querySelectorAll("#chats > div");

		console.log(chats);

		chats.forEach(function(element){

			if(query.length == 0)
			{
				element.style.display = "";
			}
			else
			{
				const username = element.querySelector("#chat-info-username").innerText;
				const last_message = element.querySelector("#chat-info-last-message").innerText;
	
				if(regex.test(username) || regex.test(last_message))
				{
					element.style.display = "";
				}
				else
				{
					element.style.display = "none";
				}
			}
		});

	},

	selectChat:function(event)
	{
		selected_chat = MYCHAT.Q(".selected-chat");
		const regex = /chat[1-9]+/;
		
		for (const element of event.path)
		{
			if(element.id != undefined && element.id.match(regex) != null)
			{
				console.log(selected_chat)
				//Swap current selected chat to not selected
				selected_chat.className = "chat";
				selected_chat.querySelector("#chat-info-footer").style.display = "";

				//Select the clicked chat
				element.className = "selected-chat";
				element.querySelector("#chat-info-footer").style.display = "none";

				//End execution
				break;
			}
		}
	},

	emojiPickerInit:function()
	{
		MYCHAT.emoji_picker.resizable = false;
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
		document.addEventListener("keydown", MYCHAT.onKeyDown);
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