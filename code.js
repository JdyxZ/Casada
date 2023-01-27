var MYCHAT =
{
	input: null,
	root: document.documentElement,
	new_chat_trigger : null,
	emoji_picker: new EmojiKeyboard,
	search_bar_box: null,
	chat_search_bar: null,
	eraser: null,
	chats_div: null,
	chats: null,
	menu: null,
	menu_grid: null,
	menu_dragger: null,
	menu_options: null,
	clamp: null,
	available_height: null,
	available_width: null,

	init:function()
	{
		// JS variables
		input = MYCHAT.Q("#chat-input");
		new_chat_trigger = MYCHAT.Q("#new-chat-trigger");
		search_bar_box = MYCHAT.Q(".search-bar-box");
		chat_search_bar = MYCHAT.Q("#chat-search-bar");
		eraser = MYCHAT.Q("#eraser");
		chats_div = MYCHAT.Q("#chats");
		chats = document.querySelectorAll("#chats > div");
		menu = MYCHAT.Q("#menu");
		menu_grid = MYCHAT.Q(".menu-grid");
		menu_dragger = MYCHAT.Q("#menu-dragger");
		menu_options = MYCHAT.Q("#menu-options");
		available_height = window.screen.availHeight;
		available_width = window.screen.availWidth;

		// CSS variables
		document.documentElement.style.setProperty('--screen_width', available_width + "px");
		document.documentElement.style.setProperty('--screen_height', available_height + "px");

		// Custom methods
		clamp = (num, min, max) => Math.min(Math.max(num, min), max);

		// Search a chat
		chat_search_bar.addEventListener("keyup", MYCHAT.onKeyUp);

		// Erase search
		eraser.addEventListener("click", () =>{
			chat_search_bar.value = "";
			chats.forEach( (element) => { element.style.display = ""; });
		});

		// Select a chat
		chats_div.addEventListener("click", MYCHAT.selectChat);

		// Emoji picker
		MYCHAT.emojiPickerInit();
		
		// Send a message
		input.addEventListener("keydown", MYCHAT.onKeyDown);

		// Menu dragger
		menu_dragger.addEventListener("mousedown", MYCHAT.dragMenu);

		//Open menu
		new_chat_trigger.addEventListener("click", () => {menu_grid.style.zIndex = "2";})

		// Close menu
		menu_options.addEventListener("click", () => {menu_grid.style.zIndex = "0";} );
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

		// Cross icon transition
		if(chat_search_bar.value.length > 0)
		{
			eraser.className = "eraser-showing";
			search_bar_box.style.marginBottom = "-9px";
		}
		else
		{
			eraser.className = "eraser-hidden";
			search_bar_box.style.marginBottom = "10px";
		}

		// Filter chats
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
		// Chat setup
		MYCHAT.emoji_picker.resizable = false;
		MYCHAT.emoji_picker.default_placeholder = "Search an emoji...";
		MYCHAT.emoji_picker.instantiate(MYCHAT.Q("#emoji-picker"));
		
		// Chat callback
        MYCHAT.emoji_picker.callback = (emoji, closed) => {
            input.value += emoji.emoji;
        };

		// Event listeners
		MYCHAT.Q(".grid-user-profile").addEventListener("click", MYCHAT.hideEmojiPicker);
		MYCHAT.Q(".grid-chat-profile").addEventListener("click", MYCHAT.hideEmojiPicker);
		MYCHAT.Q(".grid-chats").addEventListener("click", MYCHAT.hideEmojiPicker);
		MYCHAT.Q(".grid-current-chat").addEventListener("click", MYCHAT.hideEmojiPicker);
		MYCHAT.Q("#grid-layout").addEventListener("click", MYCHAT.hideEmojiPicker);
		document.addEventListener("keydown", MYCHAT.onKeyDown);
	},

	dragMenu:function(event)
	{
		// Event
		event = event || window.event;
		event.preventDefault();

		// Positions
		var xi, yi, Δx, Δy;

		// Get mouse cursor position at startup
		xi = event.clientX;
		yi = event.clientY;

		// Track mouse motion to perform the transition
		document.onmousemove = (event) => {

			// Event
			event = event || window.event;
			event.preventDefault();

			// Displacement
			Δx = event.clientX - xi;
			Δy = event.clientY - yi;

			// Set div new position
			menu.style.left = clamp((menu.offsetLeft + Δx), 0, available_width - available_width * 0.3 - 50) + "px";
			menu.style.top = clamp((menu.offsetTop + Δy), 0, available_height - available_height * 0.6 - 80) + "px";
			
			//Update intial potition to current potition
			xi = event.clientX;
			yi = event.clientY;

		};

		// Stop moving when the mouse is released
		document.onmouseup = () => {

			document.onmouseup = null;
			document.onmousemove = null;
		}
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