
/***************** NAMESPACE *****************/

var Casada =
{
	// Root
	root: document.documentElement,
	available_height : window.screen.availHeight,
	available_width : window.screen.availWidth,

	//Emoji picker
	emoji_picker: new EmojiKeyboard,

	// Some DOM elements
	input : document.get("#keyboard-input"),
	new_chat_trigger : document.get("#new-chat-trigger"),
	search_bar_box : document.get(".grid-chats .search-bar"),
	chat_search_bar : document.get("#chat-search-bar"),
	chat_eraser : document.get("#chat-eraser"),
	chats : document.get("#chats"),
	conversations : document.get("#conversations"),

	// New chat menu
	menu : document.get("#menu"),
	menu_grid : document.get(".menu-grid"),
	menu_dragger : document.get("#menu-dragger"),
	menu_options : document.get("#menu-options"),
	avatar_uploader : document.get("#avatar-uploader"),
	menu_avatar : document.get("#menu-avatar"),
	menu_nick : document.get("#menu-nick"),
	menu_room : document.get("#menu-room"),
	previous_room : document.get("#menu .previous-room"),
	next_room : document.get("#menu .next-room"),
	room_people : document.get("#menu .room-people div"),
	reset_changes : document.get("#reset-changes"),
	apply_changes : document.get("#apply-changes"),

	//SillyClient
	server_address : "wss://ecv-etic.upf.edu/node/9000/ws",
	client: new SillyClient(),

	//User
	user : 
	{
		avatar : document.get("#user-avatar"),
		nick : document.get("#username"),
		id : 0,
	},	

	// Rooms
	default_room : "Casada",
	room_list_index : 0,
	available_rooms : {},

	current_room :
	{
		name: "",
		clients: [],
	},

	// Scroll
	conversation_scrolls : {},

	// Templates
	chat_template : document.get("#chat-template"),
	conversation_template: document.get("#conversation-template"),
	private_message_template : document.get("#private-message-template"),
	new_group_message_template: document.get("#new-group-message-template"),
	concurrent_group_message_template: document.get("#concurrent-group-message-template"),

	init: function()
	{
		// CSS variables
		document.documentElement.style.setProperty('--screen_width', this.available_width + "px");
		document.documentElement.style.setProperty('--screen_height', this.available_height + "px");

		// Event listeners
		this.initEventsListeners.bind(this)();

		// Emoji picker
		this.emojiPickerInit();

		// SillyClient
		this.initClient.bind(this)();
	},

	initEventsListeners: function()
	{
		// OnKeyDown
		document.when("keydown", this.onKeyDown);

		// Search a chat
		this.chat_search_bar.when("keyup", this.onKeyUp);

		// Erase search
		this.chat_eraser.when("click", this.eraseChatSearch.bind(this));

		// Select a chat
		this.chats.when("click", this.selectChat.bind(this));
		
		// Send a message
		this.input.when("keydown", this.onKeyDown);

		// Menu dragger
		this.menu_dragger.when("mousedown", this.dragMenu.bind(this));

		// Open menu
		this.new_chat_trigger.when("click", this.openMenu.bind(this));

		// Close menu
		this.menu_options.when("click", this.closeMenu.bind(this));

		// Change avatar
		this.avatar_uploader.when("click", this.changeAvatar.bind(this));

		// Previous room
		this.previous_room.when("click", () => {this.showRoom(this.room_list_index - 1);});

		// Next room
		this.next_room.when("click", () => {this.showRoom(this.room_list_index + 1);});

		// Menu room
		this.menu_room.when("keyup", this.onKeyUp);

		// Reset changes
		this.reset_changes.when("click", this.resetSetup.bind(this));

		// Save setup
		this.apply_changes.when("click", this.saveSetup.bind(this));
	},

	initClient: function()
	{
		// Server connection
		this.setServerConnection(this.server_address, this.default_room);

		// Server callbacks
		this.client.on_connect = this.onServerConnection.bind(this);
		this.client.on_ready = this.onServerReady.bind(this);
		this.client.on_user_connected = this.onServerUserJoin.bind(this);
		this.client.on_user_disconnected = this.onServerUserLeft.bind(this);
		this.client.on_message = this.onServerMessageReceived.bind(this);

		// Additional callbacks
		//this.client.on_error = this.onServerFail.bind(this);
		//this.client.on_close = this.onServerClose(this);
		//this.client.on_room_info = this.onServerRoomInfo.bind(this);
	},

	setServerConnection: function(server_address, room_name)
	{
		this.client.connect(server_address, room_name);
	},

	onServerConnection: function()
	{
		// Set new current room
		this.current_room.name = this.client.room.name;

		// Inform the user the connection has been successfully established
		console.log(`Connection with the server in room ${this.current_room.name} successfully established`);

		// Load rooms
		this.loadRooms.bind(this)();

		// Create chats
		this.createContent.bind(this)();
	},

	onServerFail: function()
	{
		// Alert the user the connection with the server could not been established
		alert(`The connection to the server address ${this.server_address} has failed`);
	},

	onServerClose: function()
	{
		// Alert the user the server has been shut down
		alert(`Warning: The server has been shut down`);
	},

	onServerReady: function(id)
	{
		// Assign user ID
		this.user.id = id;
		console.log(`Your id is ${id}`);
	},

	onServerUserJoin: function(client_id)
	{
		// Inform the user a new client has joined the room
		console.log(`A new user with id ${client_id} has joined the room`);

		// Create a new private chat and conversation
		this.createPrivateContent(client_id);
		
	},

	onServerUserLeft: function(client_id)
	{
		// Inform the user a new client has left the room
		console.log(`The user with id ${client_id} has left the room`);
	},

	onServerRoomInfo: function(room_info)
	{
		console.log(room_info);
	},

	onServerMessageReceived: function(user_id, message)
	{
		console.log(`The user with id ${user_id} has send the following message \n ${message}`);
	},

	serverGetRoomList: function()
	{
		return new Promise( (resolve,fail) => 
		{
			// Set rooms list
			this.client.getReport((room_report) => 
			{
				// Set default rooms in case that get report fails
				this.available_rooms = room_report.rooms || {
					"La casa de las cariñosas": "unknown", 
					"Una sala de fitness peculiar...": "unknown", 
					"La guarida de la rata": "unknown", 
					"1234": "unknown"};

				// Delete current room from the list of available rooms
				delete this.available_rooms[this.current_room.name];
				
				// Resolve promise
				resolve();
			});
		});
	},

	serverGetRoomInfo: function(room_name)
	{
		return new Promise( (resolve,fail) => 
		{
			// Get rooms list
			this.client.getRoomInfo(room_name, (room_info) => 
			{				
				// Resolve promise
				resolve(room_info);
			});

		});
	},

	loadRooms: async function()
	{
		// Fetch room list
		await this.serverGetRoomList.bind(this)();

		// Show first room
		this.showRoom(0);
	},
	
	showRoom: function(new_room)
	{
		// Get number of available rooms
		const room_list_length = Object.keys(this.available_rooms).length

		// No rooms available
		if(room_list_length == 0)
		{
			this.menu_room.value = "";
			this.room_people.innerText = "0";
		}
		// Rooms available
		else
		{
			// Range new room index
			new_room = new_room < 0 ? room_list_length - 1 : (new_room > room_list_length - 1 ? 0 : new_room);

			// Set new room
			this.room_list_index = new_room;
			this.menu_room.value = Object.keys(this.available_rooms)[this.room_list_index];
			this.room_people.innerText = Object.values(this.available_rooms)[this.room_list_index];
		}
	},

	changeRoom: async function(room_name)
	{
		// Remove current chats and conversations
		this.chats.replaceChildren();
		this.conversations.replaceChildren(this.conversations.get(".fix"));

		// Close current connection with the server
		await this.client.close();

		// Set new connection with the server
		this.setServerConnection(this.server_address, room_name);
		
	},

	createContent: async function()
	{
		// Fetch current room info
		const room_info = await this.serverGetRoomInfo.bind(this)(this.current_room.name);

		// Create room group chat and conversation
		this.createRoomContent.bind(this)();

		// Create private chats and conversations
		for(const client_id of room_info["clients"])
		{
			if(client_id != this.user.id)
				this.createPrivateContent.bind(this)(client_id);
		}

		// Init scrolls
		this.initScrolls.bind(this)();
	},

	createRoomContent: function()
	{
		// Clone templates
		let new_chat = this.chat_template.cloneNode(true);
		let new_conversation = this.conversation_template.cloneNode(true);

		// Get chat contents
		let chat_avatar = new_chat.get(".avatar");
		let chat_username = new_chat.get(".info .username");
		let chat_last_message = new_chat.get(".info .last-message");

		// Set chat contents
		chat_avatar.src = "images/default_group_avatar.jpeg";
		chat_username.innerText = this.current_room.name;
		chat_last_message.innerText = "Last sent message";

		// Set chat id and class
		new_chat.id = "room-chat";
		new_chat.className = "current";

		// Set conversation id and class
		new_conversation.id = "room-conversation";
		new_conversation.className = "current group";

		// Append new chat and conversation to the doom
		this.chats.appendChild(new_chat);
		this.conversations.appendChild(new_conversation);

		// Show new elements
		new_chat.show();
		new_conversation.show();
	},

	createPrivateContent(client_id)
	{
		// Clone templates
		let new_chat = this.chat_template.cloneNode(true);
		let new_conversation = this.conversation_template.cloneNode(true);

		// Get chat contents
		let chat_avatar = new_chat.get(".avatar");
		let chat_username = new_chat.get(".info .username");
		let chat_last_message = new_chat.get(".info .last-message");

		// Set chat contents
		chat_avatar.src = "images/default_avatar.jpg";
		chat_username.innerText = client_id;
		chat_last_message.innerText = "Last sent message";

		// Set chat id and class
		new_chat.id = "chat-" + client_id;
		new_chat.className = "chat";

		// Set conversation id and class
		new_conversation.id = "conversation-" + client_id;
		new_conversation.className = "not-current private";

		// Append new chat and conversation to the doom
		this.chats.appendChild(new_chat);
		this.conversations.appendChild(new_conversation);

		// Show new elements
		new_chat.show();
		new_conversation.show();
	},

	initScrolls: function()
	{
		for (const conversation of this.conversations.children)
		{
			if(conversation.id != "")
				this.conversation_scrolls[conversation.id] = "0";
		}
	},

	onKeyDown: function(event)
	{
		/* 
		In this case we haven't bound the "this" on purpuse
		because we want to know info about the object where the callback was attached
		in order to carry out actions independently.
		*/
		
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
		/* 
		In this case we haven't bound the "this" on purpuse
		because we want to know info about the object where the callback was attached
		in order to carry out actions independently.
		*/

		if(this.id == "chat-search-bar")
		{
			Casada.filterChats();
		}
		else if(this.id == "menu-room")
		{
			Casada.room_people.innerText = "0";
		}

	},

	sendMessage: function()
	{
		// Check input is not empty
		if (this.input.value == '') return;

		// Fetch current conversation
		const current_conversation = conversations.get(".current");

		// Fetch the current conversation type
		const conversation_classes = current_conversation.classList;

		// Send private or public message
		switch(true)
		{
			case conversation_classes.contains("private"):
				this.sendPrivateMessage.bind(this)();
				break;
			case conversation_classes.contains("group"):
				this.sendPublicMessage.bind(this)();
				break;
		}

		// Send message to the chat server
		this.client.sendMessage(this.input.value);

		// Clean input box
		this.input.value = ''
	},

	sendPrivateMessage: function()
	{
		// Fetch current conversation
		const current_conversation = conversations.get(".current");

		// Fetch private message template
		const message_template = this.private_message_template;

		// Clone template
		var message_box = message_template.cloneNode(true);	

		// Set input box text value to the template
		message_box.get(".message-content").innerText = this.input.value;

		// Set current time to the template
		const date = new Date();
		message_box.get(".message-time").innerText = date.getTime();

		// Add template to the DOM
		current_conversation.get(".conversation").appendChild(message_box);		

		//Delete template old attributes
		message_box.removeAttribute('style');
		message_box.removeAttribute('id');

		// Show new message
		message_box.style.display = ''

		//Update scrollbar focus
		message_box.scrollIntoView();

	},

	sendPublicMessage: function()
	{
		// Fetch current conversation
		const current_conversation = conversations.get(".current");

		// Fetch last conversation child
		const last_child = current_conversation.get(".conversation").lastElementChild;

		// Fetch proper template
		let message_template;
		switch(true)
		{
			case last_child == null:
				message_template = this.new_group_message_template;
				break;
			case last_child.classList.contains("user-message-layout"):
				message_template = this.concurrent_group_message_template;
				break;
			default:
				message_template = this.new_group_message_template;
				break;
		}

		// Clone template
		var message_box = message_template.cloneNode(true);

		// Set avatar
		if ((last_child == null) || last_child.classList.contains("people-message-layout") ) message_box.get(".avatar").src = this.user.avatar.src;		

		// Set input box text value to the template
		message_box.get(".message-content").innerText = this.input.value;

		// Set current time to the template
		const date = new Date();
		message_box.get(".message-time").innerText = date.getTime();

		// Add template to the DOM
		switch(true)
		{
			case last_child == null:
				current_conversation.get(".conversation").appendChild(message_box);
				break;
			case last_child.classList.contains("user-message-layout"):
				last_child.appendChild(message_box);
				break;
			default:
				current_conversation.get(".conversation").appendChild(message_box);
				break;
		}

		//Delete template old attributes
		message_box.removeAttribute('style');
		message_box.removeAttribute('id');

		// Show new message
		message_box.style.display = ''

		//Update scrollbar focus
		message_box.scrollIntoView();
	},

	filterChats:function()
	{
		const query = this.chat_search_bar.value;
		const regex = new RegExp(query, "i");

		// Cross icon transition
		if(query.length > 0)
		{
			this.chat_eraser.classList.replace("eraser-hidden", "eraser-showing");
			this.search_bar_box.style.marginBottom = "-9px";
		}
		else
		{
			this.chat_eraser.classList.replace("eraser-showing", "eraser-hidden");
			this.search_bar_box.style.marginBottom = "10px";
		}

		// Filter chats
		document.getAll("#chats > div").forEach(function(element){

			if(query.length == 0)
			{
				element.show();
			}
			else
			{
				const username = element.get(".username").innerText;
				const last_message = element.get(".last-message").innerText;
	
				if(regex.test(username) || regex.test(last_message))
				{
					element.show();
				}
				else
				{
					element.hide();
				}
			}
		});

	},

	eraseChatSearch:function()
	{
		this.chat_search_bar.value = "";
		this.chat_eraser.classList.replace("eraser-showing", "eraser-hidden");
		this.search_bar_box.style.marginBottom = "10px";
		document.getAll("#chats > div").forEach( (element) => { 
			element.show(); 
		});
	},

	selectChat:function(event)
	{
		// Declare some vars
		const regex = /room-chat|chat-[1-9]+/;
		const current_chat = chats.get(".current");
		const current_conversation = conversations.get(".current");
		
		for (const element of event.srcElement.getParents())
		{
			if(element.id != undefined && element.id.match(regex) != null)
			{
				// Swap current selected chat to not selected
				current_chat.classList.replace("current", "chat");

				// Select the clicked chat
				element.classList.replace("chat", "current");

				// Fetch the new conversation
				const new_conversation = document.get(`#${element.id.replace("chat", "conversation")}`);

				// Save current scroll
				if(current_conversation.id != null) this.conversation_scrolls[current_conversation.id] = current_conversation.parentElement.scrollTop;

				// Swap current conversation to not selected
				current_conversation.classList.replace("current", "not-current");

				// Change to the conversation of the clicked chat
				new_conversation.classList.replace("not-current", "current");

				// Set clicked conversation scroll
				new_conversation.parentElement.scroll(0, this.conversation_scrolls[element.id.replace("chat", "conversation")]);

				//End execution
				break;
			}
		}
	},

	emojiPickerInit:function()
	{
		// Chat setup
		this.emoji_picker.resizable = false;
		this.emoji_picker.default_placeholder = "Search an emoji...";
		this.emoji_picker.instantiate(document.get("#emoji-picker"));
		
		// Chat callback
        this.emoji_picker.callback = (emoji, closed) => {
            this.input.value += emoji.emoji;
        };

		// Event listeners
		for (const grid_element of document.get(".grid-layout").children)
		{
			if(grid_element.className != "grid-input") grid_element.when("click", this.hideEmojiPicker);
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
			this.menu.style.left = (menu.offsetLeft + Δx).clamp(0, this.available_width - menu.offsetWidth - 50) + "px";
			this.menu.style.top = (menu.offsetTop + Δy).clamp(0, this.available_height - menu.offsetHeight - 80) + "px";
			
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
		this.menu_grid.style.zIndex = "2";
		this.menu_grid.show();

		this.menu.style.left = (this.available_width - menu.offsetWidth) / 2 + "px";
		this.menu.style.top = (this.available_height - menu.offsetHeight) / 2 + "px";

		// Load available rooms
		this.loadRooms();

	},

	changeAvatar:function()
	{
		// File uploader and avatar image
		file_uploader = document.get("#menu input[type='file']");

		// Launch file manager event
		file_uploader.click();

		// Change user avatar
		file_uploader.when("change", () =>{
			const reader = new FileReader();
			reader.readAsDataURL(file_uploader.files[0]);
			reader.addEventListener("load", () => {
				this.menu_avatar.src = reader.result;				
			});
		});

		
	},

	resetSetup:function()
	{
		this.menu_avatar.src = "images/default_avatar.jpg";
		this.menu_nick.value = "";
		this.menu_room.value = "";
		this.room_people.innerText = "0";
	},

	saveSetup:function()
	{
		// Check all fields are not empty
		if(this.menu_nick.value == "") this.menu_nick.style.border = "2px #912626 solid", this.menu_nick.placeholder = "Choose a nick";
		else this.menu_nick.style.border = "none", this.menu_nick.placeholder = "";
		if(this.menu_room.value == "") this.menu_room.style.border = "2px #912626 solid", this.menu_room.placeholder = "Choose a room";
		else this.menu_room.style.border = "none", this.menu_room.placeholder = "";
		if(this.menu_nick.value == "" || this.menu_room.value == "") return;

		// Save changes
		this.user.avatar.src = this.menu_avatar.src;
		this.user.nick.innerText = this.menu_nick.value;

		// New room
		const new_room = this.menu_room.value;

		// Reset setup
		this.resetSetup.bind(this)();

		// Change room
		this.changeRoom.bind(this)(new_room);

		// Close menu
		this.closeMenu.bind(this)();
	},

	closeMenu:function()
	{
		// Hide menu
		this.menu_grid.style.zIndex = "0";
		this.menu_grid.hide();
	},

	hideEmojiPicker:function(event)
	{
		let emoji_main_div = document.getElementById("emojikb-maindiv");

		if(!emoji_main_div.classList.contains("emojikb-hidden"))
		{
			this.emoji_picker.toggle_window();
			this.input.focus();
		}
	},
}
