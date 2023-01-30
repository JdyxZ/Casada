var MYCHAT =
{
	input: null,
	root: document.documentElement,
	new_chat_trigger : null,
	emoji_picker: new EmojiKeyboard,
	search_bar_box: null,
	chat_search_bar: null,
	chat_eraser: null,
	chats: null,
	chats_children: null,
	menu: null,
	menu_grid: null,
	menu_dragger: null,
	menu_options: null,
	clamp: null,
	available_height: null,
	available_width: null,
	avatar_uploader: null,
	new_avatar: null,
	new_nick: null,
	new_room: null,
	reset_changes: null,
	apply_changes: null,
	current_avatar: null,
	current_nick: null,
	current_room: null,
	available_rooms: null,
	rooms_datalist: null,

	init:function()
	{
		// JS variables
		input = MYCHAT.Q("#keyboard-input");
		new_chat_trigger = MYCHAT.Q("#new-chat-trigger");
		search_bar_box = MYCHAT.Q(".grid-chats .search-bar");
		chat_search_bar = MYCHAT.Q("#chat-search-bar");
		chat_eraser = MYCHAT.Q("#chat-eraser");
		chats = MYCHAT.Q("#chats");
		chats_children = document.querySelectorAll("#chats > div");
		menu = MYCHAT.Q("#menu");
		menu_grid = MYCHAT.Q(".menu-grid");
		menu_dragger = MYCHAT.Q("#menu-dragger");
		menu_options = MYCHAT.Q("#menu-options");
		available_height = window.screen.availHeight;
		available_width = window.screen.availWidth;
		avatar_uploader = MYCHAT.Q("#avatar-uploader");
		new_avatar = MYCHAT.Q("#new-avatar");
		new_nick = MYCHAT.Q("#new-nick");
		new_room = MYCHAT.Q("#new-room");
		reset_changes = MYCHAT.Q("#reset-changes");
		apply_changes = MYCHAT.Q("#apply-changes");
		current_avatar = MYCHAT.Q("#user-avatar");
		current_nick = MYCHAT.Q("#username");
		current_room = "1234";
		available_rooms = ["La casa de las cariñosas", "Una sala de fitness peculiar...", "La guarida de la rata", "1234"];
		rooms_datalist = MYCHAT.Q("#available-rooms");

		// CSS variables
		document.documentElement.style.setProperty('--screen_width', available_width + "px");
		document.documentElement.style.setProperty('--screen_height', available_height + "px");

		// Custom methods
		clamp = (num, min, max) => Math.min(Math.max(num, min), max);

		// Search a chat
		chat_search_bar.addEventListener("keyup", MYCHAT.onKeyUp);

		// Erase search
		chat_eraser.addEventListener("click", MYCHAT.eraseChatSearch);

		// Select a chat
		chats.addEventListener("click", MYCHAT.selectChat);

		// Emoji picker
		MYCHAT.emojiPickerInit();
		
		// Send a message
		input.addEventListener("keydown", MYCHAT.onKeyDown);

		// Menu dragger
		menu_dragger.addEventListener("mousedown", MYCHAT.dragMenu);

		// Open menu
		new_chat_trigger.addEventListener("click", MYCHAT.openMenu);

		// Close menu
		menu_options.addEventListener("click", MYCHAT.closeMenu);

		// Change avatar
		avatar_uploader.addEventListener("click", MYCHAT.changeAvatar);

		// Reset changes
		reset_changes.addEventListener("click", MYCHAT.resetSetup);

		// Save setup
		apply_changes.addEventListener("click", MYCHAT.saveSetup);

		// Load rooms
		MYCHAT.loadRooms();
	},

	onKeyDown: function(event)
	{
		//console.log(event.key);
		
		if(this.id == "keyboard-input")
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

		// Fetch current conversation
		const current_conversation = MYCHAT.Q(".grid-conversations .current")

		// Fetch the current conversation type
		const conversation_classes = current_conversation.classList;

		// Fetch private or group template
		const message_template = conversation_classes.contains("private") ? MYCHAT.Q("#private-message-template") : MYCHAT.Q("#group-message-template");

		// Clone template
		var message_box = message_template.cloneNode(true);

		// Set username in case of group template
		if (conversation_classes.contains("group")) message_box.querySelector(".username").innerText = current_nick;

		// Set input box text value to template
		message_box.querySelector(".message-content").innerText = input.value;

		// Set current time to template
		const date = new Date();
		message_box.querySelector(".message-time").innerText = date.getHours().toString().padStart(2,"0") + ":" + date.getMinutes().toString().padStart(2, "0");

		// Add template to the DOM
		current_conversation.querySelector(".conversation").appendChild(message_box);

		//Delete template old attributes
		message_box.removeAttribute('style');
		message_box.removeAttribute('id');

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
		if(query.length > 0)
		{
			chat_eraser.classList.replace("eraser-hidden", "eraser-showing");
			search_bar_box.style.marginBottom = "-9px";
		}
		else
		{
			chat_eraser.classList.replace("eraser-showing", "eraser-hidden");
			search_bar_box.style.marginBottom = "10px";
		}

		// Filter chats
		chats_children.forEach(function(element){

			if(query.length == 0)
			{
				element.style.display = "";
			}
			else
			{
				const username = element.querySelector(".username").innerText;
				const last_message = element.querySelector(".last-message").innerText;
	
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

	eraseChatSearch:function()
	{
		chat_search_bar.value = "";
		chat_eraser.classList.replace("eraser-showing", "eraser-hidden");
		search_bar_box.style.marginBottom = "10px";
		chats_children.forEach( (element) => { 
			element.style.display = ""; 
		});
	},

	selectChat:function(event)
	{
		const current_chat = MYCHAT.Q("#chats .current");
		const current_conversation = MYCHAT.Q(".grid-conversations .current");
		const regex = /chat[1-9]+/;
		
		for (const element of event.path)
		{
			if(element.id != undefined && element.id.match(regex) != null)
			{
				// Swap current selected chat to not selected
				current_chat.classList.replace("current", "chat");

				// Select the clicked chat
				element.classList.replace("chat", "current");

				// Swap current conversation to not selected
				current_conversation.classList.replace("current", "not-current");

				// Change to the conversation of the clicked chat
				MYCHAT.Q("#" + element.id + "-conversation").classList.replace("not-current", "current");

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
		MYCHAT.Q(".grid-conversations").addEventListener("click", MYCHAT.hideEmojiPicker);
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
			menu.style.left = clamp((menu.offsetLeft + Δx), 0, available_width - menu.offsetWidth - 50) + "px";
			menu.style.top = clamp((menu.offsetTop + Δy), 0, available_height - menu.offsetHeight - 80) + "px";
			
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

	openMenu:function()
	{
		// Load menu
		menu_grid.style.zIndex = "2";
		menu_grid.style.display = "";

		menu.style.left = (available_width - menu.offsetWidth) / 2 + "px";
		menu.style.top = (available_height - menu.offsetHeight) / 2 + "px";

		// Load available rooms
		MYCHAT.loadRooms();

	},

	changeAvatar:function()
	{
		// File uploader and avatar image
		file_uploader = MYCHAT.Q("#menu input[type='file']");

		// Launch file manager event
		file_uploader.click();

		// Change user avatar
		file_uploader.addEventListener("change", () =>{
			const reader = new FileReader();
			reader.readAsDataURL(file_uploader.files[0]);
			reader.addEventListener("load", () => {
				new_avatar.src = reader.result;				
			});
		});

		
	},

	resetSetup:function()
	{
		new_avatar.src = "images/default_avatar.jpg";
		new_nick.value = "";
		new_room.value = "";
	},

	saveSetup:function()
	{
		// Check all fields are not empty
		if(new_nick.value == "") new_nick.style.border = "2px #912626 solid", new_nick.placeholder = "Choose a nick";
		else new_nick.style.border = "none", new_nick.placeholder = "";
		if(new_room.value == "") new_room.style.border = "2px #912626 solid", new_room.placeholder = "Choose a room";
		else new_room.style.border = "none", new_room.placeholder = "";
		if(new_nick.value == "" || new_room.value == "") return;

		// Save changes
		current_avatar.src = new_avatar.src;
		current_nick.innerText = new_nick.value;
		current_room = new_room.value;

		// Reset setup
		MYCHAT.resetSetup();

		// Close menu
		MYCHAT.closeMenu();
	},

	closeMenu:function()
	{
		// Hide menu
		menu_grid.style.zIndex = "0";
		menu_grid.style.display = "none";

		// Remove all datalist options
		rooms_datalist.replaceChildren();
	},

	loadRooms:function()
	{
		for (const room of available_rooms)
		{
			const option = document.createElement("option");
			option.innerText = room;

			rooms_datalist.appendChild(option);
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