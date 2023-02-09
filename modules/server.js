/***************** NAMESPACE *****************/

var Server =
{
    //SillyClient
	server_address : "wss://ecv-etic.upf.edu/node/9000/ws",
	clients: [],

    /********************************** SERVER CLIENT **********************************/

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
		this.setConnection.bind(client)(this.server_address, room);

		// Server callbacks
		client.on_connect = this.onConnection;
		client.on_ready = this.onReady;
		client.on_user_connected = this.onUserJoin;
		client.on_user_disconnected = this.onUserLeft;
		client.on_message = this.onMessage;
		client.on_room_info = this.onRoomInfo;

		// Additional callbacks
		client.on_error = this.onFail;
		client.on_close = this.onClose;
	},

    getClient: function(index)
    {
        return new Promise(resolve =>{

            // Get client in the list
            let client = this.clients[index];

            // Check client
            if(client)
            {
                resolve(client);
            }
            else
            {
                // Set new client
                client = this.newClient();
                this.setConnection.bind(client)(this.server_address, "Casada_error");
                client.on_connect = resolve(client);
            }
        });
    },

    /********************************** CALLBACKS **********************************/

	setConnection: function(server_address, room_name)
	{
		this.connect(server_address, room_name);
	},

	onConnection: async function()
	{
		// Inform the user the connection has been successfully established
		console.log(`Connection with the server in room ${this.room.name} successfully established`);

		// Send user data
		await Server.storeUserData();
		Casada.sendProfileInfoReady(this, Casada.my_user.ids[this.room.name]);
	},

	onFail: function()
	{
		// Alert the user the connection with the server could not been established
		alert(`The connection to the server address ${this.server_address} has failed. Trying to reconnect`);

		// Reconnect
		Casada.setConnection(this.server_address, this.room.name);
	},

	onClose: function()
	{
		// Alert the user the server has been shut down
		alert(`Warning: The server has been shut down`);
	},

	onReady: function(id)
	{
        // Inform the user about his ID
        console.log(`Your id is ${id}`);

		// Assign user ID
		Casada.my_user.ids[this.room.name] = id;
	},

	onUserJoin: async function(client_id)
	{
        // Define status message
        const status_msg = `The user ${client_id} has joined the room`;

		// Inform the user a new client has joined the room
		console.log(status_msg);

		// Create a new private chat and conversation
		Casada.loadPrivateChat(this.room.name, client_id);	

		// Update clients lists
		await Casada.updateRoomInfo(this.room.name);

		// Show system message
		Casada.showSystemMessage(this.room.name, status_msg);

		// Change room chat status
		const room_chat = Casada.chats[this.room.name];
		if (!room_chat.online)
		{
			Casada.HTML_chats.get(`#chat-${this.room.name}`).classList.remove("offline-chat");
			room_chat.online = true;
		}

		// Send profile info
		Casada.sendProfileInfoReady(this, Casada.my_user.ids[this.room.name]);

		//Update chat profile
		Casada.updateChatProfile();
	},

	onUserLeft: async function(client_id)
	{
        // Define status messages
        const status_msg = `The user ${client_id} has left the room`;
        const private_status_msg = `The user has left the room and is no longer available`;

		// Inform the user a new client has left the room
		console.log(status_msg);

		// Update clients lists
		await Casada.updateRoomInfo(this.room.name);

		// Show system message
		Casada.showSystemMessage(this.room.name, status_msg);
		Casada.showSystemMessage(client_id, private_status_msg);		

		// Change room chat status
		const room_chat = Casada.chats[this.room.name];
		if (room_chat.clients.length == 1)
		{
			Casada.HTML_chats.get(`#chat-${this.room.name}`).classList.add("offline-chat");
			room_chat.online = false;
		}

		// Change private chat status
		Casada.chats[client_id].online = false;
		Casada.HTML_chats.get(`#chat-${client_id}`).classList.add("offline-chat");

		//Update chat profile
		Casada.updateChatProfile();
	},

	onRoomInfo: async function(room_info)
	{
		// Append new room to the list of connected rooms
		const new_room =
		{
			clients : room_info.clients,
			oldest : Math.min(room_info.clients)
		};
		Casada.connected_rooms[this.room.name] = new_room;

		// Load rooms
		Casada.updateAvailableRooms();

		// Create chats
		Casada.loadChats(this.room.name, room_info.clients);
		
		// Load user data
		await Server.loadUsersData();

		// Load log
		Server.loadRoomLog(this.room.name);
	},

	onMessage: function(user_id, message_string)
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
				Casada.showPrivateMessage(message.user, message);
				break;
			case "system":
				Casada.showSystemMessage(this.room.name, message.content);
				break;
			case "profile":
				Server.loadUserData(message.user);
				break;
		}		
	},

    /********************************** SERVER TOOLS **********************************/

    setAvailableRooms: async function()
	{
        // Get client
        const client = await this.getClient(0);

		return new Promise( resolve => 
		{
			// Set rooms list
			client.getReport((room_report) => 
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

	getRoomInfo: async function(room_name)
	{
        // Get client
        const client = await this.getClient(0);

		return new Promise( resolve => 
		{
			// Get rooms list
			client.getRoomInfo(room_name, (room_info) => 
			{				
				// Resolve promise
				resolve(room_info);
			});

		});
	},

    /********************************** SERVER DATABASE **********************************/

    storeUserData: async function()
	{
        // Get client
        const client = await this.getClient(0);

		return new Promise( resolve => 
        {            
			client.loadData("Casada_users", (data) => {

				// Parse obj
				let obj = JSON.parse(data || "{}");
	
				// Some vars
				const user_id = Casada.my_user.ids[client.room.name];
				const user_nick = Casada.my_user.nick.innerText;
				const user_avatar = Casada.my_user.avatar.src;
		
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

	loadUserData: async function(user_id)
	{
        // Get client
        const client = await this.getClient(0);

		// Fetch user data
		client.loadData("Casada_users", (data) => {

			// Check data before processing
			if(data == undefined) return

			// Parse data to object
			const obj = JSON.parse(data);

			// Store data in users object
			Casada.users[user_id] = obj[user_id];

			// Update chat
			Casada.updateChat(user_id);

			// Update profile info
			Casada.updateChatProfile();
		});
	},

	loadUsersData: async function()
	{
        // Get client
        const client = await this.getClient(0);

		return new Promise( resolve =>
		{
			// Fetch user data
			client.loadData("Casada_users", (data) => {

				// Check data before processing
				if(data == undefined) return

				// Parse data to object
				const obj = JSON.parse(data);

				// Store data in users object
				Object.entries(obj).forEach( (entry) => {
					Casada.users[entry[0]] = entry[1];
				});

				// Resolve promise
				resolve();
			});
		});
		
	},

	storeMessage: async function(room_name, message)
	{
        // Get client
        const client = await this.getClient(0);

		client.loadData("Casada_log", (data) => {
			
			// Parse obj
			let obj = JSON.parse(data || "{}");
	
			// Update obj
			obj[room_name] == undefined ? obj[room_name] = [message] : obj[room_name].push(message);				

			// Store data in the db (not sure about race condition protection)
			client.storeData("Casada_log", JSON.stringify(obj));
		});
		
	},

	loadRoomLog: async function(room_name)
	{
        // Get client
        const client = await this.getClient(0);

		// Fetch log
		client.loadData("Casada_log", (data) => {

			// Check data before processing
			if(data == undefined)
			{
				const date = new Date();
				Casada.showSystemMessage(room_name, `Room conversation started the ${date.getDate()} at ${date.getTime()}`);
				return
			} 

			// Parse data to object
			const obj = JSON.parse(data);

			// Check whether there is any message
			if(obj[room_name] == undefined)
			{
				const date = new Date();
				Casada.showSystemMessage(room_name, `Room conversation started the ${date.getDate()} at ${date.getTime()}`);
			}

			// Load data
			obj[room_name].forEach( string_message => {
	
				// Parse to object
				const message = JSON.parse(string_message);

				// Build room messages depending on the message type
				switch(message.type)
				{
					case "text":
						Casada.showGroupMessage(room_name, message);
						break;
					case "system":
						Casada.showSystemMessage(room_name, message.content);
						break;
				}				
			});



		});
	},

	fetchUserData: async function()
	{
		const client = await this.getClient(0);
		client.loadData("Casada_users", (data) => console.log(`\nUSER DATA\n\n ${data}`));
	},

	fetchLogData: async function()
	{
		const client = await this.getClient(0);
		client.loadData("Casada_log", (data) => console.log(`\nLOG DATA\n\n ${data}`));
	},

	removeUserData: async function()
	{
		const client = await this.getClient(0);
		client.storeData("Casada_users", undefined, () => console.log("User data successfully deleted from server database"));
	},

	removeLogData: async function()
	{
		const client = await this.getClient(0);
		client.storeData("Casada_log", undefined, () => console.log("Conversations log successfully deleted from server database"));
	},

    fetchData: function()
	{
		this.fetchLogData();
		this.fetchUserData();
	},

	removeData: function()
	{
		this.removeLogData();
		this.removeUserData();
	}
}