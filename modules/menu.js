/***************** NAMESPACE *****************/

var Menu = 
{
    // Components
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
    file_uploader : document.get("#menu input[type='file']"),
	reset_changes : document.get("#reset-changes"),
	apply_changes : document.get("#apply-changes"),

    /********************************** MENU BASE METHODS **********************************/

    initEventsListeners : function()
    {
        // Menu dragger
		this.menu_dragger.when("mousedown", this.dragMenu.bind(this));

		// Open menu
		Casada.new_chat_trigger.when("click", this.openMenu.bind(this));

		// Close menu
		this.menu_options.when("click", this.closeMenu.bind(this));

		// Change avatar
		this.avatar_uploader.when("click", this.changeAvatar.bind(this));

        // Menu room
		this.menu_room.when("keyup", Casada.onKeyUp);

        // Previous room
		this.previous_room.when("click", () => {Casada.showRoom(Casada.room_list_index - 1);});

		// Next room
		this.next_room.when("click", () => {Casada.showRoom(Casada.room_list_index + 1);});

		// Reset changes
		this.reset_changes.when("click", this.reset.bind(this));

		// Save setup
		this.apply_changes.when("click", this.save.bind(this));
    },

	openMenu: function()
	{
		// Load menu
		this.menu_grid.style.zIndex = "2";
		this.menu_grid.show();

		this.menu.style.left = (this.available_width - menu.offsetWidth) / 2 + "px";
		this.menu.style.top = (this.available_height - menu.offsetHeight) / 2 + "px";

		// Load available rooms
		Casada.updateAvailableRooms();

	},

    closeMenu: function()
	{
		// Hide menu
		this.menu_grid.style.zIndex = "0";
		this.menu_grid.hide();
	},

	reset: function()
	{
		this.menu_avatar.src = "images/default_avatar.jpg";
		this.menu_nick.value = "";
		this.menu_room.value = "";
		this.room_people.innerText = "0";
	},

	save: function()
	{
		// Check all fields are not empty
		if(this.menu_nick.value == "") this.menu_nick.style.border = "2px #912626 solid", this.menu_nick.placeholder = "Choose a nick";
		else this.menu_nick.style.border = "none", this.menu_nick.placeholder = "";
		if(this.menu_room.value == "") this.menu_room.style.border = "2px #912626 solid", this.menu_room.placeholder = "Choose a room";
		else this.menu_room.style.border = "none", this.menu_room.placeholder = "";
		if(this.menu_nick.value == "" || this.menu_room.value == "") return;

		// Save changes
		Casada.my_user.avatar.src = this.menu_avatar.src;
		Casada.my_user.nick.innerText = this.menu_nick.value;

		// New room
		const new_room = this.menu_room.value;

		// Reset setup
		this.reset();

		// Add new room
		Casada.addRoom(new_room);

		// Close menu
		this.closeMenu();
	},

    /********************************** MENU TOOLS **********************************/

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
			this.menu.style.left = (menu.offsetLeft + Δx).clamp(0, Casada.available_width - menu.offsetWidth - 50) + "px";
			this.menu.style.top = (menu.offsetTop + Δy).clamp(0, Casada.available_height - menu.offsetHeight - 80) + "px";
			
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

    changeAvatar: function()
	{
		// Launch file manager event
		this.file_uploader.click();

		// Change user avatar
		this.file_uploader.when("change", () =>{

			// Size limit
			if (this.file_uploader.files[0].size / 10e5 > 1)
			{
				alert("The image is bigger than 1MB, try with another image...");
				return;
			}

			// Read data
			const reader = new FileReader();
			reader.readAsDataURL(this.file_uploader.files[0]);
			reader.addEventListener("load", () => {
				this.menu_avatar.src = reader.result;				
			});
		});		
	}

}