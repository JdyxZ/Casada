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

	//Users
	users : {},
	my_user : 
	{
		avatar : document.get("#user-avatar"),
		nick : document.get("#username"),
		ids : {},
	},	

	// Rooms
	default_room : "Casada",
	room_list_index : 0,
	available_rooms : {},
	connected_rooms : {},

	// Chats
	chats : {},
	current_chat_id : "",

	// Conversation log
	conversation_log : {},

	// Scroll
	conversation_scrolls : {},

	// Message constructor
	Message: function(type, user, content, time)
	{
		this.type = type;
		this.user = user;
		this.content = content;
		this.time = time;
	},

	// Templates
	chat_template : document.get("#chat-template"),
	conversation_template: document.get("#conversation-template"),
	status_message_template: document.get("#status-message-template"),
	private_message_template : document.get("#private-message-template"),
	user_new_group_message_template: document.get("#user-new-group-message-template"),
	user_concurrent_group_message_template: document.get("#user-concurrent-group-message-template"),
	people_new_group_message_template: document.get("#people-new-group-message-template"),
	people_concurrent_group_message_template: document.get("#people-concurrent-group-message-template"),

	// Debugging vars
	comodin : null,

	init: function()
	{
		// CSS variables
		document.documentElement.style.setProperty('--screen_width', this.available_width + "px");
		document.documentElement.style.setProperty('--screen_height', this.available_height + "px");

		// Event listeners
		this.initEventsListeners();

		// Emoji picker
		this.emojiPickerInit();

		// Create a new SillyClient instance
		const new_client = this.newClient();

		// Init the new client
		this.initClient(new_client, this.default_room);
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
		client.on_room_info = this.onServerRoomInfo;

		// Additional callbacks
		client.on_error = this.onServerFail;
		client.on_close = this.onServerClose;
	},

	setServerConnection: function(server_address, room_name)
	{
		this.connect(server_address, room_name);
	},

	onServerConnection: async function()
	{
		// Inform the user the connection has been successfully established
		console.log(`Connection with the server in room ${this.room.name} successfully established`);

		// Send user data
		await Casada.storeUserData(this);
		Casada.sendProfileInfoReady(this, Casada.my_user.ids[this.room.name]);
	},

	onServerFail: function()
	{
		// Alert the user the connection with the server could not been established
		alert(`The connection to the server address ${Casada.server_address} has failed. Trying to reconnect`);

		// Reconnect
		Casada.setServerConnection(Casada.server_address, this.room.name);
	},

	onServerClose: function()
	{
		// Alert the user the server has been shut down
		alert(`Warning: The server has been shut down`);
	},

	onServerReady: function(id)
	{
		// Assign user ID
		Casada.my_user.ids[this.room.name] = id;
		console.log(`Your id is ${id}`);
	},

	onServerUserJoin: async function(client_id)
	{
		// Inform the user a new client has joined the room
		console.log(`A new user with id ${client_id} has joined the room`);

		// Create a new private chat and conversation
		Casada.createPrivateContent.bind(this)(client_id);	

		// Update clients lists
		await Casada.updateRoomClients(this);

		// Show system message
		Casada.showSystemMessage(this, this.room.name, `The user ${client_id} has joined the room`);

		// Change room chat status
		const room_chat = Casada.chats[this.room.name];
		if (!room_chat.online)
		{
			document.get(`#chat-${this.room.name}`).classList.remove("offline-chat");
			room_chat.online = true;
		}

		// Send profile info
		Casada.sendProfileInfoReady(this, Casada.my_user.ids[this.room.name]);

		//Update chat profile
		Casada.updateChatProfile();
	},

	onServerUserLeft: async function(client_id)
	{
		// Inform the user a new client has left the room
		console.log(`The user with id ${client_id} has left the room`);

		// Update clients lists
		await Casada.updateRoomClients(this);

		// Show system message
		Casada.showSystemMessage(this, this.room.name, `The user ${client_id} has left the room`);
		Casada.showSystemMessage(this, client_id, `The user has left the room and is no longer available`);		

		// Change room chat status
		const room_chat = Casada.chats[this.room.name];
		if (room_chat.clients.length == 1)
		{
			document.get(`#chat-${this.room.name}`).classList.add("offline-chat");
			room_chat.online = false;
		}

		// Change private chat status
		Casada.chats[client_id].online = false;
		document.get(`#chat-${client_id}`).classList.add("offline-chat");

		//Update chat profile
		Casada.updateChatProfile();
	},

	onServerRoomInfo: async function(room_info)
	{
		// Append new room to the list of connected rooms
		const new_room =
		{
			clients : room_info.clients,
			oldest : Math.min(room_info.clients)
		};
		Casada.connected_rooms[this.room.name] = new_room;

		// Load rooms
		Casada.serverLoadAvailableRooms.bind(this)();

		// Create chats
		Casada.createContent.bind(this)(room_info.clients);
		
		// Load user data
		await Casada.loadUsersData(this);

		// Load log
		Casada.loadRoomLog(this, this.room.name);
	},

	onServerMessageReceived: function(user_id, message_string)
	{
		// Convert message string into an object
		const message = JSON.parse(message_string);

		// Detect message type
		switch(message.type)
		{
			case "text":
				Casada.showGroupMessage(this.room.name, message);
				break;
			case "typing":
				console.log("typing");
				break;
			case "private":
				Casada.showPrivateMessage(message);
				break;
			case "system":
				Casada.showSystemMessage(this, this.room.name, message.content);
				break;
			case "profile":
				Casada.loadUserData(this, message.user);
				break;
		}		
	},

	showGroupMessage: function(room_name, message)
	{
		// Fetch data
		const conversation = this.HTML_conversations.get(`#conversation-${room_name}`);
		const last_child = conversation.get(".conversation").lastElementChild;
		const user = this.users[message.user];

		// Get layout type
		let layout_type;
		switch(true)
		{
			case last_child == null:
				layout_type = "new";
				break;
			case last_child.classList.contains("people-message-layout"):
				layout_type = "concurrent";
				break;
			default:
				layout_type = "new";
				break;
		}

		// Fetch and clone proper message template
		const message_template = layout_type == "new" ? this.people_new_group_message_template : this.people_concurrent_group_message_template;
		var message_box = message_template.cloneNode(true);

		// Set avatar and username
		if (layout_type == "new")
		{
			message_box.get(".avatar").src = user == null ? "images/default_avatar.jpg": user.avatar;	
			message_box.get(".username").innerText = user == null ? message.user : user.nick;
		}

		// Set inner elements template values
		message_box.get(".message-content").innerText = message.content;
		message_box.get(".message-time").innerText = message.time;

		// Add template to the DOM
		layout_type == "new" ? conversation.get(".conversation").appendChild(message_box) : last_child.appendChild(message_box);

		//Delete template old attributes
		message_box.removeAttribute('id');

		// Show received message
		message_box.show();

		//Update scrollbar focus if user is on the current chat
		if (this.current_chat_id == room_name)
			message_box.scrollIntoView();

		// Update last message
		this.updateLastMessage(room_name, user == null ? message.user : user.nick, message.content);
	},

	showPrivateMessage: function(message)
	{
		// Fetch conversation
		const conversation = this.HTML_conversations.get(`#conversation-${message.user}`);

		// Clone private message template and set it up
		let message_box = this.private_message_template.cloneNode(true);	
		message_box.get(".message-content").innerText = message.content;
		message_box.get(".message-time").innerText = message.time;

		// Add template to the DOM
		conversation.get(".conversation").appendChild(message_box);		

		//Delete template old attributes and set class
		message_box.removeAttribute('id');
		message_box.className = "people-message";

		// Show new message
		message_box.show();

		//Update scrollbar focus if user is on the current conversation
		if (this.current_chat_id == message.user)
			message_box.scrollIntoView();

		// Update last message
		this.updateLastMessage(message.user, null, message.content);
	},

	showSystemMessage: function(client, conversation_id, message)
	{
		// Fetch data
		const conversation = this.HTML_conversations.get(`#conversation-${conversation_id}`);
		const room = this.connected_rooms[conversation_id];
		const user_id = this.my_user.ids[conversation_id];

		// Clone status message template and set it up
		let message_box = this.status_message_template.cloneNode(true);	
		message_box.get(".message").innerText = message;

		// Add template to the DOM
		conversation.get(".conversation").appendChild(message_box);		

		//Delete template old attributes
		message_box.removeAttribute('id');

		// Show new message
		message_box.show();

		//Update scrollbar focus if user is on the current conversation
		if (this.current_chat_id == conversation_id)
			message_box.scrollIntoView();

		// If the user is the oldest user in the room, store the message in the db
		if(client.room.name == conversation_id && room.oldest == user_id)
		{
			const status_message = new this.Message("system", user_id, message, null);
			this.storeMessage(client, JSON.stringify(status_message));
		}
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
				Object.keys(Casada.connected_rooms).forEach( room_name =>
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

		// Set room clients and oldest client
		const room = this.connected_rooms[client.room.name];
		room.clients = room_info.clients;
		room.oldest = Math.min(room_info.clients);

		// Set chat clients
		this.chats[client.room.name].clients = room_info.clients;
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
			if(client_id != Casada.my_user.ids[this.room.name])
				Casada.createPrivateContent.bind(this)(client_id);
		}

		// Set chat profile status
		Casada.updateChatProfile();

		// Init scrolls
		Casada.initScrolls();
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

		// First chat
		const first_chat = Object.keys(Casada.connected_rooms).length == 1 ? true : false;
		if(first_chat) Casada.current_chat_id = this.room.name;

		// Room status
		const room_status = client_info.length == 1 ? false : true;

		// Set chat id and class
		new_chat.id = `chat-${this.room.name}`;
		new_chat.className = (first_chat ? "current" : "chat") + (room_status ? "" : " offline-chat");

		// Set conversation id and class
		new_conversation.id = `conversation-${this.room.name}`;
		new_conversation.className = first_chat ? "current group" : "not-current group";

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
			type : "group",
			clients : client_info,
			online: room_status
		}
		Casada.chats[this.room.name] = room_chat;

		// Append new conversation to the log
		const room_conversation =
		{
			messages: [],
		}
		Casada.conversation_log[this.room.name] = room_conversation;
		
	},

	createPrivateContent: function(client_id)
	{
		// Clone templates
		let new_chat = Casada.chat_template.cloneNode(true);
		let new_conversation = Casada.conversation_template.cloneNode(true);

		// Get chat contents
		let chat_avatar = new_chat.get(".avatar");
		let chat_username = new_chat.get(".info .username");
		let chat_last_message = new_chat.get(".info .last-message");

		// Set a placeholder for the chat contents until they are updated
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

		// Update chat content with built-in methods
		Casada.updateChat(client_id);
		Casada.updateLastMessage(client_id, null, "Last sent message");

		// Show new elements
		new_chat.show();
		new_conversation.show();

		// Append new chat to the list
		const private_chat = 
		{
			room : this.room.name,
			type : "private",
			clients : [client_id],
			online: true
		}
		Casada.chats[client_id] = private_chat;
	},

	updateChatProfile: function()
	{
		// Profile chat vars
		const current_chat = this.chats[this.current_chat_id];
		const current_room = current_chat.room;
		const chat_profile = document.get(".grid-chat-profile .contents");
		const user = this.users[this.current_chat_id];
		const avatar = chat_profile.get(".avatar");
		const username = chat_profile.get(".username");
		const status = chat_profile.get(".status");

		// Update profile chat info
		if(current_chat.type == "private")
		{
			avatar.src = user == null ?  "images/default_avatar.jpg" : user.avatar;
			username.innerText = user == null ? this.current_chat_id : user.nick;
			current_chat.online ? status.innerText = "Online" : status.innerText ="Offline";
		}
		else
		{
			avatar.src = "images/default_group_avatar.jpeg";
			username.innerText = current_room;

			if (!current_chat.online)
			{
			status.innerText = "You" 
			}
			else				
			{
				let result = "You, ";
				current_chat.clients.forEach(id => 
				{ 
					if (id != this.my_user.ids[current_room]) 
					{
						const user = this.users[id];

						if (user != null)
							result += `${user.nick}, `;
					}
				});
				status.innerText = result.slice(0, -2);
			}
		}
					
	},

	updateChat: function(id)
	{
		const chat = this.HTML_chats.get(`#chat-${id}`);
		const user = this.users[id];
		chat.get(".username").innerText =  user == null ? id : user.nick;
		chat.get(".avatar").src = user == null ?  "images/default_avatar.jpg" : user.avatar;
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

		// Auxiliar variables
		const type = this.chats[this.current_chat_id].type == "private";

		// Send private or public message
		switch(type)
		{
			case true:
				this.sendPrivateMessage.bind(this)();
				break;
			case false:
				this.sendPublicMessage.bind(this)();
				break;
		}

		// Update last message
		this.updateLastMessage(this.current_chat_id, type ? null : "You", this.input.value);

		// Clean input box
		this.input.value = '';

	},

	sendPrivateMessage: function()
	{
		// Create vars
		const current_conversation = this.HTML_conversations.get(".current");
		const current_chat = this.chats[this.current_chat_id];
		const client = this.clients.find(client => client.room.name == current_chat.room);
		const date = new Date();

		// Clone private message template
		let message_box = this.private_message_template.cloneNode(true);	

		// Set message contents
		message_box.get(".message-content").innerText = this.input.value;
		message_box.get(".message-time").innerText = date.getTime();

		// Add template to the DOM
		current_conversation.get(".conversation").appendChild(message_box);		

		//Delete template old attributes and set class
		message_box.removeAttribute('id');
		message_box.className = "user-message";

		// Show new message
		message_box.show();

		//Update scrollbar focus
		message_box.scrollIntoView();

		// Build and send private message through WebSocket
		const message = new this.Message("private", this.my_user.ids[current_chat.room], this.input.value, date.getTime());
		const string_message = JSON.stringify(message);
		client.sendMessage(string_message, current_chat.clients);
	},

	sendPublicMessage: function()
	{
		// Create vars
		const current_conversation = this.HTML_conversations.get(".current");
		const last_child = current_conversation.get(".conversation").lastElementChild;
		const current_chat = this.chats[this.current_chat_id];
		const client = this.clients.find(client => client.room.name == current_chat.room);
		const date = new Date();

		// Get layout type
		let layout_type;
		switch(true)
		{
			case last_child == null:
				layout_type = "new";
				break;
			case last_child.classList.contains("user-message-layout"):
				layout_type = "concurrent";
				break;
			default:
				layout_type = "new";
				break;
		}

		// Fetch and clone proper message template
		const message_template = layout_type == "new" ? this.user_new_group_message_template : this.user_concurrent_group_message_template;
		let message_box = message_template.cloneNode(true);

		// Set message contents
		if (layout_type == "new") message_box.get(".avatar").src = this.my_user.avatar.src;		
		message_box.get(".message-content").innerText = this.input.value;
		message_box.get(".message-time").innerText = date.getTime();

		// Add template to the DOM
		layout_type == "new" ? current_conversation.get(".conversation").appendChild(message_box) : last_child.appendChild(message_box);

		//Delete template old attributes
		message_box.removeAttribute('id');

		// Show new message
		message_box.show();

		//Update scrollbar focus
		message_box.scrollIntoView();		

		// Build and send public message through WebSocket
		const message = new this.Message("text", this.my_user.ids[current_chat.room], this.input.value, date.getTime());
		const string_message = JSON.stringify(message);
		client.sendMessage(string_message);

		// Store message in the DB
		this.storeMessage(client, string_message)	
	},

	updateLastMessage: function(chat_id, sender, message)
	{
		this.HTML_chats.get(`#chat-${chat_id} .last-message`).innerText = sender ? `${sender}: ${message}` : message;
	},

	filterChats: function()
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

	eraseChatSearch: function()
	{
		this.chat_search_bar.value = "";
		this.chat_eraser.classList.replace("eraser-showing", "eraser-hidden");
		this.search_bar_box.style.marginBottom = "10px";
		document.getAll("#chats > div").forEach( element => { 
			element.show(); 
		});
	},

	selectChat: function(event)
	{
		// Declare some vars
		const regex = /chat-[A-Za-z]+|chat-[1-9]+/;
		const current_html_chat = this.HTML_chats.get(".current");
		const current_html_conversation = this.HTML_conversations.get(".current");
		
		for (const element of event.srcElement.getParents())
		{
			if(element.id != undefined && element.id.match(regex) != null)
			{
				// Swap current selected chat to not selected
				current_html_chat.classList.replace("current", "chat");

				// Select the clicked chat
				element.classList.replace("chat", "current");

				// Fetch the new conversation
				const new_conversation = document.get(`#${element.id.replace("chat", "conversation")}`);

				// Save current scroll
				if(current_html_conversation.id != null) this.conversation_scrolls[current_html_conversation.id] = current_html_conversation.parentElement.scrollTop;

				// Swap current conversation to not selected
				current_html_conversation.classList.replace("current", "not-current");

				// Change to the conversation of the clicked chat
				new_conversation.classList.replace("not-current", "current");

				// Set clicked conversation scroll
				new_conversation.parentElement.scroll(0, this.conversation_scrolls[element.id.replace("chat", "conversation")]);

				// Update current chat var
				this.current_chat_id = element.id.substring(5);

				// Set chat profile status
				this.updateChatProfile();

				//End execution
				break;
			}
		}
	},

	emojiPickerInit: function()
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

	dragMenu: function(event)
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

	openMenu: function()
	{
		// Load menu
		this.menu_grid.style.zIndex = "2";
		this.menu_grid.show();

		this.menu.style.left = (this.available_width - menu.offsetWidth) / 2 + "px";
		this.menu.style.top = (this.available_height - menu.offsetHeight) / 2 + "px";

		// Load available rooms
		this.serverLoadAvailableRooms.bind(this.clients[0])();

	},

	changeAvatar: function()
	{
		// File uploader and avatar image
		file_uploader = document.get("#menu input[type='file']");

		// Launch file manager event
		file_uploader.click();

		// Change user avatar
		file_uploader.when("change", () =>{

			// Size limit
			if (file_uploader.files[0].size / 10e5 > 1)
			{
				alert("The image is bigger than 1MB, try with another image...");
				return;
			}

			// Read data
			const reader = new FileReader();
			reader.readAsDataURL(file_uploader.files[0]);
			reader.addEventListener("load", () => {
				this.menu_avatar.src = reader.result;				
			});
		});		
	},

	resetSetup: function()
	{
		this.menu_avatar.src = "images/default_avatar.jpg";
		this.menu_nick.value = "";
		this.menu_room.value = "";
		this.room_people.innerText = "0";
	},

	saveSetup: function()
	{
		// Check all fields are not empty
		if(this.menu_nick.value == "") this.menu_nick.style.border = "2px #912626 solid", this.menu_nick.placeholder = "Choose a nick";
		else this.menu_nick.style.border = "none", this.menu_nick.placeholder = "";
		if(this.menu_room.value == "") this.menu_room.style.border = "2px #912626 solid", this.menu_room.placeholder = "Choose a room";
		else this.menu_room.style.border = "none", this.menu_room.placeholder = "";
		if(this.menu_nick.value == "" || this.menu_room.value == "") return;

		// Save changes
		this.my_user.avatar.src = this.menu_avatar.src;
		this.my_user.nick.innerText = this.menu_nick.value;

		// New room
		const new_room = this.menu_room.value;

		// Reset setup
		this.resetSetup.bind(this)();

		// Add new room
		this.addRoom.bind(this)(new_room);

		// Close menu
		this.closeMenu.bind(this)();
	},

	closeMenu: function()
	{
		// Hide menu
		this.menu_grid.style.zIndex = "0";
		this.menu_grid.hide();
	},

	sendProfileInfoReady : function(client, user_id)
	{
		// Build message
		const message = new this.Message("profile", user_id, null, null);
		const string_message = JSON.stringify(message);

		// Send message reporting username and avatar
		client.sendMessage(string_message);
	},

	storeUserData: function(client)
	{
		return new Promise(resolve =>{
			client.loadData("Casada_users", (data) => {
				// Parse obj
				let obj = JSON.parse(data || "{}");
	
				// Some vars
				const user_id = this.my_user.ids[client.room.name];
				const user_nick = this.my_user.nick.innerText;
				const user_avatar = this.my_user.avatar.src;
		
				// Update obj
				obj[user_id] = 
				{
					nick: user_nick,
					avatar: user_avatar
				}
	
				// Store data in the db (not sure about race condition protection)
				client.storeData("Casada_users", JSON.stringify(obj), () => resolve());
			});
		});		
	},

	loadUserData: function(client, user_id)
	{
		// Fetch user data
		client.loadData("Casada_users", (data) => {

			// Check data before processing
			if(data == undefined) return

			// Parse data to object
			const obj = JSON.parse(data);

			// Store data in users object
			this.users[user_id] = obj[user_id];

			// Update chat
			this.updateChat(user_id);

			// Update profile info
			this.updateChatProfile();
		});
	},

	loadUsersData: function(client)
	{
		return new Promise(resolve =>
		{
			// Fetch user data
			client.loadData("Casada_users", (data) => {

				// Check data before processing
				if(data == undefined) return

				// Parse data to object
				const obj = JSON.parse(data);

				// Store data in users object
				Object.entries(obj).forEach( (entry) => {
					this.users[entry[0]] = entry[1];
				});

				// Resolve promise
				resolve();
			});
		});
		
	},

	storeMessage: function(client, message)
	{
		client.loadData("Casada_log", (data) => {
			
			// Parse obj
			let obj = JSON.parse(data || "{}");
	
			// Update obj
			obj[client.room.name] == undefined ? obj[client.room.name] = [message] : obj[client.room.name].push(message);				

			// Store data in the db (not sure about race condition protection)
			client.storeData("Casada_log", JSON.stringify(obj));
		});
		
	},

	loadRoomLog: function(client, room)
	{
		// Fetch log
		client.loadData("Casada_log", (data) => {

			// Check data before processing
			if(data == undefined)
			{
				const date = new Date();
				Casada.showSystemMessage(client, room, `Room conversation started the ${date.getDate()} at ${date.getTime()}`);
				return
			} 

			// Parse data to object
			const obj = JSON.parse(data);

			// Check whether there is any message
			if(obj[room] == undefined)
			{
				const date = new Date();
				Casada.showSystemMessage(client, room, `Room conversation started the ${date.getDate()} at ${date.getTime()}`);
			}

			// Load data
			obj[room].forEach( string_message => {
	
				// Parse to object
				const message = JSON.parse(string_message);

				// Build room messages depending on the message type
				switch(message.type)
				{
					case "text":
						this.showGroupMessage(room, message);
						break;
					case "system":
						this.showSystemMessage(client, room, message.content);
						break;
				}				
			});



		});
	},

	fetchUserData: function()
	{
		const client = Casada.clients[0];
		client.loadData("Casada_users", (data) => console.log(`\nUSER DATA\n\n ${data}`));
	},

	fetchLogData: function()
	{
		const client = Casada.clients[0];
		client.loadData("Casada_log", (data) => console.log(`\nLOG DATA\n\n ${data}`));
	},

	fetchData: function()
	{
		this.fetchLogData();
		this.fetchUserData();
	},

	deleteUserData: function()
	{
		const client = this.clients[0];
		client.storeData("Casada_users", undefined, () => console.log("User data successfully deleted from server database"));
	},

	deleteLogData: function()
	{
		const client = this.clients[0];
		client.storeData("Casada_log", undefined, () => console.log("Conversations log successfully deleted from server database"));
	},

	deleteData: function()
	{
		this.deleteLogData();
		this.deleteUserData();
	},

	hideEmojiPicker: function(event)
	{
		let emoji_main_div = document.getElementById("emojikb-maindiv");

		if(!emoji_main_div.classList.contains("emojikb-hidden"))
		{
			this.emoji_picker.toggle_window();
			this.input.focus();
		}
	},
}

