// Custom methods

Number.prototype.clamp = function(min, max) 
{
	return Math.min(Math.max(this.valueOf(), min), max);
};

Element.prototype.getParents = function()
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


// Namespace

var Casada =
{
	// Root
	root: document.documentElement,
	available_height : window.screen.availHeight,
	available_width : window.screen.availWidth,

	//Emoji picker
	emoji_picker: new EmojiKeyboard,

	// Some DOM elements
	input : document.querySelector("#keyboard-input"),
	new_chat_trigger : document.querySelector("#new-chat-trigger"),
	search_bar_box : document.querySelector(".grid-chats .search-bar"),
	chat_search_bar : document.querySelector("#chat-search-bar"),
	chat_eraser : document.querySelector("#chat-eraser"),
	chats : document.querySelector("#chats"),
	chats_children : document.querySelectorAll("#chats > div"),

	// New chat menu
	menu : document.querySelector("#menu"),
	menu_grid : document.querySelector(".menu-grid"),
	menu_dragger : document.querySelector("#menu-dragger"),
	menu_options : document.querySelector("#menu-options"),
	avatar_uploader : document.querySelector("#avatar-uploader"),
	menu_avatar : document.querySelector("#menu-avatar"),
	menu_nick : document.querySelector("#menu-nick"),
	menu_room : document.querySelector("#menu-room"),
	reset_changes : document.querySelector("#reset-changes"),
	apply_changes : document.querySelector("#apply-changes"),

	//User
	user: 
	{
		avatar : document.querySelector("#user-avatar"),
		nick : document.querySelector("#username"),
		room : "1234" 
	},	

	// Rooms
	rooms_datalist : document.querySelector("#available-rooms"),
	available_rooms : ["La casa de las cariñosas", "Una sala de fitness peculiar...", "La guarida de la rata", "1234"],

	// Scroll
	conversation_scrolls : {"chat1" : 0, "chat2" : 0},

	init:function()
	{
		// CSS variables
		document.documentElement.style.setProperty('--screen_width', Casada.available_width + "px");
		document.documentElement.style.setProperty('--screen_height', Casada.available_height + "px");

		// OnKeyDown
		document.addEventListener("keydown", Casada.onKeyDown);

		// Search a chat
		Casada.chat_search_bar.addEventListener("keyup", Casada.onKeyUp);

		// Erase search
		Casada.chat_eraser.addEventListener("click", Casada.eraseChatSearch);

		// Select a chat
		Casada.chats.addEventListener("click", Casada.selectChat);

		// Emoji picker
		Casada.emojiPickerInit();
		
		// Send a message
		Casada.input.addEventListener("keydown", Casada.onKeyDown);

		// Menu dragger
		Casada.menu_dragger.addEventListener("mousedown", Casada.dragMenu);

		// Open menu
		Casada.new_chat_trigger.addEventListener("click", Casada.openMenu);

		// Close menu
		Casada.menu_options.addEventListener("click", Casada.closeMenu);

		// Change avatar
		Casada.avatar_uploader.addEventListener("click", Casada.changeAvatar);

		// Reset changes
		Casada.reset_changes.addEventListener("click", Casada.resetSetup);

		// Save setup
		Casada.apply_changes.addEventListener("click", Casada.saveSetup);

		// Load rooms
		Casada.loadRooms();
	},

	onKeyDown: function(event)
	{
		//console.log(event.key);
		
		if(this.id == "keyboard-input")
		{		
			if(event.code == "Enter")
			{
				Casada.sendMessage();
			}
		}
		
		if(event.code == "Escape")
		{
			Casada.hideEmojiPicker();

		}	 
		
	},

	onKeyUp: function(event)
	{
		if(this.id == "chat-search-bar")
		{
			Casada.filterChats();
		}

	},

	sendMessage: function()
	{
		// Check input is not empty
		if (Casada.input.value == '') return;

		// Fetch current conversation
		const current_conversation = Casada.Q(".grid-conversations .current")

		// Fetch the current conversation type
		const conversation_classes = current_conversation.classList;

		// Fetch last conversation child
		const last_child = current_conversation.querySelector(".conversation").lastElementChild;

		// Fetch proper template
		const message_template = conversation_classes.contains("private") ? Casada.Q("#private-message-template") : (last_child.classList.contains("user-message-layout") ? Casada.Q("#concurrent-group-message-template") : Casada.Q("#new-group-message-template"));

		// Clone template
		var message_box = message_template.cloneNode(true);

		// Set avatar in case of new group message from the user
		if (last_child.classList.contains("people-message-layout") ) message_box.querySelector(".avatar").src = Casada.user.avatar.src;		

		// Set input box text value to template
		message_box.querySelector(".message-content").innerText = Casada.input.value;

		// Set current time to template
		const date = new Date();
		message_box.querySelector(".message-time").innerText = date.getHours().toString().padStart(2,"0") + ":" + date.getMinutes().toString().padStart(2, "0");

		// Add template to the DOM
		last_child.classList.contains("user-message-layout") ? last_child.appendChild(message_box) : current_conversation.querySelector(".conversation").appendChild(message_box);

		//Delete template old attributes
		message_box.removeAttribute('style');
		message_box.removeAttribute('id');

		// Show new message
		message_box.style.display = ''

		//Update scrollbar focus
		message_box.scrollIntoView();

		// Clean input box
		Casada.input.value = ''
	},

	filterChats:function()
	{
		const query = Casada.chat_search_bar.value;
		const regex = new RegExp(query, "i");

		// Cross icon transition
		if(query.length > 0)
		{
			Casada.chat_eraser.classList.replace("eraser-hidden", "eraser-showing");
			Casada.search_bar_box.style.marginBottom = "-9px";
		}
		else
		{
			Casada.chat_eraser.classList.replace("eraser-showing", "eraser-hidden");
			Casada.search_bar_box.style.marginBottom = "10px";
		}

		// Filter chats
		Casada.chats_children.forEach(function(element){

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
		Casada.chat_search_bar.value = "";
		Casada.chat_eraser.classList.replace("eraser-showing", "eraser-hidden");
		Casada.search_bar_box.style.marginBottom = "10px";
		Casada.chats_children.forEach( (element) => { 
			element.style.display = ""; 
		});
	},

	selectChat:function(event)
	{
		const regex = /chat[1-9]+/;
		const current_chat = Casada.Q("#chats .current");
		const current_conversation = Casada.Q(".grid-conversations .current");
		const regex_result = current_conversation.id.match(regex);
		const current_conversation_id = regex_result != null && regex_result.length == 1 ? regex_result[0] : null;
		
		for (const element of event.srcElement.getParents())
		{
			if(element.id != undefined && element.id.match(regex) != null)
			{
				// Swap current selected chat to not selected
				current_chat.classList.replace("current", "chat");

				// Select the clicked chat
				element.classList.replace("chat", "current");

				// Fetch the new conversation
				const new_conversation = Casada.Q("#" + element.id + "-conversation");

				// Save current scroll
				if(current_conversation_id != null) Casada.conversation_scrolls[current_conversation_id] = current_conversation.parentElement.scrollTop;

				// Swap current conversation to not selected
				current_conversation.classList.replace("current", "not-current");

				// Change to the conversation of the clicked chat
				new_conversation.classList.replace("not-current", "current");

				// Set clicked conversation scroll
				new_conversation.parentElement.scroll(0, Casada.conversation_scrolls[element.id]);

				//End execution
				break;
			}
		}
	},

	emojiPickerInit:function()
	{
		// Chat setup
		Casada.emoji_picker.resizable = false;
		Casada.emoji_picker.default_placeholder = "Search an emoji...";
		Casada.emoji_picker.instantiate(Casada.Q("#emoji-picker"));
		
		// Chat callback
        Casada.emoji_picker.callback = (emoji, closed) => {
            input.value += emoji.emoji;
        };

		// Event listeners
		grid_children = Casada.Q(".grid-layout").children;
		for (const grid_element of grid_children)
		{
			if(grid_element.className != "grid-input") grid_element.addEventListener("click", Casada.hideEmojiPicker);
		}
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
			Casada.menu.style.left = (menu.offsetLeft + Δx).clamp(0, Casada.available_width - menu.offsetWidth - 50) + "px";
			Casada.menu.style.top = (menu.offsetTop + Δy).clamp(0, Casada.available_height - menu.offsetHeight - 80) + "px";
			
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
		Casada.menu_grid.style.zIndex = "2";
		Casada.menu_grid.style.display = "";

		Casada.menu.style.left = (Casada.available_width - menu.offsetWidth) / 2 + "px";
		Casada.menu.style.top = (Casada.available_height - menu.offsetHeight) / 2 + "px";

		// Load available rooms
		Casada.loadRooms();

	},

	changeAvatar:function()
	{
		// File uploader and avatar image
		file_uploader = Casada.Q("#menu input[type='file']");

		// Launch file manager event
		file_uploader.click();

		// Change user avatar
		file_uploader.addEventListener("change", () =>{
			const reader = new FileReader();
			reader.readAsDataURL(file_uploader.files[0]);
			reader.addEventListener("load", () => {
				menu_avatar.src = reader.result;				
			});
		});

		
	},

	resetSetup:function()
	{
		Casada.menu_avatar.src = "images/default_avatar.jpg";
		Casada.menu_nick.value = "";
		Casada.menu_room.value = "";
	},

	saveSetup:function()
	{
		// Check all fields are not empty
		if(Casada.menu_nick.value == "") Casada.menu_nick.style.border = "2px #912626 solid", Casada.menu_nick.placeholder = "Choose a nick";
		else Casada.menu_nick.style.border = "none", Casada.menu_nick.placeholder = "";
		if(Casada.menu_room.value == "") Casada.menu_room.style.border = "2px #912626 solid", Casada.menu_room.placeholder = "Choose a room";
		else Casada.menu_room.style.border = "none", Casada.menu_room.placeholder = "";
		if(Casada.menu_nick.value == "" || Casada.menu_room.value == "") return;

		// Save changes
		Casada.user.avatar.src = menu_avatar.src;
		Casada.user.nick.innerText = menu_nick.value;
		Casada.user.room = menu_room.value;

		// Reset setup
		Casada.resetSetup();

		// Close menu
		Casada.closeMenu();
	},

	closeMenu:function()
	{
		// Hide menu
		Casada.menu_grid.style.zIndex = "0";
		Casada.menu_grid.style.display = "none";

		// Remove all datalist options
		Casada.rooms_datalist.replaceChildren();
	},

	loadRooms:function()
	{
		for (const room of Casada.available_rooms)
		{
			const option = document.createElement("option");
			option.innerText = room;

			Casada.rooms_datalist.appendChild(option);
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
		var template = Casada.Q("#template .msg")
		var msg = template.cloneNode(true);
		msg.querySelector("username").innerText="Javi";
		msg.querySelector(".content").innerText="lalala";
		Casada.Q(".logcontent").appendChild(msg);

	},

	hideEmojiPicker:function(event)
	{
		let emoji_main_div = document.getElementById("emojikb-maindiv");

		if(!emoji_main_div.classList.contains("emojikb-hidden"))
		{
			Casada.emoji_picker.toggle_window();
			Casada.input.focus();
		}
	},

	Q: function(selector)
	{
		return document.querySelector(selector) || document.createElement("div");
	}

}