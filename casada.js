/***************** NAMESPACE *****************/

var Casada =
{
	// Root
	root: document.documentElement,
	available_height : window.screen.availHeight,
	available_width : window.screen.availWidth,

	// Some DOM elements
	input : document.get("#keyboard-input"),
	new_chat_trigger : document.get("#new-chat-trigger"),
	search_bar_box : document.get(".grid-chats .search-bar"),
	chat_search_bar : document.get("#chat-search-bar"),
	chat_eraser : document.get("#chat-eraser"),
	HTML_chats : document.get("#chats"),
	HTML_conversations : document.get("#conversations"),

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


	/********************************** INIT **********************************/

	init: function()
	{
		// CSS variables
		document.documentElement.style.setProperty('--screen_width', this.available_width + "px");
		document.documentElement.style.setProperty('--screen_height', this.available_height + "px");

		// Event listeners
		this.initEventsListeners();

		// Emoji picker
		EmojiPicker.emojiPickerInit();

		// Create a new SillyClient instance
		const new_client = Server.newClient();

		// Init the new client
		Server.initClient(new_client, this.default_room);
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

		// Other namespaces event listeners
		Menu.initEventsListeners();
	},

	initScrolls: function()
	{
		for (const conversation of this.HTML_conversations.children)
		{
			if(conversation.id != "")
				this.conversation_scrolls[conversation.id] = "0";
		}
	},

	/********************************** EVENTS **********************************/

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
			Menu.room_people.innerText = "0";
		}

	},

	/********************************** SEND MESSAGE **********************************/

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
				this.sendPrivateMessage();
				break;
			case false:
				this.sendPublicMessage();
				break;
		}

		// Update last message
		this.updateChatLastMessage(this.current_chat_id, type ? null : "You", this.input.value);

		// Clean input box
		this.input.value = '';

	},

	sendPrivateMessage: function()
	{
		// Create vars
		const current_conversation = this.HTML_conversations.get(".current");
		const current_chat = this.chats[this.current_chat_id];
		const client = Server.clients.find(client => client.room.name == current_chat.room_name);
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
		const message = new this.Message("private", this.my_user.ids[current_chat.room_name], this.input.value, date.getTime());
		const string_message = JSON.stringify(message);
		client.sendMessage(string_message, current_chat.clients);
	},

	sendPublicMessage: function()
	{
		// Create vars
		const current_conversation = this.HTML_conversations.get(".current");
		const last_child = current_conversation.get(".conversation").lastElementChild;
		const current_chat = this.chats[this.current_chat_id];
		const client = Server.clients.find(client => client.room.name == current_chat.room_name);
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
		const message = new this.Message("text", this.my_user.ids[current_chat.room_name], this.input.value, date.getTime());
		const message_string = JSON.stringify(message);
		client.sendMessage(message_string);

		// Store message in the DB
		Server.storeMessage(current_chat.room_name, message)	
	},

	sendLogReady: function(client)
	{
		// Build message
		const message = new this.Message("history", "Casada", null, null);
		const string_message = JSON.stringify(message);

		// Send message informing the log is ready
		client.sendMessage(string_message);
	},

	/********************************** SHOW MESSAGES **********************************/

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
		this.updateChatLastMessage(room_name, user == null ? message.user : user.nick, message.content);
	},

	showPrivateMessage: function(sender_id, message)
	{
		// Fetch conversation
		const conversation = this.HTML_conversations.get(`#conversation-${sender_id}`);

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
		if (this.current_chat_id == sender_id)
			message_box.scrollIntoView();

		// Update last message
		this.updateChatLastMessage(sender_id, null, message.content);
	},

	showSystemMessage: function(conversation_id, message)
	{
		// Fetch data
		const conversation = this.HTML_conversations.get(`#conversation-${conversation_id}`);
		const current_chat = this.chats[this.current_chat_id];

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
	},

	/********************************** LOAD CHATS **********************************/

	loadChats: function(room_name, client_info)
	{
		// Create room group chat and conversation
		Casada.loadRoomChat(room_name, client_info);

		// Create private chats and conversations
		for(const client_id of client_info)
		{
			if(client_id != Casada.my_user.ids[room_name])
				Casada.loadPrivateChat(room_name, client_id);
		}

		// Update chat profile
		Casada.updateChatProfile();

		// Init scrolls
		Casada.initScrolls();
	},

	loadRoomChat: function(room_name, client_info)
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
		chat_username.innerText = room_name;
		chat_last_message.innerText = "Last sent message";

		// First chat
		const first_chat = Object.keys(this.connected_rooms).length == 1 ? true : false;
		if(first_chat) this.current_chat_id = room_name;

		// Room status
		const room_status = client_info.length == 1 ? false : true;

		// Set chat id and class
		new_chat.id = `chat-${room_name}`;
		new_chat.className = (first_chat ? "current" : "chat") + (room_status ? "" : " offline-chat");

		// Set conversation id and class
		new_conversation.id = `conversation-${room_name}`;
		new_conversation.className = first_chat ? "current group" : "not-current group";

		// Append new chat and conversation to the doom
		this.HTML_chats.appendChild(new_chat);
		this.HTML_conversations.appendChild(new_conversation);

		// Show new elements
		new_chat.show();
		new_conversation.show();

		// Append new chat to the list
		const room_chat = 
		{
			room_name : room_name,
			type : "group",
			clients : client_info,
			online: room_status
		}
		this.chats[room_name] = room_chat;		
	},

	loadPrivateChat: function(room_name, client_id)
	{
		// Clone templates
		let new_chat = this.chat_template.cloneNode(true);
		let new_conversation = this.conversation_template.cloneNode(true);

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
		this.HTML_chats.appendChild(new_chat);
		this.HTML_conversations.appendChild(new_conversation);

		// Update chat content with built-in methods
		this.updateChat(client_id);
		this.updateChatLastMessage(client_id, null, "Last sent message");

		// Show new elements
		new_chat.show();
		new_conversation.show();

		// Append new chat to the list
		const private_chat = 
		{
			room_name : room_name,
			type : "private",
			clients : [client_id],
			online: true
		}
		this.chats[client_id] = private_chat;
	},

	/********************************** ROOMS **********************************/

	showRoom: function(new_room)
	{
		// Get number of available rooms
		const room_list_length = Object.keys(this.available_rooms).length

		// No rooms available
		if(room_list_length == 0)
		{
			Menu.menu_room.value = "";
			Menu.room_people.innerText = "0";
		}
		// Rooms available
		else
		{
			// Range new room index
			new_room = new_room < 0 ? room_list_length - 1 : (new_room > room_list_length - 1 ? 0 : new_room);

			// Set new room
			this.room_list_index = new_room;
			Menu.menu_room.value = Object.keys(this.available_rooms)[this.room_list_index];
			Menu.room_people.innerText = Object.values(this.available_rooms)[this.room_list_index];
		}
	},

	addRoom: function(room_name)
	{
		// Create a new SillyServer instance
		const new_client = Server.newClient();

		// Init new client
		Server.initClient(new_client, room_name);
		
	},

	changeRoomFade: function(room_name, client_id, mode)
	{
		if(mode == "on")
		{
			// Change room chat status
			const room_chat = Casada.chats[room_name];
			if (!room_chat.online)
			{
				Casada.HTML_chats.get(`#chat-${room_name}`).classList.remove("offline-chat");
				room_chat.online = true;
			}
		}
		else if (mode == "off")
		{
			// Change room chat status
			const room_chat = this.chats[room_name];
			if (room_chat.clients.length == 1)
			{
				Casada.HTML_chats.get(`#chat-${room_name}`).classList.add("offline-chat");
				room_chat.online = false;
			}

			// Change private chat status
			Casada.HTML_chats.get(`#chat-${client_id}`).classList.add("offline-chat");
			Casada.chats[client_id].online = false;
		}	
	},

	/********************************** USER ENTRANCE AND EXIT **********************************/

	setUpEntrance: function(client, master)
	{
		// Get vars
		const room_name = client.room.name
		const user_id = Casada.my_user.ids[room_name];
		const user_nick = Casada.my_user.nick.innerText;

		// Build messages
		const date = new Date();
		const ping = new this.Message("profile", user_id, null, null); // ping informing the user info is ready
		const join = new this.Message("system", "Casada", `${user_nick} has joined the room`, date.getTime()); // join message

		// Send messages
		client.sendMessage(JSON.stringify(ping, null, 2)); 
		client.sendMessage(JSON.stringify(join, null, 2)); 

		// If current user is the master (the oldest one), store the join message
		if(user_id == master)
			Server.storeMessage(room_name, join); 

		// Show entrance message
		this.showSystemMessage(room_name, "You have joined the room");
	},

	setUpExit: function(client, master)
	{
		// Get vars
		const room_name = client.room.name
		const user_id = Casada.my_user.ids[room_name];
		const user_nick = Casada.my_user.nick.innerText;

		// Build exit message
		const date = new Date();
		const exit = new this.Message("system", "Casada", `${user_nick} has left the room`, date.getTime());

		// Show exit message
		this.showSystemMessage(room_name, exit.content);

		// If current user is the master (the oldest one), store the exit message
		if(user_id == master)
			Server.storeMessage(room_name, exit); 
	},

	/********************************** UPDATES **********************************/

	updateAvailableRooms: async function()
	{
		// Fetch room list
		await Server.setAvailableRooms();

		// Show first room
		Casada.showRoom(0);
	},

	updateRoomInfo : async function(room_name)
	{
		// Fetch clients info
		let room_info = await Server.getRoomInfo(room_name);

		// Set room clients and master client
		const room = this.connected_rooms[room_name];
		room.clients = room_info.clients;
		room.master = Math.min.apply(Math, room_info.clients);

		// Set chat clients
		this.chats[room_name].clients = room_info.clients;
	},

	updateChatProfile: function()
	{
		// Profile chat vars
		const current_chat = this.chats[this.current_chat_id];
		const current_room = current_chat.room_name;
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

	updateChatLastMessage: function(chat_id, sender, message)
	{
		this.HTML_chats.get(`#chat-${chat_id} .last-message`).innerText = sender ? `${sender}: ${message}` : message;
	},

	/********************************** CHAT TOOLS **********************************/

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
	}
}

