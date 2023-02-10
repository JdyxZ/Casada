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
	},

	onFail: function()
	{
		// Alert the user the connection with the server could not been established
		alert(`The connection to the server address ${Server.server_address} has failed. Trying to reconnect`);

		// Reconnect
		Server.setConnection.bind(this)(Server.server_address, this.room.name);
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
		// Inform the user a new client has joined the room
		const user = Casada.users[client_id];
		console.log(`${user == null ? client_id: user.nick} has joined the room`);

		// Update clients lists
		await Casada.updateRoomInfo(this.room.name);

		// Create a new private chat and conversation
		Casada.loadPrivateChat(this.room.name, client_id);	

		// Remove fade class if required
		Casada.changeRoomFade(this.room.name, client_id, "on");

		//Update chat profile
		Casada.updateChatProfile();
	},

	onUserLeft: async function(client_id)
	{		
		// Inform the user a new client has left the room
		const user = Casada.users[client_id];
		console.log(`${user == null ? client_id: user.nick} has left the room`);

		// Update clients lists
		await Casada.updateRoomInfo(this.room.name);	

		// Place fade class if required
		Casada.changeRoomFade(this.room.name, client_id, "off");

		//Update chat profile
		Casada.updateChatProfile();

		// Show exit message and store it if user is the master
		Casada.setUpExit(this, Casada.connected_rooms[this.room.name].master);
	},

	onRoomInfo: async function(room_info)
	{
		// Append new room to the list of connected rooms
		const new_room =
		{
			clients : room_info.clients,
			master : Math.min(room_info.clients)
		};
		Casada.connected_rooms[this.room.name] = new_room;

		// Load available rooms
		Casada.updateAvailableRooms();

		// Load user data
		await Server.loadUsersData();

		// Create chats
		Casada.loadChats(this.room.name, room_info.clients);

		// Load log
		await Server.loadRoomLog(this.room.name);

		// Store my data
		await Server.storeUserData();

		// Communicate to the rest that user info is ready, send status messages to them and print (and store) its own status message
		Casada.setUpEntrance(this, new_room.master);
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
				Casada.showPrivateMessage(message.user, message.content);
				break;
			case "system":
				Casada.showSystemMessage(this.room.name, message.content);
				break;
			case "profile":	
				Server.loadUserData(message.user);
				break;
		}
		
		// Store status messages in the DB
		if(message.type == "system" && Casada.my_user.ids[this.room.name] == Casada.connected_rooms[this.room.name].master)
			Server.storeMessage(this.room.name, message);
			
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
				client.storeData("Casada_users", JSON.stringify(obj, null, 2), () => resolve());
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
			if(data == undefined) return;

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
				if(data == undefined) 
				{
					resolve();
					return;
				}

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
			client.storeData("Casada_log", JSON.stringify(obj, null, 2));
		});
		
	},

	loadRoomLog: async function(room_name)
	{
		// Get client
		const client = await this.getClient(0);

		return new Promise(resolve => {

			// Fetch log
			client.loadData("Casada_log", (data) => {

				// Parse data to object
				const obj = JSON.parse(data || "{}");

				// Check whether there is data about the room
				if(obj[room_name] == undefined)
				{
					// Create message
					const date = new Date();
					const msg_content = `Room created the ${date.getDate()} at ${date.getTime()}`;
					const message = new Casada.Message("system", "Casada", msg_content, date.getTime());

					//Store message
					Server.storeMessage(room_name, message)

					// Show message
					Casada.showSystemMessage(room_name, message.content);
					resolve();
					return;
				}

				// Load data
				obj[room_name].forEach( message => {

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

				// Resolve
				resolve();
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