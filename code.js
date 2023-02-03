
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
	chats_children : document.getAll("#chats > div"),

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
	user: 
	{
		avatar : document.get("#user-avatar"),
		nick : document.get("#username"),
		room : "1234" 
	},	

	// Rooms
	default_room : "Casada",
	room_list_index : 0,
	available_rooms : [],

	// Scroll
	conversation_scrolls : {"chat1" : 0, "chat2" : 0},

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
		this.previous_room.when("click", () => {this.changeRoom(this.room_list_index - 1);});

		// Next room
		this.next_room.when("click", () => {this.changeRoom(this.room_list_index + 1);});

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
		this.setServerConnection();

		// Server callbacks
		this.client.on_connect = this.onServerConnection.bind(this);
		this.client.on_error = this.onServerFail.bind(this);
		//this.client.on_close = this.onServerClose(this);
		this.client.on_ready = this.onServerReady.bind(this);
		this.client.on_user_connected = this.onServerUserJoin.bind(this);
		this.client.on_user_disconnected = this.onServerUserLeft.bind(this);
		//this.client.on_room_info = this.onServerRoomInfo.bind(this);
		this.client.on_message = this.onServerMessageReceived.bind(this);
	},

	setServerConnection: function(room)
	{
		this.client.connect(this.server_address, this.default_room);
	},

	onServerConnection: function()
	{
		// Inform the user the connection has been successfully established
		console.log("Connection with the server successfully established");

		// Load rooms
		this.loadRooms.bind(this)();
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

	onServerUserJoin: function(user_id)
	{
		console.log(`A new user with id ${user_id} has joined the room`);
	},

	onServerUserLeft: function(user_id)
	{
		console.log(`The user with id ${user_id} has left the room`);
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
				
				// Resolve promise
				resolve();
			});
		});
	},

	loadRooms: async function()
	{
		// Fetch room list
		await this.serverGetRoomList();

		// Show first room
		this.changeRoom(0);
	},
	
	changeRoom: function(new_room)
	{
		// Get number of available rooms
		const room_list_length = Object.keys(this.available_rooms).length

		if(room_list_length == 0)
		{

		}

		// Range new room index
		new_room = new_room < 0 ? room_list_length - 1 : (new_room > room_list_length - 1 ? 0 : new_room);

		// Set new room
		this.room_list_index = new_room;
		this.menu_room.value = Object.keys(this.available_rooms)[this.room_list_index];
		this.room_people.innerText = Object.values(this.available_rooms)[this.room_list_index];
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
		const current_conversation = document.get(".grid-conversations .current")

		// Fetch the current conversation type
		const conversation_classes = current_conversation.classList;

		// Fetch last conversation child
		const last_child = current_conversation.get(".conversation").lastElementChild;

		// Fetch proper template
		const message_template = conversation_classes.contains("private") ? document.get("#private-message-template") : (last_child.classList.contains("user-message-layout") ? document.get("#concurrent-group-message-template") : document.get("#new-group-message-template"));

		// Clone template
		var message_box = message_template.cloneNode(true);

		// Set avatar in case of new group message from the user
		if (last_child.classList.contains("people-message-layout") ) message_box.get(".avatar").src = this.user.avatar.src;		

		// Set input box text value to template
		message_box.get(".message-content").innerText = this.input.value;

		// Set current time to template
		const date = new Date();
		message_box.get(".message-time").innerText = date.getTime();

		// Add template to the DOM
		last_child.classList.contains("user-message-layout") ? last_child.appendChild(message_box) : current_conversation.get(".conversation").appendChild(message_box);

		//Delete template old attributes
		message_box.removeAttribute('style');
		message_box.removeAttribute('id');

		// Show new message
		message_box.style.display = ''

		//Update scrollbar focus
		message_box.scrollIntoView();

		// Send message to the chat server
		this.client.sendMessage(this.input.value);

		// Clean input box
		this.input.value = ''
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
		this.chats_children.forEach(function(element){

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
		this.chats_children.forEach( (element) => { 
			element.show(); 
		});
	},

	selectChat:function(event)
	{
		const regex = /chat[1-9]+/;
		const current_chat = document.get("#chats .current");
		const current_conversation = document.get(".grid-conversations .current");
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
				const new_conversation = document.get(`#${element.id}-conversation`);

				// Save current scroll
				if(current_conversation_id != null) this.conversation_scrolls[current_conversation_id] = current_conversation.parentElement.scrollTop;

				// Swap current conversation to not selected
				current_conversation.classList.replace("current", "not-current");

				// Change to the conversation of the clicked chat
				new_conversation.classList.replace("not-current", "current");

				// Set clicked conversation scroll
				new_conversation.parentElement.scroll(0, this.conversation_scrolls[element.id]);

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
            input.value += emoji.emoji;
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
		this.user.room = this.menu_room.value;

		// Reset setup
		this.resetSetup();

		// Close menu
		this.closeMenu();
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
