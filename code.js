
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
	HTML_chats : document.get("#chats"),
	HTML_conversations : document.get("#conversations"),

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
	clients: [],

	//User
	user : 
	{
		avatar : document.get("#user-avatar"),
		nick : document.get("#username"),
		ids : {},
	},	

	// Rooms
	default_room : "Casada",
	room_list_index : 0,
	available_rooms : {},
	connected_rooms : [],

	// Chats
	chats : [],
	current_chat_index : 0,

	// Scroll
	conversation_scrolls : {},

	// Conversation logs
	conversations : [],
	current_conversation_index: 0,

	// Templates
	chat_template : document.get("#chat-template"),
	conversation_template: document.get("#conversation-template"),
	private_message_template : document.get("#private-message-template"),
	new_group_message_template: document.get("#new-group-message-template"),
	concurrent_group_message_template: document.get("#concurrent-group-message-template"),

	// Debugging vars
	comodin : null,

	init: function()
	{
		// CSS variables
		document.documentElement.style.setProperty('--screen_width', this.available_width + "px");
		document.documentElement.style.setProperty('--screen_height', this.available_height + "px");

		// Event listeners
		this.initEventsListeners.bind(this)();

		// Emoji picker
		this.emojiPickerInit();

		// Create a new SillyClient instance
		const new_client = this.newClient.bind(this)();

		// Init the new client
		this.initClient.bind(this)(new_client, this.default_room);
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
		this.HTML_chats.when("click", this.selectChat.bind(this));
		
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

	newClient: function()
	{
		// Create new client
		const new_client = new SillyClient()

		// Append new client to the list of clients
		this.clients.push(new_client);

		// Return new client
		return new_client;
	},

	initClient: function(client, room)
	{
		// Server connection
		this.setServerConnection.bind(client)(this.server_address, room);

		// Server callbacks
		client.on_connect = this.onServerConnection;
		client.on_ready = this.onServerReady;
		client.on_user_connected = this.onServerUserJoin;
		client.on_user_disconnected = this.onServerUserLeft;
		client.on_message = this.onServerMessageReceived;

		// Additional callbacks
		//client.client.on_error = this.onServerFail;connected_rooms
		//client.client.on_close = this.onServerClose;
		//client.client.on_room_info = this.onServerRoomInfo;
	},

	setServerConnection: function(server_address, room_name)
	{
		this.connect(server_address, room_name);
	},

	onServerConnection: function()
	{
		// Inform the user the connection has been successfully established
		console.log(`Connection with the server in room ${this.room.name} successfully established`);

		// Wait until we have some info about the clients
		Casada.serverGetRoomInfo.bind(this)(this.room.name).then( client_info => {

			// Append new room to the list of connected rooms
			const new_room =
			{
				name : this.room.name,
				clients : client_info.clients,
			};
			Casada.connected_rooms.push(new_room);

			// Load rooms
			Casada.serverLoadAvailableRooms.bind(this)();

			// Create chats
			Casada.createContent.bind(this)(client_info.clients);
		})
	},

	onServerFail: function()
	{
		// Alert the user the connection with the server could not been established
		alert(`The connection to the server address ${Casada.server_address} has failed`);
	},

	onServerClose: function()
	{
		// Alert the user the server has been shut down
		alert(`Warning: The server has been shut down. Trying to reconnect`);

		// Reconnect
		Casada.setServerConnection(Casada.server_address, this.room.name);
	},

	onServerReady: function(id)
	{
		// Assign user ID
		Casada.user.ids[this.room.name] = id;
		console.log(`Your id is ${id}`);
	},

	onServerUserJoin: function(client_id)
	{
		// Inform the user a new client has joined the room
		console.log(`A new user with id ${client_id} has joined the room`);

		// Create a new private chat and conversation
		Casada.createPrivateContent.bind(this)(client_id);	
	},

	onServerUserLeft: function(client_id)
	{
		// Inform the user a new client has left the room
		console.log(`The user with id ${client_id} has left the room`);

		// Update clients lists
		Casada.updateRoomClients(this);
	},

	onServerRoomInfo: function(room_info)
	{
		console.log(room_info);
	},

	onServerMessageReceived: function(user_id, message)
	{
		console.log(`The user with id ${user_id} has send the following message \n ${message}`);
	},

	serverUpdateRoomList: function()
	{
		return new Promise( (resolve,fail) => 
		{
			// Set rooms list
			this.getReport((room_report) => 
			{
				// Set default rooms in case that get report fails
				Casada.available_rooms = room_report.rooms || {
					"La casa de las cariñosas": "unknown", 
					"Una sala de fitness peculiar...": "unknown", 
					"La guarida de la rata": "unknown", 
					"1234": "unknown"};

				// Delete connected rooms from the list of available rooms
				Casada.connected_rooms.map(room => room.name).forEach( room_name =>
				{
					delete Casada.available_rooms[room_name];
				});
				
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
			this.getRoomInfo(room_name, (room_info) => 
			{				
				// Resolve promise
				resolve(room_info);
			});

		});
	},

	updateRoomClients : async function(client)
	{
		// Fetch clients info
		let room_info = await Casada.serverGetRoomInfo.bind(client)(client.room.name);

		// Set client room clients property
		this.connected_rooms.find(room => room.name == client.room.name).clients = room_info.clients;

		// Set chat clients
		this.chats.find(chat => chat.room == client.room.name).clients = room_info.clients;
	},

	serverLoadAvailableRooms: async function()
	{
		// Fetch room list
		await Casada.serverUpdateRoomList.bind(this)();

		// Show first room
		Casada.showRoom(0);
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

	addRoom: function(room_name)
	{
		// Create a new SillyServer instance
		const new_client = this.newClient.bind(this)();

		// Init new client
		this.initClient(new_client, room_name);
		
	},

	createContent: function(client_info)
	{
		// Create room group chat and conversation
		Casada.createRoomContent.bind(this)(client_info);

		// Create private chats and conversations
		for(const client_id of client_info)
		{
			if(client_id != Casada.user.ids[this.room.name])
				Casada.createPrivateContent.bind(this)(client_id);
		}

		// Init scrolls
		Casada.initScrolls.bind(Casada)();
	},

	createRoomContent: function(client_info)
	{
		// Clone templates
		let new_chat = Casada.chat_template.cloneNode(true);
		let new_conversation = Casada.conversation_template.cloneNode(true);

		// Get chat contents
		let chat_avatar = new_chat.get(".avatar");
		let chat_username = new_chat.get(".info .username");
		let chat_last_message = new_chat.get(".info .last-message");

		// Set chat contents
		chat_avatar.src = "images/default_group_avatar.jpeg";
		chat_username.innerText = this.room.name;
		chat_last_message.innerText = "Last sent message";

		// Set chat id and class
		new_chat.id = `chat-${this.room.name}`;
		new_chat.className = "chat";

		// Set conversation id and class
		new_conversation.id = `conversation-${this.room.name}`;
		new_conversation.className = "not-current group";

		// Append new chat and conversation to the doom
		Casada.HTML_chats.appendChild(new_chat);
		Casada.HTML_conversations.appendChild(new_conversation);

		// Show new elements
		new_chat.show();
		new_conversation.show();

		// Append new chat to the list
		const room_chat = 
		{
			room : this.room.name,
			id : this.room.name,
			type : "group",
			clients : client_info,
		}
		Casada.chats.push(room_chat);

		// Append new conversation to the log
		const room_conversation =
		{
			id: this.room.name,
			messages: [],
		}
		Casada.conversations.push(room_conversation);
		
	},

	createPrivateContent(client_id)
	{
		// Clone templates
		let new_chat = Casada.chat_template.cloneNode(true);
		let new_conversation = Casada.conversation_template.cloneNode(true);

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
		Casada.HTML_chats.appendChild(new_chat);
		Casada.HTML_conversations.appendChild(new_conversation);

		// Show new elements
		new_chat.show();
		new_conversation.show();

		// Append new chat to the list
		const private_chat = 
		{
			room : this.room.name,
			id : client_id,
			type : "group",
			clients : [client_id],
		}
		Casada.chats.push(private_chat);
	},

	initScrolls: function()
	{
		for (const conversation of this.HTML_conversations.children)
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

		// Send private or public message
		switch(true)
		{
			case this.chats[this.current_chat_index].type == "private":
				this.sendPrivateMessage.bind(this)();
				break;
			case this.chats[this.current_chat_index].type == "group":
				this.sendPublicMessage.bind(this)();
				break;
		}

		// Clean input box
		this.input.value = '';
	},

	sendPrivateMessage: function()
	{
		// Fetch current conversation
		const current_conversation = this.HTML_conversations.get(".current");

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

		// Send private message to the user
		this.clients.find(client => client.room.name == this.chats[this.current_chat_index].room).sendMessage(this.input.value, this.chats[this.current_chat_index].clients);
	},

	sendPublicMessage: function()
	{
		// Fetch current conversation
		const current_conversation = this.HTML_conversations.get(".current");

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

		// Send public message to the room
		this.clients.find(client => client.room.name == this.chats[this.current_chat_index].room).sendMessage(this.input.value);
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
		document.getAll("#chats > div").forEach( element => { 
			element.show(); 
		});
	},

	selectChat:function(event)
	{
		// Declare some vars
		const regex = /chat-[A-Za-z]+|chat-[1-9]+/;
		const current_chat = this.HTML_chats.get(".current");
		const current_conversation = this.HTML_conversations.get(".current");
		
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

				// Update current chat index
				this.current_chat_index = this.chats.findIndex(chat => chat.id == element.id.substring(5));

				// Update current conversation index
				this.current_conversation_index = this.conversations.findIndex(conversation => conversation.id == element.id.substring(5));

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
		this.serverLoadAvailableRooms.bind(this.clients[0])();

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

		// Add new room
		this.addRoom.bind(this)(new_room);

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
